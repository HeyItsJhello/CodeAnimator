// API URL - uses environment variable in production, localhost in development
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Default syntax highlighting colors (Manim color names)
export const DEFAULT_SYNTAX_COLORS = {
  keywords: "#9b59b6", // PURPLE
  types: "#3498db", // BLUE
  functions: "#3498db", // BLUE
  strings: "#2ecc71", // GREEN
  numbers: "#e67e22", // ORANGE
  comments: "#7f8c8d", // GRAY
  decorators: "#f1c40f", // YELLOW
  default: "#ffffff", // WHITE
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
