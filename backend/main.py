from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import json
import subprocess
import shutil
from datetime import datetime
import threading
import time

app = FastAPI(title="Code Animator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Where our frontend is yipeee
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
ANIMATOR_SCRIPT = BASE_DIR.parent / "CodeAnimator.py"

UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)

progress_tracking = {}


def monitor_manim_progress(task_id: str, media_dir: Path, stop_event: threading.Event):
    """Monitor Manim's progress by tracking files in media directory"""
    progress_tracking[task_id] = {"progress": 0, "status": "starting"}

    # Manim rendering phases:
    # 1. SVG generation 10%
    # 2. Frame rendering 80%
    # 3. Video compilation 10%

    last_file_count = 0
    svg_phase_complete = False
    max_svg_files = 0

    while not stop_event.is_set():
        try:
            if media_dir.exists():
                # Count SVG files (text/code objects)
                svg_files = sum(1 for _ in (media_dir / "Tex").rglob("*.svg") if (media_dir / "Tex").exists())

                # Count PNG frames in partial_movie_files
                partial_dir = media_dir / "videos" / "CodeAnimator" / "1080p60" / "partial_movie_files"
                frame_files = sum(1 for _ in partial_dir.rglob("*.png") if partial_dir.exists()) if partial_dir.exists() else 0

                # Check for final video
                video_exists = any((media_dir / "videos" / "CodeAnimator" / "1080p60").rglob("*.mp4")) if (media_dir / "videos" / "CodeAnimator" / "1080p60").exists() else False

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
                            "files": total_files
                        }

                    # Frame rendering phase (15-90%)
                    elif frame_files > 0 and current_progress < 90:
                        svg_phase_complete = True
                        # Estimate frames based on file count
                        # 1080p60 generates many frames (typically 100-500+ depending on animation length)
                        frame_progress = min(75, (frame_files / 300) * 75)  # Adjusted for typical frame count
                        progress = min(90, 15 + frame_progress)  # Cap at 90%
                        progress_tracking[task_id] = {
                            "progress": progress,
                            "status": "rendering frames",
                            "files": total_files,
                            "frames": frame_files
                        }

                    # Video compilation detected
                    if video_exists and current_progress < 90:
                        progress_tracking[task_id] = {
                            "progress": 90,
                            "status": "compiling video",
                            "files": total_files
                        }

            time.sleep(0.5)  # Check every 500ms
        except Exception as e:
            print(f"Progress monitor error: {e}")
            break

    # Final progress will be set by main function


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Code Animator API is running"}


@app.get("/api/progress/{task_id}")
async def get_progress(task_id: str):
    """Get progress for a specific rendering task"""
    if task_id not in progress_tracking:
        raise HTTPException(status_code=404, detail="Task not found")

    return progress_tracking[task_id]


