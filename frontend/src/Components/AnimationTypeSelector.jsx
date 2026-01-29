import { motion } from "framer-motion";
import { ANIMATION_TYPES } from "../data/constants";

function AnimationTypeSelector({ animationType, onAnimationTypeChange }) {
  return (
    <motion.div
      className="form-section"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: 0.36 }}
    >
      <h2>8. Animation Type</h2>
      <p className="help-text">
        Choose how lines appear on screen during the animation.
      </p>
      <div className="animation-type-toggle">
        {ANIMATION_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            className={`animation-type-btn ${animationType === type.value ? "active" : ""}`}
            onClick={() => onAnimationTypeChange(type.value)}
          >
            <span className="animation-type-label">{type.label}</span>
            <span className="animation-type-desc">{type.desc}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

export default AnimationTypeSelector;
