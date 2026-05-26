// Lantern Design System — D12 Scholar's Study II
// Source of truth for all design tokens.
// Import this wherever you need typed access to the palette.

export const FONTS = {
  serif: "'Playfair Display', Georgia, serif",
  sans:  "'Inter', system-ui, sans-serif",
  mono:  "'JetBrains Mono', 'Fira Mono', monospace",
}

export const DARK = {
  // ── Page & surface ──────────────────────────────────────────────────────────
  bg:            '#0A1A1E',  // deepest layer — page background
  cardBase:      '#101E26',  // reading shelf cards
  cardDeep:      '#162836',  // secondary card layer / hover target
  cardHover:     '#1C3040',  // card hover state
  cardArchival:  '#0C1820',  // finished / archived books

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary:   '#D8CCBA',  // headings, active content — warm off-white
  textSecondary: '#A89E8E',  // body, author names, secondary labels
  textDim:       '#5C7080',  // metadata, section labels, inactive states

  // ── Accent (spatial blue) ───────────────────────────────────────────────────
  accent:        '#3C7AAA',
  accentDim:     'rgba(60,122,170,.18)',

  // ── Structural lines ─────────────────────────────────────────────────────────
  separator:     'rgba(60,122,170,.16)',
  separatorSoft: 'rgba(60,122,170,.10)',

  // ── Companion (shadow entity) ────────────────────────────────────────────────
  companionBg:      '#090F14',  // shadowed — darker than page but present
  companionHoverBg: '#0F1E2C',  // lifts slightly on hover

  // ── Atmospheric gradients ────────────────────────────────────────────────────
  glow:         'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(40,110,160,.16) 0%, transparent 65%)',
  mysticalGlow: 'radial-gradient(circle 400px at 15% 40%, rgba(30,90,130,.08) 0%, transparent 70%)',

  // ── Gold (hierarchy + companion border) ─────────────────────────────────────
  goldFoil:      'linear-gradient(135deg, #7A5A28 0%, #C4A058 40%, #F0D898 60%, #8A6830 100%)',
  goldAccent:    '#C4A058',
  goldDim:       'rgba(196,160,88,.22)',
  goldGlow:      '0 0 32px rgba(196,160,88,.18), 0 4px 28px rgba(0,0,0,.60)',
  goldGlowHover: '0 0 52px rgba(196,160,88,.38), 0 8px 44px rgba(0,0,0,.70)',
}

export const LIGHT = {
  // ── Page & surface ──────────────────────────────────────────────────────────
  bg:            '#FAF6EE',  // warm parchment
  cardBase:      '#FFFFFF',
  cardDeep:      '#F3EDE2',
  cardHover:     '#EDE5D8',
  cardArchival:  '#F7F1E6',

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary:   '#1C1410',  // near-black warm ink
  textSecondary: '#5C4828',  // cognac — legible warm brown
  textDim:       '#9A8868',  // metadata, labels

  // ── Accent (cognac gold) ────────────────────────────────────────────────────
  accent:        '#8A6028',
  accentDim:     'rgba(138,96,40,.12)',

  // ── Structural lines ─────────────────────────────────────────────────────────
  separator:     'rgba(138,96,40,.14)',
  separatorSoft: 'rgba(138,96,40,.08)',

  // ── Companion (warm parchment entity) ────────────────────────────────────────
  companionBg:      '#EDE3D0',
  companionHoverBg: '#E5D8C0',

  // ── Atmospheric gradients ────────────────────────────────────────────────────
  glow:         'radial-gradient(ellipse 80% 50% at 50% -5%, rgba(196,160,88,.18) 0%, transparent 65%)',
  mysticalGlow: 'radial-gradient(circle 400px at 15% 40%, rgba(196,160,88,.10) 0%, transparent 70%)',

  // ── Gold ─────────────────────────────────────────────────────────────────────
  goldFoil:      'linear-gradient(135deg, #A07A40 0%, #D8C490 40%, #F0E4B8 60%, #B89060 100%)',
  goldAccent:    '#8A6028',
  goldDim:       'rgba(138,96,40,.18)',
  goldGlow:      '0 0 20px rgba(138,96,40,.14), 0 4px 20px rgba(0,0,0,.10)',
  goldGlowHover: '0 0 36px rgba(138,96,40,.28), 0 8px 32px rgba(0,0,0,.16)',
}

// ── Typography scale ──────────────────────────────────────────────────────────
// All sizes in px. Line heights are unitless multipliers.
export const TYPE = {
  // Display / hero
  bookTitle:     { size: 28, weight: 600, leading: 1.1,  tracking: '-0.02em', font: 'serif' },
  sectionHeading:{ size: 22, weight: 600, leading: 1.2,  tracking: '-0.01em', font: 'serif' },
  chapterNumber: { size: 28, weight: 700, leading: 1.0,  tracking: '-0.02em', font: 'serif' },

  // Body
  companionThought:{ size: 17, weight: 400, leading: 1.75, style: 'italic', font: 'serif' },
  bodyPrimary:    { size: 15, weight: 400, leading: 1.65, font: 'serif'  },
  bodySecondary:  { size: 14, weight: 400, leading: 1.6,  font: 'serif'  },
  bodySmall:      { size: 13, weight: 400, leading: 1.5,  font: 'serif'  },

  // UI chrome
  tabLabel:       { size: 14, weight: 400, leading: 1.0,  font: 'sans'   },
  bookCardTitle:  { size: 17, weight: 600, leading: 1.2,  font: 'serif'  },
  authorName:     { size: 13, weight: 400, leading: 1.0,  style: 'italic', font: 'serif' },
  statMeta:       { size: 12, weight: 400, leading: 1.0,  font: 'sans'   },

  // Labels / caps
  sectionLabel:   { size: 12, weight: 700, leading: 1.0,  tracking: '0.09em', transform: 'uppercase', font: 'sans' },
  zoneLabel:      { size: 11, weight: 700, leading: 1.0,  tracking: '0.08em', transform: 'uppercase', font: 'sans' },
  microLabel:     { size: 11, weight: 400, leading: 1.0,  tracking: '0.06em', transform: 'uppercase', font: 'sans' },
}

// ── Spacing ───────────────────────────────────────────────────────────────────
// Base unit: 4px. All values in px.
export const SPACE = {
  0:   0,
  1:   4,
  2:   8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  7:  28,
  8:  32,
  10: 40,
  12: 48,
  14: 56,
  20: 80,

  // Semantic
  pagePad:      40,  // horizontal page margin
  maxWidth:   1000,  // content column max-width
  cardPad:      16,  // card internal padding
  companionPad: 22,  // companion panel internal padding
  sectionGap:   40,  // vertical gap between page sections
  cardGap:      16,  // gap between library cards
  companionGap: 48,  // gap between main column and companion
}

// ── Radii ─────────────────────────────────────────────────────────────────────
export const RADIUS = {
  card:      12,
  cardLarge: 16,
  companion: 20,    // outer gold foil wrapper
  companionInner: 18.5,  // inner companion panel
  pill:       99,
  tab:         8,
}

// ── Motion ────────────────────────────────────────────────────────────────────
export const MOTION = {
  fast:     'all .12s ease',
  standard: 'all .28s ease',
  thought:  'opacity .48s ease',  // companion text fade
  hover:    'all .28s ease',      // companion hover lift
}
