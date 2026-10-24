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

const LOADING_STATUS = {
  queued:    "Queued — waiting for slot...",
  rendering: "Rendering frames...",
  complete:  "Complete!",
  error:     "Error",
};

export function LoadingModal({ isLoading, loadingProgress, loadingStatus }) {
  return (
    <Modal show={isLoading} className="loading-modal">
      <div className="loading-header">
        <span className="loading-title">Code Animator</span>
      </div>
      <div className="loading-body">
        <div className="loading-icon">
          <img src="/Movie.png" alt="" className="icon-sprite" />
        </div>
        <h3 className="loading-text">Generating Animation...</h3>
        <p className="loading-subtext">Please wait while we render your code animation</p>
        <div className="progress-bar-container">
          <div className="progress-status">{LOADING_STATUS[loadingStatus] ?? "Processing..."}</div>
          <div className="progress-bar-bg">
            <motion.div
              className="progress-bar-fill"
              initial={{ width: 0 }}
              animate={{ width: `${loadingProgress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            <span className="progress-bar-label">{Math.round(loadingProgress)}%</span>
          </div>
        </div>
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

export function ColorModal({ show, syntaxColors, onSyntaxColorsChange, onClose }) {
  const setColor = (key, value) => onSyntaxColorsChange((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal show={show} className="color-modal" onClose={onClose}>
      <div className="color-modal-header">
        <span className="color-modal-title">Syntax Highlighting Colors</span>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
      <div className="color-modal-body">
        <p className="color-modal-description">
          Customize the colors for different code elements in your animation.
        </p>
        <div className="color-inputs-grid">
          {Object.entries(syntaxColors).map(([key, color]) => (
            <div key={key} className="color-input-group">
              <label htmlFor={`color-${key}`}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <div className="color-input-wrapper">
                <input
                  type="color"
                  id={`color-${key}`}
                  value={color}
                  onChange={(e) => setColor(key, e.target.value)}
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(key, e.target.value)}
                  placeholder="#000000"
                />
              </div>
            </div>
          ))}
        </div>
        <div className="color-modal-buttons">
          <button
            type="button"
            className="btn-reset"
            onClick={() => onSyntaxColorsChange({ ...DEFAULT_SYNTAX_COLORS })}
          >
            Reset to Default
          </button>
          <button type="button" className="btn-confirm" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  );
}

export function PreviewModal({
  show, highlightedLines, syntaxColors, startLine, endLine, onClose, onEditColors,
}) {
  return (
    <Modal show={show} className="syntax-preview-modal" onClose={onClose}>
      <div className="syntax-preview-header">
        <span className="syntax-preview-title">Color Preview</span>
        <button className="btn-close" onClick={onClose}>✕</button>
      </div>
      <div className="syntax-preview-body">
        <p className="syntax-preview-description">
          Preview of how your code will appear with the current color settings.
        </p>
        <div className="syntax-preview-code-container">
          <pre className="syntax-preview-code">
            {highlightedLines.filter(({ lineNum }) => lineNum >= startLine && lineNum <= endLine).map(({ lineNum, tokens }) => (
              <div key={lineNum} className="syntax-preview-line">
                <span className="syntax-preview-line-num">{lineNum}</span>
                <span className="syntax-preview-line-content">
                  {tokens.map((token, idx) => (
                    <span key={idx} style={{ color: token.color }}>{token.text}</span>
                  ))}
                </span>
              </div>
            ))}
          </pre>
        </div>
        <div className="syntax-preview-legend">
          <span className="legend-title">Legend:</span>
          <div className="legend-items">
            {Object.entries(syntaxColors)
              .filter(([key]) => key !== "default" && key !== "background")
              .map(([key, color]) => (
                <div key={key} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: color }}></span>
                  <span className="legend-label">{key}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="syntax-preview-buttons">
          <button type="button" className="btn-edit-colors" onClick={onEditColors}>Edit Colors</button>
          <button type="button" className="btn-confirm" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}

export function VideoCompleteModal({ show, videoUrl, onClose, onDownload, onUploadNew }) {
  return (
    <Modal show={show} className="upload-another-modal video-complete-modal">
      <div className="upload-another-header">
        <span className="upload-another-title">Video Complete!</span>
      </div>
      <div className="upload-another-body">
        {videoUrl && (
          <div className="video-preview-container">
            <video src={videoUrl} controls autoPlay loop className="video-preview" />
          </div>
        )}
        <div className="upload-another-buttons">
          <button type="button" className="btn-cancel" onClick={onClose}>Close</button>
          <button type="button" className="btn-confirm" onClick={onDownload}>Download Video</button>
          <button type="button" className="btn-confirm" onClick={onUploadNew}>Upload New File</button>
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
