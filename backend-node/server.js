// HTTP API and video rendering. All request-config logic lives in config.js.
//
// Flow: POST /api/animate → render job starts in the background → client
// follows /api/progress-stream/:taskId → fetches /api/stream or /api/download
// → POST /api/videos/delete once the user is done with the videos.

import express from 'express';
import cors from 'cors';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

import { validateConfig, buildStructuredGroups, computeDryRun, toRenderProps } from './config.js';

const __dirname   = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');
const PORT        = process.env.PORT || 8000;

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(OUTPUTS_DIR, { recursive: true });

// ── Rendering ──────────────────────────────────────────────────────────────

// Remotion bundles the renderer once at startup; every render reuses it.
let bundleLocation = null;

async function renderVideo(inputProps, outputPath, onProgress) {
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'CodeAnimation',
    inputProps,
  });

  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
    concurrency: 2,
    crf: 1,             // near-lossless H264 — minimal DCT artifacts
    imageFormat: 'png', // lossless intermediate frames (vs default JPEG)
    onProgress: ({ progress }) => onProgress(Math.round(progress * 100)),
    overwrite: true,
  });
}

// ── Retention ──────────────────────────────────────────────────────────────
//
// Nothing user-provided outlives TTL_MS. Uploads are deleted as soon as they
// are read; a rendered video is deleted when the client says it is done with
// it (closing the preview or leaving the app), when its render fails, or by the sweep once it is TTL_MS old (covers abandoned renders and
// files left behind by a crash or restart).

const TTL_MS = 30 * 60 * 1000;

// taskId → { progress, status: 'rendering' | 'complete' | 'error', videoId?, error?, updatedAt }
const jobs = new Map();

const setJob = (taskId, data) => jobs.set(taskId, { ...data, updatedAt: Date.now() });

function sweep() {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, job] of jobs) if (job.updatedAt < cutoff) jobs.delete(id);
  for (const dir of [UPLOADS_DIR, OUTPUTS_DIR]) {
    for (const name of fs.readdirSync(dir)) {
      const file = path.join(dir, name);
      try {
        if (fs.statSync(file).mtimeMs < cutoff) fs.rmSync(file, { recursive: true, force: true });
      } catch {
        // Deleted concurrently (e.g. by a download) — nothing to do
      }
    }
  }
}

sweep();
setInterval(sweep, 60_000).unref();

// ── Request helpers ────────────────────────────────────────────────────────

const upload = multer({ dest: UPLOADS_DIR });

// Reads the uploaded file into memory, parses the JSON `config` field, and
// always deletes the temp upload. Either value is null when missing/invalid.
function readUpload(req) {
  let fileContent = null;
  let config = null;
  try {
    if (req.file) fileContent = fs.readFileSync(req.file.path);
    const parsed = JSON.parse(req.body?.config);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) config = parsed;
  } catch {
    config = null;
  } finally {
    if (req.file) fs.rmSync(req.file.path, { force: true });
  }
  return { fileContent, config };
}

// Path of a rendered video, or null if :videoId isn't a plain filename
// (blocks path traversal out of OUTPUTS_DIR).
function videoPath(videoId) {
  if (path.basename(videoId) !== videoId || videoId.startsWith('.')) return null;
  return path.join(OUTPUTS_DIR, videoId);
}

const MISSING_FILE   = 'A source file upload is required';
const INVALID_CONFIG = 'config must be a valid JSON object';

// ── Routes ─────────────────────────────────────────────────────────────────

export const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/validate', upload.single('file'), (req, res) => {
  const { fileContent, config } = readUpload(req);
  if (!fileContent || !config) {
    return res.status(400).json({ valid: false, errors: [!fileContent ? MISSING_FILE : INVALID_CONFIG] });
  }
  const errors = validateConfig(fileContent, config);
  res.json({ valid: errors.length === 0, errors });
});

app.post('/api/dry-run', upload.single('file'), (req, res) => {
  const { config } = readUpload(req);
  if (!config) return res.status(400).json({ error: INVALID_CONFIG });

  const timing = computeDryRun({
    lineGroups:      buildStructuredGroups(config.lineGroups, config.startLine, config.endLine),
    animationTiming: config.animationTiming,
    quality:         config.quality,
  });

  res.json({
    ...timing,
    quality:       config.quality       || 'standard',
    font:          config.font          || 'default',
    animationType: config.animationType || 'slide_left',
    orientation:   config.orientation   || 'landscape',
    lineRange:     [config.startLine, config.endLine],
  });
});

