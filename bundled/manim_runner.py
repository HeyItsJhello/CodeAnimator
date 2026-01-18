#!/usr/bin/env python3
"""
Standalone Manim runner for CodeAnimator.
This script is bundled with PyInstaller to create a self-contained executable.
"""
import sys
import os

# When running as a PyInstaller bundle, we need to set up paths correctly
if getattr(sys, 'frozen', False):
    # Running as compiled
    bundle_dir = sys._MEIPASS
    # Add the bundle directory to the path
    sys.path.insert(0, bundle_dir)
    # Set up environment for bundled ffmpeg
    os.environ['PATH'] = bundle_dir + os.pathsep + os.environ.get('PATH', '')

# Now import manim
from manim.__main__ import main

if __name__ == '__main__':
    sys.exit(main())
