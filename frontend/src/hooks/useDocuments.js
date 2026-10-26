import { useState, useCallback } from 'react';
import {
  DEFAULT_SYNTAX_COLORS,
  DEFAULT_TIMING_STR,
  DEFAULT_ANIMATION_TYPE,
  DEFAULT_FONT,
} from '../config/constants';

// Everything about a video that isn't tied to the file's lines. Values are
// only ever replaced, never mutated, so documents can share them.
const DEFAULT_SETTINGS = {
  includeComments: true,
  syntaxColors:    DEFAULT_SYNTAX_COLORS,
  orientation:     'landscape',
  quality:         'standard',
  animationTiming: DEFAULT_TIMING_STR,
  animationType:   DEFAULT_ANIMATION_TYPE,
  font:            DEFAULT_FONT,
};

// Stands in for the active document while no file is open.
const BLANK_DOCUMENT = {
  id: null, file: null, fileName: '', fileContent: '', totalLines: 0,
  startLine: 1, endLine: 1, lineGroups: [], currentGroup: '',
  ...DEFAULT_SETTINGS,
};

let nextId = 1;

async function readDocument(file, settings) {
  const fileContent = await file.text();
  const totalLines  = fileContent.split('\n').length;
  return {
    id: nextId++,
    file,
    fileName: file.name,
    fileContent,
    totalLines,
    startLine: 1,
    endLine: totalLines,
    lineGroups: [],
    currentGroup: '',
    ...settings,
  };
}

// The open files, one tab each, every one with its own lines and settings.
export function useDocuments() {
  const [docs,     setDocs]     = useState([]);
  const [activeId, setActiveId] = useState(null);
  const active = docs.find((d) => d.id === activeId) ?? BLANK_DOCUMENT;

  // New files start with the settings of the file being edited, so a batch
  // shares one look unless a tab is changed.
  const addFiles = useCallback(async (fileList) => {
    const files = [...(fileList ?? [])];
    if (files.length === 0) return;
    const settings = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((key) => [key, active[key]]));
    const added = await Promise.all(files.map((file) => readDocument(file, settings)));
    setDocs((prev) => [...prev, ...added]);
    setActiveId(added[0].id);
  }, [active]);

  const closeDocument = useCallback((id) => {
    const index = docs.findIndex((d) => d.id === id);
    const rest  = docs.filter((d) => d.id !== id);
    setDocs(rest);
    if (id === activeId) setActiveId(rest[Math.min(index, rest.length - 1)]?.id ?? null);
  }, [docs, activeId]);

  // Sets one field of the active document; value may be an updater function.
  const setField = useCallback((key, value) => {
    setDocs((prev) => prev.map((d) => (
      d.id === activeId
        ? { ...d, [key]: typeof value === 'function' ? value(d[key]) : value }
        : d
    )));
  }, [activeId]);

  const clear = useCallback(() => {
    setDocs([]);
    setActiveId(null);
  }, []);

  return { docs, active, activeId, setActiveId, addFiles, closeDocument, setField, clear };
}
