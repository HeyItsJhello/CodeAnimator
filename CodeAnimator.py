from manim import *
import sys
import os
import json
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

        # Parse custom syntax colors (line 5 is JSON)
        custom_colors = {}
        try:
            custom_colors = json.loads(lines[4]) if len(lines) > 4 and lines[4].strip().startswith('{') else {}
        except (json.JSONDecodeError, IndexError):
            custom_colors = {}

        print(f"DEBUG: Custom colors: {custom_colors}")

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

        # Reading line groups (start from line 5 if no colors, or line 6 if colors present)
        line_groups = []
        start_idx = 5 if custom_colors or (len(lines) > 4 and lines[4].strip().startswith('{')) else 4
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
        line_to_index = {line_num: idx for idx, (line_num, _) in enumerate(filtered_lines)}
        
        # Some debug, too much went wrong originally
        print(f"DEBUG: Filtered {len(filtered_lines)} lines")
        print(f"DEBUG: Line groups: {line_groups}")
        
        # Calculate max line number width for alignment
        max_line_num = max(line_num for line_num, _ in filtered_lines)
        line_num_width = len(str(max_line_num))
        
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
        MIN_FONT_SIZE = 16  
        MAX_FONT_SIZE = 28
        MIN_LINE_HEIGHT = 0.35  
        MAX_LINE_HEIGHT = 0.6

        # Start with ideal line height that would fill the screen
        ideal_line_height = available_height / num_lines
        # Clamp to reasonable range
        line_height = max(MIN_LINE_HEIGHT, min(MAX_LINE_HEIGHT, ideal_line_height))

        # Font size scales with line height
        base_font_size = int(line_height * 45)
        base_font_size = max(MIN_FONT_SIZE, min(MAX_FONT_SIZE, base_font_size))

        total_height = num_lines * line_height

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
                base_font_size = MIN_FONT_SIZE
            else:
                line_height = available_height / num_lines
                base_font_size = int(line_height * 45)
                base_font_size = max(MIN_FONT_SIZE, min(MAX_FONT_SIZE, base_font_size))
        
        # Get colors from custom config or defaults
        color_keywords = custom_colors.get('keywords', '#9b59b6')
        color_types = custom_colors.get('types', '#3498db')
        color_functions = custom_colors.get('functions', '#3498db')
        color_strings = custom_colors.get('strings', '#2ecc71')
        color_numbers = custom_colors.get('numbers', '#e67e22')
        color_comments = custom_colors.get('comments', '#7f8c8d')
        color_decorators = custom_colors.get('decorators', '#f1c40f')
        color_default = custom_colors.get('default', '#ffffff')

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

        try:
            lexer = get_lexer_for_filename(script_path)
        except:
            lexer = TextLexer()

        full_code_text = '\n'.join([content for _, content in filtered_lines])
        full_tokens = list(lex(full_code_text, lexer))

        color_map = {}
        current_line = 0
        current_char = 0

        for token_type, token_value in full_tokens:
            token_color = DEFAULT_COLOR
            if token_type in TOKEN_COLORS:
                token_color = TOKEN_COLORS[token_type]
            else:
                for ttype, tcolor in TOKEN_COLORS.items():
                    if token_type in ttype:
                        token_color = tcolor
                        break
            for char in token_value:
                if char == '\n':
                    current_line += 1
                    current_char = 0
                else:
                    color_map[(current_line, current_char)] = token_color
                    current_char += 1

        # First pass to measure max width
        temp_lines = []
        max_line_width = 0
        for line_num, content in filtered_lines:
            content_display = content.replace('\t', '    ')
            full_line = f"{line_num:>{line_num_width}}  {content_display}"
            line_group = Text(full_line, font="Monospace", font_size=base_font_size, color=DEFAULT_COLOR, disable_ligatures=True)
            temp_lines.append((line_num, content, line_group))
            max_line_width = max(max_line_width, line_group.width)
        
        width_scale = 1.0
        if max_line_width > available_width:
            width_scale = available_width / max_line_width

        y_start = (num_lines * line_height / 2) - (line_height / 2)

        # Second pass: final lines
        for line_idx, (line_num, content) in enumerate(filtered_lines):
            content_display = content.replace('\t', '    ')
            full_line = f"{line_num:>{line_num_width}}  {content_display}"

            line_group = Text(full_line, font="Monospace", font_size=base_font_size, color=DEFAULT_COLOR, disable_ligatures=True)
            display_char_idx = line_num_width + 2
            original_char_idx = 0
            for orig_char in content:
                if orig_char == '\t':
                    color = color_map.get((line_idx, original_char_idx), DEFAULT_COLOR)
                    for _ in range(4):
                        try:
                            line_group[display_char_idx].set_color(color)
                        except:
                            pass
                        display_char_idx += 1
                else:
                    color = color_map.get((line_idx, original_char_idx), DEFAULT_COLOR)
                    try:
                        line_group[display_char_idx].set_color(color)
                    except:
                        pass
                    display_char_idx += 1
                original_char_idx += 1

            y_pos = y_start - (line_idx * line_height)
            line_group.move_to([0, y_pos, 0])
            line_group.to_edge(LEFT, buff=left_margin)
            if width_scale < 1.0:
                line_group.scale(width_scale)
                line_group.move_to([0, y_pos, 0])
                line_group.to_edge(LEFT, buff=left_margin)
            final_pos = line_group.get_center().copy()
            line_group.shift(LEFT * (config.frame_width + 2))
            self.add(line_group)
            line_mobjects.append((line_group, final_pos))

        self.wait(1.5)

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
                    # Show all remaining lines in chunks
                    remaining_indices = []
                    for idx, (line_num, _) in enumerate(filtered_lines):
                        if line_num not in shown_lines and idx < len(line_mobjects):
                            remaining_indices.append((idx, line_num))

                    # Process remaining lines in chunks
                    while remaining_indices:
                        # How many slots are available in the current visible area?
                        available_slots = chunk_size - current_visible_count

                        if available_slots <= 0:
                            # Need to scroll - no room left
                            scroll_animations = []
                            for line_obj in currently_visible:
                                scroll_animations.append(line_obj.animate.shift(UP * (available_height + 1)))
                            self.play(*scroll_animations, run_time=0.8)
                            currently_visible.clear()
                            current_visible_count = 0
                            available_slots = chunk_size

                        # Take as many lines as will fit
                        chunk = remaining_indices[:available_slots]
                        remaining_indices = remaining_indices[available_slots:]

                        # Slide in the new chunk from the left
                        animations = []
                        for idx, line_num in chunk:
                            line_obj, _ = line_mobjects[idx]
                            # Position at the next available slot
                            slot_y = get_chunk_position(current_visible_count)
                            # Get x position from original final_pos
                            _, original_final_pos = line_mobjects[idx]
                            target_pos = [original_final_pos[0], slot_y, 0]
                            # First, move to correct Y position while staying off-screen left
                            line_obj.move_to([-(config.frame_width + 2), slot_y, 0])
                            # Then animate sliding in from left
                            animations.append(line_obj.animate.move_to(target_pos))
                            shown_lines.add(line_num)
                            currently_visible.append(line_obj)
                            current_visible_count += 1

                        if animations:
                            self.play(*animations, run_time=0.6)
                            self.wait(1.5)  # Increased pause to view code

                elif isinstance(group, tuple) and group[0] == "SPLIT":
                    # SPLIT command: scroll current content off, then show from the split line
                    split_line_num = group[1]

                    # Scroll all currently visible lines off screen
                    if currently_visible:
                        scroll_animations = []
                        for line_obj in currently_visible:
                            scroll_animations.append(line_obj.animate.shift(UP * (available_height + 1)))
                        self.play(*scroll_animations, run_time=0.8)
                        currently_visible.clear()
                        current_visible_count = 0

                    # Now show the split line (if not already shown)
                    if split_line_num in line_to_index and split_line_num not in shown_lines:
                        idx = line_to_index[split_line_num]
                        if idx < len(line_mobjects):
                            line_obj, original_final_pos = line_mobjects[idx]
                            slot_y = get_chunk_position(current_visible_count)
                            target_pos = [original_final_pos[0], slot_y, 0]
                            # First, move to correct Y position while staying off-screen left
                            line_obj.move_to([-(config.frame_width + 2), slot_y, 0])
                            # Then animate sliding in from left
                            self.play(line_obj.animate.move_to(target_pos), run_time=0.6)
                            shown_lines.add(split_line_num)
                            currently_visible.append(line_obj)
                            current_visible_count += 1
                            self.wait(1.5)

                else:
                    # Show specific lines (user-defined group)
                    lines_to_show = []
                    for line_num in group:
                        if line_num in line_to_index and line_num not in shown_lines:
                            idx = line_to_index[line_num]
                            if idx < len(line_mobjects):
                                lines_to_show.append((idx, line_num))

                    if lines_to_show:
                        # Check how many slots we need vs how many are available
                        lines_needed = len(lines_to_show)
                        available_slots = chunk_size - current_visible_count

                        # If we can't fit the group, scroll first
                        if lines_needed > available_slots:
                            scroll_animations = []
                            for line_obj in currently_visible:
                                scroll_animations.append(line_obj.animate.shift(UP * (available_height + 1)))
                            self.play(*scroll_animations, run_time=0.8)
                            currently_visible.clear()
                            current_visible_count = 0

                        # Slide in from the left, positioning at sequential slots
                        animations = []
                        for idx, line_num in lines_to_show:
                            line_obj, original_final_pos = line_mobjects[idx]
                            # Position at the next available slot
                            slot_y = get_chunk_position(current_visible_count)
                            target_pos = [original_final_pos[0], slot_y, 0]
                            # First, move to correct Y position while staying off-screen left
                            line_obj.move_to([-(config.frame_width + 2), slot_y, 0])
                            # Then animate sliding in from left
                            animations.append(line_obj.animate.move_to(target_pos))
                            shown_lines.add(line_num)
                            currently_visible.append(line_obj)
                            current_visible_count += 1

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