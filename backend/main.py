import asyncio
import hashlib
import json
import os
import shutil
import subprocess
import threading
import time
from datetime import datetime
from pathlib import Path

import aiofiles
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

app = FastAPI(title="Code Animator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
CACHE_DIR   = BASE_DIR / "cache"
ANIMATOR_SCRIPT = BASE_DIR.parent / "CodeAnimator.py"

UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

MAX_CACHE_AGE  = 7 * 24 * 60 * 60   # 7 days
MAX_CACHE_SIZE = 5 * 1024 ** 3       # 5 GB

QUALITY_PRESETS = {
    "fast": {
        "landscape": ["-ql", "--frame_rate", "60"],
        "portrait":  ["-r", "540,960", "--frame_rate", "60"],
        "video_dir": "480p60",
    },
    "standard": {
        "landscape": ["-qm", "--frame_rate", "60"],
        "portrait":  ["-r", "720,1280", "--frame_rate", "60"],
        "video_dir": "720p60",
    },
    "high": {
        "landscape": ["-qh", "--frame_rate", "60"],
        "portrait":  ["-r", "1080,1920", "--frame_rate", "60"],
        "video_dir": "1080p60",
    },
}

TIMEOUT_BY_QUALITY = {"fast": 180, "standard": 360, "high": 600}

progress_tracking = {}
_PROGRESS_MAX_ENTRIES = 500
_render_semaphore = asyncio.Semaphore(1)


def _prune_progress_tracking():
    if len(progress_tracking) < _PROGRESS_MAX_ENTRIES:
        return
    terminal = {k for k, v in progress_tracking.items()
                if v.get("status") in ("complete", "error", "timeout")}
    for k in terminal:
        progress_tracking.pop(k, None)


def generate_cache_key(file_content: bytes, config_data: dict) -> str:
    normalized = {
        "content_hash":   hashlib.md5(file_content).hexdigest(),
        "start_line":     config_data.get("startLine"),
        "end_line":       config_data.get("endLine"),
        "include_comments": config_data.get("includeComments"),
        "orientation":    config_data.get("orientation", "landscape"),
        "quality":        config_data.get("quality", "standard"),
        "line_groups":    json.dumps(sorted(config_data.get("lineGroups", []))),
        "syntax_colors":  json.dumps(config_data.get("syntaxColors", {}), sort_keys=True),
        "animation_timing": json.dumps(config_data.get("animationTiming", {}), sort_keys=True),
        "animation_type": config_data.get("animationType", "slide_left"),
        "font":           config_data.get("font", "default"),
    }
    return hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()[:16]


def monitor_manim_progress(task_id: str, media_dir: Path, stop_event: threading.Event):
    progress_tracking[task_id] = {"progress": 0, "status": "starting"}
    last_file_count = 0
    max_svg_files = 0

    while not stop_event.is_set():
        try:
            if media_dir.exists():
                tex_dir = media_dir / "Tex"
                svg_files = sum(1 for _ in tex_dir.rglob("*.svg")) if tex_dir.exists() else 0

                frame_files = 0
                video_exists = False
                for quality_dir in ["480p24","720p30","1080p30","1080p60","1920p60","960p24","1280p30","1920p30"]:
                    partial_dir = media_dir / "videos" / "CodeAnimator" / quality_dir / "partial_movie_files"
                    if partial_dir.exists():
                        frame_files += len(list(partial_dir.glob("*.png")))
                    video_dir = media_dir / "videos" / "CodeAnimator" / quality_dir
                    if not video_exists and video_dir.exists():
                        video_exists = any(video_dir.glob("*.mp4"))

                total_files = svg_files + frame_files
                current_progress = progress_tracking.get(task_id, {}).get("progress", 0)

                if total_files > last_file_count or video_exists:
                    last_file_count = total_files

                    if svg_files > 0 and frame_files == 0 and current_progress < 15:
                        max_svg_files = max(max_svg_files, svg_files)
                        progress_tracking[task_id] = {
                            "progress": min(15, (svg_files / max(max_svg_files, 20)) * 15),
                            "status": "generating SVGs",
                            "files": total_files,
                        }
                    elif frame_files > 0 and current_progress < 90:
                        progress_tracking[task_id] = {
                            "progress": min(90, 15 + min(75, (frame_files / 300) * 75)),
                            "status": "rendering frames",
                            "files": total_files,
                            "frames": frame_files,
                        }

                    if video_exists and current_progress < 90:
                        progress_tracking[task_id] = {
                            "progress": 90,
                            "status": "compiling video",
                            "files": total_files,
                        }

            time.sleep(1.5)
        except Exception:
            break


def cleanup_cache():
    now = time.time()
    total_size = 0
    candidates = []

    try:
        with os.scandir(CACHE_DIR) as entries:
            for entry in entries:
                if not entry.name.endswith(".mp4"):
                    continue
                try:
                    stat = entry.stat()
                    age  = now - stat.st_mtime
                    size = stat.st_size
                    path = Path(entry.path)
                    if age > MAX_CACHE_AGE:
                        try:
                            path.unlink()
                        except OSError:
                            pass
                    else:
                        total_size += size
                        candidates.append((age, size, path))
                except OSError:
                    continue
    except OSError:
        return

    if total_size <= MAX_CACHE_SIZE:
        return

    candidates.sort(reverse=True)
    for _, size, path in candidates:
        if total_size <= MAX_CACHE_SIZE:
            break
        try:
            path.unlink()
            total_size -= size
        except OSError:
            pass


async def _do_render(
    task_id: str,
    upload_path: Path,
    config_json: str,
    manim_cmd: list,
    orientation: str,
    media_dir: Path,
    timeout: int,
    output_name: str,
    cached_video: Path,
):
    async with _render_semaphore:
        progress_tracking[task_id] = {"progress": 0, "status": "starting"}
        stop_event = threading.Event()
        progress_thread = threading.Thread(
            target=monitor_manim_progress,
            args=(task_id, media_dir, stop_event),
        )
        progress_thread.start()

        env = os.environ.copy()
        env["ANIM_ORIENTATION"] = orientation

        proc = subprocess.Popen(
            manim_cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
        )

        try:
            _, stderr = await asyncio.to_thread(proc.communicate, config_json, timeout)
            returncode = proc.returncode
        except subprocess.TimeoutExpired:
            proc.kill()
            await asyncio.to_thread(proc.communicate)
            stop_event.set()
            progress_thread.join(timeout=2)
            progress_tracking[task_id] = {"progress": 0, "status": "timeout"}
            try:
                upload_path.unlink(missing_ok=True)
            except Exception:
                pass
            return

        stop_event.set()
        progress_thread.join(timeout=2)

        if returncode != 0:
            print(f"Manim error: {stderr}")
            progress_tracking[task_id] = {"progress": 0, "status": "error", "detail": stderr[-500:]}
            try:
                upload_path.unlink(missing_ok=True)
            except Exception:
                pass
            return

        current = progress_tracking.get(task_id, {}).get("progress", 0)
        if current < 95:
            progress_tracking[task_id] = {"progress": 95, "status": "finalizing"}

        video_filename = f"{output_name}.mp4"
        videos_base    = BASE_DIR / "media" / "videos" / "CodeAnimator"

        video_path = None
        if videos_base.exists():
            for quality_subdir in videos_base.iterdir():
                if quality_subdir.is_dir():
                    candidate = quality_subdir / video_filename
                    if candidate.exists():
                        video_path = candidate
                        break

        if video_path is None:
            progress_tracking[task_id] = {
                "progress": 0, "status": "error",
                "detail": f"Generated video not found in {videos_base}",
            }
            upload_path.unlink(missing_ok=True)
            return

        output_video_id   = f"{task_id}_{video_filename}"
        output_video_path = OUTPUTS_DIR / output_video_id
        await asyncio.to_thread(shutil.copy, video_path, output_video_path)

        try:
            await asyncio.to_thread(shutil.copy, video_path, cached_video)
            await asyncio.to_thread(cleanup_cache)
        except Exception as e:
            print(f"Warning: Could not cache video: {e}")

        try:
            upload_path.unlink(missing_ok=True)
        except Exception:
            pass

        if media_dir.exists():
            try:
                await asyncio.to_thread(shutil.rmtree, media_dir)
            except Exception:
                pass

        progress_tracking[task_id] = {
            "progress": 100,
            "status": "complete",
            "videoId": output_video_id,
            "filename": video_filename,
        }
        _prune_progress_tracking()


@app.get("/")
async def root():
    return {"status": "ok", "message": "Code Animator API is running"}


@app.get("/api/progress/{task_id}")
async def get_progress(task_id: str):
    if task_id not in progress_tracking:
        raise HTTPException(status_code=404, detail="Task not found")
    return progress_tracking[task_id]


@app.get("/api/progress-stream/{task_id}")
async def progress_stream(task_id: str):
    async def generate():
        elapsed = 0.0
        while task_id not in progress_tracking and elapsed < 5:
            await asyncio.sleep(0.1)
            elapsed += 0.1

        if task_id not in progress_tracking:
            yield f"data: {json.dumps({'status': 'error', 'detail': 'Task not found'})}\n\n"
            return

        last_snapshot = None
        safety_limit  = 700

        while elapsed < safety_limit:
            data     = progress_tracking.get(task_id, {})
            snapshot = json.dumps(data, sort_keys=True)

            if snapshot != last_snapshot:
                last_snapshot = snapshot
                yield f"data: {snapshot}\n\n"

            if data.get("status") in ("complete", "error", "timeout"):
                return

            await asyncio.sleep(0.5)
            elapsed += 0.5

        yield f"data: {json.dumps({'status': 'timeout', 'progress': 0})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/animate")
