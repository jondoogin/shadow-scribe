# Shadow Scribe — AI Context
**Last updated:** 2026-05-06 (Session 5)

This file is for AI assistants (Claude, ChatGPT, etc.) working on this project. Read it before touching any code.

---

## What this project is

Shadow Scribe is a **reading companion app**. It is a personal, literary, reflective tool — not a productivity app, not a social platform, not a gamified tracker. Every design decision should reinforce the feeling of a thoughtful companion sitting beside the reader.

**The single most important design principle:** Shadow Scribe should feel like a quiet, intelligent presence — not an app that reports metrics back at you.

---

## Tech stack (exact versions)

| Tech | Version | Notes |
|------|---------|-------|
| React | 19.x | `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo` used |
| Vite | 8.x | Dev server on port 5173 |
| Tailwind CSS | v4 | `@import "tailwindcss"` — NOT v3 syntax |
| No router | — | View switching via `view` state in root `App` |
| `BooksContext` | — | Global state via React Context; `useBooks()` hook |
| `localStorage` | — | Books persisted under key `shadowscribe_books`; see `src/utils/storage.js` |

---

## Critical: Tailwind v4 CSS layer rule

In Tailwind v4, **ALL custom CSS resets must be inside `@layer base {}`**.

```css
/* CORRECT */
@layer base {
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
}

/* WRONG — silently kills all padding/margin utilities */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
```

Unlayered rules always beat `@layer utilities` rules regardless of specificity. This was the cause of a completely broken layout — all `py-*`, `px-*`, `gap-*`, `space-y-*` classes silently produced `0px`.

---

## File structure (brief)

```
src/
├── App.jsx                          ← root: BooksProvider + AppShell (view/nav state only)
├── context/BooksContext.jsx         ← books[], updateBook, createBook, resetToDemo
├── hooks/useBooks.js                ← re-export of useBooks() for convenience
├── utils/storage.js                 ← loadBooks(), saveBooks(), resetBooks()
├── utils/date.js                    ← fmtDate(), calcStreak()
├── utils/progress.js                ← getProgress()
├── utils/insights.js                ← generateInsights()
├── data/books.js                    ← INITIAL_BOOKS (5 mock books)
├── data/config.js                   ← STATUS_CONFIG, TAG_CONFIG
├── components/
│   ├── layout/TopNav.jsx
│   ├── library/Library.jsx + BookCard.jsx + CreateCompanion.jsx
│   ├── dashboard/BookDashboard.jsx + CompanionHeader.jsx + CompanionInsights.jsx
│   │             ReadingMomentum.jsx + RelationshipMap.jsx
│   ├── modals/ChapterUpdateModal.jsx
│   └── shared/  ← icons, ProgressBar, StatusBadge, NoteTag, BookCover,
│                   SectionLabel, SectionHeading, EmptyState
├── tabs/  ← ProgressTab, CharactersTab, PlotTab, NotesTab, MysteriesTab, DiscussionTab
├── index.css                        ← @theme tokens, keyframes, data-mood theming
└── main.jsx
```

---

## Voice / microcopy rules

Shadow Scribe has a specific voice. When writing any UI copy:

| Do | Don't |
|----|-------|
| "Tell the companion where you are" | "Update progress" |
| "Return to the companion ✦" | "Close" / "Done" |
| "The chronicle begins when you do" | "No chapters yet" |
| "Capture a thought" | "Add note" |
| "Nothing written down yet" | "Empty" |
| "A question of your own" | "Custom question" |
| "Questions worth sitting with" | "Discussion Questions" |
| "Every story withholds something." | "No mysteries added" |

The voice is: **literary, observational, warm, unhurried**. Never productivity-speak. Never gamified.

---

## Color / theming system

### Static palette
Defined in `@theme {}` in `index.css`. Key families: `cream`, `ink`, `gold`, `sage`, `ember`, `sienna`.

### Dynamic accent theming (per-companion)
`data-mood` attribute on the `BookDashboard` wrapper sets CSS custom properties that cascade to all children:

```css
[data-mood="sage"]   { --ca: #3A6647; --ca-l: #4D8860; --ca-bg: #EBF3EE; --ca-border: #D4E8DA; }
[data-mood="ember"]  { --ca: #9B2335; --ca-l: #C0392B; --ca-bg: #FDF0F0; --ca-border: #F5D0D4; }
[data-mood="ink"]    { --ca: #44403C; --ca-l: #57534E; --ca-bg: #F5F5F4; --ca-border: #E7E5E0; }
[data-mood="sienna"] { --ca: #8B4513; --ca-l: #A0521A; --ca-bg: #FDF4EE; --ca-border: #F0D5C0; }
[data-mood="gold"]   { --ca: #B8860B; --ca-l: #D4AF37; --ca-bg: #FDF8EC; --ca-border: #E8D090; }
```

Always use `var(--ca, #B8860B)` (with gold fallback) for accent-colored UI elements inside `BookDashboard` or `ChapterUpdateModal`. Never hardcode a specific mood color.

---

## Book data shape (quick reference)

```js
{
  id, title, author, isbn,
  format,        // 'print' | 'ebook' | 'audiobook'
  spoilerMode,   // 'strict' | 'relaxed' | 'full' (not yet enforced in UI)
  status,        // 'reading' | 'finished' | 'paused' | 'want'
  currentChapter, totalChapters,
  lastUpdated,   // 'YYYY-MM-DD'
  coverBg,       // CSS gradient string
  mood,          // 'sage' | 'ember' | 'ink' | 'sienna' | 'gold'
  readingLog,    // string[] of 'YYYY-MM-DD' dates
  series,        // null | { name, position, total }
  chapters: [{ num, title, completed, summary, reflection, important }],
  characters: {
    main: [{ id, name, role, status, allegiance, lastSeen, description, spoilerSafe, alive }],
    secondary: [...],
    relationships: [{ from, to, label, type }]
                   // type: 'love' | 'ally' | 'tension' | 'hierarchy' | 'neutral'
  },
  mysteries: [{ id, text, status, chapter, resolved }],
  notes: [{ id, text, tag, date }],
             // tag: 'theory' | 'favorite' | 'confusing' | 'theme' | 'character' | 'quote'
  discussionQuestions: string[],      // curated questions (pre-authored per book)
  userDiscussionQuestions: string[]   // user-added questions (persisted via BooksContext)
}
```

---

## Updating book state

All updates go through `BooksContext`. In any component:
```js
const { books, updateBook, createBook, resetToDemo } = useBooks()
```

`updateBook(id, changes)` shallow-merges. For nested arrays (chapters, notes, mysteries), always replace the full array:
```js
updateBook(book.id, { notes: [...book.notes, newNote] })
```

Inside `BookDashboard` and its children, the pattern is:
```js
const onUpdateBook = changes => updateBook(bookId, changes)
```
Tabs receive `onUpdateBook` as a prop and call it with a partial changes object.

---

## Key known issues

1. **No routing** — no back button, no deep links. `react-router-dom` needed.
2. **`spoilerMode` is decorative** — field exists but UI ignores it.
3. **`CreateCompanion` doesn't set `mood`** — all new books default to `'gold'`.

---

## What NOT to do

- Do not introduce a CSS framework other than Tailwind.
- Do not add a router without discussion — it requires changing view state throughout.
- Do not write CSS rules outside `@layer base/components/utilities` in `index.css`.
- Do not gamify the UX (no streaks as rewards, no achievement badges, no point scores).
- Do not add emoji to UI copy unless it was already there (confetti ✨ on chapter complete is the only exception).
- Do not create separate `.md` files for every small change — update the existing docs in `/docs`.
