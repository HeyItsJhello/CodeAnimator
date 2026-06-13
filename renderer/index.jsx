import { Composition, registerRoot } from 'remotion';
import { CodeAnimation, calculateMetadata } from './CodeAnimation.jsx';

const RemotionRoot = () => {
  return (
    <Composition
      id="CodeAnimation"
      component={CodeAnimation}
      durationInFrames={300}
      fps={30}
      width={1280}
      height={720}
      calculateMetadata={calculateMetadata}
    />
  );
};

registerRoot(RemotionRoot);
