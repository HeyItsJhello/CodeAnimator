import json
import os
import platform
import shutil
import sys
import platform

from manim import *

# Use platform-appropriate monospace font
# Menlo is macOS-only, Liberation Mono is available in Linux/Docker
MONOSPACE_FONT = "Menlo" if platform.system() == "Darwin" else "Liberation Mono"
from pygments import lex
from pygments.lexers import TextLexer, get_lexer_for_filename
from pygments.token import Token

# Use platform-appropriate monospace font
# Menlo is macOS-only, Liberation Mono is available in Linux/Docker
MONOSPACE_FONT = "Menlo" if platform.system() == "Darwin" else "Liberation Mono"

# Check orientation from config before Scene initializes
_orientation = "landscape"
try:
    with open("/tmp/anim_config.txt", "r") as f:
        lines = f.read().strip().split("\n")
        if len(lines) > 5 and lines[5].strip() in ["landscape", "portrait"]:
            _orientation = lines[5].strip()
except:
    pass

# Set frame dimensions based on orientation
if _orientation == "portrait":
    config.frame_width = 9.0
    config.frame_height = 16.0
    config.pixel_width = 1080
    config.pixel_height = 1920
else:
    config.frame_width = 16.0
    config.frame_height = 9.0
    config.pixel_width = 1920
    config.pixel_height = 1080