async def create_animation(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    config: str = Form(...),
):
    try:
        config_data      = json.loads(config)
        start_line       = config_data["startLine"]
        end_line         = config_data["endLine"]
        include_comments = config_data["includeComments"]
        orientation      = config_data.get("orientation", "landscape")
        quality          = config_data.get("quality", "standard")
        preset           = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["standard"])
        line_groups      = config_data["lineGroups"]
        syntax_colors    = config_data.get("syntaxColors", {})
        animation_timing = config_data.get("animationTiming", {})
        animation_type   = config_data.get("animationType", "slide_left")
        font             = config_data.get("font", "default")

        file_content = await file.read()

        cache_key    = generate_cache_key(file_content, config_data)
        cached_video = CACHE_DIR / f"{cache_key}.mp4"
        timestamp    = datetime.now().strftime("%Y%m%d_%H%M%S")
        task_id      = timestamp

        if cached_video.exists():
            original_filename = Path(file.filename).stem
            video_filename    = f"{original_filename}_{start_line}-{end_line}.mp4"
            output_video_id   = f"{task_id}_{video_filename}"
            await asyncio.to_thread(shutil.copy, cached_video, OUTPUTS_DIR / output_video_id)
            cached_video.touch()
            _prune_progress_tracking()
            progress_tracking[task_id] = {
                "progress": 100, "status": "complete",
                "videoId": output_video_id, "filename": video_filename,
            }
            return JSONResponse({"success": True, "taskId": task_id, "cached": True})

        original_filename = Path(file.filename).stem
        file_extension    = Path(file.filename).suffix
        upload_path       = UPLOADS_DIR / f"{original_filename}_{timestamp}{file_extension}"

        async with aiofiles.open(upload_path, "wb") as f:
            await f.write(file_content)

        config_json = json.dumps({
            "script_path":      str(upload_path),
            "start_line":       start_line,
            "end_line":         end_line,
            "include_comments": include_comments,
            "syntax_colors":    syntax_colors,
            "orientation":      orientation,
            "animation_timing": animation_timing,
            "animation_type":   animation_type,
            "font":             font,
            "quality":          quality,
            "line_groups":      line_groups,
        })

        output_name   = f"{original_filename}_{start_line}-{end_line}"
        media_dir     = BASE_DIR / "media"
        quality_flags = preset["portrait"] if orientation == "portrait" else preset["landscape"]
        timeout       = TIMEOUT_BY_QUALITY.get(quality, 300)

        manim_cmd = [
            "nice", "-n", "10",
            "manim", *quality_flags,
            "--flush_cache", "-o", output_name,
            str(ANIMATOR_SCRIPT), "CodeAnimation",
        ]

        _prune_progress_tracking()
        progress_tracking[task_id] = {"progress": 0, "status": "queued"}

        background_tasks.add_task(
            _do_render,
            task_id, upload_path, config_json, manim_cmd,
            orientation, media_dir, timeout, output_name, cached_video,
        )

        return JSONResponse({"success": True, "taskId": task_id, "cached": False})

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid configuration JSON")
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stream/{video_id}")
async def stream_video(video_id: str):
    video_path = OUTPUTS_DIR / video_id
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(path=video_path, media_type="video/mp4")


@app.get("/api/download/{video_id}")
async def download_video(video_id: str, background_tasks: BackgroundTasks):
    video_path = OUTPUTS_DIR / video_id
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    def cleanup_all_outputs():
        try:
            for f in OUTPUTS_DIR.glob("*"):
                if f.is_file():
                    f.unlink()
        except Exception as e:
            print(f"Warning during cleanup: {e}")

    background_tasks.add_task(cleanup_all_outputs)
    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        filename=video_id.split("_", 1)[1],
        headers={"Content-Disposition": f"attachment; filename={video_id.split('_', 1)[1]}"},
    )


@app.delete("/api/videos/{video_id}")
async def delete_video(video_id: str):
    video_path = OUTPUTS_DIR / video_id
    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    video_path.unlink()
    return {"success": True, "message": "Video deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
