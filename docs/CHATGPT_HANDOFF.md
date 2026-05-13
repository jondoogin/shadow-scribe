# Shadow Scribe — Project Handoff
**Last updated:** 2026-05-13 (Session 46)  
**Stack:** React 19 · Vite 8 · Tailwind CSS v4 · React Router v7 · localStorage persistence · No backend

---

## 1. Current App Overview

### What it is
Shadow Scribe is a **reading companion app** — a single-page React application that lets readers track books they're actively reading. It sits somewhere between a reading journal, a spoiler-safe chapter tracker, and a literary notebook. The design philosophy is deliberate: it should feel like a *thoughtful presence* alongside the reader, not a productivity tool or a social platform.

### Overall architecture
Pure frontend SPA with React Router v7. Routes: `/library`, `/new`, `/book/:bookId`, `/settings`. No backend, no auth. Books persist via `localStorage` (key: `shadowscribe_books`).

```
BrowserRouter
└── SettingsProvider (context: settings, updateSetting — persisted under shadowscribe_settings)
    └── BooksProvider (context: books[], updateBook, createBook, resetToDemo)
        └── AppShell (useLocation for page transition keying)
        ├── TopNav (persistent, fixed, z-30; uses useNavigate + useLocation)
        └── [view-enter transition wrapper, keyed by pathname]
            └── Routes
                ├── /library       → LibraryPage → Library
                ├── /new           → NewCompanionPage → CreateCompanion
                ├── /book/:bookId  → BookPage → BookDashboard
                │                     ├── CompanionHeader
                │                     ├── CompanionInsights  (generatePresence)
                │                     ├── sticky tab bar
                │                     ├── [tab content — key-remounted on tab change]
                │                     │   ├── ProgressTab
                │                     │   ├── CharactersTab → RelationshipMap
                │                     │   ├── PlotTab
                │                     │   ├── NotesTab
                │                     │   ├── MysteriesTab
                │                     │   └── DiscussionTab
                │                     └── ChapterUpdateModal (fixed overlay)
                └── /settings      → SettingsPage
```

### Implemented functionality
- **Library view** — grid of book cards with search, status filter (All / Reading / Finished / Paused), and sort (recent / title / progress)
- **Book dashboard** — 6-tab companion for each book
- **Progress tab** — chapter checklist (toggle complete/incomplete, inline rename on hover), chapter-level celebration animation, "reading now" / "up next" indicators; session history log (most-recent-first, paged at 8); isNew empty-state prompt with "Log your first session →" CTA
- **Characters tab** — expandable character cards (main + secondary) with allegiance, description, spoiler-safe flag; inline add/edit with name and Main/Secondary tier toggle; tier moves are atomic (single context update); inline SVG relationship constellation
- **Chronicle tab** — reverse-chronological log of completed chapters with summaries + reflections; star-marking for pivotal chapters
- **Notes tab** — free-text notes with 6 tag types (theory, favorite, confusing, theme, character, quote); tag filtering; full-text search (covers note body and reflections)
- **Mysteries tab** — open question tracker with 6 statuses (open / suspected / evolving / hinted / dormant / resolved); toggle resolution; spoiler-gated by chapter visibility; inline deletion with ember confirmation
- **Discussion tab** — curated discussion questions per book; add-your-own questions (with inline deletion); AI-generated discussion questions via "✦ Generate with Claude" (requires Anthropic API key)
- **Companion Insights strip** — two-layer observation system. (1) **Presence layer** (`generatePresence`, 13 lenses): immediate/contextual observations — arc, finished-book, mystery, lingering mystery, character, character ownership, reader notes, note pattern, interpretation evolution, session rhythm, session stop, pacing, momentum + duration. Boundary-aware; never reveals future deaths or invisible mysteries. (2) **Reflection layer** (`reflectionEngine.js`): retrospective/synthesized observations about the reader's own patterns. Rule-based (sync, always available) + AI-assisted (async, haiku, fires only when key present + 5+ notes + cache stale). Reflections are woven into the presence pool at positions 1 and 4. Cache stored in `book.reflectionCache`. Auto-rotates every 7s with manual dot navigation.
- **Reading Momentum** — streak/session counter below the update button
- **Relationship Map** — SVG constellation (protagonist centered, others in ring); dashed lines color-coded by relationship type
- **Chapter Update Modal** — natural-language chapter input + quick-select buttons; optional duration picker (brief / steady / immersed); creates `SessionEntry` objects on each update; success state with milestone detection, newly-encountered characters, chapter recap, newly-opened mysteries
- **Create Companion** — 3-step wizard: book details + ISBN cover → chapter structure + series → spoiler settings. EPUB import affordance at top of step 1 routes to a parallel 3-step review wizard pre-filled from the parsed file.
- **Per-companion accent theming** — `data-mood` on the dashboard wrapper sets CSS custom properties (`--ca`, `--ca-bg`, `--ca-border`) that cascade to all children. Changing mood also updates `book.coverBg` so the cover gradient stays in sync.
- **Dark mode** — `html.dark` overrides all `--color-cream-*` and `--color-ink-*` CSS custom properties with a warm dark palette. Since Tailwind v4 compiles utilities to `var(--color-*)` at runtime, the entire palette flips without touching component markup. Toggled via Settings → Appearance → Dark Mode; persisted in `shadowscribe_settings`.
- **AI-assisted features** — requires an Anthropic API key stored in Settings. Direct browser → `api.anthropic.com` calls using `anthropic-dangerous-direct-browser-access: true` header. Model: `claude-3-5-haiku-20241022`. Three capabilities: (1) re-extract any companion from a fresh EPUB upload ("✦ Re-extract with Claude…" in the `···` menu); (2) generate tailored discussion questions from book context ("✦ Generate with Claude" in Discussion tab); (3) AI companion reflections — synthesized retrospective observations generated silently in background when key is set + 5+ notes. All logic in `src/utils/aiExtractor.js`.

### Design philosophy
- **Companion voice, not app voice** — microcopy is literary and observational ("Tell the companion where you are", "Return to the companion ✦", "The chronicle begins when you do")
- **Warm analog aesthetic** — cream paper backgrounds, ink color palette, Playfair Display serif headings, grain texture overlay
- **Information without noise** — sections appear only when they have content; empty states use poetic copy rather than CTAs
- **No gamification** — no streaks as achievements, no points, no badges; the momentum display is informational, not motivational
- **Spoiler-aware design** — `spoilerMode` fully enforced: characters veiled/filtered, mystery threads hidden, chapter titles obscured (`···`) beyond reader's boundary. Global default in `SettingsContext`; per-book override on each book. Three modes: `strict` (hide future), `relaxed` (vague placeholders), `full` (show everything).
- **Mood-adaptive UI** — each book has a `mood` value that shifts accent colors throughout its entire dashboard

---

## 2. File / Folder Structure

```
shadow-scribe/
├── docs/                          ← you are here
│   ├── CHATGPT_HANDOFF.md
│   ├── AI_CONTEXT.md
│   ├── SESSION_NOTES.md
│   └── FEATURE_BACKLOG.md
├── public/
│   └── vite.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx                    ← root: BooksProvider + AppShell (view/nav state only)
│   ├── index.css                  ← Tailwind import, @theme tokens, keyframes, data-mood
│   ├── context/
│   │   ├── BooksContext.jsx       ← books[], updateBook, createBook, deleteBook, importLibrary, resetToDemo
│   │   └── SettingsContext.jsx    ← settings (spoilerMode, insightStyle, defaultFormat, anthropicKey, darkMode); useSettings()
│   ├── hooks/useBooks.js          ← re-export of useBooks()
│   ├── utils/
│   │   ├── storage.js             ← loadBooks, saveBooks, resetBooks (localStorage)
│   │   ├── date.js                ← fmtDate, calcStreak, logDates
│   │   ├── progress.js            ← getProgress
│   │   ├── spoiler.js             ← full graduated visibility system (see §Spoiler System below)
│   │   ├── chapterHelpers.js      ← getChapterLabel, getChapterWeight, getWeightedProgress, isSpecialChapter
│   │   ├── companionPresence.js   ← generatePresence(book, settings) — 13-lens presence engine
│   │   ├── reflectionEngine.js    ← assembleReflectionContext, hashContext, shouldRegenerate, generateRuleBasedReflections, getActiveReflections, markReflectionSurfaced
│   │   └── aiExtractor.js         ← callClaude(), aiExtractNarrative(), generateDiscussionQuestions(), generateCompanionReflections()
│   ├── data/
│   │   ├── books.js               ← INITIAL_BOOKS (5 mock books)
│   │   └── config.js              ← STATUS_CONFIG, TAG_CONFIG, MOOD_CONFIG, CHAPTER_TYPES, STRUCTURE_TYPES
│   ├── components/
│   │   ├── layout/TopNav.jsx
│   │   ├── library/Library.jsx + BookCard.jsx + CreateCompanion.jsx
│   │   ├── dashboard/BookDashboard.jsx + CompanionHeader.jsx + CompanionInsights.jsx
│   │   │             ReadingMomentum.jsx + RelationshipMap.jsx
│   │   ├── modals/ChapterUpdateModal.jsx
│   │   └── shared/ (8 files: icons, ProgressBar, StatusBadge, NoteTag,
│   │               BookCover, SectionLabel, SectionHeading, EmptyState)
│   ├── tabs/ (6 files: ProgressTab, CharactersTab, PlotTab,
│   │          NotesTab, MysteriesTab, DiscussionTab)
│   └── assets/
├── index.html
├── vite.config.js
├── package.json
├── eslint.config.js
└── .claude/
    └── launch.json                ← dev server config for Claude Preview tool
```

**Notable:** `utils/epubParser.js` is a pure async utility for in-browser EPUB parsing (no React). `utils/chapterHelpers.js` is the central chapter model utility — all chapter label, weight, and progress logic flows through it. `utils/spoiler.js` is the graduated visibility engine — wired to `CharactersTab`, `MysteriesTab`, `ProgressTab`, `WeightedProgressBar`, and `companionPresence.js`. `utils/aiExtractor.js` is the AI integration layer — all calls to the Anthropic API go through `callClaude()` here. `utils/reflectionEngine.js` is the companion reflection engine — synthesizes reader behavior signals into retrospective observations; no network calls. `utils/insights.js` was deleted in Session 9 (orphaned).

---

## 3. Core Components

### Spoiler System — critical to understand before touching character/mystery/chapter code

Shadow Scribe uses **graduated narrative visibility** — not a simple show/hide system. The philosophy: protect what the reader doesn't know yet; never censor mechanically.

**Mode resolution:** `getEffectiveMode(book, settings)` → `book.spoilerMode ?? settings.spoilerMode ?? 'relaxed'`

| Mode | Characters | Mysteries | Chapter titles |
|------|-----------|-----------|---------------|
| `strict` | Unmet characters return `null` (filtered out); met-but-future get literary veil text | Future mysteries return `null`; no placeholder | Hidden beyond `currentChapter + 1`, shows `···` |
| `relaxed` | Unmet characters shown with evocative placeholder text + `_veiled: true` | Future mysteries shown as "A thread the story is still gathering." + `_veiled: true` | All visible |
| `full` | All characters shown with full detail | All mysteries shown | All visible |

**Key pattern used everywhere:**
```jsx
const mode = getEffectiveMode(book, settings)
const views = book.characters.main
  .map(c => getCharacterView(book, c, mode))
  .filter(Boolean)  // null = filtered out in strict mode
// check c._veiled to choose veiled vs. full card layout
```

Veiled characters always have *something* to render — `_veiled: true` triggers an italic/dimmed card, never a blank. Allegiance strings with `→` are pre-shift trimmed for future characters. This is literary design, not binary visibility gates.

---

### Helpers (functions, not components)
| Name | Purpose |
|------|---------|
| `getProgress(book)` | Returns 0–100 integer % from completed chapters |
| `calcStreak(log)` | Takes `string[] \| SessionEntry[]` (normalised via `logDates`), returns current consecutive-day streak |
| `logDates(readingLog)` | Bridge: extracts ISO date strings from `string[] \| SessionEntry[]`; backward-compatible |
| `sessionEntries(log)` | Filters a readingLog to proper `SessionEntry` objects (excludes migrated stubs with `startChapter === 0 && endChapter === 0`) |
| `normalizeReadingLog(log)` | Storage migration: converts legacy `string[]` entries to `{ id, date, startChapter:0, endChapter:0, rereadEra:0 }` stubs |
| `generatePresence(book, settings)` | Returns up to 8 contextual literary observation strings across 13 lenses; spoiler-boundary-aware |
| `assembleReflectionContext(book, settings)` | Builds a rich context object for reflection generation: categorized notes, temporal evolution arc, character focus signals, mystery signals, session data. Never reads chapter summaries or future-gated content. |
| `generateRuleBasedReflections(ctx, insightStyle)` | Synchronous, <1ms. Returns up to 5 `ReflectionEntry[]` from 9 named signal types. Deduped by type. |
| `hashContext(ctx)` | 8-field ':'-joined fingerprint for `book.reflectionCache` invalidation |
| `shouldRegenerate(book, hash)` | Returns true when: no cache, hash mismatch, or cache older than 3 days |
| `getActiveReflections(book, limit)` | Returns unsuppressed reflections sorted unsurfaced-first |
| `fmtDate(iso)` | Formats ISO date as "Today", "Yesterday", "3d ago", or "May 1" |
| `getChapterLabel(ch, format)` | Returns display label for a chapter (e.g. "Ch. 5", "Pt. 3", "Prologue") |
| `getEffectiveMode(book, settings)` | Resolves spoiler mode: `book.spoilerMode ?? settings.spoilerMode ?? 'relaxed'` |
| `getCharacterView(book, character, mode)` | Returns `null` (strict+unmet) or character object with optional `_veiled: true` and literary placeholder text |
| `getMysteryView(book, mystery, mode)` | Returns `null` (strict+future) or mystery object with optional `_veiled: true` |
| `getChapterTitle(book, chapter, mode)` | Returns real title or `'···'` for strict-mode future chapters |
| `finishedObs(pct, notes, important, style)` | Internal lens: fires only at 99%+ progress; reflects on notes left and starred chapters as the shape of the reader's engagement |
| `lingeringMysteryObs(mysteries, currentChapter, pct, style)` | Internal lens: fires when one or more mysteries have been open for ≥10 chapters; draws attention to deliberate narrative withholding |
| `notePatternObs(notes, style)` | Internal lens: detects character-focused notes (≥2) or simultaneous theory+confusion pattern (≥2 each); fires when `notes.length >= 3` |
| `pacingObs(log, pct, style)` | Internal lens: compares session density in first vs. second half of `readingLog`; fires at ≥1.8x acceleration or deceleration with minimum 5 sessions and 30% progress |
| `characterOwnershipObs(allChars, style)` | Internal lens: fires when any character has `userAdded: true` or `updatedAt` set; reflects the reader's editorial shaping of the cast |
| `interpretationObs(notes, mysteries, style)` | Internal lens: fires when any notes have been revised/reflected or mysteries have observations/refinements; notices the reader's evolving interpretation; returns null for `minimal` style |

