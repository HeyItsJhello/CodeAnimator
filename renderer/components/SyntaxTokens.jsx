import { Highlight, Prism } from 'prism-react-renderer';
import { resolveColor } from '../syntax.js';

export function SyntaxTokens({ content, syntaxColors, language = 'python', fontSize, charLimit }) {
  const lang = Prism.languages[language] ? language : 'python';

  return (
    <Highlight code={content || ''} language={lang} theme={{ plain: {}, styles: [] }}>
      {({ tokens }) => {
        const line = tokens[0] || [];
        let remaining = charLimit !== undefined ? charLimit : Infinity;

        return (
          <span style={{ display: 'inline', whiteSpace: 'pre', tabSize: 4, fontSize, lineHeight: 1 }}>
            {line.map((token, i) => {
              if (remaining <= 0) return null;
              const text = charLimit !== undefined
                ? token.content.slice(0, remaining)
                : token.content;
              remaining -= token.content.length;
              return (
                <span key={i} style={{ color: resolveColor(token.types, syntaxColors) }}>
                  {text}
                </span>
              );
            })}
          </span>
        );
      }}
    </Highlight>
  );
}
