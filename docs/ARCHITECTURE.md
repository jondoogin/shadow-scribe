# Shadow Scribe — Architecture
**Last updated:** 2026-05-13 (Session 47)

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI | React 19 | hooks: useState, useEffect, useRef, useCallback, useMemo |
| Build | Vite 8 | `node node_modules/vite/bin/vite.js build` — `.bin/vite` is NOT a real symlink |
| Styles | Tailwind CSS v4 | `@import "tailwindcss"` — NOT v3 syntax |
| Routing | React Router v7 | BrowserRouter + Routes |
| Persistence | localStorage | No backend, no auth |
| AI | Anthropic API | Direct browser calls via `anthropic-dangerous-direct-browser-access: true` |

**Routes:** `/library`, `/new`, `/book/:bookId`, `/settings`

---

## Component Tree

```
BrowserRouter
└── SettingsProvider  (shadowscribe_settings)
    └── BooksProvider  (shadowscribe_books)
        └── AppShell  (dark mode sync, view transition key)
            ├── TopNav  (fixed, z-30)
            └── Routes
                ├── /library       → LibraryPage → Library
                ├── /new           → NewCompanionPage → CreateCompanion
                ├── /book/:bookId  → BookPage → BookDashboard
                │                     ├── CompanionHeader
                │                     ├── CompanionInsights
                │                     ├── [sticky tab bar]
                │                     ├── ProgressTab
                │                     ├── CharactersTab → RelationshipMap
                │                     ├── PlotTab
                │                     ├── NotesTab
                │                     ├── MysteriesTab
                │                     ├── DiscussionTab
                │                     └── ChapterUpdateModal
                └── /settings      → SettingsPage
```

---

## File / Folder Structure

```
shadow-scribe/
├── docs/                          ← project memory
├── public/vite.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx                    ← BooksProvider + AppShell
│   ├── index.css                  ← @theme tokens, keyframes, data-mood, dark mode
│   ├── context/
│   │   ├── BooksContext.jsx       ← books[], updateBook, createBook, deleteBook, importLibrary, resetToDemo
│   │   └── SettingsContext.jsx    ← settings{spoilerMode,insightStyle,defaultFormat,anthropicKey,darkMode}; useSettings()
│   ├── hooks/useBooks.js          ← re-export of useBooks()
│   ├── utils/
│   │   ├── storage.js             ← loadBooks, saveBooks, resetBooks
│   │   ├── date.js                ← fmtDate, calcStreak, logDates, sessionEntries, normalizeReadingLog
│   │   ├── progress.js            ← getProgress
│   │   ├── spoiler.js             ← graduated visibility engine (see AI_COMPANION_RULES.md)
│   │   ├── chapterHelpers.js      ← getChapterLabel, getChapterWeight, getWeightedProgress, isSpecialChapter
│   │   ├── epubParser.js          ← async in-browser EPUB parsing (no React)
│   │   ├── narrativeExtractor.js  ← rule-based EPUB extraction
│   │   ├── companionPresence.js   ← generatePresence() — 13-lens immediate observation engine
│   │   ├── reflectionEngine.js    ← assembleReflectionContext, generateRuleBasedReflections, cache helpers
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
│   │   └── shared/ (icons, ProgressBar, StatusBadge, NoteTag, BookCover, SectionLabel, SectionHeading, EmptyState)
│   ├── pages/ (LibraryPage, BookPage, NewCompanionPage, SettingsPage, DebugPage)
│   ├── tabs/ (ProgressTab, CharactersTab, PlotTab, NotesTab, MysteriesTab, DiscussionTab)
│   └── assets/
├── index.html
├── vite.config.js
├── package.json
└── .claude/launch.json            ← dev server config for Claude Preview
```

---

## State Management

### Global context
```js
const { books, updateBook, createBook, deleteBook, resetToDemo } = useBooks()
const { settings, updateSetting } = useSettings()
// settings shape: { spoilerMode, insightStyle, defaultFormat, anthropicKey, darkMode }
```

### Update pattern
`updateBook(id, changes)` shallow-merges. Nested arrays must always be replaced in full:
```js
updateBook(book.id, { notes: [...book.notes, newNote] })
```

### BookDashboard pattern
`BookDashboard` receives `bookId`, looks up `book` from context, passes `book` + `onUpdateBook` to tabs. Tabs are context-unaware.

### Persistence
- `BooksContext` → `shadowscribe_books`
- `SettingsContext` → `shadowscribe_settings`
- Both use lazy initializers + `useEffect` write-on-change
- `resetToDemo()` clears books key only; settings are not reset

