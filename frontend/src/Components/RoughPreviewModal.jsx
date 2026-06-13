import { motion, AnimatePresence } from "framer-motion";

function RoughPreviewModal({ show, videoUrl, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="rough-preview-modal"
            initial={{ scale: 0.88, opacity: 0, y: -40 }}
            animate={{ scale: 1,    opacity: 1, y: 0   }}
            exit={{    scale: 0.88, opacity: 0, y: -40 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rough-preview-header">
              <span className="rough-preview-title">Quick Preview</span>
              <span className="rough-preview-badge">480p</span>
            </div>

            <div className="rough-preview-body">
              <p className="rough-preview-hint">
                Low-res preview ready — does the animation look right?
              </p>

              {videoUrl && (
                <div className="rough-video-container">
                  <video
                    src={videoUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    className="rough-video"
                  />
                </div>
              )}

              <div className="rough-preview-actions">
                <button type="button" className="btn-cancel" onClick={onCancel}>
                  ✕ Start Over
                </button>
                <button type="button" className="btn-confirm rough-confirm" onClick={onConfirm}>
                  Render Full Quality →
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RoughPreviewModal;
