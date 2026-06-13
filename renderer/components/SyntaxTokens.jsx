import { Highlight } from 'prism-react-renderer';

const PRISM_TO_KEY = {
  keyword: 'keywords',
  'class-name': 'types',
  builtin: 'types',
  function: 'functions',
  string: 'strings',
  'template-string': 'strings',
  number: 'numbers',
  comment: 'comments',
  decorator: 'decorators',
};

const DEFAULTS = {
  keywords: '#FF3D3D',
  types: '#00FF9B',
  functions: '#00ECFF',
  strings: '#FFE040',
  numbers: '#80FFE8',
  comments: '#8899A6',
  decorators: '#FF3D3D',
  default: '#E8E8E8',
};

function resolveColor(types, userColors) {
  const colors = { ...DEFAULTS, ...userColors };
  for (const t of types) {
    const key = PRISM_TO_KEY[t];
    if (key && colors[key]) return colors[key];
  }
  return colors.default;
}

export function SyntaxTokens({ lineNum, content, syntaxColors, gutterWidth, fontSize }) {
  const gutterStr = String(lineNum).padStart(gutterWidth, ' ');

  return (
    <span style={{ display: 'flex', whiteSpace: 'pre', fontSize, lineHeight: 1 }}>
      <span
        style={{
          color: '#555566',
          marginRight: 16,
          userSelect: 'none',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {gutterStr}
      </span>
      <Highlight code={content || ''} language="python" theme={{ plain: {}, styles: [] }}>
        {({ tokens, getTokenProps }) =>
          (tokens[0] || []).map((token, i) => (
            <span
              key={i}
              {...getTokenProps({ token })}
              style={{ color: resolveColor(token.types, syntaxColors) }}
            />
          ))
        }
      </Highlight>
    </span>
  );
}
