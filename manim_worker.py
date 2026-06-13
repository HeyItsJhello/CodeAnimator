"""
Persistent Manim worker process.

Pre-imports Manim once on startup (the expensive step), then handles
animation jobs via line-delimited JSON on stdin/stdout.

Protocol (line-delimited JSON):
  startup → prints {"type":"ready"}
  stdin   ← {"task_id":..., "config":{...}, "media_dir":..., "output_name":...}
  stdout  → {"type":"success", "video_path":"..."} | {"type":"error", "detail":"..."}
"""
import importlib.util
import json
import os
import shutil
import sys
import traceback
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent

# ── redirect stdout during import so Manim's startup prints don't pollute the protocol
_real_stdout = sys.stdout
sys.stdout = sys.stderr

import manimpango          # noqa: E402
from manim import *        # noqa: E402, F401, F403

sys.stdout = _real_stdout

# ── signal parent that Manim is warmed up and we are ready for jobs ────────────
sys.stdout.write(json.dumps({"type": "ready"}) + "\n")
sys.stdout.flush()

# ── shared glyph / SVG cache (persists across all renders in this worker) ──────
GLYPH_CACHE = SCRIPT_DIR / "glyph_cache"
GLYPH_CACHE.mkdir(exist_ok=True)

ANIMATOR_SCRIPT = SCRIPT_DIR / "CodeAnimator.py"

# Explicit pixel + frame dimensions keyed by (quality, orientation).
# We set these explicitly instead of relying on Manim's named quality presets,
# which can conflict with portrait aspect ratios.
_RENDER_CFG = {
    ("fast",     "landscape"): {"pixel_width": 854,  "pixel_height": 480,  "frame_rate": 60, "frame_width": 16.0, "frame_height": 9.0},
    ("fast",     "portrait"):  {"pixel_width": 540,  "pixel_height": 960,  "frame_rate": 60, "frame_width": 9.0,  "frame_height": 16.0},
    ("standard", "landscape"): {"pixel_width": 1280, "pixel_height": 720,  "frame_rate": 60, "frame_width": 16.0, "frame_height": 9.0},
    ("standard", "portrait"):  {"pixel_width": 720,  "pixel_height": 1280, "frame_rate": 60, "frame_width": 9.0,  "frame_height": 16.0},
    ("high",     "landscape"): {"pixel_width": 1920, "pixel_height": 1080, "frame_rate": 60, "frame_width": 16.0, "frame_height": 9.0},
    ("high",     "portrait"):  {"pixel_width": 1080, "pixel_height": 1920, "frame_rate": 60, "frame_width": 9.0,  "frame_height": 16.0},
}


def _seed_tex(tex_dir: Path) -> None:
    """Pre-populate Tex dir from glyph cache via hard-links (zero copy)."""
    tex_dir.mkdir(parents=True, exist_ok=True)
    for cached in GLYPH_CACHE.glob("*.svg"):
        dest = tex_dir / cached.name
        if not dest.exists():
            try:
                os.link(cached, dest)
            except OSError:
                try:
                    shutil.copy2(cached, dest)
                except Exception:
                    pass


def _harvest_tex(tex_dir: Path) -> None:
    """Copy newly generated SVGs back into the shared glyph cache."""
    if not tex_dir.exists():
        return
    for svg in tex_dir.glob("*.svg"):
        dest = GLYPH_CACHE / svg.name
        if not dest.exists():
            try:
                os.link(svg, dest)
            except OSError:
                try:
                    shutil.copy2(svg, dest)
                except Exception:
                    pass


def run_job(job: dict) -> dict:
    config      = job["config"]
    media_dir   = Path(job["media_dir"])
    output_name = job["output_name"]
    quality     = config.get("quality", "standard")
    orientation = config.get("orientation", "landscape")

    tconf = _RENDER_CFG.get(
        (quality, orientation),
        _RENDER_CFG[("standard", "landscape")],
    ).copy()
    tconf["media_dir"]   = str(media_dir)
    tconf["output_file"] = output_name

    _seed_tex(media_dir / "Tex")

    # Set env var so CodeAnimator.py module-level code picks up the right orientation
    os.environ["ANIM_ORIENTATION"] = orientation

    # Redirect stdout so CodeAnimator's debug prints don't pollute the protocol
    _real = sys.stdout
    sys.stdout = sys.stderr
    try:
        # Load CodeAnimator fresh each job (fast — manim already in sys.modules)
        spec   = importlib.util.spec_from_file_location("CodeAnimator", ANIMATOR_SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        # Inject config as a class attribute; _load_config picks this up first
        # so it never falls through to read from sys.stdin
        module.CodeAnimation._worker_config = config

        with tempconfig(tconf):
            scene = module.CodeAnimation()
            scene.render()
    finally:
        sys.stdout = _real

    _harvest_tex(media_dir / "Tex")

    videos_base = media_dir / "videos" / "CodeAnimator"
    video_path  = None
    if videos_base.exists():
        for subdir in videos_base.iterdir():
            if subdir.is_dir():
                candidate = subdir / f"{output_name}.mp4"
                if candidate.exists():
                    video_path = candidate
                    break

    if video_path is None:
        raise RuntimeError(f"Generated video not found under {videos_base}")

    return {"video_path": str(video_path)}


# ── main job loop (blocks on stdin between jobs) ────────────────────────────
for _raw in sys.stdin:
    _raw = _raw.strip()
    if not _raw:
        continue
    try:
        _result = run_job(json.loads(_raw))
        sys.stdout.write(json.dumps({"type": "success", **_result}) + "\n")
    except Exception:
        sys.stdout.write(json.dumps({
            "type":   "error",
            "detail": traceback.format_exc()[-3000:],
        }) + "\n")
    sys.stdout.flush()
