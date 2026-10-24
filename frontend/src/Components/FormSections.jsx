import { motion, AnimatePresence } from "framer-motion";
import { ANIMATION_TYPES, QUALITY_OPTIONS } from "../config/constants";

export function Section({ title, help, delay, className = "form-section", children }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay }}
    >
      {title && <h2>{title}</h2>}
      {help && <p className="help-text">{help}</p>}
      {children}
    </motion.div>
  );
}

export function ApiStatusBanner({ apiStatus, onRetry }) {
  return (
    <AnimatePresence>
      {apiStatus !== "awake" && (
        <motion.div
          className={`api-status-banner ${apiStatus}`}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          {apiStatus === "waking" ? (
            <>
              <span className="status-spinner"></span>
              <span>Server is waking up... (this may take up to a minute)</span>
            </>
          ) : (
            <>
              <span>Server unavailable. </span>
              <button type="button" onClick={onRetry} className="retry-btn">Retry</button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FileUploadSection({ fileName, totalLines, onFileUpload }) {
  return (
    <Section title="1. Upload Code File" delay={0.3}>
      <div className="file-upload-wrapper">
        <input
          type="file"
          id="file-upload"
          accept=".py,.js,.jsx,.ts,.tsx,.java,.cpp,.c,.h,.go,.rs,.rb,.php,.swift,.kt,.gd"
          onChange={onFileUpload}
          required
        />
        <label htmlFor="file-upload" className="file-upload-label">
          {fileName || "Choose a file..."}
        </label>
      </div>
      <AnimatePresence>
        {totalLines > 0 && (
          <motion.p
            className="file-info"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            File loaded: {totalLines} lines total
          </motion.p>
        )}
      </AnimatePresence>
    </Section>
  );
}

export function LineRangeSection({ startLine, endLine, totalLines, onStartLineChange, onEndLineChange }) {
  return (
    <Section title="2. Select Line Range" delay={0.1}>
      <div className="line-range">
        <div className="input-group">
          <label htmlFor="start-line">Starting Line:</label>
          <input
            type="number" id="start-line" min="1" max={totalLines} value={startLine} required
            onChange={(e) => onStartLineChange(parseInt(e.target.value))}
          />
        </div>
        <div className="input-group">
          <label htmlFor="end-line">Ending Line:</label>
          <input
            type="number" id="end-line" min={startLine} max={totalLines} value={endLine} required
            onChange={(e) => onEndLineChange(parseInt(e.target.value))}
          />
        </div>
      </div>
    </Section>
  );
}

export function CommentSettings({ includeComments, onIncludeCommentsChange }) {
  return (
    <Section title="3. Comment Settings" delay={0.2}>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={includeComments}
          onChange={(e) => onIncludeCommentsChange(e.target.checked)}
        />
        <span>Include comments in the video</span>
      </label>
    </Section>
  );
}

export function ColorSettings({ syntaxColors, onOpenColorModal }) {
  return (
    <Section
      title="4. Syntax Highlighting Colors"
      help="Customize the colors used for syntax highlighting in the animation."
      delay={0.25}
    >
      <div className="color-preview-row">
        {Object.entries(syntaxColors).map(([key, color]) => (
          <div key={key} className="color-preview-chip" style={{ backgroundColor: color }}>
            <span className="color-preview-label">{key}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onOpenColorModal} className="btn-colors">
        Customize Colors
      </button>
    </Section>
  );
}

const ORIENTATIONS = [
  { value: "landscape", label: "Landscape", size: "1920×1080" },
  { value: "portrait",  label: "Portrait",  size: "1080×1920" },
];

export function OrientationToggle({ orientation, onOrientationChange }) {
  return (
    <Section title="5. Video Orientation" help="Choose the aspect ratio for your video output." delay={0.28}>
      <div className="orientation-toggle">
        {ORIENTATIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`orientation-btn ${orientation === o.value ? "active" : ""}`}
            onClick={() => onOrientationChange(o.value)}
          >
            <span className={`orientation-icon ${o.value}-icon`}></span>
            <span className="orientation-label">{o.label}</span>
            <span className="orientation-size">{o.size}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

export function QualityPreset({ quality, onQualityChange }) {
  return (
    <Section title="6. Quality Preset" help="Choose rendering quality. Lower quality renders faster." delay={0.29}>
      <div className="quality-toggle">
        {QUALITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`quality-btn ${quality === opt.value ? "active" : ""}`}
            onClick={() => onQualityChange(opt.value)}
          >
            <span className="quality-label">{opt.label}</span>
            <span className="quality-size">{opt.size}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

const TIMING_FIELDS = [
  { key: "initialDelay",       id: "initial-delay", label: "Initial delay" },
  { key: "lineSlideIn",        id: "line-slide",    label: "Line slide-in" },
  { key: "pauseBetweenGroups", id: "group-pause",   label: "Pause between groups" },
  { key: "finalPause",         id: "final-pause",   label: "Final pause" },
];

export function TimingSettings({ animationTiming, onUpdateTiming, onResetTiming }) {
  return (
    <Section
      title="7. Animation Timing"
      help="Fine-tune how long each part of the animation lasts (seconds)."
      delay={0.3}
    >
      <div className="timing-inputs-grid">
        {TIMING_FIELDS.map(({ key, id, label }) => (
          <div key={key} className="timing-input-group">
            <label htmlFor={id}>{label}</label>
            <input
              type="number" id={id} min="0" step="0.1"
              value={animationTiming[key]}
              onChange={(e) => onUpdateTiming(key, e.target.value)}
            />
            <span className="input-suffix">sec</span>
          </div>
        ))}
      </div>
      <div className="timing-actions">
        <button type="button" className="btn-reset" onClick={onResetTiming}>Reset to defaults</button>
      </div>
    </Section>
  );
}

export function AnimationTypeSelector({ animationType, onAnimationTypeChange }) {
  return (
    <Section
      title="8. Animation Type"
      help="Choose how lines appear on screen during the animation."
      delay={0.36}
    >
      <div className="animation-type-toggle">
        {ANIMATION_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            className={`animation-type-btn ${animationType === type.value ? "active" : ""}`}
            onClick={() => onAnimationTypeChange(type.value)}
          >
            <span className="animation-type-label">{type.label}</span>
            <span className="animation-type-desc">{type.desc}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

const describeGroup = (group) =>
  group === "ALL_REMAINING" ? "All remaining lines"
    : group.type === "SPLIT" ? `SPLIT at line ${group.line}`
      : `Lines ${group.join(", ")}`;

export function LineGroupsSection({
  lineGroups, currentGroup, onCurrentGroupChange,
  onAddLineGroup, onRemoveLineGroup, onClearAllGroups, onOpenSplitModal,
}) {
  return (
    <Section
      title="10. Define Line Groups"
      help={'Enter line numbers for each animation group (space-separated). Leave empty and click "Add Group" to show all remaining lines.'}
      delay={0.3}
    >
      <p className="help-text example">Example: 21 38 34 or 1-5 15-23 9-13</p>

      <div className="line-group-input">
        <input
          type="text"
          placeholder="e.g., 1 2 3 or leave empty for all remaining"
          value={currentGroup}
          onChange={(e) => onCurrentGroupChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onAddLineGroup(); }
          }}
        />
        <button type="button" onClick={onAddLineGroup} className="btn-add">Add Group</button>
        <button type="button" onClick={onOpenSplitModal} className="btn-split">Split</button>
      </div>

      <AnimatePresence>
        {lineGroups.length > 0 && (
          <motion.div
            className="line-groups-list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="groups-header">
              <h3>Animation Groups:</h3>
              <button type="button" onClick={onClearAllGroups} className="btn-clear-all">Clear All</button>
            </div>
            <AnimatePresence mode="popLayout">
              {lineGroups.map((group, index) => (
                <motion.div
                  key={index}
                  className="line-group-item"
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
                  layout
                >
                  <span className="group-number">Group {index + 1}:</span>
                  <span className={`group-lines ${group.type === "SPLIT" ? "split-group" : ""}`}>
                    {describeGroup(group)}
                  </span>
                  <button type="button" onClick={() => onRemoveLineGroup(index)} className="btn-remove">✕</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}

export function SubmitSection({ apiStatus, onDryRun }) {
  const ready = apiStatus === "awake";
  return (
    <motion.div
      className="form-section submit-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <div className="submit-row">
        <button type="button" className="btn-dry-run" disabled={!ready} onClick={onDryRun}>Dry Run</button>
        <button type="submit" className="btn-submit" disabled={!ready}>
          {ready ? "Generate Animation" : "Waiting for server..."}
        </button>
      </div>
      <div className="footer-links">
        <a href="https://ko-fi.com/heyitsjhello" target="_blank" rel="noopener noreferrer" className="support-btn">
          ♥ Support this project
        </a>
        <a href="https://github.com/HeyItsJhello/CodeAnimator/issues" target="_blank" rel="noopener noreferrer" className="feedback-btn">
          ? Send Feedback
        </a>
      </div>
    </motion.div>
  );
}
