import { motion, AnimatePresence } from "framer-motion";

function SplitModal({
  show,
  splitLineInput,
  startLine,
  endLine,
  onSplitLineInputChange,
  onAddSplit,
  onClose,
}) {
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
            className="split-modal"
            initial={{ scale: 0.8, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="split-header">
              <span className="split-title">Add Split Point</span>
              <button className="btn-close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="split-body">
              <p className="split-description">
                Where would you like to split? This will scroll the current
                content off screen and start fresh with the specified line at
                the top.
              </p>
              <div className="split-input-group">
                <label htmlFor="split-line">Start next section at line:</label>
                <input
                  type="number"
                  id="split-line"
                  min={startLine}
                  max={endLine}
                  value={splitLineInput}
                  onChange={(e) => onSplitLineInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onAddSplit();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="split-buttons">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button type="button" className="btn-confirm" onClick={onAddSplit}>
                  Add Split
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SplitModal;
