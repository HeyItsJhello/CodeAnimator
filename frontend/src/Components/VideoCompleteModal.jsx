import { motion, AnimatePresence } from "framer-motion";

function VideoCompleteModal({
  show,
  completedVideoUrl,
  onClose,
  onDownload,
  onUploadNew,
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
        >
          <motion.div
            className="upload-another-modal video-complete-modal"
            initial={{ scale: 0.8, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="upload-another-header">
              <span className="upload-another-title">Video Complete!</span>
            </div>
            <div className="upload-another-body">
              {completedVideoUrl && (
                <div className="video-preview-container">
                  <video
                    src={completedVideoUrl}
                    controls
                    autoPlay
                    loop
                    className="video-preview"
                  />
                </div>
              )}
              <div className="upload-another-buttons">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn-confirm"
                  onClick={onDownload}
                >
                  Download Video
                </button>
                <button
                  type="button"
                  className="btn-confirm"
                  onClick={onUploadNew}
                >
                  Upload New File
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VideoCompleteModal;
