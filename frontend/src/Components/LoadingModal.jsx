import { motion, AnimatePresence } from "framer-motion";

const STATUS_LABEL = {
  queued:    "Queued — waiting for slot...",
  rendering: "Rendering frames...",
  complete:  "Complete!",
  error:     "Error",
};

function LoadingModal({ isLoading, loadingProgress, loadingStatus }) {
  const statusText = STATUS_LABEL[loadingStatus] ?? "Processing...";

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="loading-modal"
            initial={{ scale: 0.8, opacity: 0, y: -50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: -50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
          >
            <div className="loading-header">
              <span className="loading-title">Code Animator</span>
            </div>

            <div className="loading-body">
              <div className="loading-icon">
                <img src="/Movie.png" alt="" className="icon-sprite" />
              </div>

              <h3 className="loading-text">Generating Animation...</h3>
              <p className="loading-subtext">
                Please wait while we render your code animation
              </p>

              <div className="progress-bar-container">
                <div className="progress-status">{statusText}</div>

                <div className="progress-bar-bg">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                  <span className="progress-bar-label">
                    {Math.round(loadingProgress)}%
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LoadingModal;
