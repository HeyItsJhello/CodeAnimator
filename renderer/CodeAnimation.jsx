import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { CodeLine } from './components/CodeLine.jsx';
import { calculateTotalFrames, QUALITY_DIMS } from './timing.js';

export { calculateTotalFrames };

export async function calculateMetadata({ props }) {
  const quality = props.quality || 'standard';
  const dims = QUALITY_DIMS[quality] || QUALITY_DIMS.standard;
  const fps = dims.fps;
  return {
    durationInFrames: calculateTotalFrames({ ...props, fps }),
    fps,
    width: dims.width,
    height: dims.height,
  };
}

export function CodeAnimation({
  code = '',
  startLine = 1,
  endLine = 10,
  includeComments = true,
  lineGroups = [],
  syntaxColors = {},
  animationTiming = {},
  animationType = 'slide_left',
  font = 'default',
  language = 'python',
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const {
    initialDelay = 1,
    lineSlideIn = 0.8,
    pauseBetweenGroups = 0.6,
  } = animationTiming;

  const initialFrames = Math.round(initialDelay * fps);
  const lineFrames    = Math.round(lineSlideIn * fps);
  const pauseFrames   = Math.round(pauseBetweenGroups * fps);

  const codeLines = code.split('\n').slice(startLine - 1, endLine);

  // Build flat timeline: one entry per visible line with its startFrame
  const timeline = [];
  let currentFrame = initialFrames;

  for (let gi = 0; gi < lineGroups.length; gi++) {
    for (const lineNum of lineGroups[gi].lines) {
      const zeroIdx = lineNum - startLine;
      const content = codeLines[zeroIdx] ?? '';
      if (!includeComments && content.trimStart().startsWith('#')) continue;
      timeline.push({ lineNum, content, startFrame: currentFrame });
      currentFrame += lineFrames;
    }
    if (gi < lineGroups.length - 1) {
      currentFrame += pauseFrames;
    }
  }

  const LINE_HEIGHT     = Math.round(height / 28);
  const fontSize        = Math.round(LINE_HEIGHT * 0.62);
  const gutterWidth     = String(endLine).length;
  const gutterCharWidth = fontSize * 0.6; // approximate monospace char width
  const fontFamily      = font === 'default' ? 'monospace' : `'${font}', monospace`;

  // Scrolling: keep the currently-revealing line visible
  const TOP_PAD    = LINE_HEIGHT;
  const BOTTOM_PAD = LINE_HEIGHT;
  const visibleLines = Math.floor((height - TOP_PAD - BOTTOM_PAD) / LINE_HEIGHT);

  // Find the index of the last line whose animation has started
  let activeIdx = 0;
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].startFrame <= frame) activeIdx = i;
  }

  const needsScroll = timeline.length > visibleLines;
  let scrollY = 0;

  if (needsScroll && activeIdx >= visibleLines) {
    const targetScroll = (activeIdx - visibleLines + 2) * LINE_HEIGHT;
    const prevTarget   = Math.max(0, (activeIdx - 1 - visibleLines + 2) * LINE_HEIGHT);
    const entry        = timeline[activeIdx];
    scrollY = interpolate(
      frame,
      [entry.startFrame, entry.startFrame + lineFrames],
      [prevTarget, targetScroll],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: '#1e1e2e',
        fontFamily,
        fontSize,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ transform: `translateY(${TOP_PAD - scrollY}px)` }}>
        {timeline.map(({ lineNum, content, startFrame }, i) => (
          <CodeLine
            key={lineNum}
            frame={frame}
            lineNum={lineNum}
            content={content}
            startFrame={startFrame}
            durationFrames={lineFrames}
            animationType={animationType}
            syntaxColors={syntaxColors}
            index={i}
            lineHeight={LINE_HEIGHT}
            fontSize={fontSize}
            gutterWidth={gutterWidth}
            gutterCharWidth={gutterCharWidth}
            compositionWidth={width}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}