### Shared atoms
| Component | Purpose |
|-----------|---------|
| `ProgressBar` | Thin horizontal fill bar; accepts `value`, `color`, `height`, `accentVar` (uses `--ca` CSS var when true) |
| `StatusBadge` | Pill badge for reading status (Reading / Finished / Paused / Want); color-coded |
| `NoteTag` | Colored pill for note tag types; double-duty as filter button with `active` ring state |
| `BookCover` | Fetches Open Library cover by ISBN; falls back to gradient typographic placeholder |
| `SectionLabel` | 10px uppercase tracking label (used above sub-sections) |
| `SectionHeading` | 15px serif heading with optional right-side action slot |
| `EmptyState` | Centered icon + title + body + optional action; used in all tabs |

### Living companion components
| Component | Purpose |
|-----------|---------|
| `CompanionInsights` | Rotating insight strip below CompanionHeader; auto-advances every 7s with 280ms crossfade; manual dot navigation |
| `RelationshipMap` | Inline SVG constellation; protagonist at center (CX=150, CY=120), others at radius R=88 in equal-angle ring; dashed lines with perpendicular-offset labels; color legend |
| `ReadingMomentum` | Pulsing dot + text below update button; shows streak or session count |

### Navigation
| Component | Purpose |
|-----------|---------|
| `TopNav` | Fixed `h-14` header; logo → library; `+ New Companion` button; hamburger menu dropdown |

### Screen: Library
| Component | Purpose |
|-----------|---------|
| `Library` | Full library view; owns search/filter/sort state; sticky sub-nav bar |
| `BookCard` | Card in the library grid; shows cover, title, author, series, status badge, progress bar |

### Screen: Create
| Component | Purpose |
|-----------|---------|
| `CreateCompanion` | 3-step wizard; step 1: title/author/ISBN/format, step 2: chapter count/series, step 3: spoiler mode + confirm |

### Screen: Dashboard
| Component | Purpose |
|-----------|---------|
| `CompanionHeader` | Book hero: cover, title, author, status, progress bar, update button, ReadingMomentum; `···` stewardship menu (edit title/author/temperament, export JSON, delete); temperament editing with 6-option pill row |
| `BookDashboard` | Dashboard shell; owns `tab` state and `showUpdate` modal flag; renders sticky tab bar and key-remounted tab content |
| `ProgressTab` | Chapter checklist with toggle, celebration animation, current/next chapter indicators |
| `CharactersTab` | Expandable character cards + RelationshipMap at bottom |
| `PlotTab` | Reverse-chronological completed chapters with summaries, reflections, star-marking |
| `NotesTab` | Tag-filtered note list; inline add form |
| `MysteriesTab` | Open-question tracker; toggle resolution; filter by active/resolved/all |
| `DiscussionTab` | Curated questions + user-added questions |
| `ChapterUpdateModal` | Fixed overlay; natural-language input + quick-select; success state with milestone, newly-met characters, chapter recap, new mysteries, unresolved threads |

### Icon system
`Ico` object of inline SVG components: `Book, Plus, Check, Search, Left, Star, User, Eye, EyeOff, Down, Note, Mystery, Chat, Chart, X, Refresh, Menu, Library, Dots, Trash, Settings, Edit`. All use a shared `sp` props object (`fill:none`, `stroke:currentColor`, `strokeLinecap/Join:round`). `Dots` uses filled circles (not stroked) — dots are filled in the SVG directly. `EyeOff` is the slash-eye used in the API key field show/hide toggle. `Edit` is the pencil icon used in the chapter rename affordance.

---

## 4. State Management

**Location:** Global books state lives in `BooksContext`. Global settings live in `SettingsContext`. Route state is React Router. All other state is component-local.

### Context
```js
const { books, updateBook, createBook, deleteBook, resetToDemo } = useBooks()
const { settings, updateSetting } = useSettings()
// settings shape: { spoilerMode, insightStyle, defaultFormat }
```
`updateBook(id, changes)` shallow-merges. For nested arrays (chapters, notes, mysteries), always replace the full array:
```js
updateBook(book.id, { notes: [...book.notes, newNote] })
```

### BookDashboard pattern
`BookDashboard` receives `bookId`, looks up `book` from context, passes `book` + `onUpdateBook` down to tabs. Tabs are context-unaware.

### Local component state
- `Library` owns: `q` (search), `filter`, `sort`
- `CreateCompanion` owns: `step`, `form`, `coverErr`
- `BookDashboard` owns: `tab`, `showUpdate`
- `ProgressTab` owns: `celebrating` (chapter num for animation)
- `NotesTab` owns: `activeTag`, `adding`, `newNote`, `newTag`, `editingId`, `editText`, `editTag`, `reflectingId`, `reflectText`
- `MysteriesTab` owns: `showing` (active/resolved/all), `statusPickerId`, `observingId`, `observeText`, `refiningId`, `refineText`
- `DiscussionTab` owns: `input`
- `ChapterUpdateModal` owns: `input`, `done`, `prevCh`, `newCh`
- `CompanionInsights` owns: `idx`, `fade` (reflection generation is side-effected via `updateBook`, not local state)
- `TopNav` owns: `open` (dropdown)
- `CharCard` (inside CharactersTab) owns: `open` (expanded)
- `SettingsPage` owns: `shadowMode` (still a placeholder), `confirmReset`, `showKey`, `keyDraft`, `keySaved`, `importMsg`; real settings (including `darkMode`) read/write through `SettingsContext`
- `DiscussionTab` owns: `input`, `generating`, `genError`
- `CompanionHeader` owns: `reextracting`, `reextractMsg` (in addition to existing menu/edit/delete state)
- `NotesTab` owns: `search` (in addition to existing note/edit/reflect/delete state)
- `ProgressTab` owns: `editingChNum`, `editingTitle` (in addition to existing state)

### Persistence
`BooksContext` reads/writes `shadowscribe_books`. `SettingsContext` reads/writes `shadowscribe_settings`. Both use lazy initializers + `useEffect` write-on-change. `resetToDemo()` clears the books key and reloads `INITIAL_BOOKS` (settings are not reset).

---

## 5. Styling System

### CSS approach
Tailwind CSS v4 with `@import "tailwindcss"` in `index.css`. Custom tokens defined in `@theme {}`. Component styles are Tailwind utility classes in JSX. Global helpers (`.tab-btn`, `.card-lift`, `.sticky-bar`, `.insight-strip`, etc.) live in `index.css`.

**Critical constraint:** All custom CSS resets must be inside `@layer base {}`. In Tailwind v4, unlayered CSS rules win over all `@layer utilities` classes regardless of specificity — this silently zeros out every padding/margin/spacing utility.

### Layout system
- **Max width:** `max-w-4xl` (`896px`) for all content, centered with `mx-auto`
- **Horizontal padding:** `px-5 sm:px-8` (20px mobile, 32px tablet+)
- **Top offset:** `pt-14` on content wrapper to clear the fixed `h-14` TopNav
- **Sticky sub-navs:** `.sticky-bar` with `top-14`, `z-20`, `backdrop-blur`, `border-bottom`
- **Content pages:** `py-6 pb-16` (generous bottom padding for mobile scroll)
- **Tab content:** `max-w-2xl` (narrower than outer max-w-4xl for readability)

### Color palette (defined in `@theme`)
| Token family | Values |
|-------------|--------|
| `--color-cream-*` | `cream-50 #FFFDF9`, `cream #FAF8F3`, `cream-200 #F2EBE0`, `cream-300 #E8DDD0` |
| `--color-ink-*` | 900 (near-black) → 100 (near-white), 9 stops |
| `--color-gold-*` | `gold #B8860B`, `gold-light #D4AF37`, `gold-pale`, `gold-bg`, `gold-border` |
| `--color-sage-*` | `sage #3A6647`, `sage-light`, `sage-bg`, `sage-pale` |
| `--color-ember-*` | `ember #9B2335`, `ember-light`, `ember-bg`, `ember-pale` |
| `--color-sienna-*` | `sienna #8B4513`, `sienna-bg`, `sienna-pale` |

### Per-companion accent theming
`[data-mood="*"]` selectors in `index.css` set scoped CSS custom properties:
```css
[data-mood="sage"]   { --ca: #3A6647; --ca-l: #4D8860; --ca-bg: #EBF3EE; --ca-border: #D4E8DA; }
[data-mood="ember"]  { --ca: #9B2335; --ca-l: #C0392B; --ca-bg: #FDF0F0; --ca-border: #F5D0D4; }
[data-mood="ink"]    { --ca: #44403C; --ca-l: #57534E; --ca-bg: #F5F5F4; --ca-border: #E7E5E0; }
[data-mood="sienna"] { --ca: #8B4513; --ca-l: #A0521A; --ca-bg: #FDF4EE; --ca-border: #F0D5C0; }
[data-mood="gold"]   { --ca: #B8860B; --ca-l: #D4AF37; --ca-bg: #FDF8EC; --ca-border: #E8D090; }
[data-mood="steel"]  { --ca: #2D4A6B; --ca-l: #3D6A9B; --ca-bg: #EEF2F7; --ca-border: #C8D8EE; }
```
`data-mood` is set on `<div data-mood={book.mood || 'gold'}>` wrapping `BookDashboard` and on the `ChapterUpdateModal` wrapper. Components access these via `style={{ color:'var(--ca, #B8860B)' }}` with gold as fallback. The `.insight-strip` background also tints using `--ca-bg` via `color-mix`.

### Typography
| Token | Value |
|-------|-------|
| `--font-serif` | "Playfair Display", Georgia, serif |
| `--font-sans` | "Inter", system-ui, sans-serif |
| Base font size | `15px` |
| Base line height | `1.6` |

Fonts are loaded via Google Fonts CDN in `index.html` (not from node_modules).

### Spacing conventions
- Standard inner padding: `p-4` (16px)
- Form inputs: `px-3.5 py-2.5`
- Section gaps: `space-y-2` to `space-y-8` depending on visual weight
- Bottom page padding: `pb-16` (avoids content obscured at bottom of mobile viewport)

### Elevation
Shadow tokens defined in `@theme`: `--shadow-card`, `--shadow-card-hover`, `--shadow-panel`, `--shadow-modal`, `--shadow-menu`. Used via `style={{ boxShadow:'var(--shadow-modal)' }}`.

### Animation / motion system
All keyframes defined in `index.css`. Applied via Tailwind `animate-*` utilities (custom-named in `@theme`).

| Animation | Trigger | Duration | Use |
|-----------|---------|----------|-----|
| `fadeIn` | `animate-fade-in` | 200ms | Expanded character detail panels |
| `slideUp` | `animate-slide-up` | 250ms | Create form, modal success state |
| `pop` | `animate-pop` | 300ms | — (defined, not yet wired to a trigger) |
| `celebrate` | `animate-celebrate` | 500ms | Chapter completion bounce |
| `menuDrop` | `animate-menu-drop` | 150ms | TopNav dropdown |
| `tabIn` | `animate-tab-in` | 180ms | Tab content on switch (key-remounted) |
| `viewIn` | `.view-enter` class | 220ms | Full-screen view transitions |
| `confetti` | `.confetti-dot` class | 800ms | ✨ on chapter completion |
| `pulse-soft` | `.momentum-dot` class | 2s infinite | ReadingMomentum pulsing dot |

### Reusable primitives (CSS classes in index.css)
| Class | Purpose |
|-------|---------|
| `.tab-btn` | Horizontal tab button with bottom-border active state |
| `.tab-btn.active` | Gold bottom border + gold text (overridden to `--ca` via inline style in BookDashboard) |
| `.sticky-bar` | Sticky element with cream background, blur, and border-bottom |
| `.card-lift` | Hover: translateY(-1px) + shadow elevation |
| `.btn-accent` | Primary action button — `background: var(--ca)`, white text, hover: `var(--ca-l)`; follows companion mood |
| `.tag-theory/favorite/confusing/theme/character/quote` | Colored pill tag styles |
| `.mystery-resolved` | opacity: 0.5 for crossed-out mystery items |
| `.insight-strip` | Gradient background strip for CompanionInsights |
| `.rel-map-node` | Scale-on-hover for SVG character nodes |
| `.momentum-dot` | Infinite pulse animation |
| `.view-enter` | Fade+translateY entry animation for view transitions |

### Grain texture
`body::after` — fixed inset overlay with SVG `feTurbulence` noise, `opacity: 0.022`, `mix-blend-mode: multiply`, `pointer-events: none`, `z-index: 9998`. Provides subtle paper texture throughout.

---

## 6. Current UX Flows

### Library browsing
1. App loads → Library view with all books in a responsive grid (1/2/3 columns)
2. Sticky sub-nav: search input + filter pills (All/Reading/Finished/Paused) + sort dropdown
3. Filtering and sorting are client-side, immediate, no debounce needed at current data size
4. Empty state: "Your shelf is waiting" with create CTA; search empty: "Nothing matches that search"
5. Click a card → `setSelectedId(id); setView('dashboard')` — no URL update

### Companion navigation
1. Click book card → BookDashboard with tab bar defaulting to "Progress"
2. TopNav logo click → returns to Library (view state reset)
3. TopNav hamburger → dropdown with Library + New Companion options
4. No back button in the UI — logo is the back affordance (not obvious to new users)
5. Tab switching triggers `window.scrollTo(0, 0)` and re-mounts tab content with `animate-tab-in`
6. `view-enter` class on the outer content wrapper triggers on all view changes

### Progress updates (Chapter Update Modal)
1. Click "Tell the companion where you are" in CompanionHeader
2. Modal opens with auto-focused textarea and 3 quick-select chapter buttons (+1, +2, +3 from current)
3. Natural-language parsing: regex matches "chapter 21", "ch. 5", "part III", "#12"
4. Quick-select buttons pre-fill the textarea with "Just finished Chapter N"
5. Enter key or "Update companion ✦" button triggers update
6. On submit:
   - All chapters ≤ N marked complete
   - `currentChapter` set to N
   - `lastUpdated` set to today
   - Today's date appended to `readingLog` (deduped)
7. Success state displays: milestone badge (25/50/75/100%) or standard "Chapter N — noted.", progress %, and contextual recap:
   - Newly-encountered characters (those with `lastSeen` in the newly-covered range)
   - Chapter summary + reflection if available
   - Newly-opened mysteries (those with `chapter` in the newly-covered range)
   - Still-unresolved open mysteries (if no new ones)
8. "Return to the companion ✦" closes the modal

### Chapter checklist (ProgressTab)
- Individual chapter rows are click-to-toggle (not tied to modal)
- Toggling complete: plays `animate-celebrate` + confetti dot
- Toggling incomplete: reverts without celebration
- Current chapter highlighted gold; up-next shown with "Up next" pill

### Modal behavior
- `ChapterUpdateModal` is a fixed overlay (`z-50`) with `backdrop-blur`
- No click-outside-to-close (intentional — prevents accidental dismissal)
- Close button (X) in header always available
- ESC key: not wired to close (gap)

### Tab systems
**Library sub-nav tabs (filter pills):** Not `.tab-btn` style — pill buttons that toggle `bg-ink-900 text-white` when active.

**Dashboard tab bar:** `.tab-btn` class with active state overridden via inline style to `var(--ca)` (accent color). Horizontally scrollable (`overflow-x-auto`) on mobile.

### Interaction patterns
- **Card hover:** `.card-lift` translateY + shadow
- **Button hover:** typically `hover:bg-*-light` or inline `onMouseEnter/Leave` for `--ca` derived colors
- **Input focus:** gold ring (`box-shadow: 0 0 0 3px rgba(184,134,11,.12)`) + gold-light border
- **Chapter toggle feedback:** immediate visual + animation (no loading state)
- **Note addition:** inline expand form (no modal)
- **Mystery toggle:** immediate strike-through + opacity fade

