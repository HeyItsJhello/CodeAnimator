import { useState, useRef, useEffect, useMemo } from "react";
import { motion } from "framer-motion";

const OVERSCAN          = 30;
const VIRTUAL_THRESHOLD = 250;
const NATURAL_FONT_SIZE = 13;   // px — don't scale UP beyond this
const MIN_FONT_SIZE     = 7;    // px — below this is unreadable; clip instead
const CHAR_RATIO        = 0.60; // approx char-width / font-size for monospace

function PreviewPanel({
  fileName,
  fileContent,
  highlightedLines,
  startLine,
  endLine,
  lineGroupMap,
  fontFamily,
  onOpenPreviewModal,
}) {
  const containerRef = useRef(null);

  const [lineHeight, setLineHeight] = useState(null); // measured from the first rendered line
  const [scrollTop,  setScrollTop]  = useState(0);
  const [viewHeight, setViewHeight] = useState(500);
  const [viewWidth,  setViewWidth]  = useState(800);

  const lines     = useMemo(() => (fileContent ? fileContent.split("\n") : []), [fileContent]);
  const isVirtual = lines.length > VIRTUAL_THRESHOLD;

  // Always observe container size (for both font scaling and virtual scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      setViewHeight(e.contentRect.height);
      setViewWidth(e.contentRect.width);
    });
    obs.observe(el);
    setViewHeight(el.clientHeight);
    setViewWidth(el.clientWidth);
    return () => obs.disconnect();
  }, []);

  const measureRef = (node) => {
    if (node && lineHeight === null) {
      const h = node.getBoundingClientRect().height;
      if (h > 0) setLineHeight(h);
    }
  };
  const lh = lineHeight ?? 26;

  // Longest line in the whole file — stable so font doesn't jump while scrolling
  const maxLineLength = useMemo(
    () => Math.max(1, ...lines.map((l) => l.length)),
    [lines],
  );

  const maxLineNum   = lines.length;
  const lineNumWidth = String(maxLineNum).length;

  // Estimate space consumed by gutter (line numbers) and group indicator
  const gutterPx    = lineNumWidth * NATURAL_FONT_SIZE * CHAR_RATIO + 56; // 56 ≈ paddings
  const indicatorPx = 80;
  const hPad        = 16;
  const available   = Math.max(60, viewWidth - gutterPx - indicatorPx - hPad);

  // Font size that fits the longest line; clamped to [MIN, NATURAL]
  const fittedSize = available / (maxLineLength * CHAR_RATIO);
  const fontSize   = Math.min(NATURAL_FONT_SIZE, Math.max(MIN_FONT_SIZE, fittedSize));

  const { firstIdx, lastIdx } = useMemo(() => {
    if (!isVirtual) return { firstIdx: 0, lastIdx: lines.length - 1 };
    const first = Math.max(0, Math.floor(scrollTop / lh) - OVERSCAN);
    const last  = Math.min(
      lines.length - 1,
      Math.ceil((scrollTop + viewHeight) / lh) + OVERSCAN,
    );
    return { firstIdx: first, lastIdx: last };
  }, [isVirtual, scrollTop, viewHeight, lines.length, lh]);

  const topPad    = isVirtual ? firstIdx * lh : 0;
  const bottomPad = isVirtual
    ? Math.max(0, (lines.length - 1 - lastIdx) * lh)
    : 0;


  return (
    <motion.div
      className="preview-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="preview-chrome">
        <span className="chrome-dot red"    />
        <span className="chrome-dot yellow" />
        <span className="chrome-dot green"  />
        <span className="chrome-label">preview</span>
        {isVirtual && (
          <span className="virtual-badge" title="Windowed rendering active">
            virtual
          </span>
        )}
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
        </span>
      </div>

      <div
        className="preview-content"
        ref={containerRef}
        onScroll={isVirtual ? (e) => setScrollTop(e.currentTarget.scrollTop) : undefined}
      >
        <pre
          className="code-preview"
          style={{
            fontSize: `${fontSize}px`,
            ...(fontFamily ? { fontFamily } : {}),
          }}
        >
          {isVirtual && topPad > 0 && (
            <div aria-hidden style={{ height: topPad }} />
          )}

          {lines.slice(firstIdx, lastIdx + 1).map((line, i) => {
            const lineNum       = firstIdx + i + 1;
            const dataIdx       = firstIdx + i;
            const inRange       = lineNum >= startLine && lineNum <= endLine;
            const groupNums     = lineGroupMap.get(lineNum);
            const inGroup       = groupNums !== undefined;
            const indicatorText = groupNums?.length ? `G${groupNums.join(",")}` : "";
            const paddedNum     = String(lineNum).padStart(lineNumWidth, " ");

            return (
              <div
                key={lineNum}
                ref={i === 0 ? measureRef : undefined}
                className={`code-line${inRange ? " in-range" : ""}${inGroup ? " in-group" : ""}`}
              >
                <span className="line-number">{paddedNum}</span>
                <span className="line-content">
                  {(highlightedLines[dataIdx]?.tokens ?? [{ text: line || " ", color: "#ffffff" }]).map(
                    (token, tIdx) => (
                      <span key={tIdx} style={{ color: token.color }}>{token.text}</span>
                    ),
                  )}
                </span>
                <span className="line-group-indicator">{indicatorText}</span>
              </div>
            );
          })}

          {isVirtual && bottomPad > 0 && (
            <div aria-hidden style={{ height: bottomPad }} />
          )}
        </pre>
      </div>
    </motion.div>
  );
}

export default PreviewPanel;
