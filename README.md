# Code Animation with Manim 🎬

An interactive Manim script that animates code appearing line by line in customizable groups!

## Features ✨

- 📝 Animate any code file (Python, JavaScript, Java, C++, etc.)
- 🎯 Choose specific line ranges (starting and ending lines)
- 🎨 Group lines to appear together
- 💬 Option to include/exclude comments
- 🎥 Professional syntax highlighting
- 📊 Line numbers included

## Prerequisites

Install Manim:
```bash
pip install manim --break-system-packages
```

Or if you prefer using a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install manim
```

## Quick Start 🚀

### Step 1: Run the interactive setup

```bash
python code_animator.py
```

### Step 2: Answer the prompts

```
Enter the path to the script file: example_script.py
✓ File found: 35 lines total

--- Line Range ---
Starting line: 6
Ending line: 20

Include comments in the video? (y/n): n

--- Line Groups ---
Enter line numbers for each group (space-separated)
Press Enter without input to finish

Group 1 lines: 8 9 10
Group 2 lines: 13 14
Group 3 lines: 17 18 19
Group 4 lines: [press enter to finish]
```

### Step 3: Render the animation

Low quality (fast preview):
```bash
manim -pql code_animator.py CodeAnimation
```

High quality (production):
```bash
manim -pqh code_animator.py CodeAnimation
```

## Usage Examples 💡

### Example 1: Animate a function definition
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

### Example 2: Show algorithm steps
```
File: algorithm.py
Starting line: 20
Ending line: 45
Include comments: n

Group 1: 22 23 24       # Initialization
Group 2: 26 27 28 29    # Main loop
Group 3: 31 32          # Condition check
Group 4: 35 36 37       # Result calculation
```

## How It Works 🔧

1. **Interactive Input**: The script prompts you for all necessary information
2. **Configuration**: Saves your choices to a temporary config file
3. **Code Parsing**: Reads your source file and filters based on your settings
4. **Animation**: Creates a Manim scene with:
   - Syntax highlighted code
   - Line numbers
   - Smooth transitions as lines "pop" into view
5. **Video Output**: Generates an MP4 file with your animation

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

## Command Line Options 🎛️

Manim quality flags:
- `-ql`: Low quality (480p, faster rendering)
- `-qm`: Medium quality (720p)
- `-qh`: High quality (1080p)
- `-qk`: 4K quality (2160p)

Additional flags:
- `-p`: Preview after rendering
- `--format=gif`: Output as GIF instead of MP4
- `--fps 30`: Set frame rate

## Troubleshooting 🔍

**Problem**: "File not found"
- Solution: Use absolute path or ensure you're in the correct directory

**Problem**: "Line X is outside range"
- Solution: Check that your line numbers are within the starting/ending range

**Problem**: "No lines appear in video"
- Solution: Make sure you entered at least one group of lines

**Problem**: Manim not found
- Solution: Install with `pip install manim --break-system-packages`

## Supported Languages 🌐

The script auto-detects syntax highlighting for:
- Python (.py)
- JavaScript (.js)
- TypeScript (.ts)
- Java (.java)
- C++ (.cpp)
- C (.c)
- Rust (.rs)
- Go (.go)
- Ruby (.rb)
- PHP (.php)
- Swift (.swift)
- Kotlin (.kt)

## Video Output 🎬

Videos are saved to:
```
media/videos/code_animator/[quality]/CodeAnimation.mp4
```

## Customization 🎨

You can modify these parameters in the script:
- `font_size`: Default is 20
- `line_spacing`: Default is 0.6
- `style`: Default is "monokai" (try: "github-dark", "vim", "xcode")
- Animation timing: `run_time` and `wait` values

## License

Feel free to use and modify for your projects!

---

**Happy Animating! 🎉**