### Key local state
- `Library` — `q`, `filter`, `sort`
- `BookDashboard` — `tab`, `showUpdate`
- `CompanionInsights` — `idx`, `fade` (reflection generation side-effected via `updateBook`)
- `SettingsPage` — `confirmReset`, `showKey`, `keyDraft`, `keySaved`, `importMsg`; real settings via context

---

## Data Models

### Book
```ts
{
  id: string
  title: string
  author: string
  isbn: string | null
  format: 'print' | 'ebook' | 'audiobook'
  spoilerMode: 'strict' | 'relaxed' | 'full'
  status: 'reading' | 'finished' | 'paused' | 'want'
  currentChapter: number
  totalChapters: number
  lastUpdated: string              // ISO date
  coverBg: string                  // CSS gradient
  mood: 'sage' | 'ember' | 'ink' | 'sienna' | 'gold' | 'steel'
  structureType?: 'chapter' | 'part' | 'section'
  readingLog: SessionEntry[]       // migrated from legacy string[] by normalizeReadingLog()
  series: null | { name, position, total }
  chapters: Chapter[]
  characters: { main: Character[], secondary: Character[], relationships: Relationship[] }
  mysteries: Mystery[]
  notes: Note[]
  discussionQuestions: (string | DiscussionQuestion)[]
  userDiscussionQuestions: string[]
  aiDiscussionQuestions?: string[]
  temperament?: 'curious'|'analytical'|'emotional'|'imaginative'|'quiet'|'searching'
  narrativeExtracted?: boolean
  extractionMeta?: { chaptersExtracted, summariesGenerated, characterCount, mysteryCount, warnings }
  completedAt?: string
  archived?: boolean
  rereadCount?: number
  reflectionCache?: {
    contextHash: string            // 8-field fingerprint; mismatch triggers regeneration
    generatedAt: string            // ISO — cache expires after 3 days
    reflections: ReflectionEntry[]
    aiEnhanced: boolean
  }
}
```

### Chapter
```ts
{ num, title, completed, summary, reflection, important,
  type?: 'chapter'|'prologue'|'epilogue'|'interlude'|'part'|'section',
  estimatedLength?, alternateSummary? }
```
Always use `getChapterLabel(ch, format)` from `chapterHelpers.js` for display labels. Never format inline.

### Character
```ts
{ id, name, role, status, allegiance, lastSeen, description, spoilerSafe, alive,
  revealChapter?, hiddenDescription?, hiddenStatus?, userAdded?, updatedAt? }
```

### Mystery
```ts
{ id, text, status, chapter, resolved,
  visibilityThreshold?, alternateSummary?, originalText?, observation?, observationDate? }
```

### Note
```ts
{ id, text, tag, date, revisedAt?, reflection?, reflectionDate? }
// tag: 'theory'|'favorite'|'confusing'|'theme'|'character'|'quote'
```

### SessionEntry
```ts
{ id, date, startChapter, endChapter, duration?, rereadEra }
// legacy string[] entries migrated to stubs with startChapter:0, endChapter:0
```

### ReflectionEntry
```ts
{ id, text, type: 'rule-based'|'ai',
  priority: 1|2|3,           // higher = surfaces sooner; default 1
  surfaceCount: number,
  lastSurfaced: string|null,
  suppressed: boolean,
  generatedAt: string }
```

---

## Note Intelligence Layer

Computed on-demand inside `assembleReflectionContext`; no new localStorage fields beyond `priority` on `ReflectionEntry`.

### Functions (all in `reflectionEngine.js`)
| Function | Purpose |
|----------|---------|
| `inferNoteThemes(note)` | → string[] top-2 themes; 11 theme × keyword sets |
| `analyzeNoteThemes(notes)` | → `{ themeCount, dominantTheme, recurringThemes, notesWithThemes }` |
| `detectInterpretationShifts(notes)` | → `[ { name, earlyValence, lateValence, noteCount, text } ]` |
| `buildNoteLinkClusters(notes)` | → `[ { type: 'theme'|'character', label, noteIds, weight } ]` top 10 |
| `computeResonanceWeights(notes)` | → `{ noteId: score }` — score = base 1 + revisedAt/reflection/tag/recurrence bonuses |
| `extractNameMentions(texts)` | → string[] proper nouns ≥2 occurrences (exported for DebugPage) |

### Signals fed into reflections
- `dominantTheme` → `theme-persistence` signal (p2)
- `interpretationShifts[0].text` → `interpretation-shift` signal (p3, highest weight)
- `highResonanceNotes.find(n => n.revisedAt && n.reflection)` → `resonance-anchor` signal (p2)

---

## Companion Observation Pipeline

Three layers — different generation cadence, same display strip (`CompanionInsights`).

