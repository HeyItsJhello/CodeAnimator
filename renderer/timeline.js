const COMMENT_PREFIXES = {
  python:   ['#'],
  gdscript: ['#'],
  bash:     ['#'],
  ruby:     ['#'],
  php:      ['//', '#'],
  css:      ['/*'],
  html:     ['<!--'],
};
const DEFAULT_PREFIXES = ['//'];

export function isCommentLine(content, language) {
  const trimmed = content.trimStart();
  const prefixes = COMMENT_PREFIXES[language] ?? DEFAULT_PREFIXES;
  return prefixes.some((p) => trimmed.startsWith(p));
}

// Indentation every non-blank line starts with (spaces and tabs exactly as
// written, so mixed indentation is only removed where all lines agree).
function sharedIndent(contents) {
  let shared = null;
  for (const content of contents) {
    if (!content.trim()) continue;
    const indent = content.match(/^[ \t]*/)[0];
    if (shared === null) { shared = indent; continue; }
    let i = 0;
    while (i < shared.length && shared[i] === indent[i]) i++;
    shared = shared.slice(0, i);
    if (!shared) break;
  }
  return shared ?? '';
}

// Lines in reveal order, each with the frame it starts appearing on. The
// indentation shared by every shown line is removed, so a method taken from
// inside a class starts at the left edge instead of floating right.
export function buildTimeline({
  code, startLine, endLine, includeComments, language,
  lineGroups, initialFrames, lineFrames, pauseFrames,
}) {
  const codeLines = (code ?? '').split('\n').slice(startLine - 1, endLine);
  const groups = Array.isArray(lineGroups) ? lineGroups : [];
  const timeline = [];
  let currentFrame = initialFrames;

  for (let gi = 0; gi < groups.length; gi++) {
    const groupStartFrame = currentFrame;
    for (const lineNum of groups[gi]?.lines ?? []) {
      const content = codeLines[lineNum - startLine] ?? '';
      if (!includeComments && isCommentLine(content, language)) continue;
      timeline.push({ lineNum, content, startFrame: groupStartFrame });
    }
    currentFrame += lineFrames;
    if (gi < groups.length - 1) currentFrame += pauseFrames;
  }

  const indent = sharedIndent(timeline.map((t) => t.content));
  if (!indent) return timeline;
  return timeline.map((t) => ({ ...t, content: t.content.startsWith(indent) ? t.content.slice(indent.length) : '' }));
}
