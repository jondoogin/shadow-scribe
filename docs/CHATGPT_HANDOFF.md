# Lantern — Handoff Document
**Last updated:** 2026-05-26 · Session 119 (Alpha Week 1)
**Stack:** React 19 · Vite 8 · Tailwind CSS v4 · React Router v7 · localStorage only (no backend)
**localStorage keys (FROZEN):** `shadowscribe_books` · `shadowscribe_settings` · `lantern_welcomed` — must NEVER be renamed
**Build command:** `node node_modules/vite/bin/vite.js build`
**Status: PUBLIC ALPHA READY**

---

## WHAT LANTERN IS

A **living literary environment**. Not a reading tracker. Not a productivity tool. Not an AI assistant. A personal, atmospheric space that sits alongside the reader while they read — part journal, part spoiler-safe chapter tracker, part literary notebook, part environmental companion.

The interface itself is the experience. It accumulates memory, cools with absence, warms with annotation, and holds the reader's history as felt texture rather than stored data.

---

## DEPLOYING TO PRODUCTION

**Required hosting env vars (set on platform — do not commit):**
- `VITE_PLAUSIBLE_DOMAIN` — your domain (e.g. `uselantern.app`). Activates Plausible analytics. No-ops without it.
- `VITE_FEEDBACK_URL` — link shown in Settings > "Send feedback". Hidden without it.

**Netlify / SPA routing:** `public/_redirects` already contains `/* /index.html 200`.

**Build:** `node node_modules/vite/bin/vite.js build` → deploy `dist/`

---

## 1 — CURRENT STATE

### Session 119 — Post-Ship / Alpha Week 1 (2026-05-26)

**Goal:** Companion language sweep Pass 2. No new features. No schema changes.

**Pattern found:** "tends to find what it's looking for" appeared 3× across `reflectionEngine.js`. "has its hooks" appeared in a 4th location. "found you" (story/writing found the reader) appeared 3×. These verbal tics were consistent enough to be the first pattern real readers would feel as "AI-sounding."

**11 fixes across 3 files + 1 component:** `reflectionEngine.js` (9), `crossBookMemory.js` (2), `companionPresence.js` (1), `ReadingMomentum.jsx` (1). See `SESSION_NOTES.md` for full list.

**Calibration log created:** `docs/CALIBRATION_LOG.md` — structure for recording real-reader signals, confusion points, companion failures, silence successes, abandonment patterns.

**Total companion language fixes across all passes (Sessions 115–119):** 24 observations revised or trimmed.

**Build:** clean ✓ (453ms, 84 modules) | **No schema changes** | **No new localStorage keys**

---

### Sessions 117–118 — Ship Mode / Pass E — Final Companion Calibration + Public Alpha Launch (2026-05-26)

**Goal:** Companion language sweep, silence architecture audit, thread believability review, edge-case QA, production verification, first-reader walkthrough. No new systems. No schema changes.

**Companion language fixes (10 observations across 3 files):**

`companionPresence.js` (8 fixes):
- `sessionStopObs`: removed "Some chapters ask to be sat with." — straining for profundity.
- `momentumObs` (streak ≥ 7): "This story has its hooks in you." removed — clichéd metaphor.
- `quoteEchoObs`: "The capture found its meaning." removed — too precious.
- `readerFixationObs`: "but the companion has" removed — product self-naming breaks atmosphere.
- `orientSessionLine` (2-week bucket): "This story has become a companion." → factual date count — meta (app is called a companion).
- `deepEngagementObs`: "The companion has been accumulating layers." → "Layers are building." — product narrating its own cognition.
- `SILENCE_TEXT.exhausted[1]`: "Something asked to be sat with." removed.
- `SILENCE_TEXT.grieving[0]`: "and you've been sitting with it" removed.

`crossBookMemory.js`: "The second reading always finds…" → "A second reading finds things…" — "always" was overconfident.

`reflectionEngine.js`: first-note `theme` pool — "You're reading on two levels at once." → "Something beneath the surface, noticed early." — congratulatory.

**Silence + frequency architecture audited — no changes needed.** Architecture is well-calibrated:
- 8h `MIN_RESURFACE_MS`, 0.35 `CONFIDENCE_THRESHOLD`, cap max 3 (only at visibility ≥ 0.75)
- `shouldYieldToBook()` at narrative dominance ≥ 0.75 — book wins
- Self-sustaining narrative detection: absorbed reading → companion recedes

**Thread timing audited — no changes needed.** `calcNoteDelay` scales correctly with length, emotional register, uncertainty, and tag type (700ms–4800ms range with ±220ms jitter).

**Edge-case fix — import deduplication message (`SettingsPage.jsx`):**
- Import success message previously always showed `incoming.length` even when duplicates were skipped.
- Fixed: compute `newCount` / `dupCount` before calling `importLibrary()`. Now accurately reports "X already present — skipped" or "All companions were already in your library."

**Production verified:**
- `_redirects`: `/* /index.html 200` ✓ · dist output clean ✓
- OG/Twitter tags ✓ · PWA manifest + icons ✓ · Favicon ✓
- Zero console errors or warnings in production preview ✓
- All three frozen localStorage keys confirmed present ✓
- No `dark:` Tailwind prefix violations ✓ · Mobile safe areas wired ✓

**First-reader walkthrough passed.** WelcomeBanner, New Companion, Settings, Notes tab — no SaaS language, no tutorial energy, no congratulatory tone anywhere in the first-reader path.

`index.html` meta description: "reading journey" / "AI hold the texture" → "let the text accumulate meaning as you read."

**Files changed:** `companionPresence.js`, `crossBookMemory.js`, `reflectionEngine.js`, `index.html`, `SettingsPage.jsx`
**Build:** clean ✓ (380ms, 84 modules) | **No schema changes** | **No new localStorage keys**

---

### Session 116 — Ship Mode / Pass D — Persistence + Trust Hardening (2026-05-26)

**Goal:** Surface silent storage failures; add export confirmation; cloud-sync groundwork; trust copy.

**`saveBooks()` return value + `checkStorageHealth()` (`storage.js`):**
- `saveBooks()` returns `{ ok: true }` on success, `{ ok: false, quota: true }` on `QuotaExceededError`. Silent data loss now detectable by callers.
- `checkStorageHealth()` — one-shot health check on startup: `'empty'` | `'ok'` | `'corrupted'`. Distinguishes first use from data corruption.
- `STORAGE_WARN_BYTES` threshold aligned from 80% → 70% (matches Settings UI).

**`BooksContext.jsx`:** Captures `saveBooks()` result; sets `storageWarning` on quota failure. Exposes `storageWarning`, `clearStorageWarning`, `storageHealth` via context.

**`StorageBanner` (`App.jsx`):** Quiet, dismissible alert below TopNav for two cases:
- Quota exceeded: "Storage is full — recent changes may not have been saved. Export your library to preserve what you've gathered. [link to Settings]"
- Data corrupted: "Your reading data could not be loaded — it may have been corrupted. Restore it in Settings. [link]"
- Clears on export or manual dismiss. Corruption banner per-session only.

**`SettingsPage.jsx`:**
- Export button shows "✓ Exported" (3s, gold) after download — mirrors import feedback.
- Export records `lastExportedAt` in settings and calls `clearStorageWarning()`.
- Import description: "Add companions… Duplicates are skipped." → "Restore companions… Books already in your library are not re-imported."
- Reset confirmation button: `'Reset'` → `'Yes, reset'`.

**`SettingsContext.jsx` (cloud-sync groundwork):**
- `deviceId`: stable device identity, generated once on first run, persisted in settings. Never shown to users. Architecture anchor for future sync.
- `lastExportedAt`: ISO timestamp of last export. Enables future backup nudges.

**Files changed:** `storage.js`, `BooksContext.jsx`, `SettingsContext.jsx`, `App.jsx`, `SettingsPage.jsx`
**Build:** clean ✓ (387ms, 84 modules) | **No new localStorage keys** | `deviceId`/`lastExportedAt` added to settings (backward-compatible)

---

### Session 115 — Ship Mode / Pass C — Public Alpha Onboarding + Launch Surface (2026-05-26)

**Goal:** First-run experience audit and targeted copy/accuracy fixes. No new systems.

**Bug fix — `hasAiKey` ReferenceError (`EpubImportReview.jsx`):**
- `hasAiKey` was declared inside `handleCreate` (local scope) but referenced in the render JSX — a silent `ReferenceError` on any keyless EPUB import with chapter content at step 3.
- Fixed: `const hasAiKey = !!settings.anthropicKey?.trim()` moved to component level; duplicate inside `handleCreate` removed.

**Copy accuracy — EPUB import without AI key (`EpubImportReview.jsx`):**
- "The companion cannot read this EPUB without an Anthropic key." — factually wrong; rule-based extraction always runs.
- Fixed: "Without an Anthropic key, the companion will use basic pattern matching to read this EPUB — characters and themes may be less fully understood than with AI extraction."
- CTA: "Add your key in Settings before importing →" → "Add an API key in Settings for deeper analysis →" (less alarming).
- Label: "companion extraction unavailable" → "pattern matching only" (accurate).

**Copy clarity — EPUB affordance (`CreateCompanion.jsx`):**
- "pre-fill title, author, and chapter structure" understated the actual extraction capability.
- Fixed: "auto-detect chapters, characters, and themes."

**Trust signal — data persistence (`Library.jsx` WelcomeBanner):**
- "stored locally, never shared" grammatically scoped to the API key only.
- Fixed: "your key and all your reading data are stored locally and never leave this device."

**Files changed:** `EpubImportReview.jsx`, `CreateCompanion.jsx`, `Library.jsx`
**Build:** clean ✓ (360ms, 84 modules) | **No new schema fields** | **No new localStorage keys**

---

### Session 114 — Ship Mode / Pass B — Observability + Alpha Readiness (2026-05-26)

**Goal:** Analytics infrastructure, centralized error logging, feedback pathway. No new product systems.

**Analytics (`src/utils/analytics.js` — new):**
- Plausible Analytics wrapper: `initAnalytics()` injects script when `VITE_PLAUSIBLE_DOMAIN` is set; `track(event, props)` fires events. Both silent without env var.
- `main.jsx`: `initAnalytics()` called before React mounts.
- 11 events wired across 6 files: `epub_imported`, `epub_failed`, `companion_created`, `first_session`, `first_note`, `first_mystery`, `book_completed`, `reread_started`, `api_key_saved`, `library_imported`, `library_import_failed`.
- Deployment: set `VITE_PLAUSIBLE_DOMAIN=your-domain.com` in hosting env vars. Nothing else to configure.

**Logger (`src/utils/logger.js` — new):**
- `logError(category, error, context)` / `logWarn(category, message, context)`.
- Dev: full output with stack traces. Prod: message-only, prefixed `[Lantern:Category]`.
- Wired into both error boundaries (`App.jsx` + `BookPage.jsx`).

**Feedback link (`SettingsPage.jsx`):**
- "Share thoughts on this build →" renders below the settings footer when `VITE_FEEDBACK_URL` env var is set. Set it to any URL: Typeform, GitHub Discussions, Notion form, email. Literary styling, no disruption to the page.

**Files changed:** `analytics.js` (new), `logger.js` (new), `main.jsx`, `App.jsx`, `BookPage.jsx`, `CreateCompanion.jsx`, `NotesTab.jsx`, `MysteriesTab.jsx`, `ChapterUpdateModal.jsx`, `CompanionHeader.jsx`, `SettingsPage.jsx`
**Build:** clean ✓ (328ms, 84 modules) | **No new schema fields** | **No new localStorage keys**

---

### Session 113 — Ship Mode / Pass A — Deployment + QA (2026-05-26)

**Goal:** Production hardening — metadata, error isolation, confirmed dark mode bug. No new systems.

