import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(__dirname, 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

export function generateCacheKey(fileContent, config) {
  const sortedColors = config.syntaxColors
    ? JSON.stringify(config.syntaxColors, Object.keys(config.syntaxColors || {}).sort())
    : '{}';
  const sortedTiming = config.animationTiming
    ? JSON.stringify(config.animationTiming, Object.keys(config.animationTiming || {}).sort())
    : '{}';
  const normalized = {
    contentHash: crypto.createHash('md5').update(fileContent).digest('hex'),
    startLine: config.startLine,
    endLine: config.endLine,
    includeComments: config.includeComments,
    orientation: config.orientation || 'landscape',
    quality: config.quality || 'standard',
    lineGroups: [...(config.lineGroups || [])].sort(),
    syntaxColors: sortedColors,
    animationTiming: sortedTiming,
    animationType: config.animationType || 'slide_left',
    font: config.font || 'default',
  };
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
    .slice(0, 16);
}

export function getCachedVideo(cacheKey) {
  const p = path.join(CACHE_DIR, `${cacheKey}.mp4`);
  return fs.existsSync(p) ? p : null;
}

export function saveToCache(cacheKey, sourcePath) {
  fs.copyFileSync(sourcePath, path.join(CACHE_DIR, `${cacheKey}.mp4`));
}
