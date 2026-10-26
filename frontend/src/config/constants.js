// API URL - uses environment variable in production, localhost in development
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Default syntax highlighting colors — Godot 4 script editor (dark theme)
export const DEFAULT_SYNTAX_COLORS = {
  background: "#1e1e2e", // scene background
  keywords:   "#FF3D3D", // pure vivid red    (func, var, if, for, return, extends…)
  types:      "#00FF9B", // saturated mint    (Vector2, Node3D, String, Dictionary…)
  functions:  "#00ECFF", // bright cyan       (print(), get_node(), randf(), user funcs)
  strings:    "#FFE040", // vivid yellow      (string literals)
  numbers:    "#80FFE8", // bright aqua       (integers, floats, constants)
  comments:   "#8899A6", // blue-gray         (# comments)
  decorators: "#FF3D3D", // pure vivid red    (@export, @onready, @tool — same as keywords)
  default:    "#E8E8E8", // bright near-white (user variables, identifiers, operators)
};

export const DEFAULT_TIMING = {
  initialDelay: 1,
  lineSlideIn: 0.8,
  pauseBetweenGroups: 0.6,
  finalPause: 3.0,
};

export const DEFAULT_TIMING_STR = Object.fromEntries(
  Object.entries(DEFAULT_TIMING).map(([k, v]) => [k, String(v)]),
);

export const ANIMATION_TYPES = [
  { value: "slide_left", label: "Slide In", desc: "From the left" },
  { value: "fade_in", label: "Fade In", desc: "Opacity transition" },
  { value: "typewriter", label: "Typewriter", desc: "Letter by letter" },
  { value: "drop_in", label: "Drop In", desc: "From the top" },
  { value: "scale_in", label: "Scale In", desc: "Grow from center" },
];

export const DEFAULT_ANIMATION_TYPE = "slide_left";

export const FONT_OPTIONS = [
  { value: "default",         label: "Default",          family: "monospace",                      desc: "System monospace",    category: "system"    },
  { value: "jetbrains_mono",  label: "JetBrains Mono",   family: "'JetBrains Mono', monospace",    desc: "Developer favorite",  category: "modern"    },
  { value: "fira_code",       label: "Fira Code",        family: "'Fira Code', monospace",         desc: "With ligatures",      category: "modern"    },
  { value: "source_code_pro", label: "Source Code Pro",  family: "'Source Code Pro', monospace",   desc: "Adobe open-source",   category: "modern"    },
  { value: "roboto_mono",     label: "Roboto Mono",      family: "'Roboto Mono', monospace",       desc: "Clean & readable",    category: "modern"    },
  { value: "ibm_plex_mono",   label: "IBM Plex Mono",    family: "'IBM Plex Mono', monospace",     desc: "Modern technical",    category: "modern"    },
  { value: "inconsolata",     label: "Inconsolata",      family: "'Inconsolata', monospace",       desc: "Compact & elegant",   category: "modern"    },
  { value: "space_mono",      label: "Space Mono",       family: "'Space Mono', monospace",        desc: "Bold & geometric",    category: "geometric" },
  { value: "share_tech_mono", label: "Share Tech Mono",  family: "'Share Tech Mono', monospace",   desc: "Terminal vibes",      category: "geometric" },
  { value: "pt_mono",         label: "PT Mono",          family: "'PT Mono', monospace",           desc: "Russian standard",    category: "geometric" },
  { value: "courier_new",     label: "Courier New",      family: "'Courier New', monospace",       desc: "Classic typewriter",  category: "classic"   },
  { value: "anonymous_pro",   label: "Anonymous Pro",    family: "'Anonymous Pro', monospace",     desc: "Open-source classic", category: "classic"   },
  { value: "pixel_code",      label: "Pixel Code",       family: "'Pixel Code', monospace",        desc: "Pixel aesthetic",     category: "retro"     },
  { value: "vt323",           label: "VT323",            family: "'VT323', monospace",             desc: "CRT terminal",        category: "retro"     },
];

export const DEFAULT_FONT = "default";

export const QUALITY_OPTIONS = [
  { value: "fast",     label: "Fast",     size: "720p @ 30fps"  },
  { value: "standard", label: "Standard", size: "1080p @ 60fps" },
  { value: "high",     label: "High",     size: "4K @ 60fps"    },
];

// Add YouTube video IDs here when available
export const USED_IN_VIDEOS = [
  // { id: "dQw4w9WgXcQ", title: "Example Video 1" },
  // { id: "dQw4w9WgXcQ", title: "Example Video 2" },
];
