import { useCallback, useMemo } from 'react';

// A group (one row in the groups list) is one of:
//   number[]                          explicit lines, revealed together
//   { type: 'SPLIT', line }           a single line
//   { type: 'SEQUENCE', groups }      from "1_50": number[][], each revealed in turn
//   'ALL_REMAINING'                   every line in range not claimed by an earlier group

const MAX_RANGE_SPAN = 10000;

// Every line from a to b (either order); [] when the span is unreasonably long.
function lineSpan(a, b) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  if (max - min > MAX_RANGE_SPAN) return [];
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

// "7" → [7]; "3-6" → [3, 4, 5, 6]; anything unparseable → [].
function parseLineToken(token) {
  const range = token.match(/^(\d+)-(\d+)$/);
  if (range) return lineSpan(Number(range[1]), Number(range[2]));
  const num = Number.parseInt(token, 10);
  return Number.isNaN(num) ? [] : [num];
}

// One group per non-blank line, in order. Blank lines join the next line's
// group (or the last group, at the end) so the video's line numbers stay continuous.
function lineByLine(lineNums, codeLines) {
  const groups = [];
  let blanks = [];
  for (const n of lineNums) {
    if (!codeLines[n - 1]?.trim()) { blanks.push(n); continue; }
    groups.push([...blanks, n]);
    blanks = [];
  }
  if (blanks.length > 0 && groups.length > 0) groups.at(-1).push(...blanks);
  return groups;
}

// The group field → a list of groups, or null if a token can't be read.
// "3 5-7" is one group; "1_50" is a sequence of each non-blank line of 1–50.
// Tokens are read in order, so "1-3 5_9" is lines 1–3 together, then 5–9 one by one.
function parseGroupInput(input, codeLines) {
  const groups = [];
  let pending = [];
  const flush = () => {
    if (pending.length > 0) groups.push(pending);
    pending = [];
  };
  for (const token of input.split(/\s+/)) {
    const sequence = token.match(/^(\d+)_(\d+)$/);
    if (sequence) {
      const lines = lineSpan(Number(sequence[1]), Number(sequence[2]));
      if (lines.length === 0) return null;
      flush();
      const steps = lineByLine(lines, codeLines);
      if (steps.length > 0) groups.push({ type: 'SEQUENCE', groups: steps });
      continue;
    }
    const lines = parseLineToken(token);
    if (lines.length === 0) return null;
    pending.push(...lines);
  }
  flush();
  return groups;
}

// The line lists a group reveals, one per step of the video.
function revealSteps(group, startLine, endLine) {
  if (group === 'ALL_REMAINING') return [lineSpan(startLine, endLine)];
  if (group.type === 'SPLIT')    return [[group.line]];
  if (group.type === 'SEQUENCE') return group.groups;
  return [group];
}

// line number → [row number (1-based)] for every line a group shows, and how
// many steps the video has (steps that end up showing no line are dropped,
// as the server does).
function buildLineGroupMap(lineGroups, startLine, endLine) {
  const map = new Map();
  let stepCount = 0;
  lineGroups.forEach((group, idx) => {
    for (const step of revealSteps(group, startLine, endLine)) {
      let claimed = false;
      for (const ln of step) {
        if (ln >= startLine && ln <= endLine && !map.has(ln)) {
          map.set(ln, [idx + 1]);
          claimed = true;
        }
      }
      if (claimed) stepCount++;
    }
  });
  return { map, stepCount };
}

// Wire format expected by the backend's buildStructuredGroups.
export function toApiGroups(lineGroups) {
  return lineGroups.flatMap((group) => {
    if (group === 'ALL_REMAINING') return ['ALL_REMAINING'];
    if (group.type === 'SPLIT')    return [`SPLIT ${group.line}`];
    if (group.type === 'SEQUENCE') return group.groups.map((step) => step.join(' '));
    return [group.join(' ')];
  });
}

// How much two lines still look alike: the longer of their shared start and shared end.
function overlap(x, y) {
  let start = 0;
  while (start < x.length && start < y.length && x[start] === y[start]) start++;
  let end = 0;
  while (end < x.length && end < y.length && x[x.length - 1 - end] === y[y.length - 1 - end]) end++;
  return Math.max(start, end);
}

// How line numbers move when the code changes from oldText to newText.
// Lines before and after the edited block are unchanged, so they keep (or
// shift with) their place. Inside the block, a line keeps its place if the
// block's length didn't change; otherwise it follows the new line it looks
// most like, so pressing Enter at the start of a line moves that line down
// rather than leaving its group on the new empty line above it.
// Returns a function: old line → new line, or null if it's gone.
export function lineMap(oldText, newText) {
  const a = oldText.split('\n');
  const b = newText.split('\n');
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < a.length - prefix && suffix < b.length - prefix
    && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
  ) suffix++;
  const oldEditEnd = a.length - suffix;
  const newEditEnd = b.length - suffix;

  // Edited block, old line → new line, in order (lines joined by a deleted
  // line break may land on the same new line).
  const edited = new Map();
  if (oldEditEnd - prefix === newEditEnd - prefix) {
    for (let n = prefix + 1; n <= oldEditEnd; n++) edited.set(n, n);
  } else {
    let from = prefix + 1;
    for (let n = prefix + 1; n <= oldEditEnd; n++) {
      let best = null;
      let bestScore = 0;
      for (let m = from; m <= newEditEnd; m++) {
        const score = overlap(a[n - 1], b[m - 1]);
        if (score > bestScore) { best = m; bestScore = score; }
      }
      edited.set(n, best);
      if (best !== null) from = best;
    }
  }

  return (n) => {
    if (n <= prefix)    return n;
    if (n > oldEditEnd) return n + (b.length - a.length);
    return edited.get(n) ?? null;
  };
}