---

## 7. Mock Data Structure

All data lives in `src/data.js` as `INITIAL_BOOKS: Book[]`. Currently 5 books.

### Book object
```ts
{
  id: string                    // e.g. 'utwb', 'maniac'
  title: string
  author: string
  isbn: string | null           // null = use gradient fallback cover
  format: 'print' | 'ebook' | 'audiobook'
  spoilerMode: 'strict' | 'relaxed' | 'full'
  status: 'reading' | 'finished' | 'paused' | 'want'
  currentChapter: number        // highest completed chapter number
  totalChapters: number
  lastUpdated: string           // ISO date 'YYYY-MM-DD'
  coverBg: string               // CSS gradient string for fallback cover
  mood: 'sage' | 'ember' | 'ink' | 'sienna' | 'gold' | 'steel'
  structureType?: 'chapter' | 'part' | 'section'  // set by wizard; seed books lack this field
  readingLog: SessionEntry[]    // replaces old string[] — migrated on load by normalizeReadingLog()
  series: null | {
    name: string
    position: number
    total: number
  }
  chapters: Chapter[]
  characters: {
    main: Character[]
    secondary: Character[]
    relationships: Relationship[]
  }
  mysteries: Mystery[]
  notes: Note[]
  discussionQuestions: (string | DiscussionQuestion)[]  // plain strings always visible; objects support spoiler gating
  userDiscussionQuestions: string[]  // reader-added questions; separate from curated ones
  aiDiscussionQuestions?: string[]   // Claude-generated questions (set when "Generate" is used)
  temperament?: string              // 'curious' | 'analytical' | 'emotional' | 'imaginative' | 'quiet' | 'searching'
  narrativeExtracted?: boolean      // true after successful EPUB extraction
  extractionMeta?: { chaptersExtracted, summariesGenerated, characterCount, mysteryCount, warnings }
  completedAt?: string              // ISO date when status → 'finished'
  archived?: boolean
  rereadCount?: number              // increments on each restart
  reflectionCache?: {               // persisted reflection cache (written by CompanionInsights)
    contextHash: string             // 8-field fingerprint; change triggers regeneration
    generatedAt: string             // ISO date — cache expires after 3 days
    reflections: ReflectionEntry[]  // rule-based prepended by AI results on AI success
    aiEnhanced: boolean
  }
}
// ReflectionEntry shape:
// { id: string, text: string, type: 'rule-based'|'ai', surfaceCount: number,
//   lastSurfaced: string|null, suppressed: boolean, generatedAt: string }
// DiscussionQuestion shape:
// { text: string, chapter?: number, visibilityThreshold?: number, alternatePrompt?: string }
```

### Chapter
```ts
{
  num: number
  title: string
  completed: boolean
  summary: string | null        // null for unread chapters
  reflection: string | null     // personal reflection quote
  important: boolean            // star-marked as pivotal
  type?: 'chapter' | 'prologue' | 'epilogue' | 'interlude' | 'part' | 'section'  // defaults to 'chapter'
  estimatedLength?: number      // relative weight for weighted progress (defaults to 1)
  alternateSummary?: string     // shown as title in strict mode (e.g. "An unexpected arrival")
}
```

Display labels come from `getChapterLabel(ch, format)` in `utils/chapterHelpers.js`. Never format chapter labels inline — always use this helper.

### Character
```ts
{
  id: string                    // e.g. 'w1', 'man2'
  name: string
  role: string                  // e.g. 'Protagonist', 'Ferryman'
  status: string                // e.g. 'Alive', 'Deceased', 'Living (immortal)'
  allegiance: string            // can contain '→' to indicate a shift
  lastSeen: string              // e.g. 'Ch. 18' — used by RelationshipMap & modal
  description: string
  spoilerSafe: boolean
  alive: boolean                // drives alive/deceased badge color
  revealChapter?: number        // chapter when first introduced (default: parsed from lastSeen)
  hiddenDescription?: string    // custom veil text before character is met
  hiddenStatus?: string         // custom veil status text
  userAdded?: boolean           // true when created via the in-app add form (not seeded)
  updatedAt?: string            // ISO date of last user edit — drives "understanding revised" signal
}
```

### Relationship
```ts
{
  from: string                  // character id
  to: string                    // character id
  label: string                 // e.g. 'cautious love'
  type: 'love' | 'ally' | 'tension' | 'hierarchy' | 'neutral'
}
```

### Mystery
```ts
{
  id: string
  text: string                  // the question (may be refined from originalText)
  status: 'open' | 'suspected' | 'evolving' | 'hinted' | 'dormant' | 'resolved'
  chapter: number               // chapter where this question first arose
  resolved: boolean             // toggle state
  visibilityThreshold?: number  // override chapter for when mystery becomes visible
  alternateSummary?: string     // vague placeholder shown before threshold (relaxed mode)
  originalText?: string         // first phrasing, preserved on first refinement only (my.originalText ?? my.text)
  observation?: string          // reader's current thinking on this thread
  observationDate?: string      // ISO date observation was last saved
}
```

### Note
```ts
{
  id: string
  text: string
  tag: 'theory' | 'favorite' | 'confusing' | 'theme' | 'character' | 'quote'
  date: string                  // ISO date (creation)
  revisedAt?: string            // ISO date of last edit (set when text or tag actually changes)
  reflection?: string           // follow-up thought added after the original note
  reflectionDate?: string       // ISO date reflection was last saved
}
```

### Config maps (exported from data.js)
- `STATUS_CONFIG` — badge color/dot/label per status
- `TAG_CONFIG` — label/CSS-class per tag
- `MOOD_CONFIG` — per-mood: `label` (display name), `descriptor` (short literary phrase shown in header selector), `color` (hex, matches `--ca`), `ring` (hex, matches `--ca-border`), `description` (longer helper text, used in CreateCompanion wizard)

---

## 8. Outstanding Issues

### `isbn: null` workaround is fragile
Three books have `isbn: null` to avoid wrong Open Library covers. There's no UI to update an ISBN or re-attempt a cover fetch. The `onError` handler in `BookCover` works for 404s but Open Library sometimes returns a placeholder image (200 OK) that looks blank — the `onError` fallback doesn't fire for those.

### `ChapterUpdateModal` natural-language parsing is weak
The regex is pattern-matched (`chapter 21`, `ch. 5`, `part III`, `#12`). It doesn't handle ordinals ("twenty-first"), spelled-out numbers, or "finished the book". Unrecognized input silently falls back to `currentChapter + 1`.

### No mobile keyboard handling in modal
On mobile, the textarea in `ChapterUpdateModal` may be obscured by the software keyboard. No `visualViewport` handling or `env(keyboard-inset-height)` CSS.

### `calcStreak` uses local system time
Streak calculation uses `new Date()` without timezone awareness. A user who reads at midnight crossing a timezone boundary may get incorrect streak counts.

### No loading or error state for Open Library covers
`BookCover` fetches from `covers.openlibrary.org` with no loading state — there's a layout shift while the image loads. No offline handling.

### Vite `.bin/vite` is not a real symlink
In this project, `node_modules/.bin/vite` is a copied file rather than a symlink. All builds must use `node node_modules/vite/bin/vite.js build` directly. Do not attempt to run `vite build` or `npx vite build`.

### `markReflectionSurfaced` is defined but not yet wired
`markReflectionSurfaced(reflections, id)` exists in `reflectionEngine.js` and increments `surfaceCount` — but the carousel in `CompanionInsights` does not call it when displaying a reflection. Surface counts stay at 0 permanently. Rotation still works (unsurfaced-first sort produces correct behavior at 0), but counts won't accumulate meaningfully. Wiring it requires `updateBook` in the interval tick, which has a minor perf cost (one localStorage write per 7s rotation). Low priority but worth completing before v2.

---

## 9. Recommended Next Steps

### Medium-term architecture

1. **Refactor `BookCover` to handle Open Library edge cases**  
   Use a `useEffect` with a separate fetch + HEAD request to validate the image before rendering, or maintain a known-bad ISBN list, or always prefer the gradient fallback with an optional "load cover" button.

2. **Shadow Mode** (distinct from Dark Mode)  
   Planned but not yet implemented. The toggle exists in Settings but is disabled. Intended as a dimmer, lower-contrast reading atmosphere separate from full dark mode.

### Future backend / API considerations

3. **User accounts + sync**  
   Companion data is inherently personal and long-lived. A simple backend (Supabase, Firebase, PocketBase) with row-per-book would enable cross-device sync. Schema maps cleanly to the existing data structure.

4. **Open Library / Google Books API integration**  
   Auto-populate `totalChapters` (from page count estimate), `synopsis`, and cover on ISBN entry. Currently the user must enter chapter count manually.

### AI integration opportunities

