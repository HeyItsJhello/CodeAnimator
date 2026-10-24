export const QUALITY_DIMS = {
  fast:     { width: 1280, height: 720,  fps: 30 },
  standard: { width: 1920, height: 1080, fps: 60 },
  high:     { width: 3840, height: 2160, fps: 60 },
};

export function getRenderDims({ quality, orientation } = {}) {
  const dims = QUALITY_DIMS[quality] ?? QUALITY_DIMS.standard;
  return orientation === 'portrait'
    ? { width: dims.height, height: dims.width, fps: dims.fps }
    : { ...dims };
}

// Timing values arrive from client JSON: reject anything not a finite number ≥ 0.
function toSeconds(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function normalizeTiming(animationTiming) {
  const t = animationTiming || {};
  return {
    initialDelay:       toSeconds(t.initialDelay, 1),
    lineSlideIn:        toSeconds(t.lineSlideIn, 0.8),
    pauseBetweenGroups: toSeconds(t.pauseBetweenGroups, 0.6),
    finalPause:         toSeconds(t.finalPause, 3.0),
  };
}

export function calculateTotalFrames({ animationTiming, lineGroups, fps }) {
  const { initialDelay, lineSlideIn, pauseBetweenGroups, finalPause } =
    normalizeTiming(animationTiming);
  const groupCount = Array.isArray(lineGroups) ? lineGroups.length : 0;

  let frames = Math.round(initialDelay * fps);
  frames += groupCount * Math.round(lineSlideIn * fps);
  frames += Math.max(0, groupCount - 1) * Math.round(pauseBetweenGroups * fps);
  frames += Math.round(finalPause * fps);

  return Math.max(frames, fps);
}
