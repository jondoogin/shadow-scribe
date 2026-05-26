# Shadow Scribe — Color System

---

## Philosophy

The color system is built around the experience of reading in warm light. **Cream and ink** are the ground. **Gold** is the accent of attention — used sparingly, like the gilt edge of a fine book. The six companion moods provide emotional personalization per-book without ever becoming garish.

Colors in Shadow Scribe should feel **made of light and paper**, not pixels and glass.

---

## Base Palette

### Cream (Background + Surface)

| Token | Hex | Usage |
|-------|-----|-------|
| `cream-50` | `#FFFDF9` | Page background, highest surface |
| `cream` | `#FAF8F3` | App background (body) |
| `cream-200` | `#F2EBE0` | Subtle section fills |
| `cream-300` | `#E8DDD0` | Deeper dividers, muted fills |

### Ink (Text + Structure)

| Token | Hex | Usage |
|-------|-----|-------|
| `ink` / `ink-900` | `#1C1917` | Primary text, headings |
| `ink-800` | `#292524` | Secondary text |
| `ink-700` | `#44403C` | Tertiary text, labels |
| `ink-600` | `#57534E` | Muted text |
| `ink-500` | `#78716C` | Metadata, captions |
| `ink-400` | `#A8A29E` | Placeholder, disabled |
| `ink-300` | `#D6D3D1` | Subtle borders |
| `ink-200` | `#E7E5E0` | Standard borders |
| `ink-100` | `#F5F5F4` | Background fills, hover states |

### Gold (Primary Accent)

| Token | Hex | Usage |
|-------|-----|-------|
| `gold` | `#B8860B` | Active tabs, CTAs, focused inputs |
| `gold-light` | `#D4AF37` | Hover state for gold CTAs |
| `gold-pale` | `#F5E6BC` | Very subtle accent fill |
| `gold-bg` | `#FDF8EC` | Accent section backgrounds |
| `gold-border` | `#E8D090` | Accent section borders |

Gold is **warm brass, not yellow**. It evokes old book gilt, candlelight, antique typography. It should never feel playful or energetic.

---

## Companion Mood Palette

Each companion has a mood that scopes six CSS custom properties to its context via `data-mood`:

```css
--ca        /* accent color */
--ca-l      /* accent lighter (hover) */
--ca-bg     /* accent background fill */
--ca-border /* accent border color */
```

| Mood | `--ca` | Emotional register |
|------|--------|-------------------|
| `gold` | `#B8860B` | Warmth, anticipation, classical |
| `sage` | `#3A6647` | Quiet, natural, contemplative |
| `ember` | `#9B2335` | Intense, dark, dramatic |
| `ink` | `#44403C` | Austere, literary, understated |
| `sienna` | `#8B4513` | Earthy, old paper, warmth |
| `steel` | `#2D4A6B` | Cold, precise, cerebral |

### Mood Usage Rule

`var(--ca, #B8860B)` — always with a gold fallback. The mood system touches:
- Progress bar fill
- Active tab underline
- Percentage text
- Button accent class (`.btn-accent`)
- Insight strip background
- BookCard title hover color

The mood accent should never be used as a large background color. It is an **edge light**, not a fill.

---

## Semantic Colors

| Color | Hex | Semantic role |
|-------|-----|---------------|
| `ember` | `#9B2335` | All destructive actions — delete confirms, remove buttons |
| `sage` | `#3A6647` | Success states — resolved mysteries, export confirmation |
| `sienna` | `#8B4513` | Warning/error states — image upload errors, cautions |

### Destructive UI Pattern

Destructive actions use ember with restraint:
- **Resting state**: `text-ink-400 italic` — quiet, non-threatening
- **Initiation**: `hover:text-ember` — reveals destructive intent on hover
- **Confirmation button**: `bg-ember text-white` — commitment is clear

Never show an ember-colored button at rest. The reader should never feel ambushed by a destructive action.

---

## Forbidden Color Patterns

- No pure black (`#000`) or pure white (`#fff`) anywhere in the app chrome
- No high-saturation accent colors (no `#FF0000`, no electric blue, no neon anything)
- No mood accent colors as full-section backgrounds — only as tints (`--ca-bg`)
- No `text-ink-900` on anything but cream surfaces — never on colored backgrounds
- No `background: white` in the main app — use cream-50 instead

---

## Light Mode Color Relationships

```
Page:         cream (#FAF8F3)    ← base tone, warm paper
Surfaces:     cream-50 (#FFFDF9) ← cards, modals — slightly lighter
Borders:      ink-200 (#E7E5E0)  ← standard; ink-100 for subtler dividers
Text primary: ink-900 (#1C1917)
Text meta:    ink-400/500        ← dates, captions, labels
Accent:       gold (#B8860B) / var(--ca)
Grain:        SVG fractal noise at opacity 0.022, multiply blend
Ambient:      radial gold gradient at opacity 0.04, fixed position
```

The page feels like aged vellum under warm lamplight.
