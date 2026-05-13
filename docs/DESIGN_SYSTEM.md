# Shadow Scribe — Design System
**Last updated:** 2026-05-13 (Session 46)

---

## CSS Architecture

Tailwind CSS v4 with `@import "tailwindcss"` in `index.css`.

**Critical constraint:** All custom CSS resets must be inside `@layer base {}`. In Tailwind v4, unlayered CSS rules win over all `@layer utilities` classes regardless of specificity. This silently zeros out every `py-*`, `px-*`, `gap-*`, `space-y-*` class. Every custom reset goes in `@layer base {}`.

Custom design tokens are defined in `@theme {}`. Global helper classes (`.tab-btn`, `.card-lift`, `.sticky-bar`, etc.) live outside any layer in `index.css`.

---

## Color Palette

Defined in `@theme {}` in `index.css`.

| Family | Tokens |
|--------|--------|
| `cream` | `cream-50 #FFFDF9`, `cream #FAF8F3`, `cream-200 #F2EBE0`, `cream-300 #E8DDD0` |
| `ink` | 900 (near-black) → 100 (near-white), 9 stops |
| `gold` | `gold #B8860B`, `gold-light #D4AF37`, `gold-pale`, `gold-bg`, `gold-border` |
| `sage` | `sage #3A6647`, `sage-light`, `sage-bg`, `sage-pale` |
| `ember` | `ember #9B2335`, `ember-light`, `ember-bg`, `ember-pale` |
| `sienna` | `sienna #8B4513`, `sienna-bg`, `sienna-pale` |
| `steel` | `steel #2D4A6B`, `steel-light`, `steel-bg` |

### Semantic usage
- `cream / cream-50` — page backgrounds
- `ink-900` — primary text
- `ink-400 / ink-500` — secondary/muted text
- `ink-200` — borders
- `gold` — default accent, primary CTA, active states
- `ember` — destructive actions, warnings, error states

---

## Per-Companion Accent Theming

Each book has a `mood` that shifts its entire dashboard via CSS custom properties.

`data-mood` is set on `<div data-mood={book.mood || 'gold'}>` wrapping `BookDashboard` and `ChapterUpdateModal`.

```css
[data-mood="sage"]   { --ca: #3A6647; --ca-l: #4D8860; --ca-bg: #EBF3EE; --ca-border: #D4E8DA; }
[data-mood="ember"]  { --ca: #9B2335; --ca-l: #C0392B; --ca-bg: #FDF0F0; --ca-border: #F5D0D4; }
[data-mood="ink"]    { --ca: #44403C; --ca-l: #57534E; --ca-bg: #F5F5F4; --ca-border: #E7E5E0; }
[data-mood="sienna"] { --ca: #8B4513; --ca-l: #A0521A; --ca-bg: #FDF4EE; --ca-border: #F0D5C0; }
[data-mood="gold"]   { --ca: #B8860B; --ca-l: #D4AF37; --ca-bg: #FDF8EC; --ca-border: #E8D090; }
[data-mood="steel"]  { --ca: #2D4A6B; --ca-l: #3D6A9B; --ca-bg: #EEF2F7; --ca-border: #C8D8EE; }
```

**Always** use `var(--ca, #B8860B)` (gold fallback) for accent elements inside a companion dashboard. Never hardcode a mood color.

`.insight-strip` background tints using `--ca-bg` via `color-mix`.

---

## Dark Mode

`html.dark` overrides all `--color-cream-*` and `--color-ink-*` CSS custom properties with a warm dark palette:
- Surfaces: `#1A1714` (darkest) → `#2E2B28`
- Text: `#EDE8E3` (lightest) → `#3A3633`

Because Tailwind v4 compiles utilities to `var(--color-*)` at runtime, overriding variables in `html.dark` flips the entire palette without touching component markup. No `dark:` utility prefixes.

Dark mode is toggled via Settings → Appearance → Dark Mode. Synced to `document.documentElement.classList` via `useEffect` in `AppShell`. Persisted in `shadowscribe_settings.darkMode`.

`html.dark [data-mood="*"]` also overrides `--ca-bg` and `--ca-border` for all 6 moods to their dark-palette equivalents.

---

## Typography

| Token | Value |
|-------|-------|
| `--font-serif` | "Playfair Display", Georgia, serif |
| `--font-sans` | "Inter", system-ui, sans-serif |
| Base font size | `15px` |
| Base line height | `1.6` |

Fonts loaded via Google Fonts CDN in `index.html` (not from node_modules).

Serif is used for headings, companion observations, and literary emphasis. Sans-serif for body text, labels, and UI chrome.

---

## Layout System

