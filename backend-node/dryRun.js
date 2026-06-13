import { QUALITY_DIMS } from '../renderer/timing.js';

export function computeDryRun({ lineGroups, animationTiming, quality = 'standard' }) {
  const fps = (QUALITY_DIMS[quality] ?? QUALITY_DIMS.standard).fps;
  const {
    initialDelay = 1,
    lineSlideIn = 0.8,
    pauseBetweenGroups = 0.6,
    finalPause = 3.0,
  } = animationTiming || {};

  let frames = Math.round(initialDelay * fps);

  const groups = (lineGroups || []).map((group, i) => {
    const groupFrames = Math.round(lineSlideIn * fps);
    frames += groupFrames;
    if (i < lineGroups.length - 1) frames += Math.round(pauseBetweenGroups * fps);
    return {
      index:       i,
      lineCount:   group.lineCount ?? group.lines?.length ?? 0,
      lines:       group.lines || [],
      frames:      groupFrames,
      durationSecs: Math.round((groupFrames / fps) * 100) / 100,
    };
  });

  frames += Math.round(finalPause * fps);

  return { fps, totalFrames: frames, estimatedDuration: frames / fps, groups };
}
