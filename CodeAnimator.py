import json
import os
import platform
import shutil
import sys
from pathlib import Path

from manim import *
from pygments import lex
from pygments.lexers import TextLexer, get_lexer_for_filename
from pygments.token import Token

MONOSPACE_FONT = "Menlo" if platform.system() == "Darwin" else "Liberation Mono"
FONTS_DIR = Path(__file__).parent / "fonts"

# Map frontend font values → (pango font name, optional TTF filename in FONTS_DIR)
_FONT_MAP = {
    "default":         (MONOSPACE_FONT,      None),
    "jetbrains_mono":  ("JetBrains Mono",    None),
    "fira_code":       ("Fira Code",         None),
    "source_code_pro": ("Source Code Pro",   None),
    "roboto_mono":     ("Roboto Mono",       None),
    "ibm_plex_mono":   ("IBM Plex Mono",     None),
    "inconsolata":     ("Inconsolata",       None),
    "space_mono":      ("Space Mono",        None),
    "share_tech_mono": ("Share Tech Mono",   None),
    "pt_mono":         ("PT Mono",           None),
    "courier_new":     ("Courier New",       None),
    "anonymous_pro":   ("Anonymous Pro",     None),
    "pixel_code":      ("Pixel Code",        "PixelCode.ttf"),
    "vt323":           ("VT323",             None),
}

# Orientation must be resolved before Manim reads config (module-load time).
# Primary source: env var set by the FastAPI backend.
# Fallback: legacy config file for manual/interactive testing.
_orientation = os.environ.get("ANIM_ORIENTATION", "").strip()
if _orientation not in ("landscape", "portrait"):
    _orientation = "landscape"
    try:
        with open("/tmp/anim_config.txt") as _f:
            _lines = _f.read().strip().split("\n")
            if len(_lines) > 5 and _lines[5].strip() in ("landscape", "portrait"):
                _orientation = _lines[5].strip()
    except OSError:
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


