# Lantern — Design System
**Last updated:** 2026-05-21 (Session 81)

---

## CSS Architecture

Tailwind CSS v4 with `@import "tailwindcss"` in `index.css`.

**Critical constraint:** All custom CSS resets must be inside `@layer base {}`. In Tailwind v4, unlayered CSS rules win over all `@layer utilities` classes regardless of specificity. This silently zeros out every `py-*`, `px-*`, `gap-*`, `space-y-*` class. Every custom reset goes in `@layer base {}`.

Custom design tokens are defined in `@theme {}`. Global helper classes (`.tab-btn`, `.card-lift`, `.sticky-bar`, etc.) live outside any layer in `index.css`.

---

## Color Palette — Scholar's Study II

**Identity:** Deep teal-black dark, warm parchment light, cognac text, gold as sole accent.

Defined in `@theme {}` AND `:root {}` in `index.css`. Both must be kept in sync.

### Light mode (`@theme {}` + `:root {}`)

| Family | Tokens |
|--------|--------|
| `cream` | `cream-50 #FFFFFF`, `cream #FAF6EE` (page bg), `cream-200 #F3EDE2`, `cream-300 #EDE5D8` |
| `ink` | 900 `#1C1410` → 100 `#F0E8DC`, 9 stops; ink-700 = cognac `#5C4828` |
| `gold` | `gold #B8860B`, `gold-light #D4AF37`, `gold-pale`, `gold-bg #FDF8EC`, `gold-border #E8D090` |
| `sage` | `#3A6647`, bg `#EBF3EE`, pale `#D4E8DA` |
| `ember` | `#9B2335`, bg `#FDF0F0`, pale `#F5D0D4` |
| `sienna` | `#8B4513`, bg `#FDF4EE`, pale `#F0D5C0` |
| `steel` | `#2D4A6B`, bg `#EEF2F7`, pale `#C8D8EE` |

Semantic `:root` variables:
- `--color-card-base: #FDFAF5` — warm cream tint (NOT pure white; changed Session 77)
- `--color-card-deep: #F3EDE2` — nested surface
- `--color-card-hover: #EDE5D8`
- `--color-companion-bg: #EDE3D0` / `--color-companion-hover: #E5D8C0`
- `--gradient-gold-foil: linear-gradient(135deg, #A07A40 0%, #D8C490 40%, #F0E4B8 60%, #B89060 100%)`
- `--shadow-gold`, `--shadow-gold-hover` — companion panel glow

### Dark mode (`html.dark`)

Remapped to deep teal-black palette:
- Page bg: `#0A1A1E`; companion bg: `#090F14`; text primary: `#D8CCBA`
- `--color-card-base` → dark teal card surfaces
- `--gradient-glow` → single teal radial glow from top + faint gold from right (companion column warmth, added Session 76)

### Semantic usage
- `cream / cream-50` — page backgrounds
- `ink-900` — primary text; `ink-700` — cognac secondary; `ink-400/500` — dim/muted
- `ink-200` — separators; `ink-100` — subtle separators
- `gold` — sole accent: CTA, active states, companion borders, progress bars
- `ember` — destructive actions, error states only

---

## Accent System — Frozen Gold (Session 79)

**The mood color system has been retired.** The accent palette is now frozen to gold across all books.

`:root` defaults and all `[data-mood="*"]` selectors resolve to identical gold values:

```css
:root {
  --ca:        #B8860B;
  --ca-l:      #D4AF37;
  --ca-bg:     #FDF8EC;
  --ca-border: #E8D090;
}

/* All moods resolve to gold — backward compat for stored book.mood values */
[data-mood="sage"], [data-mood="ember"], [data-mood="ink"],
[data-mood="sienna"], [data-mood="gold"], [data-mood="steel"] {
  --ca: #B8860B; --ca-l: #D4AF37; --ca-bg: #FDF8EC; --ca-border: #E8D090;
}

html.dark {
  --ca: #C4A058; --ca-l: #E0C070; --ca-bg: #2A2308; --ca-border: #5A4A0F;
}
```

