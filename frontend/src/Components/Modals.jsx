import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_SYNTAX_COLORS } from "../config/constants";

// Backdrop + animated card. Clicking the backdrop calls onClose when given.
function Modal({ show, className, onClose, children }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className={className}
            initial={{ scale: 0.8, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const RENDER_STEPS = [
  { key: "queued",    label: "Waiting for a free render slot" },
  { key: "rendering", label: "Rendering frames" },
  { key: "complete",  label: "Done" },
];
const PROGRESS_BLOCKS = 24;

export function LoadingModal({ isLoading, loadingProgress, loadingStatus, job }) {
  const fileName = job?.fileName ?? "";
  const percent = Math.round(loadingProgress);
  const filled = Math.round((percent / 100) * PROGRESS_BLOCKS);
  const currentStep = RENDER_STEPS.findIndex((step) => step.key === loadingStatus);

  return (
    <Modal show={isLoading} className="render-modal">
      <div className="modal-tabs">
        <span className="editor-tab">{fileName}</span>
        {job?.total > 1 && <span className="modal-tabs__meta">File {job.index} of {job.total}</span>}
      </div>
      <div className="render-modal__body">
        <p className="render-modal__title">
          {loadingStatus === "error" ? "The render failed" : `Rendering ${fileName}`}
        </p>

        <div
          className="pixel-progress"
          role="progressbar"
          aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
          aria-label="Render progress"
        >
          {Array.from({ length: PROGRESS_BLOCKS }, (_, i) => (
            <span key={i} className={i < filled ? "is-filled" : undefined} />
          ))}
        </div>
        <p className="render-modal__percent">{percent}%</p>

        <ol className="render-steps">
          {RENDER_STEPS.map((step, i) => (
            <li
              key={step.key}
              className={i < currentStep ? "is-done" : i === currentStep ? "is-current" : undefined}
            >
              {step.label}
            </li>
          ))}
        </ol>

        <p className="render-modal__note">This usually takes under a minute. Keep this tab open.</p>
      </div>
    </Modal>
  );
}

// onAddSplit(lineNum) returns true when the split was accepted.
export function SplitModal({ show, startLine, endLine, onAddSplit, onClose }) {
  const [value, setValue] = useState("");

  const submit = () => {
    const lineNum = parseInt(value, 10);
    if (isNaN(lineNum)) { alert("Please enter a valid line number"); return; }
    if (onAddSplit(lineNum)) {
      setValue("");
      onClose();
    }
  };

  return (
    <Modal show={show} className="split-modal" onClose={onClose}>
      <div className="split-header">
        <span className="split-title">Add Split Point</span>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
      <div className="split-body">
        <p className="split-description">
          Where would you like to split? This will scroll the current content off
          screen and start fresh with the specified line at the top.
        </p>
        <div className="split-input-group">
          <label htmlFor="split-line">Start next section at line:</label>
          <input
            type="number"
            id="split-line"
            min={startLine}
            max={endLine}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); submit(); }
            }}
            autoFocus
          />
        </div>
        <div className="split-buttons">
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
          <button type="button" className="btn-confirm" onClick={submit}>Add Split</button>
        </div>
      </div>
    </Modal>
  );
}

const COLOR_LABELS = {
  background: "Background",
  default:    "Plain text",
  keywords:   "Keywords",
  types:      "Types",
  functions:  "Functions",
  strings:    "Strings",
  numbers:    "Numbers",
  comments:   "Comments",
  decorators: "Decorators",
};
const PREVIEW_LINE_LIMIT = 22;

