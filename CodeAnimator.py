import json
import os
import platform
import shutil
import sys

from manim import *
from pygments import lex
from pygments.lexers import TextLexer, get_lexer_for_filename
from pygments.token import Token

# Use platform-appropriate monospace font
# Menlo is macOS-only, Liberation Mono is available in Linux/Docker
MONOSPACE_FONT = "Menlo" if platform.system() == "Darwin" else "Liberation Mono"

# Check orientation from environment variable (set by backend)
# Falls back to config file for manual/interactive testing
_orientation = os.environ.get("ANIM_ORIENTATION", "").strip()
if _orientation not in ["landscape", "portrait"]:
    _orientation = "landscape"
    try:
        with open("/tmp/anim_config.txt", "r") as f:
            lines = f.read().strip().split("\n")
            if len(lines) > 5 and lines[5].strip() in ["landscape", "portrait"]:
                _orientation = lines[5].strip()
    except:
        pass

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


class LazyTextGeneration:
    __slots__ = (
        "filtered_lines",
        "color_map",
        "font",
        "font_size",
        "line_height",
        "num_gutter",
        "content_start_x",
        "start_y",
        "_cache",
    )

    def __init__(
        self,
        filtered_lines,
        color_map,
        font,
        font_size,
        line_height,
        num_gutter,
        content_start_x,
        start_y,
    ) -> None:
        self.filtered_lines = filtered_lines
        self.color_map = color_map
        self.font = font
        self.font_size = font_size
        self.line_height = line_height
        self.num_gutter = num_gutter
        self.content_start_x = content_start_x
        self.start_y = start_y
        self._cache = {}

    def get_line(self, idx):
        if idx in self._cache:
            return self._cache[idx]

        line_num, content = self.filtered_lines[idx]

        display_text = f"{line_num:>{self.num_gutter}} {content}"
        line_group = Text(
            display_text,
            font=self.font,
            font_size=self.font_size,
            disable_ligatures=True,
        )

        offset = self.num_gutter + 2
        color_runs = self.color_map[idx]
        for start_idx, end_idx, color in color_runs:
            actual_start = offset + start_idx
            actual_end = offset + end_idx
            for char in line_group[actual_start:actual_end]:
                char.set_color(color)

        y_pos = self.start_y - idx * self.line_height
        line_group.move_to([self.content_start_x, y_pos, 0], aligned_edge=LEFT)

        self._cache[idx] = line_group
        return line_group


