import { validateConfig } from './validate.js';

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
