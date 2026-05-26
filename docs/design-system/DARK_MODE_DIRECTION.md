# Shadow Scribe — Dark Mode Direction

**Document purpose:** Creative direction for dark mode implementation. This document must be read before any dark mode design work begins. It establishes both the vision and the forbidden territory.

---

## The Core Metaphor

Dark mode in Shadow Scribe is **a reading lamp turned low**.

Not a terminal. Not a night mode toggle. Not a cinema mode. A reading lamp, turned low, in a room with bookshelves. The reader is still in the same room — the same paper, the same ink, the same warm brass of the lamp — but the room has gotten darker around them.

The light source is **warm, not cold**. The darkness is **charcoal, not black**. The page is **vellum, not white**.

---

## The Target Feeling

A reader opening Shadow Scribe in dark mode should feel:

- **Nocturnal** — the same intimacy as reading late at night
- **Warm** — the darkness should feel amber-adjacent, not blue
- **Low-glare** — no harsh contrast; the eye rests
- **Archival** — old paper in dim light, not a screen in the dark
- **Continuous** — the product's identity should be intact; only the ambient light has changed

---

## Color Direction

### Background
Not pure black. Not charcoal grey. **Warm dark brown.**

Suggested target range:
```
Page background:  ~#1A1612  (very dark warm brown — like aged leather binding)
Card surfaces:    ~#221D18  (slightly lighter — like aged paper in dim light)
Raised surfaces:  ~#2A2420  (modals, sticky bars)
```

The background should feel like **the inside cover of a very old book** — brown-dark, not grey-dark, not blue-dark.

### Text
Not pure white. **Warm cream.**

```
Primary text:     ~#F0E8DC  (warm cream — old paper color)
Secondary text:   ~#C4B89E  (muted cream — like lightly foxed pages)
Tertiary text:    ~#8A7D6B  (very muted — the shadow of the text)
```

The text should feel like it is **printed on the background**, not projected from it.

### Gold Accent
Gold in dark mode becomes **candlelit brass** — slightly richer, slightly deeper.

```
Gold primary:     ~#C9960E  (slightly warmer/deeper than light-mode #B8860B)
Gold lighter:     ~#D4AF37  (hover state — the same, actually; candlelight flickers warm)
Gold background:  ~#261F0A  (very dark gold-tinted background)
```

### Borders
In dark mode, borders must not be lighter than the surrounding content — they should be just barely visible.

```
Standard border:  ~#3A3228  (warm dark — like a pencil line on dark paper)
Subtle border:    ~#2E2822  (nearly invisible)
```

---

## Mood Colors in Dark Mode

Mood accent colors in dark mode should be **desaturated and deepened** — they should feel like the mood color seen by candlelight, not by daylight.

| Mood | Light mode `--ca` | Dark mode `--ca` direction |
|------|------------------|---------------------------|
| gold | `#B8860B` | `#C9960E` — slightly richer |
| sage | `#3A6647` | `#4A7A56` — slightly lifted, same warmth |
| ember | `#9B2335` | `#A82535` — nearly unchanged; ember is already dark |
| ink | `#44403C` | `#8A8278` — lifted significantly (needs contrast on dark bg) |
| sienna | `#8B4513` | `#A0521C` — slightly warmer/lighter |
| steel | `#2D4A6B` | `#3D5E82` — slightly lifted |

Mood accent backgrounds (`--ca-bg`) in dark mode should be extremely subtle — near-invisible tints, not fills.

---

## Explicit Forbid List

The following are explicitly forbidden in Shadow Scribe's dark mode:

❌ **Pure black backgrounds** (`#000`, `#111`) — creates OLED gamer aesthetics, not nocturnal warmth  
❌ **Blue-tinted dark backgrounds** — this is the default "dark mode" most apps use; it looks like Discord/Notion  
❌ **Neon or electric accent colors** — nothing glows in warm candlelight  
❌ **High-contrast white text on black** — too aggressive; literary products read in soft contrast  
❌ **Glassmorphism** — blurred translucent panels belong to design trends, not reading companions  
❌ **Gradients from dark to near-black** — creates sense of depth that belongs in a game UI  
❌ **Drop shadows heavier than light mode** — dark mode should feel *quieter*, not more dramatic  
❌ **Green-on-black** — terminal aesthetics, not reading atmosphere  
❌ **Desaturating the grain** — the grain texture should remain at the same opacity; it becomes more visible in dark mode naturally  

---

## Atmospheric Elements in Dark Mode

### Grain Texture
The SVG grain should remain at the same `opacity: 0.022`. In dark mode, the grain will read more warmly against the dark background — this is correct and intentional. Do not suppress it.

### Ambient Gradient
The radial gold gradient at the top of the viewport should be adjusted for dark mode:

```css
background: radial-gradient(ellipse 80% 60% at 50% -10%, rgba(201,150,14,.06) 0%, transparent 70%);
```

Slightly higher opacity (0.06 vs 0.04) and slightly warmer gold. The lamp at the top of the room.

### Shadows
Dark mode shadows should be **darker and more diffused**, not lighter:

```
--shadow-card:       0 1px 2px rgba(0,0,0,.15), 0 1px 4px rgba(0,0,0,.10);
--shadow-modal:      0 20px 56px rgba(0,0,0,.50), 0 4px 16px rgba(0,0,0,.25);
```

Dark UI shadows use near-black rather than ink-toned. They are heavier because they need to lift elements off the dark background.

---

## Implementation Notes

### CSS Custom Properties Approach
Dark mode should use a `[data-theme="dark"]` attribute on `<html>` or `<body>`, which overrides the `@theme {}` color tokens. This preserves all Tailwind utility class usage while swapping the underlying palette.

**Recommended architecture:**
```css
@layer base {
  [data-theme="dark"] {
    --color-cream:     #1A1612;
    --color-cream-50:  #221D18;
    --color-cream-200: #2A2420;
    --color-ink-900:   #F0E8DC;
    /* ... */
  }
}
```

**Do not** implement dark mode via media query (`@media (prefers-color-scheme: dark)`) only. The reader should be able to explicitly set their preference in the app. Store preference in `SettingsContext`.

### The Print View
The print view (`/book/:id/print`) should **always render in light mode**, regardless of the app's dark mode setting. Printing on dark backgrounds wastes ink and breaks the "paper journal" metaphor.

---

## Reference Aesthetics

**Look toward:**
- Aged book interiors photographed in candlelight
- Libraries at night
- The Criterion Collection disc menus (dark, cinematic, literary)
- Old maps and manuscripts under low light
- The Monocle magazine aesthetic (dark, warm, editorial)

**Avoid referencing:**
- GitHub dark mode
- macOS dark mode defaults  
- Any productivity tool in dark mode
- Any gaming UI
