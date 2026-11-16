// Five candidate design directions for Lantern. Each one keeps the existing
// logo (✦ + "Lantern" in Libre Baskerville) and defines its own tokens for
// light and dark, its type pairing and one signature visual feature.

export const FONT_HREF =
  'https://fonts.googleapis.com/css2?' + [
    'family=Plus+Jakarta+Sans:wght@400..700',
    'family=Literata:ital,wght@0,400..600;1,400',
    'family=Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,400',
    'family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400',
    'family=Manrope:wght@400..800',
    'family=Source+Serif+4:ital,opsz,wght@0,8..60,400..600;1,8..60,400',
    'family=Space+Grotesk:wght@400..700',
    'family=Lora:ital,wght@0,400..600;1,400',
    'family=Caveat:wght@500..700',
    'family=Sora:wght@300..700',
    'family=Spectral:ital,wght@0,400;0,500;1,400',
    'family=Libre+Baskerville:wght@400;700',
  ].join('&') + '&display=swap'

export const DIRECTIONS = [
  {
    id: 'aurora',
    name: 'Aurora',
    tagline: 'Soft light, always moving',
    signature: 'Shifting ambient gradient',
    blurb: 'A bright, airy base with slow, glowing colour fields drifting behind frosted cards. Calm, modern and easy on the eyes.',
    defaultMode: 'light',
    fonts: { ui: '"Plus Jakarta Sans", system-ui, sans-serif', display: '"Plus Jakarta Sans", system-ui, sans-serif', read: '"Literata", Georgia, serif' },
    displayWeight: 700, displayTracking: '-0.02em',
    shape: { radius: '22px', radiusSm: '14px', cardBorder: '1px solid var(--border)', cardShadow: '0 10px 30px -12px rgba(40,20,80,.18)', blur: '18px' },
    light: {
      bg: '#F7F5FB', surface: 'rgba(255,255,255,.72)', surface2: 'rgba(255,255,255,.5)', border: 'rgba(60,40,110,.10)',
      text: '#16142A', text2: '#4A4766', text3: '#6E6A8A',
      accent: '#7C4DFF', accent2: '#FF7A59', accentInk: '#FFFFFF', accentSoft: 'rgba(124,77,255,.12)',
      glow: 'rgba(124,77,255,.35)', blobs: ['#C9B6FF', '#FFC2A8', '#A8E6DB', '#FFB3D1'],
    },
    dark: {
      bg: '#0E0C1A', surface: 'rgba(30,26,52,.62)', surface2: 'rgba(40,34,70,.5)', border: 'rgba(200,190,255,.12)',
      text: '#F4F2FF', text2: '#C4BFE0', text3: '#9C97BC',
      accent: '#A88BFF', accent2: '#FF9A7A', accentInk: '#120E24', accentSoft: 'rgba(168,139,255,.16)',
      glow: 'rgba(168,139,255,.45)', blobs: ['#5B3FD1', '#D0583A', '#1E8C7E', '#B23B7A'],
    },
  },
  {
    id: 'folio',
    name: 'Folio',
    tagline: 'Editorial, crisp, confident',
    signature: 'Live sky that follows the time of day',
    blurb: 'Magazine-grade typography on clean paper white. A band of sky at the top of every screen shifts from dawn to noon to dusk to starry night with your clock.',
    defaultMode: 'light',
    fonts: { ui: '"Inter", system-ui, sans-serif', display: '"Fraunces", Georgia, serif', read: '"Newsreader", Georgia, serif' },
    displayWeight: 600, displayTracking: '-0.025em',
    shape: { radius: '6px', radiusSm: '4px', cardBorder: '1px solid var(--border)', cardShadow: 'none', blur: '0px' },
    light: {
      bg: '#FFFDF9', surface: '#FFFFFF', surface2: '#F6F2EA', border: 'rgba(22,19,15,.12)',
      text: '#16130F', text2: '#4B453C', text3: '#6F675B',
      accent: '#E0482A', accent2: '#16130F', accentInk: '#FFFFFF', accentSoft: 'rgba(224,72,42,.08)',
      glow: 'rgba(224,72,42,.25)',
    },
    dark: {
      bg: '#14120F', surface: '#1C1915', surface2: '#24201B', border: 'rgba(255,248,235,.12)',
      text: '#F7F2EA', text2: '#CFC6B8', text3: '#A39A8C',
      accent: '#FF6B4A', accent2: '#F7F2EA', accentInk: '#14120F', accentSoft: 'rgba(255,107,74,.12)',
      glow: 'rgba(255,107,74,.3)',
    },
  },
  {
    id: 'glass',
    name: 'Glasshouse',
    tagline: 'Every book brings its own colour',
    signature: 'Colours pulled from the book you’re in',
    blurb: 'Frosted glass panes over a vivid colour field made from the current book’s cover. Tap a different book and the whole app re-tints to match it.',
    defaultMode: 'dark',
    fonts: { ui: '"Manrope", system-ui, sans-serif', display: '"Manrope", system-ui, sans-serif', read: '"Source Serif 4", Georgia, serif' },
    displayWeight: 800, displayTracking: '-0.03em',
    shape: { radius: '26px', radiusSm: '16px', cardBorder: '1px solid var(--border)', cardShadow: '0 20px 40px -20px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.18)', blur: '28px' },
    light: {
      bg: '#F2F4F7', surface: 'rgba(255,255,255,.62)', surface2: 'rgba(255,255,255,.42)', border: 'rgba(255,255,255,.7)',
      text: '#0D1117', text2: '#39414D', text3: '#5A6372',
      accent: '#0D1117', accent2: '#0D1117', accentInk: '#FFFFFF', accentSoft: 'rgba(13,17,23,.08)',
      glow: 'rgba(255,255,255,.6)',
    },
    dark: {
      bg: '#07090D', surface: 'rgba(18,22,30,.48)', surface2: 'rgba(255,255,255,.07)', border: 'rgba(255,255,255,.14)',
      text: '#FFFFFF', text2: 'rgba(255,255,255,.80)', text3: 'rgba(255,255,255,.62)',
      accent: '#FFFFFF', accent2: '#FFFFFF', accentInk: '#07090D', accentSoft: 'rgba(255,255,255,.12)',
      glow: 'rgba(255,255,255,.35)',
    },
  },
  {
    id: 'margin',
    name: 'Margin',
    tagline: 'Bold, playful, hand-annotated',
    signature: 'Hand-drawn marginalia that draws itself',
    blurb: 'Chunky outlines, sunny colour blocks and big friendly type. Your companion scribbles underlines, circles and notes in the margins as you read.',
    defaultMode: 'light',
    fonts: { ui: '"Space Grotesk", system-ui, sans-serif', display: '"Space Grotesk", system-ui, sans-serif', read: '"Lora", Georgia, serif', hand: '"Caveat", cursive' },
    displayWeight: 700, displayTracking: '-0.03em',
    shape: { radius: '16px', radiusSm: '12px', cardBorder: '2px solid var(--text)', cardShadow: '4px 4px 0 var(--text)', blur: '0px' },
    light: {
      bg: '#FBF6EC', surface: '#FFFFFF', surface2: '#FFF1C9', border: '#141414',
      text: '#141414', text2: '#3A3833', text3: '#5E5A52',
      accent: '#2F5BFF', accent2: '#FF6B4A', accentInk: '#FFFFFF', accentSoft: '#E3E9FF',
      glow: 'transparent', blocks: ['#FFD23F', '#FF8FAB', '#7BE0AD', '#8EC5FF'], ink: '#FF4D2E',
    },
    dark: {
      bg: '#17161A', surface: '#222127', surface2: '#2C2A22', border: '#F4EFE4',
      text: '#F4EFE4', text2: '#D4CFC4', text3: '#ABA698',
      accent: '#7C9BFF', accent2: '#FF8A6E', accentInk: '#141414', accentSoft: '#2A3150',
      glow: 'transparent', blocks: ['#E8B923', '#E06C8C', '#46B884', '#5E9EE8'], ink: '#FF7A5C',
    },
  },
  {
    id: 'lumen',
    name: 'Lumen',
    tagline: 'A lantern in a dark room',
    signature: 'A pool of light that follows your finger',
    blurb: 'Deep, clean black with crisp warm-white text and a soft lantern beam that follows your touch and drifts when you’re still. Built for night reading.',
    defaultMode: 'dark',
    fonts: { ui: '"Sora", system-ui, sans-serif', display: '"Sora", system-ui, sans-serif', read: '"Spectral", Georgia, serif' },
    displayWeight: 600, displayTracking: '-0.02em',
    shape: { radius: '20px', radiusSm: '12px', cardBorder: '1px solid var(--border)', cardShadow: 'none', blur: '12px' },
    light: {
      bg: '#FAF7F1', surface: 'rgba(255,255,255,.8)', surface2: '#F1ECE2', border: 'rgba(40,30,10,.10)',
      text: '#1A160E', text2: '#4A4335', text3: '#6E6656',
      accent: '#C26A00', accent2: '#E88A1A', accentInk: '#FFFFFF', accentSoft: 'rgba(194,106,0,.10)',
      glow: 'rgba(255,170,60,.28)',
    },
    dark: {
      bg: '#09090B', surface: 'rgba(24,23,27,.72)', surface2: 'rgba(255,255,255,.05)', border: 'rgba(255,240,215,.10)',
      text: '#F6F1E7', text2: '#CFC7B8', text3: '#9E978A',
      accent: '#FFB547', accent2: '#FF8A3D', accentInk: '#1A1206', accentSoft: 'rgba(255,181,71,.12)',
      glow: 'rgba(255,170,60,.22)',
    },
  },
]

export const SCREENS = [
  { id: 'library', label: 'Library' },
  { id: 'companion', label: 'Companion' },
  { id: 'reader', label: 'Reader' },
  { id: 'listen', label: 'Listen' },
]

// CSS custom properties for a direction in a given mode.
export function tokensFor(dir, mode) {
  const t = dir[mode]
  return {
    '--bg': t.bg, '--surface': t.surface, '--surface-2': t.surface2, '--border': t.border,
    '--text': t.text, '--text-2': t.text2, '--text-3': t.text3,
    '--accent': t.accent, '--accent-2': t.accent2, '--accent-ink': t.accentInk, '--accent-soft': t.accentSoft,
    '--glow': t.glow, '--ink': t.ink || t.accent,
    '--font-ui': dir.fonts.ui, '--font-display': dir.fonts.display, '--font-read': dir.fonts.read,
    '--font-hand': dir.fonts.hand || dir.fonts.read,
    '--display-weight': dir.displayWeight, '--display-tracking': dir.displayTracking,
    '--radius': dir.shape.radius, '--radius-sm': dir.shape.radiusSm,
    '--card-border': dir.shape.cardBorder, '--card-shadow': dir.shape.cardShadow, '--blur': dir.shape.blur,
  }
}