class CodeAnimation(Scene):
    def construct(self):
        self.renderer.skip_animations = False

        # Going to read the conf file yeu
        try:
            with open("/tmp/anim_config.txt", "r") as f:
                lines = f.read().strip().split("\n")
        except FileNotFoundError:
            print("ERROR: Config file not found at /tmp/anim_config.txt")
            print("Make sure to run the interactive setup first!")
            return

        print(f"DEBUG: Config loaded, {len(lines)} lines")

        script_path = lines[0]
        start_line = int(lines[1])
        end_line = int(lines[2])
        include_comments = lines[3].lower() == "true"

        # Parse custom syntax colors (line 5 is JSON)
        custom_colors = {}
        try:
            custom_colors = (
                json.loads(lines[4])
                if len(lines) > 4 and lines[4].strip().startswith("{")
                else {}
            )
        except (json.JSONDecodeError, IndexError):
            custom_colors = {}

        # Parse orientation (line 6) - 'landscape' or 'portrait'
        orientation = "landscape"
        try:
            if len(lines) > 5 and lines[5].strip() in ["landscape", "portrait"]:
                orientation = lines[5].strip()
        except IndexError:
            orientation = "landscape"

        # Parse animation timing (line 7) - JSON with optional overrides
        default_timing = {
            "initialDelay": 1.5,
            "lineSlideIn": 0.4,
            "pauseBetweenGroups": 0.2,
            "finalPause": 2.0,
        }

        animation_timing = default_timing.copy()
        try:
            if len(lines) > 6 and lines[6].strip().startswith("{"):
                parsed_timings = json.loads(lines[6])
                for key, default_val in default_timing.items():
                    try:
                        if key in parsed_timings:
                            animation_timing[key] = float(parsed_timings[key])
                    except (TypeError, ValueError):
                        pass
        except (json.JSONDecodeError, IndexError):
            animation_timing = default_timing.copy()

        initial_delay = max(
            0.0, animation_timing.get("initialDelay", default_timing["initialDelay"])
        )
        line_slide_in = max(
            0.05, animation_timing.get("lineSlideIn", default_timing["lineSlideIn"])
        )
        pause_between_groups = max(
            0.0,
            animation_timing.get(
                "pauseBetweenGroups", default_timing["pauseBetweenGroups"]
            ),
        )
        final_pause = max(
            0.0, animation_timing.get("finalPause", default_timing["finalPause"])
        )
        scroll_duration = max(line_slide_in, 0.5)

        print(f"DEBUG: Custom colors: {custom_colors}")
        print(f"DEBUG: Orientation: {orientation}")
        print(f"DEBUG: Animation timing: {animation_timing}")

        # making the custom filename for the output, example_1-11.mp4
        base_filename = os.path.splitext(os.path.basename(script_path))[0]
        custom_name = f"{base_filename}_{start_line}-{end_line}"
        self.renderer.file_writer.movie_file_extension = ".mp4"

        # Output file name yippeee
        try:
            self.renderer.file_writer.output_name = custom_name
        except AttributeError:
            pass  # Manim is kind sucky sometimes

        print(f"DEBUG: Script: {script_path}")
        print(f"DEBUG: Lines {start_line}-{end_line}")
        print(f"DEBUG: Include comments: {include_comments}")

        # Reading line groups (start after colors JSON, orientation, timing, and quality lines)
        line_groups = []
        # Find the first line group entry (after line 5 which is colors, line 6 orientation, line 7 timing, line 8 quality)
        start_idx = 6
        for i in range(6, len(lines)):
            if lines[i].strip().startswith("{") or lines[i].strip() in [
                "landscape",
                "portrait",
                "fast",
                "standard",
                "high",
            ]:
                start_idx = i + 1
            else:
                start_idx = i
                break
        for i in range(start_idx, len(lines)):
            if lines[i].strip():
                if lines[i].strip() == "ALL_REMAINING":
                    line_groups.append("ALL_REMAINING")
                elif lines[i].strip().startswith("SPLIT "):
                    # SPLIT X means: scroll current content, then start fresh with line X at top
                    split_line = int(lines[i].strip().split()[1])
                    line_groups.append(("SPLIT", split_line))
                else:
                    group = [int(x) for x in lines[i].split()]
                    line_groups.append(group)

        # Opening the source file yippeeeeee
        with open(script_path, "r") as f:
            source_lines = f.readlines()

        # Filter lines, for rendering purposes
        filtered_lines = []
        for i in range(start_line - 1, min(end_line, len(source_lines))):
            line = source_lines[i].rstrip()

            # Filtering comments if requested
            if not include_comments:
                stripped = line.strip()
                if stripped.startswith("#") or stripped.startswith("//"):
                    continue

            filtered_lines.append((i + 1, line))  # Store (line_number, content)

        # Getting the correct line indexes from the file
        line_to_index = {
            line_num: idx for idx, (line_num, _) in enumerate(filtered_lines)
        }

        print(f"DEBUG: Filtered {len(filtered_lines)} lines")
        print(f"DEBUG: Line groups: {line_groups}")

        max_line_num = max(line_num for line_num, _ in filtered_lines)
        line_num_width = len(str(max_line_num))

        # Create text objects for each line with syntax highlighting
        line_mobjects = []
        shown_lines = set()

        num_lines = len(filtered_lines)
        frame_w = config.frame_width
        frame_h = config.frame_height

        print(
            f"DEBUG: Manim frame dimensions AFTER setting: {frame_w:.2f}w x {frame_h:.2f}h"
        )
        print(f"DEBUG: Pixel dimensions: {config.pixel_width}x{config.pixel_height}")
        print(f"DEBUG: Orientation setting: {orientation}")

        if orientation == "portrait":
            top_margin = 0.3
            bottom_margin = 0.3
            left_margin = 0.05
            right_margin = 0.05
        else:
            top_margin = 0.3
            bottom_margin = 0.3
            left_margin = 0.3
            right_margin = 0.3

        available_height = frame_h - top_margin - bottom_margin
        available_width = frame_w - left_margin - right_margin

        print(
            f"DEBUG: Available space: {available_width:.2f}w x {available_height:.2f}h"
        )
        print(
            f"DEBUG: Margins - Top: {top_margin}, Bottom: {bottom_margin}, Left: {left_margin}, Right: {right_margin}"
        )

        if orientation == "portrait":
            MIN_FONT_SIZE = 32
            MAX_FONT_SIZE = 48
            MIN_LINE_HEIGHT = 0.32
            MAX_LINE_HEIGHT = 0.45
        else:
            MIN_FONT_SIZE = 16
            MAX_FONT_SIZE = 28
            MIN_LINE_HEIGHT = 0.35
            MAX_LINE_HEIGHT = 0.6

        ideal_line_height = available_height / num_lines
        line_height = max(MIN_LINE_HEIGHT, min(MAX_LINE_HEIGHT, ideal_line_height))

        # Font size scales with line height - use larger multiplier for portrait, normal for landscape
        font_multiplier = 55 if orientation == "portrait" else 45
        base_font_size = int(line_height * font_multiplier)
        base_font_size = max(MIN_FONT_SIZE, min(MAX_FONT_SIZE, base_font_size))

        total_height = num_lines * line_height

        print(
            f"DEBUG: Font sizing params - MIN: {MIN_FONT_SIZE}, MAX: {MAX_FONT_SIZE}, Multiplier: {font_multiplier}"
        )
        print(
            f"DEBUG: Line height params - MIN: {MIN_LINE_HEIGHT}, MAX: {MAX_LINE_HEIGHT}"
        )
        print(f"DEBUG: Initial line_height: {line_height:.3f}")
        print(f"DEBUG: Initial font_size: {base_font_size}")
        print(f"DEBUG: Number of lines: {num_lines}")
        print(f"DEBUG: Total height needed: {total_height:.3f}")
        print(f"DEBUG: Available height: {available_height:.3f}")

        # Determine chunking
        enable_chunking = False
        chunk_size = 0
        lines_that_fit = int(available_height / MIN_LINE_HEIGHT)
        if total_height > available_height:
            scale_to_fit = available_height / total_height
            if num_lines > lines_that_fit * 1.5:
                enable_chunking = True
                chunk_size = lines_that_fit
                line_height = MIN_LINE_HEIGHT
                font_multiplier = 55 if orientation == "portrait" else 45
                base_font_size = int(line_height * font_multiplier)
                base_font_size = max(MIN_FONT_SIZE, min(MAX_FONT_SIZE, base_font_size))
            else:
                line_height = available_height / num_lines
                font_multiplier = 55 if orientation == "portrait" else 45
                base_font_size = int(line_height * font_multiplier)
                base_font_size = max(MIN_FONT_SIZE, min(MAX_FONT_SIZE, base_font_size))

        # Get colors from custom config or defaults
        color_keywords = custom_colors.get("keywords", "#9b59b6")
        color_types = custom_colors.get("types", "#3498db")
        color_functions = custom_colors.get("functions", "#3498db")
        color_strings = custom_colors.get("strings", "#2ecc71")
        color_numbers = custom_colors.get("numbers", "#e67e22")
        color_comments = custom_colors.get("comments", "#7f8c8d")
        color_decorators = custom_colors.get("decorators", "#f1c40f")
        color_default = custom_colors.get("default", "#ffffff")

        TOKEN_COLORS = {
            Token.Comment.Multiline: color_comments,
            Token.Comment.Single: color_comments,
            Token.Comment.Special: color_comments,
            Token.Comment.Preproc: color_comments,
            Token.Comment.PreprocFile: color_comments,
            Token.Comment: color_comments,
            Token.Keyword.Namespace: color_types,
            Token.Keyword.Type: color_keywords,
            Token.Keyword.Constant: color_keywords,
            Token.Keyword.Declaration: color_keywords,
            Token.Keyword.Pseudo: color_keywords,
            Token.Keyword.Reserved: color_keywords,
            Token.Keyword: color_keywords,
            Token.Name.Builtin: color_types,
            Token.Name.Builtin.Pseudo: color_types,
            Token.Name.Function: color_functions,
            Token.Name.Function.Magic: color_functions,
            Token.Name.Class: color_types,
            Token.Name.Decorator: color_decorators,
            Token.Name.Variable: color_types,  # For GDScript $node_refs
            Token.Name.Constant: color_numbers,
            Token.String.Doc: color_strings,
            Token.String.Single: color_strings,
            Token.String.Double: color_strings,
            Token.String.Escape: color_decorators,
            Token.String.Interpol: color_decorators,
            Token.String.Regex: color_strings,
            Token.String.Char: color_strings,
            Token.String: color_strings,
            Token.Literal.String: color_strings,
            Token.Literal.String.Doc: color_strings,
            Token.Number.Integer: color_numbers,
            Token.Number.Float: color_numbers,
            Token.Number.Hex: color_numbers,
            Token.Number.Oct: color_numbers,
            Token.Number.Bin: color_numbers,
            Token.Number: color_numbers,
            Token.Literal.Number: color_numbers,
            Token.Operator.Word: color_keywords,
            Token.Comment.Preproc: color_keywords,
        }

        DEFAULT_COLOR = color_default

        # Pre-compute token type inheritance lookup for O(1) color resolution
        # This avoids repeated inheritance checks during tokenization
        _token_color_cache = {}

        def get_token_color(token_type):
            """Get color for token type with caching for inheritance lookup"""
            if token_type in _token_color_cache:
                return _token_color_cache[token_type]

            # Direct lookup first
            if token_type in TOKEN_COLORS:
                _token_color_cache[token_type] = TOKEN_COLORS[token_type]
                return TOKEN_COLORS[token_type]

            # Check inheritance (token_type in parent_type)
            for ttype, tcolor in TOKEN_COLORS.items():
                if token_type in ttype:
                    _token_color_cache[token_type] = tcolor
                    return tcolor

            _token_color_cache[token_type] = DEFAULT_COLOR
            return DEFAULT_COLOR

        # Cache lexer to avoid repeated file detection
        try:
            lexer = get_lexer_for_filename(script_path)
        except Exception:
            lexer = TextLexer()

        full_code_text = "\n".join(content for _, content in filtered_lines)
        full_tokens = list(lex(full_code_text, lexer))

        # GDScript-specific token fixes for Godot 4 syntax
        if script_path.endswith(".gd"):
            fixed_tokens = []
            i = 0
            num_tokens = len(full_tokens)
            while i < num_tokens:
                token_type, token_value = full_tokens[i]

                # Fix @annotations: Token.Error('@') + Token.Keyword -> Token.Name.Decorator
                if token_type == Token.Error and token_value == "@" and i + 1 < num_tokens:
                    next_type, next_value = full_tokens[i + 1]
                    if next_type in Token.Keyword:
                        fixed_tokens.append((Token.Name.Decorator, "@" + next_value))
                        i += 2
                        continue

                # Fix $node_refs: Token.Operator('$') + Token.Name (+ '/' + Token.Name)* -> Token.Name.Variable
                if token_type == Token.Operator and token_value == "$" and i + 1 < num_tokens:
                    next_type, next_value = full_tokens[i + 1]
                    if next_type == Token.Name:
                        node_path = "$" + next_value
                        j = i + 2
                        # Continue consuming /Name pairs
                        while j + 1 < num_tokens:
                            slash_type, slash_value = full_tokens[j]
                            if slash_type == Token.Operator and slash_value == "/":
                                name_type, name_value = full_tokens[j + 1]
                                if name_type == Token.Name:
                                    node_path += "/" + name_value
                                    j += 2
                                    continue
                            break
                        fixed_tokens.append((Token.Name.Variable, node_path))
                        i = j
                        continue

                fixed_tokens.append((token_type, token_value))
                i += 1

            full_tokens = fixed_tokens

        # Build color map using list of lists for O(1) access (vs dict hashing)
        # Pre-allocate based on line count for better memory efficiency
        num_filtered = len(filtered_lines)
        color_map = [[] for _ in range(num_filtered)]
        current_line = 0
        current_char = 0

        for token_type, token_value in full_tokens:
            token_color = get_token_color(token_type)

            # Process token value and map positions to colors
            for char in token_value:
                if char == "\n":
                    current_line += 1
                    current_char = 0
                else:
                    # Extend list if needed and set color
                    line_colors = color_map[current_line] if current_line < num_filtered else None
                    if line_colors is not None:
                        # Extend to reach current_char if needed
                        while len(line_colors) <= current_char:
                            line_colors.append(DEFAULT_COLOR)
                        line_colors[current_char] = token_color
                    current_char += 1

        # Measure max line width for scaling - create text objects once
        # Only store (line_num, content, line_group) - content_display not needed after Text creation
        temp_lines = []
        max_line_width = 0
        for line_num, content in filtered_lines:
            full_line = f"{line_num:>{line_num_width}}  {content.replace(chr(9), '    ')}"
            # Create and cache Text object in one pass to avoid recreating later
            line_group = Text(
                full_line,
                font=MONOSPACE_FONT,
                font_size=base_font_size,
                color=DEFAULT_COLOR,
                disable_ligatures=True,
            )
            temp_lines.append((line_num, content, line_group))
            if line_group.width > max_line_width:
                max_line_width = line_group.width

        width_scale = 1.0
        if max_line_width > available_width:
            width_scale = available_width / max_line_width

        print(
            f"DEBUG: Max line width: {max_line_width:.3f}, Available width: {available_width:.2f}"
        )
        print(f"DEBUG: Width scale: {width_scale:.3f}")

        y_start = (num_lines * line_height / 2) - (line_height / 2)

        for line_idx, (line_num, content, line_group) in enumerate(temp_lines):
            display_char_idx = line_num_width + 2
            original_char_idx = 0
            line_colors = color_map[line_idx] if line_idx < len(color_map) else []

            # Build color runs (consecutive chars with same color) for batch application
            # This reduces set_color calls significantly
            color_runs = []  # [(start_idx, end_idx, color), ...]
            current_run_start = display_char_idx
            current_run_color = None

            for orig_char in content:
                # Get color from pre-computed list (O(1) vs dict hash)
                color = line_colors[original_char_idx] if original_char_idx < len(line_colors) else DEFAULT_COLOR

                char_count = 4 if orig_char == "\t" else 1

                if color != current_run_color:
                    # Save previous run if exists
                    if current_run_color is not None and current_run_color != DEFAULT_COLOR:
                        color_runs.append((current_run_start, display_char_idx, current_run_color))
                    current_run_start = display_char_idx
                    current_run_color = color

                display_char_idx += char_count
                original_char_idx += 1

            # Don't forget the last run
            if current_run_color is not None and current_run_color != DEFAULT_COLOR:
                color_runs.append((current_run_start, display_char_idx, current_run_color))

            # Apply color runs - much fewer set_color calls than char-by-char
            for start_idx, end_idx, color in color_runs:
                for char_idx in range(start_idx, end_idx):
                    try:
                        line_group[char_idx].set_color(color)
                    except IndexError:
                        break

            y_pos = y_start - (line_idx * line_height)
            line_group.move_to([0, y_pos, 0])
            line_group.to_edge(LEFT, buff=left_margin)
            if width_scale < 1.0:
                line_group.scale(width_scale)
                line_group.move_to([0, y_pos, 0])
                line_group.to_edge(LEFT, buff=left_margin)
            final_pos = line_group.get_center().copy()
            line_group.shift(LEFT * (frame_w + 2))
            self.add(line_group)
            line_mobjects.append((line_group, final_pos))

        self.wait(initial_delay)

        # Animate line groups with chunking support
        if enable_chunking:
            # Chunked display mode - show lines in chunks, scrolling up between chunks
            currently_visible = []  # Track which line objects are currently visible on screen
            current_visible_count = 0  # Track how many lines are currently visible

            # Helper function to calculate position for a line within the current visible chunk
            def get_chunk_position(slot_index):
                """Calculate Y position for a line at the given slot index (0 = top of visible area)"""
                chunk_height = chunk_size * line_height
                y_start_chunk = (chunk_height / 2) - (line_height / 2)
                return y_start_chunk - (slot_index * line_height)

            for group in line_groups:
                if group == "ALL_REMAINING":
                    remaining_indices = [
                        (idx, line_num)
                        for idx, (line_num, _) in enumerate(filtered_lines)
                        if line_num not in shown_lines and idx < len(line_mobjects)
                    ]

                    while remaining_indices:
                        available_slots = chunk_size - current_visible_count

                        if available_slots <= 0:
                            # Use VGroup for more efficient scroll animation
                            visible_group = VGroup(*currently_visible)
                            self.play(visible_group.animate.shift(UP * (available_height + 1)), run_time=scroll_duration)
                            currently_visible.clear()
                            current_visible_count = 0
                            available_slots = chunk_size

                        chunk = remaining_indices[:available_slots]
                        remaining_indices = remaining_indices[available_slots:]

                        animations = []
                        for idx, line_num in chunk:
                            line_obj, original_final_pos = line_mobjects[idx]
                            slot_y = get_chunk_position(current_visible_count)
                            target_pos = [original_final_pos[0], slot_y, 0]
                            line_obj.move_to([-(frame_w + 2), slot_y, 0])
                            animations.append(line_obj.animate.move_to(target_pos))
                            shown_lines.add(line_num)
                            currently_visible.append(line_obj)
                            current_visible_count += 1

                        if animations:
                            self.play(*animations, run_time=line_slide_in)
                            self.wait(pause_between_groups)

                elif isinstance(group, tuple) and group[0] == "SPLIT":
                    # SPLIT command: scroll current content off, then show from the split line
                    split_line_num = group[1]

                    # Scroll all currently visible lines off screen using VGroup
                    if currently_visible:
                        visible_group = VGroup(*currently_visible)
                        self.play(visible_group.animate.shift(UP * (available_height + 1)), run_time=scroll_duration)
                        currently_visible.clear()
                        current_visible_count = 0

                    # Now show the split line (if not already shown)
                    if (
                        split_line_num in line_to_index
                        and split_line_num not in shown_lines
                    ):
                        idx = line_to_index[split_line_num]
                        if idx < len(line_mobjects):
                            line_obj, original_final_pos = line_mobjects[idx]
                            slot_y = get_chunk_position(current_visible_count)
                            target_pos = [original_final_pos[0], slot_y, 0]
                            # First, move to correct Y position while staying off-screen left
                            line_obj.move_to([-(frame_w + 2), slot_y, 0])
                            # Then animate sliding in from left
                            self.play(
                                line_obj.animate.move_to(target_pos),
                                run_time=line_slide_in,
                            )
                            shown_lines.add(split_line_num)
                            currently_visible.append(line_obj)
                            current_visible_count += 1
                            self.wait(pause_between_groups)

                else:
                    lines_to_show = [
                        (line_to_index[line_num], line_num)
                        for line_num in group
                        if line_num in line_to_index
                        and line_num not in shown_lines
                        and line_to_index[line_num] < len(line_mobjects)
                    ]

                    if lines_to_show:
                        lines_needed = len(lines_to_show)
                        available_slots = chunk_size - current_visible_count

                        if lines_needed > available_slots:
                            # Use VGroup for more efficient scroll animation
                            visible_group = VGroup(*currently_visible)
                            self.play(visible_group.animate.shift(UP * (available_height + 1)), run_time=scroll_duration)
                            currently_visible.clear()
                            current_visible_count = 0

                        animations = []
                        for idx, line_num in lines_to_show:
                            line_obj, original_final_pos = line_mobjects[idx]
                            slot_y = get_chunk_position(current_visible_count)
                            target_pos = [original_final_pos[0], slot_y, 0]
                            line_obj.move_to([-(frame_w + 2), slot_y, 0])
                            animations.append(line_obj.animate.move_to(target_pos))
                            shown_lines.add(line_num)
                            currently_visible.append(line_obj)
                            current_visible_count += 1

                        self.play(*animations, run_time=line_slide_in)
                        self.wait(pause_between_groups)
        else:
            for group in line_groups:
                if group == "ALL_REMAINING":
                    lines_to_show = [
                        (idx, line_num)
                        for idx, (line_num, _) in enumerate(filtered_lines)
                        if line_num not in shown_lines and idx < len(line_mobjects)
                    ]
                else:
                    lines_to_show = [
                        (line_to_index[line_num], line_num)
                        for line_num in group
                        if line_num in line_to_index
                        and line_num not in shown_lines
                        and line_to_index[line_num] < len(line_mobjects)
                    ]

                if lines_to_show:
                    animations = [
                        line_mobjects[idx][0].animate.move_to(line_mobjects[idx][1])
                        for idx, _ in lines_to_show
                    ]
                    for idx, line_num in lines_to_show:
                        shown_lines.add(line_num)

                    self.play(*animations, run_time=line_slide_in)
                    self.wait(pause_between_groups)

        # Final pause
        self.wait(final_pause)

        # Clean up SVG cache files after rendering
        cache_dir = config.text_dir
        if os.path.exists(cache_dir):
            print(f"INFO: Cleaning up SVG cache at {cache_dir}")
            try:
                shutil.rmtree(cache_dir)
                print("INFO: SVG cache cleaned successfully")
            except Exception as e:
                print(f"WARNING: Could not clean SVG cache: {e}")


