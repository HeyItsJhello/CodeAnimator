import { motion, AnimatePresence } from "framer-motion";

function DryRunModal({ show, result, onClose, onRender }) {
  if (!result) return null;

  const { quality, font, animation_type, orientation, line_range,
    n_groups, groups, estimated_duration_s, estimated_frames, frame_rate } = result;

  const mins  = Math.floor(estimated_duration_s / 60);
  const secs  = Math.round(estimated_duration_s % 60);
  const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="loading-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className="dry-run-modal"
            initial={{ scale: 0.88, opacity: 0, y: -40 }}
            animate={{ scale: 1,    opacity: 1, y: 0   }}
            exit={{    scale: 0.88, opacity: 0, y: -40 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dry-run-header">
              <span className="dry-run-title">Render Preview</span>
              <span className="dry-run-badge">DRY RUN</span>
            </div>

            <div className="dry-run-body">
              <div className="dry-run-meta">
                <div className="dry-run-stat">
                  <span className="dry-stat-label">quality</span>
                  <span className="dry-stat-value">{quality}</span>
                </div>
                <div className="dry-run-stat">
                  <span className="dry-stat-label">font</span>
                  <span className="dry-stat-value">{font}</span>
                </div>
                <div className="dry-run-stat">
                  <span className="dry-stat-label">animation</span>
                  <span className="dry-stat-value">{animation_type.replace("_", " ")}</span>
                </div>
                <div className="dry-run-stat">
                  <span className="dry-stat-label">orientation</span>
                  <span className="dry-stat-value">{orientation}</span>
                </div>
                <div className="dry-run-stat">
                  <span className="dry-stat-label">est. duration</span>
                  <span className="dry-stat-value highlight">{durStr}</span>
                </div>
                <div className="dry-run-stat">
                  <span className="dry-stat-label">frames</span>
                  <span className="dry-stat-value">{estimated_frames.toLocaleString()} @ {frame_rate}fps</span>
                </div>
              </div>

              <div className="dry-run-groups">
                <div className="dry-groups-title">
                  {n_groups} group{n_groups !== 1 ? "s" : ""} · lines {line_range[0]}–{line_range[1]}
                </div>
                <div className="dry-groups-list">
                  {groups.map((g, i) => (
                    <div key={i} className="dry-group-row">
                      <span className="dry-group-num">G{i + 1}</span>
                      <span className="dry-group-lines">
                        {g.lines.slice(0, 6).join(", ")}
                        {g.lines.length > 6 && ` +${g.lines.length - 6} more`}
                      </span>
                      <span className="dry-group-dur">{g.duration_s}s</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dry-run-actions">
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Close
                </button>
                <button type="button" className="btn-confirm" onClick={onRender}>
                  Looks Good — Render →
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default DryRunModal;