export function ColorModal({ show, syntaxColors, onSyntaxColorsChange, onClose, previewLines, fontFamily }) {
  const setColor = (key, value) => onSyntaxColorsChange((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal show={show} className="colors-modal" onClose={onClose}>
      <div className="modal-tabs">
        <span className="editor-tab">Colors</span>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="colors-modal__body">
        <div className="color-list">
          {Object.entries(syntaxColors).map(([key, color]) => (
            <div key={key} className="color-list__row">
              <input
                type="color"
                id={`color-${key}`}
                value={color}
                onChange={(e) => setColor(key, e.target.value)}
              />
              <label htmlFor={`color-${key}`}>{COLOR_LABELS[key] ?? key}</label>
              <input
                type="text"
                aria-label={`${COLOR_LABELS[key] ?? key} hex value`}
                value={color}
                onChange={(e) => setColor(key, e.target.value)}
                spellCheck={false}
              />
            </div>
          ))}
        </div>

        <pre
          className="colors-modal__preview"
          style={{ background: syntaxColors.background, color: syntaxColors.default, fontFamily }}
          aria-label="Preview of your code with these colors"
        >
          {previewLines.slice(0, PREVIEW_LINE_LIMIT).map(({ lineNum, tokens }) => (
            <div key={lineNum} className="colors-modal__line">
              <span className="colors-modal__line-num">{lineNum}</span>
              <span>
                {tokens.map((token, idx) => (
                  <span key={idx} style={{ color: token.color }}>{token.text}</span>
                ))}
              </span>
            </div>
          ))}
        </pre>
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="text-btn"
          onClick={() => onSyntaxColorsChange({ ...DEFAULT_SYNTAX_COLORS })}
        >
          Reset to defaults
        </button>
        <button type="button" className="ui-btn ui-btn--accent" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}

// The rendered videos: one large player, plus a strip to pick between them when there are several.
export function VideoGalleryModal({ show, results, onClose, onDownload, onUploadNew }) {
  // The pick belongs to one set of results; a new render starts back at the first video.
  const [pick, setPick] = useState({ results, index: 0 });
  const selected    = pick.results === results ? pick.index : 0;
  const setSelected = (index) => setPick({ results, index });

  const [downloading, setDownloading] = useState(false);
  // Downloads run one after another; the buttons wait until all are saved.
  const downloadEach = async (list) => {
    setDownloading(true);
    try {
      for (const result of list) await onDownload(result);
    } finally {
      setDownloading(false);
    }
  };

  const current   = results[selected] ?? results[0];
  const succeeded = results.filter((r) => !r.error);
  const title = results.length > 1
    ? `${succeeded.length} of ${results.length} videos complete`
    : "Video Complete!";

  return (
    <Modal show={show} className="upload-another-modal video-complete-modal">
      <div className="upload-another-header">
        <span className="upload-another-title">{title}</span>
      </div>
      <div className="upload-another-body">
        {current && (
          <div className="video-preview-container">
            {current.error ? (
              <p className="gallery-error">{current.fileName} failed: {current.error}</p>
            ) : (
              <video key={current.videoUrl} src={current.videoUrl} controls autoPlay loop className="video-preview" />
            )}
          </div>
        )}

        {results.length > 1 && (
          <div className="gallery" role="tablist" aria-label="Rendered videos">
            {results.map((result, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === selected}
                className={`gallery__item${result.error ? " gallery__item--failed" : ""}`}
                onClick={() => setSelected(i)}
              >
                {result.error
                  ? <span className="gallery__thumb gallery__thumb--failed">Failed</span>
                  : <video className="gallery__thumb" src={result.videoUrl} muted preload="metadata" />}
                <span className="gallery__name">{result.fileName}</span>
              </button>
            ))}
          </div>
        )}

        <div className="upload-another-buttons">
          <button type="button" className="btn-cancel" onClick={onClose}>Close</button>
          <button
            type="button" className="btn-confirm"
            disabled={!current || current.error || downloading} onClick={() => downloadEach([current])}
          >
            {downloading ? "Downloading…" : "Download Video"}
          </button>
          {succeeded.length > 1 && (
            <button
              type="button" className="btn-confirm"
              disabled={downloading} onClick={() => downloadEach(succeeded)}
            >
              Download All ({succeeded.length})
            </button>
          )}
          <button type="button" className="btn-confirm" onClick={onUploadNew}>Upload New Files</button>
        </div>
      </div>
    </Modal>
  );
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function DryRunModal({ show, result, onClose, onRender }) {
  return (
    <Modal show={show} className="dry-run-modal" onClose={onClose}>
      {result && (
        <>
          <div className="dry-run-header">
            <span className="dry-run-title">Render Preview</span>
            <span className="dry-run-badge">DRY RUN</span>
          </div>
          <div className="dry-run-body">
            <div className="dry-run-meta">
              {[
                ["quality",       result.quality],
                ["font",          result.font],
                ["animation",     result.animationType.replace(/_/g, " ")],
                ["orientation",   result.orientation],
                ["est. duration", formatDuration(result.estimatedDuration), "highlight"],
                ["frames",        `${result.totalFrames.toLocaleString()} @ ${result.fps}fps`],
              ].map(([label, value, extra]) => (
                <div key={label} className="dry-run-stat">
                  <span className="dry-stat-label">{label}</span>
                  <span className={`dry-stat-value${extra ? ` ${extra}` : ""}`}>{value}</span>
                </div>
              ))}
            </div>
            <div className="dry-run-groups">
              <div className="dry-groups-title">
                {result.groups.length} group{result.groups.length !== 1 ? "s" : ""} · lines{" "}
                {result.lineRange[0]}–{result.lineRange[1]}
              </div>
              <div className="dry-groups-list">
                {result.groups.map((g, i) => (
                  <div key={i} className="dry-group-row">
                    <span className="dry-group-num">G{i + 1}</span>
                    <span className="dry-group-lines">
                      {g.lines.slice(0, 6).join(", ")}
                      {g.lines.length > 6 && ` +${g.lines.length - 6} more`}
                    </span>
                    <span className="dry-group-dur">{g.durationSecs}s</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="dry-run-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>Close</button>
              <button type="button" className="btn-confirm" onClick={onRender}>Looks Good — Render →</button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
