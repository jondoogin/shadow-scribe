# Shadow Scribe — Visual Language

---

## The Visual World

Shadow Scribe's visual world is built from a small set of atmospheric elements that create a consistent **sense of place**. This is not decoration — these elements exist to make the reader feel they have arrived somewhere intentional.

---

## Atmospheric Layers

### 1. Grain Texture
A subtle SVG fractal noise (`feTurbulence`) applied as a fixed, full-screen overlay:

```css
opacity: 0.022;
mix-blend-mode: multiply;
```

This is the **paper texture** of the UI. At 2.2% opacity it is invisible to casual inspection but contributes materially to the sense of warmth. Without it, the UI feels more digital. With it, it feels printed.

**Rule:** Never increase this opacity. At 5% it becomes distracting. At 2.2% it is felt, not seen.

### 2. Ambient Gradient
A radial gold gradient fixed at the top of the viewport:

```css
background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(184,134,11,.04) 0%, transparent 70%);
```

This is the **lamplight** of the UI — a very faint warm glow from above, as if the interface were lit by a reading lamp outside the frame. At 4% opacity it is invisible as a deliberate element but contributes to the cream palette feeling warm rather than cool.

**Rule:** Never change this gradient's color or increase its opacity. It must not be visible as a deliberate design choice.

### 3. Shadow Philosophy
Shadows in Shadow Scribe are **barely-there**:

```css
--shadow-card:       0 1px 2px rgba(28,25,23,.04), 0 1px 4px rgba(28,25,23,.03);
--shadow-card-hover: 0 4px 14px rgba(28,25,23,.08), 0 1px 4px rgba(28,25,23,.04);
--shadow-panel:      0 4px 16px rgba(28,25,23,.06);
--shadow-modal:      0 20px 56px rgba(28,25,23,.16), 0 4px 16px rgba(28,25,23,.08);
--shadow-menu:       0 8px 24px rgba(28,25,23,.10), 0 2px 8px rgba(28,25,23,.05);
```

The shadow color is derived from `ink` (`#1C1917`), not pure black. This keeps shadows warm-toned rather than cold.

**Rule:** No `box-shadow: 0 4px 6px rgba(0,0,0,.5)` anywhere. Harsh shadows break the paper atmosphere.

---

## Surface Hierarchy

```
Background:  cream (#FAF8F3)
Cards:       cream-50 (#FFFDF9)    ← slightly lighter than background
Modals:      cream-50 + shadow-modal
Sticky bars: cream-50 at 96% opacity + backdrop-filter blur(10px)
```

The surface hierarchy is **inverse to most apps**: cards are *lighter* than the background, not darker. This mirrors the experience of paper on a desk — the written surface is lighter than the wood.

---

## Border Language

| Weight | Token | Usage |
|--------|-------|-------|
| Standard | `ink-200` | Cards, inputs, standard dividers |
| Subtle | `ink-100` | Section dividers within a card |
| Accent | `--ca-border` | Mood-accented containers |
| Emphasis | `ink-800` / `ink-900` | Print view header; never in main app |
| Left-rule | `border-l-2 border-ink-200 pl-3` | Secondary content (reflections, observations) |

The **left-rule pattern** is a signature: it signals supplementary content — a second thought, a reflection, a follow-on. It appears in:
- Note reflections
- Mystery observations  
- Chronicle chapter reflections
- Series headers in Library
- Print view section indents

---

## Hover Behavior

Hover states in Shadow Scribe are **quiet and directional**:

| Element | Hover change |
|---------|-------------|
| Book card | `translateY(-1px)` + shadow lift (`card-lift`) |
| Tab button | color to `ink-700`, thin `ink-200` border-bottom |
| Action links | color `ink-400` → `ink-600` |
| Destructive links | color `ink-400` → `ember` |
| Primary buttons | lighter accent shade (`--ca-l`) |
| Mood swatches | `scale(1.15)` + `ring` outline |

The rule: **hover reveals intention without dramatizing it**. Hover should feel like turning slightly toward something — not illuminating it.

---

## Empty State Philosophy

Empty states are the product's most literary moments. They are written to be **evocative**, not instructional.

| Pattern | Example |
|---------|---------|
| The story as invitation | "The chronicle begins when you do." |
| The eternal quality | "Every story withholds something." |
| The patient wait | "Questions will find their way here as the companion grows with you." |
| The natural process | "Questions tend to appear once the story begins moving." |

**Anti-patterns:**
- "No characters added yet." → flat, mechanical
- "Add your first note!" → cheerful, gamified
- "Nothing here." → defeatist

Empty states should feel like the product is **waiting with you**, not waiting for you.

---

## Card Aesthetics

Cards in Shadow Scribe are:
- `bg-cream-50` — lighter than the page background
- `rounded-xl` (12px) or `rounded-2xl` (16px) — generous rounding, soft
- `border border-ink-200` — barely-there border
- No strong box-shadow at rest — the `shadow-card` is very subtle

Cards should not feel like UI components. They should feel like **pages**.

---

## The Print View as Aesthetic Reference

The print view (`/book/:id/print`) is an aesthetic target for the entire product. It is:
- White page, serif-forward
- Wide margins
- Left-ruled secondary content
- Absolute dates, no relative time
- Sections separated by thin ink-200 rules

The live UI should feel like it *could* produce that document. The print view should not feel like an afterthought — it should feel like the reason the product exists.
