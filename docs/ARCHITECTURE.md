# Lantern — Architecture
**Last updated:** 2026-05-29 (Session 132)

---

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI | React 19 | hooks: useState, useEffect, useRef, useCallback, useMemo |
| Build | Vite 8 | `node node_modules/vite/bin/vite.js build` — `.bin/vite` is NOT a real symlink |
| Styles | Tailwind CSS v4 | `@import "tailwindcss"` — NOT v3 syntax |
| Routing | React Router v7 | BrowserRouter + Routes |
| Persistence | localStorage | Keys are FROZEN — never rename |
| Cloud sync | Supabase (optional) | Magic-link auth, RLS. App runs identically without env vars. |
| AI (ambient) | Existing reflection engine | Rule-based, cached in book data, no API call |
| AI (live) | Anthropic via Vercel serverless | `api/companion.js` — live on readwithlantern.com |

**Routes:** `/library`, `/new`, `/book/:bookId`, `/settings`, `/about`

---

## Component Tree

### Current (Session 132)

```
BrowserRouter
└── AuthProvider  (Supabase magic-link session)
    └── SettingsProvider  (shadowscribe_settings)
        └── BooksProvider  (shadowscribe_books)
            └── AppShell  (dark mode sync, view transition key)
                ├── AmbientLayer  (two slow-drifting radial gradient blobs, 55s/48s)
                ├── AtmosphericGlow  (mouse-following radial gradient, rAF lerp 0.012)
                ├── StorageBanner  (quota exceeded / data corrupted alerts)
                ├── TopNav  (fixed z-30; auth chip, dark mode toggle, hamburger)
                └── Routes
                    ├── /library       → LibraryPage → Library
                    │                       ├── LibraryCompanion (cross-book ambient obs)
                    │                       └── FirstBookInvitation (new user modal)
                    ├── /new           → NewCompanionPage → CreateCompanion → EpubImportReview
                    ├── /book/:bookId  → BookPage [BookErrorBoundary]
                    │                     → BookDashboard
                    │                         ├── CompanionHeader
                    │                         ├── CompanionBand  [full-width, above tabs]
                    │                         │     ├── Chapter context + progress bar
                    │                         │     ├── Ambient reflection carousel
                    │                         │     ├── Context cards (questions, character pills)
                    │                         │     └── Conversation (persisted to book.companionChat[])
                    │                         ├── [TAB BAR — 6 tabs]
                    │                         │     Notes · Characters · Plot · Questions · Themes · Timeline
                    │                         └── ChapterUpdateModal
                    ├── /settings      → SettingsPage [SignInPanel at top]
                    └── /about         → AboutPage
```

**Layout:** Single column. CompanionHeader → CompanionBand → TabBar → TabContent. All sections max-width 1000px.

**Deleted components (Session 130):** `CompanionPanel.jsx`, `CompanionInsights.jsx`, `PresenceStrip.jsx`, `DirectionsDemoPage.jsx`

---

## File / Folder Structure

