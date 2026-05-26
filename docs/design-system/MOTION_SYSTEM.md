# Shadow Scribe — Motion System

---

## Philosophy

Motion in Shadow Scribe should feel like **turning a page** — smooth, purposeful, and immediately complete. Nothing bounces. Nothing spring-loads. Nothing celebrates with particles or confetti.

The motion system exists to:
1. Orient the reader when context changes
2. Signal that an action has been acknowledged
3. Preserve the atmospheric weight of the interface

It exists **not** to:
- Delight through complexity
- Signal feature richness
- Reward interactions gamefully

---

## Defined Keyframes

### `fadeIn` — `0.22s ease`
```css
from { opacity: 0 }
to   { opacity: 1 }
```
**Usage:** Content appearing in place. Confirm dialogs, form expansions, inline feedback. This is the most-used animation. It is nearly invisible — just fast enough that the appearance doesn't feel like a pop, slow enough that the eye has time to register.

### `slideUp` — `0.28s ease-out`
```css
from { transform: translateY(10px); opacity: 0 }
to   { transform: translateY(0);    opacity: 1 }
```
**Usage:** New page/view transitions (`animate-slide-up`). The 10px rise is restrained — enough movement to signal arrival, not enough to feel dramatic. Applied on new content entering after step changes (wizard, settings sections).

### `pop` — `0.28s cubic-bezier(0.2, 0.8, 0.3, 1)`
```css
from { transform: scale(.95); opacity: 0 }
to   { transform: scale(1);   opacity: 1 }
```
**Usage:** Modals, menus appearing. The slight scale-up (5%) feels like the element has weight — it *settles* into place rather than appearing.

### `tabIn` — `0.22s ease`
```css
from { opacity: 0; transform: translateY(4px) }
to   { opacity: 1; transform: translateY(0) }
```
**Usage:** Tab content changing. The 4px vertical rise is barely perceptible — it signals "content replaced" without dramatizing the transition.

### `celebrate` — `0.50s ease-out`
```css
0%   { transform: scale(1) }
40%  { transform: scale(1.04) }
75%  { transform: scale(.99) }
100% { transform: scale(1) }
```
**Usage:** The "chapter complete" celebration — the most energetic animation in the system, and still only a 4% scale pulse. This is the maximum expressiveness Shadow Scribe allows itself.

### `menuDrop` — `0.15s ease-out`
```css
from { transform: translateY(-6px); opacity: 0 }
to   { transform: translateY(0);    opacity: 1 }
```
**Usage:** Dropdown menus appearing. Very fast — menus should feel instantaneous.

### `viewIn` — `0.22s ease-out`
```css
from { opacity: 0; transform: translateY(6px) }
to   { opacity: 1; transform: translateY(0) }
```
**Usage:** Route/view transitions via `.view-enter` class. Applied to the full page content wrapper on route change.

### `pulse-soft` — `2s ease-in-out infinite`
```css
0%, 100% { opacity: 0.6 }
50%       { opacity: 1 }
```
**Usage:** Reading momentum dot (`.momentum-dot`). The only looping animation — very subtle, represents live reading state.

### `confetti` — `0.8s ease-out forwards` (not in main loop)
```css
0%   { opacity: 1; transform: translateY(0)     rotate(0deg) }
100% { opacity: 0; transform: translateY(-60px) rotate(360deg) }
```
**Usage:** Optional confetti dots on chapter completion. Used sparingly.

---

## Duration Guide

| Duration | Use case |
|----------|----------|
| `0.15s` | Menus, tooltips — feel instant |
| `0.22s` | Content fades, tab transitions — barely perceptible |
| `0.28s` | Slide-up, pop — meaningful but brief |
| `0.50s` | Celebration pulse — the only "moment" the product has |
| `2s` (loop) | Momentum dot — ambient, barely visible |

**Rule:** Nothing above `0.5s` except the looping momentum dot. A slow animation says "wait for me" — Shadow Scribe never makes the reader wait.

---

## Hover Transitions

| Element | Property | Duration |
|---------|----------|----------|
| Colors (text, border) | `color`, `border-color` | `0.2s` |
| Card shadow lift | `transform`, `box-shadow` | `0.25s` |
| Mood swatch scale | `transform`, `opacity` | `0.2s` |
| Button background | `background` | `0.2s` |
| Focus ring | `box-shadow` | `0.15s` |

All hover transitions use `ease` or `ease-out`. No `ease-in` — entering a hover state should be immediate, not delayed.

---

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

All animations collapse to near-instant when reduced motion is preferred. The product must be fully usable without any animation whatsoever.

---

## Motion Anti-Patterns

- No spring physics — no bounce, no overshoot
- No entrance animations on static page content (only on content that *changes*)
- No staggered list animations — each item appearing on its own schedule feels like a loading sequence
- No continuous animations except the momentum dot
- No scale-up transforms above `scale(1.15)` — the mood swatch is the maximum
- No shake or wiggle animations — these belong to error states in productivity apps, not reading companions
- No loading skeletons that pulse — use shimmer from `BookCover` only, not applied to content areas
