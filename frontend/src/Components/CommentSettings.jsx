import { motion } from "framer-motion";

function CommentSettings({ includeComments, onIncludeCommentsChange }) {
  return (
    <motion.div
      className="form-section"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <h2>3. Comment Settings</h2>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={includeComments}
          onChange={(e) => onIncludeCommentsChange(e.target.checked)}
        />
        <span>Include comments in the video</span>
      </label>
    </motion.div>
  );
}

export default CommentSettings;