```
shadow-scribe/
├── docs/                          ← project memory
├── api/
│   └── companion.js               ← Vercel serverless Anthropic proxy
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx                    ← AuthProvider + BooksProvider + AppShell
│   ├── index.css                  ← @theme tokens, keyframes, dark mode (html.dark ONLY — never dark: prefix)
│   ├── context/
│   │   ├── AuthContext.jsx        ← Supabase magic-link auth state
│   │   ├── BooksContext.jsx       ← books[], updateBook, createBook, deleteBook, importLibrary, resetToDemo
│   │   └── SettingsContext.jsx    ← settings{...}; useSettings()
│   ├── lib/
│   │   └── supabase.js            ← Supabase client wrapper (returns null when env vars absent)
│   ├── hooks/useBooks.js
│   ├── utils/
│   │   ├── storage.js             ← loadBooks, saveBooks, sanitizeBook, checkStorageHealth
│   │   ├── syncEngine.js          ← debounced push (1.5s), pullAndMerge, mergeBook, deleteCloudData
│   │   ├── depthLevel.js          ← bookDepth(), aiEnabled(), ambientEnabled(), observationDensity()
│   │   ├── date.js                ← fmtDate, calcStreak, logDates, sessionEntries, normalizeReadingLog
│   │   ├── progress.js            ← getProgress
│   │   ├── spoiler.js             ← graduated visibility engine (see AI_COMPANION_RULES.md)
│   │   ├── chapterHelpers.js      ← getChapterLabel, getChapterWeight, getWeightedProgress, isSpecialChapter
│   │   ├── epubParser.js          ← async in-browser EPUB parsing (no React)
│   │   ├── narrativeExtractor.js  ← rule-based EPUB extraction
│   │   ├── companionPresence.js   ← generatePresence() — 13-lens immediate observation engine
│   │   ├── reflectionEngine.js    ← assembleReflectionContext, generateRuleBasedReflections, cache helpers
│   │   ├── companionThread.js     ← all AI thread generation (note thread, chat, session reflection)
│   │   ├── aiExtractor.js         ← callClaude(), aiExtractNarrative(), generateDiscussionQuestions()
│   │   ├── aiRequest.js           ← buildAiCall() — routes to /api/companion proxy or direct
│   │   ├── analytics.js           ← Plausible wrapper
│   │   ├── logger.js              ← logError/logWarn with dev/prod distinction
│   │   ├── uid.js                 ← monotonic ID generator
│   │   ├── signalHierarchy.js
│   │   ├── invisiblePresence.js
│   │   ├── hauntScore.js
│   │   ├── emotionalGravity.js
│   │   ├── literaryPatina.js
│   │   ├── residueMemory.js
│   │   ├── readerState.js
│   │   ├── transformScore.js
│   │   └── crossBookMemory.js
│   ├── data/
│   │   ├── books.js               ← INITIAL_BOOKS (10 residency corpus books)
│   │   └── config.js              ← STATUS_CONFIG, TAG_CONFIG, CHAPTER_TYPES, STRUCTURE_TYPES
│   ├── components/
│   │   ├── layout/TopNav.jsx
│   │   ├── auth/SignInPanel.jsx   ← magic-link form + sign-out + delete cloud data
│   │   ├── library/
│   │   │   ├── Library.jsx
│   │   │   ├── BookCard.jsx
│   │   │   ├── LibraryCompanion.jsx
│   │   │   ├── FirstBookInvitation.jsx
│   │   │   ├── CreateCompanion.jsx
│   │   │   └── EpubImportReview.jsx
│   │   ├── dashboard/
│   │   │   ├── BookDashboard.jsx
│   │   │   ├── CompanionHeader.jsx
│   │   │   ├── CompanionBand.jsx   ← primary companion surface (replaces PresenceStrip + CompanionPanel)
│   │   │   ├── ReadingMomentum.jsx
│   │   │   └── RelationshipMap.jsx
│   │   ├── modals/ChapterUpdateModal.jsx
│   │   └── shared/ (icons, ProgressBar, StatusBadge, NoteTag, BookCover, SectionLabel, SectionHeading, EmptyState)
│   ├── pages/ (LibraryPage, BookPage, NewCompanionPage, SettingsPage, AboutPage, DebugPage)
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
const { user, sendMagicLink, signOut } = useAuth()
// settings shape: { spoilerMode, insightStyle, defaultFormat, anthropicKey, darkMode, devMode,
//                   deviceId, lastExportedAt, lastExportedNoteCount,
//                   snapshotReminderDismissedAt, firstBookInvitationDismissedAt }
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
- `Library` — `q`, `filter`, `sort`; `showGrouped = filter === 'all' && !q` drives status-grouped vs flat layout
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
1. **EPUB re-extraction** — `aiExtractNarrative()`: characters + chapter summaries + mysteries from EPUB text (max_tokens: 6000)
2. **Discussion questions** — `generateDiscussionQuestions()`: 6–8 tailored questions from book context (max_tokens: 1500)
3. **Companion reflections** — `generateCompanionReflections()`: 3 grounded retrospective observations (max_tokens: 480)

### AI reflection context assembly
`buildAIReflectionContext(ctx)` — exported pure function; assembled from `assembleReflectionContext` output.
- Curates aggressively: max 10 lines, ~600–900 chars
- 9 signals in priority order: theory-arc, interpretation-shift, theme-persistence, resonance-anchor, confusion-signal, reader-attention, temporal-evolution, mystery-continuity, character-focus
- Each signal has a minimum threshold before inclusion
- Spoiler-safe: note text truncated to 85 chars; no summaries or future states

### AI reflection metadata (`ReflectionEntry` fields added by AI path)
- `priority: 1|2|3` — derived from signals present in context (interpretation-shift → p3; resonance-anchor/theme-persistence → p2; otherwise p1)
- `_sourceSignals: string[]` — which signals were included in the context (internal/dev)
- `_sourceLineCount: number` — how many context lines were sent (internal/dev)

Key stored in `settings.anthropicKey` (via SettingsContext → `shadowscribe_settings`). Never committed to repo.

---

## Known Constraints

- **Supabase is optional.** All data is localStorage by default. Supabase cloud sync activates only when `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` env vars are present. The Supabase client returns null when absent — the app is fully functional without it.
- **Deletion semantics.** Field-level sync merge is union-based: deleting an item on device A then syncing from device B revives it. Fix requires tombstone flags (`{ deleted: true, updatedAt }`) — not yet built.
- **Vite `.bin/vite` not a symlink.** Build via `node node_modules/vite/bin/vite.js build` only. In git worktrees, run vite from worktree dir but point to parent `node_modules`.
- **Tailwind v4 CSS layer rule.** All custom resets must be inside `@layer base {}`. Unlayered rules silently win over all utility classes.
- **Dark mode via `html.dark` only.** Never use `dark:` Tailwind prefix — it does not work with this setup.
- **`structureType` not on seed books.** Field set by CreateCompanion wizard; seed books fall back to format-based label detection.
- **Library `showGrouped` logic.** When `filter === 'all' && !q`, Library renders status-grouped sections. When either changes, it renders a flat filtered grid. `BookCard` receives `featured={true}` only when grouping is active AND the reading group has exactly 1 book.

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
