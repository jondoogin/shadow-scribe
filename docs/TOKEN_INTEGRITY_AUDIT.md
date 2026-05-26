# Design Token Integrity Audit
**Session 75 · May 15, 2026**

---

## What This Is

A full scan of the design token system for hardcoded values that bypass the token layer. The goal is not to eliminate all hardcoded values — some are intentional — but to identify where the token contract is being violated in ways that will cause breakage or inconsistency under theming, dark mode, or future palette changes.

---

## The Token System

Tokens are defined in `src/index.css` in a Tailwind v4 `@theme {}` block. The color palette uses `--color-{name}-{shade}` naming:

```css
--color-cream-50 through --color-cream-900
--color-ink-50 through --color-ink-900
--color-gold-100 through --color-gold-900
--color-sage-100 through --color-sage-800
--color-ember-100 through --color-ember-800
--color-sienna-100 through --color-sienna-700
--color-steel-100 through --color-steel-800
```

Mood accent colors use CSS custom properties set per `[data-mood]` attribute:
```css
--ca        /* accent color (base) */
--ca-l      /* accent color (light) */
--ca-bg     /* accent background */
--ca-border /* accent border */
```

The correct pattern for mood-aware accent is `var(--ca, #B8860B)` — the fallback to `#B8860B` (dark goldenrod) is intentional. It ensures a gold fallback when no mood is set.

Dark mode is implemented via `html.dark` class overrides, not `dark:` utility prefixes.

---

## Violations Found

### 1. MOOD_COLORS Objects in Component Files

Two components define a `MOOD_COLORS` object that duplicates the token values as hardcoded hex:

**`src/components/library/CreateCompanion.jsx`**
```js
const MOOD_COLORS = {
  dark:     { accent: '#2C2C2C', ... },
  literary: { accent: '#4A3728', ... },
  // ...
}
```

**`src/components/library/EpubImportReview.jsx`** — identical `MOOD_COLORS` object.

These are used for inline style color previews in the mood picker UI. They are not responsive to dark mode changes and will diverge from the CSS token palette if the palette changes. Both components should read from a shared constant — or better, the mood swatches should use the `[data-mood]` CSS attribute system that already exists.

**Risk:** High. Two copies of the same hardcoded object means drift on any palette change. Already one source of truth vs. another.

---

### 2. RelationshipMap Edge Colors

**`src/components/dashboard/RelationshipMap.jsx`**
```js
love:      'var(--ca, #B8860B)',
ally:      '#3A6647',
tension:   '#9B2335',
hierarchy: '#78716C',
neutral:   '#A8A29E',
```

`love` is correct — uses the mood accent token. The other four are hardcoded hex values with no token backing. `ally` and `tension` are semantically meaningful colors (forest green, crimson) that will not respond to dark mode or palette changes.

**Risk:** Medium. RelationshipMap is not in the dark-mode critical path, but these edge colors are visually prominent.

---

### 3. EmptyState Radial Gradient

**`src/components/shared/EmptyState.jsx`**
```jsx
background: 'radial-gradient(ellipse at top, rgba(184,134,11,.06), transparent)'
```

`rgba(184,134,11,.06)` is a 6% opacity version of `#B8860B` (the gold fallback). This should be `rgba(var(--color-gold-600-raw, 184,134,11), .06)` or ideally a CSS variable. In dark mode, gold at 6% opacity on a dark background may be too subtle or wrong.

**Risk:** Low. The visual impact is subtle, but this is a missed token opportunity.

---

### 4. Tag Pill Colors in index.css

The tag pill color definitions in `src/index.css` use hardcoded hex values rather than referencing tokens:

```css
/* example — actual values vary */
.tag-theory { background: #E8DDD3; color: #5C4A3A; }
```

These are defined inside the stylesheet but are not using `--color-*` references. They are therefore invisible to the token system — a palette change to sienna would not cascade to theory-tag pills.

**Risk:** Medium. Tags are visually prominent, especially in the Notes tab. They should reference the sienna/ember/sage tokens.

---

### 5. Sticky Bar Background

**`src/index.css`**
```css
.sticky-bar {
  background: rgba(250,248,243,.96);
}
```

`rgba(250,248,243,.96)` is approximately `--color-cream-50` at 96% opacity. This should be `rgba(var(--color-cream-50-raw), .96)` or a dedicated `--sticky-bar-bg` token. In dark mode, the sticky bar background color override presumably exists in the `html.dark` block — but the base value being hardcoded means there is no single source to update.

**Risk:** Low-medium. Dark mode presumably handles this correctly already, but it's fragile.

---

### 6. Animation Timing in Components

The carousel auto-advance interval (7000ms) and fade duration (420ms) in `src/components/dashboard/CompanionInsights.jsx` are JavaScript constants, not CSS tokens. While animation timing is typically defined in JS for programmatic control, these values are not documented in the design token system and will be invisible to any systematic timing review.

**Risk:** Low. More a documentation gap than a token violation.

---

## What Is Correct

**The `var(--ca, #B8860B)` pattern is intentional.** This is the correct way to use mood accent colors — the `#B8860B` fallback ensures gold is always present even when `--ca` is not set. This pattern appears correctly in `RelationshipMap.jsx` (love), throughout `CompanionInsights.jsx`, and in companion-adjacent UI. Do not treat the `#B8860B` fallback as a token violation.

**The `html.dark` override approach is correct** for this Tailwind v4 codebase. The `dark:` utility prefix would conflict with Tailwind v4's CSS variable approach. All dark mode handling via `html.dark` selector overrides is the intended pattern.

---

## Priority Matrix

| Issue | Location | Risk | Fix |
|-------|----------|------|-----|
| Duplicate MOOD_COLORS objects | CreateCompanion.jsx, EpubImportReview.jsx | High | Extract to shared constant |
| RelationshipMap edge colors | RelationshipMap.jsx | Medium | Define semantic edge-color tokens |
| Tag pill hardcoded hex | index.css | Medium | Reference --color-* tokens |
| EmptyState radial gradient | EmptyState.jsx | Low | Use CSS variable |
| sticky-bar background | index.css | Low | Extract to token or variable |
| Carousel timing as JS constants | CompanionInsights.jsx | Low | Document in design system |

---

## Recommended Immediate Action

The highest-leverage fix is extracting `MOOD_COLORS` into a single shared constant in `src/data/moods.js` or similar, imported by both `CreateCompanion.jsx` and `EpubImportReview.jsx`. This eliminates the duplication risk without requiring any UI changes.

The RelationshipMap edge colors should be added to the design system documentation as semantic edge-color values, even if they remain hardcoded — at minimum they need to be named and tracked.
