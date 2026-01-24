import { motion } from "framer-motion";

function PreviewPanel({
  fileName,
  fileContent,
  startLine,
  endLine,
  shownLines,
  lineGroupMap,
  onOpenPreviewModal,
}) {
  const getPreviewLines = () => {
    if (!fileContent) return [];
    return fileContent.split("\n");
  };

  const isLineInRange = (lineNum) => {
    return lineNum >= startLine && lineNum <= endLine;
  };

  const isLineInGroup = (lineNum) => {
    return shownLines.has(lineNum);
  };

  const lines = getPreviewLines();
  const maxLineNum = lines.length;
  const lineNumWidth = String(maxLineNum).length;

  return (
    <motion.div
      className="preview-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="preview-header">
        <div className="preview-header-top">
          <h2>File Preview</h2>
          <button
            type="button"
            className="btn-preview-colors"
            onClick={onOpenPreviewModal}
          >
            Preview Colors
          </button>
        </div>
        <span className="preview-filename">{fileName}</span>
      </div>
      <div className="preview-content">
        <pre className="code-preview">
          {lines.map((line, index) => {
            const lineNum = index + 1;
            const inRange = isLineInRange(lineNum);
            const inGroup = isLineInGroup(lineNum);
            const indicatorText = lineGroupMap.get(lineNum)?.length
              ? `G${lineGroupMap.get(lineNum).join(",")}`
              : "";
            const paddedLineNum = String(lineNum).padStart(lineNumWidth, " ");
            return (
              <div
                key={index}
                className={`code-line ${inRange ? "in-range" : ""} ${inGroup ? "in-group" : ""}`}
              >
                <span className="line-number">{paddedLineNum}</span>
                <span className="line-content">{line || " "}</span>
                <span className="line-group-indicator">{indicatorText}</span>
              </div>
            );
          })}
        </pre>
      </div>
    </motion.div>
  );
}

export default PreviewPanel;
