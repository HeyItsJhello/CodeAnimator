import { API_URL, DEFAULT_TIMING } from "../data/constants";

// Parse a line token (e.g., "5" or "1-5") into an array of line numbers
export const parseLineToken = (token) => {
  if (token.includes("-") && !token.match(/^-?\d+$/)) {
    const parts = token.split("-");

    if (parts.length != 2) return [];

    const start = parseInt(parts[0]);
    const end = parseInt(parts[1]);

    // Make sure both parts are ints so everything works | Test cases would be like a-5
    if (isNaN(start) || isNaN(end)) return [];

    // Correct ordering in case like 5-1
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    const result = [];

    // now to push to the results, since it is just an incrementing loop going to the maxLineNum
    for (let i = min; i <= max; i++) {
      result.push(i);
    }
    return result;
  }

  // Single number case
  const num = parseInt(token);
  return isNaN(num) ? [] : [num];
};

// Sanitize timing value with fallback
export const sanitizeTimingValue = (value, fallback) => {
  const num = parseFloat(value);
  if (Number.isFinite(num) && num >= 0) return num;
  return fallback;
};

// Check if the API is awake
export const checkApiStatus = async (setApiStatus) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(`${API_URL}/`, {
      signal: controller.signal,
      method: "GET",
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      setApiStatus("awake");
    } else {
      setApiStatus("error");
    }
  } catch (error) {
    if (error.name === "AbortError") {
      setApiStatus("waking");
      setTimeout(() => checkApiStatus(setApiStatus), 3000);
    }
  }
};

// Build timing config from animation timing state
export const buildTimingConfig = (animationTiming) => {
  return {
    initialDelay: sanitizeTimingValue(
      animationTiming.initialDelay,
      DEFAULT_TIMING.initialDelay,
    ),
    lineSlideIn: sanitizeTimingValue(
      animationTiming.lineSlideIn,
      DEFAULT_TIMING.lineSlideIn,
    ),
    pauseBetweenGroups: sanitizeTimingValue(
      animationTiming.pauseBetweenGroups,
      DEFAULT_TIMING.pauseBetweenGroups,
    ),
    finalPause: sanitizeTimingValue(
      animationTiming.finalPause,
      DEFAULT_TIMING.finalPause,
    ),
  };
};

// Build line groups for API submission
export const buildLineGroupsForApi = (lineGroups) => {
  return lineGroups.map((group) => {
    if (group === "ALL_REMAINING") return "ALL_REMAINING";
    if (typeof group === "object" && group.type === "SPLIT")
      return `SPLIT ${group.line}`;
    return group.join(" ");
  });
};

// Calculate line group map for preview indicators
export const calculateLineGroupMap = (lineGroups, startLine, endLine) => {
  const map = new Map();
  const addToMap = (lineNum, groupNum) => {
    const existing = map.get(lineNum) || [];
    if (!existing.includes(groupNum)) {
      map.set(lineNum, [...existing, groupNum]);
    }
  };

  // Track which lines are consumed by ALL_REMAINING to keep semantics consistent
  const consumed = new Set();

  lineGroups.forEach((group, idx) => {
    const groupNum = idx + 1;
    if (group === "ALL_REMAINING") {
      for (let ln = startLine; ln <= endLine; ln++) {
        if (!consumed.has(ln)) {
          addToMap(ln, groupNum);
          consumed.add(ln);
        }
      }
    } else if (typeof group === "object" && group.type === "SPLIT") {
      const ln = group.line;
      if (ln >= startLine && ln <= endLine && !consumed.has(ln)) {
        addToMap(ln, groupNum);
        consumed.add(ln);
      }
    } else if (Array.isArray(group)) {
      group.forEach((ln) => {
        if (ln >= startLine && ln <= endLine && !consumed.has(ln)) {
          addToMap(ln, groupNum);
          consumed.add(ln);
        }
      });
    }
  });

  return map;
};