**Always** use `var(--ca, #B8860B)` for accent elements — buttons, borders, progress bars, companion touches. Never hardcode a mood color.

**Do not remove** `[data-mood="*"]` selectors from CSS — stored book data still carries `book.mood` field and the selectors ensure the value doesn't break anything. They just all resolve to gold.

**Mood communicates through prose and silence, not color.**

---

## Presence Strip (Session 79)

```css
.presence-strip-wrapper {
  border-bottom: 1px solid var(--color-ink-100);
  background: transparent;
}
```

The companion strip above the tab bar. Architecturally integrated — not a sidebar, not a panel.

---

## Surface Softening Classes (Session 80)

### Tab bar — `.tab-btn`

```css
.tab-btn {
  font-size: 11px; font-weight: 400;
  font-family: var(--font-sans);
  color: var(--color-ink-400);
  border-bottom: 1px solid transparent;
  /* no fill, no border-radius */
}
.tab-btn.active {
  color: var(--color-gold);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 12px;
  border-bottom-color: rgba(184,134,11,.35);
}
```

Tabs carry no icons. The active state switches font family — the label reads as a manuscript section marker, not a selected button. Width shift from font-family change is absorbed by the `overflow-x: auto` tab scroll container.

### Filter links — `.filter-link`

```css
.filter-link {
  font-family: var(--font-sans);
  font-size: 11px; font-weight: 400;
  color: var(--color-ink-400);
}
.filter-link.active {
  color: var(--color-ink-800);
  font-family: var(--font-serif);
  font-style: italic;
  font-size: 12px;
}
```

Replaces pill-style filter controls in Notes and Mysteries tabs. Separator dots (`·`) between links are rendered as `<span>` siblings inside a flex container, keyed by tag value. Active: serif italic ink-800. Inactive: sans ink-400.

### Companion residue — `.companion-echo`

```css
.companion-echo {
  font-family: var(--font-serif);
  font-style: italic;
  color: var(--color-ink-300);
  line-height: 1.6;
}
html.dark .companion-echo { color: var(--color-ink-400); }
```

Environmental traces — discovered, not announced. Always 10px when used inline. Never bold, never visible at a glance. Examples: *A thread from this chapter is still in motion.* / *3 thoughts then*

### Dissolved session rows — `.session-row`

```css
.session-row { border-bottom: 1px solid var(--color-ink-100); }
.session-row:last-child { border-bottom: none; }
```

Replaces the bordered card container in session history. Each row is `py-2.5` vertical padding. No background, no border-radius. Reads as handwritten log entries, not a data table.

### Section headings — `SectionHeading.jsx`

Now: `font-serif italic` at 12px, `color: var(--color-ink-500)`, normal weight. Reads as manuscript annotation. Previously: 15px, semibold, ink-800.

### Typography register (Session 80)

| Register | Signal | Properties |
|----------|--------|------------|
| Present / noticed | Serif italic | `.companion-echo`, active `.tab-btn`, active `.filter-link`, `CompanionOrientation` first line |
| Ambient resting | Sans-serif | Inactive tabs/filters, body text, metadata |
| Residue tier | ink-300 or below | Companion echo, chapter footnotes (`· ch. N`), resolved mystery timestamps |

---

## CompanionHeader Document Opening (Session 81)

The CompanionHeader is no longer a product card. It is the opening spread of a reading record.

**Structure:**
```
[cover 50×75px, soft shadow]  [Title — serif 22px weight-600]
                               [by Author — serif italic 14px ink-500  · edit  ···]
                               [series · Nth reading — italic 11px ink-300]  (if set)
                               [update chapter · put this aside · mark as finished]  (11px italic ink-400)
                               [● ReadingMomentum ambient line]
```

