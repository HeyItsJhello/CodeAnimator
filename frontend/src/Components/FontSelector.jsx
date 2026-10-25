import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { FONT_OPTIONS } from "../config/constants";
import { ensureFontsLoaded } from "../utils/fonts";

const CATEGORIES = [
  { key: "system",    label: "System"    },
  { key: "modern",    label: "Modern"    },
  { key: "geometric", label: "Geometric" },
  { key: "classic",   label: "Classic"   },
  { key: "retro",     label: "Retro"     },
];

const SAMPLE = "fn(x) => x * 2";

const findFont = (font) => FONT_OPTIONS.find((f) => f.value === font) ?? FONT_OPTIONS[0];

// The button in the Look panel that opens the font screen.
export function FontTrigger({ font, onOpen }) {
  const current = findFont(font);
  return (
    <button type="button" className="font-trigger" onClick={onOpen}>
      <span className="font-trigger-preview" style={{ fontFamily: current.family }}>
        {current.label}
      </span>
      <span className="font-trigger-meta">
        <span className="font-trigger-desc">{current.desc}</span>
        <span className="font-trigger-arrow">▶</span>
      </span>
    </button>
  );
}

// Full-sidebar font picker. Closes on Escape, the back button, or a click outside it.
function FontScreen({ font, onFontChange, onClose }) {
  const screenRef = useRef(null);

  useEffect(() => {
    ensureFontsLoaded(FONT_OPTIONS.map((f) => f.value));
    const onMouse = (e) => {
      if (screenRef.current && !screenRef.current.contains(e.target)) onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={screenRef}
      className="font-screen"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
    >
      <button type="button" className="font-screen__back" onClick={onClose}>
        <span aria-hidden="true">◀</span> Font
      </button>
      {CATEGORIES.map((cat) => {
        const fonts = FONT_OPTIONS.filter((f) => f.category === cat.key);
        if (!fonts.length) return null;
        return (
          <div key={cat.key} className="font-category">
            <div className="font-category-label">{cat.label}</div>
            {fonts.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`font-option ${font === opt.value ? "active" : ""}`}
                onClick={() => onFontChange(opt.value)}
              >
                <span className="font-option-name" style={{ fontFamily: opt.family }}>
                  {opt.label}
                </span>
                <span className="font-option-sample" style={{ fontFamily: opt.family }}>
                  {SAMPLE}
                </span>
              </button>
            ))}
          </div>
        );
      })}
    </motion.div>
  );
}

export default FontScreen;
