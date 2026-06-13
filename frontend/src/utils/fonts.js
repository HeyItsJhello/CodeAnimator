const _injected = new Set();

const _FONT_PARAMS = {
    "jetbrains_mono":  "JetBrains+Mono:wght@400;500",
    "fira_code":       "Fira+Code:wght@400;500",
    "source_code_pro": "Source+Code+Pro:wght@400;500",
    "roboto_mono":     "Roboto+Mono:wght@400;500",
    "ibm_plex_mono":   "IBM+Plex+Mono:wght@400;500",
    "inconsolata":     "Inconsolata:wght@400;500",
    "space_mono":      "Space+Mono:wght@400;700",
    "share_tech_mono": "Share+Tech+Mono",
    "pt_mono":         "PT+Mono",
    "courier_new":     null,  // system font — no load needed
    "anonymous_pro":   "Anonymous+Pro:ital,wght@0,400;0,700;1,400",
    "pixel_code":      null,  // bundled locally
    "vt323":           "VT323",
};

/**
 * Lazily inject a Google Fonts stylesheet for each requested font key.
 * Already-injected fonts are skipped. System / locally-bundled fonts are no-ops.
 */
export function ensureFontsLoaded(fontKeys) {
    const toLoad = fontKeys
        .map((k) => _FONT_PARAMS[k])
        .filter((param) => param && !_injected.has(param));

    if (!toLoad.length) return;

    const query = toLoad.map((p) => `family=${p}`).join("&");
    const href = `https://fonts.googleapis.com/css2?${query}&display=swap`;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);

    toLoad.forEach((p) => _injected.add(p));
}
