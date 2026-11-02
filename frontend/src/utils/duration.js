// Video length in seconds: the same sum the server makes for a dry run
// (renderer/timing.js), without its per-frame rounding. Start delay, each
// group's entrance, the pauses between groups, and the hold at the end.
export function estimateDuration(groupCount, { initialDelay, lineSlideIn, pauseBetweenGroups, finalPause }) {
  const seconds = initialDelay + groupCount * lineSlideIn
    + Math.max(0, groupCount - 1) * pauseBetweenGroups + finalPause;
  return Math.max(1, seconds);
}

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
