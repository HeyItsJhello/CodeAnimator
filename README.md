# Code Animator 🎬

Create beautiful animated videos of your code with the use of Manim (A Python based Animation Library)! Available as both a **web application** and a **command-line tool**.

This was originally created to help with some Godot / Xogot showcases for my code, editting line after line of code became tedious so I decided to learn MANIM to create this project for my exact needs.

## Features ✨

- 🌐 **Web Interface**: Easy-to-use browser-based UI with live code preview
- 💻 **CLI Tool**: Traditional command-line interface for local use
- 📝 Animate any code file (Python, JavaScript, Java, C++, GDScript, and more)
- 🎯 Choose specific line ranges to animate
- 🎨 Group lines to appear together in sequences
- 💬 Option to include/exclude comments
- 🎥 Professional syntax highlighting with line numbers
- 🔒 **Privacy-focused**: Uploaded files are automatically deleted after processing
- 📺 **High Quality**: All videos rendered at 1080p60

---

## Example 🎥

https://github.com/user-attachments/assets/ed7b0d6c-e840-499b-a7b9-a5f8b1194bd0

---

## 🌐 Web Application (Recommended)

- If you wish to use the website on your own device, follow the next steps: 

### Prerequisites

**Backend:**
```bash
pip install fastapi uvicorn manim --break-system-packages
```

**Frontend:**
```bash
cd frontend
npm install
```

### Quick Start

1. **Start the Backend:**
```bash
cd backend
python main.py
# Server runs on http://localhost:8000
```

2. **Start the Frontend:**
```bash
cd frontend
npm run dev
# UI runs on http://localhost:5173
```

3. **Use the Web Interface:**
- Open http://localhost:5173 in your browser
- Upload your code file
- Select line range (start/end lines)
- Choose whether to include comments
- Define animation groups (or press "Add Group" with empty input for all remaining lines)
- Click "Generate Animation"
- Your video downloads automatically!

3.5. **EXAMPLE**:
<img width="1773" height="1105" alt="Screenshot 2026-01-13 at 11 15 25 PM" src="https://github.com/user-attachments/assets/17c2e873-e9a0-4566-90ed-b6611202ba86" />

### Privacy & Security 🔒

The web application is designed with privacy in mind:
- Uploaded code files are deleted immediately after video generation
- All temporary media files are cleaned up automatically
- Generated videos are deleted from the server after download
- **No user data is retained on the server**

### Supported File Types

- Python (`.py`)
- JavaScript (`.js`, `.jsx`)
- TypeScript (`.ts`, `.tsx`)
- Java (`.java`)
- C/C++ (`.c`, `.cpp`, `.h`)
- Go (`.go`)
- Rust (`.rs`)
- Ruby (`.rb`)
- PHP (`.php`)
- Swift (`.swift`)
- Kotlin (`.kt`)
- GDScript (`.gd`) - Godot Engine scripts

---

## 💻 Command-Line Tool

- If you want to use this for a class or something (I have no clue sometimes)

### Prerequisites

```bash
pip install manim --break-system-packages
```

Or with a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install manim
```

### Quick Start

**Step 1: Run the interactive setup**

```bash
python CodeAnimator.py
```

**Step 2: Answer the prompts**

```
Enter the path to the script file: example_script.py
✓ File found: 35 lines total

--- Line Range ---
Starting line: 6
Ending line: 20

Include comments in the video? (y/n): n

--- Line Groups ---
Enter line numbers for each group (space-separated)
Press Enter without input to show all remaining lines

Group 1 lines: 8 9 10
Group 2 lines: 13 14
Group 3 lines: 17 18 19
Group 4 lines: [press enter to finish]
```

**Step 3: Render the animation**

The script will output the command to run. For example:

Low quality (fast preview):
```bash
manim -pql --disable_caching --flush_cache -o example_6-20 CodeAnimator.py CodeAnimation
```

High quality (production):
```bash
manim -pqh --disable_caching --flush_cache -o example_6-20 CodeAnimator.py CodeAnimation
```

### CLI Usage Examples 💡

<img width="1191" height="596" alt="Screenshot 2026-01-13 at 11 16 48 PM" src="https://github.com/user-attachments/assets/e97c3201-86b2-411e-b9ad-2c8a139a9849" />

**Example 1: Animate a function definition**
```
File: my_script.py
Starting line: 1
Ending line: 15
Include comments: y

