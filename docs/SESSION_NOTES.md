# Lantern — Session Notes
Reverse-chronological log of what was built, fixed, and decided in each working session.

---

## Session 119 — 2026-05-26
**Theme:** Post-Ship / Alpha Week 1 — Real Reader Calibration

Companion language sweep Pass 2 (now with eyes on the full codebase), calibration log created. No new features.

**COMPANION LANGUAGE SWEEP — PASS 2 (11 phrases fixed across 3 files)**

Audit principle: every repeated aphorism, performative ending, and overconfident assertion is a failure. The companion should notice, not perform.

`src/utils/reflectionEngine.js` (9 fixes):
- `theory-arc` character focus: "That kind of focus tends to find what it's looking for." → removed — generic pseudo-wisdom; third instance of same aphorism.
- `theory-arc` no-focus: "That attention tends to find what it's looking for." → removed.
- `theme-persistence`: "This story has found something in you." → removed — performative ending.
- `atmospheric-memory` tension: "This story has its hooks." → removed — same phrase already removed from `companionPresence.js` and `ReadingMomentum.jsx`.
- `atmospheric-memory` warmth: "Something in this book has found you." → removed.
- `temporal-evolution` late-favorites: "Something in the writing has found you." → "The language is landing differently."
- `generateFirstIntroReflection` theory pool: "That kind of reading tends to find what it's looking for." → "Something caught you immediately."
- `generateFirstIntroReflection` favorite pool: "The story found you quickly." → removed.
- Default first-note pool: "The companion will hold it alongside everything that follows." → "The reading has begun." — self-naming removed.

`src/utils/crossBookMemory.js` (2 fixes):
- `collector` style: "The particular word has always mattered to you." → "The particular word matters to you." — "always" was overconfident.
- `collapse-prone` pattern: "You've learned to hold interpretations more lightly." → removed — presumptuous assertion about what the reader has "learned."

`src/utils/companionPresence.js` (1 fix):
- Post-finish analytical arc: "a record of where the story found you." → "a record of where the story's weight fell." — cleaner, more specific.

`src/components/dashboard/ReadingMomentum.jsx` (1 fix):
- 7-day streak secondary text: "This story has its hooks in you." → `${streak} days straight.` — factual, clean.

**Total across all companion language passes (Sessions 115–119):** 24 observations revised or trimmed.

**Calibration log created:** `docs/CALIBRATION_LOG.md`
- Structure for recording real-reader signals, confusion points, silence successes, emotional reactions, abandonment patterns
- "What not to build" commitment list
- Companion phrases flagged for monitoring under real use
- Onboarding, trust, and silence signal frameworks

**Build:** clean ✓ (453ms, 84 modules) | **No schema changes** | **No new localStorage keys**

---

## Session 117–118 — 2026-05-26
**Theme:** Ship Mode / Pass E — Final Companion Calibration + Public Alpha Launch

Full Pass E: companion language sweep, silence architecture review, thread believability audit, edge-case QA, production verification, first-reader walkthrough. No new systems. No schema changes.

**PART 1 — COMPANION LANGUAGE SWEEP (10 observations fixed across 2 sessions)**

`src/utils/companionPresence.js` (8 fixes):
- `sessionStopObs`: removed "Some chapters ask to be sat with." — straining for profundity.
- `momentumObs` (streak ≥ 7): "This story has its hooks in you." → removed — clichéd metaphor.
- `quoteEchoObs`: "The capture found its meaning." → removed — too precious.
- `readerFixationObs`: "but the companion has" → removed — product self-naming breaks atmosphere.
- `orientSessionLine` (2-week bucket): "This story has become a companion." → factual date count — meta (the app is the companion).
- `deepEngagementObs`: "The companion has been accumulating layers." → "Layers are building." — product narrating its own cognition.
- `SILENCE_TEXT.exhausted[1]`: "Something asked to be sat with." → removed trailing clause.
- `SILENCE_TEXT.grieving[0]`: "and you've been sitting with it" → removed trailing clause.

`src/utils/crossBookMemory.js` (1 fix):
- Rereader: "always finds" → "finds things a first reading couldn't." — "always" was overconfident.

`src/utils/reflectionEngine.js` (1 fix):
- First-note `theme` pool: "You're reading on two levels at once." → "Something beneath the surface, noticed early." — congratulatory tone.

**PART 2 — SILENCE + FREQUENCY ARCHITECTURE (no changes — already well-calibrated)**

Audited `invisiblePresence.js`, `reflectionEngine.js` cooldowns. Architecture is solid:
- 8h `MIN_RESURFACE_MS`, 24h `LONG_RESURFACE_MS` for patience mode
- 0.35 `CONFIDENCE_THRESHOLD` — multi-axis scoring before any observation surfaces
- Observation cap: max 3 (only at v ≥ 0.75), standard 2; fading = 1 (arc only)
- `shouldYieldToBook()` at dominance ≥ 0.75 — narrative primacy enforced
- Self-sustaining narrative detection: absorbed reading → companion recedes

**PART 3 — THREAD BELIEVABILITY (no changes — already correct)**

Audited `calcNoteDelay` in `NotesTab.jsx`:
- Short notes: 800ms base; scales with words (up to +1100ms), questions (+320ms each), emotional register (+350ms), uncertainty (+450ms), theory/confusing tag (+500ms)
- ±220ms jitter; floor 700ms, ceiling 4800ms
- Thread responses (`generateNoteCompanionResponse`) are sparse and specific — no changes needed

**PART 4 — EDGE-CASE QA**

- Completed books: solitude protected at pct ≥ 99, arc line clean, "begin again / archive" only ✓
- Rereads: "2nd reading" badge, era-filtered session data, reread state threading correctly ✓
- Import deduplication: logic correct but message used `incoming.length` even when dupes skipped
  - Fixed `SettingsPage.jsx`: compute `newCount` / `dupCount` before calling `importLibrary()`; report "X already present — skipped" or "All companions were already in your library." accurately
- Dark mode: zero `dark:` Tailwind prefix violations anywhere ✓
- Mobile safe areas: `viewport-fit=cover`, `env(safe-area-inset-bottom)`, `.pb-safe` all wired ✓
- Zero console warnings or errors in production preview ✓
- All three frozen localStorage keys present: `shadowscribe_books`, `shadowscribe_settings`, `lantern_welcomed` ✓

**PART 5 — PRODUCTION DEPLOYMENT VERIFICATION**

- `_redirects`: `/* /index.html 200` — SPA routing on Netlify ✓
- dist: all public assets copied (favicon, icons, manifest, OG image, fonts) ✓
- `og:title`, `og:description`, `og:image`, Twitter cards all present ✓
- PWA: `manifest.json`, `icon-192.png`, `icon-512.png`, `apple-touch-icon`, `theme-color` ✓
- Plausible analytics: `VITE_PLAUSIBLE_DOMAIN` env var gate — no-ops without it ✓
- Feedback link: `VITE_FEEDBACK_URL` env var gate — hidden without it ✓
- Error logging: `logError` / `logWarn` — full stack in dev, message-only in prod ✓
- Meta description updated: "reading journey" removed; AI framing softened ✓

**PART 6 — FIRST-READER WALKTHROUGH**

WelcomeBanner: "Lantern sits alongside you as you read. Not a tracker. Not a to-do list." — clean, atmospheric, sets expectations without tutorials ✓
New Companion: EPUB copy updated (Pass C), 3-step flow clear, no SaaS energy ✓
Settings: export/import/reset copy all honest and specific ✓
Notes tab: note entry, thread delays, companion signals — all specific and unhurried ✓
No congratulatory tone, no tutorial energy, no SaaS language anywhere in first-reader path ✓

**Files changed:** `companionPresence.js`, `crossBookMemory.js`, `reflectionEngine.js`, `index.html`, `SettingsPage.jsx`
**Build:** clean ✓ (380ms, 84 modules) | **No schema changes** | **No new localStorage keys**

---

## Session 116 — 2026-05-26
**Theme:** Ship Mode / Pass D — Persistence + Trust Hardening

Storage safety, export/import reliability, cloud-sync groundwork. No new product systems.

**PART 1 — SURFACE QUOTA FAILURES**

`src/utils/storage.js`:
- `saveBooks()` now returns `{ ok: true }` on success, `{ ok: false, quota: true }` on QuotaExceededError. Callers can react instead of silently losing data.
- Added `checkStorageHealth()` — inspects localStorage once on app start without loading. Returns `'empty'` (first use), `'ok'` (data loads fine), or `'corrupted'` (data present but unparseable). Distinguishes corruption from first use.
- Aligned `STORAGE_WARN_BYTES` from 80% → 70% to match the Settings UI indicator threshold.

`src/context/BooksContext.jsx`:
- Save effect now captures `saveBooks()` return value; sets `storageWarning = true` on quota failure.
- `storageHealth` initialized once on mount via `checkStorageHealth()`.
- `clearStorageWarning()` callback exposed via context.
- Context now exposes: `storageWarning`, `clearStorageWarning`, `storageHealth`.

`src/App.jsx`:
- Added `StorageBanner` component — renders a quiet, dismissible alert below the TopNav when:
  - `storageWarning` is true (writes are failing — "Storage is full…")
  - `storageHealth === 'corrupted'` (data was present but unreadable — "Your reading data could not be loaded…")
- Banner links directly to Settings (Export section). Corruption banner has per-session dismiss state. Quota banner clears on export or manual dismiss.

**PART 2 — EXPORT CONFIDENCE**

`src/pages/SettingsPage.jsx`:
- Export button shows "✓ Exported" for 3 seconds after download is triggered (mirrors "✓ Imported" on import). Uses gold styling.
- Export records `lastExportedAt` ISO timestamp in settings (cloud-sync groundwork).
- Export calls `clearStorageWarning()` — dismisses quota banner when user acts on it.

**PART 3 — COPY + TRUST**

`src/pages/SettingsPage.jsx`:
- Import description: "Add companions from a previous export. Duplicates are skipped." → "Restore companions from a previous export. Books already in your library are not re-imported." (clearer about what "duplicate" means)
- Reset confirmation button: `{confirmReset ? 'Reset' : 'Reset'}` → `{confirmReset ? 'Yes, reset' : 'Reset'}` (confirms the action unambiguously)

**PART 4 — CLOUD-SYNC GROUNDWORK**

`src/context/SettingsContext.jsx`:
- Added `deviceId: null` to `SETTINGS_DEFAULTS`. Generated once in `loadSettings()` as `dev_{timestamp}_{random}` on first run. Persisted automatically with other settings. Never shown to users. Never sent anywhere. Provides a stable device identity for a future sync layer.
- Added `lastExportedAt: null` to `SETTINGS_DEFAULTS`. Updated on every export. Enables future "nudge to back up" logic without tracking user behavior remotely.

**Files changed:** `storage.js`, `BooksContext.jsx`, `SettingsContext.jsx`, `App.jsx`, `SettingsPage.jsx`
**Build:** clean ✓ (387ms, 84 modules) | **No new localStorage keys** | `deviceId`/`lastExportedAt` added to settings shape (optional, backward-compatible)

---

## Session 115 — 2026-05-26
**Theme:** Ship Mode / Pass C — Public Alpha Onboarding + Launch Surface

Targeted copy and accuracy fixes from first-run audit. No new systems. No new schema fields.

**PART 1 — BUG FIX: `hasAiKey` ReferenceError in EpubImportReview**

`src/components/library/EpubImportReview.jsx`:
- `hasAiKey` was declared inside `handleCreate` (local scope) but referenced in the render JSX — a `ReferenceError` whenever an EPUB with chapter content was imported without a key and step 3 rendered.
- Fixed: moved `const hasAiKey = !!settings.anthropicKey?.trim()` to component-level (line ~218). Removed the duplicate local declaration inside `handleCreate`.

**PART 2 — COPY ACCURACY: "cannot read" → accurate framing**

`EpubImportReview.jsx` — step 3 key-missing notice:
- Before: "The companion cannot read this EPUB without an Anthropic key." — factually wrong (rule-based extraction still runs).
- After: "Without an Anthropic key, the companion will use basic pattern matching to read this EPUB — characters and themes may be less fully understood than with AI extraction."
- Button: "Add your key in Settings before importing →" → "Add an API key in Settings for deeper analysis →" (less alarming, more inviting).
- Label: "companion extraction unavailable" → "pattern matching only" (accurate: extraction does run, just not AI-powered).

**PART 3 — COPY CLARITY: EPUB affordance undersold**

`src/components/library/CreateCompanion.jsx`:
- Before: "Have an EPUB file? Import it to pre-fill title, author, and chapter structure." — "pre-fill" implies minor convenience.
- After: "Have an EPUB file? Import it to auto-detect chapters, characters, and themes." — reflects actual extraction capability.

**PART 4 — TRUST: Data persistence framing**

`src/components/library/Library.jsx` — WelcomeBanner (no-key path):
- Before: "stored locally, never shared" — grammatically scoped to just the API key.
- After: "your key and all your reading data are stored locally and never leave this device." — explicitly covers all data, not just the key.

**Files changed:** `EpubImportReview.jsx`, `CreateCompanion.jsx`, `Library.jsx`
**Build:** clean ✓ (360ms, 84 modules) | **No new schema fields** | **No new localStorage keys**

---

## Session 114 — 2026-05-26
**Theme:** Ship Mode / Pass B — Observability + Alpha Readiness

Analytics infrastructure, centralized logging, feedback link. No new product systems.

**PART 1 — LIGHTWEIGHT ANALYTICS**

`src/utils/analytics.js` (new):
- `initAnalytics()` — injects Plausible script when `VITE_PLAUSIBLE_DOMAIN` env var is set. Completely silent otherwise. Called once in `main.jsx` before mount.
- `track(event, props)` — fires a named Plausible event with optional flat properties. No-ops if Plausible isn't loaded. Wrapped in try/catch — never crashes the app.
- Events tracked across 6 files: `epub_imported`, `epub_failed`, `companion_created`, `first_session`, `first_note`, `first_mystery`, `book_completed`, `reread_started`, `api_key_saved`, `library_imported`, `library_import_failed`.

**Event wiring:**
- `CreateCompanion.jsx`: `epub_imported` (with chapter count), `epub_failed` (with reason), `companion_created` (with format)
- `NotesTab.jsx`: `first_note` (with tag + format) — fires on the first note per companion using the existing `isFirstNote` flag
- `MysteriesTab.jsx`: `first_mystery` (with format) — fires when `book.mysteries.length === 0`
- `ChapterUpdateModal.jsx`: `first_session` (with format) — fires when `currentLog.length === 0`
- `CompanionHeader.jsx`: `book_completed` (with format + rereadCount), `reread_started` (with rereadCount + format)
- `SettingsPage.jsx`: `api_key_saved` — fires when key goes from empty to non-empty; `library_imported` (with count), `library_import_failed` (with reason, truncated at 80 chars)

**Deployment:** Set `VITE_PLAUSIBLE_DOMAIN=your-domain.com` in your hosting env vars. Register the domain at plausible.io. No changes needed in code.

**PART 2 — ERROR VISIBILITY**

`src/utils/logger.js` (new):
- `logError(category, error, context)` — dev: full console.error with stack; prod: message only, prefixed with `[Lantern:Category]`. Future: swap prod path for Sentry/similar.
- `logWarn(category, message, context)` — dev-only console.warn.
- Wired into both error boundaries: `App.jsx` ErrorBoundary + `BookPage.jsx` BookErrorBoundary.

**PART 3 — ALPHA FEEDBACK**

`src/pages/SettingsPage.jsx`:
- Added "Share thoughts on this build →" link below the footer. Renders only when `VITE_FEEDBACK_URL` env var is set. Use any URL: Typeform, Notion form, GitHub Discussions, email. Quiet, editorial styling — matches the footer line.

**Files changed:** `analytics.js` (new), `logger.js` (new), `main.jsx`, `App.jsx`, `BookPage.jsx`, `CreateCompanion.jsx`, `NotesTab.jsx`, `MysteriesTab.jsx`, `ChapterUpdateModal.jsx`, `CompanionHeader.jsx`, `SettingsPage.jsx`
**Build:** clean ✓ (328ms, 84 modules) | **No new schema fields** | **No new localStorage keys**

---

## Session 113 — 2026-05-26
**Theme:** Ship Mode / Pass A — Deployment + QA

Production hardening: metadata, error isolation, dark mode. Only confirmed bugs fixed. No new systems.

**PART 1 — PRODUCTION DEPLOYMENT**

`index.html`:
- `apple-touch-icon` changed from `favicon.svg` → `icon-192.png`. iOS home screen icons do not render SVG — the PNG generated in Pass 6 is now wired correctly.
- `twitter:image` meta tag added. Twitter/X requires an explicit `<meta name="twitter:image">` tag separate from `og:image`.

**PART 2 — ERROR HARDENING**

`src/pages/BookPage.jsx`:
- Added `BookErrorBoundary` class component wrapping `BookDashboard`. When a render error occurs inside a companion view (e.g. a corrupted reflectionCache edge case that slips past sanitization), only the companion fails — the `TopNav`, library, and other companions remain fully functional. The fallback shows a quiet literary message: "This companion went quiet unexpectedly." with a reload option. The root error boundary in `App.jsx` remains as a last resort.
- Boundary resets automatically when navigating to a different book (`componentDidUpdate` on `bookId` prop).

**PART 7 — FINAL PRODUCTION SWEEP**

`src/tabs/DiscussionTab.jsx`:
- User question card background: `var(--color-cream-100, #F5EFE6)` → `var(--color-card-archival)`. `--color-cream-100` is not defined in the CSS token system. The hardcoded fallback (`#F5EFE6`, a light cream) fired in dark mode, rendering a pale card against the dark background. `--color-card-archival` has correct dark mode value (`#0C1820`).
- `book.notes.length >= 5` → `(book.notes || []).length >= 5` — defensive guard for nullability, though `sanitizeBook` already ensures notes is always an array.

**Files changed:** `index.html`, `BookPage.jsx`, `DiscussionTab.jsx`
**Build:** clean ✓ (398ms, 82 modules) | **No new schema fields** | **No new localStorage keys**

---

## Session 112 — 2026-05-26
**Theme:** Ship Mode / Pass 7 — Closed Alpha + Real Reader Validation

First-week experience audit and real friction sweep. Only real observed friction fixed. No new systems.

**PART 2 — INVISIBLE OBSERVATION LAYER**

`src/components/dashboard/BookDashboard.jsx`:
- Added `firstOpenedAt` tracking — a one-time ISO timestamp written to the book object the first time a companion is opened. Stored in book data (included in exports automatically), no new localStorage keys. Invisible to users. Enables future understanding of time-to-first-note, first-session lag, and abandonment without tracking.

**PART 5 — UX FRICTION SWEEP (real observed friction only)**

`src/components/dashboard/CompanionHeader.jsx`:
- Removed misleading "The companion cannot enter yet — Add your Anthropic key in Settings to continue" block. This was factually wrong: the companion's rule-based presence, orientation lines, and observation carousel all work without any API key. The key only enhances EPUB extraction and AI-generated reflections (≥5 notes threshold). The welcome banner already accurately explains the key situation. Removing this false gate removes anxiety for new users who haven't added a key.
- Single-companion export (`handleExport`): `URL.revokeObjectURL(url)` now deferred 100ms — consistent with the global export fix in Pass 6.

`src/components/dashboard/PresenceStrip.jsx`:
- Fixed fallback text when no observation surfaces: previously showed `book.title` when the user had an API key but no observations yet. Now always shows `"The companion is quiet."` regardless of key state. The key-dependent branch was a leftover — both states (key present, no obs / key absent) should feel the same when the companion has nothing to say.

**Files changed:** `BookDashboard.jsx`, `CompanionHeader.jsx`, `PresenceStrip.jsx`
**Build:** clean ✓ (378ms, 82 modules) | **No new schema fields** | **No new localStorage keys** | `firstOpenedAt` added to book data shape (optional, backward-compatible)

---

## Session 111 — 2026-05-24
**Theme:** Ship Mode / Pass 6 — Launch Candidate

Pre-launch hardening: deployment, data safety, visual consistency, PWA completeness. No new systems.

**PART 1 — DATA SURVIVABILITY**

`src/pages/SettingsPage.jsx` — export/import hardening:
- `handleExport`: `URL.revokeObjectURL(url)` deferred by 100ms so browser can initiate the download before the object URL is torn down.
- `handleImportFile`: added `reader.onerror` handler — "The file could not be read. Try again." Previously silent on FileReader failure. Also guarded `parseImport(ev.target.result ?? '')` against null result.
- Import success auto-dismiss extended from 5s → 6s.
- Export description copy: "Download all N companions as a backup file. Keep it somewhere safe." (was "as a JSON file" — more editorial, clearer purpose).

**PART 3 — DEPLOYMENT CONFIDENCE**

`public/manifest.json` — PWA icon completeness:
- Added `icon-192.png` (192×192) and `icon-512.png` (512×512) PNG entries. Previously only `favicon.svg` was listed — older Android Chrome and some desktop PWA installers require raster PNGs.
- Generated `icon-192.png` and `icon-512.png` via Python struct/zlib — warm cream background (#FAF6EE), gold ✦ mark, rounded corners.

**PART 4 — PERFORMANCE + MEMORY**

`src/components/dashboard/PresenceStrip.jsx`:
- Focus timer in `useEffect([open])`: wrapped `setTimeout` with `clearTimeout` cleanup. Previously leaked the timer on unmount while form was open (harmless in practice but incorrect).

**PART 5 — PUBLIC ALPHA UX**

`src/pages/SettingsPage.jsx` — Settings clarity:
- Removed the "Presence Frequency: Always on [Soon]" dead UI row from Companion Behavior. It communicated that a control exists but doesn't work — confusing for new users. Presence frequency is already governed internally by the companion visibility system.

**PART 6 — FINAL SEAM SWEEP**

`src/pages/SettingsPage.jsx` — sage color purge:
- Storage bar fill: `bg-sage` → `bg-ink-300` when usage < 70% (sage is reserved for note content tags).
- Import success button: removed `text-sage border-sage-pale bg-sage-bg`. Now uses gold CSS variables via `style` prop (`--color-gold-bg`, `--color-gold`, `--color-gold-pale`) for success state; ember vars for error state; standard ink classes for idle state.

**Files changed:** `SettingsPage.jsx`, `PresenceStrip.jsx`, `public/manifest.json`, `public/icon-192.png` (new), `public/icon-512.png` (new)
**Build:** clean ✓ (331ms, 82 modules) | **No new schema fields** | **No new localStorage keys**

---

## Session 110 — 2026-05-24
**Theme:** Ship Mode / Pass 5 — Public MVP Readiness

Pre-launch hardening: performance, persistence, EPUB resilience, deployment config. No new systems.

**PART 1+4 — PERFORMANCE**

`src/components/library/Library.jsx`:
- Added `useMemo` import.
- `activeBooks`, `archivedBooks`, `readingNow`, `setAside`, `finished`, `archived`, `readingNowMass`, `filteredFlat`, `filteredArchived` all wrapped in `useMemo` — previously recomputed on every render (every search keystroke, every library update, every sort).
- `matches` now uses `qLower = q.toLowerCase()` computed once, not per-element.

`src/tabs/NotesTab.jsx`:
- `visible`, `visibleReversed`, `usedTags` wrapped in `useMemo` — previously recomputed on every render. With 100+ notes and active search input, each keystroke caused unnecessary filter+reverse+Set construction.

**PART 2 — PERSISTENCE HARDENING**

`src/utils/uid.js` (new file):
- Module-level counter `_seq` + `uid(prefix)` function. Returns `${prefix}${Date.now()}_${seq.toString(36)}`. Ensures uniqueness even when two IDs are created within the same millisecond.
- Wired into: `NotesTab.jsx` (notes), `MysteriesTab.jsx` (mysteries), `CharactersTab.jsx` (characters), `PresenceStrip.jsx` (mysteries + notes), `ChapterUpdateModal.jsx` (sessions), `CreateCompanion.jsx` (books), `EpubImportReview.jsx` (books). Also used for intro reflection IDs in NotesTab.

`src/context/BooksContext.jsx`:
- `useEffect(() => { saveBooks(books) }, [books])` → debounced: 300ms `setTimeout` with cleanup. Batches rapid updates (10 rapid chapter marks = 1 save, not 10).

`src/utils/storage.js` — `sanitizeBook()` chapter sanitization:
- Added `cleanChapters`: filters chapters with invalid `num` (non-finite or ≤0), coerces `num` to integer, ensures `title` is a string, coerces `completed` to boolean.
- Previously chapters were passed through as-is. A corrupted `ch.num = NaN` would break progress calculations silently.

**PART 3 — EPUB CHAOS**

`src/utils/epubParser.js` — chapter count cap:
- After TOC parse (before noise filtering), caps at 500 entries. Some EPUBs encode footnotes or section anchors as TOC items (can produce 5000+ entries). Cap prevents degenerate memory use and import stall.
- Warning added: `"This book has an unusually large number of sections. Only the first 500 were imported."`

**PART 5 — DEPLOYMENT**

`public/_redirects` (new):
- Netlify SPA routing: `/* /index.html 200`. Required for direct URL access and page refresh on any non-root route.

`vercel.json` (new):
- Vercel SPA routing: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`. Same purpose for Vercel deployments.

**Build:** clean ✓ (364ms, 82 modules — +1 for uid.js) | **No new schema fields** | **No new localStorage keys**

---

## Session 109 — 2026-05-24
**Theme:** Ship Mode / Pass 4 — MVP Lock + First-Run Magic (Part 1: Empty State Authorship + OG Image)

**PART 4 — EMPTY STATE AUTHORSHIP**

`src/tabs/MysteriesTab.jsx` — `emptyTitle`/`emptyBody` for `showing === 'resolved'`:
- Title: `'Nothing answered yet.'` → `'No threads have closed yet.'`
- Body: `"Once a thread finds its answer, it will appear here."` → `"When a question finally gets its answer, it will rest here."`
- Reasoning: "Nothing answered yet" has generic placeholder energy; "no threads have closed" names the phenomenon (threads closing) which is specific to the mystery system.

`src/tabs/NotesTab.jsx` — filter empty state when `visible.length === 0`:
- Was: `No ${activeTag} notes yet.` (template string, reads as generic placeholder).
- Now: tag-specific literary copy:
  - theory → `'No theories yet — something will present itself.'`
  - confusing → `'Nothing marked as confusing. The story may be holding its cards.'`
  - quote → `'No lines marked yet.'`
  - character → `'No character notes yet.'`
  - favorite → `'Nothing marked as a favourite yet.'`
  - search: `'Nothing surfaces for that search.'` (was `'No notes match that search.'`)

**PART 6 — DEPLOYMENT READINESS**

`public/og-image.png` (new file):
- Generated 1200×630px PNG using Python struct/zlib.
- Visual: warm cream (#FAF6EE) background, subtle manuscript-rule border frame at 48px margin, gold ✦ approximation at center-top, decorative dots.
- Resolves deployment blocker — `index.html` references this file and it was previously missing.

**Build:** clean ✓ (393ms, 81 modules) | **No new schema fields** | **No new localStorage keys**

---

## Session 108 — 2026-05-24
**Theme:** Ship Mode / Pass 3 — Productionization + Product Clarity

Made Lantern feel publicly releasable. No new systems — this pass is about clarity, stability, consistency, and onboarding.

**PART 1 — ONBOARDING**

`src/components/library/Library.jsx` — WelcomeBanner wired:
- `WelcomeBanner` component existed but was never rendered. Now wired: `welcomed` state added (reads `lantern_welcomed` from localStorage), `dismissWelcome()` sets the key and hides the banner.
- Banner renders in grouped view only (not filtered/search), above LibraryCompanion.
- `useSettings` import added so the banner can read `settings.anthropicKey` and switch copy accordingly.
- Banner copy overhauled: "Not a tracker. Not a to-do list." opening; companion quiet-by-design paragraph; API key notice now explains what still works without one; with-key copy now mentions importing EPUB or creating manually.
- Both "Continue to library →" and "Add API key →" links pass `onDismiss` to Settings link so navigation also dismisses.

**PART 2 — EPUB IMPORT HARDENING**

`src/utils/epubParser.js`:
- Added `MAX_EPUB_BYTES = 150MB` hard limit. Check runs before `arrayBuffer()` — rejects large files immediately with a user-friendly message rather than crashing or hanging.

`src/components/library/CreateCompanion.jsx`:
- Added `useBooks` import to access existing library.
- Added `duplicateWarning` state.
- After `parseEpub` succeeds, title+author (case-normalized) checked against all existing books. If match found, `duplicateWarning` is set with a calm advisory.
- `duplicateWarning` passed through to `EpubImportReview` prop.

`src/components/library/EpubImportReview.jsx`:
- Accepts `duplicateWarning` prop.
- When present, shows a soft gold-toned warning panel above the EPUB warnings block on step 1.

**PART 3 — MOBILE EXPERIENCE**

`src/tabs/NotesTab.jsx`:
- `handleTextareaFocus`: on touch devices (`'ontouchstart' in window`), calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` after 350ms delay — lets keyboard animation start before scrolling the textarea into view.
- Textarea now has `inputMode="text"` and `enterKeyHint={noteExpanded ? 'done' : 'enter'}` for better iOS keyboard experience.
- Writing surface wrapper gets `className="note-write-area"` for targeted CSS.

`src/components/dashboard/BookDashboard.jsx`:
- `pb-24` on main content wrapper replaced with `pb-safe` — new utility class that uses `max(6rem, calc(5rem + env(safe-area-inset-bottom)))` so content clears the home indicator on notched iPhones.

`src/index.css`:
- `.pb-safe` utility: `padding-bottom: max(6rem, calc(5rem + env(safe-area-inset-bottom)))`.
- `.note-write-area`: `scroll-margin-bottom: 120px` on mobile — ensures textarea stays visible above keyboard when scrolled into view.

**PART 4 — VISUAL CONSISTENCY SWEEP**

Sage color violations corrected — sage is reserved for note content tags (`tag-theory`, `tag-confusing`), not UI status indicators:
- `src/pages/SettingsPage.jsx`: API key "Active" badge changed from `bg-sage-bg text-sage border-sage-pale` → gold CSS variables.
- `src/components/library/EpubImportReview.jsx`: "From EPUB" badge changed from sage → gold CSS variables. "Claude AI extraction ready" text changed from `text-sage` → gold inline style.
- `src/tabs/PlotTab.jsx`: "Recent" chapter badge changed from sage → gold CSS variables.

**PART 5 — PERSISTENCE HARDENING**

`src/utils/storage.js` — `sanitizeBook()` extended:
- Added `VALID_STATUSES` set. Books with invalid or missing `status` default to `'reading'`.
- `totalChapters`: if missing or NaN, defaults to `max(chapters.length, 1)`.
- `currentChapter`: if missing or NaN, defaults to `1`.
- `lastUpdated`: defaults to today's date if missing.
- Notes filter now also excludes zero-length text after trim (guards against `""` notes from corruption).
- Mysteries filter same treatment.

`src/utils/storage.js` — `saveBooks()` hardened:
- Before serializing, filters out any books that throw during `JSON.stringify` (circular refs, Proxy objects, etc.) — prevents a single corrupt book from blocking all saves.

**PART 6 — DEPLOYMENT PREP**

`public/favicon.svg` — replaced purple Claude lightning bolt with a Lantern-branded gold ✦ on warm cream (#FAF6EE) background. 32×32, rounded rectangle, `text-anchor="middle"`, `fill="#B8860B"`.

`index.html` — added:
- `<link rel="apple-touch-icon" href="/favicon.svg" />` — references SVG as touch icon.
- `<link rel="manifest" href="/manifest.json" />` — PWA manifest link.
- `<meta name="mobile-web-app-capable" content="yes" />`.
- `<meta name="apple-mobile-web-app-capable" content="yes" />`.
- `<meta name="apple-mobile-web-app-status-bar-style" content="default" />`.
- `<meta name="apple-mobile-web-app-title" content="Lantern" />`.
- `<meta property="og:image" content="/og-image.png" />` — OG image placeholder (production: generate 1200×630px PNG).
- Twitter Card meta tags (`summary_large_image`, title, description).

`public/manifest.json` (new file):
- `name`, `short_name`, `description`, `start_url`, `display: standalone`, `background_color`, `theme_color`, `icons` array referencing favicon.svg.

**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys** | **Verified:** WelcomeBanner shows on first visit, dismisses correctly, library renders normally after dismiss.

---

## Session 107 — 2026-05-22
**Theme:** Ship Mode / Pass 2 — Companion Memory MVP

Made the companion feel genuinely memory-bearing without overbuilding.

**`src/utils/companionThread.js` — richer trajectory context for AI thread:**
- Added `detectDominantCluster(notes)` export: identifies the dominant emotional territory across all notes using EMOTIONAL_CLUSTERS. Requires ≥5 notes, ≥6 scored keywords, ≥35% dominance threshold. Returns `{ label, pct }` or null. Labels: grief/fear/wonder/love/guilt/power/identity.
- Imported `detectConfidenceDrift`, `detectFixations` from `readerState.js`.
- Imported `detectMotifs` from `residueMemory.js`.
- In `generateNoteThreadResponse()` — added to `historyLines`:
  - Confidence arc: "Their interpretive certainty has been declining…" / "strengthening" / "oscillating"
  - Dominant cluster: "Their emotional vocabulary has been predominantly in the territory of grief."
  - Top fixation: `"${word}" keeps appearing in what they write — something about it hasn't resolved.`
  - Motifs: "Recurring words across their notes: 'mirror' and 'silence'. These keep returning."
- In `qualifiers`:
  - Confidence arc: "- Their certainty is eroding — receive this note without reinforcing confidence they are losing"
  - Dominant cluster: "- The reader has been emotionally oriented toward X — if this note continues that thread…"
  - Motifs: "- Motifs recurring in their notes: 'X', 'Y' — if this note touches those, you may note the return"

**`src/tabs/NotesTab.jsx` — rarity hardening + dominant cluster presence:**
- Added `detectDominantCluster` import from `companionThread.js`.
- `echoGapRef` (useRef, starts at 2): echo cooldown mechanism. Minimum 2 non-echo notes between each echo. After echo fires → reset to 0. After non-echo note → increment. Makes resurfacing feel earned, not mechanical.
- In `addNote()`: `canEcho = !isFirstNote && echoGapRef.current >= 2`. Gap accumulates even when no echo is found.
- `deriveNotesPresence()` — added 7 dominant cluster conditions (after fixation check): grief / fear / wonder / guilt / power / identity / love. Each gives a cluster-specific observation without naming the detection system.
- Reread sediment — emotional inversion: when `rereadCount > 0`, if dominant cluster shifted between archival and current notes → "The emotional register has shifted between readings. What felt like one thing before now feels like another."

**`src/components/dashboard/CompanionHeader.jsx` — dormant mystery surface:**
- Imported `mysteryHauntScore` from `hauntScore.js`.
- **Reading gap archaeology** (7+ days gap): now also surfaces the most haunted open mystery when gap ≥ 14 days AND mystery haunt score ≥ 1.5. Mystery shown with `✦` prefix at 0.72 opacity — visually distinct from the note pull-quote above.
- **Abandoned archaeology** (14+ days, paused): replaced generic open mystery count with specific highest-haunted mystery text. If `openCount > 1`, shows "N other threads still open." beneath. Uses `mysteryHauntScore()` for sort. The story now feels haunted by specific unfinished thought, not just a number.

**Verified:** Mother Night (25 days gap, 3 open mysteries): header shows last note pull-quote + most haunted mystery with ✦; PresenceStrip echoes "That question — '…' — has followed you for 10 chapters."

**Files changed:** `companionThread.js`, `NotesTab.jsx`, `CompanionHeader.jsx`
**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys**

---

## Session 106 — 2026-05-22
**Theme:** Ship Mode / Pass 1 — Core Loop Stabilization

Critical bug fixed and full reading loop verified end-to-end. MVP-ready completion state.

**Completion-state fix (primary goal):**
- Root cause: after marking the final chapter in ChapterUpdateModal, `status` stayed `'reading'` but `atEnd = pct >= 100` was true. The primary "Continue from chapter..." CTA was still visible; the chapter dropdown was empty (no remaining chapters).
- `CompanionHeader.jsx` — three targeted edits:
  1. Reading gap archaeology: added `!atEnd` guard so pull-quote doesn't show when book is finished
  2. New completion pathway block: `(isReading || isPaused) && atEnd && !editingMeta && !pendingAction` → "The final chapter." + "The story ends here ✦" button → `setPendingAction('finish')`
  3. Primary ritual CTA: added `!atEnd` guard — now only shows when `isReading && !atEnd`
- `ChapterUpdateModal.jsx` — empty dropdown guard: when `remainingChapters.length === 0`, shows "All chapters have been read." in place of the select element, and hides the "Continue →" CTA. Safety net for atEnd books (CompanionHeader now prevents reaching this state).

**Lifecycle section refactor:**
- Decoupled CONFIRM dialog from `actions.length > 0` gate — the confirm block now renders independently whenever `pendingAction && CONFIRM[pendingAction] && !editingMeta`. This fixes a regression where clicking the "The story ends here" button (which sets `pendingAction` directly, not via the actions list) produced no visible confirm dialog.
- When `isReading && atEnd`, the actions list is now empty — no redundant "put this aside · the story ends here ✦" secondary links alongside the primary completion button.
- Lifecycle action links now show only when `!pendingAction` (no stale action links peeking behind the confirm dialog).

**CTA copy fix:**
- Brand new books (`readingLog.length === 0`) now show "Begin your first chapter" instead of "Continue from chapter 1." After the first chapter update, the standard "Continue from chapter N" label resumes.

**Full loop verified (visual preview):**
- `atEnd` → "The final chapter." + "The story ends here ✦" button ✅
- Click → "Mark this companion as finished?" + "Not yet" / "Yes, it's done" ✅
- Confirm → `isFinished` → afterimage "The ending is still settling." + "begin again · archive this companion" ✅

**Files changed:** `CompanionHeader.jsx`, `ChapterUpdateModal.jsx`
**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys**

---

## Session 105 — 2026-05-22
**Theme:** Reinterpretation Systems + Semantic Archaeology

This session moved further inside the intelligence of the companion — improving how it recognizes emotional resonance, how first-reading certainty becomes visible in rerereads, and how high-haunt mysteries persist despite environmental cooling.

**`companionThread.js` — semantic echo + theory recontextualization:**
- 7 `EMOTIONAL_CLUSTERS` for cross-word resonance (grief↔loss, fear↔dread, love↔warmth, etc.)
- `scoreOverlap()` — exact match = 1.0, cluster match = 0.6. Replaces simple keyword count.
- `detectNoteEcho` upgraded: cluster scoring, chapter proximity boost, threshold lowered to 1.5. Returns `__echoType: 'era' | 'resonance'` — era echoes are from a previous reading of the same book.
- Theory recontextualization: when a new theory/confusing note overlaps semantically with a prior revised theory, AI prompt gains: "A related certainty from earlier in this reading was later revised — the ground here has shifted before." The companion enters that note already knowing the ground is uncertain.
- Era-aware echo context in AI prompt: archival echoes identified as "from a previous reading" — AI can acknowledge how interpretation shifts across readings.

**`NotesTab.jsx` — note identity + manuscript polish:**
- Chapter stamped on new notes at creation (`book.currentChapter > 0` only). Enables echo proximity scoring and archaeology.
- Era echo display: `"· from your first reading, ch. N"` with warm gold border (`rgba(184,134,11,.12)`). Distinct from intra-reading resonance (`rgba(28,20,16,.07)`).
- Dynamic CTA labels per tag — theory → "Hold this →", confusing → "Leave open →", quote → "Carry this →", favorite → "Mark this →", etc.
- Writing surface textarea: `background: transparent` → `rgba(28,20,16,.018)`. Parchment warmth.
- Enter submits reflection (without Shift).
- Reread sediment in `deriveNotesPresence(notes, rereadCount)`: 3 new conditions that fire before collapsed-theory conditions when archival notes are visible beneath the current reading. "Two readings, layered. The earlier one is still legible beneath this one."

**`MysteriesTab.jsx` — haunted thread persistence:**
- Haunted mystery opacity in quiet state: 0.60 → 0.75. Persistent: 0.50 → 0.62. Emotionally charged mysteries resist the environmental cooling that affects all other threads.

**Files changed:** `companionThread.js`, `NotesTab.jsx`, `MysteriesTab.jsx`
**Build:** clean ✓ | **`chapter` added to new notes** (optional, backwards-compatible) | **No new localStorage keys**

---

## Session 104 — 2026-05-22
**Theme:** Feature Expansion — Companion Cognition + Note Echo + Return Archaeology

Three systems built this session, all targeting the "living literary archive" dimension: companions that remember the reader's journey, notes that surface older resonances, and book dashboards that acknowledge the passage of time.

**`companionThread.js` — companion cognition expanded:**
- `detectNoteEcho(newNote, existingNotes)` — new export. Pure JS keyword-overlap scanner. Builds a keyword set from the new note, scores all existing notes by overlap, returns the best match (≥ 2 keyword overlap threshold). No AI required. Ignores stopwords (60+ filtered).
- `generateNoteThreadResponse()` — new optional `context = { echo }` parameter. AI prompt now includes: theory count + collapse count ("2 of their 4 theories were revised"), reread awareness, confusion accumulation signal (≥ 3 confusing notes), the echo note if found. Derived instruction qualifiers tune the AI's tone: tentativeness on revised-theory readers, second-reading acknowledgment on rereads. The companion now enters each note with full awareness of the reader's interpretive history.

**`NotesTab.jsx` — note echo display:**
- `noteEchoes` state added, parallel to `noteReplies`.
- Echo detected in `addNote()` before `onUpdateBook()` — uses old `book.notes` corpus only, correctly excluding the new note.
- Echo renders below the companion thread after thinking resolves. Quieter visual: `rgba(28,20,16,.07)` left border, 10px italic ink-300 attribution ("· an earlier note, ch. N"), 12px italic ink-400 truncated note text (120 char cap).
- Works with or without AI key — the echo is reader's own voice returning, not the companion's.

**`CompanionHeader.jsx` — two return archaeology layers:**
- **Reading gap** (isReading, gap ≥ 7 days, has notes): single pull-quote of last note written. Very quiet — 11px italic ink-300, no label, just the thought waiting to be picked back up.
- **Abandoned archaeology** (isPaused, gap ≥ 14 days): "Set aside N weeks/months ago." + last note pull-quote + open thread count. Three-tier information, progressively subdued. Not a call-to-action — just what was in motion when the story was put down.

**Files changed:** `companionThread.js`, `NotesTab.jsx`, `CompanionHeader.jsx`
**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys**

---

## Session 103 — 2026-05-22
**Theme:** Feature Expansion — Cross-Book Memory + Post-Completion Afterimage

Two new files, two wiring points, one build. The library begins to speak about the reader as a reader.

**`src/utils/crossBookMemory.js` (new file):**
- `generateCrossBookObservation(books)` — 5 detectors, priority-ordered: behavioral (rereader / holder / finisher / wanderer) → annotation style (theorist / questioner / collector / impressionist / analyst) → mystery tendency (mystery-dense) → collapse awareness (collapse-prone) → thematic resonance (grief / tension / strange / warmth / identity / moral). Returns one observation string or null. Never speaks from thin data — minimum 3 annotated books for most patterns, 4 notes per book to count.
- `generateCompletionAfterimageLine(book)` — quiet post-completion observation for recently finished books. Considers days since completion, open mystery count, collapsed theories, note density, quote count. Returns earned specific lines ("The ending is still settling." / "You left a lot of yourself in this one." / "The lines you collected from this will resurface." etc.).

**`src/components/library/LibraryCompanion.jsx` (new file):**
- One ◦-prefixed ambient line above the reading-now zone in grouped library view.
- `useMemo` keyed to books.length + total annotation count (notes + mysteries).
- Returns null when no pattern detected — silence is correct.
- 12px italic ink-500 at 0.75 opacity. Uses ◦ (not ✦ — that belongs to the book companion).
- Only visible in grouped view. Not rendered during filter/search or when library is empty.

**`Library.jsx` — LibraryCompanion wired in:**
- `import LibraryCompanion from './LibraryCompanion.jsx'` added.
- `<LibraryCompanion books={books} />` renders as first child of the grouped view div.

**`CompanionHeader.jsx` — post-completion afterimage wired in:**
- `import { generateCompletionAfterimageLine } from '../../utils/crossBookMemory.js'` added.
- Finished state now checks days since completion:
  - ≤ 30 days: shows afterimage line as primary. If > 2 days, also shows archival date below at 11px ink-300.
  - > 30 days: falls back to existing `fmtCompleted()` archival date line unchanged.

**Files changed:** `crossBookMemory.js` (new), `LibraryCompanion.jsx` (new), `Library.jsx`, `CompanionHeader.jsx`
**Build:** clean ✓ | **No new schema fields** | **No new localStorage keys**

---

## Session 102 — 2026-05-22
**Theme:** Stabilization Arc — Companion Ritual Flow + Emotional UX Staging (Pass 4)

Rebuilt three core interactions to feel literary and emotionally staged instead of operational.

**NotesTab.jsx — complete restructure:**
- Writing surface moved to top, always visible. No toggle/button to reveal — the page is open. Serif italic 14px textarea with transparent background and bottom-border-only. Collapses when empty+unfocused, expands on focus. Tags + "Keep →" / "cancel" appear below on expand.
- Notes display order reversed: **newest → oldest**. Writer witnesses their note arriving at the top of the stack. Newly added note gets `.note-land` animation (0.45s, slides in from above).
- Search becomes a secondary reveal: persistent search field replaced with "search notes" text-link (11px italic ink-300). Clicking reveals an inline borderless search input; Escape/X dismisses it.
- Geological break direction corrected for reversed order: break fires when entering archival stratum from above (current-era note → archival note), not the old bottom-up direction.
- Removed: `adding` state, `EmptyState` import, "leave a note →" toggle button. Empty state replaced with quiet italic hint: "Theories, favourite lines, confusions, hunches."

**ChapterUpdateModal.jsx — full rebuild:**
- **Form:** Freeform textarea + quick chapter chips + expanded chapter list + duration buttons all removed. Replaced with: (1) `<select>` dropdown "Which chapter did you just finish?" pre-selected to next chapter; (2) large expressive serif-italic textarea "How did it feel?" with atmospheric placeholder — invites reaction, confusion, excitement, theory.
- **CTA:** Filled gold button replaced with restrained outlined editorial button (border ink-200, transparent bg, serif 15px). Hover darkens border + text only.
- **Modal arrival:** `animate-slide-up` replaced with `.modal-soft` (0.60s cubic-bezier settle, barely perceptible movement — the room noticing, not a screen transition).
- **Done state — staggered emergence:** `visibleCards` state drives sequential appearance: card 1 at 180ms, card 2 at 820ms, card 3 at 1480ms, card 4 at 2100ms. Each card uses `.card-surface` (0.70s ease, `animation-fill-mode: backwards` — starts invisible until delay fires).
- **Progress card simplified:** Removed large heading, icon, and container box. Just: 40px gold number + `h-px` progress bar + quiet italic dry observation line.
- **Dry observation** (`getDryObservation()`): One literary, dry, specific line beneath the progress bar. Conditions: first read, gap (7d / 21d), milestone (25/50/75/100%), progress ≥ 90%, chapters read count.
- **Threads card de-escalated:** Was `bg-ember-bg border-ember-pale` (looked like an error). Now `bg-card-base border-ink-06` (neutral, soft). Gold ✦ glyph instead of red ◆. Correctly feels like a rich region.
- **All card headers:** `SectionLabel` uppercase removed → quiet italic ink-400 (11px) — "newly encountered", "what just happened", "threads just opened / still open".
- **Close button:** Also outlined editorial (matches CTA), appears last with 4th card wave.

**CompanionHeader.jsx — outlined ritual CTA:**
- Progress update button changed from serif text-link with → arrow to a proper outlined button (border ink-200, 9px 20px padding, border-radius 7, transparent background).
- Hover: border → ink-400, text → ink-900. Calm, editorial, anchored.

**index.css — new animation classes:**
- `@keyframes cardSurface` — opacity+translateY(8px→0), 0.70s ease backwards.
- `@keyframes noteLand` — opacity+translateY(-10px→0), 0.45s ease both.
- `@keyframes modalSoft` — opacity+tiny scale+translateY(6px→0), 0.60s cubic-bezier.
- `.card-surface`, `.note-land`, `.modal-soft` utility classes.

**Files changed:** `NotesTab.jsx`, `ChapterUpdateModal.jsx`, `CompanionHeader.jsx`, `index.css`
**Build:** clean ✓ | **No new schema fields** (sessionReflection added to log entries — optional, non-breaking)

---

## Session 101 — 2026-05-22
**Theme:** Stabilization Arc — Ritual UX + Editorial Hierarchy (Pass 1 + Pass 2)

Two passes addressing accumulated UI flattening. Everything was whispering at the same volume.

**Pass 1 — Ritual UX + Operational Clarity:**
- `CompanionHeader.jsx`: Progress update is now the primary ritual action (17px serif, above lifecycle actions). Text adapts to state: "Return to chapter N" / "Continue from chapter N" / "Begin your first chapter". API key gate: quiet italic notice when key absent, links to Settings.
- `CompanionHeader.jsx`: "update chapter" removed from secondary action row — that path now belongs exclusively to the primary ritual action.
- `EpubImportReview.jsx`: `useNavigate` added. Status text corrected to "companion extraction unavailable". Pre-import gold notice warns about limited extraction when no key, with Settings link.
- `PresenceStrip.jsx`: No-key ambient state shows "The companion is quiet." instead of book title.
- `NotesTab.jsx`: No-key + non-first note → companion is cleanly absent (no fake thinking dots). Three-path logic: first note → intro; key → AI; no key + not first → silence.

**Pass 2 — Editorial Hierarchy + Breathing Room:**
- `ProgressTab.jsx`: 3-tier chapter vertical rhythm (py-4 current → py-1.5 completed). `chapterMargin` spacing gives current chapters breath and singularity chapters silence. Chapter label: inline styles, completed → 10px ink-200, current → 11px gold. Chapter title: current → 15px serif ink-900, completed → 12px ink-300 (no line-through), next → 13px ink-600, pending → 13px ink-500.
- `PlotTab.jsx`: 3-tier recency hierarchy. Button padding (py-4 just-read → py-2.5 older). Number badge (12px ink-500 → 10px ink-300). Chapter title (16px serif ink-900 → 12px ink-400). Summary preview (12px ink-400 → 11px ink-300).
- `CompanionHeader.jsx`: Book title 22px → 24px, tracking -0.02em → -0.025em.

**Files changed:** `ProgressTab.jsx`, `PlotTab.jsx`, `CompanionHeader.jsx`, `EpubImportReview.jsx`, `PresenceStrip.jsx`, `NotesTab.jsx`
**Build:** clean ✓ | **No new schema fields**

---

## Session 100 — 2026-05-22
**Theme:** Companion Thread — AI Responses + Animation + Typography

Three distinct improvements to the companion thread system introduced in Sessions 98–99.

**1 — AI-powered responses (`src/utils/companionThread.js`, new file)**

Companion note thread responses were hardcoded lookup strings with no awareness of the book, the reader's position, or what had just been experienced. Replaced with real AI calls (Anthropic API, `claude-haiku-4-5`) that receive full context: book title, author, description, current chapter, last 5 notes as reading history, and the new note. Response is capped at 120 tokens (one or two sentences). Prompt instructs: specific to this book, no affirmations, no "I", understated literary tone, adds something the reader may not have named.

- `generateNoteThreadResponse(note, book, apiKey)` — exported async function. 12s timeout. Throws on failure so callers can catch and fall back.
- `threadFallback(tag)` — exported fallback pool for no-key / API error cases.

`NotesTab.jsx` updated with three paths in `addNote()`:
- **First note** → `generateFirstIntroReflection()` as before (already curated)
- **API key present** → `generateNoteThreadResponse()`. Response races the minimum floor delay from `calcNoteDelay()` so the thinking state never vanishes instantly even on fast API responses.
- **No API key** → `generateNoteCompanionResponse()` canned fallback with calculated delay.

`useSettings` import added to `NotesTab.jsx` (was missing). `generateNoteThreadResponse` + `threadFallback` imported from new util.

Canned fallback responses also improved: `generateNoteCompanionResponse` updated to always return a string (removed `return null`), added `isHeavy` emotional vocabulary detection for theme notes, added `character` response. `threadFallback()` in `companionThread.js` mirrors this as the no-key pool.

**2 — Staged arrival animation (`src/index.css`, `NotesTab.jsx`, `MysteriesTab.jsx`)**

Previous `companionThreadArrive` (blur-clear, 0.7s) felt like a page section loading. Replaced with a two-beat orchestrated reveal:
- `@keyframes companionGlyphSettle` → `.companion-glyph-settle`: ✦ glyph fades in over 0.5s ease. The companion marks its place.
- `@keyframes companionTextSurface` → `.companion-text-surface`: response text fades in over 1.1s ease with a 0.3s delay (`animation-fill-mode: both` — holds opacity:0 during the beat). Words surface after the glyph settles.

Applied at element level (not wrapper div): `className="companion-glyph-settle"` on ✦ `<span>`, `className="companion-text-surface"` on response `<p>`. `companion-thread-arrive` class and keyframe removed.

**3 — Typography + contrast (`NotesTab.jsx`, `MysteriesTab.jsx`)**

Companion response text was 12px Playfair Display italic at `--color-ink-500` (#9A8868) — approximately 2.5:1 contrast ratio against cream background, failing WCAG at any text size. Playfair italic at 12px is also difficult to parse.

Changed to: `var(--font-sans)` (Inter), 13px, regular weight (no italic), `var(--color-ink-700)` (#5C4828). Estimated contrast ratio ~6.5:1 — passes WCAG AA. ✦ glyph opacity raised from 0.50 → 0.65.

**4 — Dev server network access (`vite.config.js`, `.claude/launch.json`)**

Vite was binding to localhost only. Added `server: { host: true, port: 5230 }` to `vite.config.js` and `--host` flag to `.claude/launch.json`. Server now accessible on local network:
- Local: http://localhost:5220
- Network: http://192.168.1.50:5220

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields**

---

## Session 99 — 2026-05-21
**Theme:** Companion Presence Timing + Emotional Latency

Deepened the timing realism and emotional intelligence of the companion threading system introduced in Session 98. The companion's timing now reads emotional weight, not just word count. Glyph animation is made irregular so the thinking state feels contemplative rather than looping. Arrival animation switches from a vertical slide to a blur-clear dissolve. The thread visual is further reduced. The observation carousel gains random jitter so it feels environmental rather than mechanical.

**Files modified:**

- `src/index.css`:
  - **`@keyframes companionThreadArrive`** — changed from `translateY(3px)→0` to `blur(0.8px)→blur(0)`. Companion responses no longer slide up — they surface through the page, like ink clearing.
  - **`.companion-thread-arrive`** — duration extended from `0.55s` to `0.7s ease` to match the slower blur dissolve.

- `src/tabs/NotesTab.jsx`:
  - **`calcNoteDelay(text, tag)`** — major update. Added emotional/uncertainty vocabulary detection:
    - `uncertain` pattern: `/\b(maybe|perhaps|wonder|not sure|unsure|i think|unclear|don't know)\b/i` — +450ms
    - `emotional` pattern: `/\b(feel|felt|moved|devastating|haunting|beautiful|grief|loss|afraid|dread)\b/i` — +350ms
    - `hasEllipsis` pattern: `/\.{2,}/` — +300ms
    - Short notes (<8 words): lower base delay (800ms vs 1000ms)
    - ±220ms random jitter per note — prevents mechanical cadence
    - Final clamp: 700–4800ms (widened from 800–4500ms)
  - **Thinking glyphs** — irregular durations: `[2.3s, 3.1s, 1.9s]` at delays `[0s, 0.7s, 1.5s]`. No longer uniform 2.2s — each star pulses at its own pace. Feels contemplative.
  - **Thread border** — `rgba(184,134,11,.22)` → `rgba(184,134,11,.15)`. Lighter trace.
  - **✦ response glyph opacity** — `0.60` → `0.50`. Further receded.

- `src/tabs/MysteriesTab.jsx`:
  - **Thinking glyphs** — same irregular durations as NotesTab: `[2.3s, 3.1s, 1.9s]` at `[0s, 0.7s, 1.5s]`.
  - **Mystery delay** — added `±200ms` jitter: `baseDelay + Math.floor(Math.random() * 400) - 200`.
  - **Thread border** — `.22` → `.15`.
  - **✦ opacity** — `0.60` → `0.50`.

- `src/components/dashboard/PresenceStrip.jsx`:
  - **Carousel replaced** — `setInterval` → recursive `setTimeout` with `±1500ms` jitter per rotation. Initial fire also jittered. Cadence now varies ±1.5s from the base interval. Feels environmental. Cleanup uses `clearTimeout`.

- `src/components/dashboard/CompanionInsights.jsx`:
  - **Same carousel replacement** — `setInterval` → recursive `setTimeout` with `±1500ms` jitter. Inner delay stays 280ms (vs PresenceStrip's 300ms). Dependency array remains `[observations.length, carouselInterval]` (no `open`).

**Design principles applied:**
- Timing irregularity without chaos — jitter is bounded, never dramatic
- Emotional weight earns real time — notes expressing feeling or uncertainty cause the companion to pause longer
- The blur-clear arrival means responses feel like they emerge from the surface rather than descend onto it
- The thread visual is quieter: lighter border, dimmer glyph — the companion is present without asserting

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 98 — 2026-05-21
**Theme:** Companion Moment Refinement — Threaded Response Placement + Natural Response Timing

Architecture finding: When a reader left a note, any companion response appeared instantly and above the note. The reader's voice and the companion's voice had no spatial relationship — the companion replied before the reader had even finished writing, and it appeared in the wrong direction. This pass introduced threaded, timed, spatially correct companion responses: the reader speaks first, the companion follows from within the note itself.

**Files modified:**

- `src/index.css`:
  - **`@keyframes companionPulse`** — `0%,100%{opacity:.18} 50%{opacity:.75}`. A slow, warm star pulse for the thinking state. 2.2s cycle — deliberately unhurried. Not a loading spinner.
  - **`@keyframes companionThreadArrive`** — `from{opacity:0;transform:translateY(3px)} to{opacity:1;transform:translateY(0)}`. Companion response settles in with a 3px vertical settle over 0.55s. No bounce, no slide — a quiet arrival.
  - **`.companion-thread-arrive`** — utility class applying the arrival animation.

- `src/tabs/NotesTab.jsx`:
  - **Removed** `introAck` state and the floating ceremony block above the notes list. The first-note response now threads through the same per-note system as all subsequent responses.
  - **Added** `thinkingNoteId`, `noteReplies`, `thinkingTimerRef` state/ref.
  - **Added** `calcNoteDelay(text, tag)` — module-level function. Base 1000ms + `words×38` (cap 1100ms) + `sentences×75` + `questions×320` + 500ms for theory/confusing + 250ms for favorite. Clamped 800–4500ms.
  - **Added** `generateNoteCompanionResponse(note, isFirst)` — module-level function. Returns response text or `null`:
    - First note → `generateFirstIntroReflection({ tag })` (existing pool, now threaded)
    - `theory` + `?` → `"A theory still framed as a question."`
    - `theory` → `"Held here until the story responds."`
    - `confusing` → `"The story keeps this unclear — for now."`
    - `favorite` → `"Something here has caught and held."`
    - `quote` → `"Worth carrying forward."`
    - Any tag + `?` → `"The story hasn't answered that yet."`
    - Plain `character` / plain `theme` → `null` (companion stays quiet — scarcity preserved)
  - **Modified** `addNote()` — after saving, always sets `thinkingNoteId` to the new note's ID; after the calculated delay, clears thinking state and (if response exists) sets `noteReplies[note.id]`. When response is `null`, thinking state fades without resolving — a considered silence.
  - **Thread JSX** — inside each note card's normal view (not edit/delete/reflect modes), before the footer: `1px solid rgba(184,134,11,.22)` left border + 12px inset. Thinking state = three `✦` glyphs with `animationDelay: 0s / 0.6s / 1.2s`. Response = `companion-thread-arrive` div with `✦` glyph (opacity 0.60) + 12px serif italic ink-500 text.

- `src/tabs/MysteriesTab.jsx`:
  - **Added** `thinkingMystId`, `mysteryReplies`, `thinkingTimerRef`.
  - **Added** `generateMysteryResponse(text)` — 4 responses, deterministic by djb2-variant hash of text: `"Opened. The story will return to this."` / `"A question the story isn't ready to answer."` / `"The reading is holding this."` / `"Kept here while the story continues."`
  - **Modified** `addMystery()` — delay = `900ms + min(words×35, 900ms)`.
  - **Thread JSX** — same visual language as notes, placed just before the thread actions row.

**Behavioral design decisions:**
- Thinking state appears for ALL notes (even those that will receive no response) — the companion always considers before staying quiet. A 800ms thinking state that fades without a reply communicates presence and restraint simultaneously.
- Mysteries always receive a response (opening a thread is a deliberate act — the companion always acknowledges it).
- Both `thinkingNoteId`/`mysteryReplies` are component state — responses are ephemeral (session-only). They do not persist to localStorage. Old notes/mysteries from previous sessions carry no thread. This is intentional: the threading is about the moment of creation, not permanent annotation.
- Timer cleanup via `useEffect` return on unmount — no stale setState calls after navigation.
- `introAck` system entirely replaced. The first-note reflectionCache setup (for PresenceStrip) is preserved.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 97 — 2026-05-21
**Theme:** Dev Mode reintroduction + Anthropic model fix

Two fixes in one pass.

**Anthropic model fix:**
- `src/utils/aiRequest.js`: `PROVIDER_CONFIG.model` `'claude-3-5-haiku-20241022'` → `'claude-haiku-4-5'`. Old versioned ID was returning 404 from the API — all AI extraction (EPUB import) and companion reflection generation was silently falling back to rule-based paths. Single source of truth; one change covers all three AI operations simultaneously.

**Dev Mode reintroduction:**
- `src/context/SettingsContext.jsx`: `devMode: false` added to `SETTINGS_DEFAULTS`. Persisted in `shadowscribe_settings`.
- `src/pages/SettingsPage.jsx`: "Developer" section added at bottom of Settings with a `Toggle` for Dev Mode.
- `src/utils/reflectionEngine.js`: `getActiveReflections(book, limit, devMode = false)` — third param. When `devMode`, the 8h `MIN_RESURFACE_MS` cooldown is bypassed.
- `src/components/dashboard/PresenceStrip.jsx`: `devMode = !!settings.devMode`. `carouselInterval`: `devMode → 3000` always (never null). `stripOpacity`: `devMode → 1.0` always. `getActiveReflections` updated to pass `devMode`.
- `src/components/dashboard/CompanionInsights.jsx`: Same three changes.

**What Dev Mode does:** bypasses 8h reflection cooldown · carousel at 3s · full companion strip opacity always. Does NOT bypass `yieldsToBook`, atmospheric silence, or signal arbitration.

**Build:** clean ✓ | **No new schema fields** | **No new systems**

---

## Session 96 — 2026-05-21
**Theme:** Depth of Attention + Focus Falloff

Architecture finding: All seven prior atmosphere passes produced an environment that was organic, continuous, and climatically alive — but all books still resolved with roughly equal perceptual clarity. A deeply inhabited active read and a three-year-old archived book received similar cover opacity, shadow depth, and title weight. The library had differentiated atmosphere but not differentiated focus. This pass introduced a quiet perceptual hierarchy: inhabited, annotated books come forward slightly; sparse and dormant books recede slightly further.

**Files modified:**

- `src/components/library/BookCard.jsx`:
  - **`coverOpacity`** (replaces `coverShadowOpacity`) — computed from both presence and temporal state: `book.status === 'finished' → 0.80`, `daysSince > 90 → 0.70`, `presence === 'deep' → 1.0`, `presence === 'inhabited' → 0.97`, sparse/default `→ 0.91`. The cover of a deeply inhabited active book holds full optical presence. A sparse or finished book steps back by a few percent — not hidden, but no longer fully forward. The transition from `coverShadowOpacity` (which only tracked temporal state) to `coverOpacity` (which tracks both presence and temporal state) makes the cover's visual weight an accurate reflection of the book's overall environmental weight.
  - **`coverShadow` — temporal falloff for sparse/dormant books** — Previous state: sparse books received the same `'0 3px 14px rgba(0,0,0,.18)'` shadow as all unannotated books regardless of age. Now: `daysSince > 90 → '0 2px 10px rgba(0,0,0,.10), 0 1px 3px rgba(0,0,0,.06)'`, `daysSince > 45 → '0 2px 12px rgba(0,0,0,.13), 0 1px 3px rgba(0,0,0,.08)'`. Very old books lose the last of their shadow weight — the light that surrounded them has moved on. Deep and inhabited paths unchanged.
  - **Title color by presence** — Sparse books (`presence === ''`) now render title text at `var(--color-ink-800)` instead of `var(--color-ink-900)`. A one-step tonal recession — the title is still legible, still readable, but no longer at full presence. Deep and inhabited books remain at ink-900.
  - **Cover div opacity uses `coverOpacity` directly** — removed previous ternary `book.status === 'finished' ? 0.80 : coverShadowOpacity`; `coverOpacity` now handles all cases in one computed value.

- `src/components/library/Library.jsx`:
  - **Flat view presence pass** — `filteredFlat.map` and `filteredArchived.map` now pass `presence={bookPresence(book)}` to `BookCard`. Previously, cards in filtered/search views always received `presence=''` (the default), meaning all interior variations and cover opacity were suppressed in flat view. Now, a deeply annotated book carries its full presence identity whether browsed in grouped view or searched for directly.

- `src/index.css`:
  - **`.shelf-dormant` brightness** — `filter: saturate(0.82)` → `filter: saturate(0.82) brightness(0.97)`. A tiny 3% brightness reduction on finished books. Imperceptible as a change but cumulatively deepens the tonal separation between the active zone and settled sections.
  - **`.shelf-archive` brightness** — `filter: saturate(0.60)` → `filter: saturate(0.60) brightness(0.95)`. A 5% brightness reduction on archived books. Archive cards are already at 0.38 opacity; adding a slight darkening makes them settle further into the surface without becoming unreadable. Hover states updated to restore `brightness(1)` and `brightness(0.99)` respectively.

**Design principles applied:**
- Cover opacity was the cleanest perceptual handle: the cover is the first thing the eye sees. A 9% difference (1.0 vs 0.91) between inhabited and sparse is at the edge of conscious perception but accumulates across a full shelf.
- Title recession via `ink-800` vs `ink-900` is one tonal step — approximately 8% lightness change. The typographic recession mirrors the cover recession without creating visible "states."
- Brightness on shelf states adds to the existing saturation and opacity cooling. All three axes together (opacity × saturation × brightness) produce a more physically plausible recession than any single axis alone.
- Flat-view presence pass ensures the book's atmospheric identity is consistent regardless of how the reader navigates to it.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 95 — 2026-05-21
**Theme:** Peripheral Atmosphere + Edge Dissolution Pass

Architecture finding: After five passes of atmospheric deepening, the library's inner environment felt composed and layered, but the outer edges still felt screen-bounded. The content sat cleanly inside the viewport with hard starts and stops. This pass addressed three distinct edge conditions: the reading-now zone's peripheral reach, the page's atmospheric ground, and the archive's terminal taper.

**Files modified:**

- `src/index.css`:
  - **Reading-now zone side bleed** — `margin: -16px -20px 0` → `margin: -16px -28px 0`, `padding: 22px 20px 14px` → `padding: 22px 28px 14px`. The zone now bleeds 28px into the main's 40px side padding (previously 20px) — 8px wider on each side. The warm peripheral atmosphere extends further into the page margins. Content alignment is preserved via compensating padding.
  - **Body ambient — bottom warm ground** — Added fifth gradient to `body::before`: `radial-gradient(ellipse 70% 25% at 50% 106%, rgba(184,134,11,.020) 0%, transparent 55%)`. Positioned at 50% horizontal, 106% vertical (just below the viewport bottom). Since `body::before` is `position: fixed`, this gradient persists at the bottom of the viewport as the user scrolls. As the archive section approaches the viewport bottom during scrolling, there is now a faint warm atmospheric ground below it — the library sits over warmth rather than ending on a hard floor. At 2% opacity it is essentially invisible but accumulates with the existing bottom-right gradient.
  - **Dark mode reading-now zone** — The updated `margin`/`padding` values in the base class automatically apply in dark mode (the dark mode rule only overrides `background` and `box-shadow`).

- `src/components/library/Library.jsx`:
  - **Reading-now zone inline padding override** — Updated mass >= 6 override from `padding: '26px 20px 18px'` → `padding: '26px 28px 18px'`. Preserves the 28px horizontal padding set by the new CSS while still expanding top/bottom for high annotation-mass zones.
  - **Archive grid bottom dissolution** — Applied `maskImage: 'linear-gradient(to bottom, black 62%, transparent 100%)'` (plus `-webkit-` prefix) to the archive grid container. The top 62% of the grid renders at full mask opacity; the bottom 38% fades to transparent. For archive cards at `opacity: 0.38` (from `.shelf-archive`), the fade goes from `0.38 × 1.0 = 0.38` to `0.38 × 0 = 0`. The most settled books dissolve gradually into the page rather than ending at a clean grid boundary. The card title and author (in the upper portion of each card) remain visible; the progress footer and date (lower portion) fade progressively.

**Design principles applied:**
- The bottom warm ground uses `position: fixed` (inherited from body::before) intentionally — it tracks with the viewport so the atmospheric ground persists at the bottom of the frame regardless of scroll position. This is different from scroll-based effects: it's always there, as a permanent atmospheric environment.
- The archive mask-image works with the existing `opacity: 0.38` on `.shelf-archive` — it multiplies rather than replaces. The dissolution is physically correct: already-dimmed books fade further.
- The reading-now bleed increase (8px each side) is a peripheral expansion, not a dramatic width change. At 20px → 28px, the effect is perceptible as "slightly more warmth at the sides" rather than a notable layout change.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 94 — 2026-05-21
**Theme:** Visual Current + Quiet Zones Pass

Architecture finding: After regional climate and density fields were introduced (Session 93), the eye still scanned the library too uniformly — all sections felt equally present despite their different atmospheric states. The missing element was directional visual flow: a sense that attention moves through the library with varying pace, that some regions pull longer while others pass lightly. This pass introduced four directional signals without any visible system.

**Files modified:**

- `src/components/library/Library.jsx`:
  - **Set-aside dormant suspension** — Section wrapper style expanded to include `paddingTop: 6` when `setAsideDormantRatio > 0.5` (previously only had filter at >0.7). When more than half the paused books are cooling, the entire section lifts slightly in its space — the mostly-dormant shelf feels more suspended and isolated rather than heavy and grounded. The eye passes it more lightly.
  - **Set-aside grid row/col gap asymmetry** — `gap-4` → `gap-x-4 gap-y-[22px]`. Column gap stays 16px; row gap increases to 22px. Books within a row feel slightly closer to each other; rows breathe more from one another. This breaks the perfectly even grid cadence — the shelf reads as a composed editorial column rather than a uniform tile grid.
  - **"finished" label stepped indent** — `paddingLeft: 4` added to the finished section label. The label steps 4px inward from the left edge, creating the beginning of a visual diagonal: as reading history deepens (reading-now → set-aside → finished → archive), section labels step progressively inward. The diagonal is nearly imperceptible but directionally meaningful — the eye is guided downward and slightly inward through time.
  - **Finished grid row/col gap asymmetry** — `gap-3` → `gap-x-3 gap-y-[18px]`. Column gap 12px; row gap 18px. Same editorial pacing principle as set-aside but slightly tighter, appropriate for the more settled finished section.
  - **Archive approach space** — `paddingTop: 16` on the archive section wrapper. Creates 16px of measured quiet before the archive label appears. The approach to the archive — the most settled section — is deliberately more open. A rest moment before the most receded books.
  - **"archive" label stepped indent** — `paddingLeft: 10` added. The diagonal completes: finished is 4px in, archive is 10px in. The compositional step is now visible when all three dormant labels (set aside, finished, archive) are on screen — a subtle rightward recession that mirrors the temporal recession of the books themselves.

**Design decisions:**
- The label diagonal (0 → 0 → 4 → 10px) follows reading time direction, not visual weight — the oldest books are most inward. This is an editorial convention from newspaper typography.
- Row gap > column gap: in a 2-column grid, this makes each row a compositional unit while rows read as distinct beats. Standard editorial grid technique.
- The dormant suspension `paddingTop: 6` is conditional on > 0.5 ratio (majority cooling) — it only activates when the section has genuinely become a quiet zone.
- The archive `paddingTop: 16` is unconditional — the archive always deserves approach space.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 93 — 2026-05-21
**Theme:** Environmental Weather + Density Fields Pass

Architecture finding: After shelf ecology introduced one-hop neighborhood awareness (Session 92), the larger-scale issue was that different library regions still felt climatically uniform — the reading-now zone and the set-aside zone differed in label opacity and card cooling, but not in regional atmospheric quality. This pass introduced three region-scale environmental behaviors: reading-now warmth driven by total annotation mass, reading-now zone bottom dissolution, and dormant set-aside sections becoming slightly more diffuse as a collective weather system.

**Files modified:**

- `src/index.css`:
  - **`.reading-now-zone` bottom shadow** — Added `0 40px 48px -8px var(--color-cream, #FAF6EE)` to `box-shadow`. This creates a warm cream penumbra extending ~32px below the zone's bottom edge, fading over 48px. With `topo-gap-active: 5.5rem (88px)` of space after the zone, the shadow is fully contained in the gap. The zone no longer ends at a hard boundary — its warmth dissolves softly into the space below, creating atmospheric continuity toward the set-aside section.
  - **`html.dark .reading-now-zone`** — Added matching dark mode bottom shadow: `0 40px 48px -8px var(--color-cream, #0A1A1E)`. The dark background bleeds downward consistently.

- `src/components/library/Library.jsx`:
  - **`readingNowMass` computation** — Before the JSX return, sums total annotation weight across all reading-now books: `notes×0.045 + mysteries×0.09 + sessions×0.018`. This is the same scoring used by `bookPresence()`, applied across all currently-active reads rather than per-book.
  - **`zoneWarmthPct`** — `Math.min(30, Math.max(18, Math.round(18 + readingNowMass × 1.5)))`. Produces a continuous 18–30% gold-bg mix for the reading-now zone background. At mass=0 (no annotations): 18%. At mass=1: ~20% (matches old CSS default). At mass=4: ~24%. At mass=8+: 30% (cap). This replaces the binary `deep→26% / else→default` from Session 90.
  - **Reading-now zone inline style** — `background: color-mix(in srgb, var(--color-gold-bg) ${zoneWarmthPct}%, var(--color-cream))` (always provided). `padding: '26px 20px 18px'` added when `readingNowMass >= 6` (vs default 22px/14px T/B). A heavily annotated active reading field breathes slightly more — the zone expands with reading density.
  - **Set-aside dormant weather** — Section wrapper gets `style={{ filter: 'saturate(0.93)' }}` when `setAsideDormantRatio > 0.7`. When more than 70% of set-aside books have been cooling for 45+ days, the entire section becomes very slightly more diffuse as a collective weather system (7% saturation reduction at section level). Compounds minimally with existing card-level cooling (`.shelf-cooling: saturate(0.72)` → effective 0.67; `.shelf-silenced: saturate(0.42)` → effective 0.39).

**Environmental behavior summary:**
- `readingNowMass = 0` → zone warmth 18%, no expansion
- `readingNowMass = 4` → zone warmth 24%, no expansion
- `readingNowMass = 6` → zone warmth 27%, padding expands to 26px/18px
- `readingNowMass ≥ 8` → zone warmth 30% (cap), expanded padding
- `setAsideDormantRatio > 0.7` → section `saturate(0.93)` + label at 0.38 opacity

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 92 — 2026-05-21
**Theme:** Shelf Ecology + Inter-Book Relationships Pass

Architecture finding: After individual cards developed distinct internal atmosphere (Session 91), books still felt slightly too isolated from each other — each card rendering independently with no awareness of its neighbors. Real shelves are environments: a deeply annotated book stabilizes adjacent books; a shelf of dormant reads collectively quiets. This pass introduced neighborhood awareness into the library rendering without adding visible systems or random variation.

**Files modified:**

- `src/components/library/Library.jsx`:
  - **`setAsideLabelOpacity` computation** — Before the JSX, computes the ratio of set-aside books that have been dormant for 45+ days. If more than half the set-aside section is cooling, the section label fades from `0.52` → `0.38`. The whole shelf exhales together rather than just individual cards receding.
  - **Set-aside map: `(book, idx)`** — Map now receives index to enable neighbor lookup.
  - **Neighbor deep detection (set-aside)** — For each set-aside card, looks at `setAside[idx-1]` and `setAside[idx+1]`. If either is `deep`, `neighborDeep = true`.
  - **Drift neighbor stabilization (set-aside)** — `neighborDamp = 0.55` when `neighborDeep && p !== 'deep'`. Applied multiplicatively on top of existing presence damping. A deeply inhabited book anchors the local shelf rhythm — adjacent books drift less. A deep book with `dampFactor=0.25` plus a neighbor might produce drift near 0 for the neighbor if the neighbor itself is inhabited.
  - **Warmth inheritance (set-aside)** — Unannotated books (`p === ''`) adjacent to a deep book receive `background: 'color-mix(in srgb, #B8860B 3%, var(--color-card-base, #FDFAF5))'` as an inline background override. This replaces the CSS `background: var(--color-card-base)` with a very slightly warmer version. The inhabited book's warmth propagates one step outward. Note: `.surface-inhabited` and `.surface-inhabited-deep` use `!important` so they are immune — only truly unannotated cards receive the warmth.
  - **Finished map: `(book, idx)` + neighbor ecology** — Same drift stabilization logic applied to finished section. Deep neighbors damp adjacent finished-book drift by 0.55.

**Design principles applied:**
- All ecology is deterministic — same books always produce same neighborhood effects
- Ecology is non-announcing — no labels, no indicators, no visible signals
- Warmth propagation is one-hop only (no cascade) — a book's warmth reaches immediate neighbors, not the whole shelf
- Section label dormancy ratio is a cumulative signal — felt as environmental atmosphere, not metadata
- Drift stabilization produces a calm zone around inhabited books: deep book ≈ 0–1px drift; its unannotated neighbor ≈ 1–2px drift; books further away ≈ 2–3px drift

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 91 — 2026-05-21
**Theme:** Interior Atmosphere + Card Identity Pass

Architecture finding: After library composition became organically asymmetric (Sessions 89–90), individual book cards still felt structurally identical — all using the same internal padding, the same footer spacing, the same metadata weight distribution. A deeply inhabited active read and a 91-day abandoned book rendered with the same interior rhythm. This pass introduced eight graduated variations to card interior, all derived from `presence` and `daysSince`. No visible systems added — the variation is felt, not seen.

**Files modified:**

- `src/components/library/BookCard.jsx`:
  - **Interior padding by presence** — standard cards: `p-4` (unchanged). Deep non-hero cards: `p-5`. Hero/primary: `p-5` (unchanged). Deeply inhabited books earn more interior breathing room.
  - **Author gap by presence** — `mt-0.5` → `mt-1` for deep books. 2px additional separation between title and author name for books where annotation has deepened.
  - **Footer margin by presence** — `mt-3` (default) · `mt-3.5` (inhabited) · `mt-4` (deep). More breathing between the title block and the progress/meta footer for inhabited books. The footer of a deeply read book doesn't follow immediately.
  - **Chapter count color by state** — Active reading + deep presence: `ink-500` (warmer, more present). 45+ days dormant: `ink-300` (receding). Default: `ink-400`. The progress numbers carry different emotional weight depending on whether the read is alive or cooling.
  - **Percentage opacity by temporal distance** — 90+ days: 0.45. 45–89 days: 0.65. Recent: 1.0. A dormant book's progress percentage fades with the same logic as the date — the numbers recede as the reading recedes.
  - **Progress bar height by state** — Reading + deep/inhabited: `h-[3px]` (3px — perceptibly heavier). Very old (90+d): `h-px` (1px — barely there). Default: `h-0.5` (2px). The progress bar of an inhabited active read is physically heavier.
  - **Chapter→bar margin by state** — Deep: `mb-2` (8px). Cooling (45+d): `mb-1` (4px). Default: `mb-1.5` (6px). Footer middle-gap varies — more air before the progress bar for deep books, compressed for dormant ones.
  - **Date margin by temporal distance** — 45+d: `mt-1` (4px). Recent: `mt-2` (8px). Old dates compress as they recede; recent dates get slightly more breathing room.

**Design decisions:**
- All eight variations are deterministic — derived from presence and daysSince, not random
- Deep books gain interior space (padding, footer gap, author gap, bar mb) — they feel heavier and slower
- Dormant books compress interior space and dim metadata — they feel quieter and lighter
- No visible labels, no indicators, no system added — the difference is atmospheric
- Presence prop defaults to `''` in filtered/flat view, so variations only apply in grouped shelf view

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 90 — 2026-05-21
**Theme:** Organic Composition + Environmental Drift Pass

Architecture finding: After three passes dissolving surfaces, deepening atmosphere, and introducing editorial asymmetry (Sessions 87–89), the remaining issue was compositional rigidity — shelves still felt mechanically aligned and grid-perfect. Books in the same section appeared to occupy identical vertical positions, as if placed by an algorithm. Real shelves shaped by years of reading life have natural settling — books drift slightly to different heights, inhabited books feel anchored, dormant ones feel lighter. This pass introduced deterministic environmental drift without randomness, masonry, or visible system.

**Files modified:**

- `src/components/library/Library.jsx`:
  - **`bookDrift()` function** — Deterministic positional offset derived from book.id using a djb2-variant hash, mapped to −3 to +3 px. The same book always drifts the same amount regardless of sort order or session. Not random — stable, as if the book has found its place on the shelf.
  - **Set-aside card drift** — Applied `transform: translateY(${drift}px)` to each card wrapper, where drift is presence-damped (deep books: 25% of base drift, inhabited: 55%, default: 100%) and cooling-settled (90+ days: +2px extra, 45–89 days: +1px extra). Inhabited books anchor toward center; dormant books settle slightly lower.
  - **Finished card drift** — Base drift applied without presence damping (finished books don't have real-time cooling, so pure hash drift applies).
  - **Archive card drift** — Base drift +1px (archives settle one step further than finished).
  - **Multi-book reading-now primary lift** — When the primary book (readingNow[0]) has `deep` presence and is in a multi-book layout, its wrapper gets `transform: translateY(-2px)`. The most inhabited active book lifts slightly forward.
  - **Reading-now zone warmth by depth** — When readingNow[0] is `deep`, the zone section gets `background: color-mix(in srgb, var(--color-gold-bg) 26%, var(--color-cream))` inline — warmer than the CSS default 20%. Zone warmth responds to annotation depth.

- `src/index.css`:
  - **`.surface-inhabited-deep` shadow** — `0 5px 28px rgba(.15)` → `0 6px 32px rgba(.18)`, `0 1px 6px rgba(.09)` → `0 2px 8px rgba(.10)`. Deeply inhabited books cast a heavier shadow — more spatially grounded, more weight on the shelf.

**Design decisions:**
- Drift is deterministic (hash-based), not random — prevents visual "jumping" when sort order changes
- Presence-damped drift means deeply inhabited books barely drift (they've settled, anchored) while sparse books drift freely
- Cooling books get positive drift (sinking) — aligned with their cooling/silencing opacity treatment
- Primary reading-now lift is only −2px and only when deep — earned by annotation density, not applied universally
- Archive +1px base means archives settle visually lower than finished books

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 89 — 2026-05-21
**Theme:** Editorial Composition + Spatial Asymmetry Pass

Architecture finding: After two passes dissolving surface chrome and deepening atmospheric materiality, the remaining weakness was compositional uniformity — every shelf rendered as a consistent multi-column product grid, regardless of a book's presence, temporal state, or emotional weight. Set-aside, finished, and archive sections all used 3-column layouts indistinguishable from each other at large breakpoints. Notes transitioned from archival strata to current-era without compositional acknowledgment of the geological shift. Singularity chapters had top-margin silence but no trailing silence. This pass addressed all of these without adding new systems or data.

**Files modified:**

- `src/components/library/Library.jsx`:
  - **Reading-now multi-book grid** — `sm:grid-cols-2` → conditional `sm:grid-cols-[3fr_2fr]` when the primary book has `deep` presence. The most inhabited active book commands more horizontal space compositionally — asymmetry earned by annotation density, not decoration.
  - **Set-aside grid** — `sm:grid-cols-2 lg:grid-cols-3` → `sm:grid-cols-2`. Paused books no longer render as a 3-column product catalog. A 2-col max feels more editorial — these books are paused, not abandoned; they deserve presence without product-grid uniformity.
  - **Finished grid** — `sm:grid-cols-2 lg:grid-cols-3` → `sm:grid-cols-2`. Same treatment — dormant but not erased.
  - **Archive grid** — `gap-3` → `gap-2`. The most receded section compresses slightly further. Tightest gaps in the library.

- `src/index.css`:
  - **`.topo-gap-dormant`** — `2.75rem` → `3.25rem`. The gap between set-aside and finished sections widens. The two dormant sections now feel compositionally more distinct — not a single dormant mass, but two different forms of non-reading.

- `src/tabs/NotesTab.jsx`:
  - **Geological break** — When transitioning from archival notes (earlier reread era) to current-era notes in the rendered list, the first active-era note gets `marginTop: '2rem'`. The shift in reading strata deserves compositional silence — not a label, not a divider, just more breath. Logic: `precedingIsArchival = i > 0 && visible[i-1].rereadEra < book.rereadCount` → `geologicalBreak = !isArchival && precedingIsArchival`.

- `src/tabs/ProgressTab.jsx`:
  - **Singularity post-silence** — `{ marginTop: 10 }` → `{ marginTop: 10, marginBottom: 8 }`. Singularity chapters now breathe both before and after. Silence surrounds exceptional territory; arriving at a singularity and leaving it both deserve compositional pause.

**Verified:**
- Reading-now grid: `grid-cols-[3fr_2fr]` class applied when primary book is deep ✓
- Set-aside: no lg:grid-cols-3 — max 2 columns ✓
- Finished: no lg:grid-cols-3 — max 2 columns ✓
- Archive gap: `gap-2` (tighter) ✓
- topo-gap-dormant: `3.25rem` ✓
- Geological break: `marginTop: 2rem` on first active note after archival stratum ✓
- Singularity margin: `{ marginTop: 10, marginBottom: 8 }` ✓

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 88 — 2026-05-21
**Theme:** Material Atmosphere + Environmental Continuity Pass

Architecture finding: After the materiality pass dissolved borders and quieted chrome, the interface still carried a few digitally-rendered qualities: the page-entry animation had a vertical slide (`translateY(6px)`) that gave navigation a "new screen" feeling rather than an atmospheric transition. The sticky bar had a rigid hard-line bottom border that separated it from content below. Mathematical spacing uniformity — `space-y-3` between all notes, `py-2.5` on all completed chapters, `5rem` active gap in the library — reduced editorial rhythm. This pass addressed those residues without adding any new systems.

**Files modified:**

- `src/index.css`:
  - **`viewIn` keyframe** — `from { opacity: 0; transform: translateY(6px) }` → `from { opacity: 0 }`. Navigation now dissolves in rather than sliding up. Vertical shift was creating a "UI page load" feeling; pure opacity preserves atmospheric continuity.
  - **`.view-enter` duration** — `0.22s ease-out` → `0.38s ease`. Slower crossfade, more manuscript-paced.
  - **`.sticky-bar` bottom separator** — `border-bottom: 1px solid rgba(28,20,16,.04)` → `border-bottom: none` + `box-shadow: 0 1px 0 rgba(28,20,16,.04), 0 4px 8px rgba(250,246,238,.6)`. The hard edge is replaced with a warm fade-out gradient shadow — the bar blends into the page below rather than cutting across it.
  - **`.topo-gap-active`** — `5rem` → `5.5rem`. The reading-now zone breathes more against the set-aside section.
  - **`.shelf-title` margin-bottom** — `1.25rem` → `1.5rem`. More silence between section label and first book.
  - **`.reading-now-zone .shelf-title` margin-bottom** — `1.4rem` → `2rem`. The active reading area gets notably more breathing before the hero cards appear.
  - **Tab transition** — `color .18s ease` → `.25s ease`. Slightly slower state change, less UI-feeling.
  - **Dark mode sticky-bar** — `box-shadow: 0 1px 0 rgba(60,122,170,.05), 0 4px 8px rgba(10,26,30,.5)` — consistent dissolve treatment in dark mode.

- `src/components/library/Library.jsx`:
  - **Main padding** — `py-8 pb-20` → `pt-10 pb-24`. More generous breathing between the sticky search bar and the first content. Bottom space extended.
  - **Reading-now multi-book grid** — `gap-5` → `gap-6`. Hero zone gets slightly more air between concurrent reads.
  - **Finished section grid** — `gap-4` → `gap-3`. Dormant books compress slightly more — settled books take less space.

- `src/components/dashboard/BookDashboard.jsx`:
  - **Content padding** — `pt-7 pb-20` → `pt-9 pb-24`. Slightly more breathing between the sticky tab bar and tab content.

- `src/components/dashboard/CompanionHeader.jsx`:
  - **Bottom separator** — `1px solid var(--color-ink-100)` → `1px solid rgba(28,20,16,.04)`. The header-to-tab-bar join softens.

- `src/tabs/NotesTab.jsx`:
  - **Search bar border** — `border border-ink-200` class removed → inline `border: '1px solid rgba(28,20,16,.06)'`. Now matches the library search bar's near-invisible edge.
  - **Search placeholder** — `placeholder-ink-400` → `placeholder-ink-300`. Prompt recedes further.
  - **Presence text margin** — `mb-4` → `mb-6`. More silence below the companion's note observation before the search/filter area.
  - **Filter/action row margin** — `mb-5` → `mb-7`. More editorial silence between the filter links and the note list itself.
  - **Note list spacing** — `space-y-3` → `space-y-4`. Notes breathe more between each other — the list reads as editorial column, not UI tile grid.
  - **Archival note padding** — `p-4` → `p-5`. Archaeological notes get more interior space — their geological weight is physically expressed. Active notes remain `p-4`.

- `src/tabs/MysteriesTab.jsx`:
  - **Filter/action row margin** — `mb-5` → `mb-7`. More silence before the mystery threads begin.
  - **Mystery list spacing** — `space-y-2` → `space-y-3`. Threads breathe more — each mystery gets slightly more presence.

- `src/tabs/ProgressTab.jsx`:
  - **Chapter → visits breathing** — `mb-12` → `mb-16`. Significantly more silence between the chapter list and the reading history (visits) section.
  - **Completed chapter padding** — `py-2.5` → `py-2`. Completed chapters have settled. They take slightly less vertical space than active/upcoming chapters (`py-2.5`) — the hierarchy of lived-through vs live is expressed through spatial settlement.
  - **Important/singularity chapters** — `py-3.5` unchanged. The contrast between settled completed chapters (`py-2`) and weighted chapters (`py-3.5`) increases.

**Verified:**
- Navigation to book: pure opacity crossfade (no vertical shift) ✓
- Notes search border: `rgba(28,20,16,.06)` ✓
- Completed chapter padding: `py-2` (8px) vs important `py-3.5` (14px) ✓
- Archival notes: `p-5` (20px) vs active `p-4` (16px) ✓
- Sticky bar: shadow-based dissolve, no hard border line ✓

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 87 — 2026-05-21
**Theme:** Materiality Pass — Material Atmosphere and Environmental Depth

Architecture finding: After Milestones 8 and 9 introduced environmental systems (temporal cooling, inhabitation depth, spatial memory), the interface itself still carried too much "software" surface energy. Borders were crisp. Sticky bars blurred with 10px of gaussian smear. Note cards had 1px perimeter lines. The search input had a clearly defined `border-ink-200` edge. This pass removed those digital tells — dissolving borders, deepening the paper grain, softening the ambient gradient — without adding any new feature or system. The goal was to make the environment feel less rendered and more inhabited. Nothing visible was added; everything that was removed created more space.

**Files modified:**

- `src/index.css`:
  - **`.note-card` border removed** — `border: 1px solid rgba(28,20,16,.025)` → `border: none`. Note cards are now defined entirely by shadow. The visual boundary is felt rather than drawn.
  - **`.atmospheric-card` border thinned** — `rgba(28,20,16,.030)` → `.018`. The card edge retreats further toward the ambient surface.
  - **`.session-row` border** — `var(--color-ink-100)` → `rgba(28,20,16,.04)`. Reading history dividers become nearly invisible — the list structure is implied, not drawn.
  - **`.sticky-bar` blur reduced** — `blur(10px)` → `blur(6px)`. Less frosted-glass-product-energy; the bar dissolves more naturally into the page surface.
  - **`.sticky-bar` and `.sticky-bottom-bar` border** — `var(--color-ink-100)` → `rgba(28,20,16,.04)`. Sticky bar separator disappears.
  - **Grain overlay depth** — `opacity: 0.022` → `0.028`. The paper texture is more present — the substrate asserts itself slightly more against the digital render.
  - **Ambient gradient upper-left warmth** — `rgba(210,195,150,.11)` → `.14`. The page's editorial window-light warms.
  - **Ambient gradient lower-right gold** — `rgba(184,134,11,.042)` → `.055`. Companion warmth in the corner deepens.
  - **`.filter-link` color** — `var(--color-ink-400)` → `var(--color-ink-300)`. Filter tabs are ghosts until engaged. Active state remains ink-800 italic serif.
  - **Dark mode note-card** — `border-color` rule → `border: none`. Consistent across both modes.
  - **Dark mode atmospheric-card border** — `.06` → `.04`. Consistent thinning in dark mode.

- `src/components/library/Library.jsx`:
  - **Search bar border** — `border border-ink-200` class → inline `style={{ border: '1px solid rgba(28,20,16,.06)' }}`. The input field nearly disappears until focused.
  - **Search icon** — `text-ink-400` class → inline `color: var(--color-ink-300)`. The magnifying glass recedes.
  - **Placeholder text** — `placeholder-ink-400` → `placeholder-ink-300`. The prompt-text is quieter.
  - **Filter dot separators** — `var(--color-ink-200)` → `var(--color-ink-100)`. The `·` between filter links becomes near-invisible.
  - **Archive grid gap** — `gap-4` → `gap-3`. Archived books sit slightly closer together — the archive compresses slightly; books are dormant and take less space.

- `src/components/library/BookCard.jsx`:
  - **Author color temporal gradient** — three-tier system added:
    - `daysSince > 90` → `var(--color-ink-200)` — long absence, author name near-silent
    - `daysSince > 45` → `var(--color-ink-300)` — cooling, author name receding
    - default → `var(--color-ink-500)` — present and warm
  - **Cover shadow cooling** — `coverShadowOpacity` introduced: `daysSince > 90 → 0.70`. Abandoned books' covers lose depth — the light has moved on.
  - **Verified:** Artemis (1 day) → ink-500 | Sapiens (50 days) → ink-300 | Duma Key (91 days) → ink-200.

- `src/tabs/NotesTab.jsx`:
  - **Note footer date** — `text-[11px] text-ink-400` → `fontSize: 10, color: var(--color-ink-300)`. Dates recede into the note surface.
  - **"revisited" marker** — inline style at 10px ink-300. Consistent with date.
  - **"reflect" action** — `text-[11px] text-ink-300` → `fontSize: 10, color: var(--color-ink-300)` with inline style. Still italic.
  - **"edit" action** — `text-[11px] text-ink-400` → `fontSize: 10, color: var(--color-ink-300)`, label lowercased ("Edit" → "edit").
  - **"remove" action** — inline 10px, ink-300 italic. Consistent quiet.
  - **"Keep it" action** — inline 10px ink-300.
  - All footer actions are now 10px vs 11px. The micro-chrome of the note surface has settled into near-silence.

- `src/tabs/ProgressTab.jsx`:
  - **Session aging expanded** — three-tier temporal recession:
    - `sessionAge > 90 days` → `opacity: 0.28` — deep recession, geological
    - `sessionAge > 60 days` → `opacity: 0.42` — settled, significantly receded
    - `sessionAge > 30 days` → `opacity: 0.65` — aging, present but cooling
    - Recent → `opacity: 1` — fully present
  - **Font size aging** — `deepAged (>60 days)`: date shrinks from 11px → 10px, chapter range from 12px → 11px, duration label from 11px → 10px. Old sessions take up less typographic space.
  - **Color aging** — `deepAged`: date → ink-200, chapter range → ink-300. Earlier tiers remain ink-300/ink-400. Recent sessions → ink-400/ink-700.
  - **Singularity breathing** — singularity chapters (rare, significant) now receive `marginTop: 10px` before them in the chapter list — a breath before entering exceptional territory. Applied only to completed singularity chapters.
  - **Verified:** Ocean at the End of the Lane — May 2026 sessions (second reading) → opacity 1 | Nov 2025 sessions (first reading, 195+ days) → opacity 0.28.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields** | **No new systems**

---

## Session 86 — 2026-05-21
**Theme:** Track B Milestone 9 — "Spatial Memory" — The Environment Remembers the Reader

Architecture finding: A library that applies equal visual weight to all books ignores the most important dimension Lantern has access to: time. An abandoned book is not the same as an active one. A mystery in a book that hasn't been touched in 91 days is not the same as a mystery in a book read three days ago. This pass made those differences felt through graduated environmental states — cooling, silencing, archaeological layering — without any visible system, label, or metric. The environment now literally changes in response to reading history.

**Files modified:**

- `src/index.css`:
  - **`.card-dissolved`** — deeply inhabited books lose their border entirely; shadow and warm tint define the boundary. Declared with `border: none !important`.
  - **`.shelf-cooling`** — paused books 45–89 days: `opacity: 0.70`, `filter: saturate(0.72)`. The book is receding but still present. Hover restores to 0.92 + full saturation.
  - **`.shelf-silenced`** — paused books 90+ days: `opacity: 0.38`, `filter: saturate(0.42) brightness(0.99)`. Near-ghostlike — the long absence speaks. Hover restores to 0.70 + saturate(0.78). The book stirs back when looked at.
  - **`.note-archival`** — notes from a previous reading era: `background: var(--color-card-archival, #F5EFE4)`. Settled parchment rather than clean card-base.
  - Dark mode variants for all new classes.

- `src/components/library/Library.jsx`:
  - **Graduated set-aside cooling:** `daysOld > 90 → shelf-silenced`, `daysOld > 45 → shelf-cooling`. Duma Key (91 days) silenced; Sapiens (49 days) cooling. Wild Dark Shore (46 days) cooling.
  - **Residue padding (spatial memory):** `deep` presence books get `paddingBottom: 10px`, `inhabited` books get `paddingBottom: 5px` within grid cells — creates a felt gravity field around heavily annotated books. On mobile, this makes the unevenness clearly legible.
  - **Card dissolution for inhabited set-aside/finished books:** `card-dissolved` class applied alongside `surface-inhabited-deep` — border removed, pure shadow boundary.
  - **Presence scoring on finished books:** Republic of Thieves (2 notes + 2 mysteries → inhabited) now carries `surface-inhabited` warmth even in dormancy.
  - **Section label graduation:** "reading now" 0.80 (warmest), "set aside" 0.52, "finished" 0.42, "archive" 0.32. Labels recede toward silence in proportion to section temperature.

- `src/components/library/BookCard.jsx`:
  - **Dynamic title size:** `presence === 'deep'` in non-hero cards → `fontSize: 16px` (vs 15px default). Inhabited books assert themselves typographically.

- `src/tabs/NotesTab.jsx`:
  - **Archival note detection:** `isArchival = note.rereadEra !== undefined && note.rereadEra < (book.rereadCount || 0)`. Correctly identifies Ocean at the End of the Lane's Nov 2025 notes (era 0) as archival under the current second reading (rereadCount: 1).
  - **Archival surface:** `note-archival` class + inline `background: var(--color-card-archival)` — settled parchment.
  - **Expanded breathing:** `leading-loose` (vs `leading-relaxed`) for archival note body text — older thoughts sit with more air.
  - **"· earlier reading" indicator:** 9px italic ink-300 appended to the note footer date. Quiet geological marker.

- `src/tabs/MysteriesTab.jsx`:
  - **Book temporal inheritance:** `bookDaysSince` computed from `book.lastUpdated`. Mysteries in abandoned books recede with the book.
  - **Environmental cooling condition:** `isEnvironmentallyQuiet = m.status === 'dormant' || bookDaysSince > 90`. Applied to all non-resolved, non-veiled mysteries in very old books.
  - **Graduated opacity:** haunted mysteries at 0.60 (more present — they resist the silence), persistent at 0.50, others at 0.40. Filter `saturate(0.50)` for non-haunted.
  - **Book cooling (45–90 days):** `isBookCooling → 0.78 opacity`. Mysteries in cooling books gently recede.

**Milestone 9 deliverables — 9 summaries:**

1. **New spatial memory systems:** The library now has three environmental temperature states: active (full color, warm), cooling (45–89 days: opacity 0.70, desaturated), and silenced (90+ days: opacity 0.38, near-ghostlike). These apply to both the book card in the library AND propagate into the book's mysteries tab — mysteries in an abandoned book recede with it. Residue padding creates subtle felt gravity fields around deeply inhabited books in the grid.

2. **Archaeology/reread evolution:** Notes from previous reading eras (detected via `note.rereadEra < book.rereadCount`) now occupy a distinct visual stratum — settled parchment surface (`#F5EFE4`), expanded line-height, and a "· earlier reading" geological marker in the footer. For Ocean at the End of the Lane, the Nov 2025 notes (era 0) and the May 2026 notes (era 1) sit in visually distinct layers without any explicit divider. The transition between strata is felt, not announced.

3. **Environmental continuity changes:** The mystery tab inherits the book's temporal temperature. Duma Key's mysteries (91 days silent) appear at 0.40 opacity with desaturation — the questions are still there but they've grown quiet with the book. Artemis mysteries (3 days, active) are fully vivid. This creates a coherent environmental state across surfaces — the book's abandonment is expressed not just on its library card but inside its mystery threads too.

4. **Library evolution:** The library now reads as a genuinely uneven landscape. Section labels graduate from near-invisible ("archive" at 0.32) to quiet ("finished" at 0.42) to receded ("set aside" at 0.52) to slightly present ("reading now" at 0.80). The sections themselves barely announce themselves; the books within them have the voice. Deeply inhabited finished books (Republic of Thieves) carry warmth even in dormancy — their annotation history persists as surface temperature.

5. **Interface dissolution progress:** Card borders are removed entirely for deeply inhabited books (`card-dissolved`) — the boundary is defined by shadow and warm tint alone. Section labels have retreated from organizational markers toward atmospheric whispers. The "set aside" and "finished" headings at 0.42–0.52 opacity barely exist as UI chrome; they read as environmental texture.

6. **Companion-environment integration:** The companion's voice in the mystery tab already varied by mystery age (getMysteryGravity). Now the card surface temperature matches what the companion says — a mystery the companion describes as having been "circling for a long time" also has a physically receded card appearance in an abandoned book. The haunt level moderates the visual cooling: haunted mysteries resist abandonment-induced fading more than cooling ones.

7. **Strongest "literary place" breakthroughs:** (a) Duma Key ghosting — a 91-day abandoned book becoming near-invisible on the shelf is the single most powerful spatial memory demonstration. Without text, numbers, or indicators, the reader feels the absence. (b) Geological note strata — Ocean's Nov 2025 and May 2026 notes in distinct visual layers, the older thoughts settled into parchment while the newer ones remain bright. (c) Mystery environmental inheritance — the temperature of the book propagating into its open questions. (d) Section label recession — "archive" at opacity 0.32 barely existing as UI, becoming part of the atmospheric texture.

8. **Remaining "software feeling" surfaces:** The search input bar still reads as a standard UI component — rounded, bordered, magnifying-glass icon, all crisp. The filter tabs ("All · Reading · Finished · set aside") still feel like navigation links. The "recent / a–z / furthest" sort selector is a native HTML `<select>`. The "New Companion" button in the nav carries strong SaaS product energy. The book detail header's "update chapter · put this aside · mark as finished" quick-actions row still feels like a button row.

9. **Next milestone recommendation:** Milestone 10 — "The Settled Surface" — dissolve the remaining hard software edges. The search bar should feel more like a manuscript annotation field than a UI input. The quick-action row in the book header should dissolve into gestural language. The nav button energy should soften. The filter tabs should feel more like marginal notations than product navigation. The goal: every interaction surface in the app should feel like something you'd find in a physical literary object, not a SaaS dashboard.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields**

---

## Session 85 — 2026-05-21
**Theme:** Track B Milestone 8 — "The Lived-In Library" — Inhabitation Pass

Architecture finding: A library that displays books equally has no emotional topography. After milestone 7 introduced 10 books with genuine reading variety — rereads, burst-gap-burst sessions, sparse annotators, obsessive theorists — the library's flat visual weight became a design problem. Every card had the same shadow, the same padding, the same title size. The solution was not to add information (progress stats, streak numbers, metrics) but to let annotation depth, temporal recency, and reading intensity reshape the surface itself. The result is a library that feels geographically differentiated: some books carry presence, some are cooling, some are nearly silent.

**Files modified:**

- `src/components/library/Library.jsx`:
  - **Bug fix:** `bookPresence()` was reading `book.readingSessions` (doesn't exist) instead of `book.readingLog`. Sessions never contributed to presence scores. Fixed.
  - **Minimum annotation threshold:** `if (notes + mysteries < 4) return ''` — ensures sparse annotators (Wild Dark Shore: 2 notes + 1 mystery = 3) register as absent rather than leaking into inhabited tier from sessions alone.
  - **Reread bonus:** `rereadCount > 0` adds `+0.14` to presence score. Rereads carry layered emotional weight that merits surface recognition.
  - **Multi-book asymmetry:** In multi-book reading-now view, first book (most recently updated) gets `isPrimary = true` → `reading-hero-primary` CSS class + larger cover (72px) + larger title (18px) + extra padding. Asymmetric visual weight in the active zone.
  - **✦ glyph before "reading now":** Small gold asterism at 8px/0.55 opacity, vertically centered, before the shelf-title — not decorative chrome but a felt atmospheric marker.
  - **Filter vocabulary fix:** "Paused" → "set aside" — now matches the grouped section label for vocabulary consistency.

- `src/components/library/BookCard.jsx`:
  - **Temporal receding dates:** `daysSince` computed from `lastUpdated`. Date color: >60 days → `ink-200` (near-invisible silence), >14 days → `ink-300` (receding), recent → `ink-400` (present). Time-distance felt, not displayed.
  - **Status dot cooling:** Paused books >60 days old get dot color `ink-200`. The dot itself cools with the book.
  - **Primary prop:** New `primary` prop. Cover size 72×106px (vs hero 68×100px, default 56×84px). Title 18px (vs hero 17px, default 15px). Gap/padding gap-5 p-5 for primary/hero.
  - **Inhabited cover shadows:** `presence === 'deep'` → stronger, warmer shadow. `presence === 'inhabited'` → intermediate depth.

- `src/index.css`:
  - **`reading-now-zone`:** Gold-bg warmth strengthened 12% → 20%. Padding increased to 22px top. Inset top shadow added (`rgba(184,134,11,.055)`) — warmth felt from beneath the surface.
  - **`surface-inhabited`:** Added 5% gold-bg warm tint via `color-mix()`. Barely perceptible — felt rather than seen.
  - **`surface-inhabited-deep`:** 10% gold-bg warm tint. Stronger shadow depth.
  - **`reading-hero-primary`:** New class — stronger layered box-shadow for the primary book in multi-reading-now view.
  - **Topographic gaps widened:** `topo-gap-active` 4.5rem → 5rem. `topo-gap-dormant` 2.5rem → 2.75rem. `shelf-title` margin-bottom 1.1rem → 1.25rem.
  - **`.reading-now-zone .shelf-title`:** 12px, opacity 0.80, margin-bottom 1.4rem — slightly receded zone title because the books below are the voice.

- `src/tabs/ProgressTab.jsx`:
  - **Chapter list breathing:** `space-y-1.5` → `space-y-2`, `mb-10` → `mb-12`. More breath between chapters.
  - **Important/singularity chapters:** `py-3.5` (was `py-2.5`) — heavier chapters sit with more weight.
  - **Progress block spacing:** `mb-8` → `mb-10`.
  - **Singularity ring opacity:** Completed chapter rings: `opacity: 0.55` default → `0.75` for singularity chapters. Chapters with high annotation gravity carry a brighter ring — they earned it.

**Milestone 8 deliverables — 9 summaries:**

1. **Architectural/topographic changes:** The library is now a landscape, not a list. Reading-now sits in a warm enclosed zone (gold-bg tint, inset shadow, rounded container). Topographic gaps separate sections by felt distance — 5rem active to dormant, 2.75rem dormant to finished, 1.5rem to archive. Books within the active zone now have asymmetric visual weight: the primary book (most recently touched) is larger, heavier, warmer.

2. **Library evolution:** From a flat grid of equal cards to a surface that tells you which books are alive without stating it. Inhabited books carry warmth; dormant books cool; temporally distant books fade toward silence. The reading-now zone pulses slightly warmer than the rest of the shelf.

3. **Card dissolution changes:** Cards now have no sharp psychological boundary for inhabited books — the warm tint bleeds into the zone background, the shadow depth increases with annotation density, and the cover shadow intensifies. The card border remains but reads more like a paper edge than a UI container.

4. **Typography hierarchy refinements:** `reading-now` shelf-title recedes slightly (opacity 0.80, 12px) — the zone title steps back because the books below are the voice. Chapter list breathing increased. Important and singularity chapters sit with more vertical room. Finished chapter titles use `line-through` at reduced opacity to mark passage without erasure.

5. **Environmental companion integration:** The ✦ glyph before "reading now" is not decorative — it's the same asterism used across PresenceStrip and CompanionOrientation. The surface shares a vocabulary with the companion without adding text. Inhabited surfaces carry warm tints that accumulate from annotation rather than being assigned.

6. **Residency testing discoveries:** Wild Dark Shore (sparse annotator) correctly registers no presence — 2 notes + 1 mystery = 3, below the minimum threshold of 4. Ocean (rereader) gets reread bonus (+0.14) which tips it toward deep alongside its 6 notes. Artemis (systematic tracker) with 6 notes + 5 mysteries scores deep without any session contribution. The `readingSessions` bug fix meant sessions (Duma Key's 3 sessions, Ocean's 6) now correctly contribute to scoring rather than silently returning 0.

7. **Remaining "software feeling" surfaces:** The search bar still reads as a standard input. The sort dropdown is visually minimal but still a native `<select>`. The "set aside" section header could breathe more from the "reading now" zone on low-book-count shelves. The chapter list edit button (pencil icon) still feels transactional — it appears on hover but its icon is standard UI chrome.

8. **Strongest atmospheric breakthroughs:** (a) Temporal date receding — the date color fading to near-invisibility for books untouched for 60+ days communicates silence without any text change. (b) Status dot cooling for paused books — the dot itself dims alongside the date, doubling the signal without redundancy. (c) Reading-now zone inset shadow — the warmth appears to emanate from within the surface, not be applied to it. (d) ✦ glyph before "reading now" — small, precise, typographically appropriate; the zone acquires a soft marker without a label.

9. **Next milestone recommendation:** Milestone 9 — "Temporal Layering" — focus on how Lantern handles the passage of time across multiple sessions: (a) Note aging — older notes visually recede within the Notes tab; (b) Mystery dormancy — mysteries untouched across many sessions get a dormancy indicator; (c) Session history atmospheric rendering in ProgressTab — instead of a flat list, visits have visual depth; (d) The book detail header should express how long the reader has been with this book (not as a stat, as felt weight). Time is the dimension Lantern has access to that no other reading tool uses atmospherically.

**Build:** clean ✓ | **localStorage keys:** unchanged ✓ | **No new schema fields**

---

## Session 84 — 2026-05-21
**Theme:** Track B Milestone 7 — "Companion Residency" — Simulated Reading Histories + Data Layer

Architecture finding: Orchestration systems that work correctly under demo data can still fail silently under real literary conditions — books with 56 chapters, 90-day silence gaps, rereads, burst-gap-burst patterns, sparse annotators, nonfiction argument structures. Building toward correctness without pressure-testing against genuine reading variety produces a companion tuned to ideal cases. This milestone introduced a residency corpus: 5 EPUBs with 5 carefully designed simulated reader archetypes, each exposing a different class of orchestration stress.

**Files created / added:**

- `residency/README.md`:
  - Purpose, anti-summary philosophy, corpus categories, orchestration goals, testing instructions
  - Category breakdown: `/atmospheric/`, `/mystery/`, `/nonfiction/`, `/ensemble/`, `/rereads/`
  - 8 orchestration goals documented (cadence fatigue, silence confidence failure, haunt score saturation, etc.)

- `residency/simulations/archetypes.md`:
  - 5 complete archetype descriptions: Emotional Reactor/Abandoner (Duma Key), Rereader (Ocean), Systematic Mystery Tracker (Artemis), Obsessive Theorist/Long-Gap (Sapiens), Sparse Annotator (Wild Dark Shore)
  - Per archetype: reading shape, why it tests Lantern, note profile, mystery profile, expected orchestration behavior, known stress points

- `src/data/books.js` — **5 new INITIAL_BOOKS entries:**
  - `dumakey` — Duma Key (Stephen King). Status: paused. Ch. 22/56. Three sessions Feb 14–19 (all 91–96 days ago). 5 notes (all Feb, all aged): 1 favorite, 2 confusing, 2 theory; one theory note has `revisedAt`. 3 mysteries: Perse (open, overlaps theory keywords), painting ability (suspected), Elizabeth history (open, dormant). mood: ember.
  - `ocean` — The Ocean at the End of the Lane (Gaiman). Status: reading. Ch. 15/19. `rereadCount: 1`. 6 sessions across 2 eras: Nov 2025 (era 0, 3 sessions, finished first reading) + Apr–May 2026 (era 1, 3 sessions, currently near end of second reading). 6 notes with `rereadEra` field: 3 archival (Nov 2025) + 3 active (Apr–May 2026); era 0 theory note has `revisedAt`. 2 mysteries both carrying `observation` fields added during reread. mood: gold.
  - `artemis_book` — Artemis (Andy Weir). Status: reading. Ch. 17/24. 7 sessions Apr 10–May 18 (regular cadence, 4–8 day intervals). 6 notes: 5 theory + 1 character; all have `chapter` field set; no `revisedAt`. 5 mysteries in various states: open (2), suspected (2), evolving (1). mood: steel.
  - `sapiens_book` — Sapiens (Harari). Status: paused. Ch. 12/20. Burst-gap-burst reading: Jan 15/18/22 → 40-day gap → Mar 3/8 → 25-day gap → Apr 2 (last session, 49 days ago). 7 notes: 4 theory, 2 confusing, 1 favorite; 2 have `revisedAt`; all have `chapter` field. 3 nonfiction "open question" mysteries — one with `observation`. mood: gold.
  - `wilddark` — Wild Dark Shore (McConaghy). Status: reading. Ch. 6/22. 2 sessions: Mar 20 + Apr 5 (46 days ago). 2 notes: both theme-tagged, no chapter numbers, no `revisedAt`. 1 mystery: open, no observation. mood: steel.

**Orchestration behaviors observed under residency data:**

- `detectSilenceGap` correctly distinguishes 91-day gap (Duma Key: "A long time away from this story / It hasn't changed. You have.") from 49-day gap (Sapiens: "Over a month since your last visit / Everything in the story is still here.") — tone shifts appropriately without hardcoded branching
- `rereadCount: 1` badge ("2nd reading") surfaces on Ocean in library view and dashboard header
- Theory note `revisedAt` field renders as "· revisited" on note cards (Duma Key, Ocean)
- 5-mystery haunt scoring (Artemis): oldest suspected mystery (ch. 8) gets strongest companion observation; evolving mystery gets "each chapter seems to reframe this slightly"; newest open mystery (ch. 16) gets none
- Theory cross-surface bleed fires correctly in Artemis (≥3 theory notes + ≥2 active mysteries): "Some of what you've been theorising may already be moving toward these."
- Sparse annotator (Wild Dark Shore): Notes filter bar shows only "Theme" tab — no Theory/Confusing tabs because none exist. Companion ambient line minimal. No theory residue pushed.
- Era differentiation (Ocean): Nov 2025 notes render with temporal aging; Apr–May 2026 notes render bright/active. Filter tabs correctly limited to present tag types.

**Design decisions:**
- `rereadCount` added as top-level book field; `rereadEra` on individual notes mirrors the existing pattern on readingLog entries
- `observation` added to mystery objects for carrying reread-era annotations forward
- `chapter` on notes enables ordinal cross-surface scoring; added for systematic readers (Artemis, Sapiens), deliberately absent for sparse readers (Wild Dark Shore)
- Residency EPUBs categorized by reading mode, not genre — atmospheric books test companion recession; mystery books test haunt density; nonfiction tests whether the mystery/theory systems make semantic sense under argumentative (not narrative) structure

**New schema fields introduced (backwards-compatible, graceful fallback if absent):**
- `book.rereadCount` (number) — count of completed rereads; 0 or absent = first reading
- `note.rereadEra` (number) — which reading era this note belongs to
- `note.chapter` (number) — chapter number when note was added
- `note.revisedAt` (ISO date string) — date note was revised; renders as "· revisited" on card
- `mystery.observation` (string) — annotation added to an existing mystery (e.g., during a reread)

**Build:** clean ✓ | **localStorage:** keys unchanged ✓ | **INITIAL_BOOKS:** now 10 entries (5 original + 5 residency)

---

## Session 83 — 2026-05-21
**Theme:** Track B Milestone 6 — "The Inhabited Page" — Cross-Surface Continuity + Tab Dissolution Pass

Architecture finding: After five milestones of structural softening and language refinement, the book detail still carried residual mode-switch psychology. Tab transitions announced themselves with motion; the Discussion tab was framed as a product feature ("Questions worth sitting with" / uppercase header / gold card / sage backgrounds); Characters and Mysteries still used `+` icon CTAs that read as software buttons. This pass converted the entire surface — not feature by feature, but philosophically: every surface should feel like a layer of the same inhabited manuscript.

**Files changed:**

- `src/index.css`:
  - `tabIn` keyframe: `from { opacity: 0; transform: translateY(4px) }` → `from { opacity: 0 }` — pure opacity fade, no translate. Eliminates the "new screen arriving" sensation.
  - `--animate-tab-in` duration: `0.22s` → `0.35s` — manuscript-paced. Slower than app, faster than dramatic.

- `src/components/dashboard/BookDashboard.jsx`:
  - `"Discussion"` tab label → `"Wondering"` — private, literary, interrogative; not a product feature name
  - `useEffect` scroll-to-top on tab change removed. Tabs no longer reset the reading position. Moving between tabs now feels like turning between folded sections of the same document, not navigating to a new page.

- `src/tabs/CharactersTab.jsx`:
  - `<SectionHeading>Main Characters</SectionHeading>` → `<SectionHeading>figures</SectionHeading>`
  - `<SectionHeading>Secondary Characters</SectionHeading>` → `<SectionHeading>also present</SectionHeading>`
  - `"Add a character"` button (`<Ico.Plus /> font-semibold`) → `"name a figure →"` (12px italic text link, no icon)
  - `"Add the first character →"` empty state action → `"name the first figure →"` (italic text link)
  - `"+ Add connection"` inside CharCard relationship panel → `"note a connection →"` (italic text link, no icon)
  - Cross-surface residue: `showMysteryBleed` — if ≥2 open mysteries AND notes mention character first names, render ambient line: *"The open questions are still circling some of these figures."* (11px italic ink-400)

- `src/tabs/MysteriesTab.jsx`:
  - `"Open (N)"` filter label → `"open (N)"` (lowercase, matches "answered (N)")
  - `"Open a thread"` button (`<Ico.Plus /> font-semibold`) → `"raise a question →"` (12px italic text link, no icon)
  - `"+ add a thought"` / `"update thought"` thread actions → `"add to this"` (harmonized with NotesTab)
  - `"Refine"` → `"sharpen"` (literary verb for narrowing a question)
  - Cross-surface residue: `theoryNoteCount` — if ≥3 theory notes AND ≥2 open mysteries, render ambient line: *"Some of what you've been theorising may already be moving toward these."* (11px italic ink-400)

- `src/tabs/DiscussionTab.jsx` — **Full literary redesign:**
  - Removed: gold-bordered card frame (`rounded-xl p-4 border` with `ca-bg` fill), `<Ico.Chat />` icon, `"Questions worth sitting with"` uppercase header, `"For book clubs, journalling, or the quiet space between chapters."` description text
  - `discussionLine` now surfaces as standalone ambient italic paragraph (12px ink-500) — always shown if non-null, no card framing
  - Claude generate button: bordered pill → bare italic text link `"draw out questions →"` / `"draw out more →"` / `"thinking…"`
  - User question cards: `bg-sage-bg border-sage-pale` → `rounded-xl border border-ink-100` with `color-mix(cream-100)` background (sage purge — sage/green now fully absent from all surfaces)
  - `"Your question"` label on user cards → `"yours"` (11px italic ink-300 — same register as CharacterCard)
  - `SectionLabel "A question of your own"` removed — let the placeholder speak
  - Input panel: bordered card removed → bare `border-t border-ink-100 pt-5` separator; textarea sits on page surface
  - `"+ Keep this question"` → `"keep this →"` (12px italic text link, disabled state via `opacity-30`)
  - Placeholder: `"What are you carrying into the next chapter?"` → `"A question you're carrying into the next chapter…"`
  - Cross-surface residue (new): `oldestNote` — surfaces the oldest theory/confusing note as a 55%-opacity quoted block with date above the input panel (if notes.length ≥ 5). The reader's first analytical thought becomes ambient historical context for the Wondering space.
  - Removed `import { Ico }` and `import SectionLabel` (no longer used); added `import { fmtDate }`

**Design decisions (load-bearing):**
- No scroll-to-top on tab change. This is intentional. The tab bar scrolls into view; the content does not reset. If a user is deep in one section, switching tabs should feel like consulting a different layer of the same page, not loading a new one.
- `tabIn` has no translateY — any vertical motion signals "something arrived." Pure opacity is the only transition appropriate for pages.
- The oldest note residue in Wondering shows theory/confusing notes only (not all notes) — the Wondering space should echo interpretive/analytical thought, not observations or quotes.
- `"Wondering"` not `"Questions"` — "Questions" suggests a feature (like a Q&A section). "Wondering" suggests a mental state the reader is already in.
- Sage purge is now complete. No remaining sage/green surfaces in the app.

**Build:** clean ✓ | **localStorage:** untouched ✓

---

## Session 82 — 2026-05-21
**Theme:** Track B Milestone 5 — "Literary Sediment" — Voice Continuity + Temporal Texture Pass

Architecture finding: The previous four Track B milestones removed dashboard scaffolding (sidebar, status badges, progress bars, header fills, bold headings). What remained was softer in structure but still occasionally spoke in software — "sessions recorded," "Progress" tab, "Capture a thought," "Reading now" pill, "Resolved (N)." This pass swept the entire visible language surface and introduced temporal texture as an environmental quality rather than a data display.

**Files changed:**

- `src/components/dashboard/ReadingMomentum.jsx` — **Full rewrite + critical bug fix:**
  - Bug: `daysSince()`, `weeksSince()`, `recentCount()` operated on raw log objects `{date, startChapter, endChapter, ...}` — `new Date(objectInstance)` = `Invalid Date`; caused all contextual checks to fail, always showing the fallback.
  - Fix: import `logDates` from `../../utils/date.js` (canonical normalizer for both string[] and SessionEntry[] formats) and use in all three helpers.
  - Language: fallback `"N sessions recorded"` → `"N visits to the story"`, secondary labels `"3 sessions in 7 days"` → `"3 visits in 7 days"`, `"sessions total"` → `"visits total"`, `"Over a month since your last session"` → `"Over a month since your last visit"`, `"A week since your last session"` → `"A week since your last visit"`, `"N weeks with this book"` kept as-is.

- `src/components/dashboard/BookDashboard.jsx`:
  - Tab label: `"Progress"` → `"Reading"` (eliminates the single most SaaS-coded label in the dashboard)

- `src/components/dashboard/PresenceStrip.jsx`:
  - CTA button: `"Add a thought…"` → `"leave a mark…"` (lowercase, imperative, editorial)

- `src/components/dashboard/CompanionHeader.jsx`:
  - Stewardship menu: `"Edit companion"` → `"Edit"`, `"Export companion"` → `"Save a copy"` (companion-framing removed from menu verbs)

- `src/tabs/ProgressTab.jsx` — **Multiple language + temporal texture changes:**
  - Section headings: `"Reading history"` → `"chapters"`, `"Reading sessions"` → `"visits"`
  - Current-chapter pill badge (`"Reading now"` gold pill) → italic `"here"` (10px, gold, 75% opacity)
  - Next-chapter pill badge (`"Up next"` ink-100 pill) → italic `"next"` (10px, ink-300)
  - Session row fallback text: `"Session recorded"` → `"a visit"` (italic, ink-400)
  - Expand/collapse: `"Show all N sessions"` → `"show all N visits"`, `"Show fewer"` → `"show fewer"` (lowercase)
  - **Temporal aging:** Sessions > 30 days old render at `opacity: 0.65`, date color shifts to `var(--color-ink-300)`, chapter text to `var(--color-ink-400)`. Sessions within 30 days: full opacity, ink-400 date, ink-700 chapter. Settled history settles visually.

- `src/tabs/NotesTab.jsx`:
  - `+ Capture a thought` button (semibold, `<Ico.Plus />`) → `"leave a note →"` (12px italic, gold, no icon, text link)
  - `"+ reflect"` → `"reflect"` (removes `+` app-chrome prefix)
  - `"edit reflection"` → `"add to this"` (editorial continuity rather than editing framing)

- `src/tabs/MysteriesTab.jsx`:
  - Filter tab: `"Resolved (N)"` → `"answered (N)"` (lowercase, editorial register)

- `src/components/library/Library.jsx`:
  - Filter tabs: Converted from inline-style button grid to `.filter-link` class (text-only, serif italic active state) with `·` separators — same register as Notes/Mysteries tabs
  - Sort options: `"Recent"` → `"recent"`, `"A–Z"` → `"a–z"`, `"Progress"` → `"furthest"` (eliminated last uppercase + SaaS sort label)

**Deliverable summaries:**

### 1. Removed software-language patterns
| Was | Surface |
|-----|---------|
| `"N sessions recorded"` | ReadingMomentum fallback |
| `"3 sessions in 7 days"` | ReadingMomentum secondary |
| `"sessions total"` | ReadingMomentum secondary |
| `"Over a month since your last session"` | ReadingMomentum |
| `"A week since your last session"` | ReadingMomentum |
| `"Progress"` tab label | BookDashboard tab bar |
| `"Add a thought…"` | PresenceStrip CTA |
| `"Edit companion"` | Stewardship menu |
| `"Export companion"` | Stewardship menu |
| `"Reading history"` | ProgressTab section heading |
| `"Reading sessions"` | ProgressTab section heading |
| `"Reading now"` pill badge | Chapter list current position |
| `"Up next"` pill badge | Chapter list next chapter |
| `"Session recorded"` | Session row fallback |
| `"Show all N sessions"` / `"Show fewer"` | Session expand/collapse |
| `"+ Capture a thought"` button | NotesTab primary CTA |
| `"+ reflect"` | Note card action |
| `"edit reflection"` | Note card action |
| `"Resolved (N)"` | Mysteries filter tab |
| `"Recent"` / `"A–Z"` / `"Progress"` | Library sort options |
| Library filter: styled button grid | Library filter bar |

### 2. New editorial/literary phrasing systems
- **Visit vocabulary:** "session" fully replaced by "visit" across ProgressTab and ReadingMomentum. A visit is passive and observational; a session is operational.
- **Mark vocabulary:** PresenceStrip now uses "leave a mark…" — a physical metaphor for annotation without app-chrome framing.
- **Answer vocabulary:** Mysteries uses "answered" instead of "resolved" — the former belongs to reading; the latter belongs to ticketing.
- **Positional poetry:** Chapter list badges replaced by italic prose-words: *here* (gold, current), *next* (ink-300, upcoming). Badges dissolved to typography.
- **Action continuity:** `"leave a note →"`, `"reflect"`, `"add to this"` — all three notes actions now read as a reader's marginal vocabulary, not UI verbs.

### 3. Temporal texture implementations
- **Session aging threshold:** 30 days. Sessions older than 30 days: `opacity: 0.65` with softer ink levels (date → ink-300, chapter text → ink-400). Sessions within 30 days: full opacity, standard ink levels.
- **Visual settling:** Older history settles to the bottom of perception — it's still there but no longer competing with recent presence.
- **Transition:** `transition: opacity 0.2s ease` — the aging shift is gentle if items cross the threshold during a session (though practically invisible in normal use).

### 4. Reading-rhythm environmental changes
- **ReadingMomentum now functional:** Fixed the logDates bug — contextual rhythmic phrases ("A burst of reading," "About two weeks since you were last here," "Some time away. The book is patient.") now actually display based on real session data.
- **Duration labels in visit rows:** `"A brief return"`, `"A steady stretch"`, `"A long sitting"` — session duration expressed as qualitative texture rather than a number.
- **"a visit"** as the null-state label in a session row — the simplest possible expression of presence.

### 5. PresenceStrip evolution
- CTA compressed: `"Add a thought…"` → `"leave a mark…"` — lower explicitness, same invitation. The strip doesn't announce itself; it waits.
- Placeholder text `"A thought, question, or thread…"` retained — it's already in the right register.
- "Keep →" button retained — directional, forward-looking, not confirming.
- Dest chips ("Note" / "Theory" / "Mystery") retained — these classify destinations, not actions.

### 6. Library atmosphere refinements
- Filter bar: `.filter-link` class with `·` separators replaces the styled button grid. Same system as Notes/Mysteries — environmental text-link navigation rather than segmented control.
- Sort options: all lowercase, "Progress" → "furthest" — removes the last traces of data-management vocabulary from the library.
- Section headings "reading now" / "finished" / "set aside" / "archive" already in correct register from previous sessions.

### 7. Remaining "software feeling" language
- `"Open a thread"` in MysteriesTab — `+` icon prefix still present, though label is now literary
- `"+ add a thought"` on mystery cards — still carries the `+` app-chrome
- `"Refine"` on mystery cards — functional verb, not literary
- `"+ Add a character"` in CharactersTab — icon+label button, standard software CTA format
- `"Discussion"` tab label — generic; could be something like "questions" or "wonderings"
- `"Add a character"` / `"Edit"` / `"Remove"` — the characters tab still carries some operational language
- `"Save a copy"` in stewardship menu — "save" is still file-system vocabulary; "keep a copy" or "take a copy" would be more archival

### 8. Strongest new atmospheric moment
**The temporal aging of the visits list.** When older sessions fade to 65% opacity with softer colors, the visits list acquires genuine depth — recent presence presses forward, older visits recede. For a reader who has been with a book for months, the list becomes a sediment of time: bright recent entries above, quieter older ones below. This is not a visual trick — it's the first time Lantern expresses the passage of time as environmental quality rather than a count.

### 9. Recommended next Track B milestone
**Track B Milestone 6 — "The Inhabited Page"** — ChromeReduction + Mysteries/Characters Voice Pass
- Dissolve the `+` prefix from mystery and character CTAs (same treatment as Notes "leave a note →")
- Address `"+ add a thought"` on mystery cards — replace with editorial marginal vocabulary
- `"Refine"` on mystery cards → literary equivalent ("sharpen"? "extend"?)
- `"Discussion"` tab → "questions" or "wonderings"
- Investigate whether the Characters tab can soften its section headings ("Main Characters" / "Secondary Characters" → lowercase italic)
- `"Add a character"` → something closer to "name someone" or "mark a figure"
- Optional: examine whether `CompanionInsights` rotation text can feel more like marginalia than cycling prompts

**Build:** clean ✓ | **localStorage:** untouched ✓

---

## Session 81 — 2026-05-21
**Theme:** Track B Milestone 4 — "The Book as Document" (CompanionHeader Deconstruction + Architectural Continuity Pass)

Architecture finding: The CompanionHeader was the last major surface expressing dashboard/product-card logic: a zone label ("READING NOW"), a StatusBadge pill, a WeightedProgressBar, a chapter/percentage line, a gold CTA button, and a badge cluster for series/reread metadata. Everything was organized around classification and tracking rather than document and memory. This pass executed a philosophical redesign — not a cosmetic polish.

**Files changed:**

- `src/components/dashboard/CompanionHeader.jsx` — **Full architectural redesign:**
  - Removed imports: `StatusBadge`, `WeightedProgressBar`
  - Removed: uppercase zone label ("READING NOW" / "Paused" / "Finished"), `StatusBadge` pill, `WeightedProgressBar` + chapter/pct line, series badge widget, reread count widget, header background fill (`color-mix(cream-200 30%, cream)`), `<Ico.Refresh />` icon from update button
  - Transformed: "Update position" gold CTA button → text link `update chapter` in same 11px italic ink-400 register as lifecycle actions. Merged into one continuous action row: `update chapter · put this aside · mark as finished`
  - Series + reread count moved to quiet italic annotation at ink-300 below author line
  - Cover reduced: `w-[64px] h-[96px]` → `w-[50px] h-[75px]`, shadow softened (`boxShadow` reduced from dual-layer to `0 2px 10px rgba(0,0,0,.13), 0 1px 3px rgba(0,0,0,.07)`)
  - Header wrapper: background fill removed — inherits page surface for environmental continuity. Only structure: `borderBottom: '1px solid var(--color-ink-100)'`
  - Padding: `py-5` → `py-6`
  - Reextract success state: `bg-sage-bg border-sage-pale text-sage` → `bg-gold-bg border-gold-border text-ink-600` (eliminates last sage/green surface)
  - Lifecycle actions confirmed literary: `put this aside`, `pick this back up`, `begin again`, `the story ends here ✦` — all italic text links with `·` separators

- `src/tabs/ProgressTab.jsx`:
  - Upcoming chapter cards: `bg-cream-50 border border-ink-200 hover:border-ink-300` → `border border-ink-100 hover:border-ink-200` (transparent background — chapters emerge from page surface)
  - Near-end companion echo added: when `pct >= 85 && pct < 100`, renders *The weight shifts toward the end.* (10px, `.companion-echo`) below the manuscript spine. Appears near the end of the book; never shown for finished books.

- `src/index.css` — Added comment block documenting the `book-document-opening` architectural intent for future reference.

**Design decisions (load-bearing):**
- Header wrapper has NO background — page surface only. The book detail opens as a page, not a card.
- "update chapter" is a text link in the lifecycle actions row — same 11px italic ink-400 as "put this aside" and "mark as finished". No visual distinction from other lifecycle actions except placement.
- Cover is atmospheric thumbnail, not a product image — small enough to not dominate the title.
- Reread count + series folded into `metaAnnotation` computed string, rendered as a single `<p>` if non-empty. Uses `·` separator. Not shown if both are empty.
- `Ico.Refresh` removed from this file (was only used in the update button); `Ico` import kept because `<Ico.Dots />` is still used in the stewardship menu.
- `ReadingMomentum` remains — its literary text lines are appropriate; only the generic `"N sessions recorded"` fallback is identified as a future target (Milestone 5).
- `isFinished` completion text placed BEFORE the actions row — finished books show the archival statement first, then the quiet lifecycle links (begin again · archive).

**Remaining dashboard DNA (next pass):**
- `ReadingMomentum` fallback: `"N sessions recorded"` — only non-literary line remaining
- "Reading now" pill badge on current chapter in chapter list (the circle is sufficient)
- Stewardship menu copy: "Edit companion", "Export companion" — functional but app-framed
- `+ Capture a thought` button in NotesTab — `+` prefix reads as app chrome
- PresenceStrip "Add a thought…" — application language vs editorial voice

**Strongest new experiential moment:** The unified text-link action row at the book opening. *update chapter · put this aside · mark as finished* — three decisions in the reader's voice, no icons, no borders, no backgrounds. Indistinguishable from an editorial annotation in a reading journal.

**Build:** clean ✓ | **localStorage:** untouched ✓

---

## Session 80 — 2026-05-20
**Theme:** Track B — Surface Softening Pass (Architectural Continuity + Tab Dissolution + Companion Residue)

Architecture finding: After the Track B Overhaul (Session 79) removed the sidebar and frozen the accent palette, the reading surfaces still carried residual dashboard DNA — icon+label tab buttons, bold section headings, bordered session history containers, bright-white form inputs, and uniform typographic weight. This pass executed Phase 1–5 of a surface softening brief: tab dissolution, surface variety, typographic hierarchy expansion, companion residue embedding, and progressive chrome reduction.

**Files changed:**

- `src/index.css` — Tab bar: removed icons; active state gains `font-family: var(--font-serif)`, `font-style: italic`, `font-size: 12px` (from 11px sans), `border-bottom-color: rgba(184,134,11,.35)`. Inactive tabs: ink-400, no underline. Added `.filter-link` class (replaces pill filter buttons in Notes + Mysteries — text-only, serif italic when active). Added `.companion-echo` class (serif italic, ink-300 — for ambient residue text). Added `.session-row` class (bottom-border-only — dissolves session history card). `companion-orientation-block` padding: 14px/4px top/bottom → 20px/12px. Mobile tab height: 48px → 44px.

- `src/components/shared/SectionHeading.jsx` — `font-serif text-[15px] font-semibold text-ink-800` → 12px, normal weight, italic, ink-500. Section headings now read as manuscript annotations, not UI labels.

- `src/components/dashboard/BookDashboard.jsx` — Removed icons from `TABS` array entirely. Tab bar renders text-only labels; `Ico` import preserved (still used for `<Ico.Refresh />` in mobile sticky bottom bar).

- `src/tabs/NotesTab.jsx` — Filter pills → `.filter-link` text links with `·` separator dots. Added `mysteryChapters` useMemo (Set of open mystery chapter numbers from `book.mysteries`). Search input + add-note textarea: `bg-white` → `style={{ background: 'var(--color-card-base)' }}`. Companion residue: if `note.chapter` matches an open mystery chapter, shows *A thread from this chapter is still in motion.* (10px, companion-echo) beneath the note text. Chapter echo in note footer: if `note.chapter` exists, shows `· ch. N` at ink-300.

- `src/tabs/MysteriesTab.jsx` — Filter pills → `.filter-link` text links. Added `notesByChapter` useMemo (map of chapter→note count). Add-mystery textarea: `bg-white` → `style={{ background: 'var(--color-card-base)' }}`. Mystery metadata: "First appears" prefix removed — just `ch. N`. Note-density echo: if `notesByChapter[m.chapter] >= 2`, shows `· N thoughts then` (serif italic, ink-300). Chapter-duration echo for long-open mysteries: if open 8+ chapters beyond current, shows `· N ch. open` (ink-300 italic). Both echoes are companion residue — ambient, not announced.

- `src/tabs/ProgressTab.jsx` — CompanionOrientation first line: `font-size: 13px, font-serif italic, ink-500` (was 12px sans). Second line: 11px sans, ink-300. Session history container dissolved: removed `border border-ink-100 rounded-xl overflow-hidden` wrapper, switched each row to `.session-row` (bottom border only, `py-2.5` vertical rhythm).

**Design decisions (load-bearing):**
- Serif italic = the "present / noticed / charged" register. Active tabs, active filters, section headings, companion echo, orientation first line — all serif italic. This is the signal.
- Sans-serif = the ambient resting state. Inactive labels, secondary text, metadata.
- ink-300 = the residue tier. Companion echo and chapter footnotes are near-invisible at rest; they reward close reading.
- `note.chapter` is only set for notes created after Session 60. Demo/seed notes remain clean — residue is earned by use.
- `book.reflectionCache` must NOT be in PresenceStrip useEffect deps — causes save→trigger loop. Unchanged.
- `.filter-link` dot separators: wrapped in `<span key={t} className="flex items-center">` to support keyed siblings in `.map()` while maintaining inline flex alignment.
- `bg-white` → `var(--color-card-base)` on all form inputs. Warm parchment in light, dark chamber in dark mode.

**Remaining dashboard DNA (documented for next pass):**
- "Update position" CTA button — gold, prominent, centered; still reads as app chrome
- PresenceStrip as "status strip" — concept is editorial but the label is product
- Progress bar in CompanionHeader duplicates editorial percentage below it
- "3 sessions recorded" copy is dashboard-speak
- CompanionHeader overall reads as a product card (cover image + status badge + action row + three-dot menu)

**Weakest remaining surface:** CompanionHeader — has not been touched in this pass; still reads as a content detail card from a standard media app.

**Build:** clean ✓ | **localStorage:** untouched ✓

---

## Session 79 — 2026-05-20
**Theme:** Track B Overhaul — Environmental Companion + Architectural Minimalism Pass

Architecture finding: The product had accumulated a rich AI companion pipeline but expressed it through a persistent chatbot sidebar and a dynamic mood-color system — both of which communicated "app with features" rather than "a room that accumulates memory." This pass executed a full philosophy shift: quieter, more spatial, more editorial, more inhabited. The companion is now environmental rather than a widget.

**Files changed:**

- `src/components/dashboard/PresenceStrip.jsx` (**new**) — Lightweight companion presence component replacing both `CompanionPanel` (desktop) and `CompanionInsights` (mobile). Left side: `✦` glyph + rotating 12px serif italic observation with 14s auto-advance. Right side: "Add a thought…" expander → 2-row textarea + Note/Theory/Mystery destination pills + Keep/Cancel. Routes to `book.notes` (with tag) or `book.mysteries`. Carries full observation/reflection orchestration pipeline from `CompanionInsights` (generatePresence, getActiveReflections, assembleReflectionContext, shouldRegenerate, computePresenceVisibility, shouldYieldToBook). Debug panel via React portal — toggle: `localStorage.setItem('lantern_debug_companion','1')`.

- `src/components/dashboard/BookDashboard.jsx` — Removed two-column grid (1fr 300px), `<aside>` companion column, mobile CompanionInsights strip, and `data-mood` attribute on wrapper div. Added `PresenceStrip` in the sticky bar above tabs. Single-column full-width layout: `max-w-[1000px] mx-auto px-5 sm:px-10 pt-7 pb-20`. Tab bar padding moved to container; individual `.tab-btn` elements no longer carry horizontal padding.

- `src/components/dashboard/CompanionHeader.jsx` — Removed entire mood selector UI block (~35 lines): color dot buttons, mood descriptor label, MOOD_CONFIG import, ProgressBar import, hoveredMood/displayMood state, MOODS constant, RING_GAP constant. All lifecycle actions, temperament selector, meta editing, stewardship menu, and EPUB re-extraction preserved.

- `src/index.css` — Mood accent system frozen to gold: `:root` defaults `--ca/#B8860B`, `--ca-l/#D4AF37`, `--ca-bg/#FDF8EC`, `--ca-border/#E8D090`. All six `[data-mood="*"]` selectors now resolve to identical gold values (backward compat with stored book.mood preserved; dynamic color shifts eliminated). Dark mode accent frozen: `--ca: #C4A058`. Added `.presence-strip-wrapper { border-bottom: 1px solid var(--color-ink-100); background: transparent; }`. Tab bar: height 44px → 40px, font-size 13px → 12px.

- `src/tabs/ProgressTab.jsx` — Dissolved boxed progress summary into editorial display: large 52px weight-300 percentage figure + italic "— N of M chapters" on same baseline line. Progress bar promoted to `h-px` full-width architectural spine (manuscript rule). Chapter completion: removed `bg-sage-bg border-sage-pale` fill → `border border-ink-100 background: transparent`. Completion circle glyph: filled green → `border-ink-300` ring with `✦` (8px, gold, 80% opacity). Chapter label color for completed: `text-sage` → `text-ink-400`. "New book" isNew state: bordered card dissolved to inline italic paragraph.

- `src/tabs/MysteriesTab.jsx` — `STATUS_STYLE.resolved`: removed sage fill, now `bg-ink-100 border-ink-200 text-ink-400`. Resolved mystery checkbox: sage fill → `border-ink-300` circle with `✦` glyph at 55% opacity. Same treatment for archived mystery resolved state.

- `src/tabs/CharactersTab.jsx` — `aliveCls` for living characters: `text-sage bg-sage-bg border-sage-pale` → `text-ink-500 bg-ink-100 border-ink-200`. Deceased `aliveCls`: shifted to `text-ink-400 bg-ink-100 border-ink-100 opacity-60`. Character card wrapper: `bg-cream-50 border-ink-200 rounded-xl` → `.note-card` (same editorial card class as notes and mysteries).

- `src/data/config.js` — `STATUS_CONFIG.reading` and `STATUS_CONFIG.want`: `dot` changed from `bg-sage`/`bg-ink-300` to `bg-gold`/`bg-ink-300` (reading now uses gold dot to match gold accent system).

- `src/components/library/BookCard.jsx` — `STATUS_DOTS.reading` color: sage → `var(--color-gold, #B8860B)`. `STATUS_DOTS.want` unchanged.

**Design decisions (load-bearing):**
- Companion is now above the tab bar (architectural/environmental), not a sidebar (chatbot widget)
- `book.mood` field and `[data-mood="*"]` selectors preserved in CSS — backward compat for stored data, but all resolve to gold. Do not remove the selectors; remove the dynamic values from them.
- `PresenceStrip` and `CompanionInsights` share the same orchestration pipeline — do not split or simplify
- Completion should feel archival, not victorious — `✦` glyph replaces green checkmarks everywhere
- `.note-card` is now the shared card class for notes, mysteries, and characters — all surfaces in the same material register

**Build:** clean ✓ | **localStorage:** untouched ✓

---

## Session 78 — 2026-05-20
**Theme:** Companion Wisdom Deepening Pass

Architecture finding: The companion had learned to perceive — emotional gravity, haunting, cadence, silence, interpretive mutation. The challenge shifted from "can Lantern notice meaningful things?" to "does Lantern know what deserves to surface?" This pass was an orchestration pass: wisdom, discernment, timing, suppression, and restraint.

**Files changed:**

- `src/utils/signalHierarchy.js` — Weight reductions across ambient tier: `duration: 0` (effectively suppressed — too performative), `session_rhythm: 2` (same-day return is minor context), `session_stop: 3` (minor vs interpretive signals), `pacing: 2`, `character_ownership: 1`. Expanded SUPPRESSES map: `destabilization` now blocks `reader_transform`, `reader_cadence`, `cross_surface` (not just mystery/reader_notes/session/narrative/character). `reader_cadence` now blocks `character` and `narrative`. `reader_transform` now blocks `character`. New: `mystery` domain blocks `narrative`. `shouldEnterAtmosphereMode()`: interruption risk threshold lowered from 0.65 → 0.55 (companion yields sooner); new trigger: ≥3 theory/confusing/theme notes in last 24h (dense active interpretation → companion steps back).

- `src/utils/invisiblePresence.js` — `computeObservationCap()`: cap 3 now requires effectiveV ≥ 0.75 (was 0.65) — harder to earn full presence. New gravity pressure: books with 4+ open mysteries subtract 0.08 from effective visibility; 6+ subtract 0.15. A narratively dense book compresses companion output — the story's tension is already doing work.

- `src/utils/companionPresence.js` — Threshold tightening across 5 lenses: `readerObs()`: theories need 4+ (was 3), themes need 3+ (was 2), quotes need 4+ (was 3), favorites need 3+ (was 2), "parallel text" observation raised from 5+ notes to 8+, "notes as companion" line removed entirely. `notePatternObs()`: entrance gate raised to 4+ notes (was 3); 2-character case removed — needs 3+ recurring character notes now. `interpretationObs()`: entrance gate raised from `total < 1` to `total < 2` — single revision alone doesn't warrant surfacing. `characterOwnershipObs()`: single-character case removed, needs 2+ user-added characters. `duration` block removed entirely — no more "You've been living with this story for X weeks." New `generatePresenceDebug()` export for developer inspection.

- `src/components/dashboard/CompanionInsights.jsx` — Added `CompanionDebugPanel` component + `createPortal` to body. Toggle: `localStorage.setItem('lantern_debug_companion','1')`. Shows: visibility scores, effective visibility (post-gravity), cap, interruption risk, narrative dominance, gravity pressure, atmosphere/yield/solitude flags, and all surfaced observation texts. Used to verify arbitration outcomes during development.

**Build:** clean ✓ | **localStorage:** untouched ✓

---

## Session 77 — 2026-05-20
**Theme:** Emotional Topography Pass

Architecture finding: The interface was beautifully composed but still behaved like a system of components. Cards were modular. Spacing was regular. The library felt like inventory. This pass pushed toward inhabited literary topography: uneven, settled, weathered, emotionally weighted.

**Files changed:**

- `src/index.css` — `--color-card-base` shifted from pure `#FFFFFF` to `#FDFAF5` (warm cream tint; cards are same material as parchment, slightly elevated). `.atmospheric-card` border reduced from `rgba(28,20,16,.065)` to `.030` — near-invisible; shadow leads. `.reading-hero-card` border removed entirely in light mode; pure shadow containment. New `.note-card` class: `border: 1px solid rgba(28,20,16,.025)`, minimal shadow — used by both NotesTab and MysteriesTab to replace explicit `bg-cream-50 border-ink-200` tile containers. New `.topo-gap-active` (4.5rem), `.topo-gap-dormant` (2.5rem), `.topo-gap-archive` (1.5rem) spacing classes for section gravity rhythm. `.reading-now-zone` margin/padding expanded for more bleed. Fourth ambient gradient layer added to light mode `body::before` for parchment depth.

- `src/components/library/Library.jsx` — `space-y-14` removed; sections now carry explicit `topo-gap-*` classes based on position: reading-now → active gap → set-aside → dormant gap → finished → dormant gap → archive → archive gap. Solo deeply-annotated book hero expanded to `max-w-md` (was `max-w-sm`) — annotation depth widens gravitational field.

- `src/utils/companionPresence.js` — language compression/diversification pass. Targeted rewrites across 8 lenses:
  - `theoryAccelerationObs`: "Something in the story is provoking them" → "The story is at a point where it invites that"
  - `sessionRhythmObs`: multi-day → "Twice in one day. The story pulled you back."; immersed → "This stretch has been holding you."
  - `readerTrajObs`: "Something in this book keeps expanding" → "The further in, the more this book opens up"; shortening → fragment "Notes getting shorter. Certainty, or something heavier — hard to say which."
  - `dormantMysteryObs`: multi → compact "N early threads — still open, still unanswered."; single → "An early question, still drifting. The story hasn't closed it."
  - `hauntedThreadObs`: "What you've been writing and what remains unresolved are beginning to overlap" → "Your notes and the open threads are starting to rhyme."
  - `crossChapterEchoObs`: "Something you noticed early on is still circling" → "An early observation, still active."
  - `interpretationObs`: "Your notes have been changing alongside your reading" → "These notes have been moving."
  - `readerCadenceObs`: burst/quiet/fragmenting all shortened, fragments introduced
  - `readerObs`: "You've been collecting lines" → "Lines being collected"; "You've been reading both…" → "Reading both the story and what it means. Both at once."; note count → "A parallel text is forming alongside the story."
  - `momentumObs`: streak openers shortened; gap observations compressed
  - `interpretationObs` observational block: full pass toward shorter, less subject-heavy sentences

- `src/tabs/NotesTab.jsx` — note card: `bg-cream-50 rounded-xl border border-ink-200` → `.note-card` + `background: var(--color-card-base)`. Borders dissolved; shadow-led containment.

- `src/tabs/MysteriesTab.jsx` — mystery card: `rounded-xl border p-4 bg-cream-50 border-ink-200` → `.note-card p-4` + `style={{ background: var(--color-card-base) }}`. Resolved mysteries use `--color-cream-200` background instead of explicit `bg-ink-100`.

**Build:** clean ✓ | **localStorage:** untouched ✓

---

## Session 76 — 2026-05-20
**Theme:** Environmental Participation Pass

Architecture finding: The Scholar's Study II design system was live (Pass 1), but the interface remained spatially uniform — it didn't reflect the emotional depth of books or reading patterns already computed internally. A densely annotated book looked identical to one opened twice.

**Files changed:**

- `src/index.css` — light mode `body::before` rewritten as editorial window-light (asymmetric, upper-left daylight source). Dark mode `body::before` adds faint gold warmth from right viewport edge (companion column reference). New `.reading-now-zone` class (warm gold section tint via `color-mix`, bleed margins). New `.surface-inhabited` / `.surface-inhabited-deep` shadow depth variants. `.shelf-dormant` gains `filter: saturate(0.82)`. `.shelf-archive` gains `filter: saturate(0.60)`. Dark-mode overrides for all new classes.

- `src/components/library/Library.jsx` — `bookPresence(book)` helper: `notes × 0.045 + openMysteries × 0.09 + sessions × 0.02` → `'deep' | 'inhabited' | ''`. Reading-now section wrapped in `.reading-now-zone`. Card wrappers for reading-now and set-aside receive `.surface-inhabited` or `.surface-inhabited-deep` based on presence score. `presence` prop passed to `BookCard`.

- `src/components/library/BookCard.jsx` — `presence` prop; `coverShadow` variable deepens for inhabited/deep books.

- `src/components/dashboard/BookDashboard.jsx` — grid container `position: relative`; absolute-positioned radial gradient companion-column atmosphere (right ~38%, `zIndex: 0`); grid content at `zIndex: 1`.

**Build:** clean ✓ | **localStorage:** untouched ✓

---

## Session 75 — 2026-05-20
**Theme:** Visual Overhaul Milestone 1 — Scholar's Study II Integration

Architecture finding: Lantern had a complete, documented design system (Scholar's Study II, established in Session 74) that hadn't been integrated into the live app. The live pages still used the old flat-grid library, single-column book detail, and warm cream/dark token palette. This session executed the fork: new token system live, library as reading-room memory archive, book detail as two-column literary environment with companion as architectural presence.

**Files changed:**
- `src/index.css` — full Scholar's Study II token integration: updated `@theme {}` cream/ink scale to new light-mode values (cardBase `#FFFFFF`, bg `#FAF6EE`, textSecondary cognac `#5C4828`). Dark mode `html.dark` overrides remapped to deep teal-black palette (page bg `#0A1A1E`, companion bg `#090F14`, text primary `#D8CCBA`). Added 20+ new CSS custom properties: `--color-bg`, `--color-card-*`, `--color-companion-*`, `--gradient-gold-foil`, `--shadow-gold/gold-hover`, `--gradient-glow`. Added `.atmospheric-card`, `.reading-hero-card`, `.shelf-title`, `.shelf-dormant`, `.shelf-archive`, `.companion-foil-outer/inner`, `.companion-label`, `.companion-thought`, `.gold-rule`. Added 10 new animation keyframes: `bookEnter`, `illuminateIn`, `settleDown`, `warmSettle`, `noteFormArrive`, `noteArrive`, `doneArrive`, `emberDrift`, `ambientBreathe`, `modalBackdrop/Settle`. Ambient gradient updated to 3-layer warmth (gold top, sienna lower-left, gold right). Sticky bar backgrounds updated to new palette.

- `src/components/library/Library.jsx` — full rewrite. Status-grouped sections replace flat grid: reading now / set aside / finished / archive. Solo active book renders in hero card with intentional `max-w-sm` asymmetry. Multiple active books use 2-col grid with `.reading-hero-card`. Set-aside and finished use 3-col grid with `.atmospheric-card`. Finished wrapped in `.shelf-dormant` (62% opacity, hover restores). Archive wrapped in `.shelf-archive` (38% opacity). Shelf titles use `.shelf-title` (Playfair italic 11px, 70% opacity). Filter bar changed from pill buttons to text-link tabs (gold bottom-border when active). Sort selector: borderless, transparent bg. Max-width updated to `max-w-[1000px] px-10`. Count metric ("X companions") removed.

- `src/components/library/BookCard.jsx` — full rewrite. Book title: Playfair 600, 17px hero / 15px regular, `-0.01em` tracking. Author: Playfair italic 12px. Status: dot indicator instead of StatusBadge pill. Progress bar: `h-0.5`, gold fill via `accentVar`. Cover shadow elevated: `0 3px 14px rgba(0,0,0,.18)`. `hero` prop for slight padding/size increase.

- `src/components/dashboard/BookDashboard.jsx` — rewritten to two-column grid (1fr 300px, 48px gap) on desktop. Left column: sticky tab bar + tab content. Right column: `<CompanionPanel>` (hidden on mobile). Mobile: `<CompanionInsights>` strip still shown above tabs. `ActiveTensionBar` removed — tension now surfaced inside CompanionPanel. `.book-enter` entrance animation applied to root.

- `src/components/dashboard/CompanionPanel.jsx` — NEW. Gold foil border panel. Outer wrapper: `.companion-foil-outer` (gradient background, 1.5px padding, 20px radius, gold shadow, hover: translateY(-3px) + stronger glow). Inner: `.companion-foil-inner` (companionBg, 18.5px radius, darkens on hover). Contains: COMPANION label, primary observation (17px Playfair italic), secondary tension signal, carousel dots, "next thought →", OPEN QUESTIONS section with ✦-bulleted top haunted mysteries. All companion intelligence from `CompanionInsights` + `ActiveTensionBar` consolidated here. `CompanionInsights` retained for mobile strip only.

- `src/components/dashboard/CompanionHeader.jsx` — targeted updates. Wrapper: `color-mix` background (subtle tint, not flat cream), border-b `--color-ink-100`. Max-width `max-w-[1000px] px-10`. Added "READING NOW" / "PAUSED" / "FINISHED" zone label above title (11px Inter 700 uppercase tracked). h1: 22px Playfair 600, `-0.02em` tracking. Author: Playfair italic 14px. Cover shadow elevated. All functionality preserved (mood picker, lifecycle actions, metadata edit, export, re-extract).

- `src/App.jsx` — removed `DirectionModeProvider`, `DirectionsDemoPage` import + route, `/directions` route. `AppShell` now sets both `html.dark` class AND `data-mode` attribute for Scholar's Study II token compatibility. Gold rule divider (`<div className="gold-rule" />`) added below nav, constrained to `max-w-[1000px] px-10`.

- `src/components/layout/TopNav.jsx` — removed all directions-specific code (isDark conditionals, direction picker section, "Visual Directions" nav item). Simplified to three nav items. Logo `✦` now uses `.ember-drift` animation. New Companion button: always gold (not conditional). All hover states use CSS token vars. Max-width `max-w-[1000px] px-10`.

**Build:** `node node_modules/vite/bin/vite.js build` → ✓ clean, 401ms, no errors
**localStorage:** `shadowscribe_books` and `shadowscribe_settings` untouched

---

## Session 70 — 2026-05-19
**Theme:** Signal Hierarchy & Discernment Pass

Architecture finding: Lantern had accumulated 20+ detection systems — haunting, fixation, polarity reversal, cadence, silence, destabilization, theory acceleration, confidence drift, etc. The challenge was no longer whether the companion could perceive meaningful things. The challenge was whether it knew what deserved to surface. Under heavy annotation, all eligible observations surfaced simultaneously, rotating in a queue. The companion felt observant but not wise.

This pass introduced a unified signal hierarchy and arbitration system. The companion now ranks every eligible observation by emotional importance, deduplicates semantically similar signals (one per domain), suppresses weaker signals when a high-tier signal is present, and surfaces only the 1–2 most emotionally significant observations alongside the arc baseline. The companion increasingly feels measured and patient rather than perpetually insightful.

**New utility: `src/utils/signalHierarchy.js`**
`SIGNAL_WEIGHTS` — emotional importance per category (0–10 scale). `DOMAINS` — 8 semantic domain groups; only highest-weight candidate per domain surfaces. `SUPPRESSES` — cross-domain suppression map (e.g. destabilization suppresses mystery, reader_notes, session, character). `arbitrateCandidates(candidates, cap)` — greedy selection: deduplicates by domain, sorts by weight, applies suppression, returns top N texts. `momentumWeight(streak, gapDays)` — dynamic weight for momentum observations; long absences (60+ days) reach weight 7, same tier as lingering mysteries. `shouldEnterAtmosphereMode(book, settings)` — returns true for climax zone (80–97%) with no annotation, or high interruption risk (≥0.65); companion returns arc observation only.

**`src/utils/companionPresence.js` — arbitration refactor**
`generatePresence()` now collects all lens candidates as `{text, category, weight?}` objects instead of pushing to a flat array. After all lenses run, `arbitrateCandidates(cands, cap - 1)` selects the top observations. Arc observation always occupies position 0. Atmosphere mode guard added before candidate collection. Momentum observation now uses `momentumWeight()` dynamic weight — no more positional splice. Import: `arbitrateCandidates, shouldEnterAtmosphereMode, momentumWeight` from `signalHierarchy.js`.

**`src/utils/invisiblePresence.js` — cap reduction**
`computeObservationCap()` revised: 8/4/2 → 3/2/1. Full presence = arc + 2 chosen. Fading = arc + 1. Deep fade = arc only.

**`src/components/dashboard/CompanionInsights.jsx` — UI quietness**
Carousel intervals: 7s/14s → 12s/18s. Observations breathe longer. Reflection injection: 2 → 1 (best reflection earns one slot). Dot navigation: hidden when ≤2 observations (nothing to meaningfully skip).

---

## Session 69 — 2026-05-19
**Theme:** Reader-State Evolution + Emotional Trajectory Pass

Architecture finding: Lantern increasingly understood the emotional life of the *book* — what returns, what changes shape, what haunts. But it comparatively treated the *reader* as emotionally stable. This pass introduced reader-state evolution detection: a lightweight system for tracking how the reader changes while reading. The companion can now increasingly observe — not just what the reader thinks, but how the reader is transforming emotionally across the reading journey.

### What Was Built

**`src/utils/readerState.js` — new reader-state detection utility**

Pure detection functions, no side effects. Minimum 5 notes before trajectory conclusions:

`detectConfidenceDrift(notes)` — tracks certainty vocabulary (CERTAINTY_W: "must," "clearly," "definitely," "certain"…) vs uncertainty vocabulary (UNCERTAIN_W: "maybe," "perhaps," "unsure," "not sure"…) across early/late note split. Returns `{ arc: 'building'|'collapsing'|'oscillating'|null }`. Requires delta ≥ 2 between early and late scores to qualify.

`detectFixations(notes)` — finds content words (6+ chars, noise-filtered) appearing in ≥40% of notes (minimum 6 total). Returns `[{ word, noteCount, pct }]` sorted by frequency. A fixation = the reader is returning to the same language without resolving it.

`detectNoteLengthTrajectory(notes)` — compares avg note character length early vs late. `'lengthening'` = late avg ≥ 1.4× early; `'shortening'` = late avg ≤ 0.65× early. Signals absorption/fatigue without requiring emotional vocabulary.

`detectBurstCadence(notes, currentChapter)` — detects note rhythm in last 5 chapters. `'burst'` = 4+ notes in ≤2 chapters; `'quiet'` = ≤1 recent note after 3+ earlier; `'fragmenting'` = 4+ chapters touched with avg <1.3 notes each. Reading tempo as emotional signal.

`detectSilenceGap(notes, book)` — finds the longest run of completed chapters with zero notes that immediately follows a chapter with ≥2 notes. Gap must span ≥5 chapters. Returns `{ afterChapter, gapLength }`. Silence after engagement = a response the reader didn't put into words.

`detectEmotionalLoading(notes)` — scores chapters by INTENSE_W word density per note (fear, obsession, grief, haunting etc.). Returns `[{ chapter, score, density }]` sorted by density. Used by ProgressTab to mark where the reader was most emotionally activated.

**Five new companion lenses (`companionPresence.js`)**

All placed after `dormantMysteryObs` in `generatePresence()` — late in the queue for restraint.

`readerConfidenceObs(notes, style)` — fires on `'building'`/`'collapsing'`/`'oscillating'` arc. "You wrote with more certainty earlier. Something has been unsettling that." / "Your interpretations have become more certain as the reading deepened." / "Your reading keeps shifting between certainty and doubt."

`readerFixationObs(notes, style)` — fires when fixation detected. `"[word]" keeps returning in what you write. You may not have noticed — but the companion has.`

`readerCadenceObs(notes, currentChapter, style)` — burst: "Something in these chapters hasn't let you move on." Quiet: "fewer thoughts written down. Something may be settling." Fragmenting: "brief catches rather than settled interpretations."

`readerSilenceObs(notes, book, style)` — fires on silence gap. "Something after chapter N seems to have quieted you. X chapters passed without a note."

`readerTrajObs(notes, style)` — fires on length trajectory. Lengthening: "Something in this book keeps expanding what you notice." Shortening: "Your notes have been getting shorter. Whether that's certainty or something heavier is hard to say."

**`NotesTab.jsx` — reader trajectory in `deriveNotesPresence`**

Added after existing signals, before fallback: confidence arc conditions (collapsing/building/oscillating) and fixation signal (`"[word]" keeps appearing in what you write`). Minimum 5 notes for confidence, 6 for fixation.

**`ProgressTab.jsx` — emotional loading per chapter**

`detectEmotionalLoading` imported; `emotionalPeakChapters` Set computed via useMemo. In the forward-pull IIFE: if chapter is a peak chapter (density ≥ 80% of top peak), line shows `'Your writing intensified here.'` in `text-ink-400`. Placed between haunting language and theory detection in the priority chain.

---

## Session 68 — 2026-05-19
**Theme:** Meaning Transformation + Interpretive Mutation Pass

Architecture finding: Lantern increasingly understood *what returns* — but had no system for tracking *what changes shape*. Theories are not merely persistent; they get revised. Mysteries are not merely open; they mutate. Characters are not merely mentioned; their emotional valence inverts. This pass added a full interpretive mutation layer — detection functions for collapsed certainty, mystery refinement, quote recontextualization, chapter destabilization, and character polarity reversal — and surfaced this awareness across every companion-facing zone.

### What Was Built

**`src/utils/transformScore.js` — new foundational utility**

Pure detection functions, no side effects:

`detectCollapsedCertainty(notes)` — returns theory notes with `revisedAt` set. A revised theory = prior certainty the story wouldn't hold. Used by `companionPresence.js` and `NotesTab.jsx`.

`detectMysteryRefinements(mysteries)` — returns unresolved mysteries with `originalText` set. The question itself changed — not answered, mutated. Used by `companionPresence.js` and `MysteriesTab.jsx`.

`detectQuoteRecontextualization(notes, currentChapter)` — returns `{ note, echoNotes }` pairs where an early quote note (chapter ≤ 40% through reading) shares keywords with recent theory notes (last 5 chapters). The capture aged into evidence.

`detectChapterDestabilization(book)` — returns `{ [chNum]: { revised, collapsedTheories, hasRefinedMystery } }` for chapters where meaning was renegotiated. Used by `ProgressTab.jsx` for chapter residue language.

**Four new companion lenses (`companionPresence.js`)**

Local `POLAR_POS` / `POLAR_NEG` word arrays for lightweight valence detection (no reflectionEngine import required).

`polarityReversalObs(notes, style)` — detects character whose early notes carry positive valence (≥2 pos words, 0 neg) and late notes carry negative (≥2 neg, significantly fewer pos), or vice versa. "Something in the story has shifted that." / "Your reading of [name] has softened."

`collapsedCertaintyObs(notes, style)` — fires when `detectCollapsedCertainty` returns results. 3+: "The story keeps refusing your earlier explanations." 2: "What you were certain about has changed shape more than once." 1: "Something you were sure of has been rewritten by the story."

`mysteryMorphObs(mysteries, style)` — fires when `detectMysteryRefinements` returns results. 2+: "Not answered — transformed." 1: "The mystery didn't resolve — it mutated."

`quoteEchoObs(notes, currentChapter, style)` — fires when `detectQuoteRecontextualization` returns results. "The capture found its meaning."

All four wired into `generatePresence()` after `hauntedThreadObs`, before `dormantMysteryObs`.

**`NotesTab.jsx` — collapsed certainty in `deriveNotesPresence`**

Two new conditions above the existing movement-forward signals:
- `collapsedTheories >= 2` → "More than one theory has been revised. The story keeps resisting what you were certain about."
- `collapsedTheories === 1 && theoryCount >= 2` → "One of your theories has been revised. The story changed the terms."

**`MysteriesTab.jsx` — reframed mystery language**

When `m.originalText` is present (mystery was edited after first writing):
- New display: quiet italic line above metadata row — `Originally: "[m.originalText]"`
- Status indicator: `· refined` → `· reframed`

**`ProgressTab.jsx` — chapter destabilization residue**

`detectChapterDestabilization` imported and computed as `destabMap` useMemo. Per-chapter forward-pull IIFE now checks destabilization first:
- `collapsedTheories ≥ 1 && hasRefinedMystery` → "What this chapter meant has kept changing."
- `collapsedTheories ≥ 1` → "A certainty formed here later came apart."
- `hasRefinedMystery` → "A question opened here was reframed."
Destabilization takes priority over haunting language; uses `text-ink-400` warm treatment.

**`CharactersTab.jsx` — polarity-aware `charRelationalLine`**

Local `CHAR_POS` / `CHAR_NEG` word arrays. `charValence(noteTexts)` computes early/late valence for a character. After the existing tag-based instability checks:
- Early positive + late negative → "Something in the story has changed that."
- Early negative + late positive → "Your reading of [name] has softened. The earlier suspicion hasn't held."

---

## Session 67 — 2026-05-19
**Theme:** Memory Hierarchy + Selective Haunting Pass

Architecture finding: Lantern remembered many things, but all memories behaved with roughly equal narrative weight. Some signals needed to fade; others needed to intensify, recur, and infect multiple surfaces. This pass introduced a lightweight memory-weighting system — haunt scoring — and used it to selectively surface, elevate, and quiet signals across the full companion architecture.

### What Was Built

**`src/utils/hauntScore.js` — new foundational utility**

`noteHauntScore(note, book)` — computes emotional persistence weight for a note:
- +2.0 revised (reader returned to refine)
- +1.5 theory tag
- +1.0 confusing tag
- +1.5 age ≥ 10 chapters / +0.75 age ≥ 5
- +2.5 keyword overlap with an open mystery (cross-surface infection)

`mysteryHauntScore(mystery, book)` — computes persistence for a mystery:
- +2.0 suspected / +1.5 evolving / +0.5 hinted / -0.5 dormant
- +2.0 age ≥ 15 / +1.0 age ≥ 8 / +0.5 age ≥ 4
- +0.75 per note with keyword overlap (capped at 3.0)
- +1.0 reader added observation

`hauntLevel(score)` classifies: `'haunted'` (≥6) / `'persistent'` (≥3.5) / `'active'` (≥1.5) / `'cooling'` (<1.5).

**`ActiveTensionBar` — haunt-weighted signal selection (`BookDashboard.jsx`)**

Mysteries now sorted by `mysteryHauntScore` descending rather than chapter ascending. The most emotionally persistent thread leads — not just the oldest. A young suspected mystery with cross-note overlap outranks an old dormant mystery.

Additional per-signal visual hierarchy: `haunted`/`persistent` signals get glyph opacity 0.75, `text-ink-600` label, `text-ink-400` meta. Others get opacity 0.40, `text-ink-500`, `text-ink-300`. Theory/confusion notes also sorted by hauntScore — most persistent leads. Haunted theory meta: `'your theory — keeps returning'`.

**Two new companion lenses (`companionPresence.js`)**

`hauntedThreadObs` — fires when notes and open mystery threads share keyword overlap:
- 3+ haunted notes: "What you've been writing and what remains unresolved are beginning to overlap."
- 1+ revised + haunted: "Something you revised keeps appearing in the story's open questions."
- 2 haunted notes: "What you've been writing and what the story hasn't answered are starting to rhyme."

`crossChapterEchoObs` — fires when early theory notes (first 35% of reading) share keyword overlap with late theory notes (final 35%):
- "Something you noticed early on is still circling in what you write now. It hasn't let go."
Both wired into `generatePresence()`.

**Reflection cooling (`reflectionEngine.js` — `getActiveReflections`)**

`fresh` pool filters to reflections with `surfaceCount < 4`. If `fresh.length >= limit`, uses fresh pool only. Falls back to full eligible pool when saturated. Well-worn reflections naturally recede without any stored state changes — the cooling is computed at pick time, not written back.

**Mystery visual persistence differentiation (`MysteriesTab.jsx`)**

Per-mystery `hauntLevel` computed at render. Gravity line class varies:
- `haunted` (≥6): `text-ink-500` + `✦` glyph prefix
- `persistent` (≥3.5): `text-ink-400`
- `cooling` (<1.5): `text-ink-300` (quieter than default)
- default: `text-ink-400`

Dormant mysteries at `cooling` level: `opacity-60` (was `opacity-80`). Dormant mysteries at other levels: `opacity-80` unchanged.

**Chapter residue elevation (`ProgressTab.jsx`)**

`noteHauntScore` computed per note in each chapter's `notesByChapter` entry. If `maxHaunt >= 3.5` (persistent or haunted), residue line elevated to "Still shaping what comes after." even without `ch.important`. Haunted residue renders in `text-ink-400` (warm) rather than `text-ink-300` (quiet).

### Architecture decisions

- **Keyword overlap via 5+ character words**: avoids noise from common short words while catching meaningful thematic recurrence
- **Threshold design**: `haunted` at 6.0 is intentionally rare — requires status + age + cross-note overlap together. Most books will have no haunted mysteries; those that do have earned it
- **Cooling via pool preference, not state**: the `fresh` pool approach preserves the existing `surfaceCount` system without adding a new flag, and automatically reverts when new reflections are generated
- **Selective haunting restraint**: new lenses (`hauntedThreadObs`, `crossChapterEchoObs`) require meaningful keyword overlap in specific structural positions — they don't fire for loose thematic similarity
- **Visual treatment is minimal**: `✦` before gravity line and one shade warmer text — not a badge, not a callout, not a notification. Atmospheric and literary.

---

## Session 66 — 2026-05-19
**Theme:** Narrative Momentum Pass

Architecture finding: Lantern had become excellent at residue, reflection, and emotional continuity — but companion language was predominantly static and archival. "Still open," "still unanswered," "still unresolved" were everywhere. This pass replaced all archival/static language with active, present-tense momentum vocabulary. The story is no longer frozen in the past; it is still moving.

### What Was Built

**ActiveTensionBar — status+age momentum matrix (`BookDashboard.jsx`)**

Meta labels rewritten from flat age strings to per-status momentum language:
- `suspected` age≥12: `"suspicion keeps deepening"` / age≥8: `"still narrowing"` / younger: `"circling"` / with gap: `"gone quiet"`
- `evolving` age≥10: `"keeps changing shape"` / younger: `"still shifting"` / with gap: `"gone quiet"`
- `hinted` age≥8: `"resolution may be close"` / younger: `"gestured at"`
- `dormant` age≥12: `"gone quiet"` / older: `"still here"`
- Generic: age≥15 `"still pulling"` / age≥8 `"still widening"` / younger `"still open"`
- Theory meta: `revisedAt ? 'your theory — still shifting' : 'your theory, still forming'`
- Confusion meta: `'still confusing'` → `'still resisting explanation'`

**Mystery gravity differentiation (`MysteriesTab.jsx`)**

`getMysteryGravity()` threshold lowered: age<6 (was age<8) — more mysteries qualify. Full status differentiation:
- `suspected` age≥12: "Your suspicion has been circling this for a long time." / age≥8: "Your suspicion keeps returning here." / younger: "Something is circling."
- `evolving` age≥12: "The question keeps changing shape. It hasn't stayed still." / younger: "Each chapter seems to reframe this slightly."
- `hinted` age≥8: "The story has gestured at an answer. The resolution may be closer than it seems."
- `dormant` age≥15: "The story hasn't returned to this. Neither have you. But it's still here."
- Generic age≥20: "This has been with you a long time. The story hasn't closed it." / age≥10: "Open for a long stretch now. The story is still carrying this."

**Three new companion lenses (`companionPresence.js`)**

- `theoryAccelerationObs` — fires when late theory count exceeds early count by 2+: "The theories have been coming faster lately. Something in the story is provoking them."
- `wideningSuspicionObs` — fires for suspected mysteries aged ≥5 chapters; single age≥10: "A suspicion that started early is still deepening. It hasn't peaked yet."; multiple: "N questions in this story are still narrowing. Something is getting closer."
- `mysteryPropulsionObs` — fires for mix of evolving+suspected; "Some of the story's questions are still shifting. Others are beginning to converge." Or 2+ evolving: "N questions keep reframing themselves. The story is still working on them."

All three wired into `generatePresence()` after their nearest semantic relatives.

**Existing lens language upgrades (`companionPresence.js`)**

- `mysteryObs`: "still unresolved" → "still in motion"; "beginning to circle toward each other" → "still circling — not converging yet"; "still hasn't found its answer" → "is still gaining weight"
- `lingeringMysteryObs`: "still unanswered" → "still circling"; "hasn't forgotten it" → "hasn't let it go"; "still open" → "still in motion"; "still unresolved" → "still widening"

**`deriveSecondarySignal` — momentum-first restructure (`CompanionInsights.jsx`)**

Two new top-priority sections added before all existing conditions:
1. Suspected mysteries deepening (age≥4, 2+): "N threads are still circling toward answers without reaching them."
2. Evolving mysteries (age≥4, 2+): "N threads keep changing shape. The story hasn't settled them."

Lingering language: "threads opened early are still unanswered" → "threads from early on are still pulling." Mystery quotes: "still unanswered" → "still circling." Gap language all upgraded: "The story has been waiting. Everything in it still holds." / "The threads are still live." / "The story hasn't moved on."

**`deriveNotesPresence` — movement-forward conditions (`NotesTab.jsx`)**

Two new top-priority signals:
- `revisedCount >= 2 && theoryCount >= 2`: "Your earliest theories don't quite hold anymore. Something is still moving."
- `revisedCount >= 2 && confusingCount >= 2`: "You keep returning to what unsettled you. The confusion is becoming something else."

**`charRelationalLine` — character instability detection (`CharactersTab.jsx`)**

When a character has 4+ notes, splits into early/late halves and checks tag transitions:
- early confusing + late theory: "[Name] has been shifting in your understanding."
- early theory + late confusing: "[Name] has become harder to read as the story progressed."

**`ReadingMomentum` — story-pull secondaries (`ReadingMomentum.jsx`)**

- Streak 3: adds secondary "The story is holding."
- Streak 2: primary "Back again today" + secondary "Something in this is working on you."
- Gap >30: "Everything in the story is still here."
- Gap >14: "The threads are still live."
- Gap >7: "The story hasn't moved on without you."

**`ProgressTab` — chapter forward pull (`ProgressTab.jsx`)**

- `notesByChapter` memo indexes `book.notes` by `note.chapter`
- Completed chapter rows show forward-pull line when notes exist with `chapter` field:
  - `ch.important && count>=2`: "Still shaping what comes after."
  - theory + 2+: "A theory formed here."
  - confusing: "A question opened here." / "N questions opened here."
  - count 1: "One thought from here." / count N: "N thoughts from here."
- Only activates for notes created from Session 60+ (when `note.chapter` field was added)

### Architecture decisions

- The status+age matrix approach (rather than just age) is the core structural shift. "Still pulling" is a generic age signal; "suspicion keeps deepening" is a status signal that the reader's own interpretation is still evolving.
- New companion lenses follow the threshold principle: fire infrequently, only when the signal is genuinely present (2+ notes in fast succession, 5+ chapter aged suspicions, etc.).
- `notesByChapter` forward pull intentionally quiet — 10px italic ink-300 — residue, not annotation.
- No gamification language introduced: "The story is holding." is observation, not praise for streak consistency.

---

## Session 63 — 2026-05-19
**Theme:** Orientation Depth + Continuity Momentum Pass

Architecture finding: the companion systems were rich but the dashboard still partially behaved like a metadata/navigation layer. The emotional quality and continuity specificity needed deepening across every orientation surface.

### What Was Built

**Dashboard recomposition — further metadata backgrounding**

- `CompanionHeader`: cover `opacity-90` → `opacity-75`; author `text-[13px] text-ink-500` → `text-[12px] text-ink-400`; chapter position `text-[11px]` → `text-[10px] opacity-70`; progress % `opacity-75` → `opacity-50`; mood selector now `hidden sm:block` (hidden on mobile to keep companion voice above the fold); lifecycle actions `mt-3 pt-3 border-t` → `mt-2 sm:mt-3 sm:pt-3 sm:border-t` (no border on mobile)

**ActiveTensionBar — multi-line + text upgrade**

- `truncate` removed; `line-clamp-2` replaces it — longer mystery threads now show 2 lines instead of cutting off
- Label text increased `text-[11.5px]` → `text-[12px]`; padding `py-2.5` → `py-3`; icon alignment improved for multi-line

**CompanionPresenceZone — expanded presence + broader secondary**

- Primary text: `text-[13.5px]` → `text-[14px]`
- Padding: `py-5` → `py-6`
- Secondary signal now shown on all slots, not just non-reflection slots — the unresolved tension context is relevant regardless of what the primary is saying

**deriveSecondarySignal — companion familiarity upgrade**

Rewrote to quote specific reader content where possible:
- Single lingering mystery (≤60 chars): `"[mystery text]" — 15 chapters and still unanswered.`
- Single lingering mystery (>60 chars): `"[truncated]" — still open, X chapters on.`
- Single unwatched mystery (≤55 chars): `"[mystery text]" — the story hasn't answered this yet.`
- Single theory (≤55 chars): `"[theory text]" — a theory still forming.` / `"[theory text]" — still being revised.`
- The companion now names the *specific* unresolved thing, not just its existence category

**Return momentum early in carousel**

In `companionPresence.js` `generatePresence()`: when `gapDays > 7`, the momentum observation is now spliced to position 1 (immediately after the arc obs) instead of pushed to the end. On return after a break, the companion surfaces the return warmth before cycling through reader/character/mystery observations.

**First-note ceremony — NotesTab**

- New `introAck` state in `NotesTab`
- When first note is saved, `setIntroAck(introText)` fires alongside the reflectionCache seed
- Auto-clears after 8 seconds
- Renders inline above the notes list: gold-tinted left-bordered block, serif italic companion text, breathing ✦ glyph, `animate-fade-in`
- Immediate, visible, in-context — the reader sees the companion respond *now*, not after cycling to position 1 in the carousel

**Mobile sticky bar copy**

- `"Tell the companion where you are"` → `"Continue from chapter {n}"` when `currentChapter > 0`, else `"Log your first session"`
- Reader-centric framing (where you are in the story) vs. app-centric framing (tell the companion)

### Architecture decisions

- The `deriveSecondarySignal` quoting approach uses `text.length <= 60` / `<= 55` guards to prevent truncating mid-word awkwardly. Longer texts fall back to the generic phrasing.
- Return momentum is spliced at `out.splice(1, 0, mmt)` — this means it appears in CompanionOrientation's `secondaryLine` and in the carousel's second position. Both surfaces reinforce the return acknowledgment.
- Mobile mood selector hidden at `sm:` breakpoint. Users who want to change the mood on mobile can use the `···` menu → Edit companion.

---

## Session 62 — 2026-05-18
**Theme:** Emotional Orientation + Dashboard Recomposition Pass

Architecture finding: the dashboard still began too informationally and metadata-first. Cover/title/progress statistics dominated entry. The companion was architecturally present but emotionally secondary. The app partially inherited library-software structure. This pass recomposed the entry hierarchy so the reader's evolving relationship with the book feels foregrounded over metadata.

### What Was Built

**Dashboard recomposition — emotional hierarchy**

- `CompanionHeader`: cover shrunk from `w-[76px] h-[114px]` → `w-[60px] h-[90px]`; padding `py-6` → `py-4`; title `text-xl font-bold text-ink-900` → `text-[17px] font-semibold text-ink-800`; progress percentage de-accented (`text-[11px] text-ink-400 opacity-75` vs gold bold); progress bar thinned `h-2` → `h-1`; update button text condensed ("Update position" vs "Tell the companion where you are")
- `ProgressTab`: hero block softened — `text-5xl font-bold text-ink-900` → `text-4xl font-semibold text-ink-700`; border `border-ink-200` → `border-ink-100`; "Chapter Checklist" heading renamed "Reading history"
- Cover/title/progress now read as supporting texture; companion voice leads

**CompanionPresenceZone — 2-zone expanded presence**

`CompanionInsights.jsx` entirely restructured:
- `insight-strip` → `companion-presence-zone` CSS class (expanded background tint, `py-5` vs `py-3.5`)
- Primary line: `text-[13.5px] italic font-serif text-ink-600` — more atmospheric than before
- Secondary signal line: new `deriveSecondarySignal(book, settings)` function — derives most emotionally charged unresolved signal: lingering mystery count, mystery without reader observation, theory accumulation, confusing notes without theory, return-after-gap
- Secondary shows only on non-reflection carousel slots and when companion isn't deeply faded
- `companion-spark` CSS animation on `✦` glyph (6s breathing pulse)

**ActiveTensionBar — what still matters**

New component in `BookDashboard.jsx`, rendered between `CompanionInsights` and the tab bar:
- Shows single most emotionally charged unresolved element: oldest lingering mystery (5+ chapter age) → or top theory note → or top confusing note
- `◈` icon + truncated label + age/type meta label (`15 chapters unresolved`, `your theory`, `still confusing`)
- Only appears when reading depth warrants (chapter > 2 or notes > 2)
- CSS class `active-tension-bar` — quieter tint than presence zone

**CompanionOrientation in ProgressTab**

New `CompanionOrientation` component above the progress hero:
- Shows when `currentChapter > 0` or `notes.length > 0`
- Primary: cached reflection if exists (richest continuity), else `observations[0]` (arc position)
- Secondary: `observations[1]` (reader-state signal) if available
- Renders `companion-orientation-block` — separated from progress block by subtle border

**generateFirstIntroReflection() — tag-aware first-note responses**

`reflectionEngine.js` — new export `generateFirstIntroReflection(note)`:
- 6 emotional categories: theory, confusing, quote, favorite, character, theme — 3 literary response strings each
- Called in `NotesTab.jsx` `addNote()` when `book.notes.length === 0 && !book.companionIntroResponded`
- Seeds `reflectionCache` with priority-3 `intro` type entry
- Sets `book.companionIntroResponded = true` atomically
- Different emotional register for each tag: theory → interpretive attention; confusing → deliberate disorientation; quote → language-first reading; character → early impression gravity

**Memory recall lenses — companionPresence.js additions**

Three new lenses added and wired into `generatePresence`:
- `recallObs`: chronological tag shift — early confusing + late theory = "What unsettled you then is now something you're building theories around." Also detects sustained-theory arc.
- `gravitationObs`: character name appearing in both theory/character notes AND open mystery threads → "present in your notes and in your open questions alike."
- `dormantMysteryObs`: mysteries open 7+ chapters without reader observation → "An early question is still drifting." Separate from existing `lingeringMysteryObs` — fires on no-observation state.

**CSS additions**
- `.companion-presence-zone` — expanded background, replaces `.insight-strip` for the main zone
- `.insight-strip` — legacy alias retained
- `.active-tension-bar` — quieter ambient tint
- `.companion-orientation-block` — border-bottom separator, inside ProgressTab
- `@keyframes companionSpark` / `.companion-spark` — 6s ambient breathing on `✦` glyph

### Unresolved orientation risks
- CompanionOrientation in ProgressTab may show same text as CompanionInsights carousel position 0 before carousel auto-advances (7s window). Acceptable — diverges quickly.
- ActiveTensionBar truncates mystery text at 70 chars with `…` — some mystery threads may lose nuance. Consider a 2-line show for longer texts in a future pass.
- ProgressTab CompanionOrientation secondary line may repeat presence zone secondary. Not currently noticeable but worth monitoring.

---

## Session 61 — 2026-05-18
**Theme:** Companion Depth Consolidation Pass

Architecture finding: the companion was architecturally rich but occasionally emotionally thin. New memory recall lenses (Session 60) were using wordy, slightly computational prose. Character memory stopped at collapsed-card narrative. Chapters had timestamps but no note linkage. Notes had no visual chapter context. The Discussion tab's companion header didn't signal what it was drawing on.

### What Was Built

**Voice quality audit — prose refinements across 5 files**

All Session 60 new additions audited and refined:

- `recallObs` (analytical): "Your reading of [Name] has shifted. What confused you early on has given way to theory — the story has been teaching you." Previously: longer, more explanatory.
- `recallObs` (observational): "What unsettled you then is now something you're building theories around." Previously: "has become something you're actively theorising about" (verb tense was passive/wordy).
- `recallObs` fallback: "Something in the story keeps pushing back at your first readings." Previously: "Your model of this story has been rebuilt at least once" (computational "model" language removed).
- `gravitationObs` (observational): "present in your notes and in your open questions alike." Previously: "at the same time" (weak trailing clause removed).
- `gravitationObs` (analytical): "That kind of sustained, cross-surface attention tends to mean something." Previously: "Recurring attention across different surfaces is rarely accidental" (more natural cadence).
- `dormantMysteryObs` (observational): "Going quiet isn't the same as being resolved." Previously: "That doesn't always mean they've been forgotten" (tighter, more direct).
- `dormantMysteryObs` (analytical): "A question from chapter N has drifted without any observation added." Previously: "has been drifting — no observation added, still unresolved" (clause removed).
- Mystery gravity: "still surfacing in your notes" (was "still present"), "orbiting another open thread" (was "connected to"), "drifting, still unresolved" (was "drifting — but").
- Character secondary: "still in N open threads" (added "still" for weight).

**CharactersTab.jsx — character memory depth in expanded view**

When a character card is open, a new "In your notes" section appears:
- Shows most recent note excerpt mentioning the character's first name (quoted, truncated to 120 chars)
- Shows note count ("3 notes mention [Name]") when more than 1 note exists
- Gracefully absent when no notes mention the character
- Also fixed a regression: `getCharacterNarrative` (which now returns `[primary, secondary]`) was being called twice in the expanded "Last seen" block, rendering the raw array. Fixed to `const [primary] = getCharacterNarrative(...)`.

**ProgressTab.jsx — chapter memory: completion timestamp + note count combined**

The `completedAt` display was extended to include note count from the same chapter:
- Shows "finished [date] · N notes" when both exist
- Shows either independently when only one exists
- Built with an IIFE to keep the chapter card clean
- Notes from that chapter are computed by filtering `book.notes` where `n.chapter === ch.num`

**NotesTab.jsx — temporal note layering via inline chapter markers**

When consecutive notes have different `chapter` values, a horizontal rule divider appears between them:
- Format: `―――― Ch. N ――――` (hairline rule + label + hairline rule)
- Implemented using `Fragment` key wrapping (not `<>` shorthand which doesn't support `key`)
- Degrades gracefully: notes without `chapter` field produce no dividers
- The visual channel accumulates naturally as more notes carry chapter data

**DiscussionTab.jsx — companion context awareness in header**

When `persistentReflection` is shown, the "Questions for this reading" label now has a context line below it:
- Format: "N notes · M open threads" (only the fields that exist and meet threshold)
- Note count only shown if ≥2; mystery count if ≥1
- Signals that the companion is drawing on actual book data, not speaking abstractly

### Architecture Decisions

**Why "orbiting another open thread" over "connected to"**: "orbiting" communicates gravitational pull — the mystery is circling, not just linked. More physically resonant.

**Why fragment chapter dividers rather than grouped sections**: Grouped sections would require a state toggle or layout change. Fragment dividers are progressive — they appear where chapter data exists and disappear where it doesn't. Forward-looking accumulation without imposing structure on older notes.

**Why note count threshold ≥2 in DiscussionTab context**: A single note isn't a pattern. Two notes signals the companion has been tracking something across reading sessions.

### Build Status
✅ Clean build — 53b6bc4

---

## Session 60 — 2026-05-18
**Theme:** Companion Memory Depth Pass

Architecture finding: the companion was present-tense reactive but did not yet feel like it carried deep evolving literary memory. Each surface responded to current state, but the companion didn't visibly track how the reader's understanding had changed over time.

### What Was Built

**companionPresence.js — 3 new memory recall lenses**

1. **`recallObs`** — fires when a character's notes show a chronological interpretation shift: confusion notes appearing earlier, theory notes appearing later for the same name. Produces lines like "Your reading of [Name] has changed since the opening — what unsettled you then has become something you're actively theorising about." Also fires for 2+ revised theories (general fallback).

2. **`gravitationObs`** — fires when the same character first name appears in 2+ theory/confusing/character notes AND in at least 1 open mystery thread. Produces lines like "Your attention keeps returning to [Name] — they appear in your notes and in your unresolved questions at the same time." Cross-tab signal: explicitly links Notes data to Mysteries data.

3. **`dormantMysteryObs`** — fires for mysteries with status `'dormant'` or open 7+ chapters with no reader observation added (but below the 10+ threshold of `lingeringMysteryObs`). Produces lines like "A thread opened in chapter N has been quiet for a while. The story may still be carrying it." Surfaces quiet tension rather than absent tension.

Cap raised to 10 observations for `analytical` style (was 8).

**CharactersTab.jsx — `getCharacterNarrative` returns `[primary, secondary]`**

- `primary`: most meaningful interpretive signal (same logic as before, now includes `hasShift` as top priority)
- Chronological shift detection: `firstConfusing` chronologically before `lastTheory` for the same character → primary becomes `"your understanding has shifted"`
- `secondary`: mystery involvement (`in N open threads`) or allegiance shift (`their allegiance has moved`)
- Character card display: secondary shown as a `✦` companion line below the role/lastSeen row; only shown when non-null
- Name matching changed from full name to first name (more resilient to partial mentions in notes)

**MysteriesTab.jsx — companion gravity: up to 2 lines per mystery**

- Primary: existing age/status signal (unchanged logic)
- Secondary: keyword cross-reference with `book.notes` — if any note contains a word from the mystery text (5+ chars), shows "still present in your notes"
- Tertiary (fills secondary slot if note ref not triggered): cross-mystery connection — if another open mystery shares a 6+ char keyword, shows "connected to another thread"
- Changed from single `<div>` to `<div className="space-y-1">` wrapping 1–2 lines
- Dormant status now generates "drifting — but unresolved" as primary gravity text (was previously not covered)

**ProgressTab.jsx — chapter completion timestamp**

- `toggleChapter` now stores `completedAt: new Date().toISOString()` when marking a chapter complete; clears `completedAt: undefined` on uncheck
- Displays as `finished [date]` (using existing `fmtDate` import) below `ch.summary` in the chapter list
- Chapters accumulate temporal markers — the list increasingly reads as reading history

**NotesTab.jsx — note chapter context**

- New notes store `chapter: book.currentChapter` at time of writing (forward-looking; existing notes unaffected)
- Footer row now shows `· Ch. N` context badge (10px, ink-300) alongside date and "· revisited"
- Notes now carry their place in the reading arc as metadata

### Architecture Decisions

**Why first-name matching in `getCharacterNarrative`**: Full name matching was too strict — readers often write "Hermione" not "Hermione Granger". First name is the natural reference form in annotations.

**Why keyword cross-reference for mystery gravity uses 5-char threshold**: Short words (3–4 chars) produce false positives ("that", "this", "with") — 5+ chars targets meaningful content words.

**Why `dormantMysteryObs` threshold is 7 chapters (not 5 or 10)**: 5 triggers too easily; 10 duplicates `lingeringMysteryObs`. 7 chapters is a natural "the story has moved on significantly but this is still open" signal.

### Build Status
✅ Clean build — 287032c

---

## Session 59 — 2026-05-18
**Theme:** Companion Embodiment + Information Hierarchy Pass

Architecture audit finding: the companion permeates the architecture (Session 58) but still felt architecturally secondary. The companion observations were rich but compressed into thin surfaces. This session gave the companion more spatial authority and emotional weight.

### Hierarchy Audit Findings

**CompanionInsights strip**: Single rotating line (13px italic, py-3.5) between the header and tab bar. Pagination dots made it feel like a slideshow feature. Maximum visual impact available from this surface was untapped.

**Progress tab**: "Chapter Checklist" heading is task-manager language. Chapter summaries exist as `ch.summary` data from AI extraction but were never surfaced. Completed chapters showed nothing but strikethrough titles.

**Notes tab**: `CompanionNoteResponse` (companion's threaded thought) rendered with `border-t border-ink-100` — same visual weight as a divider line. Companion thoughts were indistinguishable from structural chrome. The dominantTag summary was plain text with no companion signature.

**Discussion tab**: Companion reflection (`persistentReflection`) was below a boilerplate description paragraph ("For book clubs, journalling, or the quiet space between chapters.") and only showed when questions already existed. The header read like product documentation, not companion voice.

**Characters/Mysteries**: Session 58 additions confirmed working — `getCharacterNarrative`, chapter age display, and gravity observations all present.

### What Was Built

**CompanionInsights — 2-line presence zone**
- Expanded from single rotating line to 2 stacked observations
- First line: arc position observation (non-italic, `text-ink-600`, medium weight)
- Second line: reader-state or reflection signal (italic, `text-ink-400`, softer)
- Both lines fade together on carousel advance (opacity moved to container, not per-line)
- Padding increased from `py-3.5` to `py-5`
- Pagination dots removed — companion presence doesn't feel like a slideshow
- The companion zone now reads as a genuine interpretive pause between book metadata and tab navigation

**Progress Tab — chapter history inhabitation**
- Removed "Chapter Checklist" section heading (task-manager language)
- Completed chapters with `ch.summary` now show the summary as a 2-line italic caption below the strikethrough title
- Chapter list begins to feel like a reading history rather than a todo list
- Data was always there (populated by AI extraction) — this is pure surfacing

**Notes Tab — companion response visual weight**
- `CompanionNoteResponse` now renders with a warm gold-tinted background (`var(--ca-bg, #FDF8EC)`) and left border (`var(--ca-border, #E8D090)`) — clearly distinct from user reflections and structural chrome
- Added `animate-fade-in` for presence
- dominantTag summary upgraded: now shows `✦` companion signature prefix, slightly larger text (`text-[12px]`), companion voice tone

**Discussion Tab — companion reflection as lead**
- When `persistentReflection` exists, it now leads the header block — companion voice is the first thing, not secondary to a description paragraph
- The generate button is preserved in both branches
- Without a reflection yet: standard header shows (no breaking change)
- Removed boilerplate copy: "For book clubs, journalling, or the quiet space between chapters." — product documentation, not companion voice
- When companion leads: the label becomes "Questions for this reading" (contextual), not a generic description

### Architecture Decisions

- Showing 2 observations simultaneously in CompanionInsights changes the semantic: the companion is offering an orientation pair (position + signal), not a single fact
- The pagination dots removal is philosophically significant: companion presence auto-advances, it doesn't wait for you to navigate it
- Chapter summaries appear only for completed chapters with `ch.summary` — no fabrication, no empty states. If AI extraction wasn't run, nothing shows and nothing breaks
- Discussion tab restructure uses an IIFE to keep the generate button DRY (same button in both branches)

### Build Status
- ✓ 70 modules transformed, 238ms, no errors

---

## Session 58 — 2026-05-18
**Theme:** Companion-Inhabited Tab Architecture Pass

Strategic shift: the companion stops being a feature attached to the product and begins permeating the product's architecture. Every major tab now carries some presence of the companion's awareness.

### Architecture Audit Findings

Every tab audited against the question: does the companion feel embedded or bolted on?

- **Dashboard (CompanionHeader + CompanionInsights)**: CompanionInsights carousel is well-positioned above the tabs but CompanionHeader is purely functional/administrative — no companion voice. The carousel is a separate surface, not woven into the tab architecture.
- **Progress tab**: Entirely absent — one empty-state line ("The companion is open.") but no companion voice for active readers. The most-visited surface has zero companion presence.
- **Notes tab**: Delayed thoughts exist but float as a banner in CompanionInsights, detached from their parent notes. Notes don't feel threaded.
- **Characters tab**: Pure database. `lastSeen: "Ch. ##"` is administrative, not narrative. `generatePresence` knows far more about characters than the tab shows.
- **Mysteries tab**: Tracker only. Chapter age partially shown (8+ cap), but no companion weight, gravity, or pattern observations.
- **Discussion tab**: Best companion presence, but concentrated here rather than permeating elsewhere.

### What Was Built

**Progress Tab — CompanionOrientation block**
- `CompanionOrientation` component added above the chapter list
- Uses `generatePresence(book, settings)` and surfaces the first 2 observations
- Arc position always first (bold, `text-ink-700`), reader-state signal second (italic, `text-ink-500`)
- Only renders when the reader has started reading (`!isNew`)
- Companion voice now greets the reader every time they check progress

**Notes Tab — Inline companion response threads**
- Imported `getResurfaceWindowMs` from `reflectionEngine.js`
- `surfacedThoughts` map: matches `book.delayedThoughtQueue` entries to parent notes by `noteId`, filtered to entries that have aged past the surfacing window
- `CompanionNoteResponse` component renders the thought inline: `✦` prefix, italic text, attached below the note's body/reflection section
- Delayed thoughts are now part of the note thread — not floating system messages

**Characters Tab — Narrative presence descriptors**
- `getCharacterNarrative(char, book)` function: checks the reader's notes for the character's name, synthesizes a contextual descriptor based on how the character appears in the reader's notes (theory count, confusing tags, revision signals, etc.)
- Descriptors: "at the center of X of your theories", "still raising questions", "recently considered", "your understanding has shifted", etc.
- Shown in collapsed row summary (italic, `text-ink-400`) and in the expanded "Last seen" detail section
- Characters now reflect back what the reader has been noticing

**Mysteries Tab — Chapter age + companion gravity**
- Chapter age shown for all mysteries open 3+ chapters (was 8+)
- `companionGravity` IIFE per mystery: produces presence strings for mysteries open 5+ chapters
- Strings: "still pulling at N chapters" (12+ suspected/evolving), "unanswered for N chapters" (12+ open), "your suspicion hasn't faded" (5+ suspected), "still developing" (5+ evolving)
- Rendered with `✦` prefix as a quiet companion observation line
- Mysteries now feel like they have narrative weight, not just tracker status

**Bug Fixes**
- **Chapter deselect `currentChapter` regression**: when unmarking a chapter AT OR AFTER `currentChapter`, recalculates to the highest still-completed chapter (was keeping `currentChapter` at the unmarked position, leaving a confusing gold dot on what looked like a selected radio button)
- **Discussion question spoiler leak on chapter rollback**: `toggleChapter` now detects when `newCurrent < book.currentChapter` and clears `discussionQuestions + aiQuestionsGenerated` — questions regenerate at the correct chapter position
- **`claude-3-5-haiku-20241022` model not found** (Session 57 fix): updated `MODEL` constant to `claude-haiku-4-5-20251001`; replaced hardcoded string in `sendCompanionMessage` with `MODEL`

### Architecture Decisions

- `generatePresence` is the foundation — its observations are rich enough that surface-level exposure (first 2 lines) already makes the Progress tab feel inhabited
- Character narrative context is derived from the reader's own notes, not from AI — the companion reflects the reader's attention back at them
- Mystery gravity is rule-based and threshold-driven — no AI needed, just time + status
- Inline note responses use the same delayed thought data already in the queue — no new data model, just a display change
- The companion's voice across all tabs remains consistent in register: quiet, observational, never presumptuous

---
**Theme:** Companion Experiential Validation + Active Interaction Pass

The goal: make the companion feel experientially alive during active use — consistently responsive, emotionally tangible, and trustworthy. Full pipeline audit + first implementations of devMode, active conversation surface, delayed thought queue, and source visibility.

### Root Causes Identified (Audit)

1. **8-hour resurfacing cooldown** — reflections surfaced once, then disappeared for the entire session. No dev bypass existed.
2. **No dev feedback loop** — cooldowns, thresholds, and carousel timing were all production values. Testing was indistinguishable from a broken experience.
3. **Companion was silent during note entry** — no response generated when a note was added; no queue, no acknowledgment.
4. **No active conversation surface** — companion could display reflections but never respond to a reader's message.
5. **Presence frequency was a stub** — select existed in earlier iterations but was never wired to actual timing behavior.
6. **Shadow Mode was disconnected** — toggle in settings never applied the CSS class.

### New: Dev Mode

- `SETTINGS_DEFAULTS.devMode = false` added to `SettingsContext.jsx`
- When on: resurfacing window → 20s, observation cap → 12, note threshold for reflections → 1, AI threshold → 2, carousel → 4s, 3rd reflection slot in carousel, `html.dev-mode` CSS class applied
- `getResurfaceWindowMs(settings)`, `getObservationCap(settings)`, `getReflectionNoteThreshold(settings)`, `getAIReflectionNoteThreshold(settings)` added to `reflectionEngine.js` — each reads devMode first, then presenceFrequency
- Settings page: "Developer / Testing" section with Dev Mode toggle + sienna warning banner + link to /debug
- `App.jsx`: applies `html.dev-mode` class alongside `html.dark` and `html.shadow`

### New: Presence Frequency

- `settings.presenceFrequency` (`'quiet'` / `'balanced'` / `'attentive'`) added to SettingsContext
- Quiet: 24h cooldown, 3 observation cap, 15s carousel
- Balanced: 8h cooldown, 6 cap, 8s carousel (default)
- Attentive: 2h cooldown, 8 cap, 5s carousel
- All values derived by `getResurfaceWindowMs` / `getObservationCap` functions

### New: Shadow Mode (fully wired)

- `settings.shadowMode` was a disconnected local state; now bound to settings store
- `App.jsx` applies `html.shadow` class when enabled
- CompanionInsights: carousel slows to 12s in shadow mode

### New: Active Companion Conversation (CompanionChat)

- `sendCompanionMessage(message, ctx, book, apiKey, history)` added to `aiExtractor.js`
  - Model: `claude-3-5-haiku-20241022`, max_tokens: 350
  - Literary companion system prompt: 2–4 sentences, may ask one question, never spoils
  - Keeps last 8 exchanges as history; refuses therapy-speak and faux-profound openers
- `CompanionChat` component added at top of `DiscussionTab.jsx`
  - Visible when `hasApiKey || devMode`
  - 5 context-aware prompt suggestions (5th uses interpretationShifts data if available)
  - Message thread: user = dark bubble, companion = italic with `✦` prefix
  - Rule-based fallback when no API key + devMode: responds based on detected themes/characters/confusion keywords
  - Enter to send, Shift+Enter for newline

### New: Delayed Thought Queue

- `generateDelayedThought(note, ctx, apiKey)` added to `aiExtractor.js`
  - Triggers for notes tagged `theory`, `character`, or `confusing`
  - Returns `{ id, text, queuedAt, noteId, type: 'delayed' }` or null; max_tokens: 120
- `NotesTab.jsx`: calls `generateDelayedThought` after save; pushes to `book.delayedThoughtQueue`
- `CompanionInsights.jsx`: `useDelayedThought` hook polls queue; surfaces when `ageMs >= windowMs`
  - Rendered as a distinct banner below the main carousel strip with `◈` icon and dismiss button

### New: Source Badges in CompanionInsights

- `SourceBadge` component: shows `AI` / `RULE` / `DELAYED` / `CONTINUITY` / `FALLBACK` labels
- Visible only in dev mode for reflections (not presence observations)
- Carousel weaving: reflections injected at positions 1 and 4 (plus position 7 in dev mode)
- Parallel `observationTypes[]` array tracks type of each pool entry for badge display
- `◆` icon for reflections, `✦` for presence observations

### DebugPage — LiveCompanionPanel

- New default panel: "Live Companion" (replaces Reflection Engine as default view)
- Status grid: Notes count, reflection threshold, AI threshold, queue length, eligible reflections, cached count
- Surfacing status: cooldown countdown, eligible reflection count
- Reflection queue: type badge, priority badge, surface count, text preview, cooling/suppressed indicator
- Delayed thought queue: item list with readiness countdown
- Action buttons: Force rule regen, Force AI reflection (calls `generateCompanionReflections`), Queue delayed thought (immediate synthetic thought if no API key), Clear all cooldowns, Clear all

### Bugs Discovered During Testing

**Bug 1: Discussion questions don't respect chapter rollback (spoiler leak)**
When a reader marks chapter 18 read, AI discussion questions are generated for that position. If the reader then rolls back to chapter 14, the questions are not regenerated — they silently retain content from chapters 15–18 that the reader has declared they haven't reached. Severity: high (spoiler safety violation).

**Bug 2: Character data never updates on chapter rollback**
Character details (relationships, traits, story role) are extracted and cached at the point of initial AI extraction. Rolling back progress does not re-extract or filter characters to the new boundary. Characters the reader hasn't met yet may remain visible. Severity: high (spoiler safety violation).

**Bug 3: Chapter deselect state is visually ambiguous**
In the Progress tab, toggling a chapter from "read" back to "unread" leaves a radio button with a filled green circle — users can't clearly distinguish "I've read this" from "I've been to this chapter but am not past it." The deselected state reads as selected.

### Model Fix

Companion chat was non-functional at launch: `sendCompanionMessage` and `generateDelayedThought` used the hardcoded string `'claude-3-5-haiku-20241022'` instead of the `MODEL` constant. API returned `"model: claude-3-5-haiku-20241022"` not-found error. Fixed by updating the constant to `claude-haiku-4-5-20251001` and replacing the hardcoded string with `MODEL`.

### Companion Validation Results

- Dev Mode cadence verified: 4s carousel, 20s resurfacing window active
- Reflection generated and carousel-surfaced: rule-based type with `RULE` source badge visible in strip
- Companion chat verified via CompanionChat component (rule-based path in dev mode)
- Delayed thought queue populated via NotesTab; banner displayed in CompanionInsights
- Shadow Mode CSS class applied; 12s carousel cadence confirmed

---

## Session 55 — 2026-05-17
**Theme:** Identity + Legacy UI Coherence Pass

### Brand Remnant Audit
Found and fixed all user-visible "Shadow Scribe" references:
- `index.html` title: "Shadow Scribe — Your Book Companion" → "Lantern — Your Book Companion"
- `TopNav.jsx` header wordmark: "Shadow Scribe" → "Lantern"
- `TopNav.jsx` menu footer: "Shadow Scribe" brand label → "Lantern" + new copy ("A living space for reading. Literary memory, held gently.")
- `CreateCompanion.jsx` spoiler step copy: "How careful should Shadow Scribe be..." → "How carefully should the companion guard what lies ahead?"
- `EpubImportReview.jsx` same spoiler step copy — same fix
- `SettingsPage.jsx` appearance section description → "How Lantern looks and feels."
- `SettingsPage.jsx` import error message → "make sure it's a Lantern export"
- `SettingsPage.jsx` export filename → `lantern-library-{date}.json`

**Frozen (intentionally preserved):** `shadowscribe_books`, `shadowscribe_settings` localStorage keys — no migration planned.

### Shared Warm Form System (`index.css`)
Added `.input-warm`, `.select-warm`, `.selector-card`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger` CSS classes. Applied throughout Create Companion, Settings, and EpubImportReview.

- `.input-warm` / `.select-warm`: `var(--color-cream-50)` background — warm vellum tone, not pure white
- `.selector-card` + `.selector-card.active`: border-2 selection cards; active = gold border + gold-bg
- `.btn-primary`: gold fill, `border-radius: 0.75rem`, disabled at 38% opacity
- `.btn-secondary`: transparent, quiet ink border — for Back/Cancel actions
- `.btn-ghost`: small inline actions (Export, Import, Open →)
- `.btn-danger`: restrained — ember border, fills on `.active` class
- **Dark mode**: inputs use `cream-200` background
- **Shadow mode**: inputs and selector cards use `cream-200` (slate-blue surface, not white)

### Create Companion Refine
- Heading subtitle: "We'll build your companion from here." → "The companion begins from here." (quieter, literary)
- Spoiler step subtitle: "How careful should Shadow Scribe be..." → "How carefully should the companion guard what lies ahead?"
- Format cards: replaced hardcoded `bg-white border-2` with `.selector-card` + `.active`
- Mood buttons: replaced inline classes with `.selector-card`; active mood gets mood-color tinted background
- EPUB import box: changed `bg-cream-50 border-dashed border-ink-200` → `bg-cream-200/60 border-dashed border-ink-300` (more grounded)
- EPUB import button: `.btn-ghost`
- Placeholder cover slot: `bg-white` → `bg-cream-200`
- All inputs: `bg-white` → `.input-warm`
- Continue / Back buttons: `.btn-primary` / `.btn-secondary`
- Final cta copy: "✦ Begin the companion" (unchanged); footer copy: "Characters, mysteries, and notes come as you read."

### Settings Page Updates
- All `<select>` elements: `bg-white` → `.select-warm`
- API key input: `bg-white` → `.input-warm`
- Export/Import/Companion Inspector buttons: `.btn-ghost`
- Cancel button: `.btn-ghost`
- Reset button: `.btn-danger` (with `.active` modifier on confirm)

### EpubImportReview Updates
- `inputCls` variable: replaced full inline class string → `"input-warm"`
- All format / structure / spoiler mode / series selector cards → `.selector-card` + `.active`
- Mood buttons → `.selector-card`
- Chapter list rows: `bg-white hover:bg-cream-50` → `bg-cream-50 hover:bg-cream-200`
- Nav buttons: `.btn-primary` / `.btn-secondary`

### Visual QA Results
- **Companion active**: Dev Mode cadence confirmed (3s carousel, 30s resurfaceMs)
- **DebugPage pipeline**: Active cadence "dev" shown; "Under the Whispering Door" reflection cooling countdown live
- **Shadow Mode**: `html.shadow-mode` applied; body bg `rgb(20, 23, 29)` = `#14171D`; form inputs `rgb(30, 35, 48)` = `cream-200` in shadow palette — zero white surfaces
- **Mobile (375px)**: All elements present; Continue button 46px tall, inputs 44px — meets tap target minimum
- **No console errors**

### Remaining UI Coherence Risks
- Modal interiors (ChapterUpdateModal, mystery/character editing) still use ad-hoc inline styles — not yet on the form system
- DebugPage form controls not updated (intentional — QA-only tool)
- Dark Mode not visually re-QA'd this session (structural changes were backwards-compatible)

---

## Session 54 — 2026-05-17
**Theme:** Companion Activation + Presence Systems Pass

### Root Causes of Unreliable Companion Presence (Audit)
Full pipeline audit identified five structural causes of companion silence:
1. **8-hour resurfacing cooldown** — reflections surfaced once, then disappeared for 8 hours during testing
2. **AI threshold too high** — `noteCount >= 5` required for AI; most test sessions don't reach this
3. **Content gate too strict** — `noteCount < 3 && mysteries < 2` blocked generation for sparse readers
4. **No Dev Mode cadence overrides** — testing used the same restrictive rules as production
5. **Silent AI failures** — API errors caught silently; no visibility into what failed or why

### New Systems

**Cadence Config (`reflectionEngine.js`)**
- `CADENCE_CONFIG` object with 4 preset levels: `quiet` / `balanced` / `attentive` / `dev`
- Each controls: `resurfaceMs`, `carouselMs`, `aiNoteThreshold`, `contentGateNotes`, `contentGateMyst`, `reflectionLimit`
- `getCadence(settings)` — returns active cadence; `devMode` overrides `presenceFrequency` always
- Dev: 30s resurface, 3s carousel, 1 note threshold, 0 content gate, 5 reflection slots
- Balanced (default): 8h resurface, 7s carousel, 5 note threshold

**Presence Frequency Setting**
- New `presenceFrequency: 'balanced'` setting (quiet / balanced / attentive)
- Selector in Settings → Companion Behavior — no longer a stub
- Influences: reflection resurfacing window, carousel speed, AI/content thresholds, reflection limit
- Philosophy: literary cadence preference, not notification frequency

**Shadow Mode**
- New `shadowMode: false` setting, Toggle in Settings → Appearance — no longer a stub
- Applies `html.shadow-mode` CSS class
- Nocturnal atmosphere: deep slate-blue surfaces instead of warm cream; cooler text; muted companion accent (softer amber instead of bright gold); cooler ambient gradient; more visible grain texture
- NOT extra dark mode — a distinct, deeper, quieter reading atmosphere
- Companion behavior via presenceFrequency interaction (quieter reading → slower cadence)

**Dev Mode Evolution**
- Existing `devMode` setting now drives cadence overrides (was previously only a visual flag)
- When on: 30s cooldowns, 1-note AI threshold, 0 content gate, 3s carousel, 5 reflection limit
- Settings → Developer: **Dev Mode** toggle now persists and fully changes pipeline behavior
- `dev-mode` CSS class applied to `html` for ambient gradient signal
- **DEV** indicator appears in CompanionInsights strip when active

**AI Pipeline Telemetry (`src/utils/aiPipelineState.js`)**
- New module-level singleton for session-scoped AI diagnostics
- Records: `recordAttempt`, `recordSuccess`, `recordFailure`, `recordFallback`, `recordSuppressed`
- Suppression reasons: `content-gate` / `no-key` / `low-notes`
- Session totals: AI successes, failures, fallback count

**Companion Pipeline tab (DebugPage)**
- New default tab in Companion Inspector
- Shows: session AI totals, active cadence grid (all 6 cadence params), per-companion pipeline state
- Per-book: last attempt/success/failure timestamps, failure reason, suppression reason with context, cooldown state per reflection with seconds-accurate remaining time
- Preset comparison: quiet / balanced / attentive / dev resurfaceMs shown inline

**Fallback Warm Observations (CompanionInsights)**
- When all cached reflections are cooling but notes exist, a warm fallback observation surfaces
- 8 restrained fallback strings (e.g. "Something in your notes is still settling. Worth returning to.")
- Prevents dead silence after meaningful reader input between cooldown windows

### Modified Files
- `src/utils/aiPipelineState.js` — new module-level telemetry singleton
- `src/context/SettingsContext.jsx` — added `shadowMode`, `presenceFrequency`, `devMode` (already existed, now fully wired)
- `src/utils/reflectionEngine.js` — `CADENCE_CONFIG`, `getCadence()`, updated `getActiveReflections(book, limit, settings)`, `pickCompletionReflection(book, settings)`, `pickReturnReflection`
- `src/components/dashboard/CompanionInsights.jsx` — cadence-aware pipeline, aiPipelineState telemetry, fallback observations, settings-aware content gate, DEV indicator
- `src/pages/SettingsPage.jsx` — Shadow Mode wired, Presence Frequency wired (dropdown), Dev Mode label updated, Companion Inspector link in Developer section
- `src/App.jsx` — `shadow-mode` and `dev-mode` CSS classes applied to `html` element
- `src/index.css` — Shadow Mode palette (slate-blue nocturnal), Dev Mode ambient gradient signal
- `src/pages/DebugPage.jsx` — Companion Pipeline tab (new default); `getCadence`, `CADENCE_CONFIG`, `aiPipelineState` imports; cooldown display in seconds for sub-minute waits

### Decisions
- Presence Frequency user-facing levels: Quiet / Balanced / Attentive (no "Dev" in the UI dropdown — Dev Mode is the QA layer)
- Shadow Mode is NOT just extra dark mode — it has a cooler, slate-blue palette and is a distinct atmospheric state
- Fallback reflections are warm and non-specific — they imply presence without claiming insight
- `aiPipelineState.js` resets on page reload by design — session diagnostics, not persistent history

---

## Session 53 — 2026-05-17
**Theme:** Emotional Legibility + Illumination Readability Pass

### Summary
Audited all companion interactions and atmosphere signals for emotional legibility — whether readers intuitively understand what Lantern is noticing, holding, and quietly illuminating — without over-explaining. Implemented three targeted code changes and formalized the illumination language system in docs.

### Audit Findings

**What works:**
- Arc observations in `companionPresence.js` are narratively fluent — readers understand their progress through story beats, not percentages
- CompanionHeader copy is entirely literary ("Tell the companion where you are", "the story ends here ✦")
- BookCard hover (title glows gold) communicates attention warmly
- The full presence observation pipeline is sophisticated and emotionally tuned when it fires
- `isFirst` done state ("Your companion is awake.") correctly marks the companion's first announcement

**Gaps identified:**
1. **Metric-flavored ReadingMomentum copy** — "X-day reading streak" is Duolingo energy; "sessions total" is pure metric with no emotional register
2. **Early reader observation gap** — `readerObs` only fires at 3+ notes; with 2 notes, only the arc observation shows (once the intro reflection from Session 52 has cooled after 8h)
3. **No visual distinction between presence observations and remembered reflections** — the insight strip looks identical whether surfacing "The foundations are being laid" (arc observation) or a cached thought the companion has been holding; readers can't feel the difference
4. **No constellations, reread echoes, or warmth-aging** — these concepts appear in the product vision but are not yet built; documented as future directions

**Out of scope (not implementable this session):**
- Constellations (note clustering visual) — future feature; documented as design direction
- Reread echoes — future feature
- Warmth aging (opacity decay by note recency) — future feature
- Mobile-specific emotional readability — no issues found; existing atmosphere translates well

### Modified

- **`src/components/dashboard/ReadingMomentum.jsx`**
  - Continuity-first language pass throughout:
    - `"${streak}-day reading streak"` → `"${streak} days returning to this story"` — removes Duolingo metric energy
    - `"${streak} days in a row"` → `"${streak} days returning"` — same
    - `"Reading two days in a row"` → `"Back two days running"` — warmer
    - `secondary = "${sessions} sessions total"` → removed — pure metric, no emotional register
    - `"${recent7} sessions in 7 days"` → `"Something has pulled you back repeatedly."` — continuity over count
    - Sessions fallback: `"${sessions} session${s} recorded"` → `"${weeks} weeks with this book"` / `"${sessions} sessions with this book"` — presence over tracking

- **`src/utils/companionPresence.js`**
  - `readerObs()`: added early acknowledgment at `notes.length === 2`: "Two thoughts held here now. They're beginning to form a thread."
  - Placed after the ≥3 threshold, before function return — fires in observational and analytical style, fills the gap between the Session 52 intro reflection (first note) and the richer observations that require 3+ notes

- **`src/components/dashboard/CompanionInsights.jsx`**
  - Added `isCurrentReflection = !!reflectionIndexMap[idx]` — computed each render, no new state
  - Insight strip background shifts based on content type:
    - Presence observation (arc, mystery, reader lens): `color-mix(..., 55%)` — default cooler tint
    - Cached reflection (something the companion is holding): `color-mix(..., 78%)` — warmer tint
    - Transition: 900ms ease — imperceptible shift, not an animation
  - Design intent: readers gradually learn the environmental language. Warmer = remembered. Cooler = observed. No labels, no explanation.

### Illumination Language System (formalized)

This session formalizes Lantern's environmental meaning system as a design language. It is never exposed as UI documentation.

| Signal | Meaning |
|--------|---------|
| ✦ breathing (9s ambient) | Companion is present and attentive |
| Warmer insight strip | Surfacing something held in memory (a reflection) |
| Cooler insight strip | Offering an in-the-moment observation |
| Carousel with dots | Multiple observations/thoughts in circulation |
| Single observation, no dots | Companion is quiet but still present |
| Dormant card (62% opacity) | Memory honored, not active |
| Archive card (38% opacity) | Very old memory, nearly footnote |
| `.ember-drift` float on ✦ | Companion's ambient awareness |

### Philosophy Note
Emotional legibility ≠ mechanical legibility. Lantern should never feel like it is exposing internal AI systems. The goal is that readers gradually learn the emotional language of the environment itself — when warmth gathers, something is being held; when the companion is still, it is not absent; when silence persists, it is intentional.

---

## Session 52 — 2026-05-16
**Theme:** First Response Guarantee + Dev Mode Toggle Pass

### Summary
Solved the core trust problem: adding notes produced zero visible companion responses. Root cause confirmed (pipeline audit): `generateRuleBasedReflections()` returns `[]` for simple, untagged notes; when `ruleReflections.length === 0`, the pipeline bails silently and nothing reaches the carousel. Added a guaranteed first-note response that bypasses all pipeline gates, plus a persistent `devMode` toggle for testing.

### Audit Findings (carried from pipeline audit in Session 52 prep)
- `generateRuleBasedReflections()` needs specific conditions: 3+ theory-tagged notes, or 3+ notes containing THEME_KEYWORDS hits, or interpretation shifts (4+ notes with same character). Simple notes produce `[]`.
- Gate 3 (`if (!ruleReflections.length) return`) is the silent failure point.
- Presence observations (arc-based) DO show; they just don't feel reactive to what was written.
- 6 notes with normal tags and language → zero reflections → reader assumes companion is broken.

### Modified

- **`src/utils/reflectionEngine.js`**
  - Added `FIRST_INTRO_POOL` — 6 literary first-response strings
  - Added `generateFirstIntroReflection()` — returns a ReflectionEntry with `_intro: true`, priority 2, surfaceCount 0
  - `getActiveReflections()` — added optional `devMode` param; when true, sets `resurfaceMs = 0` (bypasses 8h cooldown)

- **`src/tabs/NotesTab.jsx`**
  - Imported `generateFirstIntroReflection`
  - `addNote()`: detects `isFirst = !book.companionIntroResponded && book.notes.length === 0`; on first note, adds `companionIntroResponded: true` and seeds `reflectionCache` with intro reflection in the same `onUpdateBook` call — guaranteed visible response after first note

- **`src/context/SettingsContext.jsx`**
  - Added `devMode: false` to `SETTINGS_DEFAULTS`

- **`src/components/dashboard/CompanionInsights.jsx`**
  - Gate 1 now bypassed when `settings.devMode` is true
  - `getActiveReflections` called with `settings.devMode` — zero cooldown in dev mode
  - Carousel interval: `settings.devMode ? 3000 : 7000` — faster cycling for testing
  - `settings.devMode` added to relevant effect dependency arrays

- **`src/pages/SettingsPage.jsx`**
  - Added "Developer" `SettingsSection` at the bottom (before footer) with `devMode` Toggle
  - Description: "Increases companion responsiveness and shortens cooldowns for testing. Not intended for normal reading."

- **`src/pages/DebugPage.jsx`**
  - Imported `getActiveReflections`
  - Added `PipelineDiagnosticsPanel` component — shows per-book: `companionIntroResponded` flag, `reflectionCache` state, Gate 1/2/3 evaluation results with explanatory notes, resurfacing eligibility (normal vs devMode), and devMode state summary
  - Added "Response Pipeline" tab to the section toggle (4th panel alongside Extraction, Reflection Engine, Note Intelligence)

### New data field
- `book.companionIntroResponded: boolean` — set to `true` on first note, prevents intro reflection from repeating across re-creates

### Philosophy note
The intro reflection is not a warm-up message or onboarding copy. It is the companion's first acknowledgment that a thought has been recorded — quiet, literary, non-conversational. It uses the same ReflectionEntry shape as all other reflections and enters the same carousel rotation.

---

## Session 51 — 2026-05-16
**Theme:** Deep Reading Immersion + Active Session UX Pass

### Summary
Made Lantern feel like a living literary environment that wraps around active reading sessions — not a destination visited between chapters. All changes are atmospheric and interaction-level. No new data structures, modes, or toggles. The principle: Lantern should never interrupt reading; it should quietly deepen the feeling of remaining inside the book.

### Audit Findings
- **ChapterUpdateModal** — backdrop and modal entrance were instant/springy (app-like); textarea placeholder was functional/complex; the done-state close button appeared simultaneously with content
- **NotesTab** — when composing, search, filters, and full notes list stayed fully visible with no quieting; textarea was small and form-like with a utilitarian placeholder
- **ProgressTab** — `text-5xl font-bold text-ink-900` progress number was too bold and assertive for a reflective space
- **Dark mode** — `body::before` ambient gradient had no dark-mode override; night reading was cold with zero warmth
- **Long-session cadence** — the existing 8h resurfacing window and 7s carousel auto-advance are already well-tuned; no changes needed
- **Task 11 (audio/haptic)** — not implementable in a browser web app; noted for future native consideration

### Modified

- **`src/index.css`**
  - New keyframes: `backdropArrive` (300ms, fade — overlay arrives before modal), `modalSettle` (380ms, spring ease — replaces slide-up), `ambientBreath` (9s, barely perceptible opacity oscillation — 0.42→0.62 on the ✦ glyph)
  - New classes: `.modal-backdrop` (backdrop fade), `.modal-settle` (modal entrance with spring feel), `.ambient-breathe` (9s infinite breathing on ✦)
  - New focus state system: `.note-writing-mode .note-dim` (dims to 32%, no pointer events) and `.note-writing-mode .note-dim-light` (dims to 50%) — both with 380ms transition. Applied to search bar, filter row, and notes list when composing
  - **Dark mode ambient warmth**: `html.dark body::before` now has a restrained three-layer candle-glow gradient (0.022→0.012 opacity; notably lower than light mode 0.05→0.02 — barely-there warmth, not visible heat)

- **`src/components/modals/ChapterUpdateModal.jsx`**
  - Backdrop overlay: `modal-backdrop` class (300ms fade-in); backdrop opacity lowered from 0.45 → 0.42; backdrop blur increased to 7px
  - Modal dialog: `animate-slide-up` → `modal-settle` (spring cubic-bezier — arrives as if settling, not bouncing)
  - Textarea placeholder: `"Just finished Chapter X" · "Starting Part III"…` → `"Where has the story taken you?"` (one quiet question)
  - Textarea: `py-3` → `py-3.5`, added `leading-relaxed` (more breathing room)
  - Done state "Return to the story" button: delayed `warmSettle 0.38s ease-out 0.42s both` — appears 420ms after done state settles, not simultaneously with content

- **`src/tabs/NotesTab.jsx`**
  - Outer container: receives `note-writing-mode` class when `adding === true`
  - Search bar: `note-dim` class (dims to 32% + no pointer events during composition)
  - Filter/tag row: `note-dim-light` class (dims to 50% during composition)
  - Notes list: `note-dim` class (dims during composition — focus stays on the new thought)
  - Dominant-tag summary: `note-dim-light` class
  - Textarea: `rows={3}` → `rows={4}`, `bg-white` → `bg-cream-50`, added `leading-relaxed font-serif` (journal materiality), placeholder → `"A thought before it disappears…"`

- **`src/components/dashboard/CompanionInsights.jsx`**
  - ✦ glyph: added `ambient-breathe` class — opacity oscillates 0.42→0.62 over 9s, barely perceptible, communicates companion awareness without chat-presence energy. Removed explicit `opacity: 0.75` (now controlled by animation)

- **`src/tabs/ProgressTab.jsx`**
  - Progress number: `font-bold text-ink-900` → `font-semibold text-ink-700` — quieter, less assertive, more appropriate for a reflective reading record

### Not Changed
- Companion observation pipeline, reflection system, 8h resurfacing window — already tuned for long sessions
- No new "reading mode" toggle or UI mode switch — all changes are environmental/atmospheric
- No new localStorage fields or data shapes
- No haptic/audio — browser web app; noted for future native consideration

---

## Session 50 — 2026-05-16
**Theme:** Immersion Choreography + Emotional State Transitions Pass

### Summary
Movement through Lantern now feels like shifting through literary memory, not navigating app screens. All changes are pure animation and interaction choreography — no new data structures, no behavior changes, no new features. The goal: every entrance, every state change, every form arrival carries a sense of weight and atmosphere.

### Modified

- **`src/index.css`**
  - New keyframes: `bookPageEnter` (420ms, soft blur dissolve + upward drift — warmer than `viewIn`), `noteFormArrive` (300ms, descends from above — paper alighting), `noteArrive` (280ms, rises from below — thought emerging), `doneArrive` (380ms, scale+Y cubic-bezier — done state settles with presence), `warmSettle` (340ms ease-out, gentle upward rise — list items, empty states)
  - New `@theme` tokens: `--animate-book-enter`, `--animate-note-form`, `--animate-note`, `--animate-done`, `--animate-warm`
  - New classes: `.book-enter` (book page entrance), `.note-form-emerge` (form arrival), `.note-arrive` (new note in list), `.done-arrive` (chapter done state), `.warm-settle` (general atmospheric settle — EmptyState, ReadingMomentum, chapter list items)

- **`src/App.jsx`**
  - Route-aware entrance: `/book/` routes use `.book-enter` (420ms atmospheric dissolve); all other routes use `.view-enter` (220ms standard)

- **`src/tabs/NotesTab.jsx`**
  - "All" filter: filled pill (`bg-ink-900 text-white rounded-full`) → quiet text-link tab with bottom-border active state — consistent with Library filter bar and MysteriesTab
  - Note form: `animate-slide-up` → `note-form-emerge` (form descends from above, not slides from below — more editorial)
  - Added `lastAddedId` state: new notes receive `note-arrive` class for entrance — the most recently saved thought rises into view

- **`src/tabs/MysteriesTab.jsx`**
  - Filter buttons: filled pill style (`bg-ink-900 text-white rounded-full`) → quiet text-link tabs — consistent with Library and NotesTab filter bars
  - Thread form: `animate-slide-up` → `note-form-emerge`

- **`src/components/modals/ChapterUpdateModal.jsx`**
  - Done state: `animate-fade-in` → `done-arrive` (scale + Y cubic-bezier; warmer, more settled presence)
  - Companion reflection: inline delayed animation `warmSettle 0.42s ease-out 0.28s both` — arrives 280ms after the done state, so it feels like a second thought rather than a simultaneous load

- **`src/components/shared/EmptyState.jsx`**
  - Added `warm-settle` class to root element — empty states illuminate into view rather than appearing instantly

- **`src/components/dashboard/ReadingMomentum.jsx`**
  - Added `warm-settle` class to root element — momentum strip settles in softly when the dashboard loads

- **`src/tabs/ProgressTab.jsx`**
  - First 12 chapter rows: `warm-settle` class + staggered `animationDelay` (0ms → 385ms in 35ms steps) — chapter checklist cascades in like a list of chapters, not a data table

### Not Changed
- `DiscussionTab.jsx` — continuity reflection header already has `animate-fade-in`; generating state uses `animate-pulse`; these are appropriate and not jarring
- Data shapes, localStorage, API calls — zero changes
- All Session 49 atmospheric classes (`.atmospheric-card`, `.reading-hero-card`, `.shelf-dormant`, etc.) — untouched

---

## Session 49 — 2026-05-16
**Theme:** Immersive Dashboard + Literary Space Reimagining Pass

### Summary
Full UI/atmosphere overhaul. Lantern transitions from a feature-interface toward a living literary environment. No new data systems; all changes are presentational, compositional, and copywriting.

### Product Rename
- **Shadow Scribe → Lantern** throughout all user-facing surfaces
- Updated: `TopNav.jsx` (brand + menu), `index.html` (title), `SettingsPage.jsx` (description + footer + import error copy), `EpubImportReview.jsx` (spoiler description), `CreateCompanion.jsx` (spoiler description), `DebugPage.jsx` (dev footer)
- NOT updated: `shadowscribe_books` / `shadowscribe_settings` localStorage keys — frozen per memory constraint; renaming requires an explicit migration plan
- NOT updated: internal code comments referencing "Shadow Scribe" (source code comments, not user-visible)

### Modified

- **`src/index.css`**
  - Added keyframes: `illuminateIn` (soft warm blur-fade), `settleDown` (gentle downward), `emberDrift` (4s slow float)
  - Added `@theme` tokens: `--animate-illuminate`, `--animate-settle`
  - New classes: `.atmospheric-card` (shadow-based containment, warm hover), `.reading-hero-card` (featured active book), `.shelf-title` (italic serif section label), `.shelf-dormant` (62% opacity + hover restore), `.shelf-archive` (38% opacity + hover restore), `.ember-drift` (infinite drift on ✦ glyph)
  - Refined `.insight-strip`: tighter opacity mix (45% vs 55%), added `backdrop-filter: blur(4px)`
  - Upgraded ambient gradient: single ellipse → three-layer warmth (top gold, bottom-left sienna, right faint gold)

- **`src/components/layout/TopNav.jsx`**
  - Brand: "Shadow Scribe" → "Lantern"
  - ✦ glyph: added `.ember-drift` class (4s slow float animation)
  - "New Companion" button: replaced hard gold box-shadow button with soft gold-bg/border/text style that hovers to filled gold — less CTA-like, more editorial
  - Menu: "Shadow Scribe" label → "Lantern"; menu description → "A space where literary memory lives." (was "Keep your reading rich, your memory long, and your theories safe.")
  - `border-b border-ink-200` → `border-b border-ink-100` on header (lighter containment)

- **`src/components/library/Library.jsx`** — major structural change
  - `showGrouped = filter === 'all' && !q` drives two display modes
  - Grouped mode: `STATUS_GROUPS` array drives 4 sections (reading now / set aside / finished / archive) each with `.shelf-title` editorial label
  - Reading section: solo book → `featured={true}` BookCard at `max-w-xs`; multiple → 2-col grid
  - Finished section: books wrapped in `.shelf-dormant`
  - Archive: wrapped in `.shelf-archive`
  - Flat mode: unchanged flat grid (filter active or search non-empty)
  - Filter bar: filled pill buttons → quiet text-link tabs with bottom-border active state
  - Sort selector: `<select>` → transparent/borderless with `text-[11px] text-ink-400`
  - Removed: "X companions" count metric (was sterile and dashboard-flavoured)
  - Filter options text: "All / Reading / Finished / Paused" (same options, different presentation)

- **`src/components/library/BookCard.jsx`**
  - Replaced `card-lift ... border border-ink-200` with `.atmospheric-card rounded-2xl`
  - Added `featured` prop (default false): featured mode uses `.reading-hero-card`, wider cover (88px vs 68px), larger title (`text-[14px] font-serif`), more padding, italic date
  - Progress percentage: uses `MOOD_CONFIG[book.mood].color` directly (library is outside `data-mood` wrapper); defaults to `#B8860B`
  - Card text: `text-ink-900` → `text-ink-800` (main), `text-ink-500` → `text-ink-400` (secondary), `text-ink-400` → `text-ink-300` (metadata) — quieter across the board
  - Featured card adds a mood-warmth edge element (gradient overlay on cover right edge, very subtle)

- **`src/components/dashboard/CompanionInsights.jsx`**
  - Insight text: `text-[13px] text-ink-500 italic` → `text-[13px] text-ink-400 italic font-serif` (serif register for literary observations)
  - ✦ glyph: added `.ember-drift` class
  - Breathing room: `py-3.5` → `py-4`; alignment changed to `items-start` to allow natural serif baseline
  - Dots: `w-1.5 h-1.5` → `w-1 h-1`; added explicit opacity (0.8 active, 0.3 inactive) — quieter
  - Fade transition: 420ms → 480ms (more lingering)

- **`src/components/dashboard/CompanionHeader.jsx`**
  - Header background: `bg-cream-50` → `color-mix(in srgb, var(--ca-bg) 25%, var(--color-cream-50))` — very subtle mood-ambient warmth
  - Border: `border-ink-200` → `border-ink-100`
  - Padding: `py-6` → `py-7`
  - Cover border-radius: 12 → 14, `rounded-xl` → `rounded-[14px]`
  - Title: added `tracking-tight`
  - Chapter position: `text-ink-500` → `text-ink-400 italic`
  - Progress percentage: `font-bold` → `text-[11px] font-medium opacity-0.85` (de-emphasized)
  - Section dividers: `border-ink-100` → `border-ink-100/60` (softer)
  - Mood/lifecycle sections: `mt-4 pt-3` → `mt-5 pt-3`

- **`docs/`** — all 6 files updated to Lantern branding + Session 49 philosophy

### Architecture decisions

- **Status-grouped library is display-only.** No new data fields required. Grouping logic is a pure derivation from `book.status` at render time. `showGrouped` is local component state, not persisted.
- **`featured` BookCard prop does not carry mood theming.** Library is outside `data-mood`, so accent colors can't use `var(--ca)`. Instead, `MOOD_CONFIG[book.mood].color` is read directly from config. This is a conscious exception to the "always use `var(--ca)`" rule — acceptable because Library is a display surface, not a companion dashboard.
- **Atmosphere over addition.** No new visual elements (no particles, no constellation graphics, no glow rings). The atmosphere comes from: softer containment, warmer spacing, serif register for observations, quieter secondary text, and layered ambient gradients.
- **Restraint pass applied.** Every addition was tested against: "Does removing this make the experience feel colder?" The ember-drift ✦ passes (removing it kills the only living motion). The three-layer gradient passes (removing it makes the background purely flat).

---

## Session 48 — 2026-05-13
**Theme:** Companion Intelligence Layer v4 — AI Note Intelligence

### Modified

- **`src/utils/aiExtractor.js`** — `generateCompanionReflections` upgraded; `buildAIReflectionContext` extracted and exported.

  **`buildAIReflectionContext(ctx)`** (new exported function):
  - Assembles a compact, high-signal context block from the assembled reflection context without calling the API.
  - 9 input signals (in priority order): `theory-arc`, `interpretation-shift`, `theme-persistence`, `resonance-anchor`, `confusion-signal`, `reader-attention`, `temporal-evolution`, `mystery-continuity`, `character-focus`.
  - Each signal has a threshold before inclusion: interpretation shifts require the character to appear in early AND late notes; mystery continuity requires age ≥5 chapters; character focus requires ≥3 theory notes.
  - Hard cap of 10 context lines — no prompt bloat.
  - Returns `{ lines: string[], signals: string[], estimatedChars: number }`.
  - Used by `generateCompanionReflections` and exported for DebugPage inspection.

  **`generateCompanionReflections(ctx, apiKey)` changes**:
  - Context assembly now delegates to `buildAIReflectionContext` instead of inline logic.
  - Theory note selection now sorts revised notes first (returned-to = stronger signal).
  - Resonance anchor now explicitly selects the note with both `revisedAt` AND `reflection` (deepest investment).
  - `max_tokens` reduced from 500 → 480 (3 × ~1.5 sentences = well within budget).
  - Prompt rewritten:
    - Removed "You are the reading companion" framing (assistant-like).
    - Added diversity instruction: "Each reflection notices something different: vary the angle across character, pattern, emotional register, or interpretive shift."
    - Expanded prohibited phrase list: added "This reader", "Your journey", "You seem", "You have been", "One can see", "There is a", "This speaks to", "This resonates".
    - Added structural prohibition: "Do not open with 'The [abstract noun]'" (catches "The tension", "The weight", etc.).
    - Added explicit anti-patterns: "No therapy-speak. No faux profundity. No chatbot wisdom."
  - Priority derivation from signal presence: `interpretation-shift` → p3; `resonance-anchor` or `theme-persistence` → p2; otherwise p1. Assigned as `[topPriority, max(topPriority-1, 1), 1]` across the 3 reflections.
  - Added internal QA fields: `_sourceSignals: string[]`, `_sourceLineCount: number` (underscore-prefixed; not rendered in UI; stored in localStorage with reflection cache).

- **`src/pages/DebugPage.jsx`** — AI context inspector added to `ReflectionPanel`.
  - Added `buildAIReflectionContext` import from `aiExtractor.js`.
  - Added `[aiCtxOpen, setAiCtxOpen]` toggle state.
  - New collapsible "AI context payload" section in `ReflectionPanel`: shows context line count, estimated char count, detected signals (colour-coded badges: sienna=interpretation-shift, sage=resonance-anchor/theme-persistence, ink=others), and the full set of context lines in monospace.
  - Reflection list rows now show `_sourceSignals` badges and `_sourceLineCount` beneath AI entries (indented, secondary).

### Architecture decisions

- **`buildAIReflectionContext` is pure and exported** — the same function used by the live generation path is inspectable in DebugPage without any API call. "What the AI would receive" is always visible without burning tokens.
- **Signal-derived priority** — AI reflections don't get a flat priority. The richness of the context that produced them determines how often they resurface. An interpretation-shift-grounded reflection (priority 3) will rotate to the front of the carousel faster than a low-signal reflection (priority 1).
- **`_source*` fields are stored but not rendered** — kept in `reflectionCache.reflections` for QA auditability; small enough (array of strings + int) to be negligible storage cost.
- **Prompt spoiler safety** — the context assembly never includes chapter summaries, future character states, or mysteries beyond `currentChapter`. Note text is truncated to 85 chars max to reduce risk of accidentally including spoiler-adjacent reader commentary.

---

## Session 47 — 2026-05-13
**Theme:** Companion Intelligence Layer v2 + v3 — Continuity Surface, Note Intelligence, Emotional Continuity

Combined milestone: v2 (surface reflections at meaningful moments) and v3 (note intelligence layer) implemented in a single pass because v3 signals feed directly into v2 surfaces.

### Modified

- **`src/utils/reflectionEngine.js`** — Complete rewrite (~745 lines). Added note intelligence layer, priority system, new pick functions, and updated cache/sort logic. Major additions:
  - **Note intelligence — theme inference**: `inferNoteThemes(note)` (exported), `analyzeNoteThemes(notes)` (exported). `THEME_KEYWORDS` — 11 themes × keyword sets (grief, suspicion, isolation, trust, fear, ambiguity, obsession/fixation, belonging, guilt, longing, uncertainty). Returns up to 2 themes per note; threshold = 1 keyword hit.
  - **Note intelligence — interpretation shifts**: `detectInterpretationShifts(notes)` (exported). Splits notes at chronological midpoint; extracts named characters from theory/character notes; computes emotional valence (positive/negative/uncertain/mixed) for early vs late notes mentioning each character. `SHIFT_TEXT` — 6 directional phrase generators keyed by `earlyValence+lateValence`.
  - **Note intelligence — link clusters**: `buildNoteLinkClusters(notes)` (exported). Groups notes into theme clusters (shared inferred theme) and character clusters (shared proper noun mention). Returns top 10 by weight.
  - **Note intelligence — resonance weighting**: `computeResonanceWeights(notes)` (exported). Scores each note: base 1, +2 revisedAt, +2 reflection, +1 theory tag, +1 recurring theme (≥3 notes), +1 recurring char mention (≥3 notes). `highResonanceNotes` = score ≥4.
  - **Priority field**: `makeEntry()` now takes `priority` (1–3); all `generateRuleBasedReflections` candidates carry `weight` (existing) and `priority` (new — persisted in cache).
  - **`MIN_RESURFACE_MS = 8 * 3_600_000`** — exported constant; 8h minimum resurfacing window.
  - **`getActiveReflections`** — updated with 3-tier sort: surfaceCount ASC → priority DESC → lastSurfaced AGO DESC. Also filters reflections surfaced within `MIN_RESURFACE_MS`.
  - **`markReflectionSurfaced`** — now wired (was defined but unused in v1).
  - **`pickCompletionReflection(book)`** — for chapter-completion moment; respects 8h window.
  - **`pickReturnReflection(book)`** — for return after ≥7-day absence; ignores 8h window (any reflection is fresh after an absence).
  - **`assembleReflectionContext`** — extended with note intelligence signals: `themeCount`, `dominantTheme`, `recurringThemes`, `interpretationShifts`, `highResonanceNotes`, `resonanceWeights`.
  - **`hashContext`** — extended with `dominantTheme` and `interpretationShifts.length` (invalidates cache when note intelligence signals change).
  - **`extractNameMentions`** — exported (was private; needed by DebugPage).
  - **3 new signal types** in `generateRuleBasedReflections`: `interpretation-shift` (p3, w4 — highest), `theme-persistence` (p2, w2), `resonance-anchor` (p2, w2).
  - **Continuity language variants** added to existing signals: `theory-arc` ("There was an earlier reading of this. It's moved since."), `character-focus` ("You've kept returning to X since early on."), `mystery-continuity` ("This question has followed you for N chapters.").

- **`src/components/dashboard/CompanionInsights.jsx`** — Wire `markReflectionSurfaced` into carousel lifecycle.
  - Added `useRef` import.
  - Added `markReflectionSurfaced` import from reflectionEngine.
  - `observations` useMemo restructured to return `{ observations, reflectionIndexMap }`. `reflectionIndexMap` maps pool index → reflection id for the two woven positions.
  - `surfacedThisSessionRef = useRef(new Set())` — prevents multiple writes for same reflection within session.
  - `reflectionCacheRef = useRef(book.reflectionCache)` — stays in sync via separate effect; avoids adding `book.reflectionCache` to the surfacing effect deps.
  - New `useEffect([idx, reflectionIndexMap, book.id, updateBook])` — fires when carousel advances to a reflection position; marks it surfaced via `updateBook`.

- **`src/components/modals/ChapterUpdateModal.jsx`** — Chapter completion reflection surface + long-pause awareness.
  - Added imports: `logDates` from date.js, `pickCompletionReflection`, `pickReturnReflection`, `markReflectionSurfaced` from reflectionEngine.
  - Added state: `completionReflection`, `gapOnEntry`.
  - `handleUpdate()`: computes gap before adding new session; picks `pickReturnReflection` if gap ≥7 days (ignores 8h window), otherwise `pickCompletionReflection`; marks reflection surfaced in the same `onUpdateBook` call (single localStorage write, no race condition).
  - Done JSX: shows reflection text as small italic line (✦ prefix, no box/label) when `completionReflection && (newCh - prevCh >= 2 || milestone !== undefined || gapOnEntry >= 7)`.

- **`src/tabs/DiscussionTab.jsx`** — Continuity header line.
  - Added `useMemo` import.
  - `persistentReflection` useMemo: prefers already-seen reflections (surfaceCount > 0) sorted by priority DESC; falls back to highest-priority unseen. Deps on `reflectionCache.contextHash` and `reflections.length`.
  - Continuity line added at bottom of the "Questions worth sitting with" header card — separator using `--ca-border`, ✦ prefix, italic ink-400 text. Shows only when questions exist and `persistentReflection` is non-null.

- **`src/pages/DebugPage.jsx`** — Note Intelligence QA panel + Reflection Inspector upgrades.
  - Added imports: `analyzeNoteThemes`, `detectInterpretationShifts`, `buildNoteLinkClusters`, `computeResonanceWeights`, `MIN_RESURFACE_MS` from reflectionEngine.
  - `[reflPanel, setReflPanel]` replaced with `[panel, setPanel]` (string: `'extraction' | 'reflection' | 'intelligence'`). Three-button toggle row.
  - **`NoteIntelligencePanel`** component — per-book QA panel showing: theme distribution (keyword-scored pill badges), interpretation shifts (name + earlyValence → lateValence + note count + generated phrase), high-resonance notes (score badge + tag badge + text snippet), top-6 link clusters (type badge + label + weight).
  - **Reflection list upgrades**: priority badge alongside type badge (colour-coded by priority level — sienna=p3, sage=p2, ink=p1), `lastSurfaced` formatted date, greyed-out + "cooling" label for reflections within `MIN_RESURFACE_MS`.

### Architecture decisions
- **Single-write chapter reflection surfacing.** Reflection is captured BEFORE `onUpdateBook` in `handleUpdate`. The `markReflectionSurfaced` update is merged into the same `onUpdateBook` call. This eliminates the timing race where a regeneration (triggered by `currentChapter` change) could invalidate the reflection before it's marked.
- **Session-level dedup in carousel.** `surfacedThisSessionRef` prevents multiple localStorage writes for the same reflection if it appears multiple times in a session (e.g. after pool reorder). One write per reflection ID per session.
- **`reflectionCacheRef` pattern.** The surfacing effect needs access to the latest cache but must not include it in deps (save→trigger loop). Keeping a ref in sync via a separate shallow effect solves this cleanly.
- **Continuity line prefers seen reflections.** For the Discussion Tab header, the companion deliberately surfaces something already seen — this creates a thread feeling, not a discovery feeling.
- **All note intelligence is on-demand.** No new localStorage fields beyond `priority` on existing `ReflectionEntry` objects. Theme data, resonance scores, clusters, and shifts are recomputed from existing notes each time the context is assembled.

### ReflectionEntry shape (updated)
```ts
{
  id: string
  text: string
  type: 'rule-based' | 'ai'
  priority: 1 | 2 | 3          // NEW — higher surfaces sooner
  surfaceCount: number
  lastSurfaced: string | null
  suppressed: boolean
  generatedAt: string
}
```

---

## Session 46 — 2026-05-13
**Theme:** Companion Intelligence Layer v1 — Reflection Engine, Voice Pass, QA Tooling

### Created

- **`src/utils/reflectionEngine.js`** — Companion reflection engine (~370 lines). Core module for synthesized, retrospective observations that complement the existing `generatePresence` immediate/contextual layer.
  - `assembleReflectionContext(book, settings)` — builds a rich context object: categorized note arrays (`theoryNotes`, `confusingNotes`, `favoriteNotes`, `characterNotes`, etc.), `revisedNotes`, `reflectedNotes`, `openMysteries`, `longestOpenMystery`, `focusedCharacters`, `theoryCharFocus`, `temporalEvolution`, session signals, and progress metadata. Spoiler-safe: never reads chapter summaries, future character states, or mysteries beyond current chapter.
  - `hashContext(ctx)` — 8-field ':'-joined fingerprint for cheap cache invalidation.
  - `shouldRegenerate(book, hash)` — returns true when: no cache, hash mismatch, or cache older than 3 days.
  - `getActiveReflections(book, limit=3)` — returns unsuppressed reflections sorted unsurfaced-first, newest-first as tiebreaker.
  - `markReflectionSurfaced(reflections, id)` — increments `surfaceCount`; defined but not yet wired to the carousel.
  - `generateRuleBasedReflections(ctx, insightStyle)` — synchronous, <1ms, up to 5 entries. 9 signal types: `theory-arc`, `character-focus` (2 variants), `temporal-evolution` (3 variants), `interpretation-evolution`, `mystery-continuity`, `reader-attention` (3 variants), `confusion-signal`. Deduped by type; highest-weight wins.
  - `analyzeTemporalEvolution(notes)` — internal: splits notes at midpoint, compares early/late tag distributions, returns `'confusion-to-theory' | 'sustained-theory' | 'late-favorites' | null`.
  - `extractNameMentions(texts)` — internal: extracts capitalized proper nouns appearing ≥2×, filtered by 30-word stoplist. Powers theory character focus detection.

### Modified

- **`src/utils/aiExtractor.js`** — Added `generateCompanionReflections(ctx, apiKey)`.
  - Builds compact context block from: theory note samples, confusing note samples, favourite note samples, character note count + focused character, revised/reflected counts, temporal evolution label, oldest open mystery age+text, and theory character focus.
  - Prompt enforces literary voice: 1–2 sentences max; no "I notice", "It seems", "You might", "As a reader"; no direct note quotes; no future chapter references.
  - Returns `ReflectionEntry[]` ready for `book.reflectionCache.reflections`.

- **`src/components/dashboard/CompanionInsights.jsx`** — Major rewrite. Now a two-layer companion system.
  - Added imports: `generateCompanionReflections` (static, not dynamic — Vite warned about the dynamic import pattern since `aiExtractor.js` is already statically imported elsewhere), all reflection engine functions.
  - Added `useBooks` for direct `updateBook` access (cache save).
  - `cachedReflections` memo: reads `getActiveReflections(book, 3)`, deps on `book.reflectionCache?.contextHash` and `book.reflectionCache?.reflections?.length`.
  - `observations` memo: weaves cached reflections into the presence pool at positions 1 and 4 (after arc observation, and mid-way through).
  - Generation `useEffect`: assembles context, checks threshold (≥3 notes OR ≥2 open mysteries), checks hash via `shouldRegenerate`, saves rule-based synchronously, fires AI path silently in background. **Critically: `book.reflectionCache` excluded from dep array to prevent save→trigger loop.** Deps: `[book.id, book.notes?.length, book.currentChapter, book.readingLog?.length, book.mysteries?.length, settings.insightStyle]`.

- **`src/utils/companionPresence.js`** — Companion voice pass. Eight targeted phrase replacements to eliminate assistant-like or instructional language:
  - "Pay attention to what the author establishes early." → "What's established early in a story tends to matter."
  - Generic "attentiveness tends to pay off" language → specific reader-addressed observations.
  - "that's a sign you're reading ahead of the text" → "You've been reading ahead of the text."
  - "seems to invite both at once" → "demand both at once."
  - "They're often carrying the most weight." → "They're carrying something."
  - "The companion is tracking your changes of mind." → "a reading that's still in motion."
  - "The companion is more than a list." → "The companion has been accumulating layers."
  - Theory note branch: added contextual count reference when theoryNotes present.

- **`src/pages/DebugPage.jsx`** — Reflection Inspector panel.
  - Renamed heading: "Narrative Extraction Inspector" → "Companion Inspector".
  - Added `useSettings`, all reflection engine imports, `updateBook` destructure from `useBooks`.
  - Added `[reflPanel, setReflPanel]` toggle state; pill buttons switch between "Narrative Extraction" and "Reflection Engine" sections.
  - `ReflectionPanel` component: context signal grid (6 counts), current vs cached hash comparison, temporal evolution signal, cached reflections list with surface count and type badge (AI/rule), preview mode (generates fresh rule-based without saving), force-regenerate button, clear-cache button (ember destructive). Spoiler boundary section: mode, chapter, visible vs total mystery count.
  - Extraction section wrapped in `{!reflPanel && (<> ... </>)}`.

### Architecture decisions
- **Two-tier reflection system.** `generatePresence` (13 lenses) = immediate/contextual; `generateRuleBasedReflections` + `generateCompanionReflections` = retrospective/synthesized. Same display strip, different pools, different generation cadence. Reflections are woven into the presence pool at fixed positions rather than appended.
- **Theory continuity without a memory graph.** Achieved via `extractNameMentions` (tracks which character names recur in theory notes) and `analyzeTemporalEvolution` (detects how the reading arc has shifted), not stored note history.
- **Save→trigger loop prevention.** `book.reflectionCache` is intentionally excluded from the `useEffect` dep array in `CompanionInsights`. The `shouldRegenerate` check provides correctness; the excluded dep prevents infinite re-firing after each cache save.
- **AI reflections prepend, rule-based serve as fallback.** AI path fires silently after the rule-based cache is already saved. On success, AI results are prepended. On failure, the rule-based cache remains untouched.
- **Static import instead of dynamic.** `aiExtractor.js` is already statically imported by `CompanionHeader`, `EpubImportReview`, and `DiscussionTab`. Using a dynamic import in `CompanionInsights` generated a Vite warning ("dynamically imported but also statically imported — will not move into another chunk"). Fixed by using `Promise.resolve().then(() => fn())` pattern with a static import.

### Book data model additions
- **`book.reflectionCache`** — `{ contextHash: string, generatedAt: ISO string, reflections: ReflectionEntry[], aiEnhanced: boolean }`. Written by `CompanionInsights` effect; read by `getActiveReflections`.

### ReflectionEntry shape
```ts
{
  id: string           // 'rule_${ts}_${i}' or 'ai_${ts}_${i}'
  text: string
  type: 'rule-based' | 'ai'
  surfaceCount: number
  lastSurfaced: string | null
  suppressed: boolean
  generatedAt: string  // ISO
}
```

---

## Session 45 — 2026-05-12
**Theme:** Six-Feature Enhancement Pass + Settings Nav Fix

### Modified

- **`src/tabs/DiscussionTab.jsx`** — AI discussion questions.
  - Added `import { generateDiscussionQuestions }` from `aiExtractor.js`.
  - `hasAiKey` computed from `settings.anthropicKey`.
  - `generating` / `genError` state.
  - `handleGenerate()` async handler: calls `generateDiscussionQuestions(book, apiKey)`, merges returned strings into `book.aiDiscussionQuestions` via `onUpdateBook`.
  - Header card gains "✦ Generate with Claude" button (shown when `hasAiKey && !hasGenerated`) and "✦ Regenerate" (shown when `hasGenerated`). Button disabled during generation; shows spinner-style label "Generating…".
  - `genError` renders inline below the button in ember italic.

- **`src/components/dashboard/CompanionHeader.jsx`** — Re-extraction with Claude.
  - Added imports: `useSettings`, `aiExtractNarrative` from `aiExtractor.js`, `parseEpub` from `epubParser.js`.
  - `hasAiKey`, `reextracting`, `reextractMsg`, `epubRef` state.
  - `handleReextractClick()` — opens hidden file input.
  - `handleEpubFile(e)` async handler — parses EPUB, runs `aiExtractNarrative`, merges characters/summaries/mysteries/notes into book via `onUpdateBook`. Clears `reextractMsg` after 5s.
  - "✦ Re-extract with Claude…" item added to stewardship menu (only visible when `hasAiKey`).
  - Status message appears above mood selector during and after re-extraction.
  - Hidden `<input ref={epubRef} type="file" accept=".epub">` in component.

- **`src/tabs/CharactersTab.jsx`** — Name and tier editing.
  - `startEdit()` now initialises `name` (from `raw.name`) and `tier` (from `raw._tier`) alongside existing fields.
  - Edit form: added **Name** text input (autoFocus), **Main / Secondary** tier toggle before Role/Status fields.
  - `saveEdit()` updates `name` and `_tier` on the character record; when `newTier !== charType`, filters character out of old array and appends to new array in a single `onUpdateBook` call.
  - `sharedCardProps` passes `_tier: charType` via `{ ...rawFound, _tier: charType }` so the tier is always available on edit open.

- **`src/tabs/NotesTab.jsx`** — Notes search.
  - Added `search` / `setSearch` state.
  - `visible` filter updated to also check `!q || n.text.toLowerCase().includes(q) || (n.reflection || '').toLowerCase().includes(q)`.
  - Search input added above tag filters: left-aligned `Ico.Search` icon, right-aligned `Ico.X` clear button (visible only when `search` is non-empty).

- **`src/tabs/ProgressTab.jsx`** — Chapter renaming.
  - Added `editingChNum` / `editingTitle` state.
  - `startEditTitle(e, ch)` — stops propagation, sets editing state.
  - `saveTitle(num)` — persists via `onUpdateBook({ chapters: [...] })`.
  - Chapter row: added `group` class; `onClick` guard skips toggle when `editingChNum === ch.num`.
  - When `editingChNum === ch.num`: renders inline `<input>` with autoFocus; saves on blur or Enter; cancels on Escape.
  - Edit pencil button (`Ico.Edit`) on right side: `opacity-0 group-hover:opacity-100` — appears on hover, hidden at rest. Replaced by `✨` confetti span during celebration.

- **`src/index.css`** — Dark mode palette.
  - Added `html.dark { }` block overriding all `--color-cream-*` and `--color-ink-*` custom properties with a warm dark palette (surfaces: `#1A1714`–`#2E2B28`; text: `#EDE8E3`–`#3A3633`).
  - All gold/sage/ember/sienna/steel background-shade vars (`--color-*-bg`, `--color-*-pale`, `--color-*-border`) overridden with deep-toned dark equivalents.
  - `html.dark .sticky-bar` and `html.dark .sticky-bottom-bar` override `background` to `rgba(26,23,20,.96)`.
  - `html.dark .tab-scroll-fade::after` overrides the gradient to fade to `#1E1B19`.
  - `html.dark [data-mood="*"]` overrides `--ca-bg` and `--ca-border` for all 6 moods.
  - `html.dark .tag-*` overrides all 6 note tag pill classes with dark-palette equivalents.

- **`src/context/SettingsContext.jsx`** — Added `darkMode: false` to `SETTINGS_DEFAULTS`.

- **`src/App.jsx`** — Dark mode sync.
  - Added `useEffect` + `useSettings` imports.
  - `AppShell` now calls `useSettings()` and runs `useEffect(() => document.documentElement.classList.toggle('dark', !!settings.darkMode), [settings.darkMode])`.

- **`src/pages/SettingsPage.jsx`** — Dark Mode toggle wired up.
  - Removed local `darkMode` state and `PlaceholderBadge` from the Dark Mode row.
  - `<Toggle value={settings.darkMode} onChange={v => updateSetting('darkMode', v)} />` — live, persisted.

- **`src/components/layout/TopNav.jsx`** — Settings nav fix.
  - Added Settings link to hamburger dropdown: navigates to `/settings`, active-highlighted when `location.pathname === '/settings'`.
  - Settings was previously absent from the nav entirely.

### Created

- **`src/utils/aiExtractor.js`** (from Option B, refactored here).
  - `callClaude(apiKey, prompt, maxTokens)` — shared fetch helper. Sets `anthropic-dangerous-direct-browser-access: true`. Maps 401 → "Invalid API key", 429 → "Rate limit reached". Returns parsed content string.
  - `aiExtractNarrative(chapterContents, chapters, apiKey, { title, author })` — sends chapter text to `claude-3-5-haiku-20241022`; returns `{ characters, summaries, mysteries }` in the same shape as the rule-based extractor.
  - `generateDiscussionQuestions(book, apiKey)` — builds a prompt from book title, author, chapter summaries, note excerpts, and mystery threads; returns `string[]` of 6–8 tailored discussion questions.

### Architecture decisions
- **`html.dark` overrides CSS custom properties, not Tailwind classes.** Because Tailwind v4 compiles all utilities to `var(--color-*)` at runtime, overriding the variables in `html.dark` flips the entire palette without touching component markup. No `dark:` utility prefixes needed anywhere.
- **Dark mode persisted in SettingsContext.** `darkMode` lives in `shadowscribe_settings` alongside `spoilerMode`, `insightStyle`, etc. `AppShell` (inside `SettingsProvider`) syncs it to `html.dark` via a single `useEffect`.
- **Character tier moves are atomic.** A tier change filters the character out of one array and pushes it into the other in a single `onUpdateBook` call — one context update, one localStorage write.
- **Notes search covers reflections.** Searching "grief" will surface notes where "grief" appears only in the reflection, not the original note — respecting the reader's evolving interpretation as first-class content.
- **Re-extraction merges, never replaces.** `handleEpubFile` in `CompanionHeader` merges AI-extracted data into the existing book; it does not wipe user-added notes, manually created characters, or hand-edited chapters.

---

## Session 44 — 2026-05-12
**Theme:** Deletion Affordances + AI Extraction Foundation (Options A, B, C)

### Option A — Mystery and Discussion deletion

#### Modified

- **`src/tabs/MysteriesTab.jsx`** — Mystery deletion.
  - Added `deletingId` state.
  - `deleteMystery(id)` — filters mystery from `book.mysteries` via `onUpdateBook`.
  - "Remove" button added to thread actions row (only for non-veiled, non-resolved, non-editing threads).
  - Inline ember confirmation block replaces thread actions when `isDeleting`: "Remove this thread?" / "Keep it" / "Yes, remove it".

- **`src/tabs/DiscussionTab.jsx`** — User question deletion.
  - Added `deletingIdx` state (index-based, since user questions are a plain array without IDs).
  - `deleteUserQ(i)` — filters by index from `book.userDiscussionQuestions`.
  - Inline ember confirmation on each user question card.

### Option B — AI-Assisted Extraction

#### Created

- **`src/utils/aiExtractor.js`** — AI extraction and question generation utilities.
  - `callClaude(apiKey, prompt, maxTokens)` — shared fetch helper for all Anthropic API calls. Header: `anthropic-dangerous-direct-browser-access: true`. Model: `claude-3-5-haiku-20241022`. Error mapping: 401 → "Invalid API key", 429 → "Rate limit reached".
  - `aiExtractNarrative(chapterContents, chapters, apiKey, { title, author })` — sends cleaned chapter texts to Claude; returns `{ characters, summaries, mysteries }` matching the shape of rule-based extractor output.
  - `generateDiscussionQuestions(book, apiKey)` — builds context prompt from book metadata, chapter summaries, notes, and mysteries; returns `string[]` of 6–8 tailored discussion questions.

#### Modified

- **`src/context/SettingsContext.jsx`** — Added `anthropicKey: ''` to `SETTINGS_DEFAULTS`.

- **`src/pages/SettingsPage.jsx`** — AI-Assisted Extraction section.
  - `showKey` / `keyDraft` / `keySaved` state.
  - Password input with show/hide toggle (`Ico.Eye` / `Ico.EyeOff`).
  - `saveKey()` calls `updateSetting('anthropicKey', keyDraft.trim())`; shows "✓ Saved" for 2s.
  - `clearKey()` resets draft and clears setting.
  - Status pill: "Active" (sage) when key is set; "Not set" (ink) otherwise.
  - Key stored in `shadowscribe_settings` in localStorage; never sent anywhere except direct calls to `api.anthropic.com`.

- **`src/components/shared/icons.jsx`** — Added `Ico.EyeOff` (slash-eye), `Ico.Settings` (gear), `Ico.Edit` (pencil).

### Option C — Mood Fix, Reread-Era Pacing, Library Export/Import

#### Modified

- **`src/components/dashboard/CompanionHeader.jsx`** — Mood editing now also updates `coverBg`.
  - Mood dot `onClick` writes both `mood` and `coverBg: linear-gradient(...)` using `MOOD_CONFIG[m].color`. Previously, changing mood did not update the cover gradient, leaving a visual mismatch.

- **`src/utils/companionPresence.js`** — Pacing filtered to current reread era.
  - `generatePresence()` now derives `currentEra = book.rereadCount || 0` and filters `readingLog` to `eraLog` (entries where `s.rereadEra ?? 0 === currentEra`).
  - All session-based lenses (`streak`, `sessions`, `recent7`, `lastDate`, `gapDays`, `sessionRhythmObs`, `sessionStopObs`, `pacingObs`, duration) use `eraLog` instead of the full log.
  - Prevents first-read session data from polluting pacing and streak observations during a reread.

- **`src/context/BooksContext.jsx`** — Added `importLibrary` action.
  - `importLibrary(incoming)` — merges an array of book objects into the library; new books (by `id`) are prepended; existing books are skipped (deduplication by ID).
  - Exported in Provider value.

- **`src/pages/SettingsPage.jsx`** — Working Export and Import.
  - `handleExport()` — serialises `books` to JSON, triggers browser download as `shadowscribe-library-{date}.json`.
  - `handleImportFile(e)` — reads the selected file, parses JSON, calls `importLibrary(incoming)`. Shows "✓ N companions imported." on success (clears after 4s) or inline error on failure. Import button styling reflects state (sage on success, ember on error).
  - Hidden `<input ref={importRef} type="file" accept=".json">` triggered by the Import button.

### Architecture decisions
- **Direct browser → Anthropic API.** The `anthropic-dangerous-direct-browser-access: true` header is required for browser-originated fetch calls. The key is user-supplied and stored only in `shadowscribe_settings` (localStorage). No proxy, no backend.
- **`callClaude` as a shared helper.** Both `aiExtractNarrative` and `generateDiscussionQuestions` share the same fetch/error-handling wrapper rather than duplicating it, keeping the error surface consistent.
- **`deletingIdx` for user questions.** User discussion questions are stored as a plain `string[]` without IDs. Index-based deletion is safe because the confirmation is inline on the specific card and no reordering occurs between the click and the confirm.
- **Reread-era filtering is additive.** The `eraLog` filter only affects computed observations — the full `readingLog` remains intact in storage, preserving all historical sessions.

---

## Session 43 — 2026-05-12
**Theme:** Narrative Extraction Foundation Pass

### Created
- **`src/utils/narrativeExtractor.js`** — First-generation rule-based narrative extraction pipeline.
  - `cleanChapterHtml(html)` — strips EPUB HTML to clean prose text: removes scripts, nav, figures, Unicode noise (soft hyphens, zero-width spaces, BOM). Exported for use by debug tooling.
  - `extractCharacters(chapterTexts, chapters)` — three high-precision patterns: (1) dialogue attribution ("Hugo said"), (2) possessives ("Wallace's"), (3) honorifics ("Dr. Foster"). Requires ≥2 mentions. Filtered against 150+ blocklisted common words. Top 15 by frequency; tiered into main (~top 35%, max 4) vs secondary. Each character stamped with `revealChapter`, `mentionCount`, `extracted: true`.
  - `generateChapterSummary(text, title)` — extractive: scores sentences by mid-sentence proper noun density, position (first sentence bonus +5), length, quote-heaviness. Takes top 2 in reading order. Returns null if text is too sparse. Exported for direct use in debug tooling.
  - `extractMysteries(chapterTexts)` — three pattern sets: weighted question sentences ("why", "who was", "how could"), uncertainty phrases ("couldn't understand", "seemed strange"), and wondering phrases ("wondered why", "couldn't shake"). Max 12 total; max 2 per chapter. Rough deduplication via 50-char fingerprint.
  - `extractNarrative(chapterContents, chapters)` — main pipeline. Runs steps 1–4 in sequence, returns `{ characters, summaries, mysteries, extractionMeta }`. Handles empty content gracefully; generates warnings for partial extraction. `extractionMeta` includes `chaptersExtracted`, `summariesGenerated`, `characterCount`, `mysteryCount`, `warnings`.

- **`src/pages/DebugPage.jsx`** — Narrative extraction QA panel at `/debug`.
  - Not linked from main nav; accessible via direct URL.
  - Per-book panels (collapsed by default): extraction metadata stats, character list with mention counts + reveal chapter + auto/manual badge, mystery list with source chapters, chapter summary inspector (expandable rows showing full summary text).
  - localStorage usage bar: total KB/MB, % of 5MB limit, per-book breakdown.
  - Filter: All / Extracted / Manual only.
  - Uses `estimateLocalStorageUsage()` and `estimateBookSize()` from storage.js.

### Modified
- **`src/utils/epubParser.js`** — Chapter content extraction + hardening.
  - Added `normalizePath(path)` — resolves `../` and `./` segments in EPUB paths; needed for EPUBs with relative paths in the manifest.
  - Added `cleanTitle(raw)` — strips "Chapter N: " and "Part N — " prefixes when a subtitle follows; preserves plain "Chapter 1" titles.
  - Chapter shapes now use `cleanTitle(ch.title)` instead of `ch.title.trim()`.
  - Duplicate chapter title detection: warns if any title appears more than once.
  - **New return field: `chapterContents`** — `{ [chapterNum]: rawHtmlString }`. Built after the chapters array by resolving each TOC entry's `src` to its EPUB HTML file. Uses `htmlCache` to avoid re-decoding the same file for multiple TOC entries pointing to the same HTML (shared-file pattern). Tries `normalizePath(resolvePath(opfDir, filePath))` then falls back to bare relative path. Warns if no content could be read.
  - **Critical**: `chapterContents` is transient. It lives in React state during the wizard and is never written to localStorage.

- **`src/utils/storage.js`** — Storage audit, diagnostics, IndexedDB groundwork.
  - Added comprehensive storage strategy comment documenting the localStorage/IndexedDB split decision.
  - `saveBooks()` now catches `QuotaExceededError` (name or code=22) with a console warning and comment pointing to future IndexedDB migration.
  - `estimateLocalStorageUsage()` — exported. Returns `{ bytes, kb, mb, pctOf5MB }`. Accounts for UTF-16 (2 bytes per char).
  - `estimateBookSize(book)` — exported. Returns `{ bytes, kb }` for a single book object.
  - `openNarrativeStore()` — exported. Opens (or creates) the `shadowscribe_narrative` IndexedDB with a `chapterTexts` object store keyed by `${bookId}_${chapterNum}`. Not yet called in the import flow.
  - `saveChapterText(db, bookId, chapterNum, text)` — exported. Stores raw chapter text to IndexedDB.
  - `loadChapterText(db, bookId, chapterNum)` — exported. Retrieves raw chapter text from IndexedDB. Returns `null` if not found.

- **`src/components/library/EpubImportReview.jsx`** — Extraction integration + atmospheric loading states.
  - Added import: `extractNarrative` from `narrativeExtractor.js`; `useEffect` from react.
  - `EXTRACTION_PHRASES` — 6 atmospheric loading messages; rotate every 1400ms during extraction.
  - `extracting` state (bool); `extractPhrase` state (string); `phraseRef` (ref for phrase index).
  - `useEffect([extracting])` — starts/stops phrase rotation timer.
  - `handleCreate()` now: sets `extracting: true`, yields to React via `setTimeout(150ms)`, runs `buildBook()`, then runs `extractNarrative(importData.chapterContents, book.chapters)` if content is available. Injects characters/mysteries/summaries into book only if extraction found results (guards with `.length > 0`). Sets `book.narrativeExtracted = true` and `book.extractionMeta`. Calls `onCreate(book)`. On exception: falls back to creating book without extraction.
  - Loading overlay: `fixed inset-0 z-50 bg-cream-50/95 backdrop-blur-sm` with centered serif phrase + italic subtitle. `animate-fade-in`.
  - "Begin the companion" button renamed to "✦ Build the companion". `disabled` during extraction.
  - Companion summary in step 3 shows "· content ready for extraction" in sage color when `chapterContents` is populated.

- **`src/App.jsx`** — Added `/debug` route pointing to `DebugPage`.

### Data model additions
| Field | Shape | Where |
|---|---|---|
| `book.narrativeExtracted` | `boolean` | Set to `true` after successful EPUB extraction |
| `book.extractionMeta` | `{ chaptersExtracted, summariesGenerated, characterCount, mysteryCount, warnings }` | Set at import time |
| `character.extracted` | `boolean` | Marks auto-extracted characters vs. manually added |
| `character.mentionCount` | `number` | Frequency count from extraction; used by debug panel |
| `mystery.extracted` | `boolean` | Marks auto-extracted mysteries |
| `epubParser result.chapterContents` | `{ [num]: string }` | Transient — never stored |

### Architecture decisions
- **Raw chapter text is never persisted.** `chapterContents` lives in React state during the wizard and is GC'd after `onCreate` is called. Only the derived artifacts (summaries, character list, mystery seeds) go into the book object and localStorage. A 30-chapter novel would be ~500KB of raw HTML — too large for localStorage. Extracted artifacts are ~20KB.
- **IndexedDB groundwork is in place but not yet activated.** `openNarrativeStore`, `saveChapterText`, `loadChapterText` are exported from `storage.js` but not called from the import flow. They will be used when AI re-extraction passes need the raw text.
- **Extraction is synchronous, yielded via setTimeout.** `extractNarrative` uses `DOMParser` and regex — no async I/O. The 150ms `setTimeout` yields to React so the loading overlay renders before the CPU-bound work starts.
- **Extraction guards prevent overwriting manual data.** If characters or mysteries were already present (e.g. user-created companion, not EPUB), extraction only injects if it found results. Manual books (non-EPUB) will never have `chapterContents`, so extraction is silently skipped.
- **Spoiler safety is automatic.** All extracted characters carry `revealChapter` and `spoilerSafe: false`. The existing `getCharacterView` in `spoiler.js` filters them appropriately — no changes needed to the spoiler system.
- **Debug panel is dev-only.** `/debug` is wired in `App.jsx` but not linked from `TopNav`. It reads from the existing BooksContext — no special data pipeline needed. Useful for QA after importing any EPUB.

### Extraction weaknesses (unresolved)
1. **Character extraction misses non-English naming conventions.** The regex requires `[A-Z][a-z]+` — names with non-Latin characters, all-caps surnames, or particles ("de", "van", "al") may be missed or split.
2. **Sentence-start capitals cause false negatives.** The blocklist filters many sentence-starting words, but unusual sentence-starting proper nouns (place names, rare words) that aren't character names could still pollute the character list. Precision > recall was chosen.
3. **Summaries are extractive, not abstractive.** They use the author's own sentences — which is intentional (literary tone) but means the summary may quote a confusing passage out of context, or lead with an unusual first sentence.
4. **Mystery extraction is shallow.** It matches surface patterns — any "seemed strange" or "didn't understand" will trigger, even in non-mysterious contexts. Cap of 12 mysteries + max 2 per chapter limits noise but doesn't fully eliminate false positives.
5. **Shared HTML files in EPUB TOC.** Some EPUBs (especially older EPUB2) have a single HTML file for multiple chapters. All TOC entries pointing to the same file get the same extracted text — leading to duplicate summaries or inflated character frequencies for that file.
6. **No location extraction.** Location names (cities, rooms, landmarks) were considered but not implemented in this pass — high false-positive risk without a gazeteer.
7. **`useRef` not `await` for yield.** The setTimeout yield approach works but on very slow devices the 150ms might not be enough to render the overlay before extraction starts. Not critical for first-gen.

---

## Session 42 — 2026-05-12
**Theme:** Reading Session Memory + Companion Stewardship Pass (completion)

### Modified
- **`src/utils/date.js`** — Added `logDates(readingLog)` export.
  - Accepts `string[] | SessionEntry[]`, returns ISO date strings array.
  - Updated `calcStreak` to call `logDates(log)` rather than treating `log` as `string[]` directly.
  - Both functions remain backward-compatible with legacy string arrays.

- **`src/utils/storage.js`** — Added `normalizeReadingLog(log)` and `normalizeBook(book)`.
  - `normalizeReadingLog`: converts any `string` entries in a readingLog to `{ id: 'migrated_${date}_${i}', date, startChapter: 0, endChapter: 0, rereadEra: 0 }` stubs.
  - `normalizeBook`: applies `normalizeReadingLog` to a book's `readingLog`.
  - Both are applied in all `loadBooks()` return paths. The migration is idempotent — proper `SessionEntry` objects pass through unchanged.

- **`src/context/BooksContext.jsx`** — Added `deleteBook(id)` action.
  - Filters books array by id via `setBooks(bs => bs.filter(b => b.id !== id))`.
  - Exported in Provider value alongside `books, updateBook, createBook, resetToDemo`.

- **`src/components/shared/icons.jsx`** — Added `Ico.Dots` and `Ico.Trash`.
  - `Dots`: three horizontally-spaced filled circles at `cx=[5,12,19], cy=12, r=1`. Uses `fill="currentColor" stroke="none"` — not the standard `sp` stroke treatment.
  - `Trash`: standard outline trash can with lid and two body lines.

- **`src/data/books.js`** — All 5 demo books' `readingLog` updated from `string[]` to `SessionEntry[]`.
  - Each book gets 2–4 sessions with realistic `startChapter`, `endChapter`, `durationEstimate`, and `rereadEra: 0`.
  - Demonstrates the full range of duration values across books.

- **`src/components/modals/ChapterUpdateModal.jsx`** — Full rewrite with SessionEntry creation and duration picker.
  - `DURATION_CONFIG`: `[{ k:'brief', l:'A brief return' }, { k:'steady', l:'A steady stretch' }, { k:'immersed', l:'Pulled you in' }]`
  - `durationEstimate` state: optional, cleared on modal close.
  - `selectedChapter` state: enables quick-select chip without typing.
  - `showAllChapters` state: expands full chapter list (hidden by default past first 8).
  - `handleUpdate` creates `SessionEntry`: `{ id: 's_${Date.now()}', date: today, startChapter: book.currentChapter, endChapter: n, rereadEra: book.rereadCount || 0, ...(durationEstimate ? { durationEstimate } : {}) }`.
  - Appends to existing `readingLog` (no deduplication — multiple sessions per day are valid).
  - Focus trap on `Tab` key cycles within the dialog; `Escape` closes.
  - `role="dialog" aria-modal="true"` + auto-focus on textarea/close-button.
  - `dialogRef` + `closeButtonRef` for focus management.

- **`src/utils/companionPresence.js`** — Two new lenses, `sessionEntries` helper, `logDates` import.
  - Added `import { calcStreak, logDates } from './date.js'`.
  - `sessionEntries(log)`: filters to proper `SessionEntry` objects (`!(s.startChapter === 0 && s.endChapter === 0)`).
  - Updated `recentSessionCount` to use `logDates(log)`.
  - Updated `pacingObs` and `generatePresence` duration section to use `logDates`.
  - **`sessionRhythmObs(log, style, temperament)`** (11th lens): fires on same-day multiple sessions, 2+ immersed sessions in last 5, or brief session after ≥4 prior sessions. Style-variant copy; null for minimal.
  - **`sessionStopObs(log, chapters, style)`** (12th lens): fires when last session ≤4 chapters and reader stopped within 2 of a starred chapter (`ch.important`). Style variants; null for minimal.
  - Both wired in `generatePresence` pipeline between `interpretationObs` and `pacingObs`.
  - Total lens count: 13.

- **`src/tabs/ProgressTab.jsx`** — Session history section added; `isNew` empty state added.
  - `sessions`: derived from `readingLog`, filtered to objects with `date`, reversed (most-recent-first).
  - `visibleSessions`: first 8 by default; `showAllSess` state toggles pagination.
  - `SESSION_PAGE = 8`.
  - `DURATION_LABELS`: maps `brief/steady/immersed` to atmospheric display strings.
  - `chRange` computation: **both-zero guard FIRST** (`startChapter === 0 && endChapter === 0` → `null`), then single-chapter check, then range. Getting the order wrong displays "Chapter 0" for migrated stubs.
  - `isNew` state: `pct === 0 && !(book.readingLog?.length)`. Renders an invitation panel with companion-voice copy and "Log your first session →" action.

- **`src/components/dashboard/CompanionHeader.jsx`** — Stewardship menu, edit form, temperament picker.
  - Added imports: `useEffect, useRef` from react; `useNavigate` from react-router-dom; `useBooks` from BooksContext.
  - `TEMPERAMENT_CONFIG`: 6 items — `curious, analytical, emotional, imaginative, quiet, searching`.
  - State: `menuOpen`, `confirmDelete`, `editingMeta`, `metaForm` (`{ title, author, temperament }`).
  - `menuRef`: click-outside handler via `useEffect([menuOpen])`.
  - `···` button (`Ico.Dots`, `p-2`, `text-ink-500`): toggles `menuOpen`.
  - Menu dropdown: "Edit companion" / "Export companion" / "Remove companion". Positioned `absolute right-0 top-full`.
  - `openEditMeta()`: sets `metaForm` from current book data, sets `editingMeta: true`, closes menu.
  - `saveMeta()`: calls `onUpdateBook({ title, author, temperament })`.
  - `handleExport()`: `JSON.stringify(book, null, 2)`, creates blob download, revokes URL.
  - `handleDelete()`: calls `deleteBook(book.id)` then `navigate('/')`.
  - Edit form renders in place of title/author/mood row when `editingMeta`. Two inputs + temperament pill row + Cancel/Save.
  - Delete confirmation: inline two-step with ember "Yes, remove it" button and "Keep it" cancel.
  - Mobile ergonomics: `p-2` on dots button (was `p-1`), `text-ink-500` (was `text-ink-400`), `py-1 px-0.5` on `· edit` link.

- **`src/components/library/Library.jsx`** — EmptyState `action` prop added.
  - Added `Link` import from `react-router-dom`.
  - When `!q` (no search active), passes `action={<Link to="/new" ...>Begin a companion →</Link>}` to EmptyState.
  - EmptyState renders `{action}` as JSX directly — passing an object would not work.

### Created
- **`.claude/launch.json`** — Dev server launch config.
  - Workaround for broken `.bin/vite` symlink in the project's `node_modules/.bin/`.
  - Uses `node node_modules/vite/bin/vite.js --port 5173` directly.

### Bug fixed
- **"Chapter 0" in session history** — `ProgressTab` was checking `startChapter === endChapter` before the both-zero guard, causing migrated legacy entries (both fields 0) to display as "Chapter 0". Fixed by checking `(s.startChapter === 0 && s.endChapter === 0)` first.

### Architecture notes
- **`rereadEra` forward-compatibility.** Every new `SessionEntry` is stamped with `rereadEra: book.rereadCount || 0`. After a restart (which increments `rereadCount`), new sessions get era=1 while first-read sessions have era=0. Future code can filter by era to compare pacing or session counts across reads.
- **Multiple sessions per day.** The old `[...new Set([...])]` deduplication in readingLog was removed. Multiple sessions per day is the entire point of the system.
- **Migrated stubs are permanent.** Once a legacy string entry is converted to a `{ startChapter:0, endChapter:0 }` stub, it is never re-promoted. The companion shows "Session recorded" for these entries and the lenses skip them via `sessionEntries`.
- **Stewardship menu is inline-positioned (not a portal).** Menu opens with `absolute right-0 top-full` relative to the dots button wrapper. Works because CompanionHeader is at the top of the page with no clipping ancestor. If this ever clips in a constrained layout, use `ReactDOM.createPortal`.

---

## Session 41 — 2026-05-12
**Theme:** Empty State CTAs + Session Memory Foundation

### Modified
- **`src/tabs/ProgressTab.jsx`** — `isNew` empty state.
  - Condition: `pct === 0 && !(book.readingLog?.length)` — true only on brand-new companions with no sessions logged.
  - Renders a panel (companion-accent bordered) with: "The companion is open." heading, "Mark chapters as you read. Notes, mysteries, and characters will gather here." body, and "Log your first session →" action link (calls `onOpenUpdate` prop).
  - Distinct from the chapter checklist's existing in-progress states — appears above the checklist when the companion has just been created.

- **`src/components/library/Library.jsx`** — EmptyState CTA for empty library.
  - When the library has no books matching the current filter+search, `EmptyState` receives an `action` prop.
  - When `!q` (no active search): `<Link to="/new">Begin a companion →</Link>`.
  - When `q` is active: no action (search empty state copy handles itself).

### Created
- **`.claude/launch.json`** — Vite dev server launch config for Claude tooling.
  - `node_modules/vite/bin/vite.js --port 5173` (direct node invocation; `.bin/vite` symlink was broken in this project).

### Architecture notes
- **`onOpenUpdate` prop on `ProgressTab`.** ProgressTab is context-unaware and receives the modal-open callback from `BookDashboard` via prop. The "Log your first session →" link calls this directly, routing through the established update flow.
- **EmptyState `action` is JSX, not a config object.** `EmptyState` renders `{action}` directly. Passing `{ label, to }` as an object would silently render nothing. Always pass a React element.

---

## Session 22 — 2026-05-08
**Theme:** EPUB Ingestion Foundation Pass

### Created
- **`src/utils/epubParser.js`** — In-browser EPUB parser. Pure async utility, no React dependency.
  - Uses `fflate.unzipSync()` to decompress the EPUB ZIP in the browser.
  - Parses XML with the browser's `DOMParser`. Namespace-safe element access via `localName` matching (not `querySelector('dc:title')` which is unreliable across browsers).
  - TOC extraction priority: EPUB3 `nav.xhtml` → EPUB2 `toc.ncx` → spine fallback.
  - Cover extraction: tries OPF `<meta name="cover">`, then `properties="cover-image"` (EPUB3), then filename heuristics. Resizes to ≤300px JPEG at 78% quality via `<canvas>`. Skips cover if resized output > 300KB.
  - Chapter type detection: regex-based against title string — detects prologue, epilogue, interlude, part/act, section, chapter.
  - Dominant structure type detection from chapter array.
  - Returns: `{ title, author, isbn, coverData, chapters, totalChapters, structureType, warnings }`.
  - Noise filtering: skips TOC entries matching common structural non-chapter titles (cover, copyright, toc, index, etc.).

- **`src/components/library/EpubImportReview.jsx`** — 3-step review wizard shown after EPUB parsing.
  - Step 1: Book details (title, author, ISBN, format, mood) — pre-filled from EPUB. Shows "From EPUB" badge and any `importData.warnings` in a sienna notice. Cover preview uses `coverData` first, then ISBN/OpenLibrary.
  - Step 2: Chapter structure — structure type picker, chapter count input, scrollable chapter preview list. Each row: type badge (tap to cycle through all 6 types), editable title (tap to open inline input, blur or Enter to close). "Show N more" expand affordance above 8 chapters.
  - Step 3: Spoiler settings — identical to `CreateCompanion` step 3.
  - `buildBook(epubData, form)` — pure function that produces a complete Shadow Scribe companion object. Uses EPUB-extracted chapters if count matches form total; pads/trims if user changed the count.
  - Integrates cleanly with `createBook` via the same `onCreate(newBook)` prop as the manual wizard.

### Modified
- **`src/components/library/CreateCompanion.jsx`** — Added EPUB import entry point.
  - Added `importing`, `importData`, `importError` state; `fileInputRef` ref.
  - `handleEpubFile(file)` — async handler: sets `importing: true`, calls `parseEpub(file)`, sets `importData` on success or `importError` on failure.
  - Loading state: full-screen "Reading your EPUB…" message while parsing.
  - Import routing: if `importData` is set, renders `<EpubImportReview>` instead of the manual wizard. "Back" in EpubImportReview clears `importData` and returns to the manual wizard.
  - EPUB import affordance: a dashed-border zone at the top of step 1 with an "Import from EPUB" button (triggers hidden `<input type="file" accept=".epub">`). Parse errors show inline in this zone.
  - "Or enter details manually" divider below the EPUB zone — existing form fields unchanged.

- **`src/components/shared/BookCover.jsx`** — Added `book.coverData` as highest-priority cover source.
  - If `book.coverData` (base64 data URL) is present, renders a simple `<img>` immediately. No loading state needed (data URLs load synchronously). No chain traversal.
  - Falls through to existing ISBN/OpenLibrary/gradient chain if `coverData` is absent or null.

- **`package.json`** — Added `fflate@0.8.2` to dependencies.

### Architecture decisions
- **`fflate` over `jszip`:** Lighter (~30KB gzipped vs ~70KB), modern ESM, tree-shakeable. `unzipSync()` returns `{ [path]: Uint8Array }` which is ideal for named-file lookup. No streaming complexity needed for this use case.
- **`DOMParser` + `localName` over CSS namespace selectors:** `querySelector('dc\\:title')` behavior is inconsistent across browser XML parser implementations. Scanning by `localName` is O(n) over elements but EPUBs are small and this is a one-time parse operation.
- **`parseEpub` is purely async, no React:** The parser has no React imports. It can be tested in isolation, reused outside components, and doesn't couple parsing concerns to rendering.
- **`buildBook` is a pure function in EpubImportReview:** Takes `(epubData, form)`, returns a complete book object. No side effects, no context. This mirrors how `handleCreate` works in `CreateCompanion` and keeps the companion model transformation in one place per flow.
- **EpubImportReview does not extend CreateCompanion:** They are sibling components. Code duplication between them (format/mood/spoiler pickers) is acceptable at this stage — DRYing them would require an abstraction that doesn't yet justify itself.
- **Cover stored as resized base64 JPEG ≤300px:** Keeps localStorage safe without canvas-heavy image processing. Worst-case stored cover is ~20-30KB. The 300KB guard prevents edge cases where canvas.toDataURL produces unexpectedly large output.

### Dependencies added
| Package | Version | Why |
|---------|---------|-----|
| `fflate` | `0.8.2` | In-browser ZIP decompression for EPUB files |

---

## Session 21 — 2026-05-08
**Theme:** Mobile Ergonomics + Reading Flow Pass

### Modified
- **`src/components/dashboard/BookDashboard.jsx`** — Sticky mobile action bar + tab scrollIntoView.
  - Added `useRef` import; `tabRefs = useRef({})` stores DOM refs keyed by tab id.
  - New `useEffect([tab])`: calls `tabRefs.current[tab]?.scrollIntoView({ behavior:'smooth', inline:'nearest', block:'nearest' })` — active tab always scrolls into view on small screens.
  - Each tab button receives `ref={el => { tabRefs.current[t.id] = el }}`.
  - Main content: `pb-16` → `pb-28 sm:pb-16` — extra bottom clearance for the sticky bar on mobile.
  - Sticky bottom bar: renders only when `(book.status === 'reading' || book.status === 'paused') && !book.archived`. Uses `sm:hidden` (desktop-invisible), `sticky-bottom-bar` CSS class, `data-mood` for accent color, full-width `.btn-accent` button. Positioned above the `ChapterUpdateModal` conditional.

- **`src/components/modals/ChapterUpdateModal.jsx`** — Keyboard-safe modal height + scrollable body.
  - Outer overlay: `p-4` → `sm:p-4` (flush to screen edges on mobile; 1rem gap preserved on desktop).
  - Modal panel: added `modal-sheet flex flex-col` classes; added `maxHeight: '90svh'` inline style. `90svh` (small viewport height) remains stable when the iOS URL bar shows/hides.
  - Header div: added `flex-shrink-0` — header never squishes when body is tall.
  - Body div (`px-6 py-5`): added `overflow-y-auto` — the success state's multiple cards scroll within the modal rather than overflowing off screen.

- **`src/index.css`** — Touch targets, safe area, bottom bar, modal sheet, tab scrollbar.
  - `@layer base`: added `button, [role="button"], a, input, select, textarea { touch-action: manipulation }` — eliminates 300ms tap delay without disabling pinch-zoom.
  - New `.sticky-bottom-bar` rule: `position: fixed; bottom/left/right: 0; z-index: 30`; cream/blur background; `padding-bottom: max(0.75rem, env(safe-area-inset-bottom))`; `-webkit-backdrop-filter` for Safari.
  - New `.modal-sheet` rule (outside media query): `padding-bottom: max(1rem, env(safe-area-inset-bottom))` — safe area inset applied at all breakpoints.
  - `@media (max-width: 640px)` `.modal-sheet`: retains `border-radius: 20px 20px 0 0` (bottom-sheet shape on mobile). Removed old `padding-bottom` from this block (now lives in the unlayered rule above).
  - `@media (max-width: 640px)`: added `.tab-scroll-fade { scrollbar-width: none }` + `::-webkit-scrollbar { display: none }` — scrollbar hidden on tab strip on mobile.

- **`index.html`** — Added `viewport-fit=cover` to the viewport meta tag — required for `env(safe-area-inset-*)` to work on notched iPhones.

### Architecture notes
- **Bottom bar is additive, not a replacement.** The header's "Tell the companion where you are" button remains. The bottom bar duplicates that action at thumb reach on mobile. Both call `setShowUpdate(true)`.
- **`z-index` layering preserved.** `.sticky-bar` (tab/search bars) is `z-20`. `.sticky-bottom-bar` is `z-30`. `ChapterUpdateModal` overlay is `z-50`. Nothing collides.
- **`touch-action: manipulation` is the correct path for tap delay.** It's scoped to interactive elements, not `html`/`body`, and doesn't affect scrolling or zooming.

---

## Session 20 — 2026-05-08
**Theme:** Book Lifecycle + Companion Completion Pass

### Modified
- **`src/components/dashboard/CompanionHeader.jsx`** — Lifecycle actions, finished state, reread indicator.
  - Added `fmtDate` import and two module-level helpers: `ordinal(n)` (returns "2nd", "3rd", etc.) and `fmtCompleted(iso)` (literary completion date string).
  - New state: `pendingAction` (null | 'finish' | 'restart' | 'archive').
  - `performAction(action)` executes all lifecycle mutations via `onUpdateBook` — never returns bare state, always writes through the context.
  - Context-sensitive `actions[]` array built at render time based on `book.status` and `book.archived`. Covers all lifecycle states: `want → reading`, `reading → paused/finished`, `paused → reading/finished`, `finished → restart/archive`, `archived → restore`.
  - Update button hidden when `isFinished`; replaced with quiet completion statement ("The story ended here — May 3." / "The story ended here today."). `ReadingMomentum` also hidden when finished.
  - Reread indicator: `"{ordinal(rereadCount+1)} reading"` italic label appears near StatusBadge when `rereadCount > 0`.
  - `atEnd` condition (`pct >= 100`): "mark as finished" label becomes "the story ends here ✦" with slightly stronger color (`text-ink-600`).
  - Confirmation panel (`CONFIRM` map): three entries (finish / restart / archive) with body, cancel, and ok copy. Inline, replaces action links row. Style matches deletion confirmation pattern from Session 19.
  - No-confirm actions (pause, resume, begin, restore): execute immediately on click.
  - `CONFIRM` object defined at module level (not inside component) — static constant, no recreation on render.

- **`src/components/library/Library.jsx`** — Archived shelf section.
  - Separated `books` into `filteredActive` (status filter + search) and `filteredArchived` (search only; status filter does not apply to archived).
  - `filteredArchived` wrapped in `opacity-60 hover:opacity-90 transition-opacity` div — quiet visual treatment, still clickable.
  - Archive section rendered below active grid with `border-t border-ink-100 mt-12 pt-8` separator and `"Archive · N"` heading (uppercase tracking-wider, `text-ink-300`).
  - Archive section only rendered when `filteredArchived.length > 0` — no empty archive section.
  - Active count line only rendered when `filteredActive.length > 0`.
  - EmptyState fires only when both sections are empty.
  - `hasAnyArchived` flag retained (unused in render but available for future use).

### Data model additions (all optional, backward-compatible)
| Field | Type | When set |
|---|---|---|
| `completedAt` | string (ISO) | When `status` transitions to `'finished'` |
| `archived` | boolean | When companion is archived / restored |
| `restartedAt` | string (ISO) | When companion is restarted |
| `rereadCount` | number | Incremented on each restart (starts at 0) |
| `pausedAt` | string (ISO) | When `status` transitions to `'paused'` |

### Lifecycle action effects
| Action | Status change | Fields written |
|---|---|---|
| begin | want → reading | `status`, `lastUpdated` |
| pause | reading → paused | `status`, `pausedAt`, `lastUpdated` |
| resume | paused → reading | `status`, `lastUpdated` |
| finish | any → finished | `status`, `completedAt`, `currentChapter` (=total), all chapters completed, `lastUpdated` |
| restart | finished → reading | `status`, `currentChapter` (=0), all chapters cleared, `restartedAt`, `rereadCount+1`, `lastUpdated` |
| archive | any → archived | `archived: true`, `lastUpdated` |
| restore | archived → unarchived | `archived: false`, `lastUpdated` |

### Architecture notes
- **No new state in `BookDashboard`.** All lifecycle actions live inside `CompanionHeader` which already receives `onUpdateBook`. No prop threading needed.
- **Restart preserves notes, mysteries, characters, readingLog, completedAt.** Only chapter completion state and `currentChapter` are reset. The companion remembers the full history of the first read.
- **`archived` is a flag, not a status.** A book can be `status: 'finished', archived: true`. Archive is a shelf-organization concept, separate from reading state. This avoids creating a 5th status value and keeps the status system clean.
- **Status filter does not apply to archived books in Library.** Archived books are always shown in the archive section by search only. Filtering by "Finished" won't hide a finished book from the archive section.
- **`pausedAt` is written but not currently surfaced in any UI.** Reserved for future use (e.g., "Paused May 3" in ReadingMomentum or CompanionInsights).

---

## Session 19 — 2026-05-08
**Theme:** Deletion Affordances + Safe Removal Pass

### Modified
- **`src/tabs/NotesTab.jsx`** — Note deletion flow + reflection removal affordance.
  - New state: `deletingId` (string | null), `removingReflId` (string | null).
  - `deleteNote(noteId)` — filters note from `book.notes`, persists via `onUpdateBook`.
  - `removeReflection(noteId)` — sets `reflection: undefined, reflectionDate: undefined` on note; separate from clearing via the reflection editor.
  - Edit mode: "Remove note" link at bottom-left (`text-[11px] italic text-ink-400 hover:text-ember`). Clicking transitions to delete confirmation state (`isDeleting`), clears `editingId`.
  - Delete confirmation: replaces card content (full card takeover). Copy: "Remove this thought from the companion?" / "Keep it" / "Yes, remove it".
  - Reflection removal: "remove" link appears in footer when `note.reflection` exists and `!isReflecting`. Inline confirmation replaces footer action area: "Remove this reflection?" / "Keep it" / "Yes".
  - `startEdit` and `startReflect` both clear `deletingId` and `removingReflId` — mutual exclusion enforced across all note cards.

- **`src/tabs/CharactersTab.jsx`** — Character deletion flow + relationship label editing.
  - New `CharCard` state: `confirming` (boolean), `editingRelIdx` (number | null), `editRelForm` ({ label, type }).
  - New `CharactersTab` function: `deleteChar(charType, charId)` — removes character from the correct array AND removes all relationships where `r.from === charId || r.to === charId`.
  - `onDelete` prop passed to `CharCard` via `sharedCardProps` closure (charType + charId captured).
  - Edit mode: "Remove from cast" link at bottom-left (`text-[11px] italic text-ink-400 hover:text-ember`). Clicking sets `confirming: true`, clears `editing`.
  - Delete confirmation: rendered as first priority in expanded body. Copy: "Remove this character from the companion?" / "Keep them" / "Yes, remove them".
  - Collapse (header click) resets `editing`, `confirming`, and `editingRelIdx` — stale confirmation state cannot persist across open/close cycles.
  - Relationship label editing: each relationship row gets an "edit" text link. Clicking opens inline edit form (label input + type select + Save/Cancel) in place of that row. `saveEditRel` uses reference equality (`r === rel`) to update the correct relationship in `book.characters.relationships`.
  - `removeRel` resets `editingRelIdx` to prevent stale index references after array mutation.
  - `startEditRel` closes `addingRel` panel when opening a relationship edit.

### Architecture notes
- **`isDeleting` as a card-level state, not edit sub-mode.** Clicking "Remove note" exits edit mode and enters a distinct `deletingId` state — two separate states rather than a nested confirmation inside edit. Cleaner separation: edit mode is always about content; delete confirmation is about existence.
- **Delete confirmation replaces card content (notes).** The full card takeover prevents the user from seeing note text during the confirmation step — removes any visual "pull" toward re-reading and reconsidering while the destructive button is live. Deliberately quiet.
- **Reflection removal as inline footer confirmation.** Reflection removal is lower-stakes than full note deletion — the inline "Remove this reflection? Keep it / Yes" in the footer area is appropriately lightweight without a full card takeover.
- **Character deletion cleans up relationships atomically.** Both array changes (character removal + relationship pruning) happen in a single `onUpdateBook` call — one context update, one localStorage write.
- **`r === rel` reference equality for relationship editing.** `rels` is a filtered subset of `book.characters.relationships` — its elements are direct references to the original array objects, not copies. Reference equality is safe here and avoids adding IDs to the relationship model.
- **`removeRel` resets `editingRelIdx`.** Prevents a stale `editingRelIdx` pointing to a wrong relationship after the array shrinks from a deletion at a lower index.
- **Ember color for destructive confirmations.** `bg-ember text-white` on confirm buttons; `hover:text-ember` on the "Remove" initiation links. Consistent across both tabs. Resting state always neutral (`text-ink-400`) to avoid an alarming visual.

---

## Session 18 — 2026-05-07
**Theme:** Per-Book Mood Editing Pass

### Added
- **`src/components/dashboard/CompanionHeader.jsx`** — Inline mood selector. Row of 6 × 14px circles placed at the bottom of the header info column, separated by a thin `border-t border-ink-100`. Active mood shows a `box-shadow` ring (1.5px cream gap + 1.5px mood border color). Hovering a different swatch: hovered dot scales up (`scale(1.15)`), others dim to 30% opacity. Literary descriptor (from MOOD_CONFIG.descriptor) appears inline to the right of the dots — fades from 45% → 85% opacity on hover. Clicking immediately persists via `onUpdateBook({ mood: m })`.

- **`src/data/config.js`** — Added `descriptor` (short evocative phrase), `color` (hex, matches index.css `--ca`), and `ring` (hex, matches `--ca-border`) to each MOOD_CONFIG entry. Existing `label` and `description` fields preserved for backward compat with CreateCompanion.

### Modified
- **`src/components/dashboard/BookDashboard.jsx`** — Pass `onUpdateBook` to CompanionHeader (previously only received `book` + `onOpenUpdate`).

- **`src/components/dashboard/RelationshipMap.jsx`** — `REL_COLORS.love` changed from hardcoded `'#B8860B'` to `'var(--ca, #B8860B)'`. Love-relationship lines in the SVG constellation now follow companion mood.

- **`src/index.css`** — Added `.btn-accent` CSS class: `background: var(--ca, var(--color-gold)); color: white;` with `hover: var(--ca-l)`. Provides a single, mood-responsive source of truth for all primary action buttons.

- **`src/tabs/ProgressTab.jsx`** — Current chapter row bg/border, circle border, inner dot, chapter label, and "Reading now" badge all switched from hardcoded `gold-*` Tailwind classes to inline `var(--ca*)` styles. Stars (`★` on `ch.important`) intentionally left as `text-gold` — semantic "important/starred" color, not accent.

- **`src/tabs/PlotTab.jsx`** — "Just read" badge switched from `bg-gold-bg text-gold border-gold-border` to inline `var(--ca*)` styles. Chapter reflection `border-l-2` changed from `border-gold-border` to `style={{ borderColor:'var(--ca-border)' }}`.

- **`src/tabs/NotesTab.jsx`** — Add-note panel border: `border-gold-border` → inline `var(--ca-border)`. Both Save buttons: `bg-gold hover:bg-gold-light` → `btn-accent` class.

- **`src/tabs/MysteriesTab.jsx`** — Add-mystery panel border: same fix. "Open thread" Save button: `bg-gold` → `btn-accent`.

- **`src/tabs/CharactersTab.jsx`** — Add-character form border: same fix. All three Save buttons ("Add to cast", "Save" in edit mode, "Add" in relationship form): `bg-gold` → `btn-accent`.

### Architecture decisions
- **Mood selector placement:** Bottom of the header info column, separated by `border-t border-ink-100`. After ReadingMomentum, not before. Feels like a footnote to the companion's identity, not a heading control.
- **No label for the mood row.** The dots + descriptor are self-explanatory in context. A "tone" or "mood" label would tip toward settings-panel territory.
- **Descriptor visibility:** Shows at 45% opacity (active mood) by default, brightens to 85% on hover. Always present, never intrusive.
- **`btn-accent` as a CSS class, not inline styles:** All primary buttons across 4 tabs now share a single source of truth. The Tailwind `bg-gold hover:bg-gold-light` pattern was scattered — consolidating it into a CSS class makes the system maintainable.
- **`★` star stays gold:** The importance/starring metaphor conventionally uses gold. Changing star color to match ember/steel/etc. would feel semantically wrong.
- **Mystery status pills stay gold:** `suspected`/`hinted` status badges use gold as a taxonomic classification (not accent). They represent different mystery statuses, not the companion's mood.

---

## Session 17 — 2026-05-07
**Theme:** Companion Atmosphere + Visual Identity Cohesion Pass

### Modified
- **`src/index.css`** — Shadow tokens softened (reduced opacity/spread across all 5 `--shadow-*` tokens). Animation tokens calmed: `fade-in` 200ms → 220ms ease; `slide-up` 250ms → 280ms ease-out; `pop` 300ms → 280ms cubic-bezier(0.2, 0.8, 0.3, 1); `tab-in` 180ms → 220ms ease. `celebrate` keyframe overshoot reduced: peak `scale(1.07)` → `scale(1.04)`, rebound `scale(.98)` → `scale(.99)`. Body `line-height: 1.5` → `1.6`. `.tab-btn` transition `.15s` → `.2s`; hover border `ink-300` → `ink-200`. `.sticky-bar` border `ink-200` → `ink-100`; blur `8px` → `10px`. `.card-lift:hover` lift `translateY(-2px)` → `translateY(-1px)`; transition `.2s` → `.25s`. `.insight-strip` color-mix `40%` → `55%`; mixes with `cream-50` instead of `cream`.

- **`src/components/dashboard/CompanionInsights.jsx`** — Removed `momentum-dot` class from ✦ marker (was pulsing like an app status indicator). Insight text lifted `text-[12px]` → `text-[13px]`; padding `py-3` → `py-3.5`; inline fade transition `300ms` → `420ms ease`. Nav dots sized up: `w-1 h-1 gap-1` → `w-1.5 h-1.5 gap-1.5`; inactive color `ink-300` → `ink-200`.

- **`src/tabs/PlotTab.jsx`** — Chapter number circle: `bg-white` → `bg-cream`; `font-bold text-ink-600` → `font-medium text-ink-500`. Title: `text-[13px] font-semibold` → `text-[14px] font-medium`. Collapsed summary preview: `text-ink-500` → `text-ink-400`. Open panel: `pb-4 pt-3` → `pb-5 pt-4`; summary `text-ink-700` → `text-ink-600`. Reflection block redesigned from boxed card (`bg-gold-bg border border-gold-border rounded-xl p-3.5`) to left-border treatment (`border-l-2 border-gold-border pl-3`) — consistent with Notes/Mysteries pattern. Removed unused `SectionLabel` import.

- **`src/components/modals/ChapterUpdateModal.jsx`** — Success wrapper: `animate-slide-up` → `animate-fade-in`. Success card: `p-4` → `p-5`. Symbol: `text-2xl mb-1` → `text-base mb-2 opacity-70` with accent color. Heading: explicit `text-[16px]`; subtitle `text-[12px] mb-3` → `text-[13px] mb-4`. Newly-encountered character role: `font-semibold text-ink-700` → `font-medium text-ink-500`. Section cards: `bg-white` → `bg-cream-50`. Mystery text: `text-[12px] text-ink-700` → `text-[13px] text-ink-600`; diamond marker: `text-[12px]` → `text-[10px] opacity-70`.

- **`src/components/shared/EmptyState.jsx`** — Vertical padding `py-20` → `py-16`.

- **`src/components/shared/SectionLabel.jsx`** — Letter-spacing `tracking-widest` → `tracking-wider`; bottom margin `mb-3` → `mb-2.5`.

- **`src/tabs/NotesTab.jsx`** — Footer metadata: `text-[10px]` → `text-[11px]`; footer top margin `mt-2.5` → `mt-3`. Action links ("+ reflect", "Edit"): `text-[10px]` → `text-[11px]`.

- **`src/tabs/MysteriesTab.jsx`** — Metadata row: "First appears ch." span `text-[10px]` → `text-[11px]`. "· refined" indicator: `text-[10px]` → `text-[11px]`. Observation date: `text-[10px]` → `text-[11px]`. Thread action buttons ("+ add a thought" / "update thought" / "Refine"): `text-[10px]` → `text-[11px]`. Status badge pills and status picker buttons deliberately kept at `text-[10px]` (styled pill components, not metadata text).

### Design decisions
- **Left-border as the universal supplementary-content pattern.** PlotTab chapter reflections now use the same `border-l-2 border-*-border pl-3 italic` treatment as Notes reflections and Mystery observations. The pattern is now consistent across all three tabs.
- **11px as the metadata text floor.** All plain-text metadata, dates, and inline action links across Notes and Mysteries now use `text-[11px]` minimum. Status badge pills remain at `10px` as intentionally compact pill components.
- **Pulse removed from literary marker.** The ✦ in CompanionInsights was using `momentum-dot` (2s infinite pulse) — appropriate for a loading/activity indicator, wrong for a literary observation symbol. Removed entirely; the strip still transitions with a 420ms crossfade.
- **Shadow softening philosophy.** All shadow tokens reduced in spread and opacity. The app sits on warm paper — elevation should feel like paper layers, not floating cards on glass.

---

## Session 16 — 2026-05-07
**Theme:** Companion Revision + Living Interpretation Pass

### Rewrote
- **`src/tabs/NotesTab.jsx`** — Task 1 (Revisitable Notes). New state: `editingId`, `editText`, `editTag`, `reflectingId`, `reflectText`. Added `today()` helper. Key additions:
  - Edit mode: "Edit" button in note footer opens an inline edit form with pre-filled textarea, tag picker, Cancel/Save. `revisedAt` stamped when text or tag actually changes.
  - Historical texture: "· revisited" italic indicator in footer when `revisedAt` is set.
  - Reflection block: "+ reflect" / "edit reflection" footer links. Opens a transparent textarea inside a left-border container (`border-l-2 border-ink-200`). Saves to `reflection` + `reflectionDate`. Displays below note body in italic with date.

- **`src/tabs/MysteriesTab.jsx`** — Task 2 (Evolving Mystery Threads). New state: `statusPickerId`, `observingId`, `observeText`, `refiningId`, `refineText`. Added `today()` helper and `fmtDate` import.
  - Status badge is now a clickable `<button>` for unresolved non-veiled mysteries. Clicking toggles an inline pill picker (`PICKER_STATUSES = ['open', 'suspected', 'evolving', 'hinted', 'dormant']`). Resolved/veiled remains a static `<span>` (dual-render pattern).
  - "+ add a thought" / "update thought" — observation textarea in a left-border container. Saves to `observation` + `observationDate`.
  - "Refine" — opens pre-filled textarea for editing mystery text. On save, preserves original in `originalText` using `my.originalText ?? my.text` (only first refinement sets this). "· refined" indicator in metadata row.

### Modified
- **`src/utils/companionPresence.js`** — Task 3 (Companion Reflection Signals). Added `interpretationObs(notes, mysteries, style)` lens. Fires when `total >= 1` (revised notes, reflections, mystery observations, or refined mysteries exist). Returns null for `minimal`. Two style variants (observational/analytical). Inserted in `generatePresence` after `notePatternObs`, before `pacingObs`. Total lenses: 11.

### Data model changes
**Note — new optional fields:**
- `revisedAt?: string` — ISO date of last edit (when text or tag changes)
- `reflection?: string` — follow-up thought added after original note
- `reflectionDate?: string` — ISO date reflection was last saved

**Mystery — new optional fields:**
- `originalText?: string` — preserved from first refinement only (`my.originalText ?? my.text`)
- `observation?: string` — reader's current thinking on this thread
- `observationDate?: string` — ISO date observation was last saved

### Architecture notes
- `today()` as a function (not module-level const) — captures actual call-time date, not module load time.
- `originalText` first-write-only pattern: `my.originalText ?? my.text` never overwrites existing `originalText`, so the true original phrasing survives multiple refinements.
- Saving empty string as `undefined` (not `null`) when clearing reflection/observation — omits the field from the object, keeps localStorage clean.
- Status picker deliberately excludes `resolved` — the toggle/checkbox handles that transition separately.
- Left-border observation/reflection display (`border-l-2 border-ink-200` + italic) is consistent across both Notes and Mysteries tabs.
- `interpretationObs` reads raw `book.mysteries` fields (`observation`, `originalText`) — no character names or plot details, so no spoiler risk.

---

## Session 15 — 2026-05-07
**Theme:** Character Curation + Companion Ownership Pass

### Rewrote
- **`src/tabs/CharactersTab.jsx`** — complete rewrite. Added three new sub-components inline:
  - `AddCharForm` — inline expandable add form. Fields: Name (required), Role (required), Main/Secondary toggle, and a "More options" section (Status, Allegiance, Notes/description, Appears from chapter). Saves new character with `userAdded: true`; `alive` derived from status text via `deriveAlive()`; `spoilerSafe: false` when `revealChapter` is set.
  - `CharCard` — extended with edit mode, relationship list, and add-relationship mini-form.
    - Edit mode: triggered by "Edit" button in full card view. Pre-fills all fields from `raw` (original character data, not spoiler-view). Saves `updatedAt` on every edit.
    - Relationship list: filters `book.characters.relationships` to only those involving this character AND visible on both ends (spoiler-safe). Each row shows other character name, label, type pill, × remove.
    - Add-relationship form: character select (only `visibleChars`), type dropdown, label input. Saves inline via `onUpdateBook`.
  - Empty state: richer body copy + `Add the first character →` action link.
  - Ownership signal: "N characters added by you." italic line at tab bottom when any `userAdded` chars exist. "Your understanding of this character has been revised." in CharCard when `updatedAt` is set on a non-userAdded char.

### Modified
- **`src/utils/companionPresence.js`** — added `characterOwnershipObs(allChars, style)` lens. Fires when `userAdded` or `updatedAt` characters exist. Three style variants. Added to `generatePresence` after `characterObs`, before `readerObs`. `allChars` derived from `book.characters.main + secondary`.

### Architecture notes
- `CharCard` receives both `ch` (view data from `getCharacterView`) and `raw` (original array object). Display uses `ch`; edit form uses `raw`. This is the clean separation that keeps spoiler-view and editor-view from conflicting.
- `visibleChars` (the array of already-gated views) is passed to `CharCard` as `visibleChars` — used for the relationship target dropdown and for filtering the connections display. Hidden characters cannot be connected to.
- `deriveAlive(statusStr)` checks for "deceased"/"dead" substrings (case-insensitive). Called on add and on save. Keeps the alive badge correct without requiring a separate checkbox.
- Relationship removal uses `r !== rel` (object reference equality against the filtered array). Since the filtered `rel` objects are the same references as in `book.characters.relationships`, this is safe.
- `characterOwnershipObs` reads raw `book.characters` (not view-gated). The lens only exposes a count and general phrasing — no character names are included in the output, so no spoiler risk.

---

## Session 14 — 2026-05-07
**Theme:** Companion Memory + Narrative Continuity Pass

### Built
- **`src/utils/companionPresence.js`** — four new internal lens functions added to `generatePresence`. Lens execution order expanded from 6 to 10; cap stays at 8 (3 for minimal).
  - `finishedObs(pct, notes, important, style)` — fires at ≥99%; reflects on notes and starred chapters as a record of the reader's attention. Silent if no notes or stars exist.
  - `lingeringMysteryObs(mysteries, currentChapter, pct, style)` — fires when any mystery has been open ≥10 chapters; receives already-visibility-gated `openMyst` array (spoiler-safe). Threshold: `currentChapter - m.chapter >= 10`.
  - `notePatternObs(notes, style)` — two patterns: (a) ≥2 character-tagged notes ("You keep writing about the characters."), (b) ≥2 theory + ≥2 confusing notes ("You've been both theorizing and unsettled at the same time."). Non-overlapping with `readerObs`.
  - `pacingObs(log, pct, style)` — compares session density in first vs. second half of unique reading days. ≥1.8x acceleration or deceleration triggers. Requires ≥5 unique days + ≥30% progress. 7-day span floor prevents false signals from concentrated logs.
  - Extended `momentumObs` — 60+ and 30+ day gap cases added before existing 14+ day case (ordering critical for the if-else chain to be correct).

### Modified
- **`src/components/dashboard/ReadingMomentum.jsx`** — matching 60+ and 30+ day gap cases added. "A long time away from this story" / "It hasn't changed. You may have." and "Over a month since your last session" / "It's still here, unchanged."
- **`src/tabs/PlotTab.jsx`** — differentiated `isJustRead` (ch.num === currentChapter → gold "Just read" badge) from `isRecent` (!isJustRead && ch.num >= currentChapter - 2 → sage "Recent" badge). Previously all recent chapters got the same treatment.
- **`src/tabs/MysteriesTab.jsx`** — lingering mystery annotation: when `!m._veiled && !m.resolved && (book.currentChapter - m.chapter) >= 8`, renders `· N ch. open` inline after "First appears ch. X". Italic, ink-300, subtle.
- **`src/tabs/NotesTab.jsx`** — `dominantTag` IIFE: fires when `book.notes.length >= 5` and leading tag has count ≥3. Renders quiet summary line above filter row: "{N} notes — mostly {tag}". Uses `TAG_CONFIG[top]?.label` for human-readable tag names.

### Architecture notes
- `lingeringMysteryObs` receives `openMyst` (already filtered by `isMysteryVisible`) — not raw `book.mysteries`. This preserves spoiler-mode correctness throughout.
- `pacingObs` uses `[...new Set(log)].sort()` to deduplicate dates before computing halves. Multiple sessions in one day count as one data point.
- `notePatternObs` intentionally skips the `theory/theme/confusing/quote/favorite/important` territory already covered by `readerObs`. It only adds: (a) character-tag notes, (b) the theory+confusion combo at lower counts than `readerObs` requires.
- `dominantTag` in NotesTab is computed in a render-time IIFE — no stored state. Disappears automatically if notes are deleted.
- The 60+ and 30+ day cases in `ReadingMomentum` must appear before the `> 14` case in the if-else chain. If order is reversed, the more specific cases are unreachable.

---

## Session 13 — 2026-05-07
**Theme:** New Companion Experience Pass

### Built
- **`src/tabs/MysteriesTab.jsx`** — inline add-mystery form. "+ Open a thread" button sits in the header row next to the filter pills. Form: textarea ("What question is this story carrying?"), Cancel + "Open thread" buttons. Submits with `status:'open'`, `chapter: book.currentChapter || 1`. Enter key submits. This was the most significant missing feature for new companions — without it, the Mysteries tab was read-only and useless until mysteries were seeded by data.

### Modified
- **`src/components/dashboard/BookDashboard.jsx`** — passes `onOpenUpdate={() => setShowUpdate(true)}` to ProgressTab.
- **`src/tabs/ProgressTab.jsx`** — new `isNew` check (`pct === 0 && !readingLog.length`). When true, renders a welcoming panel between the 0% stat block and the chapter list: "Your companion is ready." + "Tell the companion where you are →" link that opens the update modal.
- **`src/tabs/CharactersTab.jsx`** — empty state copy: "The cast hasn't assembled yet." / "Characters emerge gradually as the companion learns the story with you."
- **`src/tabs/NotesTab.jsx`** — empty state copy: "Your thoughts about this story will gather here." / "Theories, favourite lines, confusions, hunches — the companion keeps everything you give it."
- **`src/tabs/MysteriesTab.jsx`** — empty state now differentiates `noneAtAll` (fresh companion: "Questions tend to appear once the story begins moving.") from filtered-empty (existing message). "Open the first thread →" action button in fresh state.
- **`src/tabs/DiscussionTab.jsx`** — quiet italic line when no questions exist at all: "Questions will find their way here as the companion grows with you."
- **`src/components/modals/ChapterUpdateModal.jsx`** — `isFirst` flag captured before update (`book.readingLog.length === 0`). First-session success state shows "Your companion is awake." + "Beginning with Chapter N of M." instead of the standard milestone/chapter message.
- **`src/components/library/CreateCompanion.jsx`** — step 3 create button copy: "✦ Begin the companion". Quiet italic below: "You can add characters, mysteries, and notes as you read."

### Architecture notes
- `isNew` in ProgressTab is derived at render time — no stored state. Once the book has any `readingLog` entry (set on first modal update) or any completed chapter, the panel disappears naturally.
- `isFirst` in ChapterUpdateModal is computed at the moment `handleUpdate` runs (before `onUpdateBook` is called), so it reflects the pre-update readingLog correctly.
- The mystery add form follows the same pattern as NotesTab's add form: local `adding`/`newQ` state, inline expansion, cancel clears both.
- No persistent onboarding state was added — all nudges are purely derived from book state and disappear when content exists.

---

## Session 12 — 2026-05-07
**Theme:** Trust Patch + Discussion Visibility Foundation

### Fixed
- **`src/components/modals/ChapterUpdateModal.jsx`** — two spoiler leaks patched. (1) `newlyMet` now uses `revealAt = c => c.revealChapter ?? parseInt(c.lastSeen?.match(/\d+/)?.[0] || '0')` as the canonical introduction chapter — prevents characters with future `lastSeen` from being announced before they appear in the story. (2) `openMyst` and `newMyst` now go through `isMysteryVisible(bookAtNew, m, mode)` where `bookAtNew = { ...book, currentChapter: newCh }` is a synthetic book at the new boundary. Mode is resolved from `useSettings()` via `getEffectiveMode(book, settings)`.

### Built
- **`src/utils/spoiler.js`** — `getDiscussionQuestionView(book, question, mode)` added. Handles both plain string questions (always visible, backward-compatible) and object-form questions `{ text, visibilityThreshold?, chapter?, alternatePrompt? }`. Strict mode returns `null`; relaxed returns `{ text: alternatePrompt ?? "A question for later in the story.", _veiled: true }`; full and within-boundary return `{ text, _veiled: false }`.
- **`src/tabs/DiscussionTab.jsx`** — wired to `getDiscussionQuestionView`. All questions mapped through the view function; nulls filtered; veiled questions rendered with italic/dimmed `text-ink-400` styling and a muted `"` marker (`text-ink-300`). Unlayered question card styling unchanged.
- **`src/data/books.js`** — object-form discussion questions added to UTWB (2 questions gated at ch 23+ and ch 25+ with `alternatePrompt` fallbacks) and MANIAC (1 question gated at ch 20+ for the Lee Sedol / AlphaGo section). These are the first live demonstrations of the discussion visibility system.

### Cleaned up
- **`src/App.jsx`** — removed `import './App.css'` (file was empty, leftover from Vite scaffold)
- **`src/App.css`** — deleted
- **`src/index.css`** — removed unused `@keyframes insightFade` (defined but never referenced; `CompanionInsights` uses inline opacity transitions)

### Architecture notes
- `getDiscussionQuestionView` follows the same null/veiled pattern as `getMysteryView` and `getCharacterView`. Consistent: `.filter(Boolean)` removes strict-mode nulls; `_veiled: true` triggers alternate rendering.
- Discussion questions remain an array of mixed types — plain strings and objects coexist. The view function normalizes them to `{ text, _veiled }` before render.
- `ChapterUpdateModal` now requires `useSettings` — it's the last modal-class component to depend on the settings context.

---

## Session 11 — 2026-05-07
**Theme:** Narrative Trust — Remaining Gaps

### Built / Modified
- **`src/components/dashboard/RelationshipMap.jsx`** — full spoiler gating. Maps characters through `getCharacterView` before building the SVG; unmet characters absent in strict mode (null-filtered), shown with `?` initials + `···` name + dimmed styling + no relationship labels in relaxed mode. Relationship lines involving veiled characters render without labels at 15% opacity. Footer "Some connections are still unfolding." shown when any veiled.
- **`src/utils/companionPresence.js`** — full `insightStyle` tonal variants. `observational` (current literary default), `analytical` (structural, craft-aware, slightly detached), `minimal` (sparse phrases, 3-observation cap, skips mystery/character/reader lenses). Each lens has style-specific copy. Arc observations are the most differentiated; momentum/duration lenses share structure with style-adjusted phrasing.
- **`src/data/books.js`** — `alternateSummary` added to all 11 UTWB future chapters (ch 19–29): evocative one-line placeholders used in strict mode instead of real titles ("A difficult choice", "A line crossed", "An irreversible act", etc.). Lee Sedol added to MANIAC secondary characters with `revealChapter: 20, spoilerSafe: false` — the first seed character that exercises the `revealChapter` path; absent from Characters tab and RelationshipMap in strict mode (ch 8). Relationship `man1 → man4 "long consequence"` added.
- **`docs/CHATGPT_HANDOFF.md`** — Section 10 "Milestone Report" added with: complete visibility model, key implementation patterns, all architecture decisions, 6 unresolved trust risks, recommended next milestones.

### Architecture notes
- The `insightStyle` cap for `minimal` (3 observations) is set at the `return out.filter(Boolean).slice(0, cap)` line. Change `cap` to adjust.
- `RelationshipMap` reuses `getCharacterView` rather than its own visibility logic — one source of truth for what's visible.
- `alternateSummary` on chapters is purely a display concern. The real title is preserved in data and used in full/relaxed modes; only strict mode reads `alternateSummary`.

---

## Session 10 — 2026-05-07
**Theme:** Spoiler Enforcement + Narrative Trust Pass

### Built
- **`src/context/SettingsContext.jsx`** — global settings state with localStorage persistence under `shadowscribe_settings`. Provides `{ settings, updateSetting }` via `useSettings()` hook. Defaults: `spoilerMode: 'relaxed'`, `insightStyle: 'observational'`, `defaultFormat: 'print'`. Wrapped around `BooksProvider` in `App.jsx`.

### Rewrote
- **`src/utils/spoiler.js`** — full graduated visibility system. Key exports: `getEffectiveMode(book, settingsOrMode)`, `getCharacterView(book, character, mode)`, `getMysteryView(book, mystery, mode)`, `getChapterTitle(book, chapter, mode)`, `isMysteryVisible`, `isCharacterSafe`, `MYSTERY_STATUSES`. Philosophy: veil with literary text, never blank fields, never mechanical censorship.
- **`src/tabs/CharactersTab.jsx`** — wired into `getCharacterView`. Veiled characters render italic evocative description; full-view shows allegiance/lastSeen grid. Strict+unmet characters filtered out entirely. Footer note when any veiled.
- **`src/tabs/MysteriesTab.jsx`** — wired into `getMysteryView`. Expanded `STATUS_STYLE` for all 6 statuses. Veiled mysteries italic + disabled toggle. Footer note when any veiled.

### Modified
- **`src/tabs/ProgressTab.jsx`** — uses `getChapterTitle(book, ch, mode)` for chapter title display. In strict mode, chapters beyond `currentChapter + 1` show `···` instead of real title.
- **`src/components/shared/WeightedProgressBar.jsx`** — tooltip uses `getChapterTitle` (respects mode). Obscures future titles in strict mode.
- **`src/utils/companionPresence.js`** — `generatePresence(book, settings)` now takes optional `settings`. Character lens only counts `isCharacterSafe()` characters (no spoiling future deaths). Mystery lens only counts `isMysteryVisible()` mysteries.
- **`src/components/dashboard/CompanionInsights.jsx`** — imports `useSettings`, passes `settings` to `generatePresence`. `useMemo` dep includes `settings.spoilerMode`.
- **`src/pages/SettingsPage.jsx`** — wired to `useSettings()` context. `insightStyle`, `defaultFormat`, `spoilerMode` selects now read/write persisted settings.
- **`src/components/library/CreateCompanion.jsx`** — form initializes `format` and `spoilerMode` from `settings.defaultFormat` / `settings.spoilerMode`.

### Architecture notes
- **`getEffectiveMode` resolution order:** `book.spoilerMode` → `settings.spoilerMode` → `'relaxed'`. Per-book always wins over global default.
- **`getCharacterView` returns `null`** in strict mode for unmet characters — filtered by `.filter(Boolean)` in tabs. Never `undefined`, never crashes.
- **Veil text is literary, role-aware:** protagonists get "Their story is still unfolding page by page.", antagonists get different text, etc. Configured via `veiledDescription()`.
- **`allegiance` shift handling:** `veiledAllegiance()` strips the post-`→` portion if the character's `lastSeen` is beyond the reader's current chapter.
- **New optional data fields:** `chapter.alternateSummary`, `character.revealChapter`, `character.hiddenDescription`, `character.hiddenStatus`, `mystery.visibilityThreshold`, `mystery.alternateSummary`. All backward-compatible — existing data works without them.

---

## Session 9 — 2026-05-07
**Theme:** Reading Structure + Data Integrity Pass

### Built
- **`src/utils/chapterHelpers.js`** — chapter model utilities: `getChapterLabel(ch, format)`, `getChapterShortLabel`, `getChapterWeight(ch)`, `getTotalWeight(chapters)`, `getWeightedProgress(book)`, `isSpecialChapter(ch)`. All chapter type/weight logic centralised here.
- **`src/utils/spoiler.js`** — spoiler intelligence foundation (architecture only, no UI enforcement yet): `getSpoilerBoundary`, `isChapterVisible`, `isCharacterSafe`, `isMysteryVisible`, `getChapterContent`, `getCharacterView`, `getVisibleRange`, `getTitleVisibilityBoundary`.
- **`src/components/shared/WeightedProgressBar.jsx`** — segmented progress bar with proportional chapter segments (based on `estimatedLength ?? 1`), subtle 1px dividers, hover tooltip showing chapter label + title. Adaptive divider density (all for ≤12 chapters, every 2nd for ≤24, every 5th for larger books).

### Modified
- **`src/utils/progress.js`** — `getProgress` now delegates to `getWeightedProgress` from `chapterHelpers.js`.
- **`src/components/shared/BookCover.jsx`** — full rewrite: two-source fallback chain (OpenLibrary → Google Books), loading shimmer (`animate-pulse` overlay), `naturalWidth < 10` check to catch OpenLibrary's 1px "not found" image, `opacity` crossfade on load. No more layout shift.
- **`src/components/dashboard/CompanionHeader.jsx`** — replaces flat `ProgressBar` with `WeightedProgressBar`; chapter label now uses `getChapterLabel(ch, book.format)` instead of hardcoded "Chapter/Part N".
- **`src/tabs/ProgressTab.jsx`** — overview uses `WeightedProgressBar`; checklist rows use `getChapterLabel`; prologue/epilogue/interlude rows get `text-ink-500` (slightly elevated vs plain chapters).
- **`src/components/library/CreateCompanion.jsx`** — full rewrite: mood selection (6 swatches with labels + live description in Step 1), structure type radio group (Chapters/Parts/Sections in Step 2), series "Part of a series" checkbox toggle (reveals fields when checked), new book's `coverBg` derives from selected mood color, chapters scaffold with correct `type` field, Step 3 summary shows mood dot + label.
- **`src/data/config.js`** — added `CHAPTER_TYPES` and `STRUCTURE_TYPES` exports.
- **`src/data/books.js`** — UTWB ch. 29 gets `type: 'epilogue'`; MANIAC ch. 1 gets `type: 'prologue'`.
- **`src/index.css`** — mobile polish: `.chapter-row` min-height, `.modal-sheet` with safe-area support, `.tab-scroll-fade` right-edge gradient indicator, larger touch targets on mobile.
- **`src/components/dashboard/BookDashboard.jsx`** — tab container adds `.tab-scroll-fade` class.

### Deleted
- **`src/utils/insights.js`** — orphaned after Session 8 (`CompanionInsights` already switched to `companionPresence.js`). Nothing imported it.

### Architecture notes
- `estimatedLength` on chapters is optional (defaults to 1). All existing books work without it. When all chapters have equal weight, `WeightedProgressBar` still adds value via structural dividers.
- `spoiler.js` laid out as the foundation for `spoilerMode` enforcement — fully wired to UI in Session 10.
- `structureType` is now a first-class field on books created via wizard (stored as `book.structureType`). Seed books do not have this field; components fall back gracefully via `book.format`-based detection.
- New books' `coverBg` gradient derives from the selected mood color for visual consistency before a cover loads.

---

## Session 8 — 2026-05-06
**Theme:** Companion Presence + UX Polish Pass

### Built
- **`src/utils/companionPresence.js`** — new 6-lens presence engine replacing `generateInsights` as the source for `CompanionInsights`. Lenses: arc (12 progress stages), mystery convergence, character deaths/allegiance shifts, reader behavior (note tag patterns), momentum (streak/cadence), duration (total weeks). Returns up to 8 observations.
- **`src/data/config.js` — `MOOD_CONFIG` export** — maps each mood key to `label` and `description`. Used by any future mood-selection UI.
- **`src/index.css` — `steel` mood** — new `[data-mood="steel"]` rule (`--ca: #2D4A6B`), cool steel-blue for academic/analytical books. Also added `--color-steel-*` tokens in `@theme`.
- **`src/index.css` — mood-aware insight strip** — `.insight-strip` background now uses `color-mix(in srgb, var(--ca-bg, ...) 40%, var(--color-cream))` so the strip tints to the book's accent color.
- **`src/index.css` — ambient page gradient** — `body::before` adds a very subtle radial gradient at the page top (gold at 4% opacity); `#root` positioned above it.
- **`src/index.css` — `prefers-reduced-motion`** — `@media (prefers-reduced-motion: reduce)` block collapses all animation/transition durations to `0.01ms`.

### Modified
- **`src/components/dashboard/CompanionInsights.jsx`** — imports `generatePresence` from `companionPresence.js` instead of `generateInsights` from `insights.js`; `useMemo` deps expanded to include `readingLog.length` and `characters.main.length`.
- **`src/components/dashboard/ReadingMomentum.jsx`** — shows a `primary` line + optional `secondary` line. Detects streak, 7-day session count, days since last session, and weeks since first session. Richer copy: "This story has its hooks in you.", "Something is keeping you here.", "It will be here when you return."
- **`src/components/shared/EmptyState.jsx`** — warmer icon container (gradient cream-200→cream-50, subtle radial glow, shadow-sm); larger icon (w-14 h-14); serif title at text-[15px].
- **`src/pages/SettingsPage.jsx`** — full scaffold replacing placeholder. Four sections: Appearance (Dark Mode + Shadow Mode — disabled, "Soon" badge), Companion Behavior (Insight Style select, Presence Frequency), Reading Preferences (Default Format, Default Spoiler Mode), Data & Privacy (Export/Import — disabled; Reset to Demo Data with two-step confirm).
- **`src/data/books.js`** — MANIAC `mood` changed from `'ink'` to `'steel'`.

---

## Session 7 — 2026-05-06
**Theme:** React Router migration

### Built
- Installed `react-router-dom` v7
- **`src/pages/LibraryPage.jsx`** — thin wrapper rendering `<Library />`
- **`src/pages/BookPage.jsx`** — extracts `bookId` from `useParams`, redirects to `/library` if book not found
- **`src/pages/NewCompanionPage.jsx`** — wires `createBook` + `navigate` into `CreateCompanion`'s callbacks
- **`src/pages/SettingsPage.jsx`** — placeholder

### Modified
- **`App.jsx`** — replaced `BrowserRouter` + `Routes` + `Route`; `AppShell` uses `useLocation` to key the `view-enter` wrapper (preserves page transition animation on route changes); `BooksProvider` wraps inside `BrowserRouter` so context is available to all route components
- **`TopNav`** — dropped `view`/`onLibrary`/`onCreateNew` props entirely; uses `useNavigate` + `useLocation` internally; active Library state derived from `location.pathname`; menu closes automatically on route change via `useEffect([location.pathname])`
- **`Library`** — dropped `onSelectBook` prop; uses `useNavigate` internally for book card clicks

### Routes
| Path | Component | Notes |
|------|-----------|-------|
| `/` | → `/library` | redirect |
| `/library` | `LibraryPage` | |
| `/new` | `NewCompanionPage` | |
| `/book/:bookId` | `BookPage` | redirects to `/library` if bookId unknown |
| `/settings` | `SettingsPage` | placeholder |
| `*` | → `/library` | catch-all |

---

## Session 6 — 2026-05-06
**Theme:** P0 baseline stability fixes

### Built
- **`DiscussionTab` persistence** — user-added questions now stored in `book.userDiscussionQuestions` (new field, separate from curated `book.discussionQuestions`). `onUpdateBook` prop added to the tab; `BookDashboard` updated to pass it. `|| []` fallback handles books without the field (existing localStorage data, seed books). `CreateCompanion` updated to include `userDiscussionQuestions: []` on new books.
- **ESC closes `ChapterUpdateModal`** — `useEffect` adds a `keydown` listener on `document` that calls `onClose()` on Escape; cleaned up on unmount.

### Fixed
- `BookDashboard` was not passing `onUpdateBook` to `DiscussionTab` — the prop was present in the tab's signature but never wired from the dashboard.

---

## Session 5 — 2026-05-06
**Theme:** localStorage persistence

### Built
- **`src/utils/storage.js`** — three exported functions:
  - `loadBooks()` — reads `shadowscribe_books` from localStorage, parses JSON, falls back to `INITIAL_BOOKS` if missing, empty, or corrupted
  - `saveBooks(books)` — writes books array to localStorage; swallows quota/private-mode errors silently
  - `resetBooks()` — removes the localStorage key, returns `INITIAL_BOOKS`
- **`BooksContext` updated** — `useState(loadBooks)` (lazy initializer), `useEffect(() => saveBooks(books), [books])`, new `resetToDemo` exported value that calls `resetBooks()` and resets state
- **Dev-only "Reset demo data" in TopNav** — rendered only when `import.meta.env.DEV` is true; appears at the bottom of the hamburger dropdown; calls `resetToDemo()` then navigates to library

### Architecture note
`BooksContext` is the only place that touches localStorage. No component or tab knows about it. The `resetToDemo` value is exposed on the context so `TopNav` can trigger it without prop threading.

---

## Session 4 — 2026-05-06
**Theme:** Architecture refactor (monolith → component tree)

### Built
Broke `src/App.jsx` (~1,580 lines) into 29 files across a structured `src/` tree. Full file list:

**Utils:** `date.js`, `progress.js`, `insights.js`  
**Data:** `books.js`, `config.js`  
**Context:** `BooksContext.jsx` (React Context: books, updateBook, createBook)  
**Hooks:** `useBooks.js`  
**Components/layout:** `TopNav.jsx`  
**Components/library:** `Library.jsx`, `BookCard.jsx`, `CreateCompanion.jsx`  
**Components/dashboard:** `BookDashboard.jsx`, `CompanionHeader.jsx`, `CompanionInsights.jsx`, `ReadingMomentum.jsx`, `RelationshipMap.jsx`  
**Components/modals:** `ChapterUpdateModal.jsx`  
**Components/shared:** `icons.jsx`, `ProgressBar.jsx`, `StatusBadge.jsx`, `NoteTag.jsx`, `BookCover.jsx`, `SectionLabel.jsx`, `SectionHeading.jsx`, `EmptyState.jsx`  
**Tabs:** `ProgressTab.jsx`, `CharactersTab.jsx`, `PlotTab.jsx`, `NotesTab.jsx`, `MysteriesTab.jsx`, `DiscussionTab.jsx`

### Architecture decisions
- `BooksContext` provides `{ books, updateBook, createBook }` to entire tree
- `Library` reads books from context directly (no prop drilling)
- `BookDashboard` receives only `bookId`, fetches book from context, passes `book` + `onUpdateBook` down to tabs
- Navigation state (`view`, `selectedId`) stays in `AppShell`

### Fixed
- `CreateCompanion` was missing `relationships: []` in the `characters` object — would have caused `RelationshipMap` to crash on newly created books

---

## Session 3 — 2026-05-06
**Theme:** Living companion layer

### Built
- **`CompanionInsights` component** — rotating literary insights generated from book state. Up to 6 insights per book, rotating every 7s with 280ms crossfade. Manual dot navigation. Based on: progress arc position (9 stages), mystery count/convergence, character deaths/allegiance shifts, pivotal chapter count, note tag patterns.
- **`generateInsights(book)` helper** — pure function, returns `string[]`. Used inside `CompanionInsights` via `useMemo`.
- **`calcStreak(log)` helper** — calculates current consecutive-day reading streak from `string[]` of ISO dates.
- **`ReadingMomentum` component** — pulsing dot + contextual text below the update button. Shows streak if active (≥1 day), otherwise session count.
- **`RelationshipMap` component** — inline SVG constellation. Protagonist at center `(150, 120)`, others equally spaced at `radius=88`. Dashed lines color-coded by type (love/ally/tension/hierarchy). Perpendicular-offset relationship labels. Color legend strip below.
- **Per-companion accent theming** — `data-mood` attribute on `BookDashboard` wrapper + `ChapterUpdateModal` wrapper sets `--ca`, `--ca-bg`, `--ca-border` CSS custom properties. 5 moods: sage, ember, ink, sienna, gold.
- **Literary microcopy rewrites** throughout all tabs and modals.
- **View transitions** — `.view-enter` class wraps all view changes at root App level.
- **`ChapterUpdateModal` rewrite** — new success state with milestone detection (25/50/75/100%), newly-encountered characters, chapter recap + reflection, newly-opened mystery threads, still-unresolved mysteries.
- **`ProgressBar` `accentVar` prop** — when true, fills with `var(--ca)` instead of a static color class.
- **Grain texture overlay** — `body::after` with SVG `feTurbulence`, `opacity: 0.022`, `mix-blend-mode: multiply`.

### Added to `data.js`
- `mood` field on all 5 books (UTWB→sage, Mother Night→ember, Republic of Thieves→ember, MANIAC→ink, Starter Villain→gold)
- `readingLog` date arrays on all books
- `relationships` arrays in all books' `characters` objects
- Set `isbn: null` on Mother Night, Republic of Thieves, The MANIAC (wrong/blank Open Library covers)

### Fixed
- **Critical Tailwind v4 cascade bug** — all CSS resets moved inside `@layer base {}`. Without this, ALL `py-*`, `px-*`, `gap-*`, `space-y-*` utilities produced 0px. Root cause: unlayered CSS rules always beat `@layer utilities` rules regardless of specificity.
- Wrong Open Library book covers (see above isbn null changes).

### Decisions made
- Per-companion accent colors via CSS custom properties (`data-mood` scope) rather than prop-drilling or React context. Simpler, more performant, works with SVG too.
- `generateInsights` is rule-based (not AI), deliberately. It reads existing data fields. AI integration is a future enhancement, not current dependency.
- No `DiscussionTab` question persistence for now — noted as a known issue.

---

## Session 2 — 2026-05-05
**Theme:** Layout system rebuild

### Built
- Persistent fixed `TopNav` (h-14, z-30) with Shadow Scribe logo, `+ New Companion` button, hamburger dropdown
- All content offset by `pt-14` to clear fixed nav
- Sticky sub-nav bars (`sticky-bar` class, `top-14`) for Library and BookDashboard
- `max-w-4xl mx-auto` layout container with `px-5 sm:px-8` padding
- Responsive library grid (1/2/3 columns)
- `animate-menu-drop` on TopNav dropdown
- `animate-tab-in` on tab content (key-remounted on change)

### Fixed
- Layout system was previously broken — sticky bars overlapped content
- Various spacing issues throughout

---

## Session 1 — 2026-05-02 to 2026-05-04
**Theme:** Initial build

### Built
- Complete application scaffold with Vite + React 19 + Tailwind v4
- All 6 dashboard tabs (Progress, Characters, Chronicle, Notes, Mysteries, Discussion)
- `CreateCompanion` 3-step wizard
- `INITIAL_BOOKS` data for 5 books (UTWB, Mother Night, Republic of Thieves, The MANIAC, Starter Villain)
- Chapter checklist with toggle, celebration animation
- Note system with 6 tag types + tag filtering
- Mystery tracker with toggle resolution
- `ProgressBar`, `StatusBadge`, `NoteTag`, `BookCover`, `EmptyState` atoms
- Open Library cover fetching with gradient fallback
- `@theme` token system in `index.css`
- Full color palette: cream, ink, gold, sage, ember, sienna
- `@keyframes` for all animations

---

## Architecture decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-06 | Keep all components in single `App.jsx` for now | Prototyping speed; refactor when feature set stabilizes |
| 2026-05-06 | Use CSS `data-mood` + custom props for accent theming | Avoids prop drilling through 6+ component levels; works in SVG context |
| 2026-05-06 | Rule-based `generateInsights` (not AI) | Works offline, no latency, no API cost; replace/augment with AI later |
| 2026-05-06 | No localStorage yet | Deferred — prioritize feature parity first, persistence second |
| 2026-05-05 | No URL router | Deferred — single-view for now; add when deep-linking is needed |
| 2026-05-02 | Single `App.jsx` | Initial scaffolding simplicity |
| 2026-05-02 | Tailwind v4 (`@import "tailwindcss"`) | Current version, not v3 `@tailwind base/components/utilities` |