**Production Metadata:**
- `index.html`: `apple-touch-icon` now points to `icon-192.png` (was `favicon.svg` — iOS home screens can't render SVG).
- `index.html`: `twitter:image` meta tag added — Twitter/X needs it explicitly, separate from `og:image`.

**Error Isolation:**
- `BookPage.jsx`: Added `BookErrorBoundary` — class component wrapping `BookDashboard`. A render crash in any companion tab now fails quietly in-place with a literary message; `TopNav` and the rest of the app remain functional. Auto-resets on navigation to a different book. Root `App.jsx` error boundary remains as last resort.

**Dark Mode Fix:**
- `DiscussionTab.jsx`: User question cards used `var(--color-cream-100, #F5EFE6)` — `--color-cream-100` is undefined, so the light cream fallback showed in dark mode against a near-black background. Fixed to `var(--color-card-archival)` which has correct dark variant (`#0C1820`).

**Files changed:** `index.html`, `BookPage.jsx`, `DiscussionTab.jsx`
**Build:** clean ✓ (398ms, 82 modules) | **No new schema fields** | **No new localStorage keys**

---

### Session 112 — Ship Mode / Pass 7 — Closed Alpha + Real Reader Validation (2026-05-26)

**Goal:** First-week experience audit + real observed friction only. No new systems.

**Invisible Observation Layer:**
- `BookDashboard.jsx`: `firstOpenedAt` ISO timestamp written to book object on first open. One-time, invisible. Stored in book data (included in exports automatically). No new localStorage keys. Enables future understanding of time-to-first-note and abandonment patterns.

**Real Friction Fixes:**
- `CompanionHeader.jsx`: Removed "The companion cannot enter yet — Add your Anthropic key in Settings to continue." This was factually wrong — rule-based presence observations, orientation lines, and the companion carousel all work without any API key. The API key only enhances AI extraction (EPUB import) and AI-generated reflections (≥5 notes). The false gate created anxiety for new users. Replaced by the accurate welcome banner already present on the library page.
- `CompanionHeader.jsx`: Single-companion `handleExport` — `URL.revokeObjectURL(url)` deferred 100ms (consistent with global export fix in Pass 6).
- `PresenceStrip.jsx`: Fallback text when no observation — was `book.title` when API key present, `"The companion is quiet."` when absent. Both branches now show `"The companion is quiet."`. The `book.title` branch was a leftover.

**Files changed:** `BookDashboard.jsx`, `CompanionHeader.jsx`, `PresenceStrip.jsx`
**Build:** clean ✓ (378ms, 82 modules) | **No new schema fields** | **No new localStorage keys** | `firstOpenedAt` added to book data shape (optional, backward-compatible)

---

### Session 111 — Ship Mode / Pass 6 — Launch Candidate (2026-05-24)

**Goal:** Turn Lantern from a polished local MVP into a survivable public alpha. No new systems.

**Data Safety:**
- `SettingsPage.jsx` export: URL revoke deferred 100ms so download initiates cleanly before object URL is torn down.
- `SettingsPage.jsx` import: `FileReader.onerror` handler added (was silently missing). `parseImport()` guarded with `?? ''` fallback. Success auto-dismiss extended to 6s. Export description copy improved — "Keep it somewhere safe."

**PWA:**
- `public/icon-192.png` + `public/icon-512.png` generated (Python struct/zlib) — warm cream + gold ✦, rounded corners.
- `manifest.json` updated: both PNG icons added before the SVG fallback. Required for Android Chrome install and some desktop PWA installers.

**Timer Cleanup:**
- `PresenceStrip.jsx`: focus `setTimeout` now returns a `clearTimeout` cleanup.

**Seam Sweep:**
- Removed "Presence Frequency: Always on [Soon]" from Settings — dead UI that communicates a broken control.
- Settings storage bar: `bg-sage` → `bg-ink-300` (sage reserved for note tags).
- Settings import button success: `text-sage border-sage-pale bg-sage-bg` → gold CSS vars inline style.

**Files changed:** `SettingsPage.jsx`, `PresenceStrip.jsx`, `manifest.json`, `icon-192.png` (new), `icon-512.png` (new)
**Build:** clean ✓ (331ms, 82 modules) | **No new schema fields** | **No new localStorage keys**

---

### Session 110 — Ship Mode / Pass 5 — Public MVP Readiness (2026-05-24)

**Goal:** Pre-launch hardening — performance, persistence, EPUB resilience, deployment config. No new systems.

**Performance:**
- `Library.jsx`: all filter+sort chains memoized (readingNow, setAside, finished, archived, filteredFlat, filteredArchived, readingNowMass). Previously ran on every render.
- `NotesTab.jsx`: `visible`, `visibleReversed`, `usedTags` wrapped in `useMemo`. Previously recomputed per render — expensive under active search.

**Persistence:**
- `src/utils/uid.js` (new): monotonic ID generator `uid(prefix)` = `${prefix}${Date.now()}_${seq}`. Prevents ID collisions under rapid creation. Wired into all 7 ID creation sites (notes, mysteries, characters, sessions, books, reflections).
- `BooksContext.jsx`: save debounced to 300ms. Batches rapid updates instead of serializing on every state change.
- `storage.js` `sanitizeBook()`: chapter array now sanitized — filters non-finite/negative `num`, coerces `num` to integer, ensures `title` is string, coerces `completed` to boolean.

**EPUB:**
- `epubParser.js`: hard cap at 500 TOC entries (some EPUBs encode footnotes as entries — can produce 5000+ items).

**Deployment:**
- `public/_redirects` (new): Netlify SPA routing.
- `vercel.json` (new): Vercel SPA routing.

**Files changed:** `Library.jsx`, `NotesTab.jsx`, `MysteriesTab.jsx`, `CharactersTab.jsx`, `PresenceStrip.jsx`, `ChapterUpdateModal.jsx`, `CreateCompanion.jsx`, `EpubImportReview.jsx`, `BooksContext.jsx`, `storage.js`, `epubParser.js`, `uid.js` (new), `public/_redirects` (new), `vercel.json` (new)
**Build:** clean ✓ (364ms, 82 modules) | **No new schema fields** | **No new localStorage keys**

---

### Session 109 — Ship Mode / Pass 4 — MVP Lock + First-Run Magic, Part 1 (2026-05-24)

**Goal:** Empty state authorship + OG image deployment blocker. No new systems.

**Empty State Authorship:**
- `MysteriesTab.jsx`: resolved-filter empty state — "Nothing answered yet." → "No threads have closed yet." / "Once a thread finds its answer, it will appear here." → "When a question finally gets its answer, it will rest here."
- `NotesTab.jsx`: tag-filter empty state — was a template string `No ${activeTag} notes yet.`; now tag-specific copy: theories ("something will present itself"), confusing ("the story may be holding its cards"), quotes/characters/favorites all get literary phrasing. Search empty: "Nothing surfaces for that search."

**Deployment:**
- `public/og-image.png`: generated 1200×630px PNG (Python struct/zlib). Warm cream background, manuscript-rule border, gold ✦ approximation. Resolves `index.html` og:image reference that was previously broken.

**Files changed:** `MysteriesTab.jsx`, `NotesTab.jsx`, `public/og-image.png` (new)
**Build:** clean ✓ (393ms, 81 modules) | **No new schema fields** | **No new localStorage keys**

---

### Session 108 — Ship Mode / Pass 3 — Productionization + Product Clarity (2026-05-24)

**Goal:** Make Lantern feel publicly releasable. No new systems — this pass focused on clarity, stability, onboarding, EPUB hardening, mobile usability, and deployment foundations.

**Onboarding — `Library.jsx`:**
- `WelcomeBanner` was defined but never rendered. Now wired with `welcomed` state persisted to `lantern_welcomed` localStorage key. Renders above LibraryCompanion in grouped view only; dismissed with "Continue to library →" or any link navigation.
- Copy overhauled: "Not a tracker. Not a to-do list." opening; explains what the companion actually does; API key notice explains what still works without one.

**EPUB Import Hardening:**
- `epubParser.js`: 150MB file size hard limit added — rejects before attempting `arrayBuffer()`.
- `CreateCompanion.jsx`: title+author duplicate detection against existing library. Shows calm gold-toned advisory when match found. User is not blocked — it's a warning, not an error.
- `EpubImportReview.jsx`: accepts and displays `duplicateWarning` prop on step 1.

**Mobile:**
- `NotesTab.jsx`: note textarea now calls `scrollIntoView` on focus on touch devices (350ms delay for keyboard animation). Added `inputMode="text"` and `enterKeyHint` for better iOS keyboard behavior.
- `BookDashboard.jsx`: `pb-24` → `pb-safe` (respects `env(safe-area-inset-bottom)` on notched iPhones).
- `index.css`: `.pb-safe` utility + `.note-write-area { scroll-margin-bottom: 120px }` on mobile.

**Visual Consistency — sage color purge from UI status contexts:**
- `SettingsPage.jsx`: API key "Active" badge → gold.
- `EpubImportReview.jsx`: "From EPUB" badge + "Claude AI extraction ready" text → gold.
- `PlotTab.jsx`: "Recent" chapter badge → gold.
- (Sage remains correct for note content tags: `tag-theory`, `tag-confusing`.)

**Persistence Hardening — `storage.js`:**
- `sanitizeBook()`: added recovery for missing/invalid `status` (→ 'reading'), `totalChapters` (→ chapters.length), `currentChapter` (→ 1), `lastUpdated` (→ today). Notes and mysteries now also filter zero-length text after trim.
- `saveBooks()`: pre-serialization filter removes any books that throw during `JSON.stringify` — prevents one corrupt book from blocking all saves.

**Deployment Prep:**
- `public/favicon.svg`: replaced purple Claude lightning bolt with gold ✦ on warm cream — Lantern-branded.
- `index.html`: apple-touch-icon, manifest link, PWA meta tags, og:image placeholder, Twitter Card meta.
- `public/manifest.json`: new — name/short_name/description/icons/display/theme_color.

**Production note:** `og:image` references `/og-image.png` — a minimal placeholder PNG was generated in Session 109. For public launch, replace with a designed 1200×630px social preview.

**Files changed:** `Library.jsx`, `epubParser.js`, `CreateCompanion.jsx`, `EpubImportReview.jsx`, `NotesTab.jsx`, `BookDashboard.jsx`, `index.css`, `storage.js`, `SettingsPage.jsx`, `PlotTab.jsx`, `public/favicon.svg`, `index.html`, `public/manifest.json` (new)
**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys**

---

### Session 107 — Ship Mode / Pass 2 — Companion Memory MVP (2026-05-22)

**Goal:** Make the companion occasionally feel memory-bearing, not just smart. The reader should sometimes think "this thing remembers how I experienced this book." Achieved through existing detection infrastructure, no new visible systems.

**`src/utils/companionThread.js` — emotional trajectory in AI thread context:**
- **New imports**: `detectConfidenceDrift`, `detectFixations` from `readerState.js`; `detectMotifs` from `residueMemory.js`
- **`CLUSTER_LABELS`** constant added: `['grief', 'fear', 'wonder', 'love', 'guilt', 'power', 'identity']` — human-readable labels for the 7 `EMOTIONAL_CLUSTERS`, used in ambient observations
- **`detectDominantCluster(notes)`** (new export): scans keyword emotional-cluster membership across all notes. Returns `{ label, pct }` when one cluster accounts for ≥35% of emotionally-scored keywords, ≥6 scored words, ≥5 notes. Returns null otherwise. Foundation for "you've been writing in the territory of grief" awareness — companion can hold this without naming it explicitly.
- **Trajectory signals** now computed inside `generateNoteThreadResponse()` and injected into historyLines + qualifiers:
  - `confidenceArc` — from `detectConfidenceDrift(allNotes).arc` (requires ≥5 notes): adds "their interpretive certainty has been declining / strengthening / oscillating" history line and corresponding tone qualifier
  - `dominantCluster` — from `detectDominantCluster(allNotes)`: adds "emotional vocabulary has been predominantly in the territory of X" history line; qualifier directs AI to acknowledge accumulation if this note continues the thread
  - `topFixation` — from `detectFixations(allNotes)[0]` (requires ≥6 notes): adds "the word X keeps appearing — something hasn't resolved" history line
  - `motifs` — from `detectMotifs(allNotes, book.currentChapter)` (requires ≥5 notes): adds "recurring words X and Y — these keep returning" history line; qualifier directs AI to note the return if this note touches them

**`src/tabs/NotesTab.jsx` — echo cooldown + dominant cluster presence:**
- **Echo cooldown via `echoGapRef`** (useRef, initialized at 2): enforces minimum 2 non-echo notes between each echo. `canEcho = !isFirstNote && echoGapRef.current >= 2`. When an echo fires, ref resets to 0; when no echo and not first note, ref increments. Makes resurfacing feel earned and occasional rather than mechanical.
- **`detectDominantCluster` imported** from `companionThread.js`
- **Dominant cluster observations** added to `deriveNotesPresence()` — fires after fixation/motif conditions, before reread sediment: 7 cluster-specific lines, each grounded in the reader's actual emotional vocabulary pattern (grief → "Loss and absence keep appearing in what you write…"; fear → "Something in this reading keeps landing in fear or dread…"; wonder → "Strange, liminal, uncanny — your notes keep returning to that territory"; guilt → "Moral weight keeps appearing…"; power → "The pressure and struggle in this story has been staying with you"; identity → "Questions of self and belonging keep appearing in what you write"; love → "Warmth and connection keep appearing…")
- **Emotional inversion detection** in reread sediment block: when `current.length >= 3`, computes `archivalCluster` and `currentCluster` separately. If both resolve and labels differ → "The emotional register has shifted between readings. What felt like one thing before now feels like another." The companion holds the inversion without explaining it.

**`src/components/dashboard/CompanionHeader.jsx` — haunted mystery specificity:**
- **`mysteryHauntScore` import** added from `../../utils/hauntScore.js`
- **Reading gap archaeology** (isReading, gap ≥ 7d): now also surfaces the highest-haunted unresolved mystery when `daysAway >= 14` AND haunt score ≥ 1.5. Displayed as a ✦-prefixed italic 11px ink-300 line below the last-note pull-quote. Threshold: score must be 1.5+ to surface — marginal mysteries stay dormant.
- **Abandoned archaeology** (isPaused, gap ≥ 14d): replaced generic "N open threads" count with the specific text of the highest-haunted mystery. `topMystery.text` shown in quotes; if `openCount > 1`, "N other threads still open." appended. The companion names what the reader left open, not how many things they left open.

**Files changed:** `companionThread.js`, `NotesTab.jsx`, `CompanionHeader.jsx`
**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys**

---

### Session 106 — Ship Mode / Pass 1 — Core Loop Stabilization (2026-05-22)

**Critical completion-state bug fixed.** Full reading loop now verified end-to-end.

**`src/components/dashboard/CompanionHeader.jsx` — completion pathway:**
- **Completion pathway block** (new): `(isReading || isPaused) && atEnd && !editingMeta && !pendingAction` — shows "The final chapter." italic line + "The story ends here ✦" outlined button. Clicking sets `pendingAction('finish')`.
- **Primary CTA guard**: `(isReading || isPaused) && !atEnd && ...` — "Continue from chapter N" / "Begin your first chapter" now only shows when `!atEnd`. Previously showed with empty dropdown when book was complete.
- **Reading gap archaeology guard**: added `!atEnd` to prevent the pull-quote showing when already at completion.
- **Confirm dialog decoupled from `actions.length`**: the CONFIRM block now renders independently as `pendingAction && CONFIRM[pendingAction] && !editingMeta`. This is necessary because `isReading && atEnd` now has an empty `actions` array — the completion pathway triggers the confirm via `setPendingAction` directly, not via the actions list.
- **Actions list cleanup**: when `isReading && atEnd`, no actions are pushed — no redundant "put this aside · the story ends here ✦" secondary links appearing below the primary completion button. Lifecycle action links also now gated by `!pendingAction`.
- **CTA copy**: brand new books (`readingLog.length === 0`) show "Begin your first chapter" rather than "Continue from chapter 1."

**`src/components/modals/ChapterUpdateModal.jsx` — empty dropdown guard:**
- When `remainingChapters.length === 0` (all chapters read, book reached atEnd via this modal), the chapter select is replaced with "All chapters have been read." and the "Continue →" CTA is hidden. Safety net — CompanionHeader now prevents `atEnd` books from opening the modal, but guard protects against edge cases.

**Verified flow (visual preview):**
1. `atEnd` book → "The final chapter." + "The story ends here ✦" ✅
2. Click → CONFIRM: "Mark this companion as finished?" + "Not yet" / "Yes, it's done" ✅
3. Confirm → `isFinished` → afterimage line ("The ending is still settling.") + "begin again · archive this companion" ✅

**Files changed:** `CompanionHeader.jsx`, `ChapterUpdateModal.jsx`
**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys**

---

### Session 105 — Reinterpretation Systems + Semantic Archaeology (2026-05-22)

**`src/utils/companionThread.js` — semantic echo rebuilt + theory recontextualization:**
- **`EMOTIONAL_CLUSTERS`** (7 clusters): grief/loss/death · fear/dread/horror · wonder/uncanny/liminal · love/warmth/belonging · guilt/betrayal/conscience · power/control/trapped · identity/self/displacement. Allows cross-word resonance detection — "grief" resonates with "loss" without exact overlap.
- **`scoreOverlap(keywords, noteWords)`** — new scoring function. Exact match = 1.0 pt. Same emotional cluster = 0.6 pt. Replaces the old `keywords.filter(k => noteWords.includes(k)).length`.
- **`detectNoteEcho(newNote, existingNotes, rereadCount = 0)`** — updated to use `scoreOverlap`, lower threshold (1.5, was 2), chapter proximity boost (±0 ch = +0.5, ±1–2 ch = +0.2), and era classification. Returns note with `__echoType: 'era' | 'resonance'` or null.
- **Theory recontextualization** — in `generateNoteThreadResponse()`, when new note is `theory/confusing`, scans prior theories for semantic overlap using `scoreOverlap >= 1.0`. If a related theory was revised (`revisedAt`), adds `"A related certainty from earlier in this reading was later revised — the ground here has shifted before."` to historyLines. AI also receives: `"the related prior collapse is relevant — the reader may not recognize that this ground has shifted before"` as a tone qualifier.
- **Era-aware echo context in AI prompt**: `echo.__echoType === 'era'` → `"An archival note from a previous reading of this book"` vs `"An earlier note from this reading"`. AI instruction: "note how interpretation may have shifted between readings."

**`src/tabs/NotesTab.jsx` — note identity + manuscript polish:**
- **Chapter stamping on new notes**: `chapter: book.currentChapter > 0 ? book.currentChapter : undefined` added to note creation. Notes going forward carry chapter context, enabling chapter-proximity echo scoring and archaeology display.
- **Era echo display distinction**: `noteEchoes[note.id].__echoType === 'era'` → `"· from your first reading, ch. N"` (warm gold border `rgba(184,134,11,.12)`) vs `"· an earlier note, ch. N"` (neutral border `rgba(28,20,16,.07)`). Era echoes are visually distinct — they carry the weight of a different reading.
- **Dynamic CTA labels** (`CTA_LABELS` map): `theory → "Hold this →"` · `confusing → "Leave open →"` · `quote → "Carry this →"` · `favorite → "Mark this →"` · `character → "Note this →"` · `theme → "Leave this →"`. Each tag now gestures at its own relationship to the manuscript.
- **Textarea background**: `background: 'transparent'` → `'rgba(28,20,16,.018)'`. Very slight parchment warmth — barely perceptible, registers as "writing surface" rather than "form field."
- **Enter submits reflection**: `onKeyDown` added to reflection textarea — `Enter` (without Shift) calls `saveReflection(note)`.
- **Reread sediment observation** in `deriveNotesPresence(notes, rereadCount = 0)`:
  - New `rereadCount` parameter (call site updated to pass `book.rereadCount || 0`)
  - 3 new conditions: `archivalCollapsed >= 1` → "What was certain in the first reading has already aged…"; `archivalTheories >= 2` → "The first reading is still visible here…"; `archival >= 4` → "Two readings, layered. The earlier one is still legible beneath this one."
  - These fire before the collapsed-theory conditions — a reread with visible archival material is the most specific possible observation.

**`src/tabs/MysteriesTab.jsx` — unresolved thread persistence:**
- `haunted` opacity in environmentally-quiet state: `0.60 → 0.75`. Haunted mysteries resist dormancy — they stay more visible than quiet threads even when their book has been abandoned.
- `persistent` opacity in quiet state: `0.50 → 0.62`. Some resistance for the next haunt tier.
- Saturation filter already excluded haunted mysteries (unchanged — `mHauntLevel !== 'haunted'` condition was correct).

**Build:** clean ✓ | **No new schema fields** (`chapter` added to new notes — optional, backwards-compatible) | **No new localStorage keys**

---

### Session 104 — Companion Cognition + Note Echo + Return Archaeology (2026-05-22)

**`src/utils/companionThread.js` — substantially extended:**
- **`detectNoteEcho(newNote, existingNotes)`** (new export): keyword-overlap scanner that finds the best-matching older note from the book's corpus. Uses STOPWORDS filtering and a minimum 2-keyword overlap threshold. Returns the older note object or null. Called in `addNote()` on the pre-update `book.notes` (old notes only, before the new one is appended). No AI required.
- **`generateNoteThreadResponse(note, book, apiKey, context)`** — extended signature with optional `context = { echo }`. AI prompt is now substantially richer:
  - Theory history: count of theories + how many were revised/collapsed
  - Reread awareness: explicitly tells AI "this is their second reading"
  - Confusion accumulation: if ≥ 3 confusing notes, AI is told "uncertainty has been accumulating"
  - Echo context: if an echo was found, passes it as "An earlier note that may resonate..."
  - Derived instruction qualifiers: "hold theories with tentativeness" if collapses exist; "acknowledge rereading subtly if relevant" on reread
- **`STOPWORDS`** set added — 60+ common English words filtered from keyword extraction.

**`src/tabs/NotesTab.jsx` — note echo wired in:**
- `detectNoteEcho` imported from `companionThread.js`.
- `noteEchoes` state added (`{}`), parallel to `noteReplies`.
- In `addNote()`: echo detected from pre-update `book.notes` before `onUpdateBook()` is called. If found, stored in `noteEchoes[note.id]`. Passed as `context.echo` to `generateNoteThreadResponse()`.
- Echo display: renders below the companion thread block when `noteEchoes[note.id]` exists and thinking has resolved (`thinkingNoteId !== note.id`). Uses a quieter left border (`rgba(28,20,16,.07)`) and subdued styling: 10px italic ink-300 attribution ("· an earlier note, ch. N"), 12px italic ink-400 truncated text (120 char limit). Visible even without AI key.

**`src/components/dashboard/CompanionHeader.jsx` — two archaeology layers:**
- **Reading gap archaeology** (for `isReading` books, gap ≥ 7 days, only when notes exist): surfaces the last note written as a quiet 11px italic ink-300 pull-quote. Single line, no header, very minimal. A thread to re-enter by.
- **Abandoned archaeology** (for `isPaused` books, gap ≥ 14 days): duration string ("N weeks ago" or "N months ago") + last note pull-quote + open mystery/thread count. Three information tiers, progressively quieter. Gated by `!editingMeta && !pendingAction` so it doesn't appear during edits or confirmations.
- Both blocks use `animate-fade-in`, appear above the ritual CTA, and are separated by a very faint `rgba(28,20,16,.04/.05)` top border.

**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys**

---

### Session 103 — Cross-Book Memory + Post-Completion Afterimage (2026-05-22)

**`src/utils/crossBookMemory.js` (NEW FILE):**
Two exports powering library-scale and book-completion awareness.

- **`generateCrossBookObservation(books)`** — analyzes patterns across all books to surface one ambient observation about the reader as a reader. Priority order: behavioral pattern (rereader/holder/finisher/wanderer) → annotation style (theorist/questioner/collector/impressionist/analyst) → mystery tendency → collapse awareness → thematic resonance (grief/tension/strange/warmth/identity/moral). Returns null when data is insufficient — never generalizes thin data. Minimum thresholds: `MIN_BOOKS_FOR_PATTERN = 3`, `MIN_BOOKS_FOR_THEME = 3`, `MIN_NOTES_FOR_BOOK = 4`.
- **`generateCompletionAfterimageLine(book)`** — generates a quiet settled observation for recently completed books. Considers: days since completion, open mystery count, collapsed theory count, note density, quote count. Returns specific earned lines rather than congratulatory ones. Default: "The story is complete. What stays, stays."

**`src/components/library/LibraryCompanion.jsx` (NEW FILE):**
One ambient ◦-prefixed observation appearing at the top of the grouped library view. Uses `useMemo` keyed to `books.length` + total annotation count. Returns null when `generateCrossBookObservation` finds no pattern. 12px italic ink-500 at 0.75 opacity — very subdued, very settled. Only renders in grouped view (not filtered/search, not empty). Distinguished from PresenceStrip ✦ by using ◦ glyph.

**`Library.jsx` — wired LibraryCompanion:**
- Import added: `LibraryCompanion`
- Rendered as first child of the grouped view `<div>`, before the "reading now" zone.

**`CompanionHeader.jsx` — post-completion afterimage:**
- Import added: `generateCompletionAfterimageLine` from `crossBookMemory.js`
- For recently finished books (≤ 30 days): shows the afterimage observation as primary line; if > 2 days old, also shows the archival date below in subdued 11px ink-300.
- For older finished books (> 30 days): falls back to the existing `fmtCompleted()` archival date line.
- `daysAgo <= 2`: afterimage only, no date (date would be redundant — "today/yesterday" is already in the afterimage line's context).

**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys**

---

### Session 102 — Companion Ritual Flow + Emotional UX Staging (2026-05-22)

**NotesTab.jsx — complete restructure:**
- Writing surface always at top — no "leave a note" toggle. Serif italic 14px textarea, transparent, bottom-border-only. Expands on focus; collapses when empty+unfocused. Tags + "Keep →" / "cancel" appear on expand.
- Note order reversed: **newest → oldest**. New note gets `.note-land` animation at index 0 — writer witnesses it arriving. `recentNoteId` tracks which note to animate; clears after 1.8s.
- Search demoted to text-link: "search notes" (11px italic ink-300). Clicking reveals inline borderless search input. Escape/X dismisses. `searchVisible` state controls this.
- Geological break direction corrected: with reversed order, break fires when entering archival stratum from above (current → archival, not the old bottom-up direction).
- Removed: `adding` state, `EmptyState` import, toggle button. Empty state: quiet italic hint "Theories, favourite lines, confusions, hunches."

**ChapterUpdateModal.jsx — full rebuild:**
- Form: freeform textarea + chapter chips + expanded list + duration buttons all removed.
- New form: `<select>` dropdown (chapter) + large serif-italic expressive textarea "How did it feel?"
- CTA: filled gold → outlined editorial button (border ink-200, transparent bg, hover darkens only).
- Modal: `animate-slide-up` → `.modal-soft` (0.60s cubic-bezier — barely perceptible).
- Done state: `visibleCards` with staggered timers (180/820/1480/2100ms). Each card uses `.card-surface` (0.70s ease backwards).
- Progress card: removed heading+icon+container — just 40px gold % + `h-px` bar + dry observation line.
- `getDryObservation()`: literary, dry, specific — first read / gap / milestone / chapter count. Never congratulatory.
- Threads card: ember/red removed → neutral ink-06 border + gold ✦ glyph. No longer reads as error state.
- Card headers: `SectionLabel` uppercase → quiet italic "newly encountered" / "what just happened" / "threads just opened".
- Close button: also outlined editorial, appears with 4th card wave.

**CompanionHeader.jsx:**
- Ritual CTA changed from text-link to outlined editorial button (border ink-200, 9px/20px padding, hover border+text only).

**index.css:**
- `.card-surface` (0.70s ease backwards), `.note-land` (0.45s ease both), `.modal-soft` (0.60s cubic-bezier).

**Build:** clean ✓ | **No new schema fields** (`sessionReflection` added to log entries — optional, non-breaking)

---

### Session 101 — Stabilization Arc: Ritual UX + Editorial Hierarchy (2026-05-22)

Two passes to address accumulated flattening — all elements whispering at the same volume.

**Pass 1 — Ritual UX + Operational Clarity:**

`CompanionHeader.jsx`:
- Progress update elevated as primary ritual action, displayed between author row and lifecycle actions. 17px serif weight-500, not a button but a ceremonial anchor. Text adapts: paused → "Return to chapter N", reading → "Continue from chapter N", fresh start → "Begin your first chapter".
- API key gate: when `!hasAiKey` and book is reading/paused, a quiet italic notice appears below the ritual action: "The companion cannot enter yet. Add your Anthropic key in Settings to continue." Links to `/settings`.
- "update chapter" removed from the lifecycle actions row (now lives only as the primary ritual action).

`EpubImportReview.jsx`:
- `useNavigate` import and `const navigate = useNavigate()` added.
- Status text changed: "rule-based extraction ready" → "companion extraction unavailable" when no API key.
- Pre-import notice (gold banner) shown before the Build button when key is absent and `chapterContents` exist: explains the limitation and links to Settings.

`PresenceStrip.jsx`:
- No-key ambient state: `{obs || (!settings.anthropicKey?.trim() ? 'The companion is quiet.' : book.title)}` — when no observation and no key, strip shows calm quiet rather than the book title.

`NotesTab.jsx`:
- No-key + non-first note: companion is cleanly absent (no fake thinking dots). Three-path `addNote()` logic: first note → local intro; key present → AI call; no key + not first → silent.

**Pass 2 — Editorial Hierarchy + Breathing Room:**

Architecture finding: The UI had become visually flattened — 8–14px range everywhere, uniform opacity, identical spacing cadence. Everything whispered at the same volume.

`ProgressTab.jsx` — 3-tier chapter hierarchy:
- Chapter row vertical rhythm: `isCurrent → py-4`, `isNext → py-3`, completed+important/singularity → `py-2`, completed → `py-1.5`, important/singularity pending → `py-3.5`, default → `py-2.5`.
- `chapterMargin`: current chapter gets `marginTop: 16, marginBottom: 4`; completed singularity chapters get `marginTop: 10, marginBottom: 8`.
- Chapter label: completed → 10px ink-200; current → 11px weight-600 gold; default → 10px ink-400. All inline styles (Tailwind classes removed from label).
- Chapter title: current → 15px serif ink-900 weight-500; completed → 12px sans ink-300 (no line-through); next → 13px sans ink-600; default pending → 13px sans ink-500.

`PlotTab.jsx` — 3-tier recency hierarchy:
- Button padding: `isJustRead → py-4`, `isRecent → py-3.5`, older → `py-2.5`.
- Number badge: `isJustRead → 12px ink-500 weight-500`, older → `10px ink-300 weight-400`.
- Chapter title: `isJustRead → 16px serif ink-900 weight-500`, `isRecent → 14px sans ink-700 weight-500`, older → `12px sans ink-400 weight-400`.
- Summary preview: `isJustRead/isRecent → 12px ink-400`, older → `11px ink-300`.

`CompanionHeader.jsx`:
- Book title: `fontSize: 22 → 24`, `letterSpacing: '-0.02em' → '-0.025em'`.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields**

---

### Session 100 — Companion Thread: AI Responses + Animation + Typography (2026-05-22)

**AI-powered responses (`src/utils/companionThread.js` — new file):**
- `generateNoteThreadResponse(note, book, apiKey)` — calls `claude-haiku-4-5` with full context: book title/author/description, current chapter, last 5 notes as history, new note text and tag. 120 token cap, 12s timeout. Returns one or two sentences grounded in the specific book.
- `threadFallback(tag)` — canned fallback pool for no-key / error cases.
- `NotesTab.jsx` wires three paths in `addNote()`: first note → `generateFirstIntroReflection()`; API key present → AI call (raced against `calcNoteDelay()` floor); no key → canned fallback. `useSettings` import added to `NotesTab.jsx`.

**Staged arrival animation (`index.css`, `NotesTab.jsx`, `MysteriesTab.jsx`):**
- Old `companionThreadArrive` (blur-clear, 0.7s) replaced with two element-level animations:
  - `.companion-glyph-settle` on ✦ `<span>`: 0.5s ease fade-in — the star marks its place first.
  - `.companion-text-surface` on `<p>`: 1.1s ease, 0.3s delay, `fill-mode: both` — words surface after.
- Applied to individual elements (not the wrapper div). `companion-thread-arrive` removed.

**Typography + contrast:**
- Was: 12px Playfair Display italic `--color-ink-500` (~2.5:1 contrast — WCAG fail).
- Now: 13px Inter regular `--color-ink-700` (~6.5:1 contrast — WCAG AA pass). ✦ opacity `0.50 → 0.65`.

**Dev server network access:**
- `vite.config.js`: `server: { host: true, port: 5230 }` — binds to `0.0.0.0`.
- `.claude/launch.json`: `--host` flag added.
- Local: `http://localhost:5220` · Network: `http://192.168.1.50:5220`

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields**

---

### Session 99 — Companion Presence Timing + Emotional Latency (2026-05-21)

Deepened the timing and perceptual realism of the companion threading system introduced in Session 98.

**`index.css`:**
- `@keyframes companionThreadArrive` — changed from `translateY(3px)→0` to `blur(0.8px)→blur(0)`. Responses surface through the page rather than sliding in.
- `.companion-thread-arrive` — duration extended `0.55s` → `0.7s ease` to match the blur dissolve.

**`NotesTab.jsx`:**
- `calcNoteDelay(text, tag)` extended with emotional/uncertainty vocabulary detection: `uncertain` words (+450ms), `emotional` words (+350ms), ellipsis (+300ms). Short notes (<8 words) get a lower base delay (800ms vs 1000ms). ±220ms random jitter per call. Final clamp widened: 700–4800ms.
- Thinking glyphs: irregular animation durations `2.3s / 3.1s / 1.9s` at delays `0s / 0.7s / 1.5s`. No longer uniform 2.2s.
- Thread border: `rgba(184,134,11,.22)` → `rgba(184,134,11,.15)`.
- ✦ response opacity: `0.60` → `0.50`.

**`MysteriesTab.jsx`:**
- Same glyph irregularity (`2.3s / 3.1s / 1.9s` at `0s / 0.7s / 1.5s`).
- Mystery delay gains ±200ms jitter.
- Thread border: `.22` → `.15`. ✦ opacity: `0.60` → `0.50`.

**`PresenceStrip.jsx` + `CompanionInsights.jsx`:**
- Observation carousel: `setInterval` replaced with recursive `setTimeout` + ±1500ms jitter per rotation (initial fire also jittered). Cadence now varies ±1.5s — feels environmental, not mechanical. Cleanup uses `clearTimeout`. PresenceStrip inner delay: 300ms. CompanionInsights: 280ms.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema or systems**

---

### Session 98 — Companion Moment Refinement (2026-05-21)

Architecture finding: Companion responses appeared above the note they responded to, and appeared instantly. Both felt wrong — spatially inverted and mechanically immediate. This pass introduced threaded, timed, spatially correct companion responses across Notes and Mysteries.

**New keyframes / classes (`index.css`):**
- `@keyframes companionPulse` — 2.2s slow star pulse for the thinking state (`opacity .18 → .75 → .18`)
- `@keyframes companionThreadArrive` — 0.55s fade + 3px vertical settle for response arrival
- `.companion-thread-arrive` — utility class applying the arrival animation

**NotesTab.jsx — full threading system:**
- Removed `introAck` state and the floating first-note ceremony block (previously appeared above the notes list). First-note response now threads through the same per-note system.
- Added `thinkingNoteId`, `noteReplies`, `thinkingTimerRef`.
- `calcNoteDelay(text, tag)` — 800–4500ms based on word count, sentence count, question marks, tag type (theory/confusing +500ms, favorite +250ms).
- `generateNoteCompanionResponse(note, isFirst)` — returns a string or `null`. Responds to `theory`, `confusing`, `favorite`, `quote`, any note with `?`. Silent for plain `character` and `theme` notes (companion scarcity preserved). First note always responds via existing `generateFirstIntroReflection()` pool.
- `addNote()`: always sets `thinkingNoteId` immediately; after the delay, clears it and (if there's a response) sets `noteReplies[note.id]`. When silent, thinking state fades without a reply — a considered silence.
- Thread JSX inside each note card (before the footer): `1px rgba(184,134,11,.22)` left border + 12px inset. Thinking state = three `✦` at 0 / 0.6s / 1.2s stagger. Response = `companion-thread-arrive` + `✦` (opacity 0.60) + 12px serif italic ink-500.

**MysteriesTab.jsx — same pattern, simpler:**
- Added `thinkingMystId`, `mysteryReplies`, `thinkingTimerRef`.
- `generateMysteryResponse(text)` — 4 responses, deterministic by hash. Every new mystery always receives a response (opening a thread is a deliberate act).
- Delay: `900ms + min(words×35, 900ms)`.
- Same thread visual as notes, placed before the thread actions row.

**Behavioral invariants:**
- Thinking state appears for ALL notes (even those that receive no response) — the companion considers before staying quiet. A silent thinking state communicates restraint, not failure.
- Responses are session-only (component state, not persisted). Old notes/mysteries carry no thread. Correct behavior — threading is about the moment of creation.
- `introAck` system entirely removed. First-note `reflectionCache` setup (for PresenceStrip) is preserved.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

### Session 97 — Dev Mode reintroduction + model fix (2026-05-21)

Two fixes in one pass.

**Anthropic model update:**
- `src/utils/aiRequest.js`: `PROVIDER_CONFIG.model` updated from `'claude-3-5-haiku-20241022'` → `'claude-haiku-4-5'`. The old versioned model ID was returning 404 from the API, causing all AI extraction (EPUB import) and companion reflection calls to silently fall back to rule-based paths. This is the single source of truth for all AI operations — one change covers EPUB extraction, discussion questions, and companion reflections simultaneously.

**Dev Mode reintroduction:**
Dev Mode was first built in Session 52, then lost during the Session 79 architectural overhaul (when `CompanionPanel` and `CompanionInsights` were replaced by `PresenceStrip`). Reintegrated against the current architecture.

- `src/context/SettingsContext.jsx`: `devMode: false` added to `SETTINGS_DEFAULTS`. Persisted in `shadowscribe_settings` localStorage alongside other settings.
- `src/pages/SettingsPage.jsx`: "Developer" section added at the bottom of Settings, above the footer. Contains one `SettingsRow` with a `Toggle` for Dev Mode. Uses the same `SettingsSection`/`SettingsRow`/`Toggle` components as all other settings.
- `src/utils/reflectionEngine.js`: `getActiveReflections(book, limit = 3, devMode = false)` — third parameter added. When `devMode` is true, the `MIN_RESURFACE_MS` (8h) cooldown filter is bypassed — all non-suppressed reflections are immediately eligible to surface regardless of when they were last shown.
- `src/components/dashboard/PresenceStrip.jsx`: `devMode = !!settings.devMode` derived from settings. `carouselInterval`: when devMode, always `3000` (bypasses the `deepFaded → null` suppression and the 12–18s normal intervals). `stripOpacity`: when devMode, always `1.0` (bypasses presence-visibility fade-out so the companion is always fully visible). `getActiveReflections` call updated to pass `devMode`.
- `src/components/dashboard/CompanionInsights.jsx`: Same three changes as PresenceStrip — `devMode`, `carouselInterval`, `stripOpacity`, `getActiveReflections`.

**What Dev Mode does when on:**
1. 8h reflection cooldown bypassed — full reflection pool immediately eligible
2. Carousel runs at 3s (vs 12–18s) — cycle through all observations quickly
3. Companion strip always at full opacity — presence-visibility fade-out suppressed

**What Dev Mode does NOT do:** Does not bypass `yieldsToBook`, atmospheric silence mode, or any of the signal arbitration/suppression logic — those remain testable.

**Note:** The existing `localStorage.setItem('lantern_debug_companion','1')` debug panel (data inspector overlay) is separate and unchanged. Dev Mode = behavioral override. Debug panel = data view.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 96 — Depth of Attention + Focus Falloff (2026-05-21)

Architecture finding: After seven atmosphere passes, all books still resolved with roughly equal perceptual clarity. Inhabited, deeply annotated books needed to come forward; sparse and dormant books needed to step back — not through visible states but through quiet optical recession.

**Changes:**
- `BookCard.jsx`: `coverShadowOpacity` replaced with `coverOpacity` — combines presence and temporal state: finished→0.80, 90+d→0.70, deep→1.0, inhabited→0.97, sparse→0.91. Cover of a deeply inhabited book holds full optical presence; sparse/finished books step back slightly.
- `BookCard.jsx`: `coverShadow` extended with temporal falloff for sparse/unannotated books: 90+d→`'0 2px 10px rgba(0,0,0,.10)'`, 45+d→`'0 2px 12px rgba(0,0,0,.13)'`. Very old books lose the last of their shadow weight.
- `BookCard.jsx`: Title color by presence — `presence === ''` → `var(--color-ink-800)` (one tonal step recession vs ink-900 for inhabited/deep).
- `Library.jsx`: Flat-view presence pass — `filteredFlat` and `filteredArchived` now pass `presence={bookPresence(book)}` to BookCard. Presence identity is now consistent whether a book is found in grouped or filtered/search view.
- `index.css`: `.shelf-dormant`: `filter: saturate(0.82) brightness(0.97)`. `.shelf-archive`: `filter: saturate(0.60) brightness(0.95)`. Brightness reduction adds a third cooling axis alongside existing saturation and opacity.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 95 — Peripheral Atmosphere + Edge Dissolution Pass (2026-05-21)

Architecture finding: Library atmosphere existed but outer edges felt screen-bounded. Three edge conditions addressed: reading-now peripheral reach, page atmospheric ground, and archive terminal taper.

**Changes:**
- `index.css`: `.reading-now-zone` margin `-20px` → `-28px` each side; padding `20px` → `28px` horizontal. Zone bleeds further into page margins. Bottom dissolution shadow unchanged.
- `index.css`: `body::before` 5th gradient added: `radial-gradient(ellipse 70% 25% at 50% 106%, rgba(184,134,11,.020) 0%, transparent 55%)`. `position: fixed` means this warm ground persists at viewport bottom during scroll — library sits over warmth rather than on hard floor.
- `Library.jsx`: Mass >= 6 zone padding override: `'26px 20px 18px'` → `'26px 28px 18px'` (preserves 28px horizontal).
- `Library.jsx`: Archive grid `maskImage: 'linear-gradient(to bottom, black 62%, transparent 100%)'`. Books fade into page (0.38 × gradient → 0). Upper card content (title, author) stays; lower content (progress, date) dissolves.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 94 — Visual Current + Quiet Zones Pass (2026-05-21)

Architecture finding: Regional climate existed but the eye scanned too uniformly. Added directional flow through stepped label indentation, row/col gap asymmetry, and suspension/approach spacing.

**Changes — `Library.jsx`:**
- Set-aside wrapper: style now also includes `paddingTop: 6` when `setAsideDormantRatio > 0.5`. A mostly-cooling shelf floats slightly — suspended, passed more lightly.
- Set-aside grid: `gap-4` → `gap-x-4 gap-y-[22px]`. Row gap (22px) > col gap (16px). Rows breathe; books within a row feel closer. Editorial vertical pacing.
- Finished label: `paddingLeft: 4`. First step of the label diagonal — section labels step rightward with temporal depth.
- Finished grid: `gap-3` → `gap-x-3 gap-y-[18px]`. Same editorial principle, tighter.
- Archive section: `paddingTop: 16`. Measured quiet before the most settled section.
- Archive label: `paddingLeft: 10`. Label diagonal completes: reading-now/set-aside flush → finished +4px → archive +10px.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 93 — Environmental Weather + Density Fields Pass (2026-05-21)

Architecture finding: Library regions felt climatically uniform — card-level cooling varied, but the zones themselves were static. This pass introduced region-scale atmospheric behavior driven by actual reading data.

**Changes:**
- `index.css`: `.reading-now-zone` box-shadow: added `0 40px 48px -8px var(--color-cream)` — warm cream penumbra below zone dissolves into the set-aside gap rather than ending at a hard boundary. Dark mode variant added.
- `Library.jsx`: `readingNowMass` — sums annotation weight across all reading-now books (same scoring as `bookPresence()`). `zoneWarmthPct = Math.min(30, Math.max(18, Math.round(18 + mass × 1.5)))` → 18–30% gold-bg mix. Replaces binary deep→26% from Session 90 with continuous scale. `readingNowMass >= 6` → zone padding expands to `26px 20px 18px` (was 22px/14px).
- `Library.jsx`: Set-aside section wrapper `style={{ filter: 'saturate(0.93)' }}` when `setAsideDormantRatio > 0.7`. Heavily dormant shelf (>70% books cooling 45+d) becomes a slightly more diffuse weather region as a collective.

**Environmental thresholds:** mass=0→18%, mass=4→24%, mass≥6→27%+expanded, mass≥8→30%. Dormancy>0.7→saturate(0.93)+label@0.38.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 92 — Shelf Ecology + Inter-Book Relationships Pass (2026-05-21)

Architecture finding: Cards had distinct internal atmosphere but felt isolated from each other. This pass introduced neighborhood awareness — books now affect their immediate neighbors without any visible system.

**Changes — `Library.jsx`:**
- **`setAsideLabelOpacity`** — computed before JSX: if `setAside.filter(daysSince > 45).length / setAside.length > 0.5` → opacity `0.38` (was fixed `0.52`). Whole shelf breathes together when mostly dormant.
- **Set-aside ecology**: `setAside.map((book, idx)` → looks at `setAside[idx-1]` and `setAside[idx+1]`. `neighborDeep = true` if any neighbor has `bookPresence === 'deep'`.
  - Drift: `neighborDamp = 0.55` when `neighborDeep && p !== 'deep'` — deep neighbors stabilize adjacent drift. Calm zone radiates from inhabited books.
  - Warmth: `neighborDeep && p === ''` → `background: 'color-mix(in srgb, #B8860B 3%, var(--color-card-base))'` inline — very slight warm tint on unannotated cards adjacent to deep ones. `.surface-inhabited*` !important rules are immune — only truly unannotated cards receive warmth.
- **Finished ecology**: `finished.map((book, idx)` → same deep-neighbor drift damping (0.55). No warmth propagation in finished section.

**Key invariant:** Ecology is one-hop only (immediate neighbors). No cascade, no chain propagation.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 91 — Interior Atmosphere + Card Identity Pass (2026-05-21)

Architecture finding: After library composition became organically asymmetric, individual book cards still rendered with identical internal rhythm regardless of presence or temporal state. This pass introduced eight graduated variations to `BookCard.jsx`, all derived from `presence` and `daysSince`. Deep books earn more interior space; dormant books compress and quiet.

**Changes — `BookCard.jsx`:**
- **Interior padding** — deep non-hero: `p-5` (was `p-4`). Hero/primary unchanged at `p-5`.
- **Author mt** — deep: `mt-1` (was `mt-0.5`). Extra breathing between title and author for inhabited books.
- **Footer mt** — default `mt-3` · inhabited `mt-3.5` · deep `mt-4`. More room before progress for deeper reads.
- **Chapter count color** — reading+deep: `ink-500`. 45+d: `ink-300`. Default: `ink-400`. Progress numbers warm or cool with the book's life.
- **Percentage opacity** — 90+d: 0.45. 45–89d: 0.65. Recent: 1.0. Old progress numbers fade with absence.
- **Progress bar height** — reading+deep/inhabited: `h-[3px]`. 90+d: `h-px`. Default: `h-0.5`. Inhabited active reads carry a heavier bar.
- **Chapter→bar mb** — deep: `mb-2`. 45+d cooling: `mb-1`. Default: `mb-1.5`.
- **Date mt** — 45+d: `mt-1`. Recent: `mt-2`. Old dates compress; recent dates breathe.

**Key invariant:** All variation deterministic — no randomness. `presence` defaults to `''` in filtered view, so interior variations only apply in grouped shelf view.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 90 — Organic Composition + Environmental Drift Pass (2026-05-21)

Architecture finding: After editorial asymmetry broke grid uniformity in Session 89, the remaining issue was mechanical alignment — all books within a shelf still sat at exactly the same vertical position. Real shelves settle organically. This pass introduced deterministic drift without randomness or visible system.

**Changes:**
- `Library.jsx`: Added `bookDrift()` — djb2-variant hash of `book.id` → stable ±3px vertical offset. Applied to set-aside cards (presence-damped: deep=25%, inhabited=55%, default=100%; + cooling settling: 90+d → +2px, 45-89d → +1px), finished cards (pure hash drift), archive cards (hash +1 base settling). Multi-book reading-now primary card: `translateY(-2px)` when `deep` (most inhabited book lifts forward). Reading-now zone: inline `background` deepens to 26% gold-bg when primary book is `deep` (vs CSS default 20%).
- `index.css`: `.surface-inhabited-deep` shadow deepened — `0 5px 28px rgba(.15)` → `0 6px 32px rgba(.18)`, `0 1px 6px rgba(.09)` → `0 2px 8px rgba(.10)`. Inhabited books feel heavier on the shelf.

**Key invariant:** Drift is deterministic (hash-based), not random — same book drifts same amount regardless of sort order. Inhabited books anchor (damped drift), dormant books settle lower (positive bias). Not decorative — emotionally motivated by presence and temporal state.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 89 — Editorial Composition + Spatial Asymmetry Pass (2026-05-21)

Architecture finding: After dissolving surfaces and deepening atmospheric materiality across Sessions 87–88, the remaining weakness was compositional uniformity — all shelves rendered as consistent multi-column grids regardless of a book's presence, temporal state, or emotional weight. Set-aside, finished, and archive sections used 3-column layouts indistinguishable from each other at large breakpoints. Notes transitioned from archival strata to current-era without any compositional acknowledgment. Singularity chapters had leading silence but no trailing silence. This pass introduced asymmetry that is earned, editorial, and emotionally motivated.

**Changes:**
- `Library.jsx`: Reading-now multi-book grid → conditional `sm:grid-cols-[3fr_2fr]` when primary book is `deep` (most inhabited book commands more horizontal space). Set-aside grid: `lg:grid-cols-3` removed → `sm:grid-cols-2` max. Finished grid: `lg:grid-cols-3` removed → `sm:grid-cols-2` max. Archive: `gap-3` → `gap-2` (tightest, most receded).
- `index.css`: `.topo-gap-dormant` `2.75rem` → `3.25rem`. The gap between set-aside and finished widens — two distinct dormant sections, not one dormant mass.
- `NotesTab.jsx`: Geological break — first active-era note after archival notes gets `marginTop: '2rem'`. Logic: `precedingIsArchival = i > 0 && visible[i-1].rereadEra < book.rereadCount` → `geologicalBreak = !isArchival && precedingIsArchival`. No label, no divider — only breath.
- `ProgressTab.jsx`: Singularity post-silence — `{ marginTop: 10 }` → `{ marginTop: 10, marginBottom: 8 }`. Silence surrounds exceptional territory both before and after.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 88 — Material Atmosphere + Environmental Continuity Pass (2026-05-21)

Architecture finding: After borders dissolved and chrome quieted in Session 87, residual digitally-rendered qualities remained. The page-entry animation had a `translateY(6px)` shift giving navigation a "new screen" feeling. The sticky bar had a hard bottom border line that interrupted continuity. Mathematical spacing uniformity — identical gaps between notes, identical chapter padding, fixed active-zone gap — reduced editorial rhythm. This pass removed those tells.

**Changes:**
- `index.css`: `viewIn` keyframe — `translateY(6px)` removed → pure opacity crossfade. `.view-enter` 0.22s → 0.38s ease. `.sticky-bar` border-bottom removed → `box-shadow: 0 1px 0 rgba(.04), 0 4px 8px rgba(250,246,238,.6)` — bar dissolves into page below. `.topo-gap-active` 5rem → 5.5rem. `.shelf-title` margin-bottom 1.25rem → 1.5rem. `.reading-now-zone .shelf-title` margin-bottom 1.4rem → 2rem. Tab transitions .18s → .25s.
- `Library.jsx`: Main padding `py-8 pb-20` → `pt-10 pb-24`. Reading-now multi-book grid `gap-5` → `gap-6`. Finished grid `gap-4` → `gap-3`.
- `BookDashboard.jsx`: Content `pt-7 pb-20` → `pt-9 pb-24`.
- `CompanionHeader.jsx`: Bottom separator → `rgba(28,20,16,.04)`.
- `NotesTab.jsx`: Search border → `rgba(28,20,16,.06)` inline (matches library). Placeholder → ink-300. Presence text `mb-4` → `mb-6`. Filter row `mb-5` → `mb-7`. Note list `space-y-3` → `space-y-4`. Archival notes `p-4` → `p-5` (geological weight expressed through space).
- `MysteriesTab.jsx`: Filter row `mb-5` → `mb-7`. Mystery list `space-y-2` → `space-y-3`.
- `ProgressTab.jsx`: Chapter→visits `mb-12` → `mb-16`. Completed chapters `py-2.5` → `py-2` (settled). Important/singularity unchanged at `py-3.5`. Contrast: completed=8px, active=10px, weighted=14px.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 87 — Materiality Pass (2026-05-21)

Architecture finding: After Milestones 8 and 9 introduced environmental systems, the interface still carried "software" surface energy — crisp borders, strong blur, defined input edges, visible note card borders. This pass dissolved those tells without adding any new feature or system. Nothing visible was added; what was removed created space.

**Changes:**
- `index.css`: `.note-card` → `border: none` (shadow-only containment). `.atmospheric-card` border alpha `.030` → `.018`. `.session-row` divider → `rgba(28,20,16,.04)`. Sticky bar blur `10px` → `6px`. Sticky bar borders → `rgba(28,20,16,.04)`. Grain overlay `0.022` → `0.028`. Ambient gradient upper-left `.11` → `.14`, lower-right `.042` → `.055`. `.filter-link` → `ink-300` (ghost until engaged). Dark mode: note-card `border: none`, atmospheric-card border alpha `.06` → `.04`.
- `Library.jsx`: Search bar border → `rgba(28,20,16,.06)` inline. Icon + placeholder → ink-300. Filter dots → ink-100. Archive grid `gap-4` → `gap-3`.
- `BookCard.jsx`: Author color gradient — `daysSince > 90` → ink-200 · `> 45` → ink-300 · default → ink-500. Cover shadow dims at 90+ days (`opacity: 0.70`). Verified: Artemis (1d)=ink-500 · Sapiens (50d)=ink-300 · Duma Key (91d)=ink-200 ✓
- `NotesTab.jsx`: All footer chrome (date, reflect, edit, remove) → 10px ink-300. "Edit" → "edit".
- `ProgressTab.jsx`: Session aging four tiers — `> 90d` → 0.28 · `> 60d` → 0.42 · `> 30d` → 0.65 · recent → 1.0. Font size shrinks for deep-aged entries. Singularity chapters → `marginTop: 10px` before them in chapter list.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

### Session 86 — Track B Milestone 9: Spatial Memory (2026-05-21)

Architecture finding: The library applied equal visual weight to all books regardless of when they were last read. A 91-day abandoned book looked the same as one read this morning. This pass made the difference felt through graduated environmental states — cooling, silencing, geological note layering — with no visible system, label, or metric.

**Changes:**
- `index.css`: `.card-dissolved` — `border: none !important` for deeply inhabited cards. `.shelf-cooling` — 45–89 days: opacity 0.70, saturate(0.72), restores on hover. `.shelf-silenced` — 90+ days: opacity 0.38, saturate(0.42), stirs back on hover. `.note-archival` — parchment background `#F5EFE4`. Dark mode variants for all.
- `Library.jsx`: `daysOld > 90 → shelf-silenced`, `daysOld > 45 → shelf-cooling`. Residue padding: deep books `paddingBottom: 10px`, inhabited `5px`. `card-dissolved` applied to inhabited set-aside/finished cards. Section label graduation: "reading now" 0.80 → "set aside" 0.52 → "finished" 0.42 → "archive" 0.32.
- `BookCard.jsx`: `presence === 'deep'` in non-hero cards → title 16px (vs 15px).
- `NotesTab.jsx`: `isArchival = note.rereadEra < book.rereadCount`. Parchment surface, `leading-loose`, "· earlier reading" footer marker (9px italic ink-300).
- `MysteriesTab.jsx`: `bookDaysSince` from `book.lastUpdated`. `isEnvironmentallyQuiet = dormant || bookDaysSince > 90`. Haunted mysteries → 0.60; others → 0.40 + saturate(0.50). Cooling (45–90d) → 0.78. Artemis (3d) unaffected ✓

**Demonstrated:** Duma Key library card → 0.38 opacity ghostlike ✓ · Sapiens → 0.70 ✓ · Ocean Nov 2025 notes in parchment / May 2026 in clean white ✓

---

### Session 85 — Track B Milestone 8: The Lived-In Library (2026-05-21)

Architecture finding: A library that displays all books with equal visual weight has no emotional topography. Annotation density, temporal recency, and reading intensity should reshape the surface itself — not add information, but reconfigure presence.

**Changes:**
- `Library.jsx`: `bookPresence()` bug fix (was reading `book.readingSessions` instead of `book.readingLog` — sessions never contributed to scores). Min threshold: `notes + mysteries < 4 → ''`. Reread bonus `+0.14`. Primary book asymmetry (most recent → `isPrimary`, larger cover/title). ✦ glyph before "reading now". Filter vocabulary: "Paused" → "set aside".
- `BookCard.jsx`: Date color temporal receding (>60d → ink-200, >14d → ink-300, recent → ink-400). Status dot cooling for dormant paused books. `primary` prop (72×106px cover, 18px title). Inhabited cover shadows.
- `index.css`: `reading-now-zone` gold-bg warmth 12% → 20%; `surface-inhabited` / `surface-inhabited-deep` warm tint classes. `topo-gap-active` 4.5rem → 5rem. Singularity ring opacity 0.55 → 0.75.
- `ProgressTab.jsx`: Chapter list `space-y-2 mb-12`. Important/singularity chapters `py-3.5`.

**Presence scores (residency corpus):** Artemis → deep · Sapiens → deep · Ocean → deep · UTWB → deep · Duma Key → inhabited · Wild Dark Shore → '' (below threshold) ✓

---

## 2 — ACTIVE SYSTEMS

### Environmental Presence (`bookPresence()` in `Library.jsx`)
**Purpose:** Score annotation density → return `'deep' | 'inhabited' | ''`. Applied to library card wrappers — not a label, not a metric, a surface quality.
**Logic:** `notes × 0.045 + open_mysteries × 0.09 + sessions × 0.02`. Reread bonus `+0.14`. Minimum threshold: `notes + mysteries < 4 → ''`.
**Thresholds:** `≥ 0.50 → 'deep'` · `≥ 0.20 → 'inhabited'` · below → `''`
**Key files:** `Library.jsx`, `BookCard.jsx`
**Critical:** `bookPresence()` reads `book.readingLog` (NOT `book.readingSessions` — doesn't exist). Bug was fixed in Session 85; do not revert.

---

### Companion Orchestration (`PresenceStrip`)
**Purpose:** A single ambient observation strip above the tab bar. Full orchestration pipeline runs in the strip — the companion is environmental, not conversational.
**Pipeline:** `generatePresence()` → `arbitrateCandidates()` → `computeObservationCap()` → PresenceStrip rotation (14s interval)
**Cap logic:** `effectiveV < 0.45 → 1 obs · < 0.75 → 2 obs · ≥ 0.75 → 3 obs`. Cap 3 is earned by high annotation density. Gravity pressure from open mysteries further reduces effective visibility.
**Atmosphere mode:** `shouldEnterAtmosphereMode()` — fires at interruption risk 0.55 (not 0.65). Dense recent annotation (≥3 theory/confusing/theme in 24h) triggers silence. Companion yields before the reader feels crowded.
**Key files:** `src/components/dashboard/PresenceStrip.jsx`, `src/utils/companionPresence.js`, `src/utils/signalHierarchy.js`, `src/utils/invisiblePresence.js`
**Debug:** `localStorage.setItem('lantern_debug_companion','1')` → `CompanionDebugPanel` via React portal
**Critical:** `book.reflectionCache` must NOT be in PresenceStrip's `useEffect` dependency array. Adding it causes save→trigger→save loop. This is intentional, not a bug.

---

### Signal Hierarchy & Arbitration (`signalHierarchy.js`)
**Purpose:** Rank all eligible companion observations, suppress lower signals when higher ones dominate, surface only the most meaningful.
**Key weights:** `reader_silence: 9` · `destabilization: 8` · `expressive_silence: 5.5` · `mystery: 5` · `momentum: 4` · `session_rhythm: 2` · `pacing: 2` · `duration: 0` (removed intentionally)
**Suppression:** `destabilization` blocks 7 domains. `mystery` suppresses `narrative`. `reader_cadence` blocks `character` and `narrative`.
**`duration` weight is 0 by design** — "You've been living with this story for X weeks" was always performative. Do not restore it.
**Key file:** `src/utils/signalHierarchy.js`

---

### Literary Patina (`literaryPatina.js`)
**Purpose:** Visual accumulation in chapter rows — heavily annotated chapters develop a subtle left-inset gold shadow. Felt, not read.
**Logic:** `computeChapterPatina()` scores from note density, resonance, open mysteries, revised notes, emotional peaks. `chapterPatinaStyle()` returns `boxShadow: 'inset 3px 0 0 rgba(184,134,11,alpha)'`. Alpha: 0.14 / 0.22 / 0.30 / 0.38 by score threshold.
**Gravity amplification:** `amplifyPatina(patina, gravity)` — singularity-chapter patina resists cooling.
**Key files:** `src/utils/literaryPatina.js`, `src/tabs/ProgressTab.jsx`

---

### Emotional Gravity (`emotionalGravity.js`)
**Purpose:** Chapters that were emotionally significant bend the surrounding environment more than others. Singularities are rare, earned, and never labeled.
**Singularity detection:** `detectSingularities()` → chapters with gravity ≥ 0.45 AND ≥ 1.7× book average. At most 3 per book. Rare by design.
**Gravity sources:** resonance density (+0.05×, cap 0.35), theory revision (+0.12), open mysteries (+0.10), ancient mysteries (+0.10), silence aftermath (+0.14), motif origin (+0.07), starred (+0.08), deep notes (+0.06).
**UI expression:** singularity chapters → ring opacity 0.75 (vs 0.55) + `marginTop: 10px` breathing space + warm gold forward-pull text color
**Key file:** `src/utils/emotionalGravity.js`

---

### Atmospheric Cooling (Library shelf states)
**Purpose:** Books abandoned for weeks or months recede visually — the library itself expresses the passage of time without any label or metric.
**Tiers (applied to `.atmospheric-card` wrappers in Library.jsx):**
- `shelf-cooling`: 45–89 days since last updated → opacity 0.70, saturate(0.72). Hover restores.
- `shelf-silenced`: 90+ days → opacity 0.38, saturate(0.42). Hover stirs back to 0.70.
- Author color gradient in `BookCard.jsx`: `> 90d → ink-200` · `> 45d → ink-300` · default → ink-500
- Mystery inheritance: `bookDaysSince > 90` makes mysteries in that book recede (0.40–0.60 opacity) — the book's temporal state propagates into its tabs
**Key files:** `src/index.css` (.shelf-cooling, .shelf-silenced), `Library.jsx`, `BookCard.jsx`, `MysteriesTab.jsx`

---

### Temporal Session Aging (ProgressTab)
**Purpose:** Older reading sessions visually settle — recent sessions press forward, months-old sessions recede into geological depth.
**Four tiers (applied to `.session-row` divs):**
- `> 90 days`: opacity 0.28, date 10px ink-200, text 11px ink-300
- `> 60 days`: opacity 0.42, date 10px ink-200, text 11px ink-300
- `> 30 days`: opacity 0.65, date 11px ink-300, text 12px ink-400
- recent: opacity 1.0, date 11px ink-400, text 12px ink-700
**Key file:** `src/tabs/ProgressTab.jsx`
**Critical:** `logDates()` from `utils/date.js` is the canonical normalizer for `readingLog` entries. Never operate on raw log objects directly — `new Date(objectInstance)` returns Invalid Date.

---

### Archaeological Note Strata (NotesTab)
**Purpose:** Notes from a previous reading era occupy a distinct visual stratum — settled parchment vs. active clean white. The geological difference is felt without a divider.
**Detection:** `isArchival = note.rereadEra !== undefined && note.rereadEra < (book.rereadCount || 0)`
**Surface:** `.note-archival` class + `background: var(--color-card-archival, #F5EFE4)`. `leading-loose` body text. "· earlier reading" footer marker (9px italic ink-300).
**Key file:** `src/tabs/NotesTab.jsx`
**Schema:** `note.rereadEra` (number) — the reading era the note belongs to. `book.rereadCount` (number) — completed rereads. Both backwards-compatible (absent = first reading, era 0).

---

### Residue Memory (`residueMemory.js`)
**Purpose:** The companion should sound like it remembers the same book the reader remembers — naming specific words, quoting actual text, recognizing emotional weather.
**Three detectors:** `detectMotifs()` — recurring concrete words (5–14 chars, 3+ notes, ≥3 occurrences). `detectAtmosphericSignature()` — dominant emotional weather from six cluster word lists (cold/dread/warmth/grief/strange/tension). `extractQuoteFragment()` — verbatim prose from quote-tagged notes.
**Key file:** `src/utils/residueMemory.js`

---

### Reader-State Detection (`readerState.js`)
**Purpose:** The companion notices how the reader changes across the reading journey — confidence, fixation, cadence shifts, silence after intensity.
**Five detectors:** `detectConfidenceDrift()` · `detectFixations()` · `detectNoteLengthTrajectory()` · `detectBurstCadence()` · `detectSilenceGap()`
**Key file:** `src/utils/readerState.js`

---

### Topographic Library Rhythm
**Purpose:** The library is a landscape with altitude — reading-now pulls hardest, archive contracts.
**Spacing classes (applied to `<section>` elements, not wrappers):** `.topo-gap-active` (5rem margin-bottom) · `.topo-gap-dormant` (2.75rem) · `.topo-gap-archive` (1.5rem)
**Section label opacity graduation:** "reading now" 0.80 → "set aside" 0.52 → "finished" 0.42 → "archive" 0.32
**Reading-now zone:** `.reading-now-zone` applies subtle gold-bg warmth (20%). The most atmospherically present region of the library.
**Key files:** `src/index.css`, `src/components/library/Library.jsx`

---

### Surface Dissolution
**Purpose:** The interface doesn't announce its structure through borders and containers — it implies it through shadow, warmth, and weight.
**Current state:**
- `.note-card`: `border: none` · shadow 0 1px 3px rgba(.04)
- `.atmospheric-card`: `border: 1px solid rgba(28,20,16,.018)` · shadow-led containment
- `.reading-hero-card`: `border: none` · pure shadow
- `.card-dissolved`: `border: none !important` — deeply inhabited cards use no border at all
- Sticky bars: `blur(6px)` · border `rgba(28,20,16,.04)`
- Grain: `opacity: 0.028` · `mix-blend-mode: multiply`
- Ambient gradient: warm upper-left editorial light + gold lower-right companion warmth
**Critical:** `.note-card` border is `border: none`, NOT `border-ink-*`. `.topo-gap-*` are `margin-bottom` only on `<section>` elements. `--color-card-base` is `#FDFAF5` (warm cream) not white — hardcoded `bg-white` in components creates visible contrast jumps.

---

### Expressive Silence Detection (`classifySilence`)
**Purpose:** Silence is not absence — it has type. The companion recognizes six silence shapes and speaks to them differently.
**Six types:** `dormant` (≥30d gap) · `grieving` (destabilization in recent 5ch) · `exhausted` (5+ notes then quiet) · `post-climax` (3+ notes in prior chapter then quiet) · `unresolved` (2+ mysteries + 2+ theories) · `peaceful` (default gap ≥3d). Returns null if gap <3d.
**Signal weight:** `expressive_silence: 5.5` — above generic momentum, below reader_silence
**Key file:** `src/utils/emotionalGravity.js` (classifySilence export)

---

### Haunt Scoring & Memory Hierarchy
**Purpose:** Some signals fade; others intensify over time and infect multiple surfaces. The companion knows what the reading experience refuses to let go of.
**Haunt score sources:** age, resonance density, open status, mystery type, revision history, keyword overlap across notes
**Propagation:** High-haunt mysteries surface in companion arc; high-haunt notes resist opacity fading (`noteGravityPersistence` multiplier 1.0–1.25)
**Key files:** `src/utils/emotionalGravity.js`, `src/utils/literaryPatina.js`, `src/utils/residueMemory.js`

---

### Dark Mode
**Implementation:** `html.dark` CSS class ONLY. Never `dark:` Tailwind prefix — it doesn't work with this setup.
**Palette:** Deep teal-black (`#0A1A1E` page · `#090F14` companion · `#D8CCBA` text). Accent frozen to `#C4A058`.
**Mood system:** All `[data-mood="*"]` selectors frozen to gold. `book.mood` field preserved for backward compat only. Dynamic color shifts are retired.

---

### Residency Corpus (10 books)
5 original books + 5 archetype books for pressure-testing under real literary variety. Access: Settings → Reset to demo data (or clear `shadowscribe_books`).
- **Artemis** (Weir) — systematic annotator, 5 mysteries, analytical register
- **Ocean at End of Lane** (Gaiman) — rereader, `rereadCount: 1`, era 0/1 note strata
- **The MANIAC** (Labatut) — dense philosophical annotator
- **Under the Whispering Door** (Klune) — ensemble reader
- **Mother Night** (Vonnegut) — long-form reader
- **Wild Dark Shore** (McConaghy) — sparse annotator (below presence threshold)
- **Duma Key** (King) — abandoned 91 days, shelf-silenced, all mysteries cooling
- **Sapiens** (Harari) — burst-gap-burst nonfiction, 50 days cooling
- **Republic of Thieves** (Lynch) — finished, inhabited presence maintained in dormancy
- **Starter Villain** (Scalzi) — finished, minimal annotation

---

## 3 — ARCHITECTURAL INVARIANTS

*These are constitutional law for Lantern. They do not change under feature requests, aesthetic passes, or AI collaboration pressure.*

### Lantern must NEVER become:

**A productivity app.** No streaks. No session targets. No reading goals. No "books read this year." No optimization language. No "get back on track" prompts. No habit framing.

**A gamified system.** No points. No achievements. No badges. No completion rewards. No progress celebrations beyond the quiet `✦` archival glyph. No level-up language. No "you're 80% done!" energy.

**A dashboard.** No analytics panels. No reading stats displays. No visible scoring. No heatmaps. No metric readouts. The numbers that exist (chapter count, percentage) are minimal, present for function, and carry no emotional emphasis.

**An AI assistant.** The companion does not chat. It does not respond to questions. It does not offer recommendations. It does not say "Great job!" or "You should try..." It observes. It notices. It waits. It speaks rarely and with specific evidence.

**A social platform.** No sharing. No comparison. No public reading. No "what your friends are reading." No ratings.

**A noisy environment.** Silence is not a failure state. The companion preferring quiet over speaking is correct behavior. An empty PresenceStrip means the companion found nothing worth saying. This is good.

**A feature accumulator.** Systems compound — they don't stack. Every new addition must deepen an existing dimension, not introduce a new surface.

### Lantern must always be:

**Atmospheric first.** The environment is the experience. Every element — spacing, opacity, color temperature, border absence, grain texture, ambient gradient — contributes to the felt quality of being in a literary space.

**Silent by default.** Systems should express themselves through felt absence and subtle environmental change, not through visible states, labels, or indicators.

**Asymmetric.** Not all books feel the same. Not all moments feel the same. Annotation density, temporal distance, reading intensity, and rereading history should produce genuinely different environmental textures — without any UI element announcing the difference.

**Literary in register.** Every word, every label, every action name should feel like it belongs in a book or a reading journal, not a SaaS product. "leave a mark" not "Add Note". "reflect" not "Add Reflection". "earlier reading" not "Era 0". "a visit" not "session recorded".

**Restrained in companion voice.** One observation is usually better than three. The gap observation (actual structural absence) is more valuable than ambient duration framing ("you've been with this for weeks"). Evidence-heavy lines beat ambient ones. The companion has nothing to prove.

**Continuous, not episodic.** Tab switches, navigation, and state changes should feel like consulting a different layer of the same document, not moving between screens.

---

## 4 — KNOWN FRAGILE SYSTEMS

These systems are easy to accidentally flatten. Each has been calibrated carefully. Careless editing resets months of refinement.

---

### Companion Scarcity
**Why it matters:** The companion's value comes from rarity. If it speaks often or predictably, it becomes noise.
**What breaks it:** Lowering `shouldEnterAtmosphereMode()` interruption threshold back above 0.55. Restoring the `duration` observation (weight: 0 by design). Raising the observation cap unconditionally. Adding new lenses without adding corresponding suppression rules.
**What NOT to do:** Never restore "You've been living with this story for X weeks" — it was removed for being performative, not accidental. Never set cap to a fixed number — it's dynamic based on `effectiveV` after gravity pressure.

---

### Opacity Cooling (Shelf States)
**Why it matters:** Duma Key at 0.38 opacity is the single most powerful spatial memory demonstration. Without text or numbers, the reader feels 91 days of absence.
**What breaks it:** Applying `shelf-silenced` to active books. Removing hover restoration. Setting the opacity threshold below 90 days (would silence too many books). Adding a visible label or indicator alongside the opacity state.
**What NOT to do:** Never add a "this book has been paused for X days" label. The environmental cooling IS the communication. Never suppress hover restoration — the book stirring back when looked at is emotionally important.

---

### Atmospheric Silence (Companion)
**Why it matters:** The companion being quiet in complex moments is a feature, not a bug. `shouldEnterAtmosphereMode()` exists to enforce this.
**What breaks it:** Removing atmosphere mode. Setting the `effectiveV` cap-3 threshold lower (makes cap 3 too easy). Adding a "the companion is quiet right now" UI state (announcements the silence destroys it).
**What NOT to do:** Never make the companion explain why it's quiet. Silence doesn't annotate itself.

---

### Geological Note Strata
**Why it matters:** The parchment surface for era 0 notes and white surface for era 1 notes creates a visual stratigraphy. The difference between reading eras is felt without any label.
**What breaks it:** Applying `.note-archival` to active-era notes. Removing the era check (`note.rereadEra < book.rereadCount`). Changing the parchment color to anything too warm or too different (it should be a subtle departure, not a contrasting panel). Adding a heading "Earlier reading" above archival notes.
**What NOT to do:** Never put a divider or section label between reading eras. The geological shift should be textural, not announced.

---

### Topographic Library Rhythm
**Why it matters:** The library is a landscape. Reading-now breathes; archive contracts. Equal spacing would make the library a grid again.
**What breaks it:** Replacing `topo-gap-*` classes with `space-y-*` utility. Converting section gaps from `margin-bottom` on `<section>` to a wrapper class. Flattening section label opacity graduation.
**What NOT to do:** Never set all library sections to the same spacing. Never make section labels equally opaque — their visual hierarchy encodes the emotional temperature of each zone.

---

### Surface Softness (Borders and Edges)
**Why it matters:** The interface stopped announcing its structure through borders. Shadow, warmth, and weight define containment now.
**What breaks it:** Re-adding `border border-ink-200` to note cards. Restoring sticky bar blur to 10px+. Setting `.atmospheric-card` border to a visible alpha (above .030). Restoring the search bar's `border-ink-200` class.
**What NOT to do:** Never use `border-ink-200` on note cards. `--color-card-base` is `#FDFAF5`, not white — hardcoded `bg-white` creates visible contrast jumps.

---

### Emotional Asymmetry (bookPresence)
**Why it matters:** The minimum annotation threshold (`notes + mysteries < 4 → ''`) prevents sparse books from falsely registering as inhabited. Wild Dark Shore correctly returns `''` even though it has sessions.
**What breaks it:** Removing the minimum threshold. Letting sessions alone inflate the score. Setting presence thresholds so low that most books return `'deep'`. Using `book.readingSessions` instead of `book.readingLog` (the former doesn't exist).
**What NOT to do:** Never display the presence score as a visible number, label, or badge. Never apply presence warmth to the archive section.

---

### Signal Suppression (Arbitration)
**Why it matters:** When destabilization is present, everything else yields. Mystery suppresses narrative. The companion doesn't speak about ambient patterns when the reader's prior understanding has just collapsed.
**What breaks it:** Weakening the SUPPRESSES map. Reducing `destabilization` weight below `mystery` weight. Restoring the `duration` category (it was intentionally zeroed).
**What NOT to do:** Never add a new companion lens without checking whether it needs a suppression rule or domain assignment. High-weight signals earn their position by being specific and evidence-heavy.

---

### Typography Hierarchy
**Why it matters:** The serif/italic register signals presence and charge. The sans register signals ambient resting state. Mixing these deliberately encoded registers breaks the atmospheric voice.
**What breaks it:** Making section labels bold or title-case. Setting shelf titles to sans-serif. Making companion observations render in sans. Applying `font-weight: 600` to anything in the companion or section label vocabulary.
**What NOT to do:** `SectionHeading` is 12px normal-weight italic serif. Not 15px semibold. Not `font-bold`. Never title-case the section headings ("chapters" not "Chapters", "visits" not "Sessions").

---

### Temporal Session Aging
**Why it matters:** November 2025 sessions (195 days old) appearing at opacity 0.28 alongside May 2026 sessions at opacity 1.0 creates genuine geological depth in reading history.
**What breaks it:** Reducing to a single threshold (the 30-day tier alone). Using `book.readingSessions` instead of `book.readingLog`. Operating on raw log objects without `logDates()` normalization (produces `Invalid Date`).
**What NOT to do:** Never collapse the four tiers back to one. Never display the opacity state as a label ("older session"). The visible dimming IS the communication.

---

## 5 — ARCHIVAL SESSIONS

Compressed historical record. Preserve for pattern continuity but do not re-detail.

---

**Session 84 — Track B Milestone 7: Companion Residency (2026-05-21)**
Introduced 5 new archetype books to the residency corpus with precisely designed reading histories. New schema fields: `book.rereadCount`, `note.rereadEra`, `note.chapter`, `note.revisedAt`, `mystery.observation`. Tested: silence-gap detection (Duma Key 91d vs Sapiens 49d), burst-gap pattern recognition, haunt scoring under 5-mystery books, archival note strata, reread-era companion tone, sparse annotator threshold.

**Session 83 — Track B Milestone 6: The Inhabited Page (2026-05-21)**
Tab dissolution: opacity-only `tabIn` animation (no translateY). Tab labels no longer "arrive." Scroll-to-top on tab change removed — tabs consult a different layer, not a new page. Language overhaul: "Discussion" → "Wondering". Characters tab: "Main Characters" → "figures", "Secondary Characters" → "also present". Mystery tab: "Open a thread" → "raise a question →". Sage/green fully purged from Wondering tab. Cross-surface residue: oldest interpretive note echoes in Wondering space at 55% opacity.

**Session 82 — Track B Milestone 5: Literary Sediment (2026-05-21)**
Full vocabulary sweep: "sessions recorded" → "visits to the story". "Progress" tab → "Reading". "Add a thought" → "leave a mark". All SaaS/operational language replaced with literary equivalents. Critical `ReadingMomentum` bug fix: `logDates()` normalization for raw log objects (was producing Invalid Date → all rhythm phrases failed). Session aging introduced (30-day threshold, opacity 0.65, first temporal texture in reading history).

**Session 81 — Track B Milestone 4: The Book as Document (2026-05-21)**
`CompanionHeader` deconstruction: removed `StatusBadge`, `WeightedProgressBar`, zone label, chapter/percentage header, gold CTA pill. "Update position" → `update chapter` text link. Cover 64×96 → 50×75px. Header background fill removed — book detail is now part of the page surface. Last sage/green surface eliminated via gold-bg reextract state. Near-end companion echo (pct ≥ 85%): "The weight shifts toward the end."

**Session 80 — Track B: Surface Softening + Companion Residue (2026-05-21)**
Icons removed from all tabs. Active tab: Playfair italic gold underline. Inactive: 11px sans ink-400. New classes: `.filter-link` · `.companion-echo` · `.session-row`. Typography: `SectionHeading` 15px semibold → 12px normal italic ink-500. CompanionOrientation: two-tier (13px serif italic + 11px sans). Companion residue embedding: NotesTab cross-reference ("A thread from this chapter is still in motion"), MysteriesTab note-density echo ("N thoughts then"), chapter-duration echo ("N ch. open").

**Session 79 — Track B Overhaul: Environmental Companion (2026-05-21)**
Largest structural change. `CompanionPanel` (sidebar) and `CompanionInsights` (mobile strip) removed from `BookDashboard`. `PresenceStrip` created: single strip above tab bar, full orchestration pipeline preserved. Mood color system retired — all `[data-mood="*"]` frozen to gold. Single-column layout. `✦` as sole completion mark everywhere. Sage fully eliminated from all surfaces. Progress tab redesigned: editorial percentage, `h-px` architectural spine, transparent chapter backgrounds.

**Session 78 — Companion Wisdom Deepening Pass (2026-05-20)**
Orchestration tightening. Suppression expanded: `destabilization` blocks 7 domains. Mystery suppresses narrative. `duration` weight → 0 (removed intentionally). Cap-3 bar raised to effectiveV ≥ 0.75. Cross-system gravity pressure: 4+ open mysteries → −0.08 effective visibility. Interruption threshold 0.65 → 0.55. Dense recent annotation (≥3 theory/confusing/theme in 24h) → atmosphere mode. Debug tooling: `generatePresenceDebug()` + `CompanionDebugPanel`.

**Session 77 — Emotional Topography Pass (2026-05-20)**
Card dissolution: `--color-card-base` `#FFFFFF` → `#FDFAF5`. `.atmospheric-card` border alpha `.065` → `.030`. `.reading-hero-card` borderless. New `.note-card` class (both NotesTab and MysteriesTab). Topographic rhythm: `topo-gap-active/dormant/archive` replace `space-y-14`. Deep-annotated solo books expand to `max-w-md`. Companion language compression: fragments and elliptical cadence introduced across 8 lenses.

**Session 76 — Environmental Participation Pass (2026-05-19)**
Ambient gradients differentiated by mode: light → asymmetric editorial window-light from upper-left; dark → faint gold warmth from companion column direction. New classes: `.reading-now-zone` (gold tint ~10%), `.surface-inhabited` / `.surface-inhabited-deep` (deeper shadows), `.shelf-dormant` (saturate 0.82), `.shelf-archive` (saturate 0.60). `bookPresence()` helper created (first version). `BookCard` accepts `presence` prop for inhabited cover shadows. BookDashboard: companion-direction atmosphere gradient as absolute-positioned background layer.

**Session 75 — Visual Overhaul Integration (2026-05-18)**
Scholar's Study II design system integrated. New token system in `index.css`: cream/ink scale, dark teal-black dark mode. Library: status-grouped sections, hero card treatment, shelf titles, filter text-links. Two-column book detail (desktop): companion in sticky right aside. `CompanionPanel.jsx` created: gold foil border, hover-alive, observations, open questions. Typography: Playfair Display serif + Inter sans established as canonical stack.

**Session 74 — Visual Identity Pass (2026-05-17)**
12 visual directions prototyped. Scholar's Study II selected. `DESIGN_SYSTEM.md`, `tokens.js`, `tokens.css` created. Typography: Playfair Display (serif) + Inter (sans) + JetBrains Mono (reserved for data). Dark mode: deep teal-black study surfaces.

**Session 73 — Emotional Gravity + Expressive Silence (2026-05-16)**
`emotionalGravity.js` created: 7 exports including `computeChapterGravity`, `detectSingularities`, `classifySilence` (6 silence types), `amplifyPatina`, `noteGravityPersistence`. `classifySilence` wired into `companionPresence.js` as `expressiveSilenceObs`. `expressiveSilenceObs` signal weight: 5.5. Singularity chapters in ProgressTab: warm gold forward-pull text color.

**Session 72 — Environmental Memory + Literary Patina (2026-05-15)**
`literaryPatina.js` created: `noteAgeOpacity`, `notePatinaBorder`, `computeChapterPatina`, `chapterPatinaStyle`, `computeReadingDepth`. Chapter rows in ProgressTab now carry `inset 3px 0 0 rgba(184,134,11,alpha)` left shadow by patina score. Note opacity fades gently with age; high-resonance notes resist.

**Session 71 — Residue Memory + Textural Continuity (2026-05-14)**
`residueMemory.js` extended: `extractQuoteFragment` (verbatim prose from quote notes), `detectMotifs` (recurring concrete words 3+ notes), `detectAtmosphericSignature` (six emotional weather clusters). Two new companion lenses: `motifCallbackObs` and `atmosphericMemoryObs`. Grounded pass: companion now names specific words, quotes actual text.

**Session 70 — Signal Hierarchy & Discernment (2026-05-13)**
`signalHierarchy.js` created: `SIGNAL_WEIGHTS`, `DOMAINS`, `SUPPRESSES`, `arbitrateCandidates()`, `shouldEnterAtmosphereMode()`. Observation cap reduced 8 → 3. Carousel intervals 7s → 12s. `generatePresence()` now passes through full arbitration before surfacing. The companion transitioned from "observant" to "discerning."

**Session 69 — Reader-State Evolution (2026-05-12)**
`readerState.js` created: 5 detectors (`detectConfidenceDrift`, `detectFixations`, `detectNoteLengthTrajectory`, `detectBurstCadence`, `detectSilenceGap`). Five new companion lenses wired after `dormantMysteryObs`. Emotional loading per chapter in ProgressTab (`detectEmotionalLoading`): forward-pull "Your writing intensified here."

**Session 68 — Meaning Transformation + Interpretive Mutation (2026-05-11)**
`transformScore.js` created: `detectCollapsedCertainty`, `detectMysteryRefinements`, `detectQuoteRecontextualization`, `detectChapterDestabilization`. Four new companion lenses: polarity reversal, collapsed certainty, mystery morphing, quote echo. MysteriesTab: "Originally: '[originalText]'" display when mystery was refined. CharactersTab: polarity-aware `charRelationalLine`.

**Session 67 — Memory Hierarchy + Selective Haunting (2026-05-10)**
Haunt scoring system introduced. High-haunt mysteries surface preferentially in companion arc. High-haunt notes resist opacity fading. `noteGravityPersistence` multiplier 1.0–1.25. Haunt concept: some signals fade; others intensify over time and infect multiple surfaces.

**Sessions 60–66 — Companion intelligence build-out (2026-05)**
Successive passes adding companion lenses: mystery haunting, dormant mystery detection, theory cross-bleed, character ownership, reading rhythm, silence gap, arc detection, note pattern analysis, interpretation tracking. `reflectionEngine.js` created for semantic resonance weights. `rereadEngine.js` for reread-era awareness. `invisiblePresence.js` for confidence thresholds and presence suppression.

**Sessions 49–59 — Foundation layer (2026-04/05)**
Product renamed Lantern (from Shadow Scribe). `shadowscribe_books` and `shadowscribe_settings` localStorage keys frozen. Core data model established: `book.chapters[]`, `book.readingLog[]`, `book.notes[]`, `book.mysteries[]`. Chapter completion model: `ch.completed` boolean + `ch.num` index + `ch.name` label. Settings: `insightStyle` (observational/analytical), dark mode via `html.dark` class only.

---

*End of handoff document.*
*For full technical depth: `ARCHITECTURE.md` · `AI_COMPANION_RULES.md` · `DESIGN_SYSTEM.md` · `PRODUCT_FOUNDATION.md` · `ROADMAP.md`*