### Layer 1: Presence (immediate/contextual)
- Source: `generatePresence(book, settings)` in `companionPresence.js`
- 13 lenses; synchronous; returns string[]
- Spoiler-boundary-aware; never surfaces future deaths or hidden mysteries
- Three tonal styles: `observational`, `analytical`, `minimal`

### Layer 2: Reflections (retrospective/synthesized)
- Source: `generateRuleBasedReflections` (sync) + `generateCompanionReflections` (async AI)
- Cached in `book.reflectionCache`; 3-day TTL; context hash for invalidation
- Generation triggers: hash change + min content (≥3 notes OR ≥2 mysteries)
- AI tier fires when: key present + ≥5 notes + cache stale
- AI results prepend rule-based results; silent failure leaves rule-based cache intact
- Woven into presence pool at positions 1 and 4
- 8h minimum resurfacing window (`MIN_RESURFACE_MS`) — sorted by: surfaceCount ASC → priority DESC → lastSurfaced AGO DESC

### Layer 3: Continuity surfaces (meaningful moments)
- **Carousel**: `markReflectionSurfaced` wired via `reflectionIndexMap`; session-dedup via `surfacedThisSessionRef`
- **ChapterUpdateModal**: `pickCompletionReflection` (respects 8h) / `pickReturnReflection` (ignores 8h after ≥7-day gap)
- **DiscussionTab**: `persistentReflection` — prefers already-seen by priority DESC

### Display
- Auto-rotates every 7s with 280ms crossfade
- Manual dot navigation
- Pool = presence + up to 2 reflections spliced in

---

## AI Integration

All Anthropic API calls flow through `callClaude()` in `aiExtractor.js`.

```js
headers: {
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
}
// model: claude-3-5-haiku-20241022
```

Capabilities:
1. **EPUB re-extraction** — `aiExtractNarrative()`: characters + chapter summaries + mysteries from EPUB text
2. **Discussion questions** — `generateDiscussionQuestions()`: 6–8 tailored questions from book context
3. **Companion reflections** — `generateCompanionReflections()`: 3 retrospective observations from reader behavior signals

Key stored in `settings.anthropicKey` (via SettingsContext → `shadowscribe_settings`). Never committed to repo.

---

## Known Constraints

- **No backend.** All data is localStorage. No cross-device sync, no accounts.
- **Vite `.bin/vite` not a symlink.** Build via `node node_modules/vite/bin/vite.js build` only.
- **Tailwind v4 CSS layer rule.** All custom resets must be inside `@layer base {}`. Unlayered rules silently win over all utility classes.
- **`structureType` not on seed books.** Field set by CreateCompanion wizard; seed books fall back to format-based label detection.
- **`markReflectionSurfaced` not yet wired.** Defined in `reflectionEngine.js` but not called by the carousel. Surface counts stay at 0; rotation logic still correct.

---

## Utility Reference

| Function | File | Purpose |
|----------|------|---------|
| `getProgress(book)` | progress.js | 0–100 integer % from completed chapters |
| `calcStreak(log)` | date.js | Consecutive-day streak from readingLog |
| `logDates(readingLog)` | date.js | Extracts ISO dates from string[] or SessionEntry[] |
| `sessionEntries(log)` | date.js | Filters to proper SessionEntry objects |
| `normalizeReadingLog(log)` | date.js | Migrates legacy string[] to stub SessionEntry[] |
| `fmtDate(iso)` | date.js | "Today" / "Yesterday" / "3d ago" / "May 1" |
| `getChapterLabel(ch, format)` | chapterHelpers.js | Display label (Ch. 5, Pt. 3, Prologue, etc.) |
| `getEffectiveMode(book, settings)` | spoiler.js | book.spoilerMode ?? settings.spoilerMode ?? 'relaxed' |
| `getCharacterView(book, c, mode)` | spoiler.js | null (strict+unmet) or character with `_veiled` |
| `getMysteryView(book, m, mode)` | spoiler.js | null (strict+future) or mystery with `_veiled` |
| `getChapterTitle(book, ch, mode)` | spoiler.js | Real title or '···' for strict-mode future chapters |
| `generatePresence(book, settings)` | companionPresence.js | Up to 8 contextual observation strings |
| `assembleReflectionContext(book, settings)` | reflectionEngine.js | Rich context object for reflection generation |
| `generateRuleBasedReflections(ctx, style)` | reflectionEngine.js | Sync reflection generation, 9 signal types |
| `hashContext(ctx)` | reflectionEngine.js | 8-field cache invalidation fingerprint |
| `shouldRegenerate(book, hash)` | reflectionEngine.js | Cache staleness check |
| `getActiveReflections(book, limit)` | reflectionEngine.js | Unsurfaced-first sorted reflections |
