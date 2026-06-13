import { generateCacheKey } from './cache.js';

const BASE_CONFIG = {
  startLine: 1, endLine: 5, quality: 'standard',
  lineGroups: ['1 2 3'], animationType: 'slide_left',
  includeComments: true, orientation: 'landscape',
  syntaxColors: {}, animationTiming: {}, font: 'default',
};

test('same content + config produces same 16-char key', () => {
  const buf = Buffer.from('print("hello")');
  const k1 = generateCacheKey(buf, BASE_CONFIG);
  const k2 = generateCacheKey(buf, BASE_CONFIG);
  expect(k1).toBe(k2);
  expect(k1).toHaveLength(16);
});

test('different file content → different key', () => {
  const k1 = generateCacheKey(Buffer.from('foo'), BASE_CONFIG);
  const k2 = generateCacheKey(Buffer.from('bar'), BASE_CONFIG);
  expect(k1).not.toBe(k2);
});

test('different quality → different key', () => {
  const buf = Buffer.from('x');
  const k1 = generateCacheKey(buf, { ...BASE_CONFIG, quality: 'standard' });
  const k2 = generateCacheKey(buf, { ...BASE_CONFIG, quality: 'high' });
  expect(k1).not.toBe(k2);
});
