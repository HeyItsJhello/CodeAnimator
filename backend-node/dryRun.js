const FPS_BY_QUALITY = { fast: 30, standard: 60, high: 60 };

export function computeDryRun({ lineGroups, animationTiming, quality = 'standard' }) {
  const fps = FPS_BY_QUALITY[quality] || 30;
  const {
    initialDelay = 1,
    lineSlideIn = 0.8,
    pauseBetweenGroups = 0.6,
    finalPause = 3.0,
  } = animationTiming || {};

  let frames = Math.round(initialDelay * fps);

  const groups = (lineGroups || []).map((group, i) => {
    const lineCount = group.lineCount ?? group.lines?.length ?? 0;
    const groupFrames = Math.round(lineCount * lineSlideIn * fps);
    frames += groupFrames;
    if (i < lineGroups.length - 1) frames += Math.round(pauseBetweenGroups * fps);
    return { index: i, lineCount, frames: groupFrames };
  });

  frames += Math.round(finalPause * fps);

  return { fps, totalFrames: frames, estimatedDuration: frames / fps, groups };
}
