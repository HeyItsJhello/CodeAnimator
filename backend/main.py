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
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI(title="Code Animator API")


def generate_cache_key(file_content: bytes, config_data: dict) -> str:
    normalized = {
        "content_hash": hashlib.md5(file_content).hexdigest(),
        "start_line": config_data.get("startLine"),
        "end_line": config_data.get("endLine"),
        "include_comments": config_data.get("includeComments"),
        "orientation": config_data.get("orientation", "landscape"),
        "quality": config_data.get("quality", "standard"),
        "line_groups": json.dumps(sorted(config_data.get("lineGroups", []))),
        "syntax_colors": json.dumps(
            config_data.get("syntaxColors", {}), sort_keys=True
        ),
        "animation_timing": json.dumps(
            config_data.get("animationTiming", {}), sort_keys=True
        ),
    }
    return hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()[
        :16
    ]



# Configure CORS - allow local development and production frontend
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
]
# Filter empty strings
origins = [o for o in origins if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
CACHE_DIR = BASE_DIR / "cache"
ANIMATOR_SCRIPT = BASE_DIR.parent / "CodeAnimator.py"

UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

# Cache settings
MAX_CACHE_AGE = 7 * 24 * 60 * 60  # 7 days in seconds
MAX_CACHE_SIZE = 5 * 1024 * 1024 * 1024  # 5 GB

# Quality presets for different render speeds/quality tradeoffs
QUALITY_PRESETS = {
    "fast": {
        "landscape": ["-ql", "--frame_rate", "60"],  # 480p60
        "portrait": ["-r", "540,960", "--frame_rate", "60"],
        "video_dir": "480p60",
    },
    "standard": {
        "landscape": ["-qm", "--frame_rate", "60"],  # 720p60
        "portrait": ["-r", "720,1280", "--frame_rate", "60"],
        "video_dir": "720p60",
    },
    "high": {
        "landscape": ["-qh", "--frame_rate", "60"],  # 1080p60
        "portrait": ["-r", "1080,1920", "--frame_rate", "60"],
        "video_dir": "1080p60",
    },
}

TIMEOUT_BY_QUALITY = {
    "fast": 180,
    "standard": 360,
    "high": 600,
}

progress_tracking = {}


def monitor_manim_progress(task_id: str, media_dir: Path, stop_event: threading.Event):
    # Monitor Manim's progress by tracking the files made in media directory
    progress_tracking[task_id] = {"progress": 0, "status": "starting"}

    # Manim rendering phases:
    # 1. SVG generation 10%
    # 2. Frame rendering 80%
    # 3. Video compilation 10%

    last_file_count = 0
    max_svg_files = 0

    while not stop_event.is_set():
        try:
            if media_dir.exists():
                # Count SVG files (text/code objects) - single existence check
                tex_dir = media_dir / "Tex"
                svg_files = (
                    sum(1 for _ in tex_dir.rglob("*.svg")) if tex_dir.exists() else 0
                )

                # Count PNG frames more efficiently - consolidate directory checks
                frame_files = 0
                video_exists = False
                # Check all possible quality directories
                for quality_dir in [
                    "480p24",
                    "720p30",
                    "1080p30",
                    "1080p60",
                    "1920p60",
                    "960p24",
                    "1280p30",
                    "1920p30",
                ]:
                    partial_dir = (
                        media_dir
                        / "videos"
                        / "CodeAnimator"
                        / quality_dir
                        / "partial_movie_files"
                    )
                    if partial_dir.exists():
                        # Count files with list comprehension (more efficient than generator with sum)
                        frame_files += len([f for f in partial_dir.glob("*.png")])
                    video_dir = media_dir / "videos" / "CodeAnimator" / quality_dir
                    # Early exit if video found - no need to check further
                    if not video_exists and video_dir.exists():
                        video_exists = any(video_dir.glob("*.mp4"))

                total_files = svg_files + frame_files

                # Get current progress to avoid going backwards
                current_progress = progress_tracking.get(task_id, {}).get("progress", 0)

                if total_files > last_file_count or video_exists:
                    last_file_count = total_files

                    # SVG generation phase (0-15%)
                    if svg_files > 0 and frame_files == 0 and current_progress < 15:
                        if svg_files > max_svg_files:
                            max_svg_files = svg_files
                        progress = min(15, (svg_files / max(max_svg_files, 20)) * 15)
                        progress_tracking[task_id] = {
                            "progress": progress,
                            "status": "generating SVGs",
                            "files": total_files,
                        }

                    # Frame rendering phase (15-90%)
                    elif frame_files > 0 and current_progress < 90:
                        # Estimate frames based on file count - more efficient calculation
                        frame_progress = min(75, (frame_files / 300) * 75)
                        progress = min(90, 15 + frame_progress)
                        progress_tracking[task_id] = {
                            "progress": progress,
                            "status": "rendering frames",
                            "files": total_files,
                            "frames": frame_files,
                        }

                    # Video compilation detected
                    if video_exists and current_progress < 90:
                        progress_tracking[task_id] = {
                            "progress": 90,
                            "status": "compiling video",
                            "files": total_files,
                        }

            time.sleep(1.5)  # Check every 1500ms (reduced from 500ms for efficiency)
        except Exception:
            break

    # Final progress will be set by main function


def cleanup_cache():
    now = time.time()
    total_size = 0
    files_by_age = []

    # Use os.scandir for more efficient stat batching
    try:
        with os.scandir(CACHE_DIR) as entries:
            for entry in entries:
                if entry.name.endswith(".mp4"):
                    try:
                        stat = entry.stat()
                        age = now - stat.st_mtime
                        total_size += stat.st_size
                        files_by_age.append((age, stat.st_size, Path(entry.path)))
                    except OSError:
                        continue
    except OSError:
        return

    # Remove files older than MAX_CACHE_AGE
    for age, size, f in files_by_age:
        if age > MAX_CACHE_AGE:
            try:
                f.unlink()
                total_size -= size
            except OSError:
                pass

    # Remove oldest files if cache too large (sort ascending, pop from end = O(1))
    files_by_age.sort()  # Oldest last (ascending by age)
    while total_size > MAX_CACHE_SIZE and files_by_age:
        _, size, f = files_by_age.pop()  # O(1) pop from end
        if f.exists():
            try:
                f.unlink()
                total_size -= size
            except OSError:
                pass


@app.get("/")
async def root():
    # Health check endpoint
    return {"status": "ok", "message": "Code Animator API is running"}


@app.get("/api/progress/{task_id}")
async def get_progress(task_id: str):
    # Get progress for a specific rendering task
    if task_id not in progress_tracking:
        raise HTTPException(status_code=404, detail="Task not found")

    return progress_tracking[task_id]


@app.post("/api/animate")
async def create_animation(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    config: str = Form(...),
):
    # Upload a code file and configuration, then generate animation

    try:
        # Parse configuration
        config_data = json.loads(config)
        start_line = config_data["startLine"]
        end_line = config_data["endLine"]
        include_comments = config_data["includeComments"]
        orientation = config_data.get(
            "orientation", "landscape"
        )  # 'landscape' or 'portrait'
        quality = config_data.get(
            "quality", "standard"
        )  # 'fast', 'standard', or 'high'
        preset = QUALITY_PRESETS.get(quality, QUALITY_PRESETS["standard"])
        line_groups = config_data["lineGroups"]
        syntax_colors = config_data.get("syntaxColors", {})

        # Read file content for cache key generation
        file_content = await file.read()
        await file.seek(0)  # Reset for later use

        # Check video cache
        cache_key = generate_cache_key(file_content, config_data)
        cached_video = CACHE_DIR / f"{cache_key}.mp4"

        if cached_video.exists():
            # Cache hit - copy to outputs and return immediately
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            original_filename = Path(file.filename).stem
            video_filename = f"{original_filename}_{start_line}-{end_line}.mp4"
            output_video_path = OUTPUTS_DIR / f"{timestamp}_{video_filename}"
            shutil.copy(cached_video, output_video_path)

            # Update cache file's mtime to keep it fresh
            cached_video.touch()

            # Add to progress tracking so frontend polling works
            task_id = f"cached-{timestamp}"
            progress_tracking[task_id] = {"progress": 100, "status": "complete"}

            return JSONResponse(
                {
                    "success": True,
                    "message": "Animation retrieved from cache",
                    "videoId": f"{timestamp}_{video_filename}",
                    "filename": video_filename,
                    "taskId": task_id,
                    "cached": True,
                }
            )
        animation_timing = config_data.get("animationTiming", {})

        # Generate unique filename - do this once
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_filename = Path(file.filename).stem
        file_extension = Path(file.filename).suffix
        unique_filename = f"{original_filename}_{timestamp}{file_extension}"

        # Save uploaded file - use already-read content from cache check
        upload_path = UPLOADS_DIR / unique_filename
        async with aiofiles.open(upload_path, "wb") as f:
            await f.write(file_content)

        # Build config JSON to pass via stdin (eliminates temp file I/O)
        config_json = json.dumps(
            {
                "script_path": str(upload_path),
                "start_line": start_line,
                "end_line": end_line,
                "include_comments": include_comments,
                "syntax_colors": syntax_colors,
                "orientation": orientation,
                "animation_timing": animation_timing,
                "quality": quality,
                "line_groups": line_groups,
            }
        )

        # Generate output filename
        output_name = f"{original_filename}_{start_line}-{end_line}"

        # Start progress monitoring in background thread
        media_dir = BASE_DIR / "media"
        stop_event = threading.Event()
        task_id = timestamp
        progress_thread = threading.Thread(
            target=monitor_manim_progress, args=(task_id, media_dir, stop_event)
        )
        progress_thread.start()

        # Build Manim command based on orientation and quality preset
        quality_flags = (
            preset["portrait"] if orientation == "portrait" else preset["landscape"]
        )
        video_quality_dir = preset["video_dir"]

        manim_cmd = [
            "nice",
            "-n",
            "10",  # Lower CPU priority so FastAPI stays responsive
            "manim",
            *quality_flags,
            "--flush_cache",
            "-o",
            output_name,
            str(ANIMATOR_SCRIPT),
            "CodeAnimation",
        ]

        timeout = TIMEOUT_BY_QUALITY.get(quality, 300)
        # Pass orientation via env var (needed at module load time)
        # Pass full config via stdin (eliminates temp file race conditions)
        env = os.environ.copy()
        env["ANIM_ORIENTATION"] = orientation

        # Use Popen with streaming to avoid buffering all output in memory
        proc = subprocess.Popen(
            manim_cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,  # Discard stdout to save memory
            stderr=subprocess.PIPE,
            text=True,
            env=env,
        )
        try:
            _, stderr = proc.communicate(input=config_json, timeout=timeout)
            returncode = proc.returncode
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            raise

        # monitoring
        stop_event.set()
        progress_thread.join(timeout=2)

        if returncode != 0:
            print(f"Error running Manim: {stderr}")
            progress_tracking[task_id] = {"progress": 0, "status": "error"}
            raise HTTPException(
                status_code=500, detail=f"Animation generation failed: {stderr}"
            )

        # Update progress to 95% (video generated, now copying)
        # Only update if not already at or past 95%
        current_progress = progress_tracking.get(task_id, {}).get("progress", 0)
        if current_progress < 95:
            progress_tracking[task_id] = {"progress": 95, "status": "finalizing"}

        # Find the generated video file
        # Manim outputs to media/videos/CodeAnimator/{quality_dir}/ but dir name varies
        video_filename = f"{output_name}.mp4"
        videos_base = BASE_DIR / "media" / "videos" / "CodeAnimator"

        # Search for the video in any quality subdirectory
        video_path = None
        if videos_base.exists():
            for quality_subdir in videos_base.iterdir():
                if quality_subdir.is_dir():
                    candidate = quality_subdir / video_filename
                    if candidate.exists():
                        video_path = candidate
                        break

        if video_path is None or not video_path.exists():
            raise HTTPException(
                status_code=500, detail=f"Generated video not found in {videos_base}"
            )

        # Copy video to outputs directory
        output_video_path = OUTPUTS_DIR / f"{timestamp}_{video_filename}"
        shutil.copy(video_path, output_video_path)

        # Save to cache for future identical requests
        try:
            shutil.copy(video_path, cached_video)
            # Run cache cleanup in background (non-blocking)
            background_tasks.add_task(cleanup_cache)
        except Exception as e:
            print(f"Warning: Could not cache video: {e}")

        # Clean up user's uploaded file immediately (PRIVACY)
        try:
            if upload_path.exists():
                upload_path.unlink()
        except Exception:
            pass

        # Clean up all generated media files (PRIVACY) - more efficient batch delete
        media_dir = BASE_DIR / "media"
        if media_dir.exists():
            try:
                shutil.rmtree(media_dir)
            except Exception:
                pass

        # Mark as complete
        progress_tracking[task_id] = {"progress": 100, "status": "complete"}

        return JSONResponse(
            {
                "success": True,
                "message": "Animation generated successfully",
                "videoId": f"{timestamp}_{video_filename}",
                "filename": video_filename,
                "taskId": task_id,
            }
        )

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid configuration JSON")
    except subprocess.TimeoutExpired:
        if "task_id" in locals():
            progress_tracking[task_id] = {"progress": 0, "status": "timeout"}
        raise HTTPException(status_code=500, detail="Animation generation timed out")
    except Exception as e:
        print(f"Error: {str(e)}")
        if "task_id" in locals():
            raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stream/{video_id}")
async def stream_video(video_id: str):
    # Stream the video for preview (no cleanup - file stays for download)
    video_path = OUTPUTS_DIR / video_id

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    return FileResponse(
        path=video_path,
        media_type="video/mp4",
    )


@app.get("/api/download/{video_id}")
async def download_video(video_id: str, background_tasks: BackgroundTasks):
    # Download the generated animation video and delete it after sending (PRIVACY)
    video_path = OUTPUTS_DIR / video_id

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete ALL outputs after download completes (PRIVACY)
    def cleanup_all_outputs():
        try:
            # Use glob for more efficient batch operations
            for file in OUTPUTS_DIR.glob("*"):
                if file.is_file():
                    file.unlink()
        except Exception as e:
            print(f"Warning during cleanup: {e}")

    background_tasks.add_task(cleanup_all_outputs)

    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        filename=video_id.split("_", 1)[1],  # Remove timestamp prefix
        headers={
            "Content-Disposition": f"attachment; filename={video_id.split('_', 1)[1]}"
        },
    )


@app.delete("/api/videos/{video_id}")
async def delete_video(video_id: str):
    """
    Delete a generated video
    """
    video_path = OUTPUTS_DIR / video_id

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    video_path.unlink()
    return {"success": True, "message": "Video deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)  # HF Spaces uses port 7860
