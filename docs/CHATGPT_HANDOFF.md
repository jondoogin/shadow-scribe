# Shadow Scribe — Project Handoff
**Last updated:** 2026-05-06 (Session 5)  
**Stack:** React 19 · Vite 8 · Tailwind CSS v4 · localStorage persistence · No backend

---

## 1. Current App Overview

### What it is
Shadow Scribe is a **reading companion app** — a single-page React application that lets readers track books they're actively reading. It sits somewhere between a reading journal, a spoiler-safe chapter tracker, and a literary notebook. The design philosophy is deliberate: it should feel like a *thoughtful presence* alongside the reader, not a productivity tool or a social platform.

### Overall architecture
Pure frontend SPA. No router library — view switching is handled by a `view` state variable (`'library' | 'dashboard' | 'create'`). No backend, no auth. Books persist via `localStorage` (key: `shadowscribe_books`).

```
App
└── BooksProvider (context: books[], updateBook, createBook, resetToDemo)
    └── AppShell (view + selectedId state)
        ├── TopNav (persistent, fixed, z-30)
        └── [view-enter transition wrapper]
            ├── Library (view = 'library') — reads books from context
            ├── CreateCompanion (view = 'create')
            └── BookDashboard (view = 'dashboard', prop: bookId)
                ├── CompanionHeader
                ├── CompanionInsights
                ├── sticky tab bar
                ├── [tab content — key-remounted on tab change]
                │   ├── ProgressTab
                │   ├── CharactersTab → RelationshipMap
                │   ├── PlotTab
                │   ├── NotesTab
                │   ├── MysteriesTab
                │   └── DiscussionTab
                └── ChapterUpdateModal (portal-like, fixed overlay)
```

### Implemented functionality
- **Library view** — grid of book cards with search, status filter (All / Reading / Finished / Paused), and sort (recent / title / progress)
- **Book dashboard** — 6-tab companion for each book
- **Progress tab** — chapter checklist (toggle complete/incomplete), chapter-level celebration animation, "reading now" / "up next" indicators
- **Characters tab** — expandable character cards (main + secondary) with allegiance, description, spoiler-safe flag; inline SVG relationship constellation
- **Chronicle tab** — reverse-chronological log of completed chapters with summaries + reflections; star-marking for pivotal chapters
- **Notes tab** — free-text notes with 6 tag types (theory, favorite, confusing, theme, character, quote); tag filtering
- **Mysteries tab** — open question tracker with status (open / hinted / resolved); toggle resolution
- **Discussion tab** — curated discussion questions per book; add-your-own questions
- **Companion Insights strip** — rotating literary observations generated from book state (progress %, mystery count, character deaths, note patterns); auto-rotates every 7s
- **Reading Momentum** — streak/session counter below the update button
- **Relationship Map** — SVG constellation (protagonist centered, others in ring); dashed lines color-coded by relationship type
- **Chapter Update Modal** — natural-language chapter input + quick-select buttons; success state with milestone detection, newly-encountered characters, chapter recap, newly-opened mysteries
- **Create Companion** — 3-step wizard: book details + ISBN cover → chapter structure + series → spoiler settings
- **Per-companion accent theming** — `data-mood` on the dashboard wrapper sets CSS custom properties (`--ca`, `--ca-bg`, `--ca-border`) that cascade to all children

### Design philosophy
- **Companion voice, not app voice** — microcopy is literary and observational ("Tell the companion where you are", "Return to the companion ✦", "The chronicle begins when you do")
- **Warm analog aesthetic** — cream paper backgrounds, ink color palette, Playfair Display serif headings, grain texture overlay
- **Information without noise** — sections appear only when they have content; empty states use poetic copy rather than CTAs
- **No gamification** — no streaks as achievements, no points, no badges; the momentum display is informational, not motivational
- **Spoiler-aware design** — `spoilerMode` field exists per book (strict / relaxed / full); not yet enforced in UI beyond the data field
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
│   ├── App.css                    ← empty
│   ├── index.css                  ← Tailwind import, @theme tokens, keyframes, data-mood
│   ├── context/BooksContext.jsx   ← books[], updateBook, createBook, resetToDemo
│   ├── hooks/useBooks.js          ← re-export of useBooks()
│   ├── utils/
│   │   ├── storage.js             ← loadBooks, saveBooks, resetBooks (localStorage)
│   │   ├── date.js                ← fmtDate, calcStreak
│   │   ├── progress.js            ← getProgress
│   │   └── insights.js            ← generateInsights
│   ├── data/
│   │   ├── books.js               ← INITIAL_BOOKS (5 mock books)
│   │   └── config.js              ← STATUS_CONFIG, TAG_CONFIG
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

