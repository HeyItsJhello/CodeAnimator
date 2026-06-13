import asyncio
import hashlib
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

import aiofiles
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

BASE_DIR        = Path(__file__).parent
UPLOADS_DIR     = BASE_DIR / "uploads"
OUTPUTS_DIR     = BASE_DIR / "outputs"
CACHE_DIR       = BASE_DIR / "cache"
RENDERS_DIR     = BASE_DIR / "renders"
WORKER_SCRIPT   = BASE_DIR.parent / "manim_worker.py"

for _d in (UPLOADS_DIR, OUTPUTS_DIR, CACHE_DIR, RENDERS_DIR):
    _d.mkdir(exist_ok=True)

MAX_CACHE_AGE  = 7 * 24 * 60 * 60
MAX_CACHE_SIZE = 5 * 1024 ** 3

TIMEOUT_BY_QUALITY = {"fast": 180, "standard": 360, "high": 600}

# Quality dirs Manim may create (height × framerate)
_VIDEO_QUALITY_DIRS = [
    "480p24", "480p60",
    "720p30", "720p60",
    "960p24", "960p60",
    "1080p30", "1080p60",
    "1280p30", "1280p60",
    "1920p30", "1920p60",
]

# ─── progress tracking ───────────────────────────────────────────────────────

progress_tracking: dict = {}
_PROGRESS_MAX_ENTRIES = 500

_render_queue: list[str] = []
_render_queue_lock: asyncio.Lock = None  # created in lifespan


