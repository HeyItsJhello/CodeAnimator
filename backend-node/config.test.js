import { validateConfig, buildStructuredGroups, detectLanguage, computeDryRun, toRenderProps } from './config.js';

// ── validate

const GOOD = { startLine: 1, endLine: 3, lineGroups: ['1 2 3'], includeComments: true };

test('valid config returns empty array', () => {
  expect(validateConfig(Buffer.from('a\nb\nc'), GOOD)).toEqual([]);
});

test('startLine > endLine returns error mentioning startLine', () => {
  const errs = validateConfig(Buffer.from('a\nb'), { ...GOOD, startLine: 5, endLine: 2 });
  expect(errs.length).toBeGreaterThan(0);
  expect(errs[0]).toMatch(/startLine/i);
});

test('endLine beyond file length returns error mentioning endLine', () => {
  const errs = validateConfig(Buffer.from('a\nb'), { ...GOOD, endLine: 100 });
  expect(errs.length).toBeGreaterThan(0);
  expect(errs[0]).toMatch(/endLine/i);
});

test('empty lineGroups returns error', () => {
  const errs = validateConfig(Buffer.from('a\nb\nc'), { ...GOOD, lineGroups: [] });
  expect(errs.length).toBeGreaterThan(0);
  expect(errs[0]).toMatch(/lineGroups/i);
});

// ── lineGroups

describe('detectLanguage', () => {
  test('maps known extensions and defaults to python', () => {
    expect(detectLanguage('script.gd')).toBe('gdscript');
    expect(detectLanguage('main.cpp')).toBe('cpp');
    expect(detectLanguage('mystery.xyz')).toBe('python');
    expect(detectLanguage(undefined)).toBe('python');
  });
});

describe('buildStructuredGroups', () => {
  test('parses explicit line tokens within range, deduplicated', () => {
    expect(buildStructuredGroups(['1 2', '2 3'], 1, 5)).toEqual([
      { lines: [1, 2], lineCount: 2 },
      { lines: [3], lineCount: 1 },
    ]);
  });

  test('SPLIT token becomes its own single-line group', () => {
    expect(buildStructuredGroups(['1 2', 'SPLIT 4'], 1, 5)).toEqual([
      { lines: [1, 2], lineCount: 2 },
      { lines: [4], lineCount: 1 },
    ]);
  });

  test('SPLIT outside range or already consumed is dropped', () => {
    expect(buildStructuredGroups(['SPLIT 9'], 1, 5)).toEqual([]);
    expect(buildStructuredGroups(['4', 'SPLIT 4'], 1, 5)).toEqual([
      { lines: [4], lineCount: 1 },
    ]);
  });

  test('ALL_REMAINING collects unconsumed lines in range', () => {
    expect(buildStructuredGroups(['2', 'ALL_REMAINING'], 1, 4)).toEqual([
      { lines: [2], lineCount: 1 },
      { lines: [1, 3, 4], lineCount: 3 },
    ]);
  });

  test('ignores garbage input without crashing', () => {
    expect(buildStructuredGroups(['abc', null, 42, '0 -3 99'], 1, 5)).toEqual([]);
    expect(buildStructuredGroups('not-an-array', 1, 5)).toEqual([]);
    expect(buildStructuredGroups(undefined, 1, 5)).toEqual([]);
  });
});

// ── dryRun

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
  // fps=60: 60 + 48 + 36 + 48 + 180 = 372 (groups animate simultaneously, not per-line)
  expect(result.fps).toBe(60);
  expect(result.totalFrames).toBe(372);
  expect(result.estimatedDuration).toBeCloseTo(6.2, 0);
  expect(result.groups).toHaveLength(2);
  expect(result.groups[0].lineCount).toBe(3);
});

test('fast quality uses 30 fps', () => {
  const result = computeDryRun({
    lineGroups: [{ lines: [1], lineCount: 1 }],
    animationTiming: { initialDelay: 0, lineSlideIn: 1, pauseBetweenGroups: 0, finalPause: 0 },
    quality: 'fast',
  });
  expect(result.fps).toBe(30);
  expect(result.totalFrames).toBe(30);
});

// ── toRenderProps
test('toRenderProps applies defaults and structures groups', () => {
  const props = toRenderProps(Buffer.from('a\nb\nc'), { startLine: 1, endLine: 3, lineGroups: ['2', 'ALL_REMAINING'] }, 'x.gd');
  expect(props).toEqual({
    code: 'a\nb\nc', startLine: 1, endLine: 3, includeComments: true,
    lineGroups: [{ lines: [2], lineCount: 1 }, { lines: [1, 3], lineCount: 2 }],
    syntaxColors: {}, animationTiming: {}, animationType: 'slide_left',
    font: 'default', orientation: 'landscape', quality: 'standard', language: 'gdscript',
  });
});