def get_input():
    print("\n=== Code Animation Script ===\n")

    # Get script path
    script_path = input("Enter the path to the script file: ").strip()

    # Validate file exists
    try:
        with open(script_path, "r") as f:
            lines = f.readlines()
        total_lines = len(lines)
        print(f"✓ File found: {total_lines} lines total")
    except FileNotFoundError:
        print(f"✗ Error: File '{script_path}' not found")
        sys.exit(1)

    # Get line range
    print("\n--- Line Range ---")
    while True:
        try:
            start_line = int(input("Starting line: ").strip())
            if 1 <= start_line <= total_lines:
                break
            print(f"Please enter a line number between 1 and {total_lines}")
        except ValueError:
            print("Please enter a valid number")

    while True:
        try:
            end_line = int(input("Ending line: ").strip())
            if start_line <= end_line <= total_lines:
                break
            print(f"Please enter a line number between {start_line} and {total_lines}")
        except ValueError:
            print("Please enter a valid number")

    # Ask about comments
    include_comments = (
        input("\nInclude comments in the video? (y/n): ").strip().lower() == "y"
    )

    # Get line groups
    print("\n--- Line Groups ---")
    print("Enter line numbers for each group (space-separated)")
    print("Press Enter without input to show all remaining lines")
    print("Example: 21 38 34")

    line_groups = []
    group_num = 1
    shown_lines = set()

    while True:
        line_input = input(f"\nGroup {group_num} lines: ").strip()

        # Empty input means "all remaining lines"
        if not line_input:
            line_groups.append("ALL_REMAINING")
            print("✓ Will show all remaining lines in this group")
            break

        try:
            group = [int(x) for x in line_input.split()]
            # Validate line numbers
            valid_group = []
            for line_num in group:
                if line_num in shown_lines:
                    print(f"Warning: Line {line_num} already shown, skipping")
                elif start_line <= line_num <= end_line:
                    valid_group.append(line_num)
                    shown_lines.add(line_num)
                else:
                    print(
                        f"Warning: Line {line_num} is outside range [{start_line}, {end_line}], skipping"
                    )

            if valid_group:
                line_groups.append(valid_group)
                group_num += 1
            else:
                print("No valid line numbers in this group, try again")
        except ValueError:
            print("Invalid input. Please enter space-separated numbers")

    # Save configuration
    with open("/tmp/anim_config.txt", "w") as f:
        f.write(f"{script_path}\n")
        f.write(f"{start_line}\n")
        f.write(f"{end_line}\n")
        f.write(f"{include_comments}\n")
        for group in line_groups:
            if group == "ALL_REMAINING":
                f.write("ALL_REMAINING\n")
            else:
                f.write(" ".join(map(str, group)) + "\n")

    # Generate output filename
    base_filename = os.path.splitext(os.path.basename(script_path))[0]
    output_name = f"{base_filename}_{start_line}-{end_line}"

    print(f"\n✓ Configuration saved!")
    print(f"✓ Will animate {len(line_groups)} groups of lines")
    print(f"✓ Output will be named: {output_name}.mp4")
    print(f"\nGenerating animation...")


if __name__ == "__main__":
    # Check if running in interactive mode
    if len(sys.argv) == 1 or sys.argv[1] != "--render":
        get_input()

        # Read the config back to get the output name for display
        with open("/tmp/anim_config.txt", "r") as f:
            config_lines = f.read().strip().split("\n")
        script_path = config_lines[0]
        start_line = int(config_lines[1])
        end_line = int(config_lines[2])
        base_filename = os.path.splitext(os.path.basename(script_path))[0]
        output_name = f"{base_filename}_{start_line}-{end_line}"

        print("\nTo render the animation, run:")
        print(
            f"manim -pql --disable_caching --flush_cache -o {output_name} {__file__} CodeAnimation"
        )
        print("\nOr for high quality:")
        print(
            f"manim -pqh --disable_caching --flush_cache -o {output_name} {__file__} CodeAnimation"
        )
        print("\nNote: --flush_cache will clean up SVG files after rendering")
    else:
        # This is being called by manim to render
        pass