**Notable:** The entire application lives in a single `App.jsx`. This was intentional for rapid prototyping — it is a natural refactor target as the app grows.

---

## 3. Core Components

All components live in `src/App.jsx`. Listed in order of declaration.

### Helpers (functions, not components)
| Name | Purpose |
|------|---------|
| `getProgress(book)` | Returns 0–100 integer % from completed chapters |
| `calcStreak(log)` | Takes `string[]` of ISO dates, returns current consecutive-day streak (0 if not today/yesterday) |
| `generateInsights(book)` | Returns up to 6 contextual literary insight strings based on progress %, open mysteries, character deaths, allegiance shifts, important chapter count, note tags |
| `fmtDate(iso)` | Formats ISO date as "Today", "Yesterday", "3d ago", or "May 1" |

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
| `CompanionHeader` | Book hero: cover, title, author, status, progress bar, update button, ReadingMomentum |
| `BookDashboard` | Dashboard shell; owns `tab` state and `showUpdate` modal flag; renders sticky tab bar and key-remounted tab content |
| `ProgressTab` | Chapter checklist with toggle, celebration animation, current/next chapter indicators |
| `CharactersTab` | Expandable character cards + RelationshipMap at bottom |
| `PlotTab` | Reverse-chronological completed chapters with summaries, reflections, star-marking |
| `NotesTab` | Tag-filtered note list; inline add form |
| `MysteriesTab` | Open-question tracker; toggle resolution; filter by active/resolved/all |
| `DiscussionTab` | Curated questions + user-added questions |
| `ChapterUpdateModal` | Fixed overlay; natural-language input + quick-select; success state with milestone, newly-met characters, chapter recap, new mysteries, unresolved threads |

### Icon system
`Ico` object of inline SVG components: `Book, Plus, Check, Search, Left, Star, User, Eye, Down, Note, Mystery, Chat, Chart, X, Refresh, Menu, Library`. All use a shared `sp` props object (`fill:none`, `stroke:currentColor`, `strokeLinecap/Join:round`).

---

## 4. State Management

**Location:** All state lives in the root `App` component and is passed down as props. There is no context, no Zustand, no Redux.

### Root App state
```js
const [view,       setView]       = useState('library')       // current screen
const [selectedId, setSelectedId] = useState(null)            // active book id
const [books,      setBooks]      = useState(INITIAL_BOOKS)   // all book data
```

### Update pattern
`updateBook(id, changes)` is a `useCallback`-memoized function that does a shallow merge:
```js
setBooks(bs => bs.map(b => b.id === id ? { ...b, ...changes } : b))
```
It's passed to `BookDashboard` as `onUpdateBook={changes => updateBook(selectedBook.id, changes)}` (id partially applied). Each tab receives `onUpdateBook` and calls it with partial updates (e.g., `{ chapters: updatedChapters }`).

### Local component state
- `Library` owns: `q` (search), `filter`, `sort`
- `CreateCompanion` owns: `step`, `form`, `coverErr`
- `BookDashboard` owns: `tab`, `showUpdate`
- `ProgressTab` owns: `celebrating` (chapter num for animation)
- `NotesTab` owns: `activeTag`, `adding`, `newNote`, `newTag`
- `MysteriesTab` owns: `showing` (active/resolved/all)
- `DiscussionTab` owns: `added[]`, `input`
- `ChapterUpdateModal` owns: `input`, `done`, `prevCh`, `newCh`
- `CompanionInsights` owns: `idx`, `fade`
- `TopNav` owns: `open` (dropdown)
- `CharCard` (inside CharactersTab) owns: `open` (expanded)

