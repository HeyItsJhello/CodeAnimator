import { motion, AnimatePresence } from "framer-motion";

function ApiStatusBanner({ apiStatus, onRetry }) {
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
          {apiStatus === "checking" && (
            <>
              <span className="status-spinner"></span>
              <span>Connecting to server...</span>
            </>
          )}
          {apiStatus === "waking" && (
            <>
              <span className="status-spinner"></span>
              <span>
                Server is waking up... (this may take up to a minute)
              </span>
            </>
          )}
          {apiStatus === "error" && (
            <>
              <span>Server unavailable. </span>
              <button
                type="button"
                onClick={onRetry}
                className="retry-btn"
              >
                Retry
              </button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ApiStatusBanner;
