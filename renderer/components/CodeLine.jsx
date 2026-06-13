import { interpolate } from 'remotion';
import { SyntaxTokens } from './SyntaxTokens.jsx';

export function CodeLine({
  frame,
  lineNum,
  content,
  startFrame,
  durationFrames,
  animationType,
  syntaxColors,
  index,
  lineHeight,
  fontSize,
  gutterWidth,
  gutterCharWidth,
  compositionWidth,
  language,
}) {
  const progress = interpolate(
    frame,
    [startFrame, Math.max(startFrame + durationFrames, startFrame + 1)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  let transform = 'none';
  let opacity = 1;
  let displayContent = content;

  switch (animationType) {
    case 'slide_left': {
      const x = interpolate(progress, [0, 1], [-compositionWidth, 0]);
      transform = `translateX(${x}px)`;
      break;
    }
    case 'fade_in':
      opacity = progress;
      break;
    case 'drop_in': {
      const y = interpolate(progress, [0, 1], [-lineHeight * 3, 0]);
      transform = `translateY(${y}px)`;
      break;
    }
    case 'scale_in':
      transform = `scale(${Math.max(progress, 0.001)})`;
      opacity = progress;
      break;
    case 'typewriter': {
      opacity = progress > 0 ? 1 : 0;
      displayContent = content.slice(0, Math.round(progress * content.length));
      break;
    }
    default: {
      const x = interpolate(progress, [0, 1], [-compositionWidth, 0]);
      transform = `translateX(${x}px)`;
    }
  }

  const gutterColor = '#555566';
  const gutterStr   = String(lineNum).padStart(gutterWidth, ' ');
  const gutterPx    = gutterWidth * gutterCharWidth + 32; // 24px left pad + 8px gap

  return (
    <div
      style={{
        position: 'absolute',
        top: index * lineHeight,
        left: 0,
        right: 0,
        height: lineHeight,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Gutter — always visible, never animated */}
      <span
        style={{
          display: 'inline-block',
          width: gutterPx,
          paddingLeft: 24,
          paddingRight: 8,
          flexShrink: 0,
          color: gutterColor,
          fontSize,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'pre',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {gutterStr}
      </span>

      {/* Code content — animated */}
      <div
        style={{
          transform,
          opacity,
          overflow: 'hidden',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <SyntaxTokens
          content={displayContent}
          syntaxColors={syntaxColors}
          language={language}
          fontSize={fontSize}
        />
      </div>
    </div>
  );
}
