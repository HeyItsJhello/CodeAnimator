import { API_URL, DEFAULT_TIMING } from "../data/constants";

// Parse a token like "5" or "1-5" into an array of line numbers
export const parseLineToken = (token) => {
  if (token.includes("-") && !token.match(/^-?\d+$/)) {
    const parts = token.split("-");
    if (parts.length !== 2) return [];
    const a = parseInt(parts[0]);
    const b = parseInt(parts[1]);
    if (isNaN(a) || isNaN(b)) return [];
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    const result = [];
    for (let i = min; i <= max; i++) result.push(i);
    return result;
  }
  const num = parseInt(token);
  return isNaN(num) ? [] : [num];
};

// Sanitize a timing value, falling back to a default if invalid
export const sanitizeTimingValue = (value, fallback) => {
  const num = parseFloat(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
};

// Ping the API and report its status via onStatus callback
export const checkApiStatus = async (onStatus) => {
  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 5000);
    const response   = await fetch(`${API_URL}/`, { signal: controller.signal });
    clearTimeout(timeout);
    onStatus(response.ok ? "awake" : "error");
  } catch (err) {
    if (err.name === "AbortError") {
      onStatus("waking");
      setTimeout(() => checkApiStatus(onStatus), 3000);
    } else {
      onStatus("error");
    }
  }
};

// Build a sanitized timing config from raw (possibly string) timing state
export const buildTimingConfig = (animationTiming) => ({
  initialDelay:       sanitizeTimingValue(animationTiming.initialDelay,       DEFAULT_TIMING.initialDelay),
  lineSlideIn:        sanitizeTimingValue(animationTiming.lineSlideIn,        DEFAULT_TIMING.lineSlideIn),
  pauseBetweenGroups: sanitizeTimingValue(animationTiming.pauseBetweenGroups, DEFAULT_TIMING.pauseBetweenGroups),
  finalPause:         sanitizeTimingValue(animationTiming.finalPause,         DEFAULT_TIMING.finalPause),
});

// Serialize line groups to the wire format the API expects
export const buildLineGroupsForApi = (lineGroups) =>
  lineGroups.map((group) => {
    if (group === "ALL_REMAINING") return "ALL_REMAINING";
    if (typeof group === "object" && group.type === "SPLIT") return `SPLIT ${group.line}`;
    return group.join(" ");
  });

// Build a Map<lineNum, groupNums[]> used by the preview to show group indicators
export const calculateLineGroupMap = (lineGroups, startLine, endLine) => {
  const map      = new Map();
  const consumed = new Set();

  const addToMap = (lineNum, groupNum) => {
    const existing = map.get(lineNum) || [];
    if (!existing.includes(groupNum)) map.set(lineNum, [...existing, groupNum]);
  };

  lineGroups.forEach((group, idx) => {
    const groupNum = idx + 1;

    if (group === "ALL_REMAINING") {
      for (let ln = startLine; ln <= endLine; ln++) {
        if (!consumed.has(ln)) { addToMap(ln, groupNum); consumed.add(ln); }
      }
    } else if (typeof group === "object" && group.type === "SPLIT") {
      const ln = group.line;
      if (ln >= startLine && ln <= endLine && !consumed.has(ln)) {
        addToMap(ln, groupNum); consumed.add(ln);
      }
    } else if (Array.isArray(group)) {
      group.forEach((ln) => {
        if (ln >= startLine && ln <= endLine && !consumed.has(ln)) {
          addToMap(ln, groupNum); consumed.add(ln);
        }
      });
    }
  });

  return map;
};
