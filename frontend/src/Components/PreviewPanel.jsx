import { motion } from "framer-motion";

function PreviewPanel({
  fileName,
  fileContent,
  highlightedLines,
  startLine,
  endLine,
  shownLines,
  lineGroupMap,
  fontFamily,
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
      <div className="preview-chrome">
        <span className="chrome-dot red" />
        <span className="chrome-dot yellow" />
        <span className="chrome-dot green" />
        <span className="chrome-label">preview</span>
      </div>
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
        <span className="preview-filename">
          <span className="filename-prompt">~/</span>
          {fileName}
          <span className="cursor-blink">_</span>
        </span>
      </div>
      <div className="preview-content">
        <pre className="code-preview" style={fontFamily ? { fontFamily } : undefined}>
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
                <span className="line-content">
                  {(highlightedLines[index]?.tokens ?? [{ text: line || " ", color: "#ffffff" }]).map(
                    (token, tIdx) => (
                      <span key={tIdx} style={{ color: token.color }}>{token.text}</span>
                    )
                  )}
                </span>
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
