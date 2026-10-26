import { calculateTotalFrames, getRenderDims, normalizeTiming, QUALITY_DIMS } from './timing.js';

describe('calculateTotalFrames', () => {
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
    expect(result).toBe(30);
  });

  test('survives missing lineGroups and garbage timing values', () => {
    expect(calculateTotalFrames({ fps: 30 })).toBeGreaterThanOrEqual(30);
    const result = calculateTotalFrames({
      animationTiming: { initialDelay: 'abc', lineSlideIn: -5, finalPause: null },
      lineGroups: [{ lines: [1] }],
      fps: 30,
    });
    expect(Number.isFinite(result)).toBe(true);
    expect(result).toBeGreaterThanOrEqual(30);
  });
});

describe('normalizeTiming', () => {
  test('keeps valid values, replaces invalid with defaults', () => {
    expect(normalizeTiming({ initialDelay: 2, lineSlideIn: 'x', finalPause: -1 })).toEqual({
      initialDelay: 2,
      lineSlideIn: 0.8,
      pauseBetweenGroups: 0.6,
      finalPause: 3.0,
    });
  });
});

describe('getRenderDims', () => {
  test('landscape returns quality dims as-is', () => {
    expect(getRenderDims({ quality: 'fast', orientation: 'landscape' }))
      .toEqual({ width: 1280, height: 720, fps: 30 });
  });

  test('portrait swaps width and height', () => {
    expect(getRenderDims({ quality: 'standard', orientation: 'portrait' }))
      .toEqual({ width: 1080, height: 1920, fps: 60 });
  });

  test('unknown quality falls back to standard', () => {
    expect(getRenderDims({ quality: 'nope' })).toEqual(QUALITY_DIMS.standard);
    expect(getRenderDims()).toEqual(QUALITY_DIMS.standard);
  });
});
