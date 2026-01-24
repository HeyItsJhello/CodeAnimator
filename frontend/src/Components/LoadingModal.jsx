import { motion, AnimatePresence } from "framer-motion";

function LoadingModal({ isLoading, loadingProgress, loadingStatus }) {
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
                <div className="progress-status">
                  {loadingStatus === "starting" && "Starting..."}
                  {loadingStatus === "generating SVGs" &&
                    "Generating text elements..."}
                  {loadingStatus === "rendering frames" && "Rendering frames..."}
                  {loadingStatus === "compiling video" && "Compiling video..."}
                  {loadingStatus === "finalizing" && "Finalizing..."}
                  {loadingStatus === "complete" && "Complete!"}
                </div>
                <div className="progress-bar-bg">
                  <motion.div
                    className="progress-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  ></motion.div>
                </div>
                <motion.span
                  className="progress-text"
                  key={Math.round(loadingProgress)}
                  initial={{ scale: 1.2, color: "#e63946" }}
                  animate={{ scale: 1, color: "#e63946" }}
                  transition={{ duration: 0.2 }}
                >
                  {Math.round(loadingProgress)}%
                </motion.span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default LoadingModal;
