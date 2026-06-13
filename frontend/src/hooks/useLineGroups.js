import { useState, useCallback } from 'react';
import { parseLineToken } from '../utils/functions';

export function useLineGroups(startLine, endLine) {
  const [lineGroups,   setLineGroups]   = useState([]);
  const [currentGroup, setCurrentGroup] = useState('');
  const [shownLines,   setShownLines]   = useState(new Set());

  const addLineGroup = useCallback(() => {
    if (!currentGroup.trim()) {
      const next = new Set(shownLines);
      for (let i = startLine; i <= endLine; i++) next.add(i);
      setLineGroups((prev) => [...prev, 'ALL_REMAINING']);
      setShownLines(next);
      return;
    }

    try {
      const parsed = currentGroup.trim().split(/\s+/).flatMap(parseLineToken);
      const valid  = parsed.filter((n) => {
        if (isNaN(n)) return false;
        if (shownLines.has(n)) { alert(`Warning: Line ${n} already shown`); return false; }
        if (n < startLine || n > endLine) { alert(`Warning: Line ${n} is outside range [${startLine}, ${endLine}]`); return false; }
        return true;
      });

      if (valid.length > 0) {
        setLineGroups((prev) => [...prev, valid]);
        setShownLines((prev) => { const s = new Set(prev); valid.forEach((l) => s.add(l)); return s; });
        setCurrentGroup('');
      }
    } catch {
      alert('Invalid input. Please enter space-separated numbers');
    }
  }, [currentGroup, shownLines, startLine, endLine]);

  const removeLineGroup = useCallback((index) => {
    const remaining = lineGroups.filter((_, i) => i !== index);
    setLineGroups(remaining);

    const next = new Set();
    remaining.forEach((g) => {
      if (Array.isArray(g)) g.forEach((l) => next.add(l));
      else if (typeof g === 'object' && g.type === 'SPLIT') next.add(g.line);
    });
    if (remaining.some((g) => g === 'ALL_REMAINING')) {
      for (let i = startLine; i <= endLine; i++) next.add(i);
    }
    setShownLines(next);
  }, [lineGroups, startLine, endLine]);

  // Returns true if the split was added, false if the line was invalid
  const addSplit = useCallback((lineNum) => {
    if (lineNum < startLine || lineNum > endLine) {
      alert(`Line ${lineNum} is outside range [${startLine}, ${endLine}]`);
      return false;
    }
    if (shownLines.has(lineNum)) {
      alert(`Line ${lineNum} has already been shown`);
      return false;
    }
    setLineGroups((prev) => [...prev, { type: 'SPLIT', line: lineNum }]);
    setShownLines((prev) => { const s = new Set(prev); s.add(lineNum); return s; });
    return true;
  }, [startLine, endLine, shownLines]);

  const clearAll = useCallback(() => {
    setLineGroups([]);
    setShownLines(new Set());
    setCurrentGroup('');
  }, []);

  return {
    lineGroups, currentGroup, shownLines,
    setCurrentGroup, addLineGroup, removeLineGroup, addSplit, clearAll,
  };
}
