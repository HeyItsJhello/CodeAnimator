import { motion, AnimatePresence } from "framer-motion";
import { ANIMATION_TYPES, QUALITY_OPTIONS } from "../config/constants";

export function Section({ title, help, className = "form-section", children }) {
  return (
    <div className={className}>
      {title && <h2>{title}</h2>}
      {help && <p className="help-text">{help}</p>}
      {children}
    </div>
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

export function LineRangeSection({ startLine, endLine, totalLines, onStartLineChange, onEndLineChange }) {
  return (
    <Section title="Line range">
      <div className="line-range">
        <div className="input-group">
          <label htmlFor="start-line">From line</label>
          <input
            type="number" id="start-line" min="1" max={totalLines} value={startLine} required
            onChange={(e) => onStartLineChange(parseInt(e.target.value))}
          />
        </div>
        <div className="input-group">
          <label htmlFor="end-line">To line</label>
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
    <Section title="Comments">
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
      title="Colors"
    >
      <div className="color-preview-row">
        {Object.entries(syntaxColors).map(([key, color]) => (
          <div key={key} className="color-preview-chip" style={{ backgroundColor: color }}>
            <span className="color-preview-label">{key}</span>
          </div>
        ))}
      </div>
      <button type="button" onClick={onOpenColorModal} className="btn-colors">
        Edit colors
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
    <Section title="Video size">
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
    <Section title="Quality" help="Lower quality renders faster.">
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
      title="Timing"
      help="How long each part lasts, in seconds."
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
        <button type="button" className="btn-reset" onClick={onResetTiming}>Reset timing</button>
      </div>
    </Section>
  );
}

export function AnimationTypeSelector({ animationType, onAnimationTypeChange }) {
  return (
    <Section
      title="Animation"
      help="How each group of lines appears."
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
    : group.type === "SPLIT" ? `Split at line ${group.line}`
      : `Lines ${group.join(", ")}`;

export function LineGroupsSection({
  lineGroups, currentGroup, onCurrentGroupChange,
  onAddLineGroup, onRemoveLineGroup, onClearAllGroups, onOpenSplitModal,
}) {
  return (
    <Section
      title="Line groups"
      help="Each group appears together. Leave the field empty and add to show all remaining lines."
    >
      <p className="help-text example">For example: 1-5 or 21 34 38</p>

      <div className="line-group-input">
        <input
          type="text"
          placeholder="Line numbers, e.g. 1-5"
          value={currentGroup}
          onChange={(e) => onCurrentGroupChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); onAddLineGroup(); }
          }}
        />
        <button type="button" onClick={onAddLineGroup} className="btn-add">Add group</button>
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
              <h3>Groups</h3>
              <button type="button" onClick={onClearAllGroups} className="btn-clear-all">Clear all</button>
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
                  <span className="group-number">{index + 1}</span>
                  <span className={`group-lines ${group.type === "SPLIT" ? "split-group" : ""}`}>
                    {describeGroup(group)}
                  </span>
                  <button type="button" onClick={() => onRemoveLineGroup(index)} className="btn-remove" aria-label={`Remove group ${index + 1}`}>✕</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Section>
  );
}

export function SidebarLinks() {
  return (
    <p className="sidebar-links">
      <a href="https://ko-fi.com/heyitsjhello" target="_blank" rel="noopener noreferrer">Support this project</a>
      <a href="https://github.com/HeyItsJhello/CodeAnimator/issues" target="_blank" rel="noopener noreferrer">Send feedback</a>
    </p>
  );
}
