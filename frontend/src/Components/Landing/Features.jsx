// The feature list, written as the thing it describes: a code file.
const spec = [
  { key: "languages", value: '"20+"', comment: "Python, JS, TS, Go, Rust, C++, GDScript…" },
  { key: "lineGroups", value: "true", comment: "reveal lines together, split long ones, time each" },
  { key: "syntaxColors", value: '"yours"', comment: "every color is editable" },
  { key: "output", value: '"MP4, up to 4K60"' },
  { key: "renderTime", value: '"under a minute"', comment: "at 1080p; 4K takes about twice as long" },
  { key: "account", value: "null", comment: "none needed" },
  { key: "yourCode", value: '"deleted after render"', comment: "videos too, once downloaded" },
];

function valueClass(value) {
  if (value.startsWith('"') || value.startsWith("[")) return "spec__string";
  return "spec__literal";
}

function Features() {
  return (
    <section id="features" className="features">
      <h2 className="section-title">What it does</h2>

      <pre className="spec" aria-label="Code Animator features">
        <code>
          <span className="spec__keyword">const</span> codeAnimator = {"{\n"}
          {spec.map(({ key, value, comment }) => (
            <span key={key} className="spec__line">
              {"  "}
              <span className="spec__key">{key}</span>: <span className={valueClass(value)}>{value}</span>,
              {comment && <span className="spec__comment">{"  // " + comment}</span>}
              {"\n"}
            </span>
          ))}
          {"};"}
        </code>
      </pre>
    </section>
  );
}

export default Features;