**Rules:**
- Header wrapper has **no background fill**. It inherits the page surface (`--color-cream` / dark equivalent). Only `borderBottom: 1px solid var(--color-ink-100)` provides architectural separation from the sticky zone.
- All lifecycle actions + "update chapter" are in the same 11px italic ink-400 register. No visual distinction beyond position. `·` separators are editorial dots, not UI dividers.
- "update chapter" shows only when `isReading || isPaused`. For finished/want-to-read, only lifecycle actions show.
- `isFinished` completion text ("The story ended here — May 12.") renders BEFORE the action row.
- Cover is atmospheric thumbnail — `50×75px`, `border-radius: 8px`, minimal shadow. Not a product cover; a physical memory of the object.
- `StatusBadge`, `WeightedProgressBar`, zone label, and chapter/percentage line are **permanently removed** from this component. Do not reintroduce.

---

## Language Registry (Session 82)

Canonical vocabulary for all visible copy in Lantern. SaaS/operational phrases permanently replaced with editorial/literary equivalents.

### Replaced terms (do not reintroduce)

| Removed | Replacement | Surface |
|---------|------------|---------|
| `"N sessions recorded"` | `"N visits to the story"` | ReadingMomentum fallback |
| `"N sessions in 7 days"` | `"N visits in 7 days"` | ReadingMomentum secondary |
| `"sessions total"` | `"N visits total"` | ReadingMomentum secondary |
| `"Over a month since your last session"` | `"Over a month since your last visit"` | ReadingMomentum |
| `"A week since your last session"` | `"A week since your last visit"` | ReadingMomentum |
| `"Progress"` (tab label) | `"Reading"` | BookDashboard tab bar |
| `"Add a thought…"` | `"leave a mark…"` | PresenceStrip CTA |
| `"Edit companion"` | `"Edit"` | Stewardship menu |
| `"Export companion"` | `"Save a copy"` | Stewardship menu |
| `"Reading history"` | `"chapters"` | ProgressTab section heading |
| `"Reading sessions"` | `"visits"` | ProgressTab section heading |
| `"Reading now"` pill badge | italic `"here"` (gold, 75% opacity, 10px) | Chapter list current marker |
| `"Up next"` pill badge | italic `"next"` (ink-300, 10px) | Chapter list next marker |
| `"Session recorded"` | `"a visit"` (italic, ink-400) | Session row fallback text |
| `"Show all N sessions"` | `"show all N visits"` | Session expand |
| `"Show fewer"` | `"show fewer"` | Session collapse |
| `"+ Capture a thought"` button | `"leave a note →"` (italic text link) | NotesTab primary CTA |
| `"+ reflect"` | `"reflect"` | Note card action |
| `"edit reflection"` | `"add to this"` | Note card action |
| `"Resolved (N)"` | `"answered (N)"` | Mysteries filter tab |
| `"Recent"` / `"A–Z"` / `"Progress"` | `"recent"` / `"a–z"` / `"furthest"` | Library sort options |

### Vocabulary principles
- **Visits, not sessions.** A session is a software unit (login, workflow). A visit is a human act — someone returning to a place.
- **Marks, not captures.** Capture implies a net, a trap, a collection action. A mark is physical, permanent, personal.
- **Answered, not resolved.** Mysteries in stories are answered by the story; "resolved" belongs to ticketing systems.
- **Here, not "Reading now."** One word, no decoration. The position indicator (circle) does the visual work; "here" does the prose work.
- **Lowercase everywhere in action/navigation copy.** Uppercase signals software hierarchy; lowercase signals editorial annotation.
- **No `+` prefix on editorial CTAs.** `+ Capture`, `+ Reflect`, `+ Add` all read as form actions. Literary alternatives don't need a `+`.

### Session 83 additions

