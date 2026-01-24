import { motion } from "framer-motion";

function LineRangeSection({
  startLine,
  endLine,
  totalLines,
  onStartLineChange,
  onEndLineChange,
}) {
  return (
    <motion.div
      className="form-section"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <h2>2. Select Line Range</h2>
      <div className="line-range">
        <div className="input-group">
          <label htmlFor="start-line">Starting Line:</label>
          <input
            type="number"
            id="start-line"
            min="1"
            max={totalLines}
            value={startLine}
            onChange={(e) => onStartLineChange(parseInt(e.target.value))}
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="end-line">Ending Line:</label>
          <input
            type="number"
            id="end-line"
            min={startLine}
            max={totalLines}
            value={endLine}
            onChange={(e) => onEndLineChange(parseInt(e.target.value))}
            required
          />
        </div>
      </div>
    </motion.div>
  );
}

export default LineRangeSection;