// Responds immediately with a taskId; the render continues in the background.
app.post('/api/animate', upload.single('file'), (req, res) => {
  const { fileContent, config } = readUpload(req);
  if (!fileContent) return res.status(400).json({ errors: [MISSING_FILE] });
  if (!config) return res.status(400).json({ errors: [INVALID_CONFIG] });

  const errors = validateConfig(fileContent, config);
  if (errors.length) return res.status(422).json({ errors });

  const filename = req.file.originalname || 'animation';
  const taskId   = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const stem     = path.basename(filename, path.extname(filename));
  const videoId  = `${stem}_${config.startLine}-${config.endLine}_${taskId}.mp4`;

  setJob(taskId, { progress: 5, status: 'rendering' });
  res.json({ success: true, taskId });
  console.log(`Render started ${taskId}`);

  const outputPath = path.join(OUTPUTS_DIR, videoId);
  renderVideo(
    toRenderProps(fileContent, config, filename),
    outputPath,
    (pct) => setJob(taskId, { progress: pct, status: 'rendering' }),
  ).then(() => {
    setJob(taskId, { progress: 100, status: 'complete', videoId });
    console.log(`Render complete ${taskId}`);
  }).catch((err) => {
    fs.rmSync(outputPath, { force: true });
    setJob(taskId, { progress: 0, status: 'error', error: err.message });
    console.error(`Render failed ${taskId}: ${err.message}`);
  });
});

// Server-sent progress events every 500ms. Ends on complete/error, or after
// ~10s if the task never appears (otherwise a bad taskId would poll forever).
app.get('/api/progress-stream/:taskId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let unknownPolls = 0;
  const send = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  const end = (data) => {
    send(data);
    clearInterval(interval);
    res.end();
  };

  const tick = () => {
    const job = jobs.get(req.params.taskId);
    if (!job) {
      if (++unknownPolls >= 20) return end({ progress: 0, status: 'error', error: 'Task not found' });
      return send({ progress: 0, status: 'queued' });
    }
    unknownPolls = 0;
    const { updatedAt: _, ...data } = job;
    if (data.status === 'complete' || data.status === 'error') return end(data);
    send(data);
  };

  const interval = setInterval(tick, 500);
  tick();
  req.on('close', () => clearInterval(interval));
});

app.get('/api/stream/:videoId', (req, res) => {
  const file = videoPath(req.params.videoId);
  if (!file) return res.status(400).json({ error: 'Invalid filename' });
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(file); // handles Range requests, which <video> seeking (and Safari) needs
});

// Can be downloaded any number of times until deleted below.
app.get('/api/download/:videoId', (req, res) => {
  const file = videoPath(req.params.videoId);
  if (!file) return res.status(400).json({ error: 'Invalid filename' });
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.download(file, req.params.videoId);
});

// Body: JSON array of videoIds. Sent as text/plain so navigator.sendBeacon can
// deliver it while the page is closing.
app.post('/api/videos/delete', express.text({ type: '*/*' }), (req, res) => {
  let videoIds;
  try {
    videoIds = JSON.parse(req.body);
  } catch {
    return res.status(400).json({ error: 'Expected a JSON array of video ids' });
  }
  if (!Array.isArray(videoIds)) return res.status(400).json({ error: 'Expected a JSON array of video ids' });
  for (const id of videoIds) {
    const file = typeof id === 'string' && videoPath(id);
    if (file) fs.rmSync(file, { force: true });
  }
  res.status(204).end();
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  if (!res.headersSent) res.status(err.status || 500).json({ error: err.message });
});

// ── Startup ────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'test') {
  console.log('Bundling Remotion compositions...');
  bundle({ entryPoint: path.resolve(__dirname, '../renderer/index.jsx') })
    .then((location) => {
      bundleLocation = location;
      app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
    })
    .catch((err) => {
      console.error(`Bundle failed: ${err.message}`);
      process.exit(1);
    });
}
