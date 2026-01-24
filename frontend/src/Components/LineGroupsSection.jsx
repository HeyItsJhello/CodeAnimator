import { motion, AnimatePresence } from "framer-motion";

function LineGroupsSection({
  lineGroups,
  currentGroup,
  onCurrentGroupChange,
  onAddLineGroup,
  onRemoveLineGroup,
  onClearAllGroups,
  onOpenSplitModal,
}) {
  return (
    <motion.div
      className="form-section"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <h2>8. Define Line Groups</h2>
      <p className="help-text">
        Enter line numbers for each animation group (space-separated). Leave
        empty and click "Add Group" to show all remaining lines.
      </p>
      <p className="help-text example">Example: 21 38 34 or 1-5 15-23 9-13</p>

      <div className="line-group-input">
        <input
          type="text"
          placeholder="e.g., 1 2 3 or leave empty for all remaining"
          value={currentGroup}
          onChange={(e) => onCurrentGroupChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddLineGroup();
            }
          }}
        />
        <button type="button" onClick={onAddLineGroup} className="btn-add">
          Add Group
        </button>
        <button type="button" onClick={onOpenSplitModal} className="btn-split">
          Split
        </button>
      </div>

      <AnimatePresence>
        {lineGroups.length > 0 && (
          <motion.div
            className="line-groups-list"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="groups-header">
              <h3>Animation Groups:</h3>
              <button
                type="button"
                onClick={onClearAllGroups}
                className="btn-clear-all"
              >
                Clear All
              </button>
            </div>
            <AnimatePresence mode="popLayout">
              {lineGroups.map((group, index) => (
                <motion.div
                  key={index}
                  className="line-group-item"
                  initial={{ opacity: 0, x: -20, scale: 0.8 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.8 }}
                  transition={{
                    duration: 0.3,
                    type: "spring",
                    stiffness: 200,
                  }}
                  layout
                >
                  <span className="group-number">Group {index + 1}:</span>
                  <span
                    className={`group-lines ${typeof group === "object" && group.type === "SPLIT" ? "split-group" : ""}`}
                  >
                    {group === "ALL_REMAINING"
                      ? "All remaining lines"
                      : typeof group === "object" && group.type === "SPLIT"
                        ? `SPLIT at line ${group.line}`
                        : `Lines ${group.join(", ")}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveLineGroup(index)}
                    className="btn-remove"
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default LineGroupsSection;
