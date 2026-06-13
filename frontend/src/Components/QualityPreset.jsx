import { motion } from "framer-motion";
import { QUALITY_OPTIONS } from "../data/constants";

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
        {QUALITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`quality-btn ${quality === opt.value ? "active" : ""}`}
            onClick={() => onQualityChange(opt.value)}
          >
            <span className="quality-label">{opt.label}</span>
            <span className="quality-size">{opt.size}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default QualityPreset;
