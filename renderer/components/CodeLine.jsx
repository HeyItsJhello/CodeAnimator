import { interpolate } from 'remotion';
import { SyntaxTokens } from './SyntaxTokens.jsx';
import { applyAnimation } from '../animations.js';

const GUTTER_COLOR = '#555566';

export function CodeLine({
  frame,
  lineNum,
  content,
  startFrame,
  durationFrames,
  animationType,
  syntaxColors,
  layout,
  compositionWidth,
  language,
}) {
  const { firstLine, lineHeight, fontSize, gutterChars, gutterPx, gutterPadLeft, gutterPadRight } = layout;

  const progress = interpolate(
    frame,
    [startFrame, startFrame + Math.max(durationFrames, 1)],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const { transform, opacity, charLimit } = applyAnimation(animationType, {
    progress, compositionWidth, lineHeight, contentLength: content.length,
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: (lineNum - firstLine) * lineHeight,
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
          boxSizing: 'border-box',
          width: gutterPx,
          paddingLeft: gutterPadLeft,
          paddingRight: gutterPadRight,
          flexShrink: 0,
          color: GUTTER_COLOR,
          fontSize,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'pre',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {String(lineNum).padStart(gutterChars, ' ')}
      </span>

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
          content={content}
          syntaxColors={syntaxColors}
          language={language}
          fontSize={fontSize}
          charLimit={charLimit}
        />
      </div>
    </div>
  );
}