| Removed | Replacement | Surface |
|---------|------------|---------|
| `"Discussion"` tab label | `"Wondering"` | BookDashboard tab bar |
| `"Main Characters"` | `"figures"` | CharactersTab section heading |
| `"Secondary Characters"` | `"also present"` | CharactersTab section heading |
| `"Add a character"` (`<Ico.Plus />` button) | `"name a figure →"` (italic text link) | CharactersTab header CTA |
| `"Add the first character →"` | `"name the first figure →"` | CharactersTab empty state |
| `"Add connection"` (`<Ico.Plus />` button) | `"note a connection →"` (italic text link) | CharCard relationship panel |
| `"Open (N)"` filter label | `"open (N)"` | MysteriesTab filter |
| `"Open a thread"` (`<Ico.Plus />` button) | `"raise a question →"` (italic text link) | MysteriesTab header CTA |
| `"+ add a thought"` / `"update thought"` | `"add to this"` | Mystery thread actions |
| `"Refine"` | `"sharpen"` | Mystery thread actions |
| Gold card `"Questions worth sitting with"` header | Removed entirely | DiscussionTab (now "Wondering") |
| `"For book clubs, journalling…"` description | Removed entirely | DiscussionTab |
| `"A question of your own"` SectionLabel | Removed | DiscussionTab input panel |
| `"+ Keep this question"` button | `"keep this →"` (italic text link) | DiscussionTab input |
| `"What are you carrying into the next chapter?"` | `"A question you're carrying into the next chapter…"` | DiscussionTab placeholder |
| `"Your question"` label on user question cards | `"yours"` (italic ink-300) | DiscussionTab user questions |
| `bg-sage-bg border-sage-pale` on user questions | `border-ink-100` + `cream-100` background | DiscussionTab (sage purge complete) |

### Temporal texture vocabulary (Session 82)
Session rows use qualitative duration labels from `DURATION_LABELS` in ProgressTab:
```
brief   → "A brief return"
short   → "A short visit"
medium  → "A steady stretch"
long    → "A long sitting"
```
Sessions > 30 days old render at `opacity: 0.65`, softer ink levels — settled history settles visually.

---

## Tab Dissolution (Session 83)

Tabs should feel like chapter markers in one continuous document, not mode switches.

**Transition:** `tabIn` keyframe — pure opacity fade only. **No translateY.** Any vertical motion communicates "something arrived from outside." Opacity alone communicates "this layer of the document is now visible."

```css
@keyframes tabIn { from { opacity: 0 } to { opacity: 1 } }
--animate-tab-in: tabIn 0.35s ease;
```

**Scroll behavior:** `useEffect` scroll-to-top on tab change is **intentionally absent.** The page position is preserved when switching tabs. The tab button scrolls into view (`scrollIntoView inline: nearest`) but the content does not jump. A reader deep in one section can switch to another and return without losing their place.

**Tab labels:** All lowercase, all literary register. No feature names.
- `Reading` · `Characters` · `Chronicle` · `Notes` · `Mysteries` · `Wondering`

Do not add scroll-to-top behavior back. Do not add translateY to tabIn. These are load-bearing philosophical decisions.

## Cross-Surface Residue (Session 83)

Surfaces remember each other environmentally. Not through visible links or diagrams — through ambient prose lines that appear when conditions are met.

**Characters ← Mysteries:** If `openMysteries ≥ 2` AND notes mention character first names → *"The open questions are still circling some of these figures."* (11px italic ink-400, below the header CTA, above the section)

**Mysteries ← Notes (theories):** If `theoryNotes ≥ 3` AND `openMysteries ≥ 2` → *"Some of what you've been theorising may already be moving toward these."* (11px italic ink-400, below the filter row, above the list)

**Wondering ← Notes (oldest analytical thought):** If `notes.length ≥ 5`, surfaces the oldest theory/confusing note as a 55%-opacity quoted block with date — above the input panel. The reader's first analytical thought persists as ambient historical residue in the reflective space.

**Notes ← Mysteries:** Already present (Session 78+) — if a note's chapter matches an unresolved mystery chapter, renders *"A thread from this chapter is still in motion."* (`.companion-echo`, 10px)

These are deliberately quiet. They should feel discovered, not announced.

---

## Residency Data Schema (Session 84)

New fields added to `INITIAL_BOOKS` entries for simulated reading histories. All fields are backwards-compatible — existing books without these fields behave identically to before.

### Book-level
- `rereadCount` (number, optional) — number of completed rereads. Absent or 0 = first reading. `1` = one prior completed reading. Causes "2nd reading" badge in library card and dashboard header.

