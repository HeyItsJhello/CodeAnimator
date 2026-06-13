import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const OUTPUTS_DIR = path.join(__dirname, 'outputs');

let bundleLocation = null;

export async function initBundle() {
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
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
    crf: 1,           // near-lossless H264 — minimal DCT artifacts
    imageFormat: 'png', // lossless intermediate frames (vs default JPEG)
    onProgress: ({ progress }) => onProgress(Math.round(progress * 100)),
    overwrite: true,
  });

  return outputPath;
}
