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

  return timeline;
}