Group 1: 1 2 3          # Function signature and docstring
Group 2: 5 6 7 8        # First logical block
Group 3: 10 11 12       # Second logical block
Group 4: 14 15          # Return statement
```

**Example 2: Show algorithm steps**
```
File: algorithm.py
Starting line: 20
Ending line: 45
Include comments: n

Group 1: 22 23 24       # Initialization
Group 2: 26 27 28 29    # Main loop
Group 3: 31 32          # Condition check
Group 4: [press enter]  # All remaining lines
```

---

## How It Works 🔧

### Web Application
1. **Upload**: User uploads code file through web interface
2. **Configure**: User selects line ranges and animation groups with live preview
3. **Process**: Backend receives file and configuration
4. **Render**: Manim generates 1080p60 video with syntax highlighting
5. **Download**: Video is sent to user and all data is deleted from server

### CLI Tool
1. **Interactive Input**: Script prompts for all necessary information
2. **Configuration**: Saves choices to temporary config file at `/tmp/anim_config.txt`
3. **Code Parsing**: Reads source file and filters based on settings
4. **Animation**: Creates Manim scene with syntax highlighting and line numbers
5. **Video Output**: Generates MP4 file in `media/videos/CodeAnimator/[quality]/`

---

## Line Grouping Tips 💭

- **Logical blocks**: Group lines that form a complete thought
- **Related operations**: Lines that work together
- **Sequential reveals**: Build up complexity gradually
- **Highlight changes**: Show before/after states

Example grouping strategies:
- Variable declarations together
- Loop/condition + body
- Function calls with their setup
- Error handling blocks
- Leave input empty to show all remaining lines at once

---

## Manim Quality Flags 🎛️

- `-ql`: Low quality (480p15, faster rendering)
- `-qm`: Medium quality (720p30)
- `-qh`: High quality (1080p60) ← **Web app uses this**
- `-qk`: 4K quality (2160p60)

Additional flags:
- `-p`: Preview after rendering
- `--disable_caching`: Disable caching for clean renders
- `--flush_cache`: Clean up SVG files after rendering

---

## Troubleshooting 🔍

### Web Application

**Problem**: Backend not connecting
- Solution: Make sure backend is running on port 8000: `cd backend && python main.py`

**Problem**: Frontend not loading
- Solution: Make sure you ran `npm install` and `npm run dev` in the frontend folder

**Problem**: Video generation fails
- Solution: Check that Manim is installed correctly with `manim --version`

### CLI Tool

**Problem**: "File not found"
- Solution: Use absolute path or ensure you're in the correct directory

**Problem**: "Line X is outside range"
- Solution: Check that line numbers are within the starting/ending range

**Problem**: "No lines appear in video"
- Solution: Make sure you entered at least one group of lines

**Problem**: Manim not found
- Solution: Install with `pip install manim --break-system-packages`

---

## API Endpoints 🔌

For those who want to integrate programmatically:

- `POST /api/animate` - Upload file and generate animation
- `GET /api/download/{video_id}` - Download generated video
- `GET /api/videos` - List all videos (usually empty due to auto-cleanup)
- `DELETE /api/videos/{video_id}` - Delete a specific video

---

## Project Structure 📁

```
CodeAnimator/
├── CodeAnimator.py          # Main CLI animation script
├── backend/
│   ├── main.py             # FastAPI backend server
│   ├── requirements.txt    # Python dependencies
│   ├── uploads/            # Temporary file uploads (auto-cleaned)
│   ├── outputs/            # Generated videos (auto-cleaned)
│   └── media/              # Manim media files (auto-cleaned)
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main React component
│   │   └── main.jsx       # React entry point
│   ├── package.json       # Node dependencies
│   └── vite.config.js     # Vite configuration
└── README.md              # This file
```

---

## Video Output 🎬

**Web Application:**
- Videos are automatically downloaded to your browser's download folder
- Named as: `{filename}_{startLine}-{endLine}.mp4`
- Quality: 1080p60 (always)

**CLI Tool:**
- Videos are saved to: `media/videos/CodeAnimator/{quality}/{filename}_{startLine}-{endLine}.mp4`
- Quality: Depends on the flag you used (`-ql`, `-qm`, `-qh`, `-qk`)

---

## License

Feel free to use and modify for your projects!

---

**Happy Animating! 🎉**
