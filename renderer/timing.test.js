import { calculateTotalFrames } from './timing.js';

test('sums initialDelay + per-group lines + pauses + finalPause', () => {
  const result = calculateTotalFrames({
    animationTiming: {
      initialDelay: 1,
      lineSlideIn: 0.8,
      pauseBetweenGroups: 0.6,
      finalPause: 3.0,
    },
    lineGroups: [
      { lines: [1, 2, 3], lineCount: 3 },
      { lines: [4, 5], lineCount: 2 },
    ],
    fps: 30,
  });
  // 30 + 24 + 18 + 24 + 90 = 186 (groups animate simultaneously, not per-line)
  expect(result).toBe(186);
});

test('enforces minimum of fps frames', () => {
  const result = calculateTotalFrames({
    animationTiming: { initialDelay: 0, lineSlideIn: 0, pauseBetweenGroups: 0, finalPause: 0 },
    lineGroups: [],
    fps: 30,
  });
  expect(result).toBe(30);
});

test('single group has no inter-group pause', () => {
  const result = calculateTotalFrames({
    animationTiming: { initialDelay: 0, lineSlideIn: 1, pauseBetweenGroups: 1, finalPause: 0 },
    lineGroups: [{ lines: [1, 2], lineCount: 2 }],
    fps: 30,
  });
  // 0 + 30 + 0 = 30 (one group, lineSlideIn=1s, fps=30; clamped to min=fps)
  expect(result).toBe(30);
});