// Groups after an edit: every line moved with mapLine, lines that are gone
// dropped, and groups left empty removed.
export function remapGroups(lineGroups, mapLine) {
  const mapLines = (lines) => lines.map(mapLine).filter((n) => n !== null);
  return lineGroups.flatMap((group) => {
    if (group === 'ALL_REMAINING') return [group];
    if (group.type === 'SPLIT') {
      const line = mapLine(group.line);
      return line === null ? [] : [{ ...group, line }];
    }
    if (group.type === 'SEQUENCE') {
      const steps = group.groups.map(mapLines).filter((step) => step.length > 0);
      return steps.length > 0 ? [{ ...group, groups: steps }] : [];
    }
    const lines = mapLines(group);
    return lines.length > 0 ? [lines] : [];
  });
}

// Group editing for one document; its state lives in the document.
export function useLineGroups(
  { fileContent, lineGroups, currentGroup, startLine, endLine }, setLineGroups, setCurrentGroup,
) {
  const { map: lineGroupMap, stepCount } = useMemo(
    () => buildLineGroupMap(lineGroups, startLine, endLine),
    [lineGroups, startLine, endLine],
  );
  const codeLines = useMemo(() => fileContent.split('\n'), [fileContent]);

  // Appends groups, dropping lines that are out of range or already shown.
  // Returns whether anything was added; `quiet` skips the alert about dropped lines.
  const addGroups = useCallback((groups, { quiet = false } = {}) => {
    const claimed  = new Set(lineGroupMap.keys());
    const problems = [];
    const keep = (lines) => {
      const valid = [];
      for (const n of new Set(lines)) {
        if (claimed.has(n)) problems.push(`line ${n} is already shown`);
        else if (n < startLine || n > endLine) problems.push(`line ${n} is outside range [${startLine}, ${endLine}]`);
        else { valid.push(n); claimed.add(n); }
      }
      return valid;
    };
    const added = groups.flatMap((group) => {
      if (group.type === 'SEQUENCE') {
        const steps = group.groups.map(keep).filter((step) => step.length > 0);
        return steps.length > 0 ? [{ ...group, groups: steps }] : [];
      }
      const lines = keep(group);
      return lines.length > 0 ? [lines] : [];
    });
    if (problems.length > 0 && !quiet) alert(`Skipped: ${problems.join('; ')}`);
    if (added.length > 0) setLineGroups((prev) => [...prev, ...added]);
    return added.length > 0;
  }, [lineGroupMap, startLine, endLine, setLineGroups]);

  const addLineGroup = useCallback(() => {
    const input = currentGroup.trim();
    if (!input) {
      setLineGroups((prev) => [...prev, 'ALL_REMAINING']);
      return;
    }

    const groups = parseGroupInput(input, codeLines);
    if (!groups) {
      alert('Invalid input. Enter line numbers or ranges, e.g. "3 5-7", or "1_20" for one line at a time');
      return;
    }
    if (groups.length === 0) {
      alert('Those lines are all blank');
      return;
    }
    if (addGroups(groups)) setCurrentGroup('');
  }, [currentGroup, codeLines, addGroups, setLineGroups, setCurrentGroup]);

  // Dragging across line numbers: the lines in between become one group.
  const addRange = useCallback((from, to) => {
    addGroups([lineSpan(from, to)], { quiet: true });
  }, [addGroups]);

  const removeLineGroup = useCallback((index) => {
    setLineGroups((prev) => prev.filter((_, i) => i !== index));
  }, [setLineGroups]);

  // Returns true if the split was added, false if the line was invalid.
  const addSplit = useCallback((lineNum) => {
    if (lineNum < startLine || lineNum > endLine) {
      alert(`Line ${lineNum} is outside range [${startLine}, ${endLine}]`);
      return false;
    }
    if (lineGroupMap.has(lineNum)) {
      alert(`Line ${lineNum} has already been shown`);
      return false;
    }
    setLineGroups((prev) => [...prev, { type: 'SPLIT', line: lineNum }]);
    return true;
  }, [startLine, endLine, lineGroupMap, setLineGroups]);

  const clearAll = useCallback(() => {
    setLineGroups([]);
    setCurrentGroup('');
  }, [setLineGroups, setCurrentGroup]);

  return {
    lineGroupMap, stepCount, addLineGroup, addRange, removeLineGroup, addSplit, clearAll,
  };
}
