import { useState, useCallback } from 'react';
import {
  DEFAULT_SYNTAX_COLORS,
  DEFAULT_TIMING_STR,
  DEFAULT_ANIMATION_TYPE,
  DEFAULT_FONT,
} from '../config/constants';

export function useAnimationSettings() {
  const [includeComments, setIncludeComments] = useState(true);
  const [syntaxColors,    setSyntaxColors]    = useState({ ...DEFAULT_SYNTAX_COLORS });
  const [orientation,     setOrientation]     = useState('landscape');
  const [quality,         setQuality]         = useState('standard');
  const [animationTiming, setAnimationTiming] = useState({ ...DEFAULT_TIMING_STR });
  const [animationType,   setAnimationType]   = useState(DEFAULT_ANIMATION_TYPE);
  const [font,            setFont]            = useState(DEFAULT_FONT);

  const updateTiming = useCallback((key, value) =>
    setAnimationTiming((prev) => ({ ...prev, [key]: value })), []);

  const resetTiming = useCallback(() =>
    setAnimationTiming({ ...DEFAULT_TIMING_STR }), []);

  const resetSettings = useCallback(() => {
    setQuality('standard');
    setAnimationType(DEFAULT_ANIMATION_TYPE);
  }, []);

  return {
    includeComments, setIncludeComments,
    syntaxColors, setSyntaxColors,
    orientation, setOrientation,
    quality, setQuality,
    animationTiming, updateTiming, resetTiming,
    animationType, setAnimationType,
    font, setFont,
    resetSettings,
  };
}