### Persistence
**None.** All state resets on page refresh. `INITIAL_BOOKS` in `data.js` is the source of truth. This is the most critical gap in the current architecture.

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
```
`data-mood` is set on `<div data-mood={book.mood || 'gold'}>` wrapping `BookDashboard` and on the `ChapterUpdateModal` wrapper. Components access these via `style={{ color:'var(--ca, #B8860B)' }}` with gold as fallback.

### Typography
| Token | Value |
|-------|-------|
| `--font-serif` | "Playfair Display", Georgia, serif |
| `--font-sans` | "Inter", system-ui, sans-serif |
| Base font size | `15px` |
| Base line height | `1.5` |

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
| `.card-lift` | Hover: translateY(-2px) + shadow elevation |
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
  mood: 'sage' | 'ember' | 'ink' | 'sienna' | 'gold'
  readingLog: string[]          // ISO dates of reading sessions
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
  discussionQuestions: string[]
}
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
}
```

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
  text: string                  // the question
  status: 'open' | 'hinted' | 'resolved'
  chapter: number               // chapter where this question first arose
  resolved: boolean             // toggle state
}
```

### Note
```ts
{
  id: string
  text: string
  tag: 'theory' | 'favorite' | 'confusing' | 'theme' | 'character' | 'quote'
  date: string                  // ISO date
}
```

### Config maps (exported from data.js)
- `STATUS_CONFIG` — badge color/dot/label per status
- `TAG_CONFIG` — label/CSS-class per tag

---

## 8. Outstanding Issues

### No persistence
The single most critical gap. All data resets on page refresh. There is no localStorage, no IndexedDB, no backend. Every note a user writes is ephemeral.

### `App.jsx` is a monolith (~1,580 lines)
All components, helpers, and constants in one file. Works fine for current scale but will become hard to maintain. Natural split points: `components/`, `hooks/`, `utils/`.

### No URL routing
View state is not reflected in the URL. Users cannot deep-link to a book, bookmark a tab, or use the browser back button. A single `react-router-dom` integration would fix this entirely.

### `spoilerMode` field is inert
The `spoilerMode` field (`strict` / `relaxed` / `full`) is collected during setup and stored, but nothing in the UI actually enforces it. Chapter summaries, character last-seen info, and mystery chapter numbers are all visible regardless of setting.

### `createBook` flow creates impoverished companions
New books created via the wizard get blank chapters (no titles, no summaries), no characters, no mysteries, no notes. The new book experience is barren compared to the sample data.

### `mood` field not set during creation
The `CreateCompanion` wizard doesn't offer mood selection. All new books default to `'gold'` via the `book.mood || 'gold'` fallback. The user has no way to change a book's mood after creation.

### `isbn: null` workaround is fragile
Three books have `isbn: null` to avoid wrong Open Library covers. There's no UI to update an ISBN or re-attempt a cover fetch. The `onError` handler in `BookCover` works for 404s but Open Library sometimes returns a placeholder image (200 OK) that looks blank — the `onError` fallback doesn't fire for those.

### `DiscussionTab` user questions are local state only
Questions added in `DiscussionTab` are stored in component-local `useState` — they disappear on tab switch or page reload. They should be persisted to the book object (like notes).

### `ChapterUpdateModal` natural-language parsing is weak
The regex is pattern-matched (`chapter 21`, `ch. 5`, `part III`, `#12`). It doesn't handle ordinals ("twenty-first"), spelled-out numbers, or "finished the book". Unrecognized input silently falls back to `currentChapter + 1`.

### ESC key doesn't close the modal
Standard accessibility expectation. `useEffect` for Escape is in `TopNav` dropdown but not in `ChapterUpdateModal`.

### No mobile keyboard handling in modal
On mobile, the textarea in `ChapterUpdateModal` may be obscured by the software keyboard. No `visualViewport` handling or `env(keyboard-inset-height)` CSS.

### `InsightFade` animation defined in CSS but unused
`@keyframes insightFade` is in `index.css` but the fade in `CompanionInsights` is done via inline opacity transition, not this keyframe.

### `calcStreak` uses local system time
Streak calculation uses `new Date()` without timezone awareness. A user who reads at midnight crossing a timezone boundary may get incorrect streak counts.

### No loading or error state for Open Library covers
`BookCover` fetches from `covers.openlibrary.org` with no loading state — there's a layout shift while the image loads. No offline handling.

### `ReadingMomentum` disappears if sessions > 0 but streak = 0 and sessions = 0
Actually works fine — the `else if (sessions > 0)` guard handles it. But if a book has never had a `readingLog` entry added via the modal (only INITIAL_BOOKS have pre-populated logs), sessions shows 0 and the component returns null. New books won't show momentum until after first modal update.

