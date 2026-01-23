import { motion } from "framer-motion";

function QualityPreset({ quality, onQualityChange }) {
  return (
    <motion.div
      className="form-section"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: 0.29 }}
    >
      <h2>6. Quality Preset</h2>
      <p className="help-text">
        Choose rendering quality. Lower quality renders faster.
      </p>
      <div className="quality-toggle">
        <button
          type="button"
          className={`quality-btn ${quality === "fast" ? "active" : ""}`}
          onClick={() => onQualityChange("fast")}
        >
          <span className="quality-label">Fast</span>
          <span className="quality-size">480p @ 60fps</span>
        </button>
        <button
          type="button"
          className={`quality-btn ${quality === "standard" ? "active" : ""}`}
          onClick={() => onQualityChange("standard")}
        >
          <span className="quality-label">Standard</span>
          <span className="quality-size">720p @ 60fps</span>
        </button>
        <button
          type="button"
          className={`quality-btn ${quality === "high" ? "active" : ""}`}
          onClick={() => onQualityChange("high")}
        >
          <span className="quality-label">High</span>
          <span className="quality-size">1080p @ 60fps</span>
        </button>
      </div>
    </motion.div>
  );
}

export default QualityPreset;
