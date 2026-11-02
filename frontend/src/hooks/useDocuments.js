import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DEFAULT_SYNTAX_COLORS,
  DEFAULT_TIMING_STR,
  DEFAULT_ANIMATION_TYPE,
  DEFAULT_FONT,
} from '../config/constants';
import { lineMap, remapGroups } from './useLineGroups';

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
  id: null, sourceId: null, fileName: '', fileContent: '', totalLines: 0,
  startLine: 1, endLine: 1, lineGroups: [], currentGroup: '',
  ...DEFAULT_SETTINGS,
};

let nextId = 1;

// Open tabs are kept in this browser so they survive a refresh.
const STORAGE_KEY = 'codeAnimator.documents';

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved?.docs)) {
      // Older saves may lack settings added since; defaults fill them in.
      const docs = saved.docs.map((d) => ({ ...BLANK_DOCUMENT, ...d }));
      nextId = Math.max(nextId, ...docs.map((d) => d.id + 1));
      const activeId = docs.some((d) => d.id === saved.activeId) ? saved.activeId : (docs[0]?.id ?? null);
      return { docs, activeId };
    }
  } catch {
    // Unreadable or blocked storage: start empty.
  }
  return { docs: [], activeId: null };
}

async function readDocument(file, settings) {
  const fileContent = await file.text();
  const totalLines  = fileContent.split('\n').length;
  const id = nextId++;
  return {
    id,
    sourceId: id, // shared by every section (tab) of this upload
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

// Tab and video name. A file open in several tabs (one per section) gets
// each tab's line range added so the videos can be told apart.
export function documentLabel(doc, docs) {
  const sections = docs.filter((d) => d.sourceId === doc.sourceId).length;
  return sections > 1 ? `${doc.fileName} · ${doc.startLine}–${doc.endLine}` : doc.fileName;
}

// Name a downloaded video gets: the file's name, plus the lines when the
// video shows only part of the file ("player_lines-12-40.mp4").
export function videoFileName(doc) {
  const stem  = doc.fileName.replace(/\.[^.]+$/, '') || 'animation';
  const whole = doc.startLine === 1 && doc.endLine === doc.totalLines;
  return whole ? `${stem}.mp4` : `${stem}_lines-${doc.startLine}-${doc.endLine}.mp4`;
}

// Fields edited by typing or dragging, where each change is tiny: changes in
// quick succession become one undo step. The group field isn't undoable at
// all; its text box has its own undo.
const TYPED_FIELDS = new Set(['fileContent', 'startLine', 'endLine', 'animationTiming', 'syntaxColors']);
const NOT_UNDOABLE = new Set(['currentGroup']);
const MERGE_MS     = 1000;
const MAX_HISTORY  = 100;

// The open files, one tab per video. A file can be open in several tabs,
// each covering its own section of lines. Every change to them can be undone.
export function useDocuments() {
  const [saved]                 = useState(loadSaved);
  const [docs,     setDocs]     = useState(saved.docs);
  const [activeId, setActiveId] = useState(saved.activeId);
  const active = docs.find((d) => d.id === activeId) ?? BLANK_DOCUMENT;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ docs, activeId }));
    } catch {
      // Storage full or blocked: tabs just won't survive a refresh.
    }
  }, [docs, activeId]);

  // Snapshots of { docs, activeId } before each change. `latest` is the state
  // as of this render, so several changes in one event record it only once.
  const history = useRef({ past: [], future: [], last: null });
  const latest  = useRef({ docs, activeId });
  latest.current = { docs, activeId };

  // Call before changing docs. `mergeKey` joins this change to the previous
  // one with the same key if it came within MERGE_MS.
  const record = useCallback((mergeKey = null) => {
    const h   = history.current;
    const now = Date.now();
    const merge = mergeKey && h.last?.key === mergeKey && now - h.last.at < MERGE_MS;
    if (!merge && h.past.at(-1)?.docs !== latest.current.docs) {
      h.past.push(latest.current);
      if (h.past.length > MAX_HISTORY) h.past.shift();
    }
    h.last   = { key: mergeKey, at: now };
    h.future = [];
  }, []);

  const step = useCallback((from, to) => {
    const h = history.current;
    const snapshot = h[from].pop();
    if (!snapshot) return;
    h[to].push(latest.current);
    h.last = null;
    setDocs(snapshot.docs);
    setActiveId(snapshot.activeId);
  }, []);
  const undo = useCallback(() => step('past', 'future'), [step]);
  const redo = useCallback(() => step('future', 'past'), [step]);

  // New files start with the settings of the file being edited, so a batch
  // shares one look unless a tab is changed.
  const addFiles = useCallback(async (fileList) => {
    const files = [...(fileList ?? [])];
    if (files.length === 0) return;
    const settings = Object.fromEntries(Object.keys(DEFAULT_SETTINGS).map((key) => [key, active[key]]));
    const added = await Promise.all(files.map((file) => readDocument(file, settings)));
    record();
    setDocs((prev) => [...prev, ...added]);
    setActiveId(added[0].id);
  }, [active, record]);

  // Opens another tab of the active file, for a separate video of the lines
  // after the active tab's section. Settings carry over; groups start empty.
  const addSection = useCallback(() => {
    if (!active.id) return;
    const startLine = active.endLine < active.totalLines ? active.endLine + 1 : 1;
    const section = {
      ...active, id: nextId++, startLine, endLine: active.totalLines, lineGroups: [], currentGroup: '',
    };
    record();
    setDocs((prev) => {
      const index = prev.findIndex((d) => d.id === active.id);
      return [...prev.slice(0, index + 1), section, ...prev.slice(index + 1)];
    });
    setActiveId(section.id);
  }, [active, record]);

  const closeDocument = useCallback((id) => {
    const index = docs.findIndex((d) => d.id === id);
    const rest  = docs.filter((d) => d.id !== id);
    record();
    setDocs(rest);
    if (id === activeId) setActiveId(rest[Math.min(index, rest.length - 1)]?.id ?? null);
  }, [docs, activeId, record]);

  // Sets one field of the active document; value may be an updater function.
  const setField = useCallback((key, value) => {
    if (!NOT_UNDOABLE.has(key)) record(TYPED_FIELDS.has(key) ? `${activeId}:${key}` : null);
    setDocs((prev) => prev.map((d) => (
      d.id === activeId
        ? { ...d, [key]: typeof value === 'function' ? value(d[key]) : value }
        : d
    )));
  }, [activeId, record]);

  // Replaces the active file's code in every section (tab) of it. Ranges and
  // groups move with the lines they point at; a range reaching the old end
  // follows the new end, and a range end on a deleted line moves inward.
  const setContent = useCallback((fileContent) => {
    const totalLines = fileContent.split('\n').length;
    record(`${active.sourceId}:fileContent`);
    setDocs((prev) => prev.map((d) => {
      if (d.sourceId !== active.sourceId) return d;
      const mapLine = lineMap(d.fileContent, fileContent);
      const nearest = (from, step) => {
        for (let n = from; n >= 1 && n <= d.totalLines; n += step) {
          const mapped = mapLine(n);
          if (mapped !== null) return mapped;
        }
        return null;
      };
      const endLine   = d.endLine >= d.totalLines ? totalLines : (nearest(d.endLine, -1) ?? 1);
      const startLine = Math.min(nearest(d.startLine, 1) ?? totalLines, endLine);
      return {
        ...d, fileContent, totalLines, startLine, endLine,
        lineGroups: remapGroups(d.lineGroups, mapLine),
      };
    }));
  }, [active.sourceId, record]);

  const clear = useCallback(() => {
    record();
    setDocs([]);
    setActiveId(null);
  }, [record]);

  return {
    docs, active, activeId, setActiveId, addFiles, addSection, closeDocument, setField, setContent, clear,
    undo, redo, canUndo: history.current.past.length > 0, canRedo: history.current.future.length > 0,
  };
}