### `App.css` is empty
Leftover from Vite scaffold. Should be deleted.

---

## 9. Recommended Next Steps

### Immediate (high value, low effort)

1. **Add `localStorage` persistence**  
   Serialize `books` state to `localStorage` on every update; hydrate on mount. ~20 lines. Fixes the most critical UX gap.
   ```js
   const [books, setBooks] = useState(() => {
     const saved = localStorage.getItem('shadow-scribe-books')
     return saved ? JSON.parse(saved) : INITIAL_BOOKS
   })
   useEffect(() => {
     localStorage.setItem('shadow-scribe-books', JSON.stringify(books))
   }, [books])
   ```

2. **Wire `DiscussionTab` questions into book state**  
   Change `added` from local state to `onUpdateBook({ discussionQuestions: [...] })`. Trivial change, meaningful UX improvement.

3. **Add ESC to close `ChapterUpdateModal`**  
   Copy the `useEffect` pattern from `TopNav`. One-liner.

4. **Add `mood` selection to `CreateCompanion`**  
   Step 1 or 3 — a row of 5 color swatches. Sets `book.mood` on creation.

5. **Enforce `spoilerMode` in at least one place**  
   In `CharactersTab`, hide `lastSeen` and `description` for characters with `lastSeen` > `currentChapter` when `spoilerMode === 'strict'`. Makes the feature real.

6. **Delete `App.css`**  
   It's empty and cluttering imports.

### Medium-term architecture

7. **Break `App.jsx` into modules**  
   Suggested split:
   ```
   src/
   ├── components/
   │   ├── atoms/          (ProgressBar, StatusBadge, NoteTag, BookCover, etc.)
   │   ├── library/        (Library, BookCard)
   │   ├── dashboard/      (BookDashboard, CompanionHeader, tabs/*)
   │   ├── companion/      (CompanionInsights, RelationshipMap, ReadingMomentum)
   │   ├── modal/          (ChapterUpdateModal)
   │   └── nav/            (TopNav)
   ├── hooks/
   │   ├── useBooks.js     (state + persistence logic)
   │   └── useInsights.js  (generateInsights)
   └── utils/
       ├── date.js         (fmtDate, calcStreak)
       └── progress.js     (getProgress)
   ```

8. **Add URL routing (`react-router-dom`)**  
   Routes: `/` (library), `/book/:id` (dashboard), `/book/:id/:tab`, `/new` (create). Enables back button, bookmarkable URLs, and direct deep-links.

9. **Refactor `BookCover` to handle Open Library edge cases**  
   Use a `useEffect` with a separate fetch + HEAD request to validate the image before rendering, or maintain a known-bad ISBN list, or always prefer the gradient fallback with an optional "load cover" button.

### Future backend / API considerations

10. **User accounts + sync**  
    Companion data is inherently personal and long-lived. A simple backend (Supabase, Firebase, PocketBase) with row-per-book would enable cross-device sync. Schema maps cleanly to the existing data structure.

11. **Open Library / Google Books API integration**  
    Auto-populate `totalChapters` (from page count estimate), `synopsis`, and cover on ISBN entry. Currently the user must enter chapter count manually.

12. **Export / import**  
    JSON export of a single book's companion data. Useful for sharing with a book club or archiving a finished book.

### AI integration opportunities

13. **Generated chapter summaries**  
    After a user marks a chapter complete, offer to generate a spoiler-safe summary (if the user hasn't written one). Requires API call — keep it optional and lazy.

14. **AI-powered `generateInsights`**  
    The current `generateInsights` function is rule-based. Replace or augment with an LLM call that reads the actual chapter summaries and notes to generate genuinely contextual observations. The function signature is already clean for this.

15. **Discussion question generation**  
    Auto-generate discussion questions per book using the book's title, author, and collected notes/theories. Currently all questions are hand-authored in `data.js`.

16. **Natural-language chapter entry improvement**  
    Pass the textarea input through a lightweight LLM to extract chapter number from any phrasing ("almost done", "just started the second act", "finished the prologue"), then confirm with the user before updating.

17. **Relationship graph generation**  
    As the user adds characters and notes, offer to auto-suggest relationships and relationship types. The SVG rendering layer is already in place — just needs the data.

18. **Voice input for notes**  
    `window.SpeechRecognition` API for quick voice-to-text note capture while reading. Low-friction for audiobook listeners especially.
