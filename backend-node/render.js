import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const OUTPUTS_DIR = path.join(__dirname, 'outputs');
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

const QUALITY_DIMS = {
  fast:     { width: 854,  height: 480,  fps: 24 },
  standard: { width: 1280, height: 720,  fps: 30 },
  high:     { width: 1920, height: 1080, fps: 30 },
};

let bundleLocation = null;

export async function initBundle() {
  console.log('[renderer] Bundling Remotion compositions...');
  bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, '../renderer/index.jsx'),
    onProgress: (p) => process.stdout.write(`\r[renderer] Bundle: ${p}%  `),
  });
  process.stdout.write('\n');
  console.log('[renderer] Bundle ready.');
  return bundleLocation;
}

export async function renderAnimation({ inputProps, outputName, quality, onProgress }) {
  if (!bundleLocation) throw new Error('Bundle not initialized — call initBundle() first.');

  const outputPath = path.join(OUTPUTS_DIR, `${outputName}.mp4`);

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'CodeAnimation',
    inputProps: { ...inputProps, quality },
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: { ...inputProps, quality },
    concurrency: 2,
    onProgress: ({ progress }) => onProgress(Math.round(progress * 100)),
    overwrite: true,
  });

  return outputPath;
}