@app.post("/api/animate")
async def create_animation(
    file: UploadFile = File(...),
    config: str = Form(...)
):
    """
    Upload a code file and configuration, then generate animation
    """
    try:
        # Parse configuration
        config_data = json.loads(config)
        start_line = config_data["startLine"]
        end_line = config_data["endLine"]
        include_comments = config_data["includeComments"]
        line_groups = config_data["lineGroups"]

        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        original_filename = Path(file.filename).stem
        file_extension = Path(file.filename).suffix
        unique_filename = f"{original_filename}_{timestamp}{file_extension}"

        # Save uploaded file
        upload_path = UPLOADS_DIR / unique_filename
        with open(upload_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Create config file for CodeAnimator
        config_path = "/tmp/anim_config.txt"
        with open(config_path, "w") as f:
            f.write(f"{upload_path}\n")
            f.write(f"{start_line}\n")
            f.write(f"{end_line}\n")
            f.write(f"{include_comments}\n")
            for group in line_groups:
                f.write(f"{group}\n")

        # Generate output filename
        output_name = f"{original_filename}_{start_line}-{end_line}"

        # Start progress monitoring in background thread
        media_dir = BASE_DIR / "media"
        stop_event = threading.Event()
        task_id = timestamp
        progress_thread = threading.Thread(
            target=monitor_manim_progress,
            args=(task_id, media_dir, stop_event)
        )
        progress_thread.start()

        # Run Manim to generate animation at 1080p60 ALWAYS
        print(f"Starting animation generation for {unique_filename}...")
        result = subprocess.run(
            [
                "manim",
                "-pqh",  # High quality: 1080p60
                "--disable_caching",
                "--flush_cache",
                "-o", output_name,
                str(ANIMATOR_SCRIPT),
                "CodeAnimation"
            ],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )

        # Stop progress monitoring
        stop_event.set()
        progress_thread.join(timeout=2)

        if result.returncode != 0:
            print(f"Error running Manim: {result.stderr}")
            progress_tracking[task_id] = {"progress": 0, "status": "error"}
            raise HTTPException(
                status_code=500,
                detail=f"Animation generation failed: {result.stderr}"
            )

        # Update progress to 95% (video generated, now copying)
        # Only update if not already at or past 95%
        current_progress = progress_tracking.get(task_id, {}).get("progress", 0)
        if current_progress < 95:
            progress_tracking[task_id] = {"progress": 95, "status": "finalizing"}

        # Find the generated video file
        # Manim outputs to media/videos/CodeAnimator/1080p60/ (ALWAYS)
        video_filename = f"{output_name}.mp4"
        video_path = BASE_DIR / "media" / "videos" / "CodeAnimator" / "1080p60" / video_filename

        if not video_path.exists():
            raise HTTPException(
                status_code=500,
                detail=f"Generated video not found at expected location: {video_path}"
            )

        # Copy video to outputs directory
        output_video_path = OUTPUTS_DIR / f"{timestamp}_{video_filename}"
        shutil.copy(video_path, output_video_path)

        # Clean up user's uploaded file immediately (PRIVACY)
        if upload_path.exists():
            upload_path.unlink()
            print(f"Deleted uploaded file: {upload_path}")

        # Clean up all generated media files (PRIVACY)
        media_dir = BASE_DIR / "media"
        if media_dir.exists():
            shutil.rmtree(media_dir)
            print(f"Cleaned up media directory: {media_dir}")

        print(f"Animation generated successfully: {output_video_path}")

        # Mark as complete
        progress_tracking[task_id] = {"progress": 100, "status": "complete"}

        return JSONResponse({
            "success": True,
            "message": "Animation generated successfully",
            "videoId": f"{timestamp}_{video_filename}",
            "filename": video_filename,
            "taskId": task_id
        })

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid configuration JSON")
    except subprocess.TimeoutExpired:
        if 'task_id' in locals():
            progress_tracking[task_id] = {"progress": 0, "status": "timeout"}
        raise HTTPException(status_code=500, detail="Animation generation timed out")
    except Exception as e:
        print(f"Error: {str(e)}")
        if 'task_id' in locals():
            progress_tracking[task_id] = {"progress": 0, "status": "error"}
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download/{video_id}")
async def download_video(video_id: str, background_tasks: BackgroundTasks):
    """
    Download the generated animation video and delete it after sending (PRIVACY)
    """
    video_path = OUTPUTS_DIR / video_id

    if not video_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")

    # Delete ALL outputs after download completes (PRIVACY)
    def cleanup_all_outputs():
        for file in OUTPUTS_DIR.glob("*"):
            if file.is_file():
                file.unlink()
                print(f"Deleted: {file}")
        print("Cleaned all outputs directory after download")

    background_tasks.add_task(cleanup_all_outputs)

    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        filename=video_id.split("_", 1)[1]  # Remove timestamp prefix
    )


@app.get("/api/videos")
async def list_videos():
    """
    List all generated videos
    """
    videos = []
    for video_path in OUTPUTS_DIR.glob("*.mp4"):
        videos.append({
            "id": video_path.name,
            "filename": video_path.name.split("_", 1)[1],
            "size": video_path.stat().st_size,
            "created": datetime.fromtimestamp(video_path.stat().st_ctime).isoformat()
        })

    return {"videos": sorted(videos, key=lambda x: x["created"], reverse=True)}


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
    uvicorn.run(app, host="0.0.0.0", port=8000)
