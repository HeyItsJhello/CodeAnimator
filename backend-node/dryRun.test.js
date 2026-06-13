import { computeDryRun } from './dryRun.js';

test('computes frames and duration from timing config', () => {
  const result = computeDryRun({
    lineGroups: [
      { lines: [1, 2, 3], lineCount: 3 },
      { lines: [4, 5], lineCount: 2 },
    ],
    animationTiming: {
      initialDelay: 1, lineSlideIn: 0.8,
      pauseBetweenGroups: 0.6, finalPause: 3.0,
    },
    quality: 'standard',
  });
  // 30 + 3*24 + 18 + 2*24 + 90 = 258
  expect(result.fps).toBe(30);
  expect(result.totalFrames).toBe(258);
  expect(result.estimatedDuration).toBeCloseTo(8.6, 0);
  expect(result.groups).toHaveLength(2);
  expect(result.groups[0].lineCount).toBe(3);
});

test('fast quality uses 24 fps', () => {
  const result = computeDryRun({
    lineGroups: [{ lines: [1], lineCount: 1 }],
    animationTiming: { initialDelay: 0, lineSlideIn: 1, pauseBetweenGroups: 0, finalPause: 0 },
    quality: 'fast',
  });
  expect(result.fps).toBe(24);
  expect(result.totalFrames).toBe(24);
});
