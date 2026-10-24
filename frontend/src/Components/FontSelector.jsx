import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

function FontSelector({ font, onFontChange }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const current = FONT_OPTIONS.find((f) => f.value === font) ?? FONT_OPTIONS[0];

  useEffect(() => {
    const onMouse = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onMouse);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouse);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="font-selector" ref={containerRef}>
      <button
        type="button"
        className={`font-trigger ${open ? "open" : ""}`}
        onClick={() => {
          if (!open) ensureFontsLoaded(FONT_OPTIONS.map((f) => f.value));
          setOpen((o) => !o);
        }}
      >
        <span className="font-trigger-preview" style={{ fontFamily: current.family }}>
          {current.label}
        </span>
        <span className="font-trigger-meta">
          <span className="font-trigger-desc">{current.desc}</span>
          <span className="font-trigger-arrow">{open ? "▲" : "▼"}</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="font-dropdown"
            initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
            animate={{ opacity: 1, y: 0,  scaleY: 1     }}
            exit={{    opacity: 0, y: -6, scaleY: 0.96 }}
            transition={{ duration: 0.12 }}
            style={{ transformOrigin: "top" }}
          >
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
                      onClick={() => { onFontChange(opt.value); setOpen(false); }}
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
        )}
      </AnimatePresence>
    </div>
  );
}

export default FontSelector;
