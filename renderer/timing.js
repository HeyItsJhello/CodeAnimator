export const QUALITY_DIMS = {
  fast:     { width: 1280, height: 720,  fps: 30 },
  standard: { width: 1920, height: 1080, fps: 60 },
  high:     { width: 3840, height: 2160, fps: 60 },
};

export function calculateTotalFrames({ animationTiming, lineGroups, fps }) {
  const {
    initialDelay = 1,
    lineSlideIn = 0.8,
    pauseBetweenGroups = 0.6,
    finalPause = 3.0,
  } = animationTiming || {};

  let frames = Math.round(initialDelay * fps);
  for (let i = 0; i < lineGroups.length; i++) {
    frames += Math.round(lineSlideIn * fps); // whole group animates in one duration
    if (i < lineGroups.length - 1) {
      frames += Math.round(pauseBetweenGroups * fps);
    }
  }
  frames += Math.round(finalPause * fps);
  return Math.max(frames, fps);
}