class CodeAnimation(Scene):

    def _load_config(self):
        # Worker path: config was injected directly to avoid stdin conflicts
        if hasattr(self.__class__, "_worker_config"):
            cfg = dict(self.__class__._worker_config)
            cfg["line_groups"] = self._parse_line_groups(cfg.get("line_groups", []))
            return cfg

        if not sys.stdin.isatty():
            try:
                anim_config = json.load(sys.stdin)
                anim_config["line_groups"] = self._parse_line_groups(
                    anim_config.get("line_groups", [])
                )
                return anim_config
            except json.JSONDecodeError as e:
                print(f"ERROR: Invalid JSON from stdin: {e}")
                return None

        try:
            with open("/tmp/anim_config.txt") as f:
                content = f.read()
            return self._parse_legacy_config(content)
        except FileNotFoundError:
            print("ERROR: Config file not found at /tmp/anim_config.txt")
            return None

    def _parse_line_groups(self, groups_list):
        parsed = []
        for group in groups_list:
            if group == "ALL_REMAINING":
                parsed.append("ALL_REMAINING")
            elif isinstance(group, str) and group.startswith("SPLIT "):
                parsed.append(("SPLIT", int(group.split()[1])))
            elif isinstance(group, str):
                parsed.append([int(x) for x in group.split()])
            elif isinstance(group, list):
                parsed.append(group)
        return parsed

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
            if len(lines) > 5 and lines[5].strip() in ("landscape", "portrait"):
                orientation = lines[5].strip()
        except IndexError:
            pass

        animation_timing = {}
        try:
            if len(lines) > 6 and lines[6].strip().startswith("{"):
                animation_timing = json.loads(lines[6])
        except (json.JSONDecodeError, IndexError):
            pass

        # Find where the line-group specs begin
        start_idx = 6
        for i in range(6, len(lines)):
            tok = lines[i].strip()
            if tok.startswith("{") or tok in ("landscape", "portrait", "fast", "standard", "high"):
                start_idx = i + 1
            else:
                start_idx = i
                break

        line_groups = []
        for line in lines[start_idx:]:
            tok = line.strip()
            if not tok:
                continue
            if tok == "ALL_REMAINING":
                line_groups.append("ALL_REMAINING")
            elif tok.startswith("SPLIT "):
                line_groups.append(("SPLIT", int(tok.split()[1])))
            else:
                line_groups.append([int(x) for x in tok.split()])

        return {
            "script_path": lines[0] if lines else "",
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
            return FadeIn(line_obj, run_time=run_time)
        if animation_type == "typewriter":
            line_obj.move_to(target_pos)
            return AddTextLetterByLetter(line_obj)
        if animation_type == "scale_in":
            line_obj.move_to(target_pos)
            return GrowFromCenter(line_obj, run_time=run_time)
        # drop_in and slide_left: object is already off-screen, animate to target
        return line_obj.animate(run_time=run_time).move_to(target_pos)

    @staticmethod
    def _build_color_runs(content, line_colors, leading_spaces, default_color):
        """Convert per-character color list → run-length spans adjusted for content_obj."""
        runs = []
        current_color = None
        run_start = 0
        disp_idx = 0

        for orig_idx, ch in enumerate(content):
            color = line_colors[orig_idx] if orig_idx < len(line_colors) else default_color
            char_width = 4 if ch == "\t" else 1

            if color != current_color:
                if current_color is not None and current_color != default_color:
                    runs.append((run_start, disp_idx, current_color))
                run_start = disp_idx
                current_color = color

            disp_idx += char_width

        if current_color is not None and current_color != default_color:
            runs.append((run_start, disp_idx, current_color))

        # Adjust indices: content_obj has leading spaces stripped
        adjusted = []
        for s, e, color in runs:
            adj_s = s - leading_spaces
            adj_e = e - leading_spaces
            if adj_e <= 0:
                continue
            adjusted.append((max(0, adj_s), adj_e, color))
        return adjusted

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
        font_key = anim_config.get("font", "default")
        line_groups = anim_config["line_groups"]

        import manimpango
        _pango_name, _ttf_file = _FONT_MAP.get(font_key, (MONOSPACE_FONT, None))
        if _ttf_file:
            _ttf_path = FONTS_DIR / _ttf_file
            if _ttf_path.exists():
                manimpango.register_font(str(_ttf_path))
            else:
                print(f"WARNING: Font file not found: {_ttf_path}, falling back to default")
                _pango_name = MONOSPACE_FONT
        elif _pango_name != MONOSPACE_FONT:
            if _pango_name not in manimpango.list_fonts():
                print(f"WARNING: Font '{_pango_name}' not installed, falling back to default")
                _pango_name = MONOSPACE_FONT
        render_font = _pango_name

        _defaults = {
            "initialDelay": 1.5,
            "lineSlideIn": 0.4,
            "pauseBetweenGroups": 0.2,
            "finalPause": 2.0,
        }
        initial_delay = max(0.0, animation_timing.get("initialDelay", _defaults["initialDelay"]))
        line_slide_in = max(0.05, animation_timing.get("lineSlideIn", _defaults["lineSlideIn"]))
        pause_between_groups = max(0.0, animation_timing.get("pauseBetweenGroups", _defaults["pauseBetweenGroups"]))
        final_pause = max(0.0, animation_timing.get("finalPause", _defaults["finalPause"]))
        scroll_duration = max(line_slide_in, 0.5)

        base_filename = os.path.splitext(os.path.basename(script_path))[0]
        custom_name = f"{base_filename}_{start_line}-{end_line}"
        self.renderer.file_writer.movie_file_extension = ".mp4"
        try:
            self.renderer.file_writer.output_name = custom_name
        except AttributeError:
            pass

        with open(script_path) as f:
            source_lines = f.readlines()

        filtered_lines = []
        for i in range(start_line - 1, min(end_line, len(source_lines))):
            line = source_lines[i].rstrip()
            if not include_comments:
                stripped = line.strip()
                if stripped.startswith("#") or stripped.startswith("//"):
                    continue
            filtered_lines.append((i + 1, line))

        if not filtered_lines:
            print("ERROR: No lines to render after filtering")
            return

        line_to_index = {ln: idx for idx, (ln, _) in enumerate(filtered_lines)}
        num_lines = len(filtered_lines)
        max_line_num = filtered_lines[-1][0]
        line_num_width = len(str(max_line_num))

        print(f"DEBUG: Script={script_path}, lines {start_line}-{end_line}, "
              f"filtered={num_lines}, orientation={orientation}, type={animation_type}")

        frame_w = config.frame_width
        frame_h = config.frame_height

        if orientation == "portrait":
            top_margin = bottom_margin = 0.3
            left_margin = right_margin = 0.05
            MIN_FONT_SIZE, MAX_FONT_SIZE = 32, 48
            MIN_LINE_HEIGHT, MAX_LINE_HEIGHT = 0.32, 0.45
        else:
            top_margin = bottom_margin = 0.3
            left_margin = right_margin = 0.3
            MIN_FONT_SIZE, MAX_FONT_SIZE = 16, 28
            MIN_LINE_HEIGHT, MAX_LINE_HEIGHT = 0.35, 0.6

        available_height = frame_h - top_margin - bottom_margin
        available_width = frame_w - left_margin - right_margin
        font_multiplier = 55 if orientation == "portrait" else 45

        def compute_font_size(lh):
            return max(MIN_FONT_SIZE, min(MAX_FONT_SIZE, int(lh * font_multiplier)))

        ideal_line_height = available_height / num_lines
        line_height = max(MIN_LINE_HEIGHT, min(MAX_LINE_HEIGHT, ideal_line_height))
        base_font_size = compute_font_size(line_height)
        total_height = num_lines * line_height

        enable_chunking = False
        chunk_size = 0
        if total_height > available_height:
            lines_that_fit = int(available_height / MIN_LINE_HEIGHT)
            if num_lines > lines_that_fit * 1.5:
                enable_chunking = True
                chunk_size = lines_that_fit
                line_height = MIN_LINE_HEIGHT
            else:
                line_height = available_height / num_lines
            base_font_size = compute_font_size(line_height)

        print(f"DEBUG: line_height={line_height:.3f}, font_size={base_font_size}, chunking={enable_chunking}")

        color_keywords   = custom_colors.get("keywords",   "#FF3D3D")
        color_types      = custom_colors.get("types",      "#00FF9B")
        color_functions  = custom_colors.get("functions",  "#00ECFF")
        color_strings    = custom_colors.get("strings",    "#FFE040")
        color_numbers    = custom_colors.get("numbers",    "#80FFE8")
        color_comments   = custom_colors.get("comments",   "#8899A6")
        color_decorators = custom_colors.get("decorators", "#FF3D3D")
        color_default    = custom_colors.get("default",    "#E8E8E8")
        DEFAULT_COLOR = color_default

        TOKEN_COLORS = {
            Token.Comment.Multiline: color_comments,
            Token.Comment.Single: color_comments,
            Token.Comment.Special: color_comments,
            Token.Comment.PreprocFile: color_comments,
            Token.Comment: color_comments,
            Token.Comment.Preproc: color_keywords,
            Token.Keyword.Namespace: color_types,
            Token.Keyword.Type: color_keywords,
            Token.Keyword.Constant: color_keywords,
            Token.Keyword.Declaration: color_keywords,
            Token.Keyword.Pseudo: color_keywords,
            Token.Keyword.Reserved: color_keywords,
            Token.Keyword: color_keywords,
            Token.Name.Builtin: color_types,
            Token.Name.Builtin.Pseudo: color_types,
            Token.Name.Namespace: color_types,
            Token.Name.Function: color_functions,
            Token.Name.Function.Magic: color_functions,
            Token.Name.Class: color_types,
            Token.Name.Decorator: color_decorators,
            Token.Name.Variable: color_types,
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
        }

        # More-specific types first ensures subtype matching via inheritance chain
        _token_parents = tuple(sorted(TOKEN_COLORS.items(), key=lambda x: -len(x[0])))
        _token_color_cache = {}

        def get_token_color(token_type):
            cached = _token_color_cache.get(token_type)
            if cached is not None:
                return cached
            color = TOKEN_COLORS.get(token_type)
            if color is None:
                for ttype, tcolor in _token_parents:
                    if token_type in ttype:
                        color = tcolor
                        break
                else:
                    color = DEFAULT_COLOR
            _token_color_cache[token_type] = color
            return color

        try:
            lexer = get_lexer_for_filename(script_path)
        except Exception:
            lexer = TextLexer()

        full_code_text = "\n".join(content for _, content in filtered_lines)
        full_tokens = list(lex(full_code_text, lexer))

        # GDScript-specific fixes for Godot 4 syntax that Pygments misclassifies
        if script_path.endswith(".gd"):
            fixed_tokens = []
            i = 0
            n_tok = len(full_tokens)
            while i < n_tok:
                ttype, tval = full_tokens[i]

                # @annotation: Token.Error('@') + Keyword → Name.Decorator
                if ttype == Token.Error and tval == "@" and i + 1 < n_tok:
                    nt, nv = full_tokens[i + 1]
                    if nt in Token.Keyword:
                        fixed_tokens.append((Token.Name.Decorator, "@" + nv))
                        i += 2
                        continue

                # $node_ref: Operator('$') + Name (+ '/Name')* → Name.Variable
                if ttype == Token.Operator and tval == "$" and i + 1 < n_tok:
                    nt, nv = full_tokens[i + 1]
                    if nt == Token.Name:
                        node_path = "$" + nv
                        j = i + 2
                        while j + 1 < n_tok:
                            st, sv = full_tokens[j]
                            if st == Token.Operator and sv == "/":
                                nt2, nv2 = full_tokens[j + 1]
                                if nt2 == Token.Name:
                                    node_path += "/" + nv2
                                    j += 2
                                    continue
                            break
                        fixed_tokens.append((Token.Name.Variable, node_path))
                        i = j
                        continue

                fixed_tokens.append((ttype, tval))
                i += 1
            full_tokens = fixed_tokens

        # Universal fix: generic Name tokens immediately before '(' → Name.Function.
        # Pygments emits Token.Name / Token.Name.Other for function calls in many
        # languages (GdScript, JS/TS, Go, Python calls, C++ calls, etc.).
        _func_fixable = frozenset([Token.Name, Token.Name.Other, Token.Name.Attribute])
        _n = len(full_tokens)
        full_tokens = [
            (Token.Name.Function, tval)
            if (ttype in _func_fixable
                and i + 1 < _n
                and full_tokens[i + 1][0] == Token.Punctuation
                and full_tokens[i + 1][1] == "(")
            else (ttype, tval)
            for i, (ttype, tval) in enumerate(full_tokens)
        ]

        num_filtered = len(filtered_lines)
        color_map = [[DEFAULT_COLOR] * len(content) for _, content in filtered_lines]
        cur_line = cur_char = 0

        for token_type, token_value in full_tokens:
            token_color = get_token_color(token_type)
            for ch in token_value:
                if ch == "\n":
                    cur_line += 1
                    cur_char = 0
                else:
                    if cur_line < num_filtered:
                        row = color_map[cur_line]
                        if cur_char < len(row):
                            row[cur_char] = token_color
                    cur_char += 1

        # 20-char reference averages out bounding-box overhead for accurate per-glyph width.
        _ref_str = "0" * 20
        digit_ref = Text(_ref_str, font=render_font, font_size=base_font_size, disable_ligatures=True)
        digit_width = digit_ref.width / len(_ref_str)
        gutter_text_width = (line_num_width + 2) * digit_width

        line_data = []  # (line_num, content, content_display, leading_spaces, content_stripped, gutter_offset)
        max_line_width = 0.0

        for line_num, content in filtered_lines:
            content_display = content.replace("\t", "    ")
            leading = len(content_display) - len(content_display.lstrip(" "))
            stripped = content_display.lstrip(" ")
            display_len = len(content_display)
            effective_width = gutter_text_width + display_len * digit_width
            if effective_width > max_line_width:
                max_line_width = effective_width
            gutter_offset = line_num_width - len(str(line_num))
            line_data.append((line_num, content, content_display, leading, stripped, gutter_offset))

        # Apply a small safety margin so slight glyph-width discrepancies don't clip.
        width_scale = min(1.0, available_width / (max_line_width * 1.03)) if max_line_width > 0 else 1.0
        scaled_gutter = gutter_text_width * width_scale

        print(f"DEBUG: max_line_width={max_line_width:.3f}, available={available_width:.2f}, scale={width_scale:.3f}")

        y_start = (num_lines * line_height / 2) - (line_height / 2)

        shown_lines = set()
        line_mobjects = []  # (num_obj, content_obj, final_num_pos, final_content_pos)

        for line_idx, (line_num, content, content_display, leading_spaces, content_stripped, gutter_offset) in enumerate(line_data):
            y_pos = y_start - line_idx * line_height

            # Gutter number
            num_obj = Text(
                str(line_num),
                font=render_font,
                font_size=base_font_size,
                color=DEFAULT_COLOR,
                disable_ligatures=True,
            )
            if width_scale < 1.0:
                num_obj.scale(width_scale)
            num_obj.move_to([0, y_pos, 0])
            num_obj.to_edge(LEFT, buff=left_margin)
            if gutter_offset > 0:
                num_obj.shift(RIGHT * digit_width * gutter_offset * width_scale)
            final_num_pos = num_obj.get_center().copy()

            # Code content
            indent_offset = leading_spaces * digit_width * width_scale

            if content_stripped:
                content_obj = Text(
                    content_stripped,
                    font=render_font,
                    font_size=base_font_size,
                    color=DEFAULT_COLOR,
                    disable_ligatures=True,
                )

                color_runs = self._build_color_runs(
                    content, color_map[line_idx], leading_spaces, DEFAULT_COLOR
                )
                for adj_s, adj_e, color in color_runs:
                    try:
                        for char_mob in content_obj[adj_s:adj_e]:
                            char_mob.set_color(color)
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

            # Place off-screen for slide_left / drop_in
            if animation_type == "drop_in":
                num_obj.shift(UP * (frame_h + 2))
                self.add(num_obj)
                if content_obj is not None:
                    content_obj.shift(UP * (frame_h + 2))
                    self.add(content_obj)
            elif animation_type not in ("fade_in", "typewriter", "scale_in"):
                num_obj.shift(LEFT * (frame_w + 2))
                self.add(num_obj)
                if content_obj is not None:
                    content_obj.shift(LEFT * (frame_w + 2))
                    self.add(content_obj)

            line_mobjects.append((num_obj, content_obj, final_num_pos, final_content_pos))

        self.wait(initial_delay)

        if enable_chunking:
            currently_visible = []
            current_visible_count = 0

            def get_chunk_y(slot_index):
                chunk_height = chunk_size * line_height
                return (chunk_height / 2) - (line_height / 2) - slot_index * line_height

            def scroll_off_visible():
                nonlocal currently_visible, current_visible_count
                if not currently_visible:
                    return
                all_objs = [obj for pair in currently_visible for obj in pair if obj is not None]
                self.play(VGroup(*all_objs).animate.shift(UP * (available_height + 1)), run_time=scroll_duration)
                currently_visible.clear()
                current_visible_count = 0

            def animate_chunk_lines(lines_list):
                nonlocal current_visible_count
                num_anims, content_anims = [], []

                for idx, line_num in lines_list:
                    num_obj, content_obj, orig_num_pos, orig_content_pos = line_mobjects[idx]
                    slot_y = get_chunk_y(current_visible_count)
                    num_target = [orig_num_pos[0], slot_y, 0]

                    if animation_type == "drop_in":
                        num_obj.move_to([orig_num_pos[0], frame_h + 2, 0])
                    elif animation_type not in ("fade_in", "typewriter", "scale_in"):
                        num_obj.move_to([-(frame_w + 2), slot_y, 0])
                    num_anims.append(self._build_line_animation(num_obj, num_target, animation_type, line_slide_in))

                    if content_obj is not None:
                        content_target = [orig_content_pos[0], slot_y, 0]
                        if animation_type == "drop_in":
                            content_obj.move_to([orig_content_pos[0], frame_h + 2, 0])
                        elif animation_type not in ("fade_in", "typewriter", "scale_in"):
                            content_obj.move_to([-(frame_w + 2), slot_y, 0])
                        content_anims.append(self._build_line_animation(content_obj, content_target, animation_type, line_slide_in))

                    shown_lines.add(line_num)
                    currently_visible.append((num_obj, content_obj))
                    current_visible_count += 1

                if num_anims:
                    self.play(*num_anims)
                    self.wait(pause_between_groups)
                if content_anims:
                    self.play(*content_anims)
                    self.wait(pause_between_groups)

            for group in line_groups:
                if group == "ALL_REMAINING":
                    remaining = [
                        (idx, ln)
                        for idx, (ln, _) in enumerate(filtered_lines)
                        if ln not in shown_lines and idx < len(line_mobjects)
                    ]
                    while remaining:
                        slots = chunk_size - current_visible_count
                        if slots <= 0:
                            scroll_off_visible()
                            slots = chunk_size
                        chunk, remaining = remaining[:slots], remaining[slots:]
                        animate_chunk_lines(chunk)

                elif isinstance(group, tuple) and group[0] == "SPLIT":
                    split_ln = group[1]
                    scroll_off_visible()
                    if split_ln in line_to_index and split_ln not in shown_lines:
                        idx = line_to_index[split_ln]
                        if idx < len(line_mobjects):
                            animate_chunk_lines([(idx, split_ln)])

                else:
                    lines_to_show = [
                        (line_to_index[ln], ln)
                        for ln in group
                        if ln in line_to_index and ln not in shown_lines and line_to_index[ln] < len(line_mobjects)
                    ]
                    if lines_to_show:
                        if len(lines_to_show) > chunk_size - current_visible_count:
                            scroll_off_visible()
                        animate_chunk_lines(lines_to_show)

        else:
            # Non-chunking: animate all gutter numbers first, then reveal content by group
            num_anims = [
                self._build_line_animation(num_obj, final_num_pos, animation_type, line_slide_in)
                for num_obj, _, final_num_pos, _ in line_mobjects
            ]
            if num_anims:
                self.play(*num_anims)
                self.wait(pause_between_groups)

            for group in line_groups:
                if group == "ALL_REMAINING":
                    lines_to_show = [
                        (idx, ln)
                        for idx, (ln, _) in enumerate(filtered_lines)
                        if ln not in shown_lines and idx < len(line_mobjects)
                    ]
                elif isinstance(group, tuple) and group[0] == "SPLIT":
                    # SPLIT in non-chunking mode: reveal that single line as its own group
                    split_ln = group[1]
                    lines_to_show = [
                        (line_to_index[split_ln], split_ln)
                    ] if split_ln in line_to_index and split_ln not in shown_lines else []
                else:
                    lines_to_show = [
                        (line_to_index[ln], ln)
                        for ln in group
                        if ln in line_to_index and ln not in shown_lines and line_to_index[ln] < len(line_mobjects)
                    ]

                if lines_to_show:
                    anims = [
                        self._build_line_animation(
                            line_mobjects[idx][1], line_mobjects[idx][3],
                            animation_type, line_slide_in
                        )
                        for idx, _ in lines_to_show
                        if line_mobjects[idx][1] is not None
                    ]
                    for _, ln in lines_to_show:
                        shown_lines.add(ln)
                    if anims:
                        self.play(*anims)
                    self.wait(pause_between_groups)

        self.wait(final_pause)

        # Clean up Manim's SVG/text cache created during this render
        cache_dir = config.text_dir
        if os.path.exists(cache_dir):
            try:
                shutil.rmtree(cache_dir)
            except Exception as e:
                print(f"WARNING: Could not clean SVG cache: {e}")