def _prune_progress_tracking():
    if len(progress_tracking) < _PROGRESS_MAX_ENTRIES:
        return
    terminal = {k for k, v in progress_tracking.items()
                if v.get("status") in ("complete", "error", "timeout")}
    for k in list(terminal)[:len(terminal) // 2]:
        progress_tracking.pop(k, None)


# ─── worker pool ─────────────────────────────────────────────────────────────

class ManimWorker:
    """One persistent Python subprocess with Manim pre-imported."""

    def __init__(self):
        self.proc = subprocess.Popen(
            [sys.executable, str(WORKER_SCRIPT)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        # Block until worker signals it has finished importing Manim
        line = self.proc.stdout.readline()
        if not line:
            err = self.proc.stderr.read(2000)
            raise RuntimeError(f"Worker failed to start: {err}")
        data = json.loads(line)
        if data.get("type") != "ready":
            raise RuntimeError(f"Unexpected worker startup message: {data}")

    def send_job(self, job: dict) -> dict:
        """Synchronous send-and-receive. Run inside asyncio.to_thread."""
        self.proc.stdin.write(json.dumps(job) + "\n")
        self.proc.stdin.flush()
        line = self.proc.stdout.readline()
        if not line:
            raise RuntimeError("Worker process died unexpectedly")
        return json.loads(line)

    def is_alive(self) -> bool:
        return self.proc.poll() is None

    def kill(self):
        try:
            self.proc.kill()
        except Exception:
            pass


class WorkerPool:
    """Async pool of pre-warmed ManimWorker processes."""

    def __init__(self, size: int = 2):
        self.size = size
        self._workers: list[ManimWorker] = []
        self._queue: asyncio.Queue[ManimWorker] | None = None

    async def initialize(self):
        self._queue = asyncio.Queue()
        results = await asyncio.gather(
            *[asyncio.to_thread(ManimWorker) for _ in range(self.size)],
            return_exceptions=True,
        )
        for r in results:
            if isinstance(r, Exception):
                print(f"[worker] Failed to start worker: {r}", file=sys.stderr)
            else:
                self._workers.append(r)
                self._queue.put_nowait(r)
        print(f"[worker] Pool ready: {len(self._workers)}/{self.size} workers", file=sys.stderr)

    async def acquire(self) -> ManimWorker:
        while self._queue is None:
            await asyncio.sleep(0.1)
        return await self._queue.get()

    def release(self, worker: ManimWorker):
        if worker.is_alive():
            self._queue.put_nowait(worker)
        else:
            asyncio.create_task(self._replace(worker))

    async def _replace(self, dead: ManimWorker):
        try:
            self._workers.remove(dead)
        except ValueError:
            pass
        try:
            w = await asyncio.to_thread(ManimWorker)
            self._workers.append(w)
            self._queue.put_nowait(w)
            print("[worker] Replaced dead worker", file=sys.stderr)
        except Exception as e:
            print(f"[worker] Failed to replace worker: {e}", file=sys.stderr)

    async def shutdown(self):
        for w in self._workers:
            w.kill()


worker_pool = WorkerPool(size=2)


# ─── lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _render_queue_lock
    _render_queue_lock = asyncio.Lock()
    # Pre-warm workers in background; first request will wait if not ready
    asyncio.create_task(worker_pool.initialize())
    yield
    await worker_pool.shutdown()


app = FastAPI(title="Code Animator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── config helpers ──────────────────────────────────────────────────────────

_FONT_DISPLAY_NAMES = {
    "default": "System Monospace", "jetbrains_mono": "JetBrains Mono",
    "fira_code": "Fira Code", "source_code_pro": "Source Code Pro",
    "roboto_mono": "Roboto Mono", "ibm_plex_mono": "IBM Plex Mono",
    "inconsolata": "Inconsolata", "space_mono": "Space Mono",
    "share_tech_mono": "Share Tech Mono", "pt_mono": "PT Mono",
    "courier_new": "Courier New", "anonymous_pro": "Anonymous Pro",
    "pixel_code": "Pixel Code", "vt323": "VT323",
}

def _build_worker_config(camel: dict, script_path: str, quality: str) -> dict:
    """Convert camelCase frontend config to snake_case worker config."""
    return {
        "script_path":      script_path,
        "start_line":       camel["startLine"],
        "end_line":         camel["endLine"],
        "include_comments": camel["includeComments"],
        "syntax_colors":    camel.get("syntaxColors", {}),
        "orientation":      camel.get("orientation", "landscape"),
        "animation_timing": camel.get("animationTiming", {}),
        "animation_type":   camel.get("animationType", "slide_left"),
        "font":             camel.get("font", "default"),
        "quality":          quality,
        "line_groups":      camel.get("lineGroups", []),
    }

def _expand_line_groups(raw_groups: list, start_line: int, end_line: int) -> list[list[int]]:
    """Expand ALL_REMAINING / SPLIT N group specs into concrete line lists."""
    shown: set[int] = set()
    expanded: list[list[int]] = []
    for grp in raw_groups:
        if grp == "ALL_REMAINING":
            remaining = [l for l in range(start_line, end_line + 1) if l not in shown]
            expanded.append(remaining)
            shown.update(remaining)
        elif isinstance(grp, str) and grp.startswith("SPLIT "):
            n = int(grp.split()[1])
            remaining = [l for l in range(start_line, end_line + 1) if l not in shown]
            chunk = max(1, len(remaining) // n)
            for i in range(0, len(remaining), chunk):
                sub = remaining[i:i + chunk]
                if sub:
                    expanded.append(sub)
                    shown.update(sub)
        else:
            nums = [int(x) for x in (grp.split() if isinstance(grp, str) else grp)]
            expanded.append(nums)
            shown.update(nums)
    return expanded


# ─── cache helpers ────────────────────────────────────────────────────────────

def generate_cache_key(file_content: bytes, config_data: dict) -> str:
    normalized = {
        "content_hash":     hashlib.md5(file_content).hexdigest(),
        "start_line":       config_data.get("startLine"),
        "end_line":         config_data.get("endLine"),
        "include_comments": config_data.get("includeComments"),
        "orientation":      config_data.get("orientation", "landscape"),
        "quality":          config_data.get("quality", "standard"),
        "line_groups":      json.dumps(sorted(config_data.get("lineGroups", []))),
        "syntax_colors":    json.dumps(config_data.get("syntaxColors", {}), sort_keys=True),
        "animation_timing": json.dumps(config_data.get("animationTiming", {}), sort_keys=True),
        "animation_type":   config_data.get("animationType", "slide_left"),
        "font":             config_data.get("font", "default"),
    }
    return hashlib.sha256(json.dumps(normalized, sort_keys=True).encode()).hexdigest()[:16]


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
                    path = Path(entry.path)
                    if age > MAX_CACHE_AGE:
                        path.unlink(missing_ok=True)
                    else:
                        total_size += stat.st_size
                        candidates.append((age, stat.st_size, path))
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


# ─── pre-render validation ───────────────────────────────────────────────────

def validate_render_config(file_content: bytes, config_data: dict) -> list[str]:
    """Fast (<100 ms) config validation. Returns a list of error strings."""
    errors = []
    lines = file_content.decode("utf-8", errors="replace").split("\n")
    total = len(lines)

    start = config_data.get("startLine", 1)
    end   = config_data.get("endLine", total)

    if start < 1:
        errors.append(f"startLine ({start}) must be ≥ 1")
    if end > total:
        errors.append(f"endLine ({end}) exceeds file length ({total} lines)")
    if start > end:
        errors.append(f"startLine ({start}) must be ≤ endLine ({end})")

    for i, group in enumerate(config_data.get("lineGroups", [])):
        if group == "ALL_REMAINING":
            continue
        if isinstance(group, str) and group.startswith("SPLIT "):
            try:
                n = int(group.split()[1])
                if n < 2:
                    errors.append(f"Group {i+1}: SPLIT value must be ≥ 2")
            except (ValueError, IndexError):
                errors.append(f"Group {i+1}: invalid SPLIT format")
            continue
        try:
            nums = [int(x) for x in (group.split() if isinstance(group, str) else group)]
            for ln in nums:
                if ln < start or ln > end:
                    errors.append(f"Group {i+1}: line {ln} outside range [{start},{end}]")
        except (ValueError, TypeError):
            errors.append(f"Group {i+1}: invalid line number format")

    return errors


# ─── progress monitor thread ─────────────────────────────────────────────────

def monitor_manim_progress(task_id: str, media_dir: Path, stop_event: threading.Event):
    progress_tracking[task_id] = {"progress": 0, "status": "starting"}
    last_file_count = 0
    max_svg_files   = 0

    while not stop_event.is_set():
        try:
            if media_dir.exists():
                tex_dir   = media_dir / "Tex"
                svg_files = sum(1 for _ in tex_dir.rglob("*.svg")) if tex_dir.exists() else 0

                frame_files  = 0
                video_exists = False
                for qdir in _VIDEO_QUALITY_DIRS:
                    partial = media_dir / "videos" / "CodeAnimator" / qdir / "partial_movie_files"
                    if partial.exists():
                        frame_files += len(list(partial.glob("*.png")))
                    vdir = media_dir / "videos" / "CodeAnimator" / qdir
                    if not video_exists and vdir.exists():
                        video_exists = any(vdir.glob("*.mp4"))

                total_files      = svg_files + frame_files
                current_progress = progress_tracking.get(task_id, {}).get("progress", 0)

                if total_files > last_file_count or video_exists:
                    last_file_count = total_files
                    if svg_files > 0 and frame_files == 0 and current_progress < 15:
                        max_svg_files = max(max_svg_files, svg_files)
                        progress_tracking[task_id] = {
                            "progress": min(15, (svg_files / max(max_svg_files, 20)) * 15),
                            "status": "generating SVGs",
                        }
                    elif frame_files > 0 and current_progress < 90:
                        progress_tracking[task_id] = {
                            "progress": min(90, 15 + min(75, (frame_files / 300) * 75)),
                            "status": "rendering frames",
                        }
                    if video_exists and current_progress < 90:
                        progress_tracking[task_id] = {"progress": 90, "status": "compiling video"}

            time.sleep(1.5)
        except Exception:
            break


# ─── queue position helpers ───────────────────────────────────────────────────

async def _update_queue_positions():
    async with _render_queue_lock:
        total = len(_render_queue)
        for i, tid in enumerate(_render_queue):
            if tid in progress_tracking:
                progress_tracking[tid] = {
                    "progress":       0,
                    "status":         "queued",
                    "queue_position": i + 1,
                    "queue_total":    total,
                }


# ─── render background task ───────────────────────────────────────────────────

async def _warm_cache(file_bytes: bytes, orig_config: dict, completed_quality: str):
    """After a successful render, silently pre-render other quality levels."""
    ext = Path(orig_config.get("scriptPath", "file.py")).suffix

    for quality in ("fast", "standard", "high"):
        if quality == completed_quality:
            continue
        warm_orig = {**orig_config, "quality": quality}
        cache_key  = generate_cache_key(file_bytes, warm_orig)
        cached     = CACHE_DIR / f"{cache_key}.mp4"
        if cached.exists():
            cached.touch()
            continue

        task_id   = f"warm_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{quality}"
        warm_path = UPLOADS_DIR / f"warm_{task_id}{ext}"
        media_dir = RENDERS_DIR / task_id
        out_name  = f"warm_{task_id}"

        try:
            warm_path.write_bytes(file_bytes)
        except Exception as e:
            print(f"[warm] Could not write temp file: {e}", file=sys.stderr)
            continue

        worker_cfg = _build_worker_config(warm_orig, str(warm_path), quality)
        timeout_s  = TIMEOUT_BY_QUALITY.get(quality, 360)
        worker     = await worker_pool.acquire()
        job        = {"task_id": task_id, "config": worker_cfg,
                      "media_dir": str(media_dir), "output_name": out_name}
        try:
            result = await asyncio.wait_for(
                asyncio.to_thread(worker.send_job, job),
                timeout=float(timeout_s),
            )
            if result.get("type") == "success":
                vpath = Path(result["video_path"])
                if vpath.exists():
                    await asyncio.to_thread(shutil.copy, vpath, cached)
                    print(f"[warm] Cached {quality} ({cache_key})", file=sys.stderr)
        except Exception as e:
            print(f"[warm] {quality} failed: {e}", file=sys.stderr)
        finally:
            worker_pool.release(worker)
            warm_path.unlink(missing_ok=True)
            await asyncio.to_thread(shutil.rmtree, media_dir, ignore_errors=True)


async def _do_render(
    task_id: str,
    upload_path: Path,
    config_data: dict,
    media_dir: Path,
    timeout: int,
    output_name: str,
    cached_video: Path,
    original_config: dict = None,
):
    # Add to queue and broadcast positions
    async with _render_queue_lock:
        _render_queue.append(task_id)
    await _update_queue_positions()

    # Wait for an available worker (blocks if all workers are busy)
    worker = await worker_pool.acquire()

    # Remove from queue, update remaining positions
    async with _render_queue_lock:
        try:
            _render_queue.remove(task_id)
        except ValueError:
            pass
    await _update_queue_positions()

    progress_tracking[task_id] = {"progress": 0, "status": "starting"}
    stop_event = threading.Event()
    monitor_thread = threading.Thread(
        target=monitor_manim_progress,
        args=(task_id, media_dir, stop_event),
        daemon=True,
    )
    monitor_thread.start()

    job = {
        "task_id":     task_id,
        "config":      config_data,
        "media_dir":   str(media_dir),
        "output_name": output_name,
    }

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(worker.send_job, job),
            timeout=float(timeout),
        )
    except asyncio.TimeoutError:
        stop_event.set()
        monitor_thread.join(timeout=2)
        worker.kill()
        worker_pool.release(worker)
        progress_tracking[task_id] = {"progress": 0, "status": "timeout"}
        upload_path.unlink(missing_ok=True)
        await asyncio.to_thread(shutil.rmtree, media_dir, ignore_errors=True)
        return

    stop_event.set()
    monitor_thread.join(timeout=2)
    worker_pool.release(worker)

    if result.get("type") == "error":
        progress_tracking[task_id] = {
            "progress": 0, "status": "error",
            "detail": result.get("detail", "")[-500:],
        }
        upload_path.unlink(missing_ok=True)
        await asyncio.to_thread(shutil.rmtree, media_dir, ignore_errors=True)
        return

    video_path = Path(result["video_path"])
    if not video_path.exists():
        progress_tracking[task_id] = {
            "progress": 0, "status": "error",
            "detail": f"Output video missing: {video_path}",
        }
        upload_path.unlink(missing_ok=True)
        await asyncio.to_thread(shutil.rmtree, media_dir, ignore_errors=True)
        return

    current = progress_tracking.get(task_id, {}).get("progress", 0)
    if current < 95:
        progress_tracking[task_id] = {"progress": 95, "status": "finalizing"}

    video_filename    = f"{output_name}.mp4"
    output_video_id   = f"{task_id}_{video_filename}"
    output_video_path = OUTPUTS_DIR / output_video_id

    await asyncio.to_thread(shutil.copy, video_path, output_video_path)

    try:
        await asyncio.to_thread(shutil.copy, video_path, cached_video)
        await asyncio.to_thread(cleanup_cache)
    except Exception as e:
        print(f"Warning: could not cache video: {e}", file=sys.stderr)

    # Schedule cache warming for other quality levels (background, non-blocking)
    if original_config:
        try:
            file_bytes = await asyncio.to_thread(upload_path.read_bytes)
            asyncio.create_task(_warm_cache(
                file_bytes,
                original_config,
                original_config.get("quality", "standard"),
            ))
        except Exception as e:
            print(f"[warm] Setup failed: {e}", file=sys.stderr)

    upload_path.unlink(missing_ok=True)
    await asyncio.to_thread(shutil.rmtree, media_dir, ignore_errors=True)

    progress_tracking[task_id] = {
        "progress": 100,
        "status":   "complete",
        "videoId":  output_video_id,
        "filename": video_filename,
    }
    _prune_progress_tracking()


# ─── routes ───────────────────────────────────────────────────────────────────

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


@app.post("/api/dry-run")
async def dry_run(file: UploadFile = File(...), config: str = Form(...)):
    """Analyze what will be rendered without starting a render (< 100 ms)."""
    try:
        cfg          = json.loads(config)
        file_content = await file.read()

        errors = validate_render_config(file_content, cfg)
        if errors:
            raise HTTPException(status_code=422, detail={"errors": errors})

        start_line = cfg["startLine"]
        end_line   = cfg["endLine"]
        quality    = cfg.get("quality", "standard")

        _QUALITY_LABELS = {
            "fast":     "480p 60fps",
            "standard": "720p 60fps",
            "high":     "1080p 60fps",
        }
        _FRAME_RATES = {"fast": 60, "standard": 60, "high": 60}

        timing = cfg.get("animationTiming", {})
        initial_delay        = max(0.0,  float(timing.get("initialDelay",       1.5)))
        line_slide_in        = max(0.05, float(timing.get("lineSlideIn",         0.4)))
        pause_between_groups = max(0.0,  float(timing.get("pauseBetweenGroups", 0.2)))
        final_pause          = max(0.0,  float(timing.get("finalPause",          2.0)))

        expanded = _expand_line_groups(cfg.get("lineGroups", []), start_line, end_line)

        group_info = []
        for grp in expanded:
            dur = len(grp) * line_slide_in + pause_between_groups
            group_info.append({"lines": grp, "n_lines": len(grp), "duration_s": round(dur, 2)})

        total_anim   = sum(g["duration_s"] for g in group_info)
        total_dur    = initial_delay + total_anim + final_pause
        frame_rate   = _FRAME_RATES.get(quality, 60)
        frame_count  = int(total_dur * frame_rate)
        all_animated = sorted({ln for g in expanded for ln in g})

        return {
            "quality":          _QUALITY_LABELS.get(quality, quality),
            "font":             _FONT_DISPLAY_NAMES.get(cfg.get("font", "default"), cfg.get("font", "default")),
            "animation_type":   cfg.get("animationType", "slide_left"),
            "orientation":      cfg.get("orientation", "landscape"),
            "line_range":       [start_line, end_line],
            "lines_animated":   all_animated,
            "n_groups":         len(expanded),
            "groups":           group_info,
            "estimated_duration_s":  round(total_dur, 1),
            "estimated_frames": frame_count,
            "frame_rate":       frame_rate,
            "timing": {
                "initial_delay":        initial_delay,
                "line_slide_in":        line_slide_in,
                "pause_between_groups": pause_between_groups,
                "final_pause":          final_pause,
            },
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/validate")
async def validate_config(file: UploadFile = File(...), config: str = Form(...)):
    """Fast (<100 ms) pre-render validation endpoint."""
    try:
        config_data  = json.loads(config)
        file_content = await file.read()
        errors = validate_render_config(file_content, config_data)
        return {"valid": not errors, "errors": errors}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid configuration JSON")


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
        line_groups      = config_data["lineGroups"]
        syntax_colors    = config_data.get("syntaxColors", {})
        animation_timing = config_data.get("animationTiming", {})
        animation_type   = config_data.get("animationType", "slide_left")
        font             = config_data.get("font", "default")

        file_content = await file.read()

        # Fast validation before queuing
        errors = validate_render_config(file_content, config_data)
        if errors:
            raise HTTPException(status_code=422, detail={"errors": errors})

        cache_key    = generate_cache_key(file_content, config_data)
        cached_video = CACHE_DIR / f"{cache_key}.mp4"
        timestamp    = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
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
                "cached": True,
            }
            return JSONResponse({"success": True, "taskId": task_id, "cached": True})

        original_filename = Path(file.filename).stem
        file_extension    = Path(file.filename).suffix
        upload_path       = UPLOADS_DIR / f"{original_filename}_{timestamp}{file_extension}"

        async with aiofiles.open(upload_path, "wb") as f:
            await f.write(file_content)

        render_config = _build_worker_config(config_data, str(upload_path), quality)
        output_name   = f"{original_filename}_{start_line}-{end_line}"
        media_dir     = RENDERS_DIR / task_id
        timeout       = TIMEOUT_BY_QUALITY.get(quality, 360)

        _prune_progress_tracking()
        progress_tracking[task_id] = {"progress": 0, "status": "queued", "queue_position": None}

        background_tasks.add_task(
            _do_render,
            task_id, upload_path, render_config, media_dir,
            timeout, output_name, cached_video,
            original_config=config_data,
        )

        return JSONResponse({"success": True, "taskId": task_id, "cached": False})

    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid configuration JSON")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
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
            print(f"Warning during cleanup: {e}", file=sys.stderr)

    background_tasks.add_task(cleanup_all_outputs)
    filename = video_id.split("_", 1)[1]
    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
