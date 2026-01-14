#!/usr/bin/env python3
"""
Interactive Code Animation Script with Manim
Animates specific lines of code sliding in from the left
"""

from manim import *
import sys
import os
from pygments import lex
from pygments.lexers import get_lexer_for_filename, TextLexer
from pygments.token import Token

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
        
        # Reading line groups
        line_groups = []
        for i in range(4, len(lines)):
            if lines[i].strip():
                if lines[i].strip() == "ALL_REMAINING":
                    line_groups.append("ALL_REMAINING")
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
        line_to_index = {line_num: idx for idx, (line_num, _) in enumerate(filtered_lines)}
        
        # Some debug, too much went wrong originally
        print(f"DEBUG: Filtered {len(filtered_lines)} lines")
        print(f"DEBUG: Line groups: {line_groups}")
        
        # Create text objects for each line with syntax highlighting
        line_mobjects = []
        shown_lines = set()  # Track which lines have been shown
        
        # Calculate vertical positioning
        num_lines = len(filtered_lines)
        
        # Define margins (in Manim units) - smaller for more space
        top_margin = 0.3
        bottom_margin = 0.3
        left_margin = 0.3
        right_margin = 0.3
        
        # Available space
        available_height = config.frame_height - top_margin - bottom_margin
        available_width = config.frame_width - left_margin - right_margin
        
        # Adaptive line height and font size based on number of lines
        # For few lines: use larger spacing and font
        # For many lines: use smaller spacing and font
        # But enforce min/max to keep things readable

        MIN_FONT_SIZE = 16  
        MAX_FONT_SIZE = 28
        MIN_LINE_HEIGHT = 0.35  
        MAX_LINE_HEIGHT = 0.6

        # Start with ideal line height that would fill the screen
        ideal_line_height = available_height / num_lines
        # Clamp to reasonable range
        line_height = max(MIN_LINE_HEIGHT, min(MAX_LINE_HEIGHT, ideal_line_height))

        # Font size scales with line height
        # Rough heuristic: font_size ≈ line_height * 45 (increased from 40)
        base_font_size = int(line_height * 45)
        base_font_size = max(MIN_FONT_SIZE, min(MAX_FONT_SIZE, base_font_size))

        total_height = num_lines * line_height

        print(f"DEBUG: Initial line_height: {line_height:.3f}")
        print(f"DEBUG: Initial font_size: {base_font_size}")
        print(f"DEBUG: Number of lines: {num_lines}")
        print(f"DEBUG: Total height needed: {total_height:.3f}")
        print(f"DEBUG: Available height: {available_height:.3f}")

        # Calculate if we need to chunk the content
        enable_chunking = False
        chunk_size = 0
        if total_height > available_height:
            lines_that_fit = int(available_height / MIN_LINE_HEIGHT)
            enable_chunking = True
            chunk_size = lines_that_fit
            print(f"INFO: {num_lines} lines will be displayed in chunks of {chunk_size}")
            print(f"INFO: Content will scroll up between chunks for better readability")
            # Use minimum settings for chunked display
            line_height = MIN_LINE_HEIGHT
            base_font_size = MIN_FONT_SIZE
        
        # Token type to color mapping for Pygments
        TOKEN_COLORS = {
            Token.Keyword: PURPLE,
            Token.Keyword.Namespace: BLUE,
            Token.Keyword.Type: BLUE,
            Token.Name.Builtin: BLUE,
            Token.Name.Function: BLUE,
            Token.String: GREEN,
            Token.String.Single: GREEN,
            Token.String.Double: GREEN,
            Token.Number: ORANGE,
            Token.Number.Integer: ORANGE,
            Token.Number.Float: ORANGE,
            Token.Comment: GRAY,
            Token.Comment.Single: GRAY,
            Token.Comment.Multiline: GRAY,
        }

        # Get appropriate lexer for the file
        try:
            lexer = get_lexer_for_filename(script_path)
        except:
            lexer = TextLexer()

        # First pass: create all lines to measure max width
        temp_lines = []
        max_line_width = 0
        
        for line_num, content in filtered_lines:
            content_display = content.replace('\t', '    ')
            full_line = f"{line_num:3d}  {content_display}"
            
            line_group = Text(
                full_line,
                font="Monospace",
                font_size=base_font_size,
                color=WHITE,
                disable_ligatures=True,
            )
            
            temp_lines.append((line_num, content, line_group))
            max_line_width = max(max_line_width, line_group.width)
        
        # Calculate width scaling factor if lines are too wide
        # This will be applied to ALL lines to keep them consistent
        width_scale = 1.0
        if max_line_width > available_width:
            width_scale = available_width / max_line_width

        print(f"DEBUG: Width scale factor: {width_scale:.3f}")
        print(f"DEBUG: Final font size: {base_font_size}")
        print(f"DEBUG: Line height: {line_height:.3f}")
        print(f"DEBUG: Max line width: {max_line_width:.3f}")
        print(f"DEBUG: Available width: {available_width:.3f}")
        
        # Calculate starting Y position
        # For chunking mode, position lines to fit within visible area
        # For normal mode, center all lines
        if enable_chunking:
            # Position lines to fit within the chunk
            chunk_height = chunk_size * line_height
            y_start = (chunk_height / 2) - (line_height / 2)
        else:
            # Center the entire block
            total_height = num_lines * line_height
            y_start = (total_height / 2) - (line_height / 2)

        # Second pass: create final lines with correct sizing and coloring
        for line_num, content in filtered_lines:
            # Replace tabs with 4 spaces for consistent rendering
            content_display = content.replace('\t', '    ')

            # Create the full line as a single monospace text
            full_line = f"{line_num:3d}  {content_display}"

            # Use Text with disable_ligatures to ensure proper character spacing
            line_group = Text(
                full_line,
                font="Monospace",
                font_size=base_font_size,
                color=WHITE,
                disable_ligatures=True,
            )

            # Use Pygments for syntax highlighting - O(n) complexity
            tokens = list(lex(content_display, lexer))

            # Apply syntax coloring by character indices
            # Start at index 5 to skip line number prefix "XXX  "
            char_idx = 5

            for token_type, token_value in tokens:
                token_length = len(token_value)

                # Get color for this token type
                color = WHITE
                for ttype, tcolor in TOKEN_COLORS.items():
                    if token_type in ttype:
                        color = tcolor
                        break

                # Color each character in the token
                for i in range(char_idx, char_idx + token_length):
                    try:
                        line_group[i].set_color(color)
                    except:
                        pass

                char_idx += token_length

            # Calculate position within chunk for this line
            # In chunking mode, position is relative to chunk, not absolute
            if enable_chunking:
                # Position based on line index within entire set
                line_idx = filtered_lines.index((line_num, content))
                chunk_idx = line_idx % chunk_size
                y_pos = y_start - (chunk_idx * line_height)
            else:
                # Normal positioning
                line_idx = filtered_lines.index((line_num, content))
                y_pos = y_start - (line_idx * line_height)

            # Position (where it should end up)
            line_group.move_to([0, y_pos, 0])
            line_group.to_edge(LEFT, buff=left_margin)

            # Apply consistent scaling to ALL lines (not just long ones)
            if width_scale < 1.0:
                line_group.scale(width_scale)
                # Re-position after scaling
                line_group.move_to([0, y_pos, 0])
                line_group.to_edge(LEFT, buff=left_margin)

            # Store final position before moving off-screen
            final_pos = line_group.get_center().copy()

            # Start off-screen to the left
            line_group.shift(LEFT * (config.frame_width + 2))

            self.add(line_group)
            line_mobjects.append((line_group, final_pos))
        
        self.wait(1.5)

        # Animate line groups with chunking support
        if enable_chunking:
            # Chunked display mode - show lines in chunks, scrolling up between chunks
            currently_visible = []  # Track which line objects are currently visible on screen

            for group in line_groups:
                if group == "ALL_REMAINING":
                    # Show all remaining lines in chunks
                    remaining_indices = []
                    for idx, (line_num, _) in enumerate(filtered_lines):
                        if line_num not in shown_lines and idx < len(line_mobjects):
                            remaining_indices.append((idx, line_num))

                    # Process remaining lines in chunks
                    while remaining_indices:
                        chunk = remaining_indices[:chunk_size]
                        remaining_indices = remaining_indices[chunk_size:]

                        # Check if we need to scroll (if we've already shown a full chunk)
                        if len(currently_visible) >= chunk_size:
                            # Scroll only the currently visible lines up and off screen
                            scroll_animations = []
                            for line_obj in currently_visible:
                                scroll_animations.append(line_obj.animate.shift(UP * (available_height + 1)))
                            self.play(*scroll_animations, run_time=0.8)
                            currently_visible.clear()

                        # Slide in the new chunk
                        animations = []
                        for idx, line_num in chunk:
                            line_obj, final_pos = line_mobjects[idx]
                            animations.append(line_obj.animate.move_to(final_pos))
                            shown_lines.add(line_num)
                            currently_visible.append(line_obj)

                        if animations:
                            self.play(*animations, run_time=0.6)
                            self.wait(1.5)  # Increased pause to view code
                else:
                    # Show specific lines (user-defined group)
                    lines_to_show = []
                    for line_num in group:
                        if line_num in line_to_index and line_num not in shown_lines:
                            idx = line_to_index[line_num]
                            if idx < len(line_mobjects):
                                lines_to_show.append((idx, line_num))

                    if lines_to_show:
                        # Check if we need to scroll before showing this group
                        if len(currently_visible) >= chunk_size:
                            # Scroll only currently visible lines up
                            scroll_animations = []
                            for line_obj in currently_visible:
                                scroll_animations.append(line_obj.animate.shift(UP * (available_height + 1)))
                            self.play(*scroll_animations, run_time=0.8)
                            currently_visible.clear()

                        # Slide in from the left to original position
                        animations = []
                        for idx, line_num in lines_to_show:
                            line_obj, final_pos = line_mobjects[idx]
                            animations.append(line_obj.animate.move_to(final_pos))
                            shown_lines.add(line_num)
                            currently_visible.append(line_obj)

                        self.play(*animations, run_time=0.6)
                        self.wait(1.5)  # Increased pause to view code
        else:
            # Normal mode - no chunking needed
            for group in line_groups:
                if group == "ALL_REMAINING":
                    # Show all lines that haven't been shown yet
                    lines_to_show = []
                    for idx, (line_num, _) in enumerate(filtered_lines):
                        if line_num not in shown_lines and idx < len(line_mobjects):
                            lines_to_show.append((idx, line_num))
                else:
                    # Show specific lines
                    lines_to_show = []
                    for line_num in group:
                        if line_num in line_to_index and line_num not in shown_lines:
                            idx = line_to_index[line_num]
                            if idx < len(line_mobjects):
                                lines_to_show.append((idx, line_num))

                if lines_to_show:
                    # Slide in from the left to original position
                    animations = []
                    for idx, line_num in lines_to_show:
                        line_obj, final_pos = line_mobjects[idx]
                        animations.append(line_obj.animate.move_to(final_pos))
                        shown_lines.add(line_num)

                    self.play(*animations, run_time=0.6)
                    self.wait(0.3)

        # Final pause
        self.wait(2)

        # Clean up SVG cache files after rendering
        import shutil
        cache_dir = config.text_dir
        if os.path.exists(cache_dir):
            print(f"INFO: Cleaning up SVG cache at {cache_dir}")
            try:
                shutil.rmtree(cache_dir)
                print("INFO: SVG cache cleaned successfully")
            except Exception as e:
                print(f"WARNING: Could not clean SVG cache: {e}")


def get_input():
    """Interactive prompt to gather animation parameters"""
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
    include_comments = input("\nInclude comments in the video? (y/n): ").strip().lower() == 'y'
    
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
                    print(f"Warning: Line {line_num} is outside range [{start_line}, {end_line}], skipping")
            
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
        print(f"manim -pql --disable_caching --flush_cache -o {output_name} {__file__} CodeAnimation")
        print("\nOr for high quality:")
        print(f"manim -pqh --disable_caching --flush_cache -o {output_name} {__file__} CodeAnimation")
        print("\nNote: --flush_cache will clean up SVG files after rendering")
    else:
        # This is being called by manim to render
        pass