class CodeAnimation(Scene):
    def _load_config(self):
        if not sys.stdin.isatty():
            try:
                anim_config = json.load(sys.stdin)
                print("DEBUG: Config loaded from stdin")
                anim_config["line_groups"] = self._parse_line_groups(
                    anim_config.get("line_groups", [])
                )
                return anim_config
            except json.JSONDecodeError as e:
                print(f"ERROR: Invalid JSON from stdin: {e}")
                return None

        try:
            with open("/tmp/anim_config.txt", "r") as f:
                content = f.read()
            print("DEBUG: Config loaded from file (fallback)")
            return self._parse_legacy_config(content)
        except FileNotFoundError:
            print("ERROR: Config file not found at /tmp/anim_config.txt")
            print("Make sure to run the interactive setup first!")
            return None

    def _parse_line_groups(self, groups_list):
        parsed = []
        for group in groups_list:
            if group == "ALL_REMAINING":
                parsed.append("ALL_REMAINING")
            elif isinstance(group, str) and group.startswith("SPLIT "):
                split_line = int(group.split()[1])
                parsed.append(("SPLIT", split_line))
            elif isinstance(group, str):
                parsed.append(self._parse_line_spec(group))
            elif isinstance(group, list):
                parsed.append(group)
        return parsed

    def _parse_line_spec(self, spec):
        result = []
        for part in spec.split():
            result.append(int(part))
        return result

    def _parse_legacy_config(self, content):
        lines = content.strip().split("\n")

        syntax_colors = {}
        try:
            if len(lines) > 4 and lines[4].strip().startswith("{"):
                syntax_colors = json.loads(lines[4])
        except (json.JSONDecodeError, IndexError):
            pass

        orientation = "landscape"
        try:
            if len(lines) > 5 and lines[5].strip() in ["landscape", "portrait"]:
                orientation = lines[5].strip()
        except IndexError:
            pass

        animation_timing = {}
        try:
            if len(lines) > 6 and lines[6].strip().startswith("{"):
                animation_timing = json.loads(lines[6])
        except (json.JSONDecodeError, IndexError):
            pass

        line_groups = []
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
            line = lines[i].strip()
            if line:
                if line == "ALL_REMAINING":
                    line_groups.append("ALL_REMAINING")
                elif line.startswith("SPLIT "):
                    split_line = int(line.split()[1])
                    line_groups.append(("SPLIT", split_line))
                else:
                    group = [int(x) for x in line.split()]
                    line_groups.append(group)

        return {
            "script_path": lines[0] if len(lines) > 0 else "",
            "start_line": int(lines[1]) if len(lines) > 1 else 1,
            "end_line": int(lines[2]) if len(lines) > 2 else 100,
            "include_comments": lines[3].lower() == "true" if len(lines) > 3 else True,
            "syntax_colors": syntax_colors,
            "orientation": orientation,
            "animation_timing": animation_timing,
            "line_groups": line_groups,
        }

    def _build_line_animation(self, line_obj, target_pos, animation_type, run_time):
        if animation_type == "fade_in":
            line_obj.move_to(target_pos)
            self.remove(line_obj)
            return FadeIn(line_obj, run_time=run_time)
        elif animation_type == "typewriter":
            line_obj.move_to(target_pos)
            self.remove(line_obj)
            return AddTextLetterByLetter(line_obj)
        elif animation_type == "drop_in":
            return line_obj.animate(run_time=run_time).move_to(target_pos)
        elif animation_type == "scale_in":
            line_obj.move_to(target_pos)
            self.remove(line_obj)
            return GrowFromCenter(line_obj, run_time=run_time)
        else:  # slide_left (default)
            return line_obj.animate(run_time=run_time).move_to(target_pos)

    def construct(self):
        self.renderer.skip_animations = False

        anim_config = self._load_config()
        if anim_config is None:
            return

        script_path = anim_config["script_path"]
        start_line = anim_config["start_line"]
        end_line = anim_config["end_line"]
        include_comments = anim_config["include_comments"]
        custom_colors = anim_config["syntax_colors"]
        orientation = anim_config["orientation"]
        animation_timing = anim_config["animation_timing"]
        animation_type = anim_config.get("animation_type", "slide_left")
        line_groups = anim_config["line_groups"]

        default_timing = {
            "initialDelay": 1.5,
            "lineSlideIn": 0.4,
            "pauseBetweenGroups": 0.2,
            "finalPause": 2.0,
        }
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
        print(f"DEBUG: Animation type: {animation_type}")

        base_filename = os.path.splitext(os.path.basename(script_path))[0]
        custom_name = f"{base_filename}_{start_line}-{end_line}"
        self.renderer.file_writer.movie_file_extension = ".mp4"

        try:
            self.renderer.file_writer.output_name = custom_name
        except AttributeError:
            pass  # Manim is kind sucky sometimes

        print(f"DEBUG: Script: {script_path}")
        print(f"DEBUG: Lines {start_line}-{end_line}")
        print(f"DEBUG: Include comments: {include_comments}")

        with open(script_path, "r") as f:
            source_lines = f.readlines()

        filtered_lines = []
        for i in range(start_line - 1, min(end_line, len(source_lines))):
            line = source_lines[i].rstrip()

            if not include_comments:
                stripped = line.strip()
                if stripped.startswith("#") or stripped.startswith("//"):
                    continue

            filtered_lines.append((i + 1, line))

        line_to_index = {
            line_num: idx for idx, (line_num, _) in enumerate(filtered_lines)
        }

        print(f"DEBUG: Filtered {len(filtered_lines)} lines")
        print(f"DEBUG: Line groups: {line_groups}")

        max_line_num = max(line_num for line_num, _ in filtered_lines)
        line_num_width = len(str(max_line_num))

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

        # More specific token types first so inheritance lookup matches correctly
        _token_parents = tuple(sorted(TOKEN_COLORS.items(), key=lambda x: -len(x[0])))
        _token_color_cache = {}

        def get_token_color(token_type):
            if token_type in _token_color_cache:
                return _token_color_cache[token_type]

            if token_type in TOKEN_COLORS:
                _token_color_cache[token_type] = TOKEN_COLORS[token_type]
                return TOKEN_COLORS[token_type]

            for ttype, tcolor in _token_parents:
                if token_type in ttype:
                    _token_color_cache[token_type] = tcolor
                    return tcolor

            _token_color_cache[token_type] = DEFAULT_COLOR
            return DEFAULT_COLOR

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
                if (
                    token_type == Token.Error
                    and token_value == "@"
                    and i + 1 < num_tokens
                ):
                    next_type, next_value = full_tokens[i + 1]
                    if next_type in Token.Keyword:
                        fixed_tokens.append((Token.Name.Decorator, "@" + next_value))
                        i += 2
                        continue

                # Fix $node_refs: Token.Operator('$') + Token.Name (+ '/' + Token.Name)* -> Token.Name.Variable
                if (
                    token_type == Token.Operator
                    and token_value == "$"
                    and i + 1 < num_tokens
                ):
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

        num_filtered = len(filtered_lines)
        color_map = [[DEFAULT_COLOR] * len(content) for _, content in filtered_lines]
        current_line = 0
        current_char = 0

        for token_type, token_value in full_tokens:
            token_color = get_token_color(token_type)

            for char in token_value:
                if char == "\n":
                    current_line += 1
                    current_char = 0
                else:
                    if current_line < num_filtered:
                        line_colors = color_map[current_line]
                        if current_char < len(line_colors):
                            line_colors[current_char] = token_color
                    current_char += 1

        digit_ref = Text("0", font=MONOSPACE_FONT, font_size=base_font_size, disable_ligatures=True)
        digit_width = digit_ref.width

        gutter_text_width = line_num_width * digit_width + 2 * digit_width

        temp_lines = []
        max_line_width = 0
        for line_num, content in filtered_lines:
            content_display = content.replace(chr(9), "    ")
            leading_spaces = len(content_display) - len(content_display.lstrip(" "))
            content_stripped = content_display.lstrip(" ")
            if content_stripped:
                content_obj = Text(
                    content_stripped,
                    font=MONOSPACE_FONT,
                    font_size=base_font_size,
                    color=DEFAULT_COLOR,
                    disable_ligatures=True,
                )
                content_width = content_obj.width + leading_spaces * digit_width
            else:
                content_width = 0

            gutter_offset = line_num_width - len(str(line_num))
            temp_lines.append((line_num, content, gutter_offset))
            effective_width = gutter_text_width + content_width
            if effective_width > max_line_width:
                max_line_width = effective_width

        width_scale = 1.0
        if max_line_width > available_width:
            width_scale = available_width / max_line_width

        print(
            f"DEBUG: Max line width: {max_line_width:.3f}, Available width: {available_width:.2f}"
        )
        print(f"DEBUG: Width scale: {width_scale:.3f}")

        y_start = (num_lines * line_height / 2) - (line_height / 2)

        scaled_gutter = gutter_text_width * (width_scale if width_scale < 1.0 else 1.0)

        for line_idx, (line_num, content, gutter_offset) in enumerate(temp_lines):
            y_pos = y_start - (line_idx * line_height)

            num_str = str(line_num)
            num_obj = Text(
                num_str,
                font=MONOSPACE_FONT,
                font_size=base_font_size,
                color=DEFAULT_COLOR,
                disable_ligatures=True,
            )
            if width_scale < 1.0:
                num_obj.scale(width_scale)
            num_obj.move_to([0, y_pos, 0])
            num_obj.to_edge(LEFT, buff=left_margin)
            if gutter_offset > 0:
                num_obj.shift(RIGHT * digit_width * gutter_offset * (width_scale if width_scale < 1.0 else 1.0))
            final_num_pos = num_obj.get_center().copy()

            content_display = content.replace(chr(9), "    ")
            # Manim strips leading whitespace, so we handle indent via positioning
            leading_spaces = len(content_display) - len(content_display.lstrip(" "))
            content_stripped = content_display.lstrip(" ")
            indent_offset = leading_spaces * digit_width * (width_scale if width_scale < 1.0 else 1.0)

            if content_stripped:
                content_obj = Text(
                    content_stripped,
                    font=MONOSPACE_FONT,
                    font_size=base_font_size,
                    color=DEFAULT_COLOR,
                    disable_ligatures=True,
                )

                original_char_idx = 0
                display_char_idx = 0
                line_colors = color_map[line_idx] if line_idx < len(color_map) else []

                color_runs = []
                current_run_start = 0
                current_run_color = None

                for orig_char in content:
                    color = (
                        line_colors[original_char_idx]
                        if original_char_idx < len(line_colors)
                        else DEFAULT_COLOR
                    )
                    char_count = 4 if orig_char == "\t" else 1

                    if color != current_run_color:
                        if current_run_color is not None and current_run_color != DEFAULT_COLOR:
                            color_runs.append((current_run_start, display_char_idx, current_run_color))
                        current_run_start = display_char_idx
                        current_run_color = color

                    display_char_idx += char_count
                    original_char_idx += 1

                if current_run_color is not None and current_run_color != DEFAULT_COLOR:
                    color_runs.append((current_run_start, display_char_idx, current_run_color))

                for start_idx, end_idx, color in color_runs:
                    adj_start = start_idx - leading_spaces
                    adj_end = end_idx - leading_spaces
                    if adj_end <= 0:
                        continue
                    adj_start = max(0, adj_start)
                    try:
                        for char in content_obj[adj_start:adj_end]:
                            char.set_color(color)
                    except IndexError:
                        break

                if width_scale < 1.0:
                    content_obj.scale(width_scale)
                content_obj.move_to([0, y_pos, 0])
                content_obj.to_edge(LEFT, buff=left_margin + scaled_gutter + indent_offset)
                final_content_pos = content_obj.get_center().copy()
            else:
                content_obj = None
                final_content_pos = None

            if animation_type in ("fade_in", "typewriter", "scale_in"):
                pass
            elif animation_type == "drop_in":
                num_obj.shift(UP * (frame_h + 2))
                self.add(num_obj)
            else:  # slide_left (default)
                num_obj.shift(LEFT * (frame_w + 2))
                self.add(num_obj)

            if content_obj is not None:
                if animation_type in ("fade_in", "typewriter", "scale_in"):
                    pass
                elif animation_type == "drop_in":
                    content_obj.shift(UP * (frame_h + 2))
                    self.add(content_obj)
                else:  # slide_left (default)
                    content_obj.shift(LEFT * (frame_w + 2))
                    self.add(content_obj)

            line_mobjects.append((num_obj, content_obj, final_num_pos, final_content_pos))

        self.wait(initial_delay)

        if enable_chunking:
            currently_visible = []
            current_visible_count = 0

            def get_chunk_position(slot_index):
                chunk_height = chunk_size * line_height
                y_start_chunk = (chunk_height / 2) - (line_height / 2)
                return y_start_chunk - (slot_index * line_height)

            def _scroll_off_visible():
                nonlocal currently_visible, current_visible_count
                if currently_visible:
                    all_objs = []
                    for pair in currently_visible:
                        all_objs.extend(obj for obj in pair if obj is not None)
                    visible_group = VGroup(*all_objs)
                    self.play(
                        visible_group.animate.shift(UP * (available_height + 1)),
                        run_time=scroll_duration,
                    )
                    currently_visible.clear()
                    current_visible_count = 0

            def _animate_chunk_lines(lines_list):
                nonlocal current_visible_count

                num_animations = []
                content_animations = []
                start_slot = current_visible_count

                for idx, line_num in lines_list:
                    num_obj, content_obj, orig_num_pos, orig_content_pos = line_mobjects[idx]
                    slot_y = get_chunk_position(current_visible_count)

                    num_target = [orig_num_pos[0], slot_y, 0]
                    if animation_type == "drop_in":
                        num_obj.move_to([orig_num_pos[0], frame_h + 2, 0])
                    elif animation_type not in ("fade_in", "typewriter", "scale_in"):
                        num_obj.move_to([-(frame_w + 2), slot_y, 0])
                    num_animations.append(
                        self._build_line_animation(num_obj, num_target, animation_type, line_slide_in)
                    )

                    if content_obj is not None:
                        content_target = [orig_content_pos[0], slot_y, 0]
                        if animation_type == "drop_in":
                            content_obj.move_to([orig_content_pos[0], frame_h + 2, 0])
                        elif animation_type not in ("fade_in", "typewriter", "scale_in"):
                            content_obj.move_to([-(frame_w + 2), slot_y, 0])
                        content_animations.append(
                            self._build_line_animation(content_obj, content_target, animation_type, line_slide_in)
                        )

                    shown_lines.add(line_num)
                    currently_visible.append((num_obj, content_obj))
                    current_visible_count += 1

                if num_animations:
                    self.play(*num_animations)
                    self.wait(pause_between_groups)
                if content_animations:
                    self.play(*content_animations)
                    self.wait(pause_between_groups)

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
                            _scroll_off_visible()
                            available_slots = chunk_size

                        chunk = remaining_indices[:available_slots]
                        remaining_indices = remaining_indices[available_slots:]
                        _animate_chunk_lines(chunk)

                elif isinstance(group, tuple) and group[0] == "SPLIT":
                    split_line_num = group[1]
                    _scroll_off_visible()

                    if (
                        split_line_num in line_to_index
                        and split_line_num not in shown_lines
                    ):
                        idx = line_to_index[split_line_num]
                        if idx < len(line_mobjects):
                            _animate_chunk_lines([(idx, split_line_num)])

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
                            _scroll_off_visible()

                        _animate_chunk_lines(lines_to_show)
        else:
            num_animations = []
            for num_obj, content_obj, final_num_pos, final_content_pos in line_mobjects:
                num_animations.append(
                    self._build_line_animation(num_obj, final_num_pos, animation_type, line_slide_in)
                )
            if num_animations:
                self.play(*num_animations)
                self.wait(pause_between_groups)

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
                    animations = []
                    for idx, _ in lines_to_show:
                        content_obj = line_mobjects[idx][1]
                        final_content_pos = line_mobjects[idx][3]
                        if content_obj is not None:
                            animations.append(
                                self._build_line_animation(
                                    content_obj, final_content_pos,
                                    animation_type, line_slide_in
                                )
                            )
                    for idx, line_num in lines_to_show:
                        shown_lines.add(line_num)

                    if animations:
                        self.play(*animations)
                    self.wait(pause_between_groups)

        self.wait(final_pause)

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

    script_path = input("Enter the path to the script file: ").strip()

    try:
        with open(script_path, "r") as f:
            lines = f.readlines()
        total_lines = len(lines)
        print(f"✓ File found: {total_lines} lines total")
    except FileNotFoundError:
        print(f"✗ Error: File '{script_path}' not found")
        sys.exit(1)

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

    include_comments = (
        input("\nInclude comments in the video? (y/n): ").strip().lower() == "y"
    )

    print("\n--- Line Groups ---")
    print("Enter line numbers for each group (space-separated)")
    print("Press Enter without input to show all remaining lines")
    print("Example: 21 38 34")

    line_groups = []
    group_num = 1
    shown_lines = set()

    while True:
        line_input = input(f"\nGroup {group_num} lines: ").strip()

        if not line_input:
            line_groups.append("ALL_REMAINING")
            print("✓ Will show all remaining lines in this group")
            break

        try:
            group = [int(x) for x in line_input.split()]
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

    base_filename = os.path.splitext(os.path.basename(script_path))[0]
    output_name = f"{base_filename}_{start_line}-{end_line}"

    print(f"\n✓ Configuration saved!")
    print(f"✓ Will animate {len(line_groups)} groups of lines")
    print(f"✓ Output will be named: {output_name}.mp4")
    print(f"\nGenerating animation...")


if __name__ == "__main__":
    if len(sys.argv) == 1 or sys.argv[1] != "--render":
        get_input()

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
        pass