### Note-level
- `rereadEra` (number, optional) — which reading era this note belongs to. `0` = first reading (same as absent). `1` = second reading. Affects temporal aging (era 0 notes from a current reread are treated as archival).
- `chapter` (number, optional) — chapter number when the note was made. Used by orchestration for cross-surface keyword proximity scoring.
- `revisedAt` (ISO date string, optional) — date when the note was revised. Renders as "· revisited" on the note card. Used by haunt scoring to weight persistent engagement over initial capture.

### Mystery-level
- `observation` (string, optional) — an annotation added to an existing mystery (typically during a reread or return to a book). Separate from the mystery text itself — it represents the reader's second or revised thought about an open thread. Counts as recent engagement for haunt scoring.

### Principles for residency data design
- **Absence is designed, not accidental.** Wild Dark Shore has 2 notes deliberately — the orchestration should detect this sparseness and recede. Artemis has no `revisedAt` notes deliberately — analytical readers move forward, not back.
- **Keyword overlap is designed.** Artemis theory notes mention "ZAFO" and "Trond" — matching mystery text keywords. This is intentional cross-surface haunt scoring pressure.
- **Dates encode time accurately.** Duma Key's Feb 14–19 sessions are all 91–96 days before May 21, 2026. The silence-gap logic should see this as qualitatively different from Sapiens's 49-day gap.
- **Nonfiction mysteries are phrased as questions, not plot threads.** "Is Harari's Cognitive Revolution claim circular?" is a different kind of mystery than "What is Perse?" — but the mystery data structure holds both.

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

**Philosophy:** Motion should feel *remembered*, not triggered. Emergence is slow. Fades linger. Nothing snaps.

| Animation | Class | Duration | Use |
|-----------|-------|----------|-----|
| `fadeIn` | `animate-fade-in` | 220ms | Character detail panel expand |
| `slideUp` | `animate-slide-up` | 280ms | Defined but replaced in Session 50 |
| `pop` | `animate-pop` | 280ms | Defined, not yet wired |
| `celebrate` | `animate-celebrate` | 500ms | Chapter completion bounce |
| `menuDrop` | `animate-menu-drop` | 150ms | TopNav dropdown |
| `tabIn` | `animate-tab-in` | 220ms | Tab content on switch |
| `viewIn` | `.view-enter` | 220ms | Standard route transitions |
| `bookPageEnter` | `.book-enter` | 420ms | Book page entrance — warmer, blur dissolve |
| `confetti` | `.confetti-dot` | 800ms | ✨ chapter completion |
| `pulse-soft` | `.momentum-dot` | 2s ∞ | ReadingMomentum dot |
| `illuminateIn` | `animate-illuminate` | 420ms | Soft warm fade-in |
| `settleDown` | `animate-settle` | 360ms | Gentle downward settle |
| `emberDrift` | `.ember-drift` | 4s ∞ | ✦ glyph in TopNav — slow float |
| `noteFormArrive` | `.note-form-emerge` | 300ms | Note/mystery form descends from above |
| `noteArrive` | `.note-arrive` | 280ms | Newly saved note rises into list |
| `doneArrive` | `.done-arrive` | 380ms | Chapter done state — scale+Y cubic-bezier |
| `warmSettle` | `.warm-settle` | 340ms | EmptyState, ReadingMomentum, chapter items |

---

## Reusable CSS Classes

