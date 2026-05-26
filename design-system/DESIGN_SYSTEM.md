# Lantern Design System — Scholar's Study II

Visual identity reference and implementation guide for Claude Code.

**Visual references:** `../screenshots/d12-dark.png` · `../screenshots/d12-light.png`  
**Token source of truth:** `tokens.js` (JS) · `tokens.css` (CSS custom properties)

---

## Design Principles

### 1. Archival warmth, not cold utility
Every surface should feel like it has been read before. Dark mode is a study at night — deep teal-black, ink-warm text, no blue-white anywhere. Light mode is aged parchment — cream, cognac, warm shadow. Neither mode is "neutral."

### 2. Gold marks what matters
Gold is the single accent color and it carries meaning. It appears on: the active book's progress bar, the active tab indicator, the companion panel border, interactive links, and the Lantern logo star. It should never appear as decoration — only as a signal.

### 3. The companion is a presence, not a widget
The companion panel sits outside the normal card system. In dark mode it is darker than the page (a shadow entity). In light mode it is a distinct warm parchment. It has a gold foil gradient border that acts as the strongest visual affordance on the page. It lifts and glows on hover — it "comes alive." This animation is intentional and should be preserved.

### 4. Depth through layering, not borders
Surface hierarchy is expressed by color value, not by borders. In dark mode: page → card → card-deep → companion (darkest). In light mode: page → card-archival → card-deep → card-base (lightest, most elevated). Borders are only used for separators and the companion's gold foil outline.

### 5. Typography is the architecture
Playfair Display carries all editorial weight. Inter is strictly for UI chrome (tabs, labels, stats). No sans-serif in body copy, companion text, or book titles. Section labels are always uppercase + widely tracked.

### 6. Spatial layout
Max content width: 1000px, 40px horizontal padding each side. The book detail view is a two-column grid: `1fr 360px`, 48px gap. The companion is `position: sticky; top: 24px` — it floats as you scroll the tab content.

---

## Color Tokens

All tokens exist in both `DARK` and `LIGHT` variants. See `tokens.js` for values, `tokens.css` for CSS custom properties.

### Surface hierarchy (dark mode, darkest → lightest)
| Token | Value | Role |
|---|---|---|
| `companionBg` | `#090F14` | Companion panel — shadow presence |
| `bg` | `#0A1A1E` | Page background |
| `cardArchival` | `#0C1820` | Finished/archived book tint |
| `cardBase` | `#101E26` | Standard card background |
| `cardDeep` | `#162836` | Nested card / secondary surface |
| `cardHover` | `#1C3040` | Card hover state |
| `companionHoverBg` | `#0F1E2C` | Companion on hover |

### Surface hierarchy (light mode, lightest → darkest)
| Token | Value | Role |
|---|---|---|
| `cardBase` | `#FFFFFF` | Standard card |
| `cardArchival` | `#F7F1E6` | Finished book tint |
| `bg` | `#FAF6EE` | Page background |
| `cardDeep` | `#F3EDE2` | Nested surface |
| `cardHover` | `#EDE5D8` | Card hover |
| `companionBg` | `#EDE3D0` | Companion — distinct parchment |
| `companionHoverBg` | `#E5D8C0` | Companion on hover |

### Text (dark mode)
| Token | Value | Use |
|---|---|---|
| `textPrimary` | `#D8CCBA` | Headings, book titles, active content |
| `textSecondary` | `#A89E8E` | Body copy, author names, companion text |
| `textDim` | `#5C7080` | Metadata, section labels, inactive states |

### Text (light mode)
| Token | Value | Use |
|---|---|---|
| `textPrimary` | `#1C1410` | Headings |
| `textSecondary` | `#5C4828` | Body copy — cognac |
| `textDim` | `#9A8868` | Metadata, labels |

### Gold (both modes)
Gold tokens are mode-specific because the foil shifts between cool-gold (dark) and warm-cognac (light).

| Token | Dark | Light | Use |
|---|---|---|---|
| `goldAccent` | `#C4A058` | `#8A6028` | Tab indicators, links, companion label on hover |
| `goldFoil` | 135° gradient (see tokens.js) | 135° gradient | Companion border, progress bar fill |
| `goldGlow` | multi-layer shadow | lighter shadow | Companion resting shadow |
| `goldGlowHover` | stronger shadow | stronger shadow | Companion hover shadow |

---

## Typography Scale

