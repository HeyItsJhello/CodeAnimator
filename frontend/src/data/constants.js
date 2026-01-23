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
  initialDelay: 1.5,
  lineSlideIn: 0.4,
  pauseBetweenGroups: 0.2,
  finalPause: 2.0,
};

export const DEFAULT_TIMING_STR = Object.fromEntries(
  Object.entries(DEFAULT_TIMING).map(([k, v]) => [k, String(v)]),
);
