import { interpolate } from 'remotion';

const STRATEGIES = {
  slide_left: ({ progress, compositionWidth }) => ({
    transform: `translateX(${interpolate(progress, [0, 1], [-compositionWidth, 0])}px)`,
  }),

  fade_in: ({ progress }) => ({
    opacity: progress,
  }),

  drop_in: ({ progress, lineHeight }) => ({
    transform: `translateY(${interpolate(progress, [0, 1], [-lineHeight * 3, 0])}px)`,
  }),

  scale_in: ({ progress }) => ({
    transform: `scale(${Math.max(progress, 0.001)})`,
    opacity: progress,
  }),

  typewriter: ({ progress, contentLength }) => ({
    opacity: progress > 0 ? 1 : 0,
    charLimit: Math.round(progress * contentLength),
  }),
};

export function applyAnimation(animationType, params) {
  const strategy = STRATEGIES[animationType] ?? STRATEGIES.slide_left;
  return { transform: 'none', opacity: 1, charLimit: undefined, ...strategy(params) };
}