13. **Generated chapter summaries**  
    After a user marks a chapter complete, offer to generate a spoiler-safe summary (if the user hasn't written one). Requires API call — keep it optional and lazy.

14. **AI-powered companion reflections** ✅ — Completed in Session 46. The reflection engine now has both rule-based and AI tiers. The AI tier (`generateCompanionReflections` in `aiExtractor.js`) fires silently in background when a key is present and ≥5 notes exist.

15. **Discussion question generation** ✅ — Completed in Session 45. `generateDiscussionQuestions` in `aiExtractor.js`; "✦ Generate with Claude" button in DiscussionTab.

16. **Natural-language chapter entry improvement**  
    Pass the textarea input through a lightweight LLM to extract chapter number from any phrasing ("almost done", "just started the second act", "finished the prologue"), then confirm with the user before updating.

17. **Relationship graph generation**  
    As the user adds characters and notes, offer to auto-suggest relationships and relationship types. The SVG rendering layer is already in place — just needs the data.

18. **Voice input for notes**  
    `window.SpeechRecognition` API for quick voice-to-text note capture while reading. Low-friction for audiobook listeners especially.

---

## 10. Milestone Report — Narrative Trust + Spoiler Enforcement Pass

*Generated 2026-05-07. For the next session's AI assistant — read this before touching spoiler-related code.*

### What was built

The spoiler system is now fully wired into every surface that displays narrative data. This was a two-session build:

**Session 10 (foundation):**
- `src/utils/spoiler.js` — full graduated visibility engine
- `src/context/SettingsContext.jsx` — persistent global settings
- `CharactersTab`, `MysteriesTab` — wired to `getCharacterView` / `getMysteryView`
- `ProgressTab`, `WeightedProgressBar` — chapter titles gated by `getChapterTitle`
- `companionPresence.js` — boundary-aware observations
- `SettingsPage` + `CreateCompanion` — context-wired

**Session 11 (this session):**
- `RelationshipMap` — spoiler-gated; unmet characters absent (strict) or dimmed (relaxed); veiled relationships rendered without labels
- `companionPresence.js` — three `insightStyle` tonal variants: observational, analytical, minimal (caps at 3 observations)
- `books.js` — `alternateSummary` on all 11 UTWB future chapters (evocative placeholders, not spoilers); Lee Sedol added to MANIAC with `revealChapter: 20, spoilerSafe: false` as live demonstration of strict-mode filtering

---

### Visibility model

The system has three axes:

**Axis 1: Mode** (`book.spoilerMode` overrides `settings.spoilerMode`)
- `strict` — hide/filter aggressively. Unmet characters are `null`. Future chapter titles become `···` or `alternateSummary`. Future mysteries are null.
- `relaxed` — preserve structure, obscure content. Unmet characters appear with literary placeholder text and `_veiled: true`. Future mysteries show as "A thread the story is still gathering." Chapter titles always visible.
- `full` — no gating. Show everything.

**Axis 2: Character safety** (two levels)
- `isCharacterMet(book, c)` — has the character appeared yet? Uses `revealChapter ?? parseLastSeenChapter(c.lastSeen)` vs `currentChapter`.
- `isCharacterSafe(book, c)` — is the character's *current state* (status, allegiance, description) within the reader's boundary? Uses `lastSeen` chapter vs `currentChapter`.
- A character can be "met" but not "safe" — i.e., you've encountered them but their future fate/allegiance shift hasn't happened yet. They appear with veiled status/description but unveiled name.

**Axis 3: insightStyle**
- `observational` — metaphorical, warm, uses natural imagery
- `analytical` — structural, notices craft, slightly more detached
- `minimal` — sparse phrases, 3 observations max, skips mystery/character/reader lenses

---

### Key implementation patterns

```jsx
// 1. Character gating (used in CharactersTab and RelationshipMap)
const mode = getEffectiveMode(book, settings)
const views = book.characters.main
  .map(c => getCharacterView(book, c, mode))
  .filter(Boolean)  // null = filtered in strict mode
// c._veiled === true → render veiled card layout
// c._veiled === false → render full card layout

// 2. Chapter title gating (ProgressTab, WeightedProgressBar)
getChapterTitle(book, chapter, mode)
// strict: returns chapter.alternateSummary ?? '···' for chapters beyond currentChapter+1
// relaxed/full: always returns chapter.title

// 3. Mode resolution (used everywhere)
getEffectiveMode(book, settings)
// → book.spoilerMode ?? settings.spoilerMode ?? 'relaxed'
```

---

### Spoiler architecture decisions

**Decision: Literary veil, not mechanical redaction.**  
Veiled characters always have renderable content — a name (preserved), an evocative description (`veiledDescription`, role-aware), a status placeholder. The reader doesn't see a blacked-out box; they see "Their role in this story is still ahead of you." This preserves the companion's literary voice throughout.

**Decision: `null` return for strict+unmet, not a veiled object.**  
`getCharacterView` returns `null` in strict mode for unmet characters. Components filter with `.filter(Boolean)`. This means strict mode doesn't show a "mystery character" — the character simply isn't on the page. Relaxed mode shows them veiled. This distinction matters: strict promises the reader will never see a name they don't yet know.

**Decision: `allegiance` shift handling.**  
Allegiance strings with `→` (e.g. `"Himself → Hugo"`) are split by `veiledAllegiance()`. If the character's `lastSeen > currentChapter`, only the pre-shift portion is shown. The reader only sees where the character stood when they last encountered them.

**Decision: `insightStyle` differences are restrained.**  
The three styles produce noticeably different tone without diverging dramatically. Minimal is the most aggressive change (3 observations, sparse phrases). Analytical is the same structure as observational but craft-oriented. Neither feels like a different product — they feel like the same companion in different moods.

**Decision: RelationshipMap filters at the same boundary as CharactersTab.**  
Both use `getCharacterView` with the same mode. A character absent from the Characters tab will also be absent from the map and have their relationships removed. This prevents the map from leaking information the tab is correctly hiding.

---

### Unresolved trust risks

1. ~~**`ChapterUpdateModal` success state leaks future characters.**~~ **Fixed in Session 12.** Modal now uses `revealAt = c => c.revealChapter ?? parseInt(c.lastSeen?.match(/\d+/)?.[0] || '0')` and a synthetic `bookAtNew = { ...book, currentChapter: newCh }` for all visibility checks. Mystery filtering now goes through `isMysteryVisible(bookAtNew, m, mode)` with proper mode resolution via `useSettings()`.

2. **`PlotTab` chapter titles are always real titles.**  
   PlotTab shows only completed chapters (safe by definition), but the chapter header uses `ch.title` directly, not `getChapterTitle`. Since completed chapters are always within the boundary, this is currently safe — but if the completion logic ever allows future-marking, it would leak.

3. **`insightStyle` affects tone but not accuracy.**  
   All three styles use the same underlying data. The analytical style says "3 threads still open at this depth — convergence is likely deliberate" — this is an interpretation the reader might not want, and it's always shown regardless of mode. A future version could gate certain analytical observations by spoiler mode.

4. **`alternateSummary` requires manual curation.**  
   The evocative placeholders ("A difficult choice", "A line crossed") work well for UTWB because the future chapters are story-driven. For books where chapters are already vague ("Chapter 23"), strict mode would show `···` with no `alternateSummary` fallback — which is still correct behavior, just less evocative. There's no automated generation.

5. **Seed data `spoilerSafe: true` on most characters.**  
   Most seed characters have `spoilerSafe: true`, which bypasses `isCharacterMet` entirely and shows them always. This is intentional for the sample books (which have all characters pre-loaded), but means the veil system has limited demonstration data. Only Lee Sedol (MANIAC) currently exercises the `revealChapter` path.

6. ~~**No spoiler gate on Discussion tab.**~~ **Fixed in Session 12.** `getDiscussionQuestionView(book, question, mode)` added to `spoiler.js`. Questions can now be plain strings (backward-compatible, always visible) or objects `{ text, visibilityThreshold?, chapter?, alternatePrompt? }`. Strict mode filters them out; relaxed mode shows `alternatePrompt` or "A question for later in the story." `DiscussionTab` maps all questions through this function and renders veiled questions with italic/dimmed styling. Seed data updated: UTWB gets 2 gated questions (ch 23+, 25+); MANIAC gets 1 gated question (ch 20+).

---

### Recommended next milestones

**Next immediate:** ~~Chapter Update Modal Fix~~ *Completed in Session 12.*

**Next medium:** ~~New Companion Experience~~ *Completed in Session 13.* See §11.

**Next gap:** Add-character flow  
The Mysteries tab now has an inline add form, but Characters has none. A new companion cannot add characters in-app. A minimal inline form (name, role, status) in CharactersTab would close the last major content gap for new companions.

**Next architectural:** Per-book spoiler mode editing  
Currently `book.spoilerMode` is set in the creation wizard and can't be changed. Adding a spoiler mode toggle in the book dashboard header (small, restrained) would make the system feel live and adjustable.

**Longer term:** ~~Discussion tab spoiler awareness~~ *Completed in Session 12.*

---

## 11. Milestone Report — New Companion Experience Pass

*Generated 2026-05-07 (Session 13). For the next session's AI assistant.*

### What was built

A new companion created via the wizard now feels alive and patient from the first moment, rather than barren. Changes are purely additive — no stable systems were redesigned.

**Files touched:** `BookDashboard.jsx`, `ProgressTab.jsx`, `CharactersTab.jsx`, `MysteriesTab.jsx`, `NotesTab.jsx`, `DiscussionTab.jsx`, `ChapterUpdateModal.jsx`, `CreateCompanion.jsx`

### Onboarding systems added

**Welcome panel (ProgressTab):** Shown when `pct === 0 && readingLog.length === 0`. Displays "Your companion is ready." with a link directly into the chapter update modal. Disappears naturally once any session is logged.

**Inline mystery add form (MysteriesTab):** "+ Open a thread" button in the tab header. Expands an inline textarea form — placeholder "What question is this story carrying?", submits with `status: 'open'`, `chapter: book.currentChapter`. Same pattern as NotesTab. Previously, there was no way to add mysteries in-app.

**First-session modal warmth (ChapterUpdateModal):** When `book.readingLog.length === 0` at the moment of update, the success state reads "Your companion is awake." + "Beginning with Chapter N of M." instead of the standard recap format.

**Literary empty states:** Each tab now has copy that feels patient and welcoming rather than sparse:
- Characters: "The cast hasn't assembled yet."
- Mysteries: "Questions tend to appear once the story begins moving." (with "Open the first thread →" action)
- Notes: "Your thoughts about this story will gather here."
- Discussion: "Questions will find their way here as the companion grows with you." (shown only when no questions exist)

**Creation wizard:** Button copy changed to "✦ Begin the companion" + quiet italic below: "You can add characters, mysteries, and notes as you read."

### Remaining weaknesses

1. **No add-character UI.** Characters tab is still read-only. New companions cannot add characters in-app. This is the biggest remaining gap in the new companion experience.
2. **No add-discussion-question UI beyond user-question field.** Curated `discussionQuestions` must be seeded in `books.js`; no in-app form exists.
3. **Chapter titles remain generic.** New companions get `Chapter 1` through `Chapter N` with no personalisation. This is unavoidable without knowing the book's actual chapter titles, but it means the Progress tab looks mechanical for new books.
4. **`isNew` panel is purely progress-based.** If a user marks chapters complete via the checklist (not the modal), `readingLog` stays empty and the welcome panel persists. Could add a `chapters.some(c => c.completed)` guard, but current behaviour is acceptable.

### Recommended next milestone

**Add-character flow:** A minimal inline add form in CharactersTab (name + role + optional status/allegiance) would close the last major content gap. Should follow the same pattern as the mystery add form — no modal, inline expansion, immediate persistence via `onUpdateBook`.

---

## 12. Milestone Report — Companion Memory + Narrative Continuity Pass

*Generated 2026-05-07 (Session 14). For the next session's AI assistant.*

### What was built

The companion now notices things — not just the reader's current progress, but the shape of the whole reading journey. Five subsystems added or extended across `companionPresence.js`, `ReadingMomentum.jsx`, `NotesTab.jsx`, `MysteriesTab.jsx`, and `PlotTab.jsx`.

### Systems added

**`finishedObs` lens (companionPresence.js):** Fires only at ≥99% progress when notes or starred chapters exist. Reflects on the reader's record of attention — "That's the shape of your reading of this book." Three style variants. Never fires on a sparse finished book (no notes, no stars).

**`lingeringMysteryObs` lens (companionPresence.js):** Fires when any mystery has been open for ≥10 chapters. Observes the deliberateness of withholding ("The story hasn't forgotten it."). Receives already-spoiler-gated `openMyst` array — safe across all spoiler modes.

**`notePatternObs` lens (companionPresence.js):** Detects two patterns: (1) ≥2 character-tagged notes (signals a character-centred reader), (2) ≥2 theory + ≥2 confusing notes simultaneously (signals productive ambiguity). Intentionally non-overlapping with the existing `readerObs` lens. Requires ≥3 total notes to fire.

**`pacingObs` lens (companionPresence.js):** Compares session density in the first and second halves of the reading log. A ≥1.8x acceleration or deceleration triggers a single quiet observation about changed pace. Uses a 7-day floor to prevent false signals from concentrated logs. Requires ≥5 unique session days and ≥30% progress.

**Extended `momentumObs` (companionPresence.js + ReadingMomentum.jsx):** Added 30+ and 60+ day gap cases before the existing 14+ day case. The companion now distinguishes "some time away" from "a long time away" with distinct copy. ReadingMomentum.jsx received matching cases for the momentum strip under the update button.

### Continuity signals introduced

| Signal | Surface | Trigger |
|--------|---------|---------|
| "N notes — mostly {tag}" | NotesTab header | ≥5 notes with a tag holding ≥3 |
| "· N ch. open" | MysteriesTab mystery rows | Mystery unresolved after ≥8 chapters |
| "Just read" badge (gold) | PlotTab chapter rows | Most recently completed chapter |
| "Recent" badge (sage) | PlotTab chapter rows | Chapters within 2 of current |
| Finished reflection | CompanionInsights | ≥99% progress + notes or stars |
| Lingering mystery observation | CompanionInsights | Any mystery open ≥10 chapters |
| Note pattern observation | CompanionInsights | ≥2 character notes, or ≥2 theory + ≥2 confused |
| Pacing shift observation | CompanionInsights | Session rate changed by ≥1.8x across reading halves |
| Long-gap copy (30d / 60d) | CompanionInsights + ReadingMomentum | Gap since last session crosses thresholds |

### Remaining weaknesses

1. **`pacingObs` requires 5 unique session days.** A reader who records all sessions on the same day (entering progress without logging separately) will never trigger this. There's no workaround without a more granular log.
2. **`finishedObs` is silent on sparse finished books.** If a reader finishes with 0 notes and 0 starred chapters, the lens returns null. The companion has nothing to reflect on. This is correct behavior but a real gap in experience for light users.
3. **No character-memory signals.** None of the new lenses notice that the reader has mentioned a specific character by name repeatedly across notes. `notePatternObs` detects the *tag* "character" but not which character. Character-aware signals would require note text analysis — not currently feasible rule-based.
4. **`lingeringMysteryObs` threshold is fixed at 10 chapters.** For short books (20 chapters), this fires at 50% — may feel premature. For long books (40+ chapters), a mystery open from chapter 2 at chapter 35 is 33 chapters old but still triggers on the same low threshold. A relative (% of book length) threshold would be more calibrated but adds complexity.
5. **Pacing and note patterns don't adapt to insightStyle=minimal.** Both `pacingObs` and `notePatternObs` return null for `minimal` — intentional. But `finishedObs` minimal variant only fires with ≥3 notes. Minimal users with sparse engagement get very little presence.

### Recommended next milestone

**Add-character flow** remains the top-priority feature gap. A minimal inline add form in CharactersTab (name + role + optional status/allegiance) would close the last major content gap for new companions. Should follow the mystery-add-form pattern: no modal, inline expansion, immediate persistence via `onUpdateBook`.

**After that:** Per-book mood editing. No UI to change a book's mood after creation. A small swatch row in the book dashboard header would make the theming system feel live and adjustable rather than fixed at creation time.

---

## 13. Milestone Report — Character Curation + Companion Ownership Pass

*Generated 2026-05-07 (Session 15). For the next session's AI assistant.*

### What was built

The Characters tab is now a writable, editable, relationship-aware surface — the first tab in the app that lets the reader genuinely shape content, not just consume it. `CharactersTab.jsx` was completely rewritten. `companionPresence.js` received one new lens.

### Files touched

- **`src/tabs/CharactersTab.jsx`** — complete rewrite (was ~136 lines, now ~300 lines)
- **`src/utils/companionPresence.js`** — `characterOwnershipObs` lens added; `allChars` derived in `generatePresence`

### Character systems added

**Add-character inline form (Task 1):** `+ Add a character` button at top-right of the tab. Expands an inline form with Name + Role (required) and a "More options" toggle revealing Status, Allegiance, Notes/description, and "Appears from chapter". Main/Secondary toggle. Saves immediately via `onUpdateBook`. New characters receive `userAdded: true`, `alive` derived from status text, and `spoilerSafe: false` if `revealChapter` is set. Form follows the same interaction philosophy as MysteriesTab's add form.

**Editable character details (Task 2):** Each expanded CharCard has an `Edit` button at the bottom of the full view. Edit mode pre-fills all fields from the raw character data (not the spoiler-view data). Saves persist Role, Status (with `alive` derived from text), Allegiance, Description, and `revealChapter`. On save, `updatedAt` is stamped with today's ISO date. Veiled characters don't get an Edit button unless they are `userAdded`.

**Relationship editing foundation (Task 3):** CharCard's full expanded view includes a `CONNECTIONS` subsection listing all relationships involving that character. Each row: other character's name, relationship label, type pill, and × remove button. An `+ Add connection` link opens an inline mini-form with: target character selector (only shows spoiler-safe visible characters), type dropdown (love/ally/tension/hierarchy/neutral), and label input. Add and remove write directly to `book.characters.relationships` via `onUpdateBook`.

**Empty-state evolution (Task 4):** The empty state now shows a richer body copy ("Begin noting the people who matter in this story. They'll gather here as you read — named, described, connected.") with an `Add the first character →` action link that opens the add form directly.

**Companion ownership signals (Task 5):**
- In CharactersTab: quiet italic line at the bottom — "One character added by you." / "N characters added by you." — shown only when `userAdded` characters exist.
- In CharCard full view: when `updatedAt` is set and character is not `userAdded`, a subtle italic line: "Your understanding of this character has been revised."
- In CompanionInsights (`characterOwnershipObs` lens): fires when any character has `userAdded: true` or `updatedAt` set; three style variants: observational ("You've introduced a character to this companion. They're part of the story as you're reading it now."), analytical ("The cast is becoming partly your own construction."), both silent for minimal.

### Spoiler architecture — unchanged

All new code respects the existing spoiler system. The relationship target selector uses `visibleChars` (already filtered through `getCharacterView`) — hidden characters cannot be targeted. `characterOwnershipObs` reads raw `book.characters` (which includes `userAdded`/`updatedAt` regardless of mode) — the lens doesn't expose character names or details.

### Unresolved UX risks

1. **No character deletion.** Characters can be added and edited but not removed. A mistyped character persists forever. A "Remove from cast" option in the edit form would fix this. Requires a two-step confirm (to prevent accidental deletion).

2. **`alive` inferred from status text.** `deriveAlive()` checks for "deceased" / "dead" strings. Unusual status text ("Consumed", "Beyond the veil") won't flip `alive: false`, leaving the status badge green. A future `alive` checkbox in the edit form would be more reliable.

3. **Relationship form has no way to edit an existing label.** Existing relationships show label + type as read-only text. Editing a label requires removing the relationship and re-adding it. A simple inline edit mode for the label text would be a natural next step.

4. **`userAdded` chars always go to the end of the list.** New characters are appended to the array, so they appear after all seed characters. There's no reordering. For books with many seed characters, user additions can get buried.

5. **`characterOwnershipObs` fires early.** One character added = the lens fires in CompanionInsights. This is intentional and consistent with the restrained tone, but for prolific adders (10+ characters) the observation "You've added 10 characters…" feels less literary and more like a count. A higher threshold (≥3) might feel better.

### Recommended next milestone

**Per-book mood editing** — the most self-contained remaining polish item. No way to change a book's mood after creation. A small swatch row on the book dashboard header (6 swatches with live preview) would make the theming system feel dynamic. Low risk, no spoiler concerns, pure UX win.

**After that:** Character deletion + relationship label editing — close the remaining gaps in the character management surface before moving to other areas.

---

## 14. Milestone Report — Companion Revision + Living Interpretation Pass

*Generated 2026-05-07 (Session 16). For the next session's AI assistant.*

### What was built

The companion is now a living notebook rather than a static one. Notes can be edited in-place, annotated with later reflections, and tagged differently as understanding evolves. Mystery threads can be refined, annotated with observations, and re-statused inline. The presence engine now notices all of this.

**Files touched:** `src/tabs/NotesTab.jsx`, `src/tabs/MysteriesTab.jsx`, `src/utils/companionPresence.js`

### Systems added

**Revisitable Notes (Task 1 — NotesTab.jsx):** Edit mode pre-fills textarea and tag picker; saves `revisedAt` only when text or tag actually changed. "· revisited" italic indicator in footer. Reflection block: transparent textarea inside `border-l-2` container. Saves `reflection` + `reflectionDate`; displays as italic paragraph below note body with date. Footer links toggle between "+ reflect" and "edit reflection".

**Evolving Mystery Threads (Task 2 — MysteriesTab.jsx):** Status badge is now a clickable button (unresolved non-veiled only) toggling an inline pill picker with 5 non-resolved statuses. "+ add a thought" opens observation textarea in `border-l-2` container; saves `observation` + `observationDate`. "Refine" opens pre-filled textarea; saves new `text` while preserving `originalText` via `my.originalText ?? my.text`. "· refined" indicator appears in metadata row when `originalText` exists.

**Interpretation Evolution Lens (Task 3 — companionPresence.js):** `interpretationObs(notes, mysteries, style)` — 11th lens in `generatePresence`. Fires when total count of revised notes + reflections + mystery observations + refined mysteries ≥ 1. Priority order: revised theories (≥2) → refined mysteries (≥2) → revised notes (≥3) → both reflections+observations (≥2 each) → observations (≥2) → reflections (≥2) → single revised theory. Returns null for `minimal`.

**Historical texture (Task 4):** "· revisited" in NotesTab footer. "· refined" in MysteriesTab metadata row. Both are 10px italic `text-ink-300` — visible but unobtrusive.

**Ownership polish (Task 5):** Changing a note's tag now counts as a revision (triggers `revisedAt`). "update thought" replaces "+ add a thought" once an observation exists. These signals reinforce that the companion is tracking an evolving reader, not a static record.

### Data model additions

| Field | Model | Description |
|-------|-------|-------------|
| `revisedAt?` | Note | ISO date of last edit (text or tag change) |
| `reflection?` | Note | Follow-up thought appended later |
| `reflectionDate?` | Note | ISO date of last reflection save |
| `originalText?` | Mystery | First phrasing; set once on first refinement only |
| `observation?` | Mystery | Reader's current thinking on the thread |
| `observationDate?` | Mystery | ISO date of last observation save |

All fields are optional and backward-compatible. Existing notes and mysteries work without them.

### Architecture decisions

**`today()` as a function.** Both tabs define `const today = () => new Date().toISOString().split('T')[0]` rather than a module-level constant. A module-level const would freeze the date at import time — a subtle bug if the module is loaded before midnight and a note is saved after.

**`originalText ?? currentText` — first write only.** The `??` operator means `originalText` is only set if it doesn't already exist. A mystery that's been refined three times still shows its very first phrasing as the original. This is intentional literary design.

**Saving undefined, not null.** When a reflection or observation is cleared (empty string submitted), the field is saved as `undefined`. This omits it from the serialized object, keeping localStorage clean. `null` would persist an explicit null, which would serialize and take space.

**Status picker excludes `resolved`.** The `toggle` checkbox on each mystery card handles the `resolved/open` transition with its own logic. Including `resolved` in the picker would create a conflicting second pathway and ambiguous state.

**Left-border container consistency.** Both the Notes reflection block and the Mystery observation block use `border-l-2 border-ink-200 pl-3` with italic body text. The same visual language across both tabs makes the pattern instantly recognizable.

**`interpretationObs` uses raw `book.mysteries`.** Unlike the mystery count lenses (which use pre-gated `openMyst`), `interpretationObs` reads the raw array to check for `observation` and `originalText`. These fields contain no plot information — they're reader-written annotations. No spoiler risk.

### Remaining weaknesses

1. **No deletion for notes or reflections.** A reflection can be cleared by saving an empty textarea (saved as `undefined`), but there is no explicit "remove reflection" affordance. Notes themselves still have no delete UI.
2. **Refinement can't be undone.** Once a mystery is refined, the new text is saved immediately. There's no "revert to original" action. The original is preserved in `originalText` and displayed as "· refined", but the user can't one-click restore it.
3. **`interpretationObs` competes with other lenses.** With 11 lenses and a cap of 8, the new lens may be crowded out by arc + momentum + mystery + reader lenses on active books. It fires last in the `notePatternObs` → `interpretationObs` → `pacingObs` sequence, so pacing can beat it. This is acceptable but worth monitoring.
4. **Reflection has no tag.** Reflections are untagged free text. A reflection that changes the note's interpretation can't be differentiated from one that adds supporting detail. This is intentional simplicity for now.
5. **No observation input for resolved mysteries.** The thread actions (`+ add a thought`, `Refine`) are hidden when a mystery is resolved. A resolved mystery's observation is read-only after resolution. This is the correct default but may frustrate users who want to annotate a resolved thread after the fact.

### Recommended next milestone

**Per-book mood editing** — the most self-contained remaining polish item. No way to change a book's mood after creation. A small swatch row in the companion header (6 swatches, live preview) would make the theming system feel dynamic. Low risk, no spoiler concerns.

**After that:** Note deletion. A "delete" affordance in the note edit form (with a simple confirmation step) would close the most glaring omission in the notes surface. Character deletion is the equivalent gap for the Characters tab.

---

## 15. Milestone Report — Companion Atmosphere + Visual Identity Cohesion Pass

*Generated 2026-05-07 (Session 17). For the next session's AI assistant.*

### What was built

A cumulative polish pass across the app's visual identity — motion, elevation, typography, and component consistency. No new features. All changes are subtle, restrained, and additive. The goal was to bring the visual language closer to "quietly beautiful" rather than loudly designed.

**Files touched:** `src/index.css`, `src/components/dashboard/CompanionInsights.jsx`, `src/tabs/PlotTab.jsx`, `src/components/modals/ChapterUpdateModal.jsx`, `src/components/shared/EmptyState.jsx`, `src/components/shared/SectionLabel.jsx`, `src/tabs/NotesTab.jsx`, `src/tabs/MysteriesTab.jsx`

### Changes by area

**Motion restraint (index.css):**
- Animation durations calmed: `fade-in` 200ms→220ms, `slide-up` 250ms→280ms, `tab-in` 180ms→220ms
- `celebrate` overshoot reduced: peak `scale(1.07)`→`scale(1.04)`, rebound `scale(.98)`→`scale(.99)`
- `.card-lift` hover lift `translateY(-2px)`→`translateY(-1px)`; transition `.2s`→`.25s`
- `.tab-btn` transition `.15s`→`.2s`

**Elevation softening (index.css):**
- All 5 `--shadow-*` tokens reduced in opacity and spread — paper-layer feel, not floating-card feel

**Atmospheric surface polish (index.css):**
- Body `line-height` 1.5→1.6
- `.sticky-bar` border `ink-200`→`ink-100`; blur `8px`→`10px`
- `.insight-strip` color-mix `40%`→`55%`; blends with `cream-50` instead of `cream`

**CompanionInsights (CompanionInsights.jsx):**
- Removed `momentum-dot` pulse from ✦ literary marker — pulse is an app-UI pattern, wrong for a quiet companion symbol
- Insight text `text-[12px]`→`text-[13px]`; padding `py-3`→`py-3.5`
- Nav dots `w-1 h-1`→`w-1.5 h-1.5`; inactive `ink-300`→`ink-200`; fade `300ms`→`420ms ease`

**Typography hierarchy (PlotTab.jsx):**
- Chapter title weight: `font-semibold text-[13px]`→`font-medium text-[14px]` (more editorial, less UI-label)
- Chapter number: `bg-white font-bold text-ink-600`→`bg-cream font-medium text-ink-500` (warmer, quieter)
- Left-border reflection treatment: replaced boxed `bg-gold-bg border rounded-xl p-3.5` with `border-l-2 border-gold-border pl-3` — now consistent with Notes and Mysteries

**ChapterUpdateModal success state (ChapterUpdateModal.jsx):**
- Entrance: `animate-slide-up`→`animate-fade-in` (less mechanical)
- Symbol: de-emphasized to `text-base opacity-70` with accent color (was `text-2xl`)
- Text sizing lifted: subtitle `text-[12px]`→`text-[13px]`; mystery text `text-[12px]`→`text-[13px]`
- Diamond marker: `text-[12px]`→`text-[10px] opacity-70` (small, receded)

**UI Consistency (EmptyState, SectionLabel, NotesTab, MysteriesTab):**
- `EmptyState` padding `py-20`→`py-16` (better proportioned in tab context)
- `SectionLabel` tracking `tracking-widest`→`tracking-wider`; bottom margin `mb-3`→`mb-2.5`
- `NotesTab` + `MysteriesTab`: all plain metadata text and action links lifted from `text-[10px]`→`text-[11px]`
- Status badge pills and status picker buttons intentionally kept at `text-[10px]` — they are styled pill components, not metadata text

### Established patterns (canonical going forward)

**Left-border supplementary content:** `border-l-2 border-*-border pl-3` + italic body text — now consistent across Notes (reflections), Mysteries (observations), and Plot (chapter reflections). Any future supplementary/annotation content should use this pattern.

**Metadata text floor:** `text-[11px]` for all plain metadata dates, inline indicators ("· revisited", "· refined"), and ghost action links. `text-[10px]` reserved for pill badge components only.

**Literary markers (✦, ◆):** Should not use animated classes. These are static symbols. Motion should come from the surrounding container (crossfade, fade-in), not the symbol itself.

### Remaining items not yet touched

1. **Mood system audit (Task 5)** — contrast consistency and background tint strength across the 6 moods was not reviewed this session. All `[data-mood]` selectors in `index.css` remain as-is from earlier sessions. A future audit should check each mood's `--ca`, `--ca-bg`, `--ca-border` values for contrast ratio and emotional differentiation.

2. **Note and mystery deletion** — still no delete affordance in either tab. Edit form is the natural home for a "delete" action with confirmation.

3. **Per-book mood editing** — `book.mood` is set at creation and cannot be changed. A swatch row in CompanionHeader would complete the mood system.

### Recommended next milestone

**Per-book mood editing** — ~~six mood swatches in the book dashboard header~~ *Completed in Session 18.* See §16.

---

## 16. Milestone Report — Per-Book Mood Editing Pass

*Generated 2026-05-07 (Session 18). For the next session's AI assistant.*

### What was built

Mood is now a live, adjustable property of every companion. Readers can switch between all six moods directly in the book header — no modal, no settings panel. The entire dashboard (accent colors, insight strip, borders, badges, buttons) updates instantly. A companion for an Ember book can be shifted to Ink mid-read; the whole surface responds.

**Files touched:** `src/data/config.js`, `src/components/dashboard/CompanionHeader.jsx`, `src/components/dashboard/BookDashboard.jsx`, `src/components/dashboard/RelationshipMap.jsx`, `src/index.css`, `src/tabs/ProgressTab.jsx`, `src/tabs/PlotTab.jsx`, `src/tabs/NotesTab.jsx`, `src/tabs/MysteriesTab.jsx`, `src/tabs/CharactersTab.jsx`

### Mood selector implementation (Task 1–4)

**Location:** Bottom of the CompanionHeader info column, below ReadingMomentum, separated by `border-t border-ink-100`.

**Visual design:** Six 14px circles (`w-3.5 h-3.5 rounded-full`) in a flex row with `gap-2`. Each circle uses its mood's `--ca` hex as background color. The active mood has a `box-shadow` ring: `0 0 0 1.5px #FFFDF9, 0 0 0 3px {ring-color}` — creating a cream gap and a soft outer border.

**Interaction:** Hovering a non-active swatch: it scales to `scale(1.15)`, all other non-active swatches dim to 30% opacity. Clicking immediately calls `onUpdateBook({ mood: m })`. Since `BookDashboard` derives `data-mood` from `book.mood`, all CSS vars cascade instantly.

**Descriptors (Task 3):** A short evocative phrase appears to the right of the dots: "reflective and patient", "intimate and tense", "quiet and literary", "earthy and unhurried", "warm and luminous", "cool and analytical". Shows at 45% opacity (current mood's descriptor) — brightens to 85% on hover. Never intrusive; always legible.

**MOOD_CONFIG updated:** Added `descriptor`, `color` (hex), and `ring` (hex) fields to each entry, matching the CSS `[data-mood]` selectors. `label` and `description` preserved for CreateCompanion wizard backward compatibility.

### Live mood updating (Task 2)

No architectural changes required. `BookDashboard` was already reactive: `data-mood={book.mood || 'gold'}` on the outer wrapper, all children use `var(--ca)` / `var(--ca-bg)` / `var(--ca-border)`. Calling `onUpdateBook({ mood: m })` triggers a context re-render and the `data-mood` attribute updates immediately, cascading all CSS vars throughout the dashboard.

### Consistency fixes (Task 5)

**`.btn-accent` CSS class added (index.css):** Consolidates all primary action buttons under a single mood-responsive class (`background: var(--ca)`; hover: `var(--ca-l)`). Previously scattered as `bg-gold hover:bg-gold-light` across 4 tabs.

**Surfaces fixed:**
| Surface | Was | Now |
|---------|-----|-----|
| ProgressTab current chapter row | `bg-gold-bg border-gold-border` | `var(--ca-bg)` / `var(--ca-border)` inline |
| ProgressTab current chapter circle | `border-gold`, `bg-gold` dot | `var(--ca)` inline |
| ProgressTab "Reading now" badge | `bg-gold-bg text-gold border-gold-border` | `var(--ca*)` inline |
| PlotTab "Just read" badge | `bg-gold-bg text-gold border-gold-border` | `var(--ca*)` inline |
| PlotTab reflection border | `border-gold-border` | `var(--ca-border)` inline |
| NotesTab / MysteriesTab add-panel border | `border-gold-border` | `var(--ca-border)` inline |
| CharactersTab add-form border | `border-gold-border` | `var(--ca-border)` inline |
| All primary Save/CTA buttons (×7) | `bg-gold hover:bg-gold-light` | `.btn-accent` |
| RelationshipMap love lines | `#B8860B` (hardcoded) | `var(--ca, #B8860B)` |

### Intentionally kept as gold

| Element | Reason |
|---------|--------|
| `★` star on important chapters | Semantic "starred/important" convention; gold is culturally meaningful here |
| MysteriesTab `suspected` / `hinted` status pills | Taxonomic status classification, not accent — these colors represent mystery states, not companion mood |
| CreateCompanion mood picker | The wizard uses gold as a neutral default before a mood is chosen; changing it would break the picker's own before-selection state |
| Discussion tab quotation mark (`"`) | Typographic/decorative; always gold regardless of mood is intentional and reads as literary texture |

### Remaining inconsistencies (not fixed this session)

1. **ProgressTab `text-gold` on starred chapter label** — The chapter label for `ch.important` chapters uses `text-gold` but only in the checklist. The PlotTab star button also uses `text-gold`. Changing these would make the "importance" signal look different per mood (a sage-themed book would show a dark green star). Worth considering, but not obviously wrong.

2. **ChapterUpdateModal "Update companion ✦" button** — Uses `style={{ background:'var(--ca)' }}` for the submit button (already correct), but the "Return to the companion ✦" close button uses `bg-ink-900` (intentional — it's a neutral close action).

3. **`tag-favorite` in NotesTab** — The "favourite" tag pill uses hardcoded gold (`#FDF8EC / #92660A / #E8D090`). This is a tag semantic color (gold = favourite), not an accent. Unchanged.

### Recommended next milestone

~~**Note deletion**~~ *Completed in Session 19.* See §17.

---

## 17. Milestone Report — Deletion Affordances + Safe Removal Pass

*Generated 2026-05-08 (Session 19). For the next session's AI assistant.*

### What was built

Every user-writable surface now has a safe removal path. Notes can be deleted. Reflections can be removed independently. Characters can be removed from the cast. Relationship labels and types can be edited inline. No destructive action is one click — all confirmations are two-step.

**Files touched:** `src/tabs/NotesTab.jsx`, `src/tabs/CharactersTab.jsx`

---

### Deletion flows added

**Note deletion (NotesTab):**
- Affordance: "Remove note" link at bottom-left of edit mode (`text-[11px] italic text-ink-400`, `hover:text-ember`).
- Clicking exits edit mode and enters a full card-takeover confirmation state (`isDeleting`).
- Copy: "Remove this thought from the companion?" / "Keep it" / "Yes, remove it".
- On confirm: note filtered from `book.notes` via `onUpdateBook`. Persists to localStorage via existing context.
- `startEdit` and `startReflect` both clear `deletingId` — mutual exclusion enforced.

**Reflection removal (NotesTab):**
- Affordance: "remove" link in note footer, visible when `note.reflection` exists and `!isReflecting`.
- Clicking shows inline confirmation in the footer action area: "Remove this reflection?" / "Keep it" / "Yes".
- On confirm: sets `reflection: undefined, reflectionDate: undefined` on the note. Does not delete the note itself.
- Distinct from clearing reflection via the reflection editor (submitting empty text). This is an explicit removal signal with its own confirmation.

**Character deletion (CharactersTab):**
- Affordance: "Remove from cast" link at bottom-left of character edit mode (`text-[11px] italic text-ink-400`, `hover:text-ember`).
- Clicking exits edit mode and sets `confirming: true` in the CharCard.
- Confirmation renders as first priority in the expanded card body.
- Copy: "Remove this character from the companion?" / "Keep them" / "Yes, remove them".
- On confirm: `deleteChar(charType, charId)` removes character from the correct array AND removes all relationships where `r.from === charId || r.to === charId` — single `onUpdateBook` call.
- Collapsing the card resets `confirming` — stale confirmation state cannot persist across open/close cycles.

---

### Relationship label editing (CharactersTab)

Each relationship row in the full character view now has an "edit" text link. Clicking opens an inline form (label input + type select + Save/Cancel) that replaces that row.

- `saveEditRel` uses `r === rel` reference equality to update the correct entry in `book.characters.relationships`. Safe because `rels` is a filtered subset of the original array — its elements are direct references, not copies.
- `removeRel` resets `editingRelIdx` to prevent stale indices after array shrinkage.
- `startEditRel` closes the add-relationship panel when opening a relationship edit — only one form active at a time.

---

### Architecture decisions

**`isDeleting` as a peer state to `isEditing`, not a nested sub-mode.** Clicking "Remove note" transitions from `editingId` state to `deletingId` state — two sibling states rather than a flag inside edit mode. This keeps the edit/delete concerns separate and allows each to have a clean card rendering path.

**Full card takeover for note delete confirmation, inline footer for reflection removal.** Note deletion is higher stakes — full takeover removes visual pull from the note text while the destructive button is live. Reflection removal is lower stakes — inline footer confirmation is proportionate.

**Atomic character deletion.** Both mutations (character removal + relationship pruning) are batched into a single `onUpdateBook` call. One context update, one localStorage write.

**Ember (`#9B2335`) for all destructive UI.** `bg-ember text-white` on confirm buttons; `hover:text-ember` on "Remove" initiation links. Resting state always neutral (`text-ink-400 italic`). Consistent across both tabs. The ember color was already present in the palette as a mood color — using it here for destructive actions doesn't introduce a new visual language.

---

### Unresolved risks

1. **Mystery deletion has no removal affordance.** Mysteries can be resolved (toggled) and refined, but not deleted. A mystery added in error persists forever. A "Remove thread" option in the mystery detail (analogous to note deletion in edit mode) would close this gap.

2. **Discussion question deletion is absent.** User-added questions (stored in `book.userDiscussionQuestions`) cannot be removed. No affordance exists in `DiscussionTab`.

3. **No undo.** Deleted notes and characters are gone immediately after confirmation. There is no undo or archive. For notes, this is acceptable given the two-step confirmation. For characters, deletion also removes relationships — a cascade with no recovery path.

4. **`r === rel` relationship editing relies on reference equality.** This works because `rels` is a filtered subset of the actual `book.characters.relationships` array — elements are not copied. If the data model is ever refactored to copy relationships (e.g., for immutability), this comparison would silently fail to match. Adding `id` fields to relationships would be the clean fix.

5. **No "Remove from cast" for veiled non-userAdded characters.** Veiled seed characters that aren't `userAdded` don't get an edit button (existing behavior from Session 15), so they also can't be deleted. This is intentional — seed characters are curated data, not user-entered. But if a user wants to remove a mismatched seed character, they have no path.

---

### Recommended next milestone

~~**Book lifecycle / status transitions**~~ *Completed in Session 20.* See §18.

**Mystery and discussion question deletion** — the two remaining writable surfaces with no removal path. Mystery deletion: "Remove thread" affordance inside the mystery detail, two-step confirmation. Discussion question deletion: × on each user-added question row. Both are low-complexity, self-contained additions.

---

## 18. Milestone Report — Book Lifecycle + Companion Completion Pass

*Generated 2026-05-08 (Session 20). For the next session's AI assistant.*

### What was built

The companion now has a complete reading lifecycle. Every status transition is accessible from the book header. Archived companions live in a separate quiet section of the library. Finished companions show a completion statement in place of the update button. Rereading resets progress while preserving every note, mystery, and reflection.

**Files touched:** `src/components/dashboard/CompanionHeader.jsx`, `src/components/library/Library.jsx`

---

### Lifecycle states added

**Status transitions (all via `CompanionHeader` lifecycle actions row):**

| Action | Trigger state | Result | Confirmation |
|---|---|---|---|
| Begin reading | `want` | `status: 'reading'` | None |
| Put this aside | `reading` | `status: 'paused'`, writes `pausedAt` | None |
| Pick this back up | `paused` | `status: 'reading'` | None |
| Mark as finished / the story ends here ✦ | `reading` or `paused` | `status: 'finished'`, writes `completedAt`, marks all chapters complete | Yes |
| Begin again | `finished` | `status: 'reading'`, resets chapters, writes `restartedAt`, increments `rereadCount` | Yes |
| Archive this companion | `finished` (or any non-archived) | `archived: true` | Yes |
| Restore to shelf | archived | `archived: false` | None |

**Finished companion state (CompanionHeader):**
- Update button hidden; replaced with quiet italic completion line: "The story ended here — May 3." (or "today" / "yesterday" for recency).
- `ReadingMomentum` hidden when finished — streak display doesn't apply to a closed book.
- CompanionInsights continues functioning; the `finishedObs` lens (Session 14) fires at ≥99%, providing literary reflections.

**Reread indicator:**
- When `rereadCount > 0`, a quiet italic label appears near the StatusBadge: "2nd reading", "3rd reading", etc.
- `rereadCount` increments on each restart. `completedAt` is preserved across restarts — the companion remembers when the book was first finished.

**Soft finish suggestion:**
- When `pct >= 100`, "mark as finished" becomes "the story ends here ✦" with slightly stronger color (`text-ink-600` vs `text-ink-400`). The ✦ marker makes it visually distinct without being a button or badge.

---

### Archive behavior (Library)

- `archived` is a boolean flag on the book, separate from `status`. A book can be `{ status: 'finished', archived: true }`.
- Active companions: filtered by status pills + search. Archive section is independent.
- Archived companions: filtered by search only (status filter does not apply). Rendered below active grid with `border-t` separator and "Archive · N" heading (uppercase tracking, `text-ink-300` — intentionally recessed).
- Archived card wrappers: `opacity-60 hover:opacity-90 transition-opacity`. Same BookCard component — no component changes.
- Archive section only renders when archived companions exist and match the search query.
- Archive is fully reversible: "restore to shelf" in the companion header unsets `archived`.

---

### Restart / reread behavior

Restart resets: `currentChapter: 0`, all chapter `completed: false`, `status: 'reading'`.

Restart preserves: `notes`, `mysteries`, `characters`, `readingLog`, `discussionQuestions`, `userDiscussionQuestions`, `completedAt`, `series`, `mood`, `spoilerMode`.

The `readingLog` continues accumulating — a reread's sessions append to the existing log. This means `pacingObs` and `momentumObs` in CompanionInsights will see the full combined session history after restart. This is acceptable; the companion is meant to track the reader's ongoing relationship with the book, not separate discrete reads.

---

### Data model additions (all optional, all backward-compatible)

| Field | Type | Notes |
|---|---|---|
| `completedAt` | string (ISO) | Set when `status → 'finished'`. Preserved across restarts. |
| `archived` | boolean | True = archived. Absent/false = active. |
| `restartedAt` | string (ISO) | Set on each restart; always the most recent restart date. |
| `rereadCount` | number | 0 (or absent) = first reading; 1 = second; etc. |
| `pausedAt` | string (ISO) | Set when `status → 'paused'`. Not yet surfaced in UI. |

---

### Unresolved risks

1. **`CompanionInsights` `finishedObs` lens fires on restarts.** After restarting (progress resets to 0%), `finishedObs` won't fire (requires ≥99%). But the old `completedAt` is preserved and notes from the previous read still exist. The `readerObs` lens may produce observations that feel like they're from the previous read. The notes are genuinely still there and relevant, but the framing could feel anachronistic. A future guard: `notePatternObs` and `readerObs` could check `restartedAt` to soften observations during early rereads.

2. **`pausedAt` written but not surfaced.** The field exists in data but nothing in the UI reads it. A future enhancement: "Paused May 3 — 12 days away" in ReadingMomentum's gap-detection logic.

3. **`pacingObs` sees combined readingLog on reread.** Session history from the first read and the reread are merged. If a reader read the book fast the first time and slow the second time, `pacingObs` might fire with a confusing "you've slowed" observation that's actually comparing the second read's pace to the first read's pace. Mitigation: filter `readingLog` to sessions after `restartedAt` for pacing calculations, but this is a future refinement.

4. **No `want` → `finished` direct path.** A user cannot mark a "Want to Read" book as finished without first beginning reading. This is intentional — the lifecycle requires a reading cycle — but worth noting for edge cases (e.g., a book already read before the app existed).

5. **Archive section has no "un-filter" affordance.** If the user filters by "Reading" and has archived books, the archive section shows all archived books regardless of the active filter. This is correct behavior but could feel inconsistent to users who expect the filter to apply globally. No fix recommended — this is the intended design.

---

### Recommended next milestone

**Mystery and discussion question deletion** — the last two writable surfaces with no removal path. Both follow established patterns from Session 19: mystery deletion (inline affordance in mystery detail, two-step confirmation); discussion question deletion (× on user-added question rows). Low risk, self-contained.

**After that:** Surface `pausedAt` in ReadingMomentum — "Paused May 3. Still here." copy variant for the gap-detection branch. Completes the lifecycle data model's UI coverage.

---

## 19. Milestone Report — Mobile Ergonomics + Reading Flow Pass

*Generated 2026-05-08 (Session 21). For the next session's AI assistant.*

### What was built

The companion is now comfortable to use one-handed on a phone. The primary reading action is always within thumb reach. The update modal doesn't get buried under the keyboard. The tab bar scrolls cleanly and follows the active tab. All interactive targets meet minimum touch size. iOS safe areas and notch insets are handled correctly.

**Files touched:** `src/components/dashboard/BookDashboard.jsx`, `src/components/modals/ChapterUpdateModal.jsx`, `src/index.css`, `index.html`

---

### Changes by task

**Task 1 — Sticky Mobile Reading Action (BookDashboard.jsx + index.css):**
- A fixed bottom bar appears only on mobile (`sm:hidden`) when `book.status === 'reading' || book.status === 'paused'` and the book is not archived.
- Contains a full-width `.btn-accent` button: "Tell the companion where you are" — same copy and icon as the header button, always within thumb reach without scrolling.
- Bar uses `.sticky-bottom-bar` CSS class: `position: fixed; bottom: 0; left: 0; right: 0; z-index: 30`; backdrop blur + cream background; `padding-bottom: max(0.75rem, env(safe-area-inset-bottom))` for iPhone home bar.
- Hidden when book is finished, archived, or in `want` status — it's only relevant when progress is expected.
- `data-mood` attribute on the bar wrapper so `.btn-accent` uses the companion's accent color.
- Main content `pb-16` increased to `pb-28 sm:pb-16` — extra bottom padding on mobile to prevent the sticky bar from overlapping the last content item.

**Task 2 — Mobile Modal Ergonomics (ChapterUpdateModal.jsx):**
- Outer overlay changed from `p-4` to `sm:p-4`: the modal now extends flush to the screen edges on mobile (no 1rem gap at sides or bottom).
- Modal panel uses `flex flex-col` + `maxHeight: '90svh'` — constrained to 90% of the small viewport height.
- Header (`flex items-center justify-between`) wrapped in `flex-shrink-0` so it doesn't shrink when body content is tall.
- Body div (`px-6 py-5`) gains `overflow-y-auto` — the success state's multiple content cards scroll within the modal rather than extending off screen.
- `.modal-sheet` class applied to the modal panel: on mobile this sets `border-radius: 20px 20px 0 0` (correct bottom-sheet shape) and `padding-bottom: max(1rem, env(safe-area-inset-bottom))`.
- Existing `rounded-2xl` preserved (desktop stays fully rounded; mobile uses `.modal-sheet` override).

**Task 3 — Tab Navigation Comfort (BookDashboard.jsx):**
- `tabRefs` ref object stores a DOM ref per tab button.
- New `useEffect` on `[tab]` calls `tabRefs.current[tab]?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })` — the active tab scrolls into view when switched, even on small screens where tabs overflow.
- Each tab button receives `ref={el => { tabRefs.current[t.id] = el }}`.
- Added to `@media (max-width: 640px)` in `index.css`: `.tab-scroll-fade { scrollbar-width: none }` and `::-webkit-scrollbar { display: none }` — the scrollbar no longer appears on the tab strip on iOS/Android.

**Task 4 — Reading Density (index.css):**
- Body `line-height` was already 1.6 (raised in Session 17 from 1.5). No change needed.
- Main content bottom padding increased (see Task 1) ensures sufficient whitespace before the sticky bar on mobile.
- No other density changes: existing `px-5 sm:px-8` gutters and card spacing are appropriate.

**Task 5 — Touch Interaction Polish (index.css):**
- Added to `@layer base`: `button, [role="button"], a, input, select, textarea { touch-action: manipulation }` — eliminates the 300ms tap delay on all interactive elements without disabling pinch-zoom.
- All interactive elements in the app use `py-1.5` minimum on buttons (≈32px rendered), rising to `py-3` on primary CTAs (≈48px). Tab buttons were already 48px tall on mobile (set in Session 19 mobile block).
- The sticky bottom bar button is `py-3` — comfortably within 44pt Apple guideline.

**Task 6 — iOS / Safe Area / Safari Pass (index.css + index.html):**
- `index.html` viewport meta updated: `viewport-fit=cover` added — enables `env(safe-area-inset-*)` to work correctly on devices with notches and home bars.
- `.sticky-bottom-bar` uses `padding-bottom: max(0.75rem, env(safe-area-inset-bottom))`.
- `.modal-sheet` uses `padding-bottom: max(1rem, env(safe-area-inset-bottom))` (moved to unlayered block so it applies at all breakpoints; border-radius override stays in `@media (max-width: 640px)`).
- `-webkit-backdrop-filter` added alongside `backdrop-filter` in `.sticky-bottom-bar` for Safari compatibility.
- `#root { min-height: 100svh }` was already set correctly (Session 17); `ChapterUpdateModal` now uses `maxHeight: '90svh'` — `svh` (small viewport height) is the correct unit on iOS where the URL bar changes height.

---

### Architecture decisions

**Sticky bar as `position: fixed`, not sticky.** A `position: sticky` element requires a containing block that scrolls — in this layout the page itself scrolls. `fixed` with `z-index: 30` (above tab bar z-20 but below modals z-50) is the correct choice.

**Bottom bar hidden on desktop via `sm:hidden`.** The CompanionHeader's inline "Tell the companion where you are" button is already accessible on desktop with no scrolling. The mobile bar is additive — it doesn't replace the header button, it duplicates it at the bottom for thumb reachability. Both trigger `setShowUpdate(true)`.

**`90svh` for modal, not `100svh - constant`.** Safari's `svh` unit accounts for the dynamic viewport (URL bar visible/hidden) and represents the smaller of the two heights. `90svh` gives 10% breathing room at the top of the overlay, which naturally centers the modal above the keyboard when it appears.

**`scrollIntoView({ inline: 'nearest', block: 'nearest' })`.** `nearest` alignment means tabs that are fully visible don't scroll at all — only partially visible or off-screen tabs animate into view. This avoids jarring snaps when the active tab is already visible.

---

### Unresolved risks

1. **Keyboard resize on iOS causes modal reflow.** When the keyboard appears, iOS shrinks the visual viewport but the `svh` unit responds to the small viewport (before keyboard), so `90svh` may still slightly clip on very small phones with tall keyboards. The `overflow-y-auto` body handles this — content is scrollable regardless. Not fixable without `visualViewport` API.

2. **`env(safe-area-inset-bottom)` is 0 on most Android devices.** The `max(0.75rem, ...)` pattern means Android always gets `0.75rem` padding — comfortable and correct, even without a real inset.

3. **Tab `scrollIntoView` may conflict with the `window.scrollTo` (page scroll).** Both effects run on the same `[tab]` change. In practice they target different scroll containers (page vs. tab strip), so they don't interfere. If a future refactor wraps the tab strip in a full-page scroll context, this could conflict.

4. **The sticky bottom bar covers the very last content item if `pb-28` is too small.** On extremely tall content blocks, users may need to scroll past the end to read the last line. `pb-28` (112px) should comfortably clear the bar (≈56px including safe area), with 56px of additional breathing room.

---

### Recommended next milestone

**Mystery and discussion question deletion** — the last two writable surfaces with no removal path. Mystery deletion: "Remove thread" affordance inside the mystery detail, two-step confirmation. Discussion question deletion: × on each user-added question row. Both are low-complexity, self-contained, and follow the established ember-confirm pattern from Session 19.

---

## 20. Milestone Report — EPUB Ingestion Foundation Pass

*Generated 2026-05-08 (Session 22). For the next session's AI assistant.*

### What was built

Shadow Scribe can now ingest a real `.epub` file entirely in the browser — no backend, no AI, no cloud. The user selects an EPUB, the app parses it locally, and routes them into a 3-step review wizard that pre-fills title, author, chapters, and cover before creating the companion. The existing dashboard and all downstream systems (spoiler engine, progress tracking, lifecycle, presence engine) require zero changes — the EPUB flow produces the same book shape.

**New dependency:** `fflate@0.8.2` — lightweight in-browser ZIP decompression.

**Files created:** `src/utils/epubParser.js`, `src/components/library/EpubImportReview.jsx`

**Files modified:** `src/components/library/CreateCompanion.jsx`, `src/components/shared/BookCover.jsx`, `package.json`

---

### EPUB parser architecture (`src/utils/epubParser.js`)

**Entry point:** `async parseEpub(file: File) → EpubImport`

**ZIP handling:** `fflate.unzipSync(Uint8Array)` → `{ [path]: Uint8Array }`. A case-insensitive file map handles inconsistent EPUB path casing.

**XML handling:** `DOMParser` for all XML/HTML parsing. Element access via `localName` scanning rather than CSS namespace selectors — `querySelector('dc\\:title')` behavior is inconsistent across browser XML parser implementations.

**Extraction pipeline:**
1. `META-INF/container.xml` → OPF path
2. OPF metadata → `dc:title` (title), `dc:creator` (author), `dc:identifier` with ISBN scheme (isbn)
3. Cover image: `<meta name="cover" content="id">` → manifest item → bytes → resize via `<canvas>` to 300px JPEG
4. TOC: EPUB3 `nav.xhtml` (searched via `properties="nav"`) → EPUB2 `toc.ncx` (searched via `media-type="application/x-dtbncx+xml"`) → spine fallback
5. Chapter type detection: regex against title string; detects prologue, epilogue, interlude, part/act, section, chapter
6. Noise filtering: removes TOC entries matching structural non-chapter patterns (cover, copyright, table of contents, index, etc.)
7. Dominant structure type: counts part/section/chapter distribution

**Return shape:**
```js
{
  title: string,
  author: string,
  isbn: string | null,
  coverData: string | null,   // base64 JPEG data URL, ≤300px wide, ≤300KB
  chapters: [{ num, title, type }],
  totalChapters: number,
  structureType: 'chapter' | 'part' | 'section',
  warnings: string[],          // human-readable notices for the review screen
}
```

---

### Import flow architecture

**`CreateCompanion.jsx` changes:**
- Added `importing`, `importData`, `importError` state + hidden `<input type="file" accept=".epub">`.
- EPUB affordance: a dashed-border zone at the top of step 1 with an "Import from EPUB" button. Errors render inline.
- Loading state: full-screen "Reading your EPUB…" while `parseEpub()` runs.
- Routing: if `importData` is set, renders `<EpubImportReview>` instead of the manual wizard. "Back" in review clears `importData` and returns the user to manual entry.

**`EpubImportReview.jsx`** — 3-step wizard mirroring CreateCompanion's structure:
- Step 1: Book details (title, author, ISBN, format, mood) + cover preview + parse warnings
- Step 2: Chapter structure (type picker, count input, scrollable editable chapter list with type cycling)
- Step 3: Spoiler settings + companion summary
- `buildBook(epubData, form)` — pure function that produces a complete companion object; handles chapter count mismatch by padding/trimming EPUB chapters.

**`BookCover.jsx` change:** `book.coverData` (base64 data URL) added as highest-priority cover source. Renders synchronously without chain traversal or loading state.

---

### Data model additions

| Field | Type | Where used |
|-------|------|-----------|
| `book.coverData` | `string \| undefined` | Base64 JPEG data URL from EPUB cover; checked first in `BookCover` before ISBN chain |

All other book fields are identical to manually-created companions. No special-casing in any dashboard component.

---

### LocalStorage safety

- Cover images are resized to ≤300px wide JPEG at 78% quality via `<canvas>`. Typical stored size: 15–40KB.
- 300KB hard cap: if `canvas.toDataURL()` produces more than 300KB, `coverData` is set to null and a warning is shown. Falls back to gradient.
- Chapter arrays from real EPUBs are typically 20–60 entries. Each chapter object is ~100 bytes. No size risk.
- Corrupt or DRM-protected EPUBs throw with a user-facing error message. The wizard returns to its entry state.

---

### Unresolved EPUB risks

1. **DRM-protected EPUBs fail at the ZIP level.** Adobe DRM (`.acsm`) and some Kindle EPUBs encrypt the content files. `fflate.unzipSync` will throw for corrupted ZIPs, and the error handler surfaces a user-facing message. The user simply cannot import these without a DRM-free source.

2. **NCX nav points can nest (multi-level TOC).** `findEls(doc, 'navPoint')` retrieves all navPoints including nested sub-chapters. For books with part → chapter → scene hierarchies, all levels appear flattened in the chapter list. The user can correct types in the review step or edit chapter count.

3. **Some EPUBs have no navigable TOC.** Non-fiction EPUBs (especially older EPUB2) sometimes omit NCX or nav and only use the spine. The spine fallback generates "Chapter N" titles — a warning is shown, and the user can rename them in the review screen or later in ProgressTab.

4. **Canvas-based cover resize is not available in all environments.** In Firefox Private Browsing and some worker contexts, canvas operations may be blocked. The resize function catches errors and sets `coverData = null` with a warning. Not a critical failure path.

5. **`btoa(String.fromCharCode(...))` approach for base64 has a chunk limit.** The current implementation processes bytes in 8192-byte chunks to avoid call stack overflow for large binary files. This is correct for normal EPUB covers but worth noting if very large covers (>2MB) are encountered.

6. **ISBN extraction is best-effort.** The EPUB metadata may omit the ISBN, contain a non-ISBN identifier, or use an alternate `scheme` attribute name. The extractor falls back gracefully to `isbn: null`, which means the OpenLibrary cover chain is not attempted (gradient used unless `coverData` was extracted).

7. **Author field takes only the first `dc:creator`.** EPUBs with multiple authors (anthologies, co-authored books) will show only the first. Multi-author support is out of scope for this milestone.

---

### Recommended next milestone

**EPUB chapter enrichment:** The companion is now created with real chapter titles and types, but `summary: null` for all chapters. A future pass could attempt to extract chapter content from the EPUB HTML files and store it as the chapter summary (available for PlotTab display once the chapter is completed). This would be purely extractive — no AI, no generation.

**Alternatively:** Mystery and discussion question deletion (the last two writable surfaces with no removal path) remains outstanding from §17's recommendations — lower scope, high-confidence implementation following the existing ember-confirm pattern.

---

## 21. Milestone Report — Reading Session Memory + Companion Stewardship Pass

*Generated 2026-05-12 (Sessions 41–42). For the next session's AI assistant.*

### What was built

The companion now remembers not just *when* you read, but *how much* and *how deeply*. Each session logged via ChapterUpdateModal creates a structured `SessionEntry` — a timestamped record of the chapter range covered and an optional atmospheric duration. The presence engine has two new lenses that read this richer session data. The companion's stewardship model is now complete: title, author, temperament, and the companion itself can all be managed from the dashboard header without leaving the book.

### Files touched

- **`src/utils/date.js`** — `logDates`, updated `calcStreak`
- **`src/utils/storage.js`** — `normalizeReadingLog`, `normalizeBook`; applied to all `loadBooks()` return paths
- **`src/context/BooksContext.jsx`** — `deleteBook` action added to provider
- **`src/components/shared/icons.jsx`** — `Dots`, `Trash` icons added
- **`src/data/books.js`** — All 5 demo books' `readingLog` updated from `string[]` to `SessionEntry[]`
- **`src/components/modals/ChapterUpdateModal.jsx`** — Duration picker, focus trap, `SessionEntry` creation
- **`src/utils/companionPresence.js`** — `sessionRhythmObs`, `sessionStopObs` lenses; `sessionEntries` helper; `logDates` import
- **`src/tabs/ProgressTab.jsx`** — Session history section, `isNew` empty state, migrated-entry handling
- **`src/components/dashboard/CompanionHeader.jsx`** — Stewardship menu (`···`), edit form (title/author/temperament), export, delete flow
- **`src/components/library/Library.jsx`** — EmptyState with "Begin a companion →" CTA link
- **`.claude/launch.json`** — Vite dev server config (workaround for broken `.bin/vite` symlink)

---

### Session Memory — `SessionEntry` data model

`readingLog` was previously `string[]` of ISO date strings. It is now `SessionEntry[]`:

```ts
interface SessionEntry {
  id: string               // 's_${Date.now()}' for user sessions; 'migrated_${date}_${i}' for legacy
  date: string             // ISO date string (YYYY-MM-DD)
  startChapter: number     // chapter the reader was at before this session
  endChapter: number       // chapter the reader reached
  rereadEra: number        // book.rereadCount || 0 at time of logging
  durationEstimate?: 'brief' | 'steady' | 'immersed'
}
```

**Migrated stubs** (converted from legacy string entries) have `startChapter: 0, endChapter: 0`. Detection pattern: `s.startChapter === 0 && s.endChapter === 0`. This check **must come before** `startChapter === endChapter` in any conditional — migrated stubs would otherwise display as "Chapter 0".

**`normalizeReadingLog(log)`** runs on every `loadBooks()` call, converting any leftover string entries to migrated stubs. Idempotent — proper `SessionEntry` objects pass through unchanged. Defined in `storage.js`, not exported (only used internally in `normalizeBook`).

**`logDates(readingLog)`** — exported from `date.js`. Extracts ISO date strings from `string[] | SessionEntry[]`. Used by `calcStreak` and `companionPresence.js` anywhere raw dates are needed. This is the backward-compatibility bridge.

**`sessionEntries(log)`** — defined in `companionPresence.js`. Filters log to proper `SessionEntry` objects (excludes migrated stubs). Used by the two new lenses where chapter range and duration data are meaningful.

---

### Duration Picker (ChapterUpdateModal)

Three optional atmospheric buttons below the chapter input (before the submit button):

| Key | Label |
|-----|-------|
| `brief` | "A brief return" |
| `steady` | "A steady stretch" |
| `immersed` | "Pulled you in" |

All three are optional — no selection is valid. Selected state uses `var(--ca-bg)` / `var(--ca-border)` / `var(--ca)`. Deselecting the same button clears the selection.

`handleUpdate` creates a `SessionEntry`:
```js
const entry = {
  id: `s_${Date.now()}`,
  date: today,
  startChapter: book.currentChapter,
  endChapter: n,
  rereadEra: book.rereadCount || 0,
  ...(durationEstimate ? { durationEstimate } : {}),
}
```

Multiple sessions per day are deliberately allowed. The old `Set()` deduplication in `readingLog` was removed — multiple sessions per day is the point of the system.

The modal also received a focus trap (Tab cycles within the dialog) and `role="dialog" aria-modal="true"` accessibility attributes.

---

### Session History (ProgressTab)

A "Reading sessions" section renders below the chapter checklist when `readingLog` has entries. Display is reverse-chronological (most-recent-first). Paged at 8 with "Show all N sessions" / "Show fewer" toggle.

Each row shows: date, chapter range (`Chapter 5–12` or `Chapter 12`), and optional duration estimate (italic, atmospheric label).

Migrated entries without chapter data show "Session recorded" (no range, no duration label).

**Critical rendering logic:**
```jsx
const chRange = (s.startChapter === 0 && s.endChapter === 0)
  ? null  // migrated entry — no chapter data
  : s.startChapter === s.endChapter
    ? `${label} ${s.endChapter}`
    : `${label} ${s.startChapter + 1}–${s.endChapter}`
```
The both-zero guard **must be first** — otherwise migrated stubs display as "Chapter 0".

The `isNew` state (progress === 0 and no readingLog entries) shows an invitation panel with companion-voice copy and a "Log your first session →" action link.

---

### Two New Presence Lenses

**`sessionRhythmObs(log, style, temperament)`** — 11th lens (runs after `interpretationObs`):
- Multiple sessions on same day → "The story pulled you back more than once in a day."
- 2+ `immersed` sessions in last 5 → "Something in this stretch has been pulling you through."
- `brief` session after ≥4 prior sessions → "A brief return — the story hasn't moved on without you."
- All variants have style-specific copy (`observational`, `analytical`); returns null for `minimal`.

**`sessionStopObs(log, chapters, style)`** — 12th lens:
- Fires when last session covered ≤4 chapters AND the reader stopped within 2 chapters of a starred (`ch.important`) chapter.
- Copy: "You stopped near something that mattered. Some chapters ask to be sat with."
- Style variants. Returns null for `minimal`.

Total presence engine lenses: **13** (`arcObs`, `finishedObs`, `mysteryObs`, `lingeringMysteryObs`, `characterObs`, `characterOwnershipObs`, `readerObs`, `notePatternObs`, `interpretationObs`, `sessionRhythmObs`, `sessionStopObs`, `pacingObs`, `momentumObs`).

---

### Companion Stewardship (CompanionHeader)

A `···` button (`Ico.Dots`) in the author row opens a lightweight dropdown menu. Click-outside closes via `useEffect` + `menuRef`. The menu contains three actions:

| Action | Behavior |
|--------|----------|
| Edit companion | Opens inline edit form; closes menu |
| Export companion | Creates JSON blob download of the full book object |
| Remove companion | Two-step inline confirmation with ember destructive button; calls `deleteBook(book.id)` then navigates to `/` |

**Edit form** replaces the title/author/mood row in-place:
- Two text inputs: Title, Author
- Temperament picker: 6 labeled pills (curious / analytical / emotional / imaginative / quiet / searching); selected pill uses `var(--ca-bg)`/`var(--ca-border)`/`var(--ca)`. Active temperament highlighted; no selection = no change to existing.
- Cancel / Save buttons

`TEMPERAMENT_CONFIG` is a module-level constant (6 items, each with `key` and `label`).

**Mobile ergonomics pass:** `···` button target area increased to `p-2` (was `p-1`); color warmed to `text-ink-500` (was `text-ink-400`); `· edit` link given `py-1 px-0.5` for easier touch.

---

### Reread Era Foundation (Task 8)

Every `SessionEntry` is stamped with `rereadEra: book.rereadCount || 0`. This is non-functional in Sessions 41–42 but is the data foundation for per-reread session isolation.

**Architecture intent:**
- `rereadEra: 0` = first read
- `rereadEra: 1` = second read (after first restart), etc.
- After a `restart` action (which increments `rereadCount`), all new sessions get `rereadEra: 1` while first-read sessions have `rereadEra: 0`.

**Future use cases:**
- `pacingObs` could filter to `sessions.filter(s => s.rereadEra === currentEra)` to avoid comparing first-read pace with reread pace.
- A "This reading vs. last reading" session count surface in ReadingMomentum.
- Per-era session history in ProgressTab (tabbed by reading).

This field requires zero schema migration going forward — any sessions without `rereadEra` default to 0 in consumption code via `s.rereadEra ?? 0`.

---

### Library Empty State

`EmptyState` in `Library.jsx` now receives an `action` prop (JSX, not a config object) when no query is active:
```jsx
action={!q ? (
  <Link to="/new" className="..." style={{ color:'var(--ca, #B8860B)' }}>
    Begin a companion →
  </Link>
) : undefined}
```
EmptyState renders `{action}` directly as JSX. This was already the existing EmptyState contract — the Library was the one surface that didn't pass an action.

---

### Data model summary (Sessions 41–42 additions)

| Field | Shape | Where |
|-------|-------|-------|
| `readingLog` | `SessionEntry[]` (was `string[]`) | Every book |
| `SessionEntry.id` | `string` | `'s_${Date.now()}'` for new; `'migrated_*'` for legacy |
| `SessionEntry.startChapter` | `number` | Chapter before session |
| `SessionEntry.endChapter` | `number` | Chapter reached in session |
| `SessionEntry.rereadEra` | `number` | `book.rereadCount \|\| 0` at log time |
| `SessionEntry.durationEstimate?` | `'brief' \| 'steady' \| 'immersed'` | Optional |

All old `string[]` entries are migrated to `{ startChapter: 0, endChapter: 0 }` stubs by `normalizeReadingLog` on load. The app handles them gracefully: `logDates` extracts dates, session history shows "Session recorded", presence lenses skip them via `sessionEntries`.

---

### Architecture decisions

**Multiple sessions per day are allowed.** Removed the old `Set()` deduplication. The whole point of sessions is recording separate reading bursts.

**`normalizeReadingLog` runs at load time, not at write time.** This keeps the BooksContext write path clean. One-time migration on each `loadBooks()` call is inexpensive (arrays are small).

**`sessionEntries` excludes migrated stubs by checking both-zero.** This is a semantic gate, not a format gate — the shape is the same, but `startChapter: 0, endChapter: 0` means "no chapter data" by convention.

**Stewardship menu is `position` relative/absolute, not a portal.** Menu opens inline relative to the `···` button. No z-index conflicts because CompanionHeader is at the top of the page, not inside a scroll container with `overflow: hidden`. If this ever causes clipping, a portal (`ReactDOM.createPortal`) would be the fix.

**`deleteBook` navigates to '/' after deletion.** The `BookPage` is mounted while the book exists; after `deleteBook`, the book disappears from context and the route would render an empty/error state. `useNavigate()` in CompanionHeader handles the immediate redirect.

**Export serializes the full book object as JSON.** `JSON.stringify(book, null, 2)` — no transformation. This includes cover data (base64 if EPUB-imported), all notes, mysteries, characters, and sessions. The intent is human-readability and future import, not compact serialization.

---

### Unresolved risks

1. **`rereadEra` is not yet used by `pacingObs`.** The pacing lens sees the full combined session history across all rereads. A fast first read followed by a slow reread could produce misleading "you've slowed" observations. Fix: filter to `s.rereadEra === (book.rereadCount || 0)` in `pacingObs`.

2. **Export does not import.** The stewardship menu exports a full JSON book object but there is no import path. An exported companion cannot be restored or transferred via the app UI.

3. **Session history uses chapter numbers, not labels.** The range "Chapter 5–12" is raw chapter number display. For books with special chapters (prologues, parts), these numbers may not match the displayed chapter label in the checklist. A future improvement would use `getChapterLabel` for both bounds.

4. **`sessionStopObs` requires `ch.important` to be manually set.** Very few books have starred chapters by default. The lens will rarely fire for new companions unless the reader has explicitly starred chapters.

5. **`durationEstimate` is omitted from the session entry if not selected.** Code uses `...(durationEstimate ? { durationEstimate } : {})`. This means absent estimate and `undefined` estimate are both absent in the serialized object. This is correct and intentional but worth noting if future code checks `entry.hasOwnProperty('durationEstimate')`.

---

### Recommended next milestone

**Mystery and discussion question deletion** — still the longest-outstanding gap from §17. Both follow the established ember-confirm pattern. Neither involves complex state.

**After that:** Surface `rereadEra` in `pacingObs` — filter the pacing calculation to sessions in the current reading era, preventing cross-era pace comparisons. Single-line change, meaningful improvement to presence quality for rereaders.

---

## 22. Milestone Report — Narrative Extraction Foundation Pass

*Generated 2026-05-12 (Session 43). For the next session's AI assistant.*

### What was built

Shadow Scribe now has a first-generation narrative extraction pipeline. When a reader imports an EPUB, the companion automatically populates with extracted characters, chapter summaries, and mystery seeds — all derived rule-based from the book's own text, with no AI and no backend. The architecture is designed so future AI passes can plug in without structural changes.

### Files touched

- **`src/utils/narrativeExtractor.js`** — New: full extraction pipeline
- **`src/utils/epubParser.js`** — Chapter HTML content extraction, path normalization, title cleaning, duplicate detection
- **`src/utils/storage.js`** — Storage audit, diagnostics, IndexedDB groundwork
- **`src/components/library/EpubImportReview.jsx`** — Extraction integration, atmospheric loading states
- **`src/pages/DebugPage.jsx`** — New: QA/debug panel at `/debug`
- **`src/App.jsx`** — `/debug` route added

---

### Extraction pipeline architecture

```
EPUB file (File object)
  → epubParser.parseEpub()
      → TOC parsing (nav.xhtml / toc.ncx / spine fallback)
      → chapter structure (num, title, type)
      → chapterContents: { [num]: rawHtmlString }   ← NEW
      → returns: { title, author, isbn, coverData, chapters, chapterContents, warnings }

  → EpubImportReview (React state)
      → wizard: user reviews metadata, chapters, spoiler mode
      → "Build the companion" → setTimeout(150ms) → extractNarrative()

  → narrativeExtractor.extractNarrative(chapterContents, chapters)
      → Step 1: cleanChapterHtml() per chapter → cleanedTexts
      → Step 2: extractCharacters(cleanedTexts) → { main, secondary, relationships }
      → Step 3: generateChapterSummary() per chapter → summaries map
      → Step 4: extractMysteries(cleanedTexts) → Mystery[]
      → returns: { characters, summaries, mysteries, extractionMeta }

  → EpubImportReview injects results into book object
      → book.characters, book.mysteries, book.chapters[n].summary
      → book.narrativeExtracted = true, book.extractionMeta = { ... }
      → onCreate(book) → BooksContext → localStorage

chapterContents ← NEVER written to localStorage. GC'd after onCreate().
```

---

### Chapter content model (epubParser additions)

`parseEpub()` now returns `chapterContents: { [chapterNum]: rawHtmlString }`. Each value is the raw XHTML content of the chapter's HTML file from the EPUB ZIP. Key properties:

- Built after the `chapters` array using the `src` field from each TOC entry
- Fragment identifiers stripped (`chapter01.xhtml#start` → `chapter01.xhtml`)
- Paths normalized through `normalizePath()` to resolve `../` segments
- `htmlCache` prevents re-decoding shared HTML files (some EPUBs have multiple TOC entries per HTML file)
- Returns empty object (not an error) if HTML files can't be resolved — graceful degradation
- **Transient**: must never be stored in localStorage. Lives in React state during the wizard only.

---

### Character extraction (`extractCharacters`)

Three patterns, ordered by reliability:

| Pattern | Example | Signal strength |
|---------|---------|----------------|
| Dialogue attribution | `Hugo said`, `Wallace replied` | Highest |
| Possessives | `Hugo's voice`, `Wallace's coat` | High |
| After honorifics | `Dr. Foster`, `Captain Reyes` | High |

Requires ≥2 reliable mentions across all chapters. Filtered against a 150+ word blocklist (common English words, days, months, directions). Top 15 by frequency. Tiered: main (~top 35%, max 4 characters), secondary (rest). Each character gets:
- `revealChapter` — chapter of first detection (for spoiler system)
- `mentionCount` — frequency (shown in debug panel, not in main UI)
- `extracted: true` — marks auto-extracted vs. manually added
- `spoilerSafe: false` — will be veiled in strict mode until `currentChapter >= revealChapter`

---

### Chronicle generation (`generateChapterSummary`)

Extractive (not generative) — uses the author's own words. Scoring per sentence:

- Mid-sentence capitalized words (likely names/places): +1.5 per occurrence
- First sentence bonus: +5
- Second sentence bonus: +1.5
- Last 3 sentences bonus: +1.5
- Questions: −3
- Short sentences (<60 chars): −1.5
- Quote-heavy sentences (≥4 quote marks): −1

Top 2 sentences returned in original reading order. Returns `null` if no sentences qualify (sparse chapters, front-matter). Summaries are injected into `chapter.summary` — the same field the PlotTab (Chronicle) already reads. No PlotTab changes needed.

---

### Mystery extraction (`extractMysteries`)

Three pattern families (regex):
1. **Weighted questions** — "why did X", "who was", "how could" + 15–150 chars + `?`
2. **Uncertainty phrases** — "couldn't understand", "seemed strange", "had no idea" + 10–130 chars
3. **Wondering phrases** — "wondered why", "couldn't shake", "troubled by" + object

Cap: 12 total; max 2 per chapter (ensures book-wide spread). Rough deduplication by 50-char fingerprint. Each mystery: `{ id, text, chapter, status: 'open', resolved: false, extracted: true }`. The `chapter` field feeds the existing `getMysteryView` spoiler filter — future mysteries are already gated by the spoiler system.

---

### Progression-aware access

No new code required. The existing spoiler system handles extracted content automatically:

- **Characters**: `getCharacterView(book, c, mode)` already gates on `c.revealChapter > book.currentChapter`. Extracted characters with `revealChapter` set will be veiled or hidden in strict/relaxed mode.
- **Mysteries**: `getMysteryView(book, m, mode)` already gates on `m.chapter > book.currentChapter`. Extracted mysteries from unread chapters are hidden/veiled.
- **Summaries**: PlotTab (Chronicle) only shows `chapter.summary` for `ch.completed` chapters. Future chapter summaries are never rendered.

---

### Storage findings (Task 9)

| Data type | Size | Storage |
|-----------|------|---------|
| Existing book metadata (per book) | ~5–15 KB | localStorage |
| + Extraction artifacts (summaries + characters + mysteries) | ~16 KB | localStorage |
| Total per extracted book | ~20–32 KB | localStorage |
| 20 books fully extracted | ~400–640 KB | localStorage (5MB limit — safe) |
| Raw chapter HTML (30-chapter novel) | ~500 KB–2 MB | **Never stored** |

The extraction strategy deliberately avoids storing raw text: extract artifacts on import, discard source HTML. This keeps localStorage well within limits even with a large library.

**IndexedDB groundwork** is now in `storage.js`: `openNarrativeStore()`, `saveChapterText()`, `loadChapterText()`. Not yet called. Will be activated when AI re-extraction passes need the source text for a second pass.

**Quota safety**: `saveBooks()` now catches `QuotaExceededError` with a named warning. `estimateLocalStorageUsage()` and `estimateBookSize()` are exported for diagnostics.

---

### QA tooling (`/debug`)

The debug panel at `/debug` shows:
- **Per-book extraction stats**: chaptersExtracted, summariesGenerated, characterCount, mysteryCount
- **Warning display**: any extraction warnings surfaced inline
- **Character inspector**: name, role, reveal chapter, mention count, auto/manual badge
- **Mystery inspector**: text, source chapter, auto/manual badge
- **Summary inspector**: collapsible chapter rows showing full summary text
- **localStorage usage**: total KB, % of 5MB limit, per-book breakdown bar

Not linked from TopNav. Access via `localhost:5173/debug`.

---

### Data model additions

| Field | Type | Where |
|-------|------|-------|
| `book.narrativeExtracted` | `boolean` | Set at EPUB import time |
| `book.extractionMeta` | `{ chaptersExtracted, summariesGenerated, characterCount, mysteryCount, warnings }` | Set at import time |
| `character.extracted` | `boolean` | Auto-extracted vs. manually added |
| `character.mentionCount` | `number` | Frequency from extraction |
| `mystery.extracted` | `boolean` | Auto-extracted vs. manually added |
| `epubParser.chapterContents` | `{ [num]: string }` | Transient; not persisted |

---

### Unresolved weaknesses

1. **Non-Latin names missed.** Character extraction requires `[A-Z][a-z]+` — names with diacritics, non-ASCII characters, or compound particles ("von", "de la") may be missed or split incorrectly.
2. **Extractive summaries can be context-dependent.** A high-scoring sentence may quote dialogue that's confusing without surrounding context. Precision is correct but the reading experience of summaries varies by book.
3. **Mystery false positives are possible.** "Seemed strange" and "didn't understand" appear in mundane contexts. The cap of 12/2-per-chapter limits noise but doesn't eliminate it.
4. **Shared HTML files in EPUB TOC produce duplicate content.** Multiple TOC entries resolving to the same HTML file (common in EPUB2) get the same extracted text. Character frequencies inflate; summaries may duplicate.
5. **`pacingObs` still reads combined reread era.** `rereadEra` stamped on `SessionEntry` is not yet used to filter pacing calculations. First-read pace vs. reread pace are still conflated.

---

### Recommended next milestone

**AI extraction pass (first-generation):** Now that the extraction pipeline is built and the chapter content model is in place, the natural next step is to connect an AI API (Claude) to generate better summaries, more accurate character detection, and higher-quality mystery seeds. The architecture is ready: `extractNarrative` can be replaced or supplemented with an async AI call, results go into the same fields.

**Alternatively:** Mystery and discussion question deletion — still the longest-outstanding gap from §17 (no removal path for mysteries or user-added discussion questions). Low scope, follows established ember-confirm pattern.
