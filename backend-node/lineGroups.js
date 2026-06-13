const EXT_TO_LANG = {
  py: 'python', gd: 'gdscript', js: 'javascript', ts: 'typescript',
  jsx: 'jsx', tsx: 'tsx', rs: 'rust', go: 'go', cpp: 'cpp', c: 'c',
  java: 'java', cs: 'csharp', rb: 'ruby', php: 'php', swift: 'swift',
  kt: 'kotlin', css: 'css', html: 'html', json: 'json', sh: 'bash',
};

export function detectLanguage(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  return EXT_TO_LANG[ext] || 'python';
}

export function buildStructuredGroups(lineGroupStrings, startLine, endLine) {
  const consumed = new Set();
  const groups   = [];

  for (const token of lineGroupStrings || []) {
    if (token.startsWith('SPLIT')) continue;

    let lines;
    if (token === 'ALL_REMAINING') {
      lines = [];
      for (let i = startLine; i <= endLine; i++) {
        if (!consumed.has(i)) lines.push(i);
      }
    } else {
      lines = token
        .split(' ')
        .map(Number)
        .filter((n) => !isNaN(n) && n >= startLine && n <= endLine && !consumed.has(n));
    }

    for (const ln of lines) consumed.add(ln);
    if (lines.length > 0) groups.push({ lines, lineCount: lines.length });
  }

  return groups;
}
