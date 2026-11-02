import { useCurrentFrame, useVideoConfig } from 'remotion';
import { CodeLine } from './components/CodeLine.jsx';
import { calculateTotalFrames, getRenderDims, normalizeTiming } from './timing.js';
import { getFontFamily, loadSelectedFont } from './fonts.js';
import { calculateLayout, calculateScrollY } from './layout.js';
import { buildTimeline } from './timeline.js';

export async function calculateMetadata({ props }) {
  const { width, height, fps } = getRenderDims(props);
  return {
    durationInFrames: calculateTotalFrames({ ...props, fps }),
    fps,
    width,
    height,
  };
}

export function CodeAnimation({
  code = '',
  startLine = 1,
  endLine = 1,
  includeComments = true,
  lineGroups = [],
  syntaxColors = {},
  animationTiming = {},
  animationType = 'slide_left',
  font = 'default',
  language = 'python',
  fileName = '',
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  loadSelectedFont(font);
  const fontFamily = getFontFamily(font);

  const { initialDelay, lineSlideIn, pauseBetweenGroups } = normalizeTiming(animationTiming);
  const initialFrames = Math.round(initialDelay * fps);
  const lineFrames    = Math.round(lineSlideIn * fps);
  const pauseFrames   = Math.round(pauseBetweenGroups * fps);

  const timeline = buildTimeline({
    code, startLine, endLine, includeComments, language,
    lineGroups, initialFrames, lineFrames, pauseFrames,
  });

  // A small file-name label above the code, sized from the shorter side so
  // landscape and portrait match.
  const headerFontSize = Math.round(Math.min(width, height) * 0.028);
  const headerH = fileName ? Math.round(headerFontSize * 2.6) : 0;

  const layout = calculateLayout({ timeline, width, height, startLine, endLine, headerH });

  const scrollY = calculateScrollY({
    shouldScroll: layout.shouldScroll,
    timeline, frame,
    firstLine: layout.firstLine,
    lineHeight: layout.lineHeight,
    lineFrames,
    availH: layout.availH,
  });

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: syntaxColors.background || '#1e1e2e',
        fontFamily,
        fontSize: layout.fontSize,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ transform: `translateY(${layout.topOffset - scrollY}px)` }}>
        {timeline.map(({ lineNum, content, startFrame }) => (
          <CodeLine
            key={lineNum}
            frame={frame}
            lineNum={lineNum}
            content={content}
            startFrame={startFrame}
            durationFrames={lineFrames}
            animationType={animationType}
            syntaxColors={syntaxColors}
            layout={layout}
            compositionWidth={width}
            language={language}
          />
        ))}
      </div>
      {fileName && (
        // Drawn after the code with the same background so scrolled lines pass under it.
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: headerH,
            boxSizing: 'border-box',
            padding: `0 ${layout.gutterPadLeft}px`, // lines up with the line numbers
            display: 'flex', alignItems: 'center',
            backgroundColor: syntaxColors.background || '#1e1e2e',
            borderBottom: `${Math.max(1, Math.round(headerFontSize / 12))}px solid rgba(255, 255, 255, 0.08)`,
            color: syntaxColors.comments || '#8899A6',
            fontSize: headerFontSize,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {fileName}
        </div>
      )}
    </div>
  );
}
