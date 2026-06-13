import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { CodeLine } from './components/CodeLine.jsx';
import { calculateTotalFrames, QUALITY_DIMS } from './timing.js';
import { getFontFamily, loadSelectedFont } from './fonts.js';

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

// Minimum font size before we give up scaling and start scrolling instead
const MIN_FONT_SIZE = 11;

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

  // Trigger font download before Remotion renders any frame.
  // @remotion/google-fonts handles delayRender/continueRender internally.
  loadSelectedFont(font);
  const fontFamily = getFontFamily(font);

  const {
    initialDelay = 1,
    lineSlideIn = 0.8,
    pauseBetweenGroups = 0.6,
  } = animationTiming;

  const initialFrames = Math.round(initialDelay * fps);
  const lineFrames    = Math.round(lineSlideIn * fps);
  const pauseFrames   = Math.round(pauseBetweenGroups * fps);

  const codeLines = code.split('\n').slice(startLine - 1, endLine);

  // Build flat timeline
  const timeline = [];
  let currentFrame = initialFrames;

  for (let gi = 0; gi < lineGroups.length; gi++) {
    const groupStartFrame = currentFrame;
    for (const lineNum of lineGroups[gi].lines) {
      const zeroIdx = lineNum - startLine;
      const content = codeLines[zeroIdx] ?? '';
      if (!includeComments && content.trimStart().startsWith('#')) continue;
      timeline.push({ lineNum, content, startFrame: groupStartFrame });
    }
    currentFrame += lineFrames; // advance once per group — all lines animate simultaneously
    if (gi < lineGroups.length - 1) {
      currentFrame += pauseFrames;
    }
  }

  const V_PAD          = Math.round(height * 0.03); // vertical padding top+bottom
  const availableH     = height - V_PAD * 2;
  const naturalLH      = Math.round(height / 28);   // ideal line height at natural size
  const MIN_LH         = Math.ceil(MIN_FONT_SIZE / 0.62);

  // Scale down to fit all lines; never exceed natural size; scroll if too small
  const fittedLH       = timeline.length > 0
    ? Math.floor(availableH / timeline.length)
    : naturalLH;
  const LINE_HEIGHT    = Math.max(MIN_LH, Math.min(fittedLH, naturalLH));
  const shouldScroll   = fittedLH < MIN_LH;

  const fontSize        = Math.round(LINE_HEIGHT * 0.62);
  const gutterWidth     = String(endLine).length;
  const gutterCharWidth = fontSize * 0.6;

  // Scrolling (only when scaled-down still doesn't fit)
  let scrollY = 0;
  if (shouldScroll) {
    const visibleLines = Math.floor(availableH / LINE_HEIGHT);
    let activeIdx = 0;
    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i].startFrame <= frame) activeIdx = i;
    }
    if (activeIdx >= visibleLines) {
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
  }

  const backgroundColor = syntaxColors.background || '#1e1e2e';

  return (
    <div
      style={{
        width,
        height,
        backgroundColor,
        fontFamily,
        fontSize,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ transform: `translateY(${V_PAD - scrollY}px)` }}>
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
