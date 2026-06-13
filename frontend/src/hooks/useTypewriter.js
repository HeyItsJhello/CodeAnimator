import { useState, useRef, useEffect } from 'react';

export function useTypewriter(text, intervalMs = 28) {
  const [typed, setTyped] = useState('');
  const posRef = useRef(0);

  useEffect(() => {
    posRef.current = 0;
    setTyped('');
    const id = setInterval(() => {
      posRef.current += 1;
      setTyped(text.slice(0, posRef.current));
      if (posRef.current >= text.length) clearInterval(id);
    }, intervalMs);
    return () => clearInterval(id);
  }, [text, intervalMs]);

  return typed;
}
