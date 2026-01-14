#!/usr/bin/env python3
"""
FastAPI Backend for Code Animator
Handles file uploads, configuration, and Manim rendering
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import json
import subprocess
import os
import shutil
from datetime import datetime

app = FastAPI(title="Code Animator API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"
ANIMATOR_SCRIPT = BASE_DIR.parent / "CodeAnimator.py"

# Create directories if they don't exist
UPLOADS_DIR.mkdir(exist_ok=True)
OUTPUTS_DIR.mkdir(exist_ok=True)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "Code Animator API is running"}


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

        if result.returncode != 0:
            print(f"Error running Manim: {result.stderr}")
            raise HTTPException(
                status_code=500,
                detail=f"Animation generation failed: {result.stderr}"
            )

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

        return JSONResponse({
            "success": True,
            "message": "Animation generated successfully",
            "videoId": f"{timestamp}_{video_filename}",
            "filename": video_filename
        })

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid configuration JSON")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="Animation generation timed out")
    except Exception as e:
        print(f"Error: {str(e)}")
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