| Pattern | Value |
|---------|-------|
| Max content width | `max-w-4xl` (896px), centered with `mx-auto` |
| Tab content width | `max-w-2xl` (narrower for readability) |
| Horizontal padding | `px-5 sm:px-8` (20px mobile, 32px tablet+) |
| Top offset | `pt-14` (clears fixed `h-14` TopNav) |
| Content pages | `py-6 pb-16` |
| Sticky sub-navs | `top-14`, `z-20`, `backdrop-blur` |

---

## Spacing

- Standard inner padding: `p-4` (16px)
- Form inputs: `px-3.5 py-2.5`
- Section gaps: `space-y-2` to `space-y-8` depending on visual weight
- Bottom page padding: `pb-16` (prevents mobile content obscured at viewport bottom)

---

## Elevation

Shadow tokens in `@theme`:
- `--shadow-card` — base card
- `--shadow-card-hover` — elevated on hover
- `--shadow-panel` — section panels
- `--shadow-modal` — overlays
- `--shadow-menu` — dropdown menus

Used via `style={{ boxShadow: 'var(--shadow-modal)' }}`.

---

## Animation System

All keyframes defined in `index.css`. Applied via custom `animate-*` Tailwind utilities.

| Animation | Class | Duration | Use |
|-----------|-------|----------|-----|
| `fadeIn` | `animate-fade-in` | 200ms | Character detail panel expand |
| `slideUp` | `animate-slide-up` | 250ms | Create form, modal success state |
| `pop` | `animate-pop` | 300ms | Defined, not yet wired |
| `celebrate` | `animate-celebrate` | 500ms | Chapter completion bounce |
| `menuDrop` | `animate-menu-drop` | 150ms | TopNav dropdown |
| `tabIn` | `animate-tab-in` | 180ms | Tab content on switch |
| `viewIn` | `.view-enter` class | 220ms | Full view transitions |
| `confetti` | `.confetti-dot` class | 800ms | ✨ chapter completion |
| `pulse-soft` | `.momentum-dot` class | 2s ∞ | ReadingMomentum dot |

---

## Reusable CSS Classes

| Class | Purpose |
|-------|---------|
| `.tab-btn` | Horizontal tab with bottom-border active state |
| `.tab-btn.active` | Gold border + text (overridden to `--ca` per book) |
| `.sticky-bar` | Sticky with cream bg, blur, border-bottom |
| `.sticky-bottom-bar` | Same, pinned to bottom |
| `.card-lift` | Hover: translateY(-1px) + shadow |
| `.btn-accent` | `background: var(--ca)`, white text, hover: `var(--ca-l)` |
| `.tag-theory/favorite/confusing/theme/character/quote` | Note tag pill styles |
| `.mystery-resolved` | opacity: 0.5 for resolved items |
| `.insight-strip` | Gradient background for CompanionInsights |
| `.rel-map-node` | Scale-on-hover for SVG character nodes |
| `.momentum-dot` | Infinite pulse |
| `.view-enter` | Fade + translateY entry |

---

## Interaction Patterns

- **Card hover:** `.card-lift` — translateY(-1px) + shadow elevation
- **Button hover:** `hover:bg-*-light` or inline `onMouseEnter/Leave` for `--ca` derived colors
- **Input focus:** gold ring (`box-shadow: 0 0 0 3px rgba(184,134,11,.12)`) + gold-light border
- **Chapter toggle:** immediate visual + `animate-celebrate` (no loading state)
- **Note addition:** inline expand (no modal)
- **Mystery toggle:** immediate strike-through + opacity fade
- **Confirmation flows:** inline ember-colored confirmation text replaces action buttons

---

## Icon System

`Ico` object of inline SVG components in `src/components/shared/icons.jsx`:

`Book, Plus, Check, Search, Left, Star, User, Eye, EyeOff, Down, Note, Mystery, Chat, Chart, X, Refresh, Menu, Library, Dots, Trash, Settings, Edit`

All use a shared `sp` props object: `fill:none`, `stroke:currentColor`, `strokeLinecap/Join:round`.

**Special cases:**
- `Dots` — uses filled circles, not stroked
- `EyeOff` — slash-eye, used for API key show/hide
- `Edit` — pencil, used for chapter rename
- `Settings` — gear, used in settings nav

---

## Grain Texture

`body::after` — fixed inset overlay, SVG `feTurbulence` noise, `opacity: 0.022`, `mix-blend-mode: multiply`, `pointer-events: none`, `z-index: 9998`. Subtle paper texture throughout. Does not affect click targets.

---

## Do Not

- Do not introduce a CSS framework other than Tailwind
- Do not write CSS rules outside `@layer base/components/utilities` in `index.css`
- Do not add emoji to UI copy unless it was already there (`✨` chapter confetti is the only exception)
- Do not add `dark:` utility prefix classes to JSX — use `html.dark` CSS variable overrides instead
- Do not hardcode mood colors — always use `var(--ca, #B8860B)` with gold fallback
