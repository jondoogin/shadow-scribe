# Motion and Timing Audit
**Session 75 · May 15, 2026**

---

## What This Is

An inventory of every animation, transition, and interaction timing value in the codebase. The goal is to identify inconsistencies, outliers, and values that undermine the product's "still rather than in motion" atmosphere.

Lantern is designed to feel calm. Motion should be invisible — it should move things rather than call attention to movement. The standard for this product is: a reader should be able to use Lantern for 30 minutes and not be able to recall a single animation, because the transitions were exactly what they needed to be and no more.

---

## Animation Token Inventory

Defined in `src/index.css` as `@theme` animation tokens:

| Token | Duration | Easing | Usage |
|-------|----------|--------|-------|
| `--animate-fade-in` | 0.22s | `ease` | General element appearance |
| `--animate-slide-up` | 0.28s | `ease` | Upward entrance (cards, panels) |
| `--animate-pop` | 0.28s | `cubic-bezier(0.2, 0.8, 0.3, 1)` | Spring-feel pop (mood selection, etc.) |
| `--animate-celebrate` | 0.50s | `ease` | Chapter completion, achievement |
| `--animate-menu-drop` | 0.15s | `ease` | Menu open (fast, mechanical) |
| `--animate-tab-in` | 0.22s | `ease` | Tab navigation entrance |

The standard range is 150ms–280ms for UI transitions. `celebrate` at 500ms is intentionally longer — it marks a meaningful moment. `menuDrop` at 150ms is intentionally faster — it should feel mechanical, not theatrical.

---

## Issues Found

### 1. --animate-pop Uses Spring Easing

`--animate-pop` uses `cubic-bezier(0.2, 0.8, 0.3, 1)` — a spring-curve easing. Every other animation token uses `ease` or `ease-out`. The spring easing produces an overshoot/settle feeling that is more energetic than the product's atmosphere.

`cubic-bezier(0.2, 0.8, 0.3, 1)` enters fast, overshoots slightly, and settles. This is appropriate for a consumer app that wants to feel alive and responsive. For Lantern — which is designed to feel still — this is slightly too energetic.

The elements that use `pop` animation (mood selection swatches, potentially other small interactions) would benefit from using `ease-out` at 0.22–0.28s instead. The pop sensation is pleasurable but inconsistent with the overall atmosphere.

**Risk:** Low. Most readers won't notice. But it creates a slightly different sensory register for mood-selection that contrasts with the rest of the product.

---

### 2. ProgressBar transition-duration-700

**Location:** `src/components/` (progress bar component)

The progress bar width transition uses `duration-700` (700ms). This is the largest outlier in the timing system — 2.5× longer than the next longest standard transition (280ms for slide-up).

700ms for a width transition means the progress bar visibly animates as it updates. Whether this is intentional (dramatic, shows the reader how far they've come) or accidental (someone grabbed a Tailwind duration class without reference to the system) is not documented.

**At 700ms, the progress bar transition crosses from functional to theatrical.** It's long enough that the reader perceives it as animation rather than rendering. In a product that is otherwise still, this draws attention.

**Fix:** Reduce to `duration-300` or `duration-[280ms]` to match the system's standard range. If the slow animation is intentional (there's a case for showing reading progress as a meaningful change), document it.

---

### 3. active:scale-95 on New Companion Button

**Location:** `src/components/layout/TopNav.jsx`

The "New Companion" button has `active:scale-95` — it physically shrinks slightly on press. This is an app-style interaction affordance. It adds tactile feedback to a click that would otherwise be invisible.

In isolation, `active:scale-95` is unremarkable — it's standard UI practice. In Lantern specifically, it reads as slightly app-like in a product that aims to feel literary and calm. Book interfaces and reading companions don't typically have bouncy buttons.

**Risk:** Very low. This is a subjective call. The interaction is standard and unobtrusive.

---

### 4. group-hover:scale-110 on ✦ Logo

**Location:** `src/components/layout/TopNav.jsx`

The ✦ logo symbol in the navigation header has `group-hover:scale-110` — it grows slightly on hover. This is decorative hover feedback.

In a product that is designed to be still, hover feedback on a purely decorative element (the ✦ symbol is not interactive) is unnecessary. It adds motion where there is no function.

**Fix:** Remove `group-hover:scale-110` from the ✦ symbol. Or make the entire nav logo element a link (which would justify the hover feedback).

---

### 5. Carousel Timing Lives in JavaScript, Not CSS

**Location:** `src/components/dashboard/CompanionInsights.jsx`

The companion insight carousel auto-advances at 7000ms (7 seconds) with a 420ms fade transition:
```js
const t = setInterval(() => {
  setFade(false)
  setTimeout(() => { setIdx(i => (i + 1) % observations.length); setFade(true) }, 280)
}, 7000)
```

And in the JSX:
```jsx
style={{ opacity: fade ? 1 : 0, transition: 'opacity 420ms ease' }}
```

The 420ms fade is a hardcoded inline style, not a CSS token. The 7000ms interval is a hardcoded JavaScript value. Neither appears in the design token system or DESIGN_SYSTEM.md.

Session 74 found that the 7-second interval and 420ms fade are not fatiguing at current density (5 or fewer observations). They are the correct values. But they should be documented as intentional design decisions, not left as magic numbers.

**Fix:** Add to DESIGN_SYSTEM.md. No code change needed.

---

## What Is Correct

**The 0.22s fadeIn and 0.28s slideUp** are calibrated well. They are fast enough to be invisible under normal use but slow enough to provide continuity (the reader's eye catches the transition and understands a change has happened).

**The 0.15s menuDrop** is correctly faster than everything else — menus should feel mechanical, not theatrical. The shorter duration prevents the dropdown from drawing attention on every use.

**The 0.50s celebrate** is correctly longer than everything else — it marks a meaningful moment and earns its duration.

**The 420ms carousel fade** is correct for the companion's context. 420ms is long enough to provide continuity between observations without the "flicker" that shorter fades produce. The reader doesn't lose their place between observations.

---

## Priority Matrix

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| ProgressBar duration-700 | Progress component | Medium | Reduce to 280ms |
| --animate-pop spring easing | index.css | Low | Replace with ease-out |
| group-hover:scale-110 on ✦ | TopNav.jsx | Low | Remove |
| active:scale-95 on button | TopNav.jsx | Low | Subjective — leave or remove |
| Carousel timing undocumented | CompanionInsights.jsx | Low | Document in DESIGN_SYSTEM.md |
