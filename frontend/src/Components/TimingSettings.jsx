import { motion } from "framer-motion";

function TimingSettings({ animationTiming, onUpdateTiming, onResetTiming }) {
  return (
    <motion.div
      className="form-section"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <h2>7. Animation Timing</h2>
      <p className="help-text">
        Fine-tune how long each part of the animation lasts (seconds).
      </p>
      <div className="timing-inputs-grid">
        <div className="timing-input-group">
          <label htmlFor="initial-delay">Initial delay</label>
          <input
            type="number"
            id="initial-delay"
            min="0"
            step="0.1"
            value={animationTiming.initialDelay}
            onChange={(e) => onUpdateTiming("initialDelay", e.target.value)}
          />
          <span className="input-suffix">sec</span>
        </div>

        <div className="timing-input-group">
          <label htmlFor="line-slide">Line slide-in</label>
          <input
            type="number"
            id="line-slide"
            min="0"
            step="0.1"
            value={animationTiming.lineSlideIn}
            onChange={(e) => onUpdateTiming("lineSlideIn", e.target.value)}
          />
          <span className="input-suffix">sec</span>
        </div>

        <div className="timing-input-group">
          <label htmlFor="group-pause">Pause between groups</label>
          <input
            type="number"
            id="group-pause"
            min="0"
            step="0.1"
            value={animationTiming.pauseBetweenGroups}
            onChange={(e) => onUpdateTiming("pauseBetweenGroups", e.target.value)}
          />
          <span className="input-suffix">sec</span>
        </div>

        <div className="timing-input-group">
          <label htmlFor="final-pause">Final pause</label>
          <input
            type="number"
            id="final-pause"
            min="0"
            step="0.1"
            value={animationTiming.finalPause}
            onChange={(e) => onUpdateTiming("finalPause", e.target.value)}
          />
          <span className="input-suffix">sec</span>
        </div>
      </div>
      <div className="timing-actions">
        <button type="button" className="btn-reset" onClick={onResetTiming}>
          Reset to defaults
        </button>
      </div>
    </motion.div>
  );
}

export default TimingSettings;
