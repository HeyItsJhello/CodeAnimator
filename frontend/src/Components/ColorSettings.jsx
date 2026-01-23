import { motion } from "framer-motion";

function ColorSettings({ syntaxColors, onOpenColorModal }) {
  return (
    <motion.div
      className="form-section"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <h2>4. Syntax Highlighting Colors</h2>
      <p className="help-text">
        Customize the colors used for syntax highlighting in the animation.
      </p>
      <div className="color-preview-row">
        {Object.entries(syntaxColors).map(([key, color]) => (
          <div
            key={key}
            className="color-preview-chip"
            style={{ backgroundColor: color }}
          >
            <span className="color-preview-label">{key}</span>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenColorModal}
        className="btn-colors"
      >
        Customize Colors
      </button>
    </motion.div>
  );
}

export default ColorSettings;