| Class | Purpose |
|-------|---------|
| `.tab-btn` | Horizontal tab with bottom-border active state |
| `.tab-btn.active` | Gold border + text (overridden to `--ca` per book) |
| `.sticky-bar` | Sticky with cream bg, blur, border-bottom |
| `.sticky-bottom-bar` | Same, pinned to bottom |
| `.card-lift` | Legacy hover lift — prefer `.atmospheric-card` for new surfaces |
| `.atmospheric-card` | Soft shadow-based containment (no hard border), warm hover |
| `.reading-hero-card` | Featured card for the single active reading book — larger, more presence |
| `.shelf-title` | Italic serif section label for library groupings (quiet, editorial) |
| `.shelf-dormant` | 62% opacity + `filter: saturate(0.82)` with hover restore — for finished/paused books |
| `.shelf-archive` | 38% opacity + `filter: saturate(0.60)` with hover restore — for archived books |
| `.ember-drift` | Infinite slow float animation — used on the ✦ glyph in TopNav |
| `.book-enter` | Route entrance for `/book/*` — 420ms atmospheric dissolve |
| `.note-form-emerge` | Note/mystery add form — descends from above |
| `.note-arrive` | Applied to the most recently added note — rises into view |
| `.done-arrive` | Chapter modal done state — warm cubic-bezier settle |
| `.warm-settle` | Atmospheric settle for EmptyState, ReadingMomentum, chapter list rows |
| `.modal-backdrop` | Backdrop fade-in animation — overlays arrive before modal dialog |
| `.modal-settle` | Modal entrance — spring cubic-bezier `(0.16, 1, 0.3, 1)`, 380ms |
| `.ambient-breathe` | 9s opacity oscillation (0.42→0.62) — for companion ambient presence |
| `.note-writing-mode` | Applied to Notes container during composition — triggers `.note-dim` / `.note-dim-light` on children |
| `.note-dim` | Dims to 32%, `pointer-events: none`, 380ms transition — search + notes list during composition |
| `.note-dim-light` | Dims to 50%, 380ms transition — filter row + metadata during composition |
| `.btn-accent` | `background: var(--ca)`, white text, hover: `var(--ca-l)` |
| `.tag-theory/favorite/confusing/theme/character/quote` | Note tag pill styles |
| `.note-card` | Shadow-led card containment for notes and mysteries — `border: 1px solid rgba(28,20,16,.025)`, `box-shadow: 0 1px 3px rgba(28,20,16,.04)`, hover lifts to `0 2px 10px rgba(28,20,16,.07)`. Uses `var(--color-card-base)` as background. Replaces `border-ink-200` tile aesthetic. |
| `.reading-now-zone` | Tinted zone wrapping the active reading section — negative horizontal margin extends surface to container edge, 12% mood-tinted background via `color-mix`. Added Session 76. |
| `.topo-gap-active` | `margin-bottom: 4.5rem` — below the active reading section |
| `.topo-gap-dormant` | `margin-bottom: 2.5rem` — below set-aside and finished sections |
| `.topo-gap-archive` | `margin-bottom: 1.5rem` — below the archive section |
| `.surface-inhabited` | Increased box-shadow depth on card wrappers for annotated books (presence = 'inhabited') |
| `.surface-inhabited-deep` | Deeper box-shadow for heavily annotated books (presence = 'deep') |
| `.mystery-resolved` | opacity: 0.5 for resolved items |
| `.insight-strip` | Mood-tinted background for CompanionInsights, `backdrop-filter: blur(4px)` |
| `.rel-map-node` | Scale-on-hover for SVG character nodes |
| `.momentum-dot` | Infinite pulse |
| `.view-enter` | Fade + translateY entry |

---

## Interaction Patterns

- **Card hover:** `.card-lift` — translateY(-1px) + shadow elevation
- **Button hover:** `hover:bg-*-light` or inline `onMouseEnter/Leave` for `--ca` derived colors
- **Input focus:** gold ring (`box-shadow: 0 0 0 3px rgba(184,134,11,.12)`) + gold-light border
- **Chapter toggle:** immediate visual + `animate-celebrate` (no loading state)
- **Note addition:** inline expand — form descends from above (`.note-form-emerge`); surrounding content dims via `note-writing-mode` / `note-dim` / `note-dim-light`; new note rises in (`.note-arrive` on `lastAddedId`)
- **Chapter modal:** backdrop arrives first (`modal-backdrop`), then dialog settles (`modal-settle`); done-state close button delayed 420ms; reflection delayed 280ms
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

## Library Architecture (Session 49, updated Session 77)

The library is no longer a flat uniform grid. It uses **status-grouped sections** when filter is `all` and search is empty:

| Section | Status | Visual treatment |
|---------|--------|-----------------|
| reading now | `reading` | `.reading-hero-card` for solo book; 2-col grid for multiple; wrapped in `.reading-now-zone` |
| set aside | `paused` / `want` | 3-col grid, default `.atmospheric-card` |
| finished | `finished` | 3-col grid, `.shelf-dormant` wrapper (62% opacity + saturation cooling) |
| archive | `archived` | 3-col grid, `.shelf-archive` wrapper (38% opacity + saturation cooling) |

