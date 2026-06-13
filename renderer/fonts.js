import { delayRender, continueRender, staticFile } from 'remotion';
import { loadFont as loadJetBrainsMono, fontFamily as jetBrainsMonoFamily }   from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadFiraCode,       fontFamily as firaCodeFamily }         from '@remotion/google-fonts/FiraCode';
import { loadFont as loadSourceCodePro,  fontFamily as sourceCodeProFamily }    from '@remotion/google-fonts/SourceCodePro';
import { loadFont as loadRobotoMono,     fontFamily as robotoMonoFamily }        from '@remotion/google-fonts/RobotoMono';
import { loadFont as loadIBMPlexMono,    fontFamily as ibmPlexMonoFamily }       from '@remotion/google-fonts/IBMPlexMono';
import { loadFont as loadInconsolata,    fontFamily as inconsolataFamily }       from '@remotion/google-fonts/Inconsolata';
import { loadFont as loadSpaceMono,      fontFamily as spaceMonoFamily }         from '@remotion/google-fonts/SpaceMono';
import { loadFont as loadShareTechMono,  fontFamily as shareTechMonoFamily }     from '@remotion/google-fonts/ShareTechMono';
import { loadFont as loadPTMono,         fontFamily as ptMonoFamily }            from '@remotion/google-fonts/PTMono';
import { loadFont as loadAnonymousPro,   fontFamily as anonymousProFamily }      from '@remotion/google-fonts/AnonymousPro';
import { loadFont as loadVT323,          fontFamily as vt323Family }             from '@remotion/google-fonts/VT323';

const FONT_OPT = { weights: ['400'], subsets: ['latin'] };

const GOOGLE_FONTS = {
  jetbrains_mono:   { load: loadJetBrainsMono,  family: jetBrainsMonoFamily },
  fira_code:        { load: loadFiraCode,        family: firaCodeFamily },
  source_code_pro:  { load: loadSourceCodePro,   family: sourceCodeProFamily },
  roboto_mono:      { load: loadRobotoMono,       family: robotoMonoFamily },
  ibm_plex_mono:    { load: loadIBMPlexMono,      family: ibmPlexMonoFamily },
  inconsolata:      { load: loadInconsolata,      family: inconsolataFamily },
  space_mono:       { load: loadSpaceMono,        family: spaceMonoFamily },
  share_tech_mono:  { load: loadShareTechMono,   family: shareTechMonoFamily },
  pt_mono:          { load: loadPTMono,           family: ptMonoFamily },
  anonymous_pro:    { load: loadAnonymousPro,     family: anonymousProFamily },
  vt323:            { load: loadVT323,            family: vt323Family },
};

// Local fonts bundled in renderer/public/fonts/
const LOCAL_FONTS = {
  pixel_code: { file: 'fonts/PixelCode.ttf', format: 'truetype', family: 'Pixel Code' },
};

const localLoaded = new Set();

export function getFontFamily(fontKey) {
  const googleName = GOOGLE_FONTS[fontKey]?.family;
  const localName  = LOCAL_FONTS[fontKey]?.family;
  const name = googleName ?? localName ?? 'monospace';
  return name === 'monospace' ? 'monospace' : `'${name}', monospace`;
}

export function loadSelectedFont(fontKey) {
  const google = GOOGLE_FONTS[fontKey];
  if (google) {
    google.load('normal', FONT_OPT);
    return;
  }

  const local = LOCAL_FONTS[fontKey];
  if (local && !localLoaded.has(fontKey)) {
    localLoaded.add(fontKey);
    const handle = delayRender(`Loading local font: ${fontKey}`);
    const face = new FontFace(
      local.family,
      `url(${staticFile(local.file)}) format('${local.format}')`,
    );
    document.fonts.add(face);
    face.load()
      .then(() => continueRender(handle))
      .catch(() => continueRender(handle));
  }
}
