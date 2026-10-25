import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const HEADLINE = "Turn a code file into a video of it being typed.";

// The one animated moment on the page: the headline types itself in,
// the same way the rendered videos reveal code.
function useTypedText(text, msPerChar = 35) {
  const [count, setCount] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? text.length : 0
  );

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, msPerChar);
    return () => clearInterval(id);
  }, [text, msPerChar]);

  return text.slice(0, count);
}

function Hero() {
  const typed = useTypedText(HEADLINE);

  return (
    <section className="hero">
      <div className="hero__band" aria-hidden="true" />

      <div className="hero__copy">
        <h1 className="hero__headline" aria-label={HEADLINE}>
          <span aria-hidden="true">{typed}</span>
          {/* Reserves the final height so the layout doesn't jump while typing */}
          <span className="hero__headline-ghost" aria-hidden="true">
            {HEADLINE}
          </span>
        </h1>

        <p className="hero__lede">
          Pick the lines, group them, set the timing. You get an MP4 up to
          4K60. Free, open source, and no account.
        </p>

        <div className="hero__actions">
          <Link to="/" className="pixel-btn pixel-btn--primary">
            Try it online
          </Link>
        </div>
      </div>

      <figure className="hero__demo">
        <video
          className="hero__demo-video"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src="/demo.mp4" type="video/mp4" />
        </video>
        <figcaption className="hero__demo-caption">
          Rendered with Code Animator
        </figcaption>
      </figure>
    </section>
  );
}

export default Hero;