When filter is active or search is non-empty: flat grid, no grouping.

Section titles use `.shelf-title` (Playfair Display italic, 11px, 70% opacity). No uppercase tracking, no bold — quiet editorial labels.

**Removed:** "X companions" count metric. It was sterile and dashboard-flavoured.

**Filter bar:** Text-link tabs (not filled pills), minimal sort selector (no border, transparent bg).

### Topographic Spacing (Session 77)

Sections no longer use `space-y-14`. Each section carries its own bottom margin to create visual gravity:

```js
// reading-now → topo-gap-active (4.5rem) when sections follow
// set-aside   → topo-gap-dormant (2.5rem) when sections follow
// finished    → topo-gap-dormant (2.5rem) when archive follows
// archive     → topo-gap-archive (1.5rem)
```

Active content exerts more visual pull — more space beneath. Dormant/archived content recedes.

### Annotation Presence (`bookPresence()` — Session 77)

`bookPresence(book)` returns `'deep' | 'inhabited' | ''` based on annotation density:

```js
const score = notes * 0.045 + openMysteries * 0.09 + readingSessions * 0.02
// ≥ 0.50 → 'deep';  ≥ 0.20 → 'inhabited';  else ''
```

This affects:
- **Card shadow depth** — `BookCard` receives `presence` prop; cover shadow scales up
- **Surface class** — card wrappers receive `.surface-inhabited` or `.surface-inhabited-deep`
- **Solo book width** — a solo deeply-annotated book renders at `max-w-md` instead of `max-w-sm`

---

## Container Philosophy

**Never use hard rectangular borders as the primary containment signal.** Use atmospheric depth instead:

- Default cards: `.atmospheric-card` — `border: 1px solid rgba(28,20,16,.030)` + soft shadow. Near-invisible, shadow leads. (Border reduced from `.065` in Session 77.)
- Hero card: `.reading-hero-card` — slightly more shadow, larger radius (20px); border removed entirely in light mode (Session 77).
- Note/mystery cards: `.note-card` — `border: 1px solid rgba(28,20,16,.025)`, `box-shadow: 0 1px 3px rgba(28,20,16,.04)`. Even softer than atmospheric-card. Shadow-led.
- Content panels: `border border-ink-100` — very light, structural only.
- Headers: `border-b border-ink-100` — single bottom line, not a box.

**Avoid:** `border border-ink-200` on any primary surface. That is the old SaaS-card aesthetic.

**Card base color:** `var(--color-card-base)` = `#FDFAF5` — warm cream tint, not pure white. All card backgrounds must use this token, never `bg-white` or `bg-cream-50` directly.

---

## Spatial Composition Rules

1. **Section breaks** use `border-t border-ink-100` with generous spacing (`mt-10 pt-8`), not visible headings.
2. **Breathing room** before a section title: the `.shelf-title` element has `margin-bottom: 1.1rem`.
3. **Hero asymmetry**: a solo reading book renders at `max-w-xs` (not full grid width) — intentional asymmetry. The empty space is part of the atmosphere.
4. **Progress percentage** in headers: de-emphasized (`text-[11px] opacity-0.85`) — it is context, not the headline.
5. **Insight strip**: serif italic, `py-4` breathing room, `font-serif` for observations (literary register vs sans UI).

---

## Ambient Gradient (Session 49)

Three-layer ambient warmth replaces the single ellipse:
```css
radial-gradient(ellipse 75% 45% at 50% -8%,  rgba(184,134,11,.05) 0%, transparent 65%),
radial-gradient(ellipse 45% 35% at 12% 85%,  rgba(139,69,19,.025) 0%, transparent 55%),
radial-gradient(ellipse 55% 40% at 90% 70%,  rgba(184,134,11,.02) 0%, transparent 60%)
```
Top: gold warmth from above. Bottom-left: sienna earthiness. Right: faint gold. Creates inhabited warmth without being visible as a UI element.

