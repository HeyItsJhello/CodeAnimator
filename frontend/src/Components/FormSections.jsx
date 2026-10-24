import { motion, AnimatePresence } from "framer-motion";
import { ANIMATION_TYPES, QUALITY_OPTIONS } from "../config/constants";
import FontSelector from "./FontSelector";

// A collapsible group of settings in the sidebar.
function Panel({ title, children }) {
  return (
    <details className="panel" open>
      <summary className="panel__title">{title}</summary>
      <div className="panel__body">{children}</div>
    </details>
  );
}

// A labelled row inside a panel.
function Field({ label, htmlFor, hint, children }) {
  return (
    <div className="field">
      {htmlFor
        ? <label className="field__label" htmlFor={htmlFor}>{label}</label>
        : <span className="field__label">{label}</span>}
      {children}
      {hint && <p className="field__hint">{hint}</p>}
    </div>
  );
}

// One-of-many choice rendered as a row (or list) of buttons.
function Choice({ label, options, value, onChange, layout = "row" }) {
  return (
    <div className={`choice choice--${layout}`} role="radiogroup" aria-label={label}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className="choice__option"
          onClick={() => onChange(opt.value)}
        >
          <span className="choice__name">{opt.label}</span>
          {opt.meta && <span className="choice__meta">{opt.meta}</span>}
        </button>
      ))}
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
              <span>The render server is starting up. This can take up to a minute.</span>
            </>
          ) : (
            <>
              <span>Can't reach the render server.</span>
              <button type="button" onClick={onRetry} className="retry-btn">Try again</button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const describeGroup = (group) =>
  group === "ALL_REMAINING" ? "All remaining lines"
    : group.type === "SPLIT" ? `Split at line ${group.line}`
      : `Lines ${group.join(", ")}`;

export function LinesPanel({
  startLine, endLine, totalLines, onStartLineChange, onEndLineChange,
  lineGroups, currentGroup, onCurrentGroupChange,
  onAddLineGroup, onRemoveLineGroup, onClearAllGroups, onOpenSplitModal,
}) {
  return (
    <Panel title="Lines">
      <Field label="Range">
        <div className="range-row">
          <input
            type="number" aria-label="From line" min="1" max={totalLines} value={startLine} required
            onChange={(e) => onStartLineChange(parseInt(e.target.value))}
          />
          <span>to</span>
          <input
            type="number" aria-label="To line" min={startLine} max={totalLines} value={endLine} required
            onChange={(e) => onEndLineChange(parseInt(e.target.value))}
          />
          <span className="range-row__total">of {totalLines}</span>
        </div>
      </Field>

      <Field
        label="Groups"
        htmlFor="group-input"
        hint="Lines in a group appear together. Click line numbers in the editor to fill this in, or leave it empty to add all remaining lines."
      >
        <div className="group-entry">
          <input
            type="text"
            id="group-input"
            placeholder="e.g. 1-5 or 21 34"
            value={currentGroup}
            onChange={(e) => onCurrentGroupChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); onAddLineGroup(); }
            }}
          />
          <button type="button" onClick={onAddLineGroup} className="ui-btn ui-btn--accent">Add</button>
          <button type="button" onClick={onOpenSplitModal} className="ui-btn">Split</button>
        </div>
      </Field>

      {lineGroups.length > 0 && (
        <div className="group-list">
          <AnimatePresence mode="popLayout" initial={false}>
            {lineGroups.map((group, index) => (
              <motion.div
                key={`${index}-${describeGroup(group)}`}
                className={`group-list__item${group.type === "SPLIT" ? " group-list__item--split" : ""}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.18 }}
                layout
              >
                <span className="group-list__number">{index + 1}</span>
                <span className="group-list__lines">{describeGroup(group)}</span>
                <button
                  type="button"
                  onClick={() => onRemoveLineGroup(index)}
                  className="group-list__remove"
                  aria-label={`Remove group ${index + 1}`}
                >
                  ✕
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <button type="button" onClick={onClearAllGroups} className="text-btn">Clear all groups</button>
        </div>
      )}
    </Panel>
  );
}

const TIMING_FIELDS = [
  { key: "initialDelay",       id: "initial-delay", label: "Start delay" },
  { key: "lineSlideIn",        id: "line-slide",    label: "Line entrance" },
  { key: "pauseBetweenGroups", id: "group-pause",   label: "Between groups" },
  { key: "finalPause",         id: "final-pause",   label: "Hold at end" },
];

export function AnimationPanel({
  animationType, onAnimationTypeChange, animationTiming, onUpdateTiming, onResetTiming,
}) {
  return (
    <Panel title="Animation">
      <Field label="Entrance">
        <Choice
          label="Entrance"
          layout="list"
          value={animationType}
          onChange={onAnimationTypeChange}
          options={ANIMATION_TYPES.map((t) => ({ value: t.value, label: t.label, meta: t.desc }))}
        />
      </Field>

      <Field label="Timing, in seconds">
        <div className="timing-grid">
          {TIMING_FIELDS.map(({ key, id, label }) => (
            <label key={key} htmlFor={id} className="timing-grid__item">
              <span>{label}</span>
              <input
                type="number" id={id} min="0" step="0.1"
                value={animationTiming[key]}
                onChange={(e) => onUpdateTiming(key, e.target.value)}
              />
            </label>
          ))}
        </div>
        <button type="button" className="text-btn" onClick={onResetTiming}>Reset timing</button>
      </Field>
    </Panel>
  );
}

const ORIENTATIONS = [
  { value: "landscape", label: "Landscape", meta: "1920×1080" },
  { value: "portrait",  label: "Portrait",  meta: "1080×1920" },
];

export function VideoPanel({ orientation, onOrientationChange, quality, onQualityChange }) {
  return (
    <Panel title="Video">
      <Field label="Shape">
        <Choice label="Shape" options={ORIENTATIONS} value={orientation} onChange={onOrientationChange} />
      </Field>
      <Field label="Quality" hint="Lower quality renders faster.">
        <Choice
          label="Quality"
          value={quality}
          onChange={onQualityChange}
          options={QUALITY_OPTIONS.map((q) => ({ value: q.value, label: q.label, meta: q.size }))}
        />
      </Field>
    </Panel>
  );
}

export function LookPanel({
  syntaxColors, onOpenColorModal, font, onFontChange, includeComments, onIncludeCommentsChange,
}) {
  return (
    <Panel title="Look">
      <Field label="Colors">
        <button type="button" className="swatch-strip" onClick={onOpenColorModal}>
          <span className="swatch-strip__chips" aria-hidden="true">
            {Object.entries(syntaxColors).map(([key, color]) => (
              <span key={key} style={{ backgroundColor: color }} />
            ))}
          </span>
          <span>Edit colors</span>
        </button>
      </Field>

      <Field label="Font">
        <FontSelector font={font} onFontChange={onFontChange} />
      </Field>

      <label className="check-row">
        <input
          type="checkbox"
          checked={includeComments}
          onChange={(e) => onIncludeCommentsChange(e.target.checked)}
        />
        <span>Show code comments in the video</span>
      </label>
    </Panel>
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
