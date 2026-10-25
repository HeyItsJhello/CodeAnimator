import { useState, useRef, useEffect, useMemo } from "react";

const OVERSCAN          = 30;
const VIRTUAL_THRESHOLD = 250;
const MAX_FONT_SIZE     = 32;   // px — keeps tiny files from turning into posters
const MIN_FONT_SIZE     = 5;    // px — below this is unreadable; scroll instead

// Must match preview.css. Everything in a line scales with font size except
// these rem-based paddings, so the fitting size can be solved for directly.
const LINE_HEIGHT    = 1.55;              // .code-preview line-height
const V_PAD_PX       = 2 * 0.75 * 16;     // .code-preview vertical padding
const H_PAD_PX       = (0.9 + 0.4 + 0.9 + 0.35 + 1) * 16 + 1; // gutter margin/padding/gap, border, content padding
const MARKER_EM      = 2.2 * 0.85;        // .line-group-marker min-width
const SAFETY_PX      = 2;                 // rounding slack so a fitted file never shows a scrollbar

// Advance width of one character as a fraction of font size (fonts are monospace).
function measureCharRatio(fontFamily) {
  const ctx = document.createElement("canvas").getContext("2d");
  ctx.font = `100px ${fontFamily}`;
  return ctx.measureText("0").width / 100;
}

function PreviewPanel({
  fileName,
  fileContent,
  highlightedLines,
  startLine,
  endLine,
  lineGroupMap,
  fontFamily,
  background,
  statusItems,
  onLineClick,
  onEditColors,
}) {
  const containerRef = useRef(null);

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

  // Re-measure when the font changes, and again whenever web fonts finish loading.
  const family = fontFamily || '"Jersey 15", "Courier New", monospace';
  const [fontsLoaded, setFontsLoaded] = useState(0);
  useEffect(() => {
    const bump = () => setFontsLoaded((n) => n + 1);
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fontsLoaded only triggers a re-measure
  const charRatio = useMemo(() => measureCharRatio(family), [family, fontsLoaded]);

  // Longest line in the whole file — stable so font doesn't jump while scrolling
  const maxLineLength = useMemo(
    () => Math.max(1, ...lines.map((l) => l.length)),
    [lines],
  );

  const lineNumWidth = String(lines.length).length;

  // Largest font size at which the whole file fits: every line's full width,
  // and every line's height. Clamped to [MIN, MAX].
  const emsWide   = MARKER_EM + (lineNumWidth + maxLineLength) * charRatio;
  const widthFit  = (viewWidth - H_PAD_PX - SAFETY_PX) / emsWide;
  const heightFit = (viewHeight - V_PAD_PX - SAFETY_PX) / (Math.max(1, lines.length) * LINE_HEIGHT);
  const fontSize  = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.min(widthFit, heightFit)));
  const lh        = fontSize * LINE_HEIGHT;

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
    <div className="preview-panel">
      <div className="editor-tabs">
        <span className="editor-tab">{fileName}</span>
        <button type="button" className="editor-tabs__action" onClick={onEditColors}>
          Edit colors
        </button>
      </div>

      <div
        className="preview-content"
        ref={containerRef}
        style={{ background }}
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
            const lineNum   = firstIdx + i + 1;
            const dataIdx   = firstIdx + i;
            const inRange   = lineNum >= startLine && lineNum <= endLine;
            const groupNums = lineGroupMap.get(lineNum);
            const paddedNum = String(lineNum).padStart(lineNumWidth, " ");

            return (
              <div
                key={lineNum}
                className={`code-line${inRange ? "" : " is-dimmed"}${groupNums ? " is-grouped" : ""}`}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  className="line-gutter"
                  title={`Add line ${lineNum} to the group field`}
                  onClick={() => onLineClick(lineNum)}
                >
                  <span className="line-group-marker">{groupNums ? groupNums.join(",") : ""}</span>
                  <span className="line-number">{paddedNum}</span>
                </button>
                <span className="line-content">
                  {(highlightedLines[dataIdx]?.tokens ?? [{ text: line || " ", color: "#ffffff" }]).map(
                    (token, tIdx) => (
                      <span key={tIdx} style={{ color: token.color }}>{token.text}</span>
                    ),
                  )}
                </span>
              </div>
            );
          })}

          {isVirtual && bottomPad > 0 && (
            <div aria-hidden style={{ height: bottomPad }} />
          )}
        </pre>
      </div>

      <div className="status-bar">
        {statusItems.map((item, i) => (
          <span key={i} className="status-bar__item">{item}</span>
        ))}
      </div>
    </div>
  );
}

export default PreviewPanel;