Font families:
- **Serif:** `'Playfair Display', Georgia, serif` — all editorial content
- **Sans:** `'Inter', system-ui, sans-serif` — UI chrome only
- **Mono:** `'JetBrains Mono', 'Fira Mono', monospace` — reserved for future data/code use

| Role | Size | Weight | Style | Leading | Tracking | Font |
|---|---|---|---|---|---|---|
| Book title h1 | 28px | 600 | — | 1.1 | -0.02em | Serif |
| Section heading | 22px | 600 | — | 1.2 | -0.01em | Serif |
| Chapter number | 28px | 700 | — | 1.0 | -0.02em | Serif |
| Companion thought | 17px | 400 | italic | 1.75 | — | Serif |
| Book card title | 17px | 600 | — | 1.2 | — | Serif |
| Body primary | 15px | 400 | — | 1.65 | — | Serif |
| Body secondary / author | 14–15px | 400 | italic | 1.6 | — | Serif |
| Body small / mystery text | 13px | 400 | italic | 1.5 | — | Serif |
| Tab label | 14px | 400 | — | 1.0 | — | Sans |
| Stats / metadata | 12–13px | 400 | — | 1.0 | — | Sans |
| Section label (CAPS) | 12px | 700 | — | 1.0 | 0.09em | Sans |
| Zone label (CAPS) | 11px | 700 | — | 1.0 | 0.08em | Sans |

---

## Spacing & Layout

```
Page max-width:    1000px
Horizontal padding: 40px each side
Book detail grid:  1fr 360px, gap 48px
Section gap:        40px vertical between library and detail
Card internal pad:  16px
Companion internal: 22px
Card grid gap:      16px
```

---

## Components

### Library Card (active book)
```jsx
// Background: M.cardBase
// Border-radius: 12px
// Padding: 16px
// On hover: background → M.cardDeep, scale(1.01)
// Progress bar: 3px tall, background M.accentDim, fill M.goldFoil, width 200px
// Cover: 56×78px, borderRadius 6px, boxShadow '0 2px 12px rgba(0,0,0,.4)'
// Title: 17px Playfair 600, M.textPrimary
// Author: 13px Playfair italic, M.textSecondary
// Stats: 12px Inter, M.textDim — "59% · 23 notes"
```

### Library Card (dormant / finished)
```jsx
// Background: M.cardArchival (dormant) or transparent (finished in list)
// Cover opacity: 0.7 (dormant)
// Title: 14–16px Playfair, M.textSecondary (dormant), M.textDim (finished)
```

### Book Detail Header
```jsx
// "NOW READING" label: 13px Inter 700 uppercase tracked, M.textDim
// h1: 28px Playfair 600, M.textPrimary, letter-spacing -0.02em, line-height 1.1
// Author: 15px Playfair italic, M.textSecondary
// Stats: 14px Inter, M.textSecondary — "Chapter X of Y · Z days · N notes"
// Progress bar: 3px, width 200px, background M.accentDim, fill M.goldFoil
```

### Tab Bar
```jsx
// Container: display flex, gap 20px, borderBottom `1px solid M.separator`, marginBottom 24px
// Tab button: 14px Inter, padding '0 0 10px', no background/border
//   default: M.textDim
//   hover:   M.textSecondary
//   active:  M.goldAccent + borderBottom `2px solid M.goldAccent`
// Transition: color 0.12s, border-color 0.12s
```

### Section Label
```jsx
// 12px Inter 700 uppercase, letter-spacing 0.09em, M.textSecondary, marginBottom 20px
```

### Companion Panel (gold foil border + hover-alive)
```jsx
// Outer wrapper — the "border":
{
  background: M.goldFoil,
  padding: 1.5,
  borderRadius: 20,
  boxShadow: companionHovered ? M.goldGlowHover : M.goldGlow,
  transform: companionHovered ? 'translateY(-3px)' : 'none',
  transition: 'all .28s ease',
  position: 'sticky', top: 24,
}

// Inner panel:
{
  background: companionHovered ? M.companionHoverBg : M.companionBg,
  borderRadius: 18.5,
  padding: '24px 22px',
  transition: 'background .28s ease',
}

// "COMPANION" label: 12px Inter 700 uppercase tracked
//   resting: M.textDim   |   hovered: M.goldAccent
//   transition: color .28s ease

// Thought text: 17px Playfair italic, line-height 1.75
//   resting: M.textSecondary   |   hovered: M.textPrimary

// "OPEN QUESTIONS" label: 11px Inter 700 uppercase, M.textDim
// Mystery bullet: ✦ icon (11px, M.goldAccent if haunted / M.textDim otherwise)
//                 13px Playfair italic, M.textSecondary

// Separator between sections: `1px solid M.separator` (hovered) or M.separatorSoft (resting)

// "Next thought" button: 13px Playfair italic, M.goldAccent
//   hover: M.textPrimary
// Input: 14px Playfair italic, M.textSecondary, no border except bottom borderBottom M.separator
// ↵ button: 13px, M.goldAccent
```

