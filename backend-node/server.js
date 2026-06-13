import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

import { initBundle, renderAnimation, OUTPUTS_DIR } from './render.js';
import { validateConfig } from './validate.js';
import { computeDryRun } from './dryRun.js';
import { detectLanguage, buildStructuredGroups } from './lineGroups.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: UPLOADS_DIR });

// In-memory progress store (keyed by taskId)
const progress = {};
function setProgress(taskId, data) { progress[taskId] = data; }

// ── Health ──────────────────────────────────────────────────────────────────

app.get('/', (_req, res) => res.json({ status: 'ok' }));

// ── Validate ────────────────────────────────────────────────────────────────

app.post('/api/validate', upload.single('file'), (req, res) => {
  const uploadPath = req.file?.path;
  try {
    const config      = JSON.parse(req.body.config);
    const fileContent = fs.readFileSync(uploadPath);
    fs.unlinkSync(uploadPath);
    const errors = validateConfig(fileContent, config);
    res.json({ valid: errors.length === 0, errors });
  } catch (e) {
    if (uploadPath) try { fs.unlinkSync(uploadPath); } catch (_) {}
    res.status(400).json({ valid: false, errors: [e.message] });
  }
});

// ── Dry run ─────────────────────────────────────────────────────────────────

app.post('/api/dry-run', upload.single('file'), (req, res) => {
  try {
    const config = JSON.parse(req.body.config);
    if (req.file) fs.unlinkSync(req.file.path);

    const structured = buildStructuredGroups(
      config.lineGroups, config.startLine, config.endLine
    );
    const timing = computeDryRun({
      lineGroups:      structured,
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
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Animate ─────────────────────────────────────────────────────────────────

app.post('/api/animate', upload.single('file'), async (req, res) => {
  let uploadPath;
  try {
    const config = JSON.parse(req.body.config);
    uploadPath = req.file.path;
    const fileContent = fs.readFileSync(uploadPath);

    const errors = validateConfig(fileContent, config);
    if (errors.length) {
      fs.unlinkSync(uploadPath);
      return res.status(422).json({ errors });
    }

    const taskId        = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const originalName  = req.file.originalname || 'animation';
    const stem          = path.basename(originalName, path.extname(originalName));
    const outputName    = `${stem}_${config.startLine}-${config.endLine}_${taskId}`;
    const videoFilename = `${outputName}.mp4`;

    setProgress(taskId, { progress: 0, status: 'queued' });
    res.json({ success: true, taskId });

    const lineGroups = buildStructuredGroups(
      config.lineGroups, config.startLine, config.endLine
    );
    const inputProps = {
      code:            fileContent.toString(),
      startLine:       config.startLine,
      endLine:         config.endLine,
      includeComments: config.includeComments !== false,
      lineGroups,
      syntaxColors:    config.syntaxColors    || {},
      animationTiming: config.animationTiming || {},
      animationType:   config.animationType   || 'slide_left',
      font:            config.font            || 'default',
      orientation:     config.orientation     || 'landscape',
      language:        detectLanguage(req.file.originalname),
    };

    // Delete upload immediately — code is never stored beyond this point
    try { fs.unlinkSync(uploadPath); } catch (_) {}
    uploadPath = null;

    setProgress(taskId, { progress: 5, status: 'rendering' });

    renderAnimation({
      inputProps,
      outputName,
      quality:    config.quality || 'standard',
      onProgress: (pct) => setProgress(taskId, { progress: pct, status: 'rendering' }),
    }).then((outputPath) => {
      setProgress(taskId, {
        progress: 100, status: 'complete',
        videoId: videoFilename, filename: videoFilename,
      });
    }).catch((err) => {
      setProgress(taskId, { progress: 0, status: 'error', error: err.message });
      console.error('[render error]', err.message);
    });

  } catch (e) {
    if (uploadPath) try { fs.unlinkSync(uploadPath); } catch (_) {}
    if (!res.headersSent) res.status(500).json({ error: e.message });
  }
});

// ── Progress polling ────────────────────────────────────────────────────────

app.get('/api/progress/:taskId', (req, res) => {
  const data = progress[req.params.taskId];
  if (!data) return res.status(404).json({ error: 'Task not found' });
  res.json(data);
});

// ── Progress SSE ────────────────────────────────────────────────────────────

app.get('/api/progress-stream/:taskId', (req, res) => {
  const { taskId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let interval;

  const sendSnapshot = () => {
    const data = progress[taskId] || { progress: 0, status: 'queued' };
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (data.status === 'complete' || data.status === 'error') {
      clearInterval(interval);
      res.end();
    }
  };

  interval = setInterval(sendSnapshot, 500);
  sendSnapshot();
  req.on('close', () => clearInterval(interval));
});

// ── Stream / Download ───────────────────────────────────────────────────────

app.get('/api/stream/:videoId', (req, res) => {
  const videoPath = path.join(OUTPUTS_DIR, req.params.videoId);
  if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'Not found' });
  res.setHeader('Content-Type', 'video/mp4');
  fs.createReadStream(videoPath).pipe(res);
});

// Delete the output file immediately after download
app.get('/api/download/:videoId', (req, res) => {
  const { videoId } = req.params;
  const videoPath   = path.join(OUTPUTS_DIR, videoId);
  if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'Not found' });
  res.download(videoPath, videoId, () => {
    try { fs.unlinkSync(videoPath); } catch (_) {}
  });
});

// ── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 8000;

if (process.env.NODE_ENV !== 'test') {
  initBundle().then(() => {
    app.listen(PORT, () =>
      console.log(`[server] Listening on http://localhost:${PORT}`)
    );
  }).catch((err) => {
    console.error('[server] Bundle failed:', err);
    process.exit(1);
  });
}