---

## Environmental Presence (Sessions 76–77)

The interface participates in the emotional state of what is being read. This is done through `body::before` layers and section-level atmospheric elements — never through explicit UI feedback.

### Light mode — editorial window-light
`body::before` in light mode is a four-layer asymmetric gradient:
1. Upper-left: strong radial ellipse of warm gold — directional, like window light falling across a desk
2. Center-right: faint sienna warmth blending into the gold
3. Upper-left supplement: smaller secondary source at a different angle — creates double-light quality
4. Full-background parchment depth: very low opacity `#FAF6EE` radial to break pure white flatness

The result reads as an inhabited room, not a designed background.

### Dark mode — teal glow + companion column warmth
`body::before` in dark mode (`html.dark`) has two layers:
1. Teal radial glow from the top — the dominant atmospheric light of Scholar's Study II
2. Faint gold radial from the right (added Session 76) — represents the companion column's presence, warming the surrounding space even when not directly viewed

### Companion column atmosphere (Session 76)
`BookDashboard` wraps its grid in a `position: relative` container. An absolute-positioned overlay div covers the right 38% of the grid:
```js
background: 'radial-gradient(ellipse 100% 60% at 80% 35%, rgba(184,134,11,.032) 0%, transparent 70%)'
```
This is a very low-opacity gold bloom — companion presence affecting surrounding space. Not visible as a UI element; felt as warmth.

### Reading-now zone warmth (Session 76)
`.reading-now-zone` uses `color-mix(in srgb, var(--ca-bg) 12%, transparent)` as its background — the active book's mood color slightly saturates the entire reading section. The zone extends to the container edges via negative margins to feel like a surface, not a box.

---

## Insight Strip Warmth System (Session 53)

The `.insight-strip` background shifts depending on the type of content being shown in the companion carousel.

```jsx
// In CompanionInsights.jsx:
const isCurrentReflection = !!reflectionIndexMap[idx]
// applied as inline style:
background: isCurrentReflection
  ? 'color-mix(in srgb, var(--ca-bg) 78%, var(--color-cream-50))'  // warmer — something remembered
  : 'color-mix(in srgb, var(--ca-bg) 55%, var(--color-cream-50))'  // default — something observed
// transition: 900ms ease — imperceptible as animation, felt as warmth
```

**Why:** Readers gradually learn that warmer = the companion is surfacing something it has been holding (a cached reflection); cooler = it is offering an in-the-moment observation of the reading. This is design language, not a labeled system. Never add a tooltip or label to explain this.

**The 23% difference** (55% → 78%) is subtle enough that it reads as atmosphere rather than state change. On moods with pale backgrounds (ink, steel), the shift is barely visible — intentional.

---

## Do Not

- Do not introduce a CSS framework other than Tailwind
- Do not write CSS rules outside `@layer base/components/utilities` in `index.css`
- Do not add emoji to UI copy unless it was already there (`✨` chapter confetti is the only exception)
- Do not add `dark:` utility prefix classes to JSX — use `html.dark` CSS variable overrides instead
- Do not hardcode mood colors — always use `var(--ca, #B8860B)` with gold fallback
- Do not use hard `border border-ink-200` on primary card surfaces — use `.atmospheric-card`, `.reading-hero-card`, or `.note-card`
- Do not use `bg-white` or `bg-cream-50` directly on card surfaces — use `var(--color-card-base)` (`#FDFAF5`)
- Do not use uniform `space-y-14` between library sections — use `.topo-gap-active/dormant/archive` classes
- Do not use filled pill buttons (`bg-ink-900 text-white rounded-full`) for filter navigation — use quiet text-link tabs
- Do not render raw book counts as UI copy ("3 companions") — remove metric labels; let the content speak
- Do not make the TopNav CTA a loud gold button — use the soft gold-bg/gold-border/gold-text hover style
- Do not use repeated opener patterns in companion language ("Something in…", "You've been…", "What you…", "The story…", "Still…") — vary structure; lead with the observation, not the subject
