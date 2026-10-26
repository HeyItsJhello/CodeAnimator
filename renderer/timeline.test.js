import { buildTimeline, isCommentLine } from './timeline.js';

const CODE = 'a = 1\n# note\nb = 2\n// slash\nc = 3';

const base = {
  code: CODE,
  startLine: 1,
  endLine: 5,
  includeComments: true,
  language: 'python',
  initialFrames: 10,
  lineFrames: 20,
  pauseFrames: 5,
};

test('groups share a start frame; pauses only between groups', () => {
  const timeline = buildTimeline({
    ...base,
    lineGroups: [{ lines: [1, 2] }, { lines: [3] }],
  });
  expect(timeline.map((t) => t.startFrame)).toEqual([10, 10, 35]);
  expect(timeline.map((t) => t.content)).toEqual(['a = 1', '# note', 'b = 2']);
});

test('strips # comments for python when includeComments is false', () => {
  const timeline = buildTimeline({
    ...base,
    includeComments: false,
    lineGroups: [{ lines: [1, 2, 3, 4] }],
  });
  expect(timeline.map((t) => t.lineNum)).toEqual([1, 3, 4]);
});

test('strips // comments for C-like languages, keeps # lines', () => {
  const timeline = buildTimeline({
    ...base,
    includeComments: false,
    language: 'cpp',
    lineGroups: [{ lines: [2, 4] }],
  });
  expect(timeline.map((t) => t.lineNum)).toEqual([2]);
});

test('out-of-range lines render as empty content, never crash', () => {
  const timeline = buildTimeline({ ...base, lineGroups: [{ lines: [99] }] });
  expect(timeline).toEqual([{ lineNum: 99, content: '', startFrame: 10 }]);
});

test('tolerates missing code and malformed groups', () => {
  expect(buildTimeline({ ...base, code: undefined, lineGroups: [{ lines: [1] }] }))
    .toHaveLength(1);
  expect(buildTimeline({ ...base, lineGroups: undefined })).toEqual([]);
  expect(buildTimeline({ ...base, lineGroups: [{}] })).toEqual([]);
});

test('isCommentLine handles unknown language via // default', () => {
  expect(isCommentLine('  // x', 'rust')).toBe(true);
  expect(isCommentLine('# x', 'rust')).toBe(false);
  expect(isCommentLine('<!-- x', 'html')).toBe(true);
});
