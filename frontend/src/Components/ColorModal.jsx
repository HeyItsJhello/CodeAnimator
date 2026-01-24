import { motion, AnimatePresence } from "framer-motion";
import { DEFAULT_SYNTAX_COLORS } from "../data/constants";

function ColorModal({ show, syntaxColors, onSyntaxColorsChange, onClose }) {
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
            className="color-modal"
            initial={{ scale: 0.8, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="color-modal-header">
              <span className="color-modal-title">
                Syntax Highlighting Colors
              </span>
              <button className="btn-close" onClick={onClose}>
                ✕
              </button>
            </div>
            <div className="color-modal-body">
              <p className="color-modal-description">
                Customize the colors for different code elements in your
                animation.
              </p>
              <div className="color-inputs-grid">
                {Object.entries(syntaxColors).map(([key, color]) => (
                  <div key={key} className="color-input-group">
                    <label htmlFor={`color-${key}`}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                    <div className="color-input-wrapper">
                      <input
                        type="color"
                        id={`color-${key}`}
                        value={color}
                        onChange={(e) =>
                          onSyntaxColorsChange((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                      <input
                        type="text"
                        value={color}
                        onChange={(e) =>
                          onSyntaxColorsChange((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
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
                  onClick={() =>
                    onSyntaxColorsChange({ ...DEFAULT_SYNTAX_COLORS })
                  }
                >
                  Reset to Default
                </button>
                <button type="button" className="btn-confirm" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ColorModal;