### Nav / TopNav
```jsx
// Height: 56px (h-14)
// Background: transparent on /directions; cream elsewhere
// No border-b
// Inner container: max-w-[1000px] mx-auto px-10 — matches page content alignment
// Logo: "✦ Lantern" — star #C4A058 14px, "Lantern" 22px Playfair semibold
// Hamburger: 36×36px, border 1px, rounded-lg
// Dropdown: absolute top-[57px] right-4, w-64, rounded-2xl, z-40
```

### Gold Rule (nav/content divider)
```jsx
// maxWidth: 1000, margin: '0 auto', padding: '0 40px'
// height: 1px, background: M.goldFoil, opacity: 0.45, borderRadius: 1
```

---

## Atmospheric Gradients

These are rendered as `background` on a full-bleed absolute-positioned layer behind all content, `pointerEvents: 'none'`, `zIndex: 0`. Content sits at `zIndex: 1` or above.

```jsx
// Page glow (top-center):
background: M.glow
// = dark: radial-gradient(ellipse 80% 50% at 50% -5%, rgba(40,110,160,.16) 0%, transparent 65%)
// = light: radial-gradient(ellipse 80% 50% at 50% -5%, rgba(196,160,88,.18) 0%, transparent 65%)

// Mystical side glow (left):
background: M.mysticalGlow
// = dark: radial-gradient(circle 400px at 15% 40%, rgba(30,90,130,.08) 0%, transparent 70%)
// = light: radial-gradient(circle 400px at 15% 40%, rgba(196,160,88,.10) 0%, transparent 70%)
```

---

## Motion

| Name | Value | Used for |
|---|---|---|
| fast | `all .12s ease` | Tab color, card hover bg |
| standard | `all .28s ease` | Companion hover (all properties) |
| thought | `opacity .48s ease` | Companion text fade when cycling |

Companion hover triggers: `boxShadow` escalation + `translateY(-3px)` + `background` shift on inner panel + `color` shift on label and thought text. All on the same `.28s ease` transition.

---

## Page Structure

```
<html data-mode="dark|light">
  <body style="background: var(--color-bg)">

    <TopNav />                          // h-14, transparent bg on /directions

    // Gold rule divider
    <div style="max-width:1000px; margin:0 auto; padding:0 40px">
      <div style="height:1px; background: goldFoil; opacity:.45" />
    </div>

    // Atmospheric bg layers (absolute, pointer-events:none)
    <div style="position:absolute; inset:0; background: glow; z-index:0" />
    <div style="position:absolute; inset:0; background: mysticalGlow; z-index:0" />

    // Page content
    <div style="position:relative; z-index:1; max-width:1000px; margin:0 auto; padding:0 40px">

      // Library section
      <section>  // "READING NOW" label + book cards grid </section>

      // Book detail section
      <div style="display:grid; grid-template-columns:1fr 360px; gap:48px; margin-top:40px">
        <main>  // header + tab bar + tab content </main>
        <aside> // Companion panel (sticky) </aside>
      </div>

    </div>
  </body>
</html>
```

---

## What to build next

When integrating this design system into the live app (LibraryPage, BookPage, SettingsPage):

1. **Replace CSS variables** — swap all existing `var(--color-cream-*)`, `var(--color-ink-*)`, `var(--color-gold)` references with the new token set from `tokens.css`.
2. **Mode provider** — the existing `DirectionModeContext` has a `mode` toggle; wire `data-mode` attribute on `<html>` to this state.
3. **Library page** — adopt the two-card-per-row grid for active books; dormant books as a collapsed list below; finished books as archival list.
4. **Book page** — adopt the two-column grid (main + companion sticky), tab bar, and all detail header typography.
5. **Companion** — extract the gold foil border + hover-alive pattern as a standalone `<CompanionPanel>` component.
6. **Nav** — already updated; verify `max-w-[1000px] px-10` matches all page content widths.
7. **Delete** — `DirectionsDemoPage.jsx`, all `D1`–`D11` direction components, `DirectionModeContext` direction picker, and the `/directions` route.
