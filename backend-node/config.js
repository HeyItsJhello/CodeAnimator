// Pure request-config logic: no I/O. Everything here is covered by config.test.js.
//
// A request carries a source file plus a JSON `config`:
//   { startLine, endLine, lineGroups, includeComments, syntaxColors,
//     animationTiming, animationType, font, orientation, quality }

import { QUALITY_DIMS, calculateTotalFrames, normalizeTiming } from '../renderer/timing.js';

// ── Validation ─────────────────────────────────────────────────────────────

// Returns a list of human-readable errors; empty means valid.
export function validateConfig(fileContent, config) {
  const errors = [];
  const totalLines = fileContent.toString().split('\n').length;
  const startLine  = Number(config.startLine);
  const endLine    = Number(config.endLine);

  if (!Number.isInteger(startLine) || startLine < 1)
    errors.push('startLine must be a positive integer');
  if (!Number.isInteger(endLine) || endLine < 1)
    errors.push('endLine must be a positive integer');
  if (errors.length === 0 && startLine > endLine)
    errors.push(`startLine (${startLine}) must be ≤ endLine (${endLine})`);
  if (errors.length === 0 && endLine > totalLines)
    errors.push(`endLine (${endLine}) exceeds file length (${totalLines} lines)`);
  if (!Array.isArray(config.lineGroups) || config.lineGroups.length === 0)
    errors.push('lineGroups must be a non-empty array');

  return errors;
}

// ── Line groups ────────────────────────────────────────────────────────────

// Each group token is one of:
//   "3 4 5"         explicit lines
//   "SPLIT 7"       a single line as its own group
//   "ALL_REMAINING" every line in range not claimed by an earlier group
// A line belongs to the first group that claims it; out-of-range lines are dropped.
export function buildStructuredGroups(lineGroupStrings, startLine, endLine) {
  const consumed = new Set();
  const groups   = [];

  const inRange = (n) => Number.isInteger(n) && n >= startLine && n <= endLine;

  for (const token of Array.isArray(lineGroupStrings) ? lineGroupStrings : []) {
    if (typeof token !== 'string') continue;

    let lines;
    if (token === 'ALL_REMAINING') {
      lines = [];
      for (let i = startLine; i <= endLine; i++) {
        if (!consumed.has(i)) lines.push(i);
      }
    } else if (token.startsWith('SPLIT ')) {
      const n = Number(token.slice('SPLIT '.length));
      lines = inRange(n) && !consumed.has(n) ? [n] : [];
    } else {
      lines = token
        .split(' ')
        .map(Number)
        .filter((n) => inRange(n) && !consumed.has(n));
    }

    for (const ln of lines) consumed.add(ln);
    if (lines.length > 0) groups.push({ lines, lineCount: lines.length });
  }

  return groups;
}

// ── Render props ───────────────────────────────────────────────────────────

// Values are Prism language ids; renderer/syntax.js registers the ones
// prism-react-renderer doesn't bundle.
const EXT_TO_LANG = {
  py: 'python', gd: 'gdscript', js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript', jsx: 'jsx', tsx: 'tsx', rs: 'rust', go: 'go',
  cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', h: 'cpp', c: 'c',
  java: 'java', cs: 'csharp', rb: 'ruby', php: 'php', swift: 'swift',
  kt: 'kotlin', kts: 'kotlin', css: 'css', html: 'html', json: 'json', sh: 'bash',
};

export function detectLanguage(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  return EXT_TO_LANG[ext] || 'python';
}

// Props for the Remotion `CodeAnimation` composition, with defaults applied.
export function toRenderProps(fileContent, config, filename) {
  return {
    code:            fileContent.toString(),
    startLine:       config.startLine,
    endLine:         config.endLine,
    includeComments: config.includeComments !== false,
    lineGroups:      buildStructuredGroups(config.lineGroups, config.startLine, config.endLine),
    syntaxColors:    config.syntaxColors    || {},
    animationTiming: config.animationTiming || {},
    animationType:   config.animationType   || 'slide_left',
    font:            config.font            || 'default',
    orientation:     config.orientation     || 'landscape',
    quality:         config.quality         || 'standard',
    language:        detectLanguage(filename),
  };
}

// ── Dry run ────────────────────────────────────────────────────────────────

// Frame counts and duration for a render, without rendering. All groups share
// the same reveal duration; lines within a group animate simultaneously.
export function computeDryRun({ lineGroups, animationTiming, quality }) {
  const fps = (QUALITY_DIMS[quality] ?? QUALITY_DIMS.standard).fps;
  const { lineSlideIn } = normalizeTiming(animationTiming);

  const totalFrames = calculateTotalFrames({ animationTiming, lineGroups, fps });
  const groupFrames = Math.round(lineSlideIn * fps);

  const groups = (lineGroups || []).map((group, i) => ({
    index:        i,
    lineCount:    group.lineCount ?? group.lines?.length ?? 0,
    lines:        group.lines || [],
    frames:       groupFrames,
    durationSecs: Math.round((groupFrames / fps) * 100) / 100,
  }));

  return { fps, totalFrames, estimatedDuration: totalFrames / fps, groups };
}
