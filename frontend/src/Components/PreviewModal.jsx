import { motion, AnimatePresence } from "framer-motion";

function PreviewModal({
  show,
  highlightedLines,
  syntaxColors,
  startLine,
  endLine,
  onClose,
  onOpenColorModal,
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
            className="syntax-preview-modal"
            initial={{ scale: 0.8, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="syntax-preview-header">
              <span className="syntax-preview-title">Color Preview</span>
              <button className="btn-close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="syntax-preview-body">
              <p className="syntax-preview-description">
                Preview of how your code will appear with the current color
                settings.
              </p>
              <div className="syntax-preview-code-container">
                <pre className="syntax-preview-code">
                  {highlightedLines
                    .filter(
                      (_, idx) => idx + 1 >= startLine && idx + 1 <= endLine,
                    )
                    .map(({ lineNum, tokens }) => (
                      <div key={lineNum} className="syntax-preview-line">
                        <span className="syntax-preview-line-num">
                          {lineNum}
                        </span>
                        <span className="syntax-preview-line-content">
                          {tokens.map((token, idx) => (
                            <span key={idx} style={{ color: token.color }}>
                              {token.text}
                            </span>
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
                    .filter(([key]) => key !== "default")
                    .map(([key, color]) => (
                      <div key={key} className="legend-item">
                        <span
                          className="legend-color"
                          style={{ backgroundColor: color }}
                        ></span>
                        <span className="legend-label">{key}</span>
                      </div>
                    ))}
                </div>
              </div>
              <div className="syntax-preview-buttons">
                <button
                  type="button"
                  className="btn-edit-colors"
                  onClick={() => {
                    onClose();
                    onOpenColorModal();
                  }}
                >
                  Edit Colors
                </button>
                <button type="button" className="btn-confirm" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PreviewModal;
