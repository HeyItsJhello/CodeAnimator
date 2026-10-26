import { useCallback, useMemo } from 'react';

// A group is one of: number[] (explicit lines), { type: 'SPLIT', line },
// or 'ALL_REMAINING' (every line in range not claimed by an earlier group).

const MAX_RANGE_SPAN = 10000;

// "7" → [7]; "3-6" → [3, 4, 5, 6]; anything unparseable → [].
function parseLineToken(token) {
  const range = token.match(/^(\d+)-(\d+)$/);
  if (range) {
    const min = Math.min(Number(range[1]), Number(range[2]));
    const max = Math.max(Number(range[1]), Number(range[2]));
    if (max - min > MAX_RANGE_SPAN) return [];
    return Array.from({ length: max - min + 1 }, (_, i) => min + i);
  }
  const num = Number.parseInt(token, 10);
  return Number.isNaN(num) ? [] : [num];
}

// line number → [group number (1-based)] for every line a group shows.
function buildLineGroupMap(lineGroups, startLine, endLine) {
  const map = new Map();
  const claim = (ln, groupNum) => {
    if (ln >= startLine && ln <= endLine && !map.has(ln)) map.set(ln, [groupNum]);
  };

  lineGroups.forEach((group, idx) => {
    if (group === 'ALL_REMAINING') {
      for (let ln = startLine; ln <= endLine; ln++) claim(ln, idx + 1);
    } else if (group.type === 'SPLIT') {
      claim(group.line, idx + 1);
    } else {
      group.forEach((ln) => claim(ln, idx + 1));
    }
  });
  return map;
}

// Wire format expected by the backend's buildStructuredGroups.
export function toApiGroups(lineGroups) {
  return lineGroups.map((group) => {
    if (group === 'ALL_REMAINING') return 'ALL_REMAINING';
    if (group.type === 'SPLIT') return `SPLIT ${group.line}`;
    return group.join(' ');
  });
}

// Group editing for one document; its state lives in the document.
export function useLineGroups({ lineGroups, currentGroup, startLine, endLine }, setLineGroups, setCurrentGroup) {
  const lineGroupMap = useMemo(
    () => buildLineGroupMap(lineGroups, startLine, endLine),
    [lineGroups, startLine, endLine],
  );

  const addLineGroup = useCallback(() => {
    const input = currentGroup.trim();
    if (!input) {
      setLineGroups((prev) => [...prev, 'ALL_REMAINING']);
      return;
    }

    const parsed = [...new Set(input.split(/\s+/).flatMap(parseLineToken))];
    if (parsed.length === 0) {
      alert('Invalid input. Enter line numbers or ranges, e.g. "3 5-7"');
      return;
    }

    const valid    = [];
    const problems = [];
    for (const n of parsed) {
      if (lineGroupMap.has(n)) problems.push(`line ${n} is already shown`);
      else if (n < startLine || n > endLine) problems.push(`line ${n} is outside range [${startLine}, ${endLine}]`);
      else valid.push(n);
    }
    if (problems.length > 0) alert(`Skipped: ${problems.join('; ')}`);
    if (valid.length === 0) return;

    setLineGroups((prev) => [...prev, valid]);
    setCurrentGroup('');
  }, [currentGroup, lineGroupMap, startLine, endLine, setLineGroups, setCurrentGroup]);

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
    lineGroupMap, addLineGroup, removeLineGroup, addSplit, clearAll,
  };
}
