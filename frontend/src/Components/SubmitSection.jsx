import { motion } from "framer-motion";

function SubmitSection({ apiStatus }) {
  return (
    <motion.div
      className="form-section submit-section"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <button
        type="submit"
        className="btn-submit"
        disabled={apiStatus !== "awake"}
      >
        {apiStatus !== "awake"
          ? "Waiting for server..."
          : "Generate Animation"}
      </button>
      <div className="footer-links">
        <a
          href="https://ko-fi.com/heyitsjhello"
          target="_blank"
          rel="noopener noreferrer"
          className="support-btn"
        >
          ♥ Support this project
        </a>
        <a
          href="https://github.com/HeyItsJhello/CodeAnimator/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="feedback-btn"
        >
          ? Send Feedback
        </a>
      </div>
    </motion.div>
  );
}

export default SubmitSection;
