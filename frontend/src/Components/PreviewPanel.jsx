import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";

const OVERSCAN         = 30;   // extra lines above/below viewport
const VIRTUAL_THRESHOLD = 250; // activate windowing beyond this line count

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
  const scrollRef     = useRef(null);
  const lineHeightRef = useRef(26); // CSS: 0.78rem×1.55 line-height + 0.4rem×2 padding ≈ 26px
  const measuredRef   = useRef(false);

  const [scrollTop,  setScrollTop]  = useState(0);
  const [viewHeight, setViewHeight] = useState(500);

  const lines    = fileContent ? fileContent.split("\n") : [];
  const isVirtual = lines.length > VIRTUAL_THRESHOLD;

  // Track container height for windowing calculations
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => setViewHeight(e.contentRect.height));
    obs.observe(el);
    setViewHeight(el.clientHeight);
    return () => obs.disconnect();
  }, []);

  // Measure actual line height from first rendered line (runs once)
  const measureRef = useCallback((node) => {
    if (node && !measuredRef.current) {
      const h = node.getBoundingClientRect().height;
      if (h > 0) {
        lineHeightRef.current = h;
        measuredRef.current   = true;
      }
    }
  }, []);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const { firstIdx, lastIdx } = useMemo(() => {
    if (!isVirtual) return { firstIdx: 0, lastIdx: lines.length - 1 };
    const lh   = lineHeightRef.current;
    const first = Math.max(0, Math.floor(scrollTop / lh) - OVERSCAN);
    const last  = Math.min(
      lines.length - 1,
      Math.ceil((scrollTop + viewHeight) / lh) + OVERSCAN,
    );
    return { firstIdx: first, lastIdx: last };
  }, [isVirtual, scrollTop, viewHeight, lines.length]);

  const maxLineNum  = lines.length;
  const lineNumWidth = String(maxLineNum).length;

  const topPad    = isVirtual ? firstIdx * lineHeightRef.current : 0;
  const bottomPad = isVirtual
    ? Math.max(0, (lines.length - 1 - lastIdx) * lineHeightRef.current)
    : 0;

  const isLineInRange = (n) => n >= startLine && n <= endLine;
  const isLineInGroup = (n) => shownLines.has(n);

  return (
    <motion.div
      className="preview-panel"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="preview-chrome">
        <span className="chrome-dot red"   />
        <span className="chrome-dot yellow" />
        <span className="chrome-dot green" />
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
          <span className="cursor-blink">_</span>
        </span>
      </div>

      <div
        className="preview-content"
        ref={isVirtual ? scrollRef : undefined}
        onScroll={isVirtual ? handleScroll : undefined}
      >
        <pre
          className="code-preview"
          style={fontFamily ? { fontFamily } : undefined}
        >
          {isVirtual && topPad > 0 && (
            <div aria-hidden style={{ height: topPad }} />
          )}

          {lines.slice(firstIdx, lastIdx + 1).map((line, i) => {
            const lineNum      = firstIdx + i + 1;
            const dataIdx      = firstIdx + i;
            const inRange      = isLineInRange(lineNum);
            const inGroup      = isLineInGroup(lineNum);
            const groupNums    = lineGroupMap.get(lineNum);
            const indicatorText = groupNums?.length ? `G${groupNums.join(",")}` : "";
            const paddedNum    = String(lineNum).padStart(lineNumWidth, " ");

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
