import { motion } from "framer-motion";

function OrientationToggle({ orientation, onOrientationChange }) {
  return (
    <motion.div
      className="form-section"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: 0.28 }}
    >
      <h2>5. Video Orientation</h2>
      <p className="help-text">
        Choose the aspect ratio for your video output.
      </p>
      <div className="orientation-toggle">
        <button
          type="button"
          className={`orientation-btn ${orientation === "landscape" ? "active" : ""}`}
          onClick={() => onOrientationChange("landscape")}
        >
          <span className="orientation-icon landscape-icon"></span>
          <span className="orientation-label">Landscape</span>
          <span className="orientation-size">1920×1080</span>
        </button>
        <button
          type="button"
          className={`orientation-btn ${orientation === "portrait" ? "active" : ""}`}
          onClick={() => onOrientationChange("portrait")}
        >
          <span className="orientation-icon portrait-icon"></span>
          <span className="orientation-label">Portrait</span>
          <span className="orientation-size">1080×1920</span>
        </button>
      </div>
    </motion.div>
  );
}

export default OrientationToggle;
