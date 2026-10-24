import { interpolate } from 'remotion';

const MIN_FONT_SIZE = 11;
const LH_RATIO      = 0.62; // font size ÷ line height
const TAB_SIZE      = 4;

// Character widths in font-size units. CODE is slightly wider than the
// measured monospace advance so scale-to-fit absorbs variation across fonts.
const GUTTER_CHAR_RATIO = 0.60;
const CODE_CHAR_RATIO   = 0.63;

// Gutter padding in font-size units — the layout width budget and the
// rendered gutter in CodeLine both derive from these.
const GUTTER_PAD_LEFT  = 1.2;
const GUTTER_PAD_RIGHT = 2.5;

export function visualLen(str) {
  let col = 0;
  for (const ch of str) {
    if (ch === '\t') col += TAB_SIZE - (col % TAB_SIZE);
    else col++;
  }
  return col;
}

export function calculateLayout({ timeline, width, height, startLine, endLine }) {
  const vPad   = Math.round(height * 0.03);
  const hPad   = Math.round(width * 0.02);
  const availH = height - vPad * 2;
  const availW = width - hPad * 2;

  const gutterChars = String(endLine).length;
  const maxLineLen  = Math.max(1, ...timeline.map((t) => visualLen(t.content)));

  const firstLine = timeline.length > 0 ? Math.min(...timeline.map((t) => t.lineNum)) : startLine;
  const lastLine  = timeline.length > 0 ? Math.max(...timeline.map((t) => t.lineNum)) : endLine;
  const lineSpan  = lastLine - firstLine + 1;

  const maxFontH = lineSpan > 0
    ? Math.floor((availH * LH_RATIO) / lineSpan)
    : Math.floor((height / 28) * LH_RATIO);

  const widthUnits = maxLineLen * CODE_CHAR_RATIO
    + gutterChars * GUTTER_CHAR_RATIO
    + GUTTER_PAD_LEFT + GUTTER_PAD_RIGHT;
  const maxFontW = Math.floor(availW / widthUnits);

  const fontSize     = Math.max(MIN_FONT_SIZE, Math.min(maxFontH, maxFontW));
  const lineHeight   = Math.round(fontSize / LH_RATIO);
  const shouldScroll = maxFontH < MIN_FONT_SIZE;

  const gutterPadLeft  = Math.round(fontSize * GUTTER_PAD_LEFT);
  const gutterPadRight = Math.round(fontSize * GUTTER_PAD_RIGHT);
  const gutterPx       = Math.round(gutterChars * fontSize * GUTTER_CHAR_RATIO)
    + gutterPadLeft + gutterPadRight;

  const topOffset = shouldScroll
    ? vPad
    : Math.round((height - lineSpan * lineHeight) / 2);

  return {
    fontSize, lineHeight, topOffset, shouldScroll,
    gutterChars, gutterPx, gutterPadLeft, gutterPadRight,
    firstLine, lastLine, lineSpan,
    vPad, hPad, availH,
  };
}

export function calculateScrollY({
  shouldScroll, timeline, frame, firstLine, lineHeight, lineFrames, availH,
}) {
  if (!shouldScroll || timeline.length === 0) return 0;

  const visibleH = Math.floor(availH / lineHeight) * lineHeight;
  let activeEntry = timeline[0];
  let prevEntry   = timeline[0];
  for (const entry of timeline) {
    if (entry.startFrame <= frame) {
      prevEntry   = activeEntry;
      activeEntry = entry;
    }
  }

  const activePos = (activeEntry.lineNum - firstLine) * lineHeight;
  const prevPos   = (prevEntry.lineNum - firstLine) * lineHeight;
  if (activePos + lineHeight <= visibleH) return 0;

  const targetScroll = activePos - visibleH + 2 * lineHeight;
  const prevTarget   = Math.max(0, prevPos - visibleH + 2 * lineHeight);
  return interpolate(
    frame,
    [activeEntry.startFrame, activeEntry.startFrame + lineFrames],
    [prevTarget, targetScroll],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
}
