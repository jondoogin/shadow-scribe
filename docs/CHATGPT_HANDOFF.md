# Lantern — Handoff Document
**Last updated:** 2026-08-12 · Session 162 (Dock audit + rebuild)
**Stack:** React 19 · Vite 8 · Tailwind CSS v4 · React Router v7 · localStorage + Supabase (optional cloud sync) · Vercel Serverless Functions (`/api/companion` — live)
**localStorage keys (FROZEN):** `shadowscribe_books` · `shadowscribe_settings` · `lantern_welcomed` — must NEVER be renamed
**Build command:** `node node_modules/vite/bin/vite.js build`
**Status: V2 COMPANION-FIRST REDESIGN — Complete. Four design sessions complete: Typography (S145), LibraryCompanion atmosphere (S147), Tab architecture (S148), Plot summaries + CompletionBand + Focus rings (S149–S151). S152: Finished-book experience pass + About page accuracy. S153: Threads + Themes for finished books. S154: About page visual improvements + RelationshipMap redesign. S155: Completion moment + PlotTab parse fix. S156: Finished-book library card. S157: Depth Level UX + Dark mode audit + Empty states pass. S158: Mobile audit + Plot discoverability + Library card redesign. S159: Return experience + Dark mode fixes + Voice calibration + Cross-book search + Library colophon + Landing page audit. S160: Google Books search-to-populate + Mobile bottom nav + Onboarding update. S161: Search failure states + Plot summary discoverability. S162: Dock (mobile bottom nav) audit + rebuild.**

> ⚠️ **Session numbering has diverged from git.** This doc's S159–S161 (return experience, Google Books search, mobile dock, search failure states) are **uncommitted working-tree changes**. Meanwhile `git log` contains a *separate* `s160`–`s162` track — Google OAuth + email/password auth, an account page, subscription skeleton, three sign-up nudges, and PWA theme-color sync — none of which is described anywhere in this document. Two session tracks were run against the same repo with colliding numbers. **Before the next session: reconcile these**, decide which numbering is canonical, and document the auth/account work. Nothing here is broken by it, but the doc is currently an incomplete picture of the app.

---

## CURRENT STATE

- **Product:** Companion-first reading environment running on Vellum design system (Libre Baskerville, warm amber/ember palette). CompanionBand is the primary interface surface. Cloud sync via Supabase magic-link is live and opt-in. Depth Level (Quiet/Resonant/Saturated) is per-book and wired to behavior.
- **Infrastructure:** Vercel serverless `/api/companion` proxy handles all AI calls without requiring a user API key. Field-level merge handles multi-device sync conflicts per array item, not last-write-wins whole-book. Tombstone deletion is now live — deleted notes/mysteries leave `{ deleted: true, updatedAt }` tombstones that propagate correctly across devices on sync.
- **Deletion semantics (resolved):** `deleteNote` and `deleteMystery` stamp tombstones; `liveItems()` in `utils/live.js` filters them for all display and computation. The stored arrays keep tombstones for sync correctness.
- **Search (S159):** Cross-book search now finds notes, mysteries, character names, and chapter summaries/titles (in addition to title/author). Minimum 3 characters to trigger content search. Placeholder updated to "Search titles, authors, or notes…"
- **Library colophon (S159):** Quiet archival summary at the bottom of the grouped library view — "N books closed · N notes in the margins · N days of reading". Only shows when there are finished books. 11px serif italic, very receded.
- **Return experience (S159):** BookCard now shows "away N days" / "away N weeks" below the progress bar for reading books idle 5+ days. CompanionHeader reading-gap archaeology container bumped from 5% to 8% amber, border 22% → 28%, gap label 11px ink-400 → 12px ink-500.
- **Dark mode (S159):** Library.jsx banners and reading-now-zone were using `var(--color-cream)` (not remapped in dark mode) as the color-mix base. Fixed to `var(--color-bg)` everywhere. This fixed the banners (WelcomeBanner, SnapshotReminder, PostSnapshotNudge, SignUpNudge) showing too-light backgrounds in dark mode.
- **Voice calibration (S159):** AboutPage hero companion aside removed "I" language. Old: "I've kept them where you put them." → New: "Still here. Where you left them." Exhibit note tag "reaction" (removed from product) cleaned up to "Note · ch. 9".
- **Book addition — Google Books search (S160):** CreateCompanion step 1 redesigned: search field is now primary ("What are you reading?"), manual entry is secondary, EPUB import is tertiary (small italic link at the bottom). Searching queries `googleapis.com/books/v1/volumes` — no API key needed. Selecting a result auto-populates title, author, ISBN, cover URL, and an estimated chapter count (`pageCount ÷ 22`). `form.coverUrl` is stored on the new book; async `fetchCoverUrl` is skipped if search already provided a cover.
- **The dock (S160, rebuilt S162):** `src/components/layout/BottomNav.jsx` — 3-item nav fixed to bottom on `sm:hidden`, hidden on `/book/*` and `/new` (those surfaces have their own navigation). Left = library, right = settings, centre = the reading in progress, named by title and linking to `/book/:id`, falling back to `add a book → /new` when nothing is open. Every icon sits in a fixed 18×18 box; active state is amber + a top rule + `aria-current`. Page clearance comes from `.dock-clear` on the route wrapper in App.jsx, which includes `env(safe-area-inset-bottom)`. See DESIGN_SYSTEM.md → "The Dock" for the full contract.

---

## WHAT LANTERN IS

A **living literary companion**. Not a reading tracker. Not a productivity tool. Not an AI chatbot. A personal, atmospheric space built around a companion that sits with the reader — surfacing thoughts, asking questions, and quietly building a record of the reading experience as it unfolds.

The companion is the star. Book data — characters, questions, themes, plot notes — is what the companion accumulates over time. The interface is built around access to the companion first; structured data second. The companion's accumulated record becomes the texture of the reading experience.

---

## RECENT SESSIONS

### Session 162 — 2026-08-12 — Dock audit + rebuild

The mobile bottom nav (the "dock") was audited and rebuilt. Every finding below was measured in the live DOM, before and after.

**The alignment bug (confirmed, root-caused, fixed).** The `✦` in the centre slot was a bare text node inside the shared `Item` wrapper span. That span carried no font-size of its own, so it inherited the body's `16px × 1.65` line-height and computed to **26.4px tall** against its SVG neighbours' **16px** — pushing the "reading" label **5.2px below** "library" and "settings" (measured `labelTop` 789.2 vs 784.0). Fix: every icon now sits in a fixed **18×18 flex-centred box** regardless of content. Measured after: `iconTop` 768.5 / `iconH` 18 / `labelTop` 792.5, identical across all three slots.

**Safe-area clearance (pre-existing bug, fixed).** The route wrapper used a flat `pb-16` (64px) against a 56px dock — 8px of slack, and **zero** allowance for the `env(safe-area-inset-bottom)` the dock itself absorbs. On a notched iPhone the dock renders ~90px tall while the padding stays 64px, putting the bottom ~34px of every page behind it. Desktop-only testing could never surface this. Replaced with `.dock-clear` in `index.css`: `calc(4.25rem + env(safe-area-inset-bottom))`, reset to `0` at `sm`.

**The centre slot was a no-op.** With no book in progress it navigated to `/library` — from the library, which is where it was most often tapped. It now offers `add a book →/new`. With a book open it names the book (`✦` + title, serif italic) instead of the generic word "reading", and goes to `/book/:id`. Subtitles are dropped before truncation at 18 chars ("Project Hail Mary: A Novel" → "Project Hail Mary"); articles are kept, since this labels what you're reading rather than sorting a shelf.

**Other findings fixed:** labels were 9px, below the S145 micro-label floor of 10px. Active state was colour-only — now colour + a 26×1.5px amber rule at the item's top edge (the tab bar's active underline, inverted for a bottom-anchored surface) + `aria-current="page"`. No `aria-label` on the nav or its buttons; added. Flat opaque background replaced with `color-mix(--color-bg 92%)` + `blur(10px) saturate(1.04)` and a soft upward shadow, so content dissolves under the dock instead of hitting a hard cut.

**Not changed, flagged instead:** the dock stays hidden on `/book/*`. Tapping the centre slot therefore makes the dock disappear, which is a slightly odd beat. Restoring it there is a navigation-architecture decision (S160 hid it deliberately; the book page's own tab bar is sticky-*top*, so there's no actual collision at the bottom) — worth a decision next session, not a drive-by change.

**Verified:** all three slots measured aligned in dark **and** light at 375px, no horizontal overflow, active state tracks the route correctly across `/library` and `/settings`, and the empty-centre (`add a book`) branch was rendered and measured by temporarily forcing the branch in source — identical geometry, `aria-label` correct. Build: `node node_modules/vite/bin/vite.js build` → clean ✓. No React errors in console; the 429s present are the known Google Books quota issue (Known Limitations #0), not from this change.

**Gotcha worth remembering:** when the Browser pane is hidden, CSS transitions **freeze mid-flight**, so `getComputedStyle` on any element carrying `transition-colors` returns the *pre-change* value indefinitely. This produced a convincing false positive — the dock's inactive colour read as the dark-mode `#706860` while `--color-ink-400` demonstrably resolved to the light `#8a8680` on the same element. A throwaway probe element (no transition) settled it. If a computed colour contradicts its own custom property, suspect a frozen transition before suspecting the token.

---

### Session 161 — 2026-08-03 — Search failure states + Plot summary discoverability + nested-button fix

**Verification pass on S159/S160 (all clean):** BottomNav dark mode correct (`--color-cream` IS remapped in `html.dark` at index.css:896 — not the S159 Library.jsx bug class). BottomNav correctly hidden on `/new` and `/book/*`. Cross-book search confirmed finding note-only text. LibraryColophon renders ("2 books closed · 38 notes in the margins") and gracefully omits the days segment when finished books lack `firstOpenedAt`/`completedAt`.

**What shipped:**

**Google Books search failure states (`src/components/library/CreateCompanion.jsx`):**
- The search dropdown previously rendered only on `searchOpen && searchResults.length > 0`. Any failure — no matches, network error, or a 429 — showed "searching…" then *nothing*. Silent dead end on the primary book-adding path (S160 promoted search to primary).
- Added `searchError` state. Non-ok responses are now detected via `res.ok` (previously a 429's JSON error body was silently treated as zero results).
- Three states now render in the dropdown panel: results, "Nothing found by that name. Enter the details below instead.", and an error line. 429 gets its own copy ("Book search is busy right now…").
- Added a `cancelled` guard in the debounce effect so a slow in-flight response can't overwrite fresher results.
- `onFocus` reopens the panel when there's an error to re-show, not just results.

**Plot summary discoverability (`src/tabs/PlotTab.jsx`):**
- Expanding a chapter with no summary showed a bare, dead `No summary yet.` The S158 banner ("The companion can fill in N chapter summaries · gather them →") sits at the top of the list — on a 20–40 chapter book it is scrolled far out of reach, so the expanded chapter was a true dead end.
- The expanded no-summary state now carries the affordance inline: "Nothing gathered here yet." + `gather them →`, plus a `gathering…` state and inline `genError` display. Because `openNum` holds a single chapter, this appears at most once — it never repeats down the list.
- Hoisted `aiEnabled(book, settings)` to a single `aiOn` const.
- Removed a dead branch: `aiEnabled()` is exactly `depth !== 'quiet'`, so the old `!aiOn && depth !== 'quiet'` fallback was unreachable.
- Quiet depth still renders pure silence in the expanded panel — verified. Invariant preserved.

**Verified:** search error state against the live 429; no-results and happy-path via stubbed responses (selection still populates title/author/ISBN and clears the query). Plot affordance verified in dark + light at desktop and 375px. Demo localStorage data was temporarily modified for testing and fully restored.

**Nested `<button>` fix (`src/tabs/PlotTab.jsx`) — pre-existing bug, fixed this session:**
- The chapter row's expand `<button>` contained the star `<button>`. Invalid HTML; React logged "cannot be a descendant of" hydration errors on every Plot render.
- Restructured: the row is now a `<div>` holding the expand `<button>` (`flex-1 min-w-0 text-left flex items-center gap-3`, wrapping the number circle + title/summary) as a **sibling** of the actions group (note count, star, chevron).
- Chevron became its own `<button>` so it stays clickable and keeps its position *after* the star — but carries `tabIndex={-1}` + `aria-hidden="true"` so it doesn't duplicate the expand button in the tab order or the a11y tree.
- Expand button gained `aria-expanded`.
- Dropped `e.stopPropagation()` from the star handler — meaningless once un-nested. Verified the star no longer toggles expansion.

**S101 hierarchy preserved — verified numerically, not by eye.** Captured computed geometry before and after; every value is identical: row heights 82/75/62 px (isJustRead / isRecent / older), number 12px·500 vs 10px·400, title 16/14/12px with weights 500/500/400, title font Libre Baskerville vs Inter, summary 12/11px, and `titleX` = 101px on every row. Confirmed in dark + light at desktop and 375px (no horizontal overflow), and that expand / chevron / star each work independently.

**Build:** `node node_modules/vite/bin/vite.js build` → clean ✓ | 139 modules | fresh-tab console: zero errors

**Gotcha worth remembering:** the browser tool's console buffer is cumulative and does **not** clear on reload — stale nested-button errors kept appearing after the fix. A transient mid-edit oxc parse error also produced a `[vite] Failed to reload` that made the page silently run the *old* module, so an early "identical geometry" reading was measuring stale code. Open a **fresh tab** for a trustworthy console read, and confirm the new DOM is actually live before trusting any measurement.

---

### Session 160 — 2026-05-31 — Google Books search + Mobile bottom nav + Onboarding + Housekeeping

**What shipped:**

**Book addition — search-first (`src/components/library/CreateCompanion.jsx`):**
- Step 1 heading: "Tell me about your book" → "What are you reading?"
- Google Books search input added as the primary path. Queries `googleapis.com/books/v1/volumes` (no API key needed). 350ms debounce. Results dropdown shows thumbnail, title, author.
- Selecting a result auto-populates: title, author, ISBN, `form.coverUrl` (stored on the book), and estimated chapter count (`pageCount ÷ 22`). Fills in below the search, user can still edit.
- EPUB import demoted from a dashed-border affordance to a quiet italic link at the bottom: "Have an EPUB? Import it…"
- `handleCreate`: if `form.coverUrl` is set from search, skips the async `fetchCoverUrl` lookup.

**Mobile bottom nav (`src/components/layout/BottomNav.jsx` — new):**
- 3-item fixed nav: Library (books icon) / Reading ✦ / Settings (gear icon).
- `sm:hidden` — only visible on mobile viewports.
- Hidden on `/book/*` and `/new` routes (those have their own tab-level navigation).
- Reading ✦: navigates to most recently updated `status === 'reading'` book; falls back to `/library` if none exist. ✦ shows amber when activeBook exists, dim when not.
- `src/App.jsx`: BottomNav imported and rendered inside AppShell. `pb-16 sm:pb-0` added to the view-enter route wrapper to clear the nav.

**WelcomeBanner copy (`src/components/library/Library.jsx`):**
- `hasKey` path: "import an EPUB or add a book manually" → "search for your book by title or author… no EPUB required."

**Handoff doc housekeeping:**
- Component tree updated to Session 160 with correct tab names (Threads / Chronicle, not Questions / Timeline).
- Known Limitations: removed three stale entries (tombstone deletion — shipped S133; calcStreak timezone — already fixed via `localDateKey()`; Open Library 1px placeholder — already handled in BookCover.jsx `handleLoad`).
- Queue: cleared S159 items, added fresh priorities.

**Build:** HMR clean ✓ | no errors

---

### Session 159 — 2026-05-31 — Return experience + Dark mode + Voice calibration + Cross-book search + Reading stats + Landing page audit

**What shipped:**

**Return experience polish:**
- `src/components/library/BookCard.jsx` — Added "away N days" / "away N weeks" line below progress bar for `status === 'reading'` books with `daysSince >= 5`. 10px italic serif ink-300, 75% opacity. Surfaces the reading gap at library card level so readers see it before entering the book.
- `src/components/dashboard/CompanionHeader.jsx` — Reading gap archaeology container: background 5% → 8% amber, border 22% → 28% amber, gap label 11px ink-400 → 12px ink-500. More atmospheric weight on the re-entry moment.

**Dark mode fixes (Library.jsx):**
- All four banner components (WelcomeBanner, SnapshotReminder, PostSnapshotNudge, SignUpNudge) used `var(--color-cream)` as the color-mix base color. `--color-cream` is defined in `@theme` and never remapped in `html.dark`, so dark mode banners showed a light background. Fixed to `var(--color-bg)` (dark-mode-aware) throughout. 5 occurrences replaced via `replace_all`.
- Reading-now-zone inline style had the same `var(--color-cream)` issue, overriding the CSS dark mode rule. Fixed to `var(--color-bg)`.

**Companion voice calibration:**
- `src/pages/AboutPage.jsx` — Hero companion aside: "I've kept them where you put them." → "Still here. Where you left them." Removes "I" language that violates the architectural invariant (companion never uses first person).
- `src/pages/AboutPage.jsx` — Exhibit note tag: "Note · ch. 9 · reaction" → "Note · ch. 9". "reaction" was a tag type removed from the product; stale reference cleaned up.

**Cross-book search (`src/components/library/Library.jsx`):**
- `matches()` function extended: now searches `book.notes[].text`, `book.mysteries[].text`, character names (`book.characters.main/secondary[].name`), and chapter titles/summaries — but only when `q.length >= 3` to avoid expensive searches on single characters.
- Search placeholder: "Search titles or authors…" → "Search titles, authors, or notes…"

**Library colophon (`src/components/library/Library.jsx`):**
- New `LibraryColophon` component added. Shows at bottom of grouped library view when `finished.length > 0`. Computes: books closed, total live notes across all books, total reading days across finished books (sum of firstOpenedAt → completedAt spans). Renders as a single quiet line: "✦ N books closed · N notes in the margins · N days of reading". 11px serif italic, opacity 0.40. Archival, not dashboard.

**Build:** HMR clean ✓ | no errors

---

### Session 158 — 2026-05-31 — Mobile audit + Plot discoverability + Library card redesign

**What shipped:**

**Mobile audit (no code changes needed except Library.jsx):**
- Verified tab bar, CompletionBand, ChapterUpdateModal, CompanionHeader, Chronicle/ProgressTab reading arc stats all clean at 375px.
- `src/components/library/Library.jsx` — Snapshot reminder banner: `flex items-center justify-between gap-4` → `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4`. Was squishing the text into a narrow column on mobile.

**Chapter update flow audit (no changes):**
- Confirmed ChapterUpdateModal is discoverable as the sole path for marking chapters done. The "Continue from chapter N →" CTA in CompanionHeader is prominent, contextually labeled, and the modal is complete. No additional entry points needed.

**Plot tab discoverability (`src/tabs/PlotTab.jsx`, two changes):**
- Generate-summaries prompt promoted from 11px right-aligned micro-link to an amber-tinted banner card: `color-mix(in srgb, var(--ca) 5%, transparent)` background + 1px accent border, descriptive text on left, `gather them →` action on right.
- "No summary yet." dead-end suppressed for `depth === 'quiet'` — AI is intentionally off in quiet mode, so this message was implying something was missing when it wasn't.

**Library card redesign (`src/components/library/BookCard.jsx`):**
- Footer redesign (main change): `ch. X of Y`, `31%`, and date were three separate lines creating a dashboard-tracker feel. Now: chapter + date merged into one line (`ch. X of Y` left, date right), progress bar below, no percentage text. Let the bar be the visual indicator.
- Want books: removed the 0% empty progress bar + date. Want books now show only the date (quiet, no progress widget).
- Finished books: "Finished [date]" → "closed [date]" — more tactile, evokes the physical act of closing a book.
- Hero title: 17px (was 16px) — more presence in the full-width reading-now slot.
- Non-hero/non-primary author line: 12px (was 13px) — keeps secondary register.
- Removed unused `pctOpacity` and `dateMt` variables.

**Build:** HMR clean ✓ | no errors

---

### Session 157 — 2026-05-31 — Depth Level UX + Dark mode audit + Empty states pass

**What shipped:**

`src/components/dashboard/CompanionBand.jsx`:
- Added depth picker: small ambient button (icon + label, 9px) in bottom-right of the CompanionBand showing current depth (`○ Quiet` / `◐ Resonant` / `● Saturated`).
- Clicking opens a floating picker panel (absolute, `menuDrop` animation, 232px wide) with three options — icon, label, 10px italic description — dismisses on click-outside.
- Active option gets accent color + 7% accent background tint.
- Clicking an option calls `onUpdateBook({ depthLevel: opt.k })` then closes.
- This surfaces depth as a one-click, always-visible control (previously buried in the metadata edit form).

`src/components/dashboard/CompanionHeader.jsx` — **Dark mode fixes:**
- Replaced hardcoded `rgba(184, 134, 11, ...)` accent bg/border/ornament colors with `color-mix(in srgb, var(--ca) N%, transparent)` and `var(--ca, #B8860B)` — these now track the dark mode accent correctly.
- Replaced `rgba(28,20,16,.04)` wrapper border with `var(--color-separator-soft)` — was dark-on-dark invisible in dark mode.

`src/components/library/Library.jsx` — **Dark mode fixes:**
- Two accent-tinted card borders (`rgba(184,134,11,.14)` and `.10`) → `color-mix(in srgb, var(--ca) N%, transparent)`.
- Search input border (`rgba(28,20,16,.06)`) → `var(--color-separator-soft)`.

`src/components/modals/ChapterUpdateModal.jsx` — **Dark mode fix:**
- Three card borders using `rgba(28,20,16,.06)` → `var(--color-separator-soft)` (dark-on-dark invisible issue).

`src/tabs/NotesTab.jsx` + `MysteriesTab.jsx` — **Dark mode fixes:**
- Companion thread border (`rgba(184,134,11,.15)`) → `color-mix(in srgb, var(--ca) 15%, transparent)` in both files.
- Era echo "earlier note" border (`rgba(28,20,16,.07)`) → `var(--color-separator)`.

`src/tabs/PlotTab.jsx` — **Additional parse error fix:**
- Second nested ternary inside a template literal found and fixed: `` `...${isJustRead ? 'py-4' : isRecent ? 'py-3.5' : 'py-2.5'}` `` → hoisted to `const rowPy`.
- Also: added `bookDepth` to import for depth-aware empty state.

**Empty states pass — depth differentiation added across all four tabs:**
- `PlotTab`: body copy now branches on `quiet` / `saturated` / `resonant`.
- `CharactersTab`: body copy now branches on `quiet` / `saturated` / `resonant`.
- `NotesTab`: added `saturated` variant ("the companion will carry the thread").
- `ProgressTab`: added `saturated` variant ("the companion traces the shape of the reading as it forms").
- `MysteriesTab` already had strong depth differentiation — no change needed.

**Build:** HMR clean ✓ | no errors across all files

---

### Session 156 — 2026-05-31 — Finished-book library card

**What shipped:**

`src/components/library/BookCard.jsx`:
- Added `liveItems` import from `../../utils/live.js`.
- Added `noteCount` and `daySpan` computed values (gated on `book.status === 'finished'` to avoid unnecessary work for active books).
- Finished-book footer redesigned:
  - Date line now reads "Finished [date]" instead of bare date — makes the context explicit.
  - Second line added when meaningful: shows note count ("N notes") and/or reading span ("N days"), separated by a gap, in 10px sans dim. Only shown when `noteCount > 0` or `daySpan > 1`.
  - This echoes the CompletionBand's reading arc stats at library card scale — the reading record now visible without entering the book.

**Build:** HMR clean ✓ | no errors

---

### Session 155 — 2026-05-31 — Completion moment + PlotTab parse fix

**What shipped:**

`src/index.css`:
- Added `@keyframes completionVeilIn` (fade in, hold, fade out — 2.6s) and `@keyframes completionWordIn` (rises in, holds, settles out — 2.6s).
- Added `.completion-veil` — `position: fixed; inset: 0; z-index: 60; background: var(--color-card-base); pointer-events: none` — full-screen overlay with animation.
- Added `.completion-veil-text` — carries the word animation.

`src/components/dashboard/BookDashboard.jsx`:
- Added `justFinished` state and `prevStatus` ref.
- Replaced the old `useEffect(() => { if (book?.status === 'finished') setTab('progress') })` with a transition-detecting version: fires only when status changes FROM non-finished TO finished (not on mount for already-finished books).
- On transition: sets `justFinished = true`, switches tab to 'progress', clears after 2.6s with cleanup.
- Added completion veil JSX — cream full-screen overlay with serif italic "The last page." and `✦` below it, both animated. Renders only during `justFinished` window.

**Note:** Veil is `pointer-events: none` and self-dismisses after 2.6s. No user action required. Does NOT fire when opening an already-finished book — only on the moment of completion.

`src/tabs/PlotTab.jsx` — **pre-existing parse error fixed:**
- oxc JSX parser was failing with "Unexpected token" at the function's closing `}` due to a nested ternary inside a template literal inside a JSX expression: `` `fill in ${n} ${n === 1 ? 'summary' : 'summaries'} →` ``. The brace-counting in JSX mode was confused by the `${...? ... : ...}` nesting.
- Fix: extracted `const summaryWord = missingSummaries === 1 ? 'summary' : 'summaries'` as a pre-render variable; template literal simplified to `` `fill in ${missingSummaries} ${summaryWord} →` ``.
- HMR confirmed clean (no errors in logs after edit).

**Build:** HMR clean ✓ | no new errors

---

### Session 154 — 2026-05-30 — About page visual improvements

**What shipped:**

`src/pages/AboutPage.jsx`:
- **GoldRule component**: Added centered `✦` ornament below the rule line — the section separator now reads as a bookish divider (used 4× on the page).
- **VoiceCard component**: Added large 52px serif open-quote `"` (amber, opacity 0.14) above each testimonial quote — the reader voices section now reads as proper editorial content, not plain list items.
- **Verse numerals (`.lp-num` CSS)**: Changed from `9px bold sans dim` to `13px italic serif accent(0.45)` — the "i. / ii. / iii. / iv." labels now have visual weight and feel bookish instead of like metadata tags.
- **Reader voices h2**: Fixed `font-weight: 600` → `400` — inconsistent with all other section headers on the page (all use 400); also removed redundant `fontWeight: 400` override from the `<em>` child since it inherits correctly now.
- **Gold ResidueCard corner mark**: Added small `✦` (amber, opacity 0.45) aligned to top-right of the "when" row on gold-highlighted cards — visually distinguishes the two gold cards from the four regular ones.

**Build:** confirmed rendering ✓ (DOM-verified via preview_eval)

Also shipped in S154:

`src/components/dashboard/RelationshipMap.jsx`:
- **Grouped by relationship type** — was a single flat list sorted by type; now rendered as discrete groups (love / ally / tension / hierarchy / neutral / unfolding) each with its own colored dot header and labeled section. Veiled relationships go into a separate `__veiled` → "unfolding" group at the bottom, with dimmed treatment.
- **Type dot header**: each group gets a 5px colored dot + uppercase 9px label in the type's accent color — immediately communicates group identity.
- **Left border grouping**: each group's relationships indent behind a `2px solid ${typeColor}22` left border (hex color with transparency suffix), providing visual structure without heaviness.
- **Label on its own line**: the relationship label moved from inline `— label` append to a second line in 11px italic serif below the names. More readable, more bookish.
- **`—` connector** between names (replacing `↔`) — quieter and less mechanical.
- Removed the tiny 2px color stripe that preceded each name pair — replaced by the group-level dot header.
- `anyVeiled` note ("Some connections are still unfolding.") retained, shown below the veiled group when relevant.

---

### Session 153 — 2026-05-30 — Threads + Themes for finished books

**What shipped:**

`src/tabs/MysteriesTab.jsx`:
- `finished` const (`book.status === 'finished'`) used as a gate throughout.
- Companion thread response suppressed for finished books — "The story will return to this." is wrong when the story is done. Added `|| book.status === 'finished'` to the early-return guard alongside `depth === 'quiet'`.
- `getMysteryGravity()` lines suppressed — all reference ongoing story ("The resolution may be closer", "The story hasn't closed it"). Added `&& !finished` to the render condition.
- "N ch. open" sub-label hidden for finished books — meaningless when reading is done.
- Status badge: for finished books, rendered as non-interactive `<span>` not clickable `<button>` — mid-reading status changes don't apply post-book.
- Veil count note ("N threads waiting ahead") hidden for finished books — no "ahead" when done.
- "raise a question →" → "add a reflection →" for finished books.
- Form placeholder: "What question is this story carrying?" → "A question this story left open…" for finished books.
- First-mystery ceremony framing suppressed for finished books.
- Submit button copy: "Record this →" for finished books (same as quiet depth).
- Empty state copy updated: five variants updated with finished-book alternatives ("No threads were opened during this reading.", "None of the threads found an answer.", "Every thread found its answer.").

`src/tabs/DiscussionTab.jsx`:
- Forward-facing `discussionLine` suppressed for finished books — "accumulating together" and "carrying into the next chapter" are wrong register post-reading.
- Finished-book header replaces it when questions exist: "Questions the reading opened. Some take longer to settle than the story did."
- Empty state copy: finished books get "The reading is complete. The companion can draw out questions worth sitting with." (vs the active-reading "as it deepens" language).
- Input placeholder: "A question the reading left with you…" for finished books (was "A question you're carrying into the next chapter…").
- Veil count note ("waiting ahead") hidden for finished books.

**Build:** clean ✓ | 135 modules

---

### Session 152 — 2026-05-30 — Finished-book experience + About page

**What shipped:**

`src/components/dashboard/BookDashboard.jsx`:
- `useState` initial tab: lazy initializer `() => book?.status === 'finished' ? 'progress' : 'notes'` — finished books land on Chronicle, not Notes.
- Added `useEffect` watching `book?.status` — switches to Chronicle whenever a book is marked finished mid-session (idempotent if already there).

`src/tabs/ProgressTab.jsx`:
- Progress % block (52px serif number + WeightedProgressBar + near-end echo) gated on `book.status !== 'finished'` — completed books don't need a progress readout.
- `CompanionOrientation` gated on `book.status !== 'finished'` in addition to the existing `depth !== 'quiet'` guard — "you are here" orientation is wrong after the last page.
- Added "Completed" stat to reading arc: `book.status === 'finished' && book.completedAt` → shows `fmtDate(book.completedAt)` between "First opened" and "Sessions".
- "Over" label → "Span" (label + value was "Over / 12 days" — grammatically incomplete; "Span / 12 days" works as a label).

`src/components/dashboard/CompletionBand.jsx`:
- "Over" label → "Span" (same fix, parallel surface).

`src/pages/AboutPage.jsx`:
- Privacy badge: "🔒 Stays on your device" → "🔒 Local first".
- Privacy H2: "No account. No server. No one reading your notes but you." → "Private by default. Yours entirely." (cloud sync is now live — previous copy was factually wrong).
- Privacy body: rewritten to accurately describe local-first + optional cloud sync. Removes "There is no cloud. There is no account."
- Exhibit label: "Open questions · 2" → "Threads · 2" (matches S148 tab rename).

**Build:** clean ✓ | 135 modules

---

### Session 151 — 2026-05-30 — Focus rings + micro-chrome (Session D)

**What shipped:**
`src/index.css`:
- `input:focus, textarea:focus, select:focus` — replaced near-invisible dark shadow (`rgba(61,56,47,0.07)`) with amber glow (`color-mix 16%`) and amber border (`color-mix 42%`). Now consistent with button focus treatment.
- Added `input, textarea, select { caret-color: var(--color-accent) }` globally — amber cursor everywhere, not just the companion band input.
- Added `::selection { background: color-mix(in srgb, var(--color-accent) 20%, transparent) }` — warm amber text selection.
- Added `.tab-btn:focus-visible` — amber underline matching the active-tab visual language.
- Added `.filter-link:focus-visible` + dark mode variant.
- Added `a:focus-visible` — amber 2px outline with border-radius, matching button treatment.

`src/components/layout/TopNav.jsx`:
- Removed `outline-none` from the logo button — now covered by the global `button:focus-visible` rule.

**Build:** clean ✓ | 134 modules

---

### Session 150 — 2026-05-30 — Completion view (Session C)

**What shipped:**
- `src/components/dashboard/CompletionBand.jsx` (new) — shown in place of CompanionBand when `book.status === 'finished'`. Rule-based completion reflection (no AI dependency), reading arc stats (sessions, notes, span in days), open-threads count if any remain. Archival visual treatment — no input, no carousel. The companion in its resolved state.
- `src/components/dashboard/BookDashboard.jsx` — imported `CompletionBand`; swapped CompanionBand for CompletionBand when `book.status === 'finished'`.

**Reflection logic (rule-based):** 8 branches keyed on note count, theory/confusing note ratio, open threads, session count, and day span. Falls back to "The last page. What the whole thing was is just beginning to settle."

**Build:** clean ✓ | 134 modules

---

### Session 149 — 2026-05-30 — Plot tab summaries

**What shipped:**
- `src/utils/aiRequest.js` — added `AI_OP.SUMMARIES = 'summaries'`.
- `src/utils/aiExtractor.js` — added `generateChapterSummaries(book, apiKey)`. Post-import, knowledge-based: generates 1–2 sentence summaries for completed chapters missing `ch.summary`. Caps at 40 chapters. Instructs Claude to write honest placeholders for books it doesn't know well rather than fabricating events. Uses `dedupRequest` to prevent duplicate calls.
- `src/tabs/PlotTab.jsx` — added generate button: "fill in N summary/summaries →" shown when `aiEnabled` and `missingSummaries > 0`. Handler merges returned summaries into `book.chapters` objects. Error display matching DiscussionTab pattern.

**Build:** clean ✓ | 134 modules

---

### Session 148 — 2026-05-30 — Tab architecture (Threads, Chronicle)

**What shipped:**
Resolved two structural naming and purpose problems in the book tab bar.

- `src/components/dashboard/BookDashboard.jsx` — TABS array: `Questions` → `Threads`, `Timeline` → `Chronicle`
- `src/tabs/ProgressTab.jsx` — full rewrite. Removed: chapter list, chapter completion toggle, all chapter-related state (`celebrating`, `editingChNum`, `editingTitle`), all chapter-related useMemo (`notesByChapter`, `destabMap`, `emotionalPeakChapters`, `resonanceWeights`, `motifs`, `gravityMap`, `singularities`, `chapterPatinaMap`), and all associated imports (9 utility imports removed). Kept: progress %, WeightedProgressBar, CompanionOrientation, extraction warning, sessions log. Added: reading arc summary — "First opened" date (`book.firstOpenedAt`), session count, "Over X days" span (shown only if > 1 day).

**Rationale:**
- "Questions" tab contained mystery-thread tracking (Suspected/Evolving/Dormant statuses) — semantically "Threads" not "Questions"
- "Timeline" (ProgressTab) contained a chapter list duplicating PlotTab's visual structure; chapter completion toggle was a fossil predating CompanionBand/ChapterUpdateModal as primary progress interface
- Chronicle is now unambiguously about the reading journey (how this book was read) rather than story content (what happened)

**Build:** clean ✓ | 134 modules

---

### Session 147 — 2026-05-30 — LibraryCompanion atmosphere pass (Session B)

**What shipped:**
Visual and language pass on the cross-book companion observation surface at the library entrance.

- `src/components/library/LibraryCompanion.jsx` — removed outer `opacity: 0.75` wrapper. Text `12px ink-500` → `13px ink-600`. Glyph `◦` `7px ink-300` → `9px ink-400` (was nearly invisible; now warm and present). `marginBottom` 28 → 40. Explicit `lineHeight: 1.65`.
- `src/utils/crossBookMemory.js` — impressionist observation: removed redundant second sentence, sharpened to "You mark what arrives — brief, immediate, before it settles into interpretation." Analyst: "Your notes reach toward interpretation. You build on what you notice rather than letting it rest." New `detectMultipleReadings()` — fires when 4+ annotated reading-now books exist: "You hold several stories open at once — each one waiting for when you return to it." Inserted at priority 2 (after behavioral, before annotation style).

**Build:** clean ✓ | 134 modules

---

### Session 146 — 2026-05-30 — Automatic cover lookup

**What shipped:**
Gradient placeholder covers now self-resolve for the vast majority of books.

- `src/utils/coverLookup.js` (new) — `fetchCoverUrl(title, author, isbn?)`. Queries Google Books API: ISBN first (most precise), then title+author fallback. Returns a clean `https://` cover URL or null. No API key required. 9s timeout. Never throws.
- `src/components/shared/BookCover.jsx` — `book.coverUrl` added as second priority: `coverData → coverUrl → isbn-sources → gradient`. `buildSources(book)` constructs the ordered array; existing `sourceIdx/tryNext` chain cycles through naturally. `useEffect` resets chain when `coverUrl` or `isbn` changes (handles background-resolved covers on already-mounted cards).
- `src/components/library/CreateCompanion.jsx` — fires `fetchCoverUrl` async after `onCreate`. Resolves after navigation; `updateBook(id, { coverUrl })` applied when ready.
- `src/components/library/EpubImportReview.jsx` — same, gated on `!book.coverData` (skip if EPUB already provided a cover). Both success + catch paths covered.
- `src/components/library/Library.jsx` — background refresh on mount and `books.length` change. Module-level `_coverLookupAttempted` Set prevents duplicate requests within a session. Max 5 books per session, staggered 500ms. On failure, nothing is written so next session retries.

**`book.coverUrl`** — new optional field on book objects. String URL or absent. Never base64 (keeps localStorage footprint minimal). `BookCover` falls through to ISBN sources and then gradient if the URL fails to load.

**Build:** clean ✓

---

### Session 145 — 2026-05-30 — Typographic Gravity Pass

**What shipped:**
Full typography audit across both modes. Two structural contrast failures addressed, plus type size hierarchy improved at primary reading surfaces.

**Color contrast — light mode** (`index.css`):
- `ink-300`: `#c8c4be` → `#9e9a94` (dates, chapter labels, micro-action buttons — was 1.54:1 on card, effectively invisible)
- `ink-400`: `#b3afa9` → `#8a8680` (ghost action text — was 1.86:1)
- `ink-500` / `text-dim`: `#999590` → `#767270` (tab inactive, companion presence lines, filter links — was 2.44:1 on page bg)

**Color contrast — dark mode** (`index.css`):
- `ink-300`: `#3a3430` → `#5c5650` ("reply", "settle", "edit", "reflect" micro-buttons — was 1.46:1, invisible)
- `ink-400`: `#504840` → `#706860` (thread user messages, ghost text — was 2.03:1)
- `ink-500` / `text-dim`: `#6e6555` → `#8a8272` (dim labels — was 3.26:1)

**Type size** (`NotesTab.jsx`, `MysteriesTab.jsx`):
- Primary note body text: 13px → 14px
- Companion thread responses (live + collapsed summary): 13px → 14px
- Companion mystery response: 13px → 14px
- Creates clear break above 12px (secondary) / 10px (micro-label) support tier

**Build:** clean ✓

---

### Session 144 — 2026-05-30 — CompanionBand quiet-depth correctness

**What shipped:**
Two precise fixes completing depth-system coverage in the primary companion surface.

- `CompanionBand.jsx` — Ambient silence block: removed `"Quiet — the companion is silent for this reading."` (violated the architectural invariant "silence doesn't annotate itself"). Added `depth !== 'quiet'` guard — the slot is now simply empty in quiet mode.
- `CompanionBand.jsx` — `buildChapterGreeting()`: added `depth` parameter. Quiet depth returns `"Chapter N of M."` only — strips all interpretive tails ("Patterns are beginning to form.", "The story is deciding what it was.", etc.). Companion observations of the story's shape are suppressed in quiet mode.

The carousel suppression, chat input gate, and first-arrival depth-aware copy were already correct. The depth system is now complete end-to-end.

**Build:** clean ✓ | 133 modules

---

### Session 143 — 2026-05-30 — The Settled Surface

**What shipped:**
Three passes dissolving the last product-UI energy from interaction states.

- `Library.jsx` — Sort `<select>` replaced with a cycling italic text-link button. Cycles `recent → a–z → furthest` on click. No native browser dropdown chrome.
- `CompanionHeader.jsx` — Pending action confirm dialogs, editMeta save/cancel, delete cancel: `rounded-lg border border-ink-200` Cancel + filled btn-accent Save → ghost italic link pair (`italic text-ink-400` cancel + `italic amber fontWeight:500` confirm with `→`). Destructive "Remove" button keeps ember fill.
- `CharactersTab.jsx` — Same treatment across AddCharForm, CharCard edit/delete-confirm, relationship add/edit. Five pairs updated. Destructive remove-character ember button unchanged.
- `MysteriesTab.jsx` — Add form cancel/"Open thread →"/"Record this →" updated.
- `DiscussionTab.jsx` — Question delete cancel ("keep it") updated.

**Build:** clean ✓ | 133 modules

---

### Session 142 — 2026-05-30 — Empty state atmosphere pass

**What shipped:**
Six targeted copy edits across all six tabs — removing product-UI vocabulary (no more "Mark chapters complete in the Progress tab", "Use this space", "Begin noting the people"), replacing instructional phrasing with atmospheric invitations.

- `PlotTab.jsx` — body: "What you've read will rest here — the shape of the reading as it accumulates."
- `CharactersTab.jsx` — body: "Name the figures as they arrive. They'll gather here — described, connected, their weight accumulating."
- `NotesTab.jsx` — zero-notes resonant: 'Write what the story gives you.' (was a dry list)
- `ProgressTab.jsx` — isNew resonant: "The companion is open alongside this reading. Everything you write and notice settles here as it unfolds."
- `DiscussionTab.jsx` — quiet empty: "Questions the story opens and doesn't close. Write what you're still carrying."
- `MysteriesTab.jsx` — resolved-filter title: "Nothing has found its answer yet."; all-resolved body: "Every open thread in this reading has been resolved."; EmptyState CTA restyled to match italic ghost pattern; copy: "raise the first question →"

**Build:** clean ✓ | 133 modules

---

### Session 141 — 2026-05-30 — ChapterUpdateModal depth + CharactersTab atmosphere

**What shipped:**
- `ChapterUpdateModal.jsx` — reflection picking gated on `aiEnabled(book, settings)`: quiet depth sets `reflection = null` (no pool consumption). Companion `observationText` in done-state Card 1 suppressed on quiet — the chapter count is sufficient, interpretation stays silent. `bookDepth` imported; `depth` computed after `mode`.
- `CharactersTab.jsx` — `bookDepth` imported. `depth` computed at component top. `depth` threaded into `CharCard` via `sharedCardProps`. `CharCard` signature updated (`depth` prop added). Two companion surfaces gated: (1) `charRelationalLine` / `wasUpdated` observation IIFE — character shift and instability lines suppressed in quiet; (2) `showMysteryBleed` — "The open questions are still circling some of these figures." suppressed in quiet.

Depth system is now complete. Every surface that surfaces a companion observation is correctly gated against quiet depth.

**Build:** clean ✓ | 133 modules

---

### Session 140 — 2026-05-30 — Completion ceremony + ProgressTab depth

**What shipped:**
- `CompanionHeader.jsx` — confirm dialog body: "Mark this companion as finished?" → "The reading ends here. Everything you've written and noticed stays with this companion." OK → "It's done". Post-completion afterimage: `animate-fade-in` on wrapper; new `veryFresh` tier (0–2 days) renders the afterimage at 13px ink-500 with ✦ glyph prefix. The immediate-aftermath window now has the presence the moment warrants.
- `ProgressTab.jsx` — `CompanionOrientation` gated on `depth !== 'quiet'`. Near-end trace gated. Forward-pull chapter residue block (all inline lines: "Still shaping what comes after.", "Your writing intensified here.", etc.) gated — in quiet mode chapters stand alone. `isNew` welcome message depth-aware.

**Build:** clean ✓ | 133 modules

---

### Session 139 — 2026-05-30 — Notes + Themes depth-sensitivity

**What shipped:**
- `NotesTab.jsx` — `notesPresence` observation line gated on `depth !== 'quiet'`; zero-notes empty state depth-aware ("A record of the reading, without interpretation." for quiet); `noteEchoes` display gated on quiet. `bookDepth` imported; `depth` computed at component top.
- `DiscussionTab.jsx` — AI generate button now gated on `aiEnabled(book, settings)` (was always showing, including in quiet). Empty state was guarded by `!hasAiKey` which is always `false` — it never rendered; fixed with proper condition + depth-aware copy. Companion line gated on `depth !== 'quiet'` and 3+ notes (previously fired with 0 notes). Cross-surface residue gated on quiet. Input placeholder depth-sensitive.

**Build:** clean ✓ | 133 modules

---

### Session 138 — 2026-05-30 — Settings depth cards + Questions atmosphere

**What shipped:**
- `SettingsPage.jsx` — Default Companion Depth setting replaced: `<select>` with "Quiet — mostly silent record" etc. → compact vertical card stack matching the creation wizard exactly. Full-width layout (outside SettingsRow), warm amber selected state, serif label + tagline always visible, detail line expands on selected card only. Visual language is now identical between wizard and settings.
- `MysteriesTab.jsx` — depth-aware empty state copy (quiet: "Questions accumulate here, without interpretation"; saturated: "Open the first thread — write what the story is withholding"). First-mystery ceremony: framing line "The first question opens the reading to something larger…" in the add-form before the first question exists. Quiet depth fully suppresses companion thinking/reply states (correct per depth contract). First mystery earns distinct response "The reading is open now. This question will move with you." Submit button reads "Record this" on quiet, "Open thread" otherwise.

**Build:** clean ✓ | 133 modules

---

### Session 137 — 2026-05-29 — First-book arrival atmosphere

**What shipped:**
- `CompanionBand.jsx` — `isFirstArrival` state: `status === 'reading'` + no reading log + no notes. When true, replaces the generic arc observation with a depth-calibrated personalized opener. Quiet: "The companion witnesses without speaking. Notes and chapters accumulate here." Resonant: "The companion is open alongside *[Title]*. Write what you notice — the rest will follow." Saturated: "The companion is fully awake to *[Title]*. Write what you notice." Title in `<em>` — de-italicizes within already-italic prose (typography convention). Clears after first note or chapter update.

**Build:** clean ✓ | 133 modules

---

### Session 136 — 2026-05-29 — Depth Level UX Exposure

**What shipped:**
- `CreateCompanion.jsx`, `EpubImportReview.jsx` — Depth Level picker redesigned from a 3-column chip grid with generic hints into a vertical full-width card stack headed by "How should your companion be present?" (17px serif). Each card: name in serif + "· recommended" on Resonant, italic tagline, detail line. Quiet: "The companion witnesses without speaking." / "A silent record." Resonant: "Present without performing." / "Responds when something earns it." Saturated: "Fully awake to this reading." / "Dense observations, frequent reflections."
- CreateCompanion Step 3 summary now includes depth level.

**Build:** clean ✓ | 133 modules

---

### Session 135 — 2026-05-29 — Library editorial card redesign

**What shipped:**
- `BookCard.jsx` — atmosphere pass to match the library's sophisticated environmental system. Covers 56→68px / 64→84px (hero). Title weight 500→400. Author 12→13px. Status dot (`STATUS_DOTS`, `dotColor`) removed — ember left stripe handles reading state. Chapter format "Ch. N/M" → "ch. N of M". Want books skip chapter line. **Finished books**: no chapter count, no progress bar — just the completion date in 12px serif italic (colophon treatment).

**Build:** clean ✓ | 133 modules

---

### Session 134 — 2026-05-29 — Return experience polish

**What shipped:**
- `CompanionHeader.jsx` — reading gap archaeology atmosphere pass. The two archaeology blocks (active book, paused book) were implemented but visually inert (11px ink-300 text). Now: thresholds lowered (active 7→3 days, paused 14→7 days; mystery 14→7 days), quote font 11→13px at `ink-500`, mystery 11→12px at `ink-400`, ✦ glyph gold at 0.75 opacity (was effectively 0.25). Warm amber container: `rgba(184,134,11,0.04)` background + `2px rgba(184,134,11,0.22)` left border. Literary gap labels ("A week away from this story.", "Set aside two weeks ago.") added via `formatGapLabel(days, paused)` helper. 3–6 day gaps show only the atmospheric pull-quote, no label — feels like discovery rather than notification.

**Build:** clean ✓ | 133 modules

---

### Session 133 — 2026-05-29 — Tombstone deletion

**What shipped:**
- `utils/live.js` (new) — zero-dependency `liveItems(arr)` utility; single source of truth for tombstone filtering across the codebase
- `NotesTab.jsx`, `MysteriesTab.jsx` — `deleteNote` / `deleteMystery` stamp `{ deleted: true, updatedAt }` instead of filtering. Deleted items remain in stored arrays so `unionById` in `syncEngine.js` propagates tombstones correctly on sync (later `updatedAt` wins).
- 20+ consumer files updated — all display/computation sites now call `liveItems()` at point of use: `companionPresence.js`, `companionThread.js`, `reflectionEngine.js`, `invisiblePresence.js`, `emotionalGravity.js`, `hauntScore.js`, `signalHierarchy.js`, `crossBookMemory.js`, `literaryPatina.js`, `aiExtractor.js`, `CompanionHeader.jsx`, `CompanionBand.jsx`, `Library.jsx`, `DiscussionTab.jsx`, `CharactersTab.jsx`, `ChapterUpdateModal.jsx`, `ProgressTab.jsx`, `PlotTab.jsx`.
- `syncEngine.js` re-exports `liveItems` from `live.js` for backward compatibility.
- `useMemo` dep arrays updated from `book.notes?.length` → `book.notes` (reference) wherever tombstone deletion (map, not filter) must trigger recomputation.

**Build:** clean ✓ | 133 modules

---

### Session 132 — 2026-05-29 — Auth chip + sign-out clarity + delete cloud + Depth Level wiring + field-level merge

**What shipped:**
- `TopNav.jsx` — Auth chip: amber-tinted circle with email initial when signed in, italic "✦ Sign in" link when out. Hidden when Supabase env vars absent.
- `SignInPanel.jsx` — Sign-out reads "Sign out (your library stays on this device)". Two-step inline confirmation before firing.
- `syncEngine.js`, `SignInPanel.jsx`, `SettingsPage.jsx` — `deleteCloudData(userId)` wipes both Supabase rows. Auth identity survives. Pending pushes cancelled before delete. Confirmation flow with explicit "what's wiped vs kept" copy.
- `utils/depthLevel.js` (new) + 5 call sites — `bookDepth()`, `aiEnabled()`, `ambientEnabled()`, `observationDensity()`, `depthLabel()`. Quiet: no AI calls, no ambient carousel, no chat input. Saturated: carousel rotates ~30% faster. Per-book editing in CompanionHeader's edit-metadata form.
- `utils/syncEngine.js`, `NotesTab.jsx`, `MysteriesTab.jsx` — Field-level merge replaces whole-book last-write-wins for id-keyed arrays. `mergeBook(local, cloud)`: scalar fields use `lastUpdated`; arrays (notes, mysteries, readingLog, discussionQuestions, userDiscussionQuestions) unioned by id, per-item later-`updatedAt` wins. Writers stamp `updatedAt` via `touch()` (NotesTab) and `touchMyst()` (MysteriesTab).

**Build:** clean ✓ | 132 modules | dev server port 5220 | Commits `a2383f6`, `a1cac77`, `7fd64ae`

---

### Session 131 — 2026-05-29 — Depth Level + dark-mode input sweep + Supabase cloud sync

**What shipped:**
- Companion Depth selector (Quiet/Resonant/Saturated) in EPUB import, CreateCompanion wizard, and Settings. Persisted as `book.depthLevel`. Default: `'resonant'`.
- Dark-mode input sweep: all `bg-white` form surfaces → `bg-cream-200` across CharactersTab, MysteriesTab, NotesTab, EpubImportReview.
- Full Supabase cloud sync: `src/lib/supabase.js` (client wrapper, null when env absent), `src/context/AuthContext.jsx` (magic-link, `sendMagicLink`, `signOut`), `src/components/auth/SignInPanel.jsx`, `src/utils/syncEngine.js` (per-channel debounced push 1.5s, `pullAndMerge`). AuthProvider wraps SettingsProvider → BooksProvider.
- Supabase project live, RLS enforced, env vars set in `.env.local` and Vercel production. Magic-link sign-in verified end-to-end.
- Key format note: publishable key (`sb_publishable_...`) — NOT the legacy `eyJ...` anon key.

**Build:** clean ✓ | 131 modules | Commits `6ecdbae`, `c8c6866`

---

### Session 130 — 2026-05-29 — Threaded notes, persistence, snapshot reminder, list relationships, first-book invitation

**What shipped:**
- `NotesTab.jsx`, `utils/companionThread.js` — Note threads persist to `note.thread[]`. User can reply inline. `generateNoteThreadReply()` for multi-turn. `generateThreadSummary()` for settle to residue. Compaction after ≥2 exchanges (4 messages). `bookNotesRef` keeps async AI callbacks in sync with latest state.
- `CompanionBand.jsx`, `BookDashboard.jsx` — Conversation persisted to `book.companionChat[]` (rolling 20). `<CompanionBand key={book.id}>` remounts cleanly on book switch.
- `Library.jsx`, `storage.js` — Snapshot reminder banner: totalNotes ≥ 8 never exported, OR ≥10 new notes since last export. `downloadLibrarySnapshot()` extracted to shared util.
- `ChapterUpdateModal.jsx`, `companionThread.js` — Session note gets real AI response via `generateSessionReflection()`. Keyword fallback shown instantly, upgraded when AI ready.
- `RelationshipMap.jsx` — Replaced SVG graph with typographic list (`A ↔ B — label · type`). Re-enabled in CharactersTab.
- `FirstBookInvitation.jsx` (new) — Calm modal for users without their own book yet.
- Dead files deleted: `CompanionPanel.jsx`, `CompanionInsights.jsx`, `PresenceStrip.jsx`, `DirectionsDemoPage.jsx`.
- Copy: "New Companion" → "Add a book" in TopNav and WelcomeBanner.

**Build:** clean ✓ | 86 modules | Commits `e96c9d7`, `e67074a`, `8d8537f`

---

### Sessions 125–129 — V2 Completion + Public Alpha (2026-05-28)

Major items across this block:

- Real companion AI wired to CompanionBand — `generateCompanionChatResponse()` replaced `simulateResponse()` keyword matching entirely
- Timeline tab added — ProgressTab was fully built but never wired into BookDashboard's TABS array
- Shared API proxy (`api/companion.js`) — all AI calls route through Vercel when no user key present; all early `throw new Error('No API key')` guards removed
- Mobile full optimization pass — 375px verified across library, book page, notes, settings, about
- About page landing (`/about` route, `AboutPage.jsx`) with Project Hail Mary exhibit; scroll reveals via IntersectionObserver
- Item glow system — `onTabChange(tabId, itemId)` passes item ID, CharactersTab + MysteriesTab receive `flashItemId`, 4.2s warm amber `itemGlow` animation
- CTA hover redesign — border ring (`box-shadow: 0 0 0 2px`) instead of fill change; lantern gradient on all `.btn-accent`
- Color palette desaturation (~4% saturation reduction on cream + ink scales)
- Typography: body font 15→16px, line-height 1.6→1.65, tab bar 40→44px
- Shadow Mode removed from Settings (was non-functional: `useState(false)` with no persistence or effect)
- EPUB loading overlay redesign — 3500ms phrase interval, atmospheric glow, pulsing ✦ spark
- Note tag categories removed from entry form; CTA unified to "Keep →"
- QA pass: grid containment (1000px), companion card hierarchy flip (input first), NLP removed from ChapterUpdateModal, card animation pacing

**Build at S129b:** clean ✓ | No localStorage key changes

---

### Sessions 121–124 — V2 Design System + Companion-First Redesign (2026-05-27)

**Session 121 (planning only — no code):** Vellum design system finalized via Claude Design playground (8 directions tested). Companion-first architecture decided. CompanionBand spec written.

**Sessions 122–124 (implementation):** Full Vellum token remap (Libre Baskerville, warm ember palette `#c25538`/`#d36045`, atmospheric glow tokens). CompanionBand component built (full-width, above tabs, ambient + conversation + input). BookDashboard restructured — retired two-column sidebar, single column, companion-first. 6→5 tabs: Mysteries→Questions, Discussion→Themes, Progress content moved to CompanionBand. Manuscript annotation conversation style (`.band-user-entry` / `.band-companion-entry`). AmbientLayer (two slow-drifting gradient blobs). AtmosphericGlow (mouse-following radial gradient, 0.012 lerp factor).

---

## DEPLOYING TO PRODUCTION

**Required hosting env vars (set on platform — do not commit):**
- `VITE_PLAUSIBLE_DOMAIN` — activates Plausible analytics. No-ops without it.
- `VITE_FEEDBACK_URL` — feedback link in Settings. Hidden without it.
- `ANTHROPIC_API_KEY` — required in Vercel for `/api/companion` proxy. Returns 503 without it.
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — cloud sync. App runs identically on localStorage when absent.

**Netlify / SPA routing:** `public/_redirects` already contains `/* /index.html 200`
**Build:** `node node_modules/vite/bin/vite.js build` → deploy `dist/`

---

## 1 — CURRENT ARCHITECTURE

### Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| UI | React 19 | hooks: useState, useEffect, useRef, useCallback, useMemo |
| Build | Vite 8 | `node node_modules/vite/bin/vite.js build` — `.bin/vite` is NOT a real symlink |
| Styles | Tailwind CSS v4 | `@import "tailwindcss"` — NOT v3 syntax |
| Routing | React Router v7 | BrowserRouter + Routes |
| Persistence | localStorage | Keys FROZEN — never rename |
| Cloud sync | Supabase (optional) | Magic-link auth, RLS, graceful null client when env absent |
| AI (ambient) | Existing reflection engine | Rule-based, cached in book data, no API call |
| AI (live) | Anthropic via Vercel serverless | `api/companion.js` — live on readwithlantern.com |

**Routes:** `/library`, `/new`, `/book/:bookId`, `/settings`, `/about`

### Component Tree (Session 160 — actual current state)

```
BrowserRouter
└── AuthProvider  (Supabase session; magic-link)
    └── SettingsProvider  (shadowscribe_settings)
        └── BooksProvider  (shadowscribe_books)
            └── AppShell  (dark mode sync, view transition key)
                ├── AmbientLayer  (two slow-drifting radial gradient blobs, 55s/48s)
                ├── AtmosphericGlow  (mouse-following radial gradient, rAF lerp 0.012)
                ├── StorageBanner  (quota exceeded / data corrupted alerts)
                ├── TopNav  (fixed z-50; auth chip, dark mode toggle, hamburger)
                ├── Routes  [pb-16 sm:pb-0 — clearance for mobile bottom nav]
                │   ├── /library       → LibraryPage → Library
                │   │                       ├── LibraryCompanion (cross-book ambient obs)
                │   │                       └── FirstBookInvitation (new user modal)
                │   ├── /new           → NewCompanionPage → CreateCompanion → EpubImportReview
                │   │                       CreateCompanion step 1: search-first (Google Books),
                │   │                       manual entry secondary, EPUB import tertiary
                │   ├── /book/:bookId  → BookPage [BookErrorBoundary]
                │   │                     → BookDashboard
                │   │                         ├── CompanionHeader
                │   │                         ├── CompanionBand  [full-width, above tabs]
                │   │                         │     ├── Chapter context + progress bar
                │   │                         │     ├── Ambient reflection carousel
                │   │                         │     ├── Context cards (questions, character pills)
                │   │                         │     └── Conversation (persisted to book.companionChat[])
                │   │                         ├── [TAB BAR — 6 tabs]
                │   │                         │     Notes · Characters · Plot · Threads · Themes · Chronicle
                │   │                         └── ChapterUpdateModal
                │   ├── /settings      → SettingsPage [SignInPanel at top — cloud sync]
                │   └── /about         → AboutPage
                └── BottomNav  ("the dock" — sm:hidden; Library / ✦ book-in-progress / Settings;
                                 centre falls back to "add a book" → /new; hidden on /book/* and /new)
```

**Layout:** Single column. CompanionHeader → CompanionBand → TabBar → TabContent. All sections max-width 1000px.

**Deleted components (Session 130):** `CompanionPanel.jsx`, `CompanionInsights.jsx`, `PresenceStrip.jsx`, `DirectionsDemoPage.jsx`

### File / Folder Structure

```
shadow-scribe/
├── docs/                          ← project memory
├── api/
│   └── companion.js               ← Vercel serverless Anthropic proxy
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx                    ← AuthProvider + BooksProvider + AppShell
│   ├── index.css                  ← @theme tokens, keyframes, dark mode (html.dark ONLY)
│   ├── context/
│   │   ├── AuthContext.jsx        ← Supabase magic-link auth state
│   │   ├── BooksContext.jsx       ← books[], updateBook, createBook, deleteBook
│   │   └── SettingsContext.jsx    ← settings{...}; useSettings()
│   ├── lib/
│   │   └── supabase.js            ← Supabase client wrapper (null when env absent)
│   ├── hooks/useBooks.js
│   ├── utils/
│   │   ├── storage.js             ← loadBooks, saveBooks, sanitizeBook, checkStorageHealth
│   │   ├── syncEngine.js          ← debounced push, pullAndMerge, mergeBook, deleteCloudData
│   │   ├── depthLevel.js          ← bookDepth(), aiEnabled(), ambientEnabled(), etc.
│   │   ├── date.js
│   │   ├── progress.js
│   │   ├── spoiler.js
│   │   ├── chapterHelpers.js
│   │   ├── epubParser.js
│   │   ├── narrativeExtractor.js
│   │   ├── companionPresence.js   ← generatePresence() — 13-lens immediate observation engine
│   │   ├── reflectionEngine.js    ← assembleReflectionContext, generateRuleBasedReflections, cache
│   │   ├── companionThread.js     ← all AI thread generation (note thread, chat, session reflection)
│   │   ├── aiExtractor.js         ← callClaude(), aiExtractNarrative(), generateDiscussionQuestions()
│   │   ├── aiRequest.js           ← buildAiCall() — routes to proxy or direct
│   │   ├── analytics.js           ← Plausible wrapper
│   │   ├── logger.js
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
│   │   │   ├── CompanionBand.jsx   ← primary companion surface
│   │   │   ├── ReadingMomentum.jsx
│   │   │   └── RelationshipMap.jsx
│   │   ├── modals/ChapterUpdateModal.jsx
│   │   └── shared/
│   ├── pages/ (LibraryPage, BookPage, NewCompanionPage, SettingsPage, AboutPage, DebugPage)
│   └── tabs/ (ProgressTab, CharactersTab, PlotTab, NotesTab, MysteriesTab, DiscussionTab)
```

### State Management

```js
const { books, updateBook, createBook, deleteBook, resetToDemo } = useBooks()
const { settings, updateSetting } = useSettings()
const { user, sendMagicLink, signOut } = useAuth()
// settings shape: { spoilerMode, insightStyle, defaultFormat, anthropicKey, darkMode, devMode,
//                   deviceId, lastExportedAt, lastExportedNoteCount,
//                   snapshotReminderDismissedAt, firstBookInvitationDismissedAt }
```

`updateBook(id, changes)` shallow-merges. Nested arrays must always be replaced in full.

**Dark mode:** `html.dark` CSS class ONLY. Never `dark:` Tailwind prefix — it doesn't work with this setup.

### Data Models — additions since Session 121 (all additive/backwards-compatible)

```ts
// On book:
book.depthLevel: 'quiet' | 'resonant' | 'saturated'  // default: 'resonant'
book.companionChat: { role: 'user'|'companion', text: string }[]  // rolling 20
book.coverUrl: string | undefined  // Google Books cover URL; set by coverLookup.js; never base64

// On note (all optional, backwards-compatible):
note.thread: { role: 'user'|'companion', text: string, id: string }[]
note.threadSummary: string        // settled thread summary
note.threadCollapsed: boolean
note.updatedAt: string            // ISO; stamped by touch() on every change

// On mystery:
mystery.updatedAt: string         // ISO; stamped by touchMyst()

// On settings:
settings.deviceId: string         // stable, generated once on first run
settings.lastExportedAt: string
settings.lastExportedNoteCount: number
settings.snapshotReminderDismissedAt: string
settings.firstBookInvitationDismissedAt: string
```

Full data model reference (pre-V2 fields): see `ARCHITECTURE.md`.

---

## 2 — ACTIVE SYSTEMS REFERENCE

| System | File(s) | Notes |
|--------|---------|-------|
| Companion observation pipeline | `companionPresence.js`, `signalHierarchy.js`, `invisiblePresence.js` | 13 lenses → arbitration → cap max 3. `duration` weight = 0 intentionally. |
| Reflection engine | `reflectionEngine.js` | Rule-based + AI hybrid. Cached in `book.reflectionCache`. 3-day TTL. 8h min resurfacing. |
| Companion thread AI | `companionThread.js` | Note threads, chat responses, session reflections. All use `buildAiCall()`. |
| Cloud sync | `syncEngine.js`, `lib/supabase.js`, `context/AuthContext.jsx` | Debounced push 1.5s. Pull on sign-in. Field-level merge by id + updatedAt. |
| Depth Level | `utils/depthLevel.js` | Quiet/Resonant/Saturated per-book. Gates AI, ambient, chat. |
| Environmental presence | `Library.jsx` (`bookPresence()`) | `notes×0.045 + mysteries×0.09 + sessions×0.02`. Reads `book.readingLog` — NOT `book.readingSessions`. |
| Signal arbitration | `signalHierarchy.js` | SIGNAL_WEIGHTS, DOMAINS, SUPPRESSES. destabilization blocks 7 domains. |
| Haunt scoring | `hauntScore.js` | Some signals fade; others intensify. High-haunt mysteries surface preferentially. |
| Emotional gravity | `emotionalGravity.js` | Singularity detection (≥0.45 AND ≥1.7× avg). `classifySilence` (6 types). |
| Reader state | `readerState.js` | `detectConfidenceDrift`, `detectFixations`, `detectBurstCadence`, `detectSilenceGap`. |
| Literary patina | `literaryPatina.js` | Inset gold shadow on annotated chapters. Alpha: 0.14/0.22/0.30/0.38. |
| Atmospheric cooling | `index.css`, `Library.jsx` | 45–89d → opacity 0.70 saturate(0.72). 90+d → opacity 0.38. Hover restores. |
| Geological note strata | `NotesTab.jsx` | `isArchival = note.rereadEra < book.rereadCount`. `.note-archival` parchment. |
| Residue memory | `residueMemory.js` | `detectMotifs`, `detectAtmosphericSignature`, `extractQuoteFragment`. |
| Cross-book memory | `crossBookMemory.js` | Library-scale reader pattern + completion afterimage. Min 3 books / 4 notes. |
| Expressive silence | `emotionalGravity.js` (`classifySilence`) | 6 types: dormant/grieving/exhausted/post-climax/unresolved/peaceful. |

**Debug panel:** `localStorage.setItem('lantern_debug_companion','1')` → CompanionDebugPanel overlay
**Critical:** `book.reflectionCache` must NOT be in CompanionBand's `useEffect` dep array — causes save→trigger→save loop. This is intentional.

---

## 3 — ARCHITECTURAL INVARIANTS

*Constitutional law. Do not change without explicit product discussion.*

### Lantern must NEVER become:

**A productivity app.** No streaks as achievements. No session targets. No reading goals. No "books read this year." No optimization language. No "get back on track" prompts.

**A gamified system.** No points. No achievements. No badges. No completion rewards beyond the quiet `✦` archival glyph.

**A dashboard.** No analytics panels. No reading stats displays. No visible scoring. No heatmaps. No metric readouts.

**An AI assistant or chatbot.** The CompanionBand input receives the reader's annotations and thoughts — the companion reflects back in the register of a fellow reader's marginal note. It is NOT a query-response assistant. It observes, it notices, it waits, it speaks rarely with specific evidence. Response length: 1–2 sentences maximum. Voice: no "I", no affirmations, no direct answers.

**A social platform.** No sharing. No comparison. No public reading. No ratings.

**A noisy environment.** Silence is not a failure state. The companion being quiet is correct behavior. An empty observation means the companion found nothing worth saying.

**A feature accumulator.** Systems compound — they don't stack. Every addition must deepen an existing dimension, not introduce a new surface.

### Lantern must always be:

**Atmospheric first.** Spacing, opacity, color temperature, border absence, grain texture, ambient gradient — all contribute to the felt quality of being in a literary space.

**Silent by default.** Express through felt absence and subtle environmental change, not visible states, labels, or indicators.

**Asymmetric.** Not all books feel the same. Annotation density, temporal distance, and reading intensity produce genuinely different environmental textures without any UI element announcing the difference.

**Literary in register.** Every word, label, and action name belongs in a book or reading journal, not a SaaS product.

**Restrained in companion voice.** One observation is usually better than three. Evidence-heavy lines beat ambient ones. The companion has nothing to prove.

**Continuous, not episodic.** Tab switches and navigation feel like consulting a different layer of the same document, not moving between screens.

---

## 4 — KNOWN FRAGILE SYSTEMS

These systems are easy to accidentally flatten. Each has been calibrated carefully.

---

### Companion Scarcity
**What breaks it:** Lowering `shouldEnterAtmosphereMode()` interruption threshold back above 0.55. Restoring `duration` observation (weight: 0 by design). Raising observation cap unconditionally.
**Never:** Restore "You've been living with this story for X weeks" — removed for being performative.

---

### CompanionBand Chat Register
**What breaks it:** Making responses longer than 1–2 sentences. Making the companion answer questions helpfully and directly like a support agent. Adding "I", "I notice", "you should" language. Making the rolling conversation window persist beyond 20 messages.
**Never:** Frame the CompanionBand as "chat with AI." The reader is annotating to the companion. The companion reflects back from the margin — it is not a query-response system.

---

### Opacity Cooling (Shelf States)
**What breaks it:** Applying `shelf-silenced` to active books. Removing hover restoration. Adding a visible "paused X days" label alongside the opacity state.
**Never:** Label the environmental cooling. The opacity IS the communication.

---

### Atmospheric Silence (Companion)
**What breaks it:** Removing atmosphere mode. Adding a "the companion is quiet right now" UI state.
**Never:** Make the companion explain why it's quiet. Silence doesn't annotate itself.

---

### Geological Note Strata
**What breaks it:** Applying `.note-archival` to active-era notes. Adding a "Earlier reading" heading above archival notes.
**Never:** Put a divider or section label between reading eras. The geological shift is textural.

---

### Topographic Library Rhythm
**What breaks it:** Replacing `topo-gap-*` with `space-y-*`. Flattening section label opacity graduation.
**Never:** Set all library sections to the same spacing.

---

### Surface Softness
**What breaks it:** Re-adding `border border-ink-200` to note cards. Restoring sticky bar blur to 10px+. Setting `.atmospheric-card` border alpha above .030.
**Never:** `--color-card-base` is `#FDFAF5` (not white) — hardcoded `bg-white` creates visible contrast jumps.

---

### Signal Suppression (Arbitration)
**What breaks it:** Weakening the SUPPRESSES map. Reducing `destabilization` weight. Restoring `duration` category.
**Never:** Add a new companion lens without checking suppression rules or domain assignment.

---

### Typography Hierarchy
**What breaks it:** Making section labels bold or title-case. Making companion observations render in sans. Reverting ink-300/400/500 to their pre-S145 values (they were effectively invisible). Dropping primary note text back below 14px.
**Never:** `SectionHeading` is 12px normal-weight italic serif. Never "Chapters" — always "chapters."
**Type scale (S145 canonical):** micro-labels 10px · secondary/action 11–12px · primary card content 14px · companion reflections 15–16px · companion band input 19px. All sans weight 400 except `font-medium` on mystery text.
**Contrast baselines (light/dark):** `text-dim` (#767270 / #8a8272). `ink-400` (#8a8680 / #706860). `ink-300` (#9e9a94 / #5c5650). Do not lighten these in light mode or darken in dark mode.

---

### Temporal Session Aging
**What breaks it:** Collapsing four tiers to one. Operating on raw log objects without `logDates()` normalization (produces Invalid Date).
**Never:** Display the opacity state as a label.

---

## 5 — KNOWN LIMITATIONS / ACTIVE BUGS

**Google Books 429 — quota is shared, NOT per-IP (corrected S161):** The cover lookup system fires one API call per book on library mount (up to 5), and CreateCompanion search fires per keystroke burst. When exhausted, the API returns 429 with:

> Quota exceeded for quota metric 'Queries' and limit 'Queries **per day**' of service 'books.googleapis.com' for consumer 'project_number:624717413613'

That consumer is Google's **shared anonymous project**, not the user's IP — so this is reachable in production, contrary to the earlier note here. As of S161 the search **fails gracefully** (explicit "Book search is busy right now. Enter the details below instead." with manual entry directly below), so it degrades rather than dead-ends. The underlying quota still deserves a real fix: register an API key with its own quota, or proxy the lookup through `/api/` so it uses a project we control.

*(The PlotTab nested-`<button>` bug listed here previously was fixed in S161 — see the session entry.)*

**Series position in Library colophon:** The `LibraryColophon` counts all finished books globally but doesn't distinguish re-reads. If a user finishes the same book twice (different `rereadCount`), it counts as 2 "books closed". Acceptable for now.

---

## 6 — NEXT WORK QUEUE

**Priority order for next session:**

-1. **Reconcile the two session tracks (new, S162).** See the warning at the top of this document. The git history contains an entire auth / account / subscription / sign-up-nudge track that this doc never describes, under session numbers that collide with the ones used here. Pick a canonical numbering and write up the auth work before anything else — every future session is reading an incomplete map until this is done.

0a. **Decide whether the dock should persist on `/book/*` (new, S162).** It's currently hidden there, so tapping the dock's centre slot makes the dock vanish. The book page's tab bar is sticky-*top*, so there is no layout collision — this is purely a question of whether navigation should be constant. A decision, not a bug.

0. **Google Books quota (raised to top by S161)** — The 429 is production-reachable, not dev-only (see Known Limitations). Search now degrades gracefully, but the primary book-adding path silently loses its best affordance whenever the shared anonymous quota is exhausted. Register an API key with its own quota, or proxy through `/api/`.
1. **ISBN barcode scan** — Physical book readers can point their phone camera at the back of a book. `BarcodeDetector` Web API has broad support (Chrome/Edge/Android, Safari iOS 17+). Would overlay a camera view, scan the barcode, extract ISBN, then auto-populate via the same Google Books flow. Layered on top of the existing search — not a replacement.
2. **Onboarding atmospheric pass** — The WelcomeBanner is functionally correct but text-heavy. Could be more atmospheric, shorter, and should better reflect the new search-first book-adding flow. Consider a brief first-use tour or an illustrated first-empty-state.
3. **Goodreads CSV import** — Users can export their Goodreads reading history as CSV. Batch-create companions from the file. Map Goodreads shelves to Lantern statuses (`read` → `finished`, `currently-reading` → `reading`, `to-read` → `want`). Power-user path, not default.
4. **Rate limiting for companion proxy** — `/api/companion` has no per-IP limiting. Important before scale. Simple fix: Vercel KV or upstash rate limiter at 20 req/min per IP.

**Deliberately not building yet:**
- Any new AI call sites until existing 7+ paths are calibrated against real reader response
- Social/sharing features (violates architectural invariant)
- Push notifications (would require service worker — worth doing but not urgent)

---

## 7 — ARCHIVAL SESSIONS

### Sessions 85–128 (compressed)

**S85 — Lived-In Library:** `bookPresence()` bug fix (was reading non-existent `readingSessions` not `readingLog`). Annotation-density library atmosphere. Primary book asymmetry. Filter: "Paused" → "set aside."

**S86 — Spatial Memory:** `shelf-cooling` (45–89d, opacity 0.70) and `shelf-silenced` (90+d, opacity 0.38). Geological note strata (`note.rereadEra`, `.note-archival` parchment). Mystery environmental dormancy.

**S87 — Materiality Pass:** Borders dissolved. Note cards borderless (shadow-only). Grain deepened. Sticky bar blur 10px→6px. Author color temporal gradient. Session aging four tiers (0.28/0.42/0.65/1.0).

**S88 — Material Atmosphere:** Page-entry animation: `translateY(6px)` removed → pure opacity crossfade. Sticky bar border → shadow dissolve. Mathematical spacing uniformity broken.

**S89 — Editorial Composition:** Max 2-column grids for set-aside/finished/archive. Asymmetric reading-now grid (3fr/2fr when primary is deep). Geological break in NotesTab. Singularity trailing silence.

**S90 — Organic Composition:** `bookDrift()` deterministic hash. Deep primary card lifts −2px. Reading-now zone warms to 26% when primary is deep.

**S91 — Interior Atmosphere:** 8 graduated BookCard variations by presence+daysSince. Deep books earn interior space; dormant books compress.

**S92 — Shelf Ecology:** Neighborhood awareness. Deep neighbors stabilize adjacent drift (0.55 damp). Unannotated cards adjacent to deep books receive very slight warmth tint.

**S93 — Environmental Weather:** `readingNowMass` continuous scale (18–30% gold-bg). Set-aside dormancy collective filter (saturate 0.93 when >70% cooling).

**S94 — Visual Current:** Stepped label indentation (reading-now/set-aside flush → finished +4px → archive +10px). Row/col gap asymmetry. Set-aside suspension padding.

**S95 — Peripheral Atmosphere:** Reading-now zone bleed −28px. Fixed `body::before` warm ground gradient. Archive `maskImage` dissolution.

**S96 — Depth of Attention:** `coverOpacity` combines presence+temporal. `.shelf-dormant` and `.shelf-archive` brightness filters (third cooling axis).

**S97 — Dev Mode + Model Fix:** `claude-haiku-4-5` (old versioned ID was 404ing). Dev Mode: bypasses 8h cooldown, 3s carousel, full strip opacity.

**S98 — Companion Moment Refinement:** Threaded companion responses. `thinkingNoteId`. `calcNoteDelay()` (800–4500ms, complexity-weighted). Thinking state always shows (silence communicates restraint). Session-only, not persisted.

**S99 — Companion Presence Timing:** Emotional vocabulary delay bonuses (+350–450ms). Irregular glyph animation durations. Carousel recursive setTimeout with ±1500ms jitter.

**S100 — Companion Thread AI:** `generateNoteThreadResponse()`. claude-haiku-4-5. Staged arrival animation (✦ settles first, text surfaces after). Typography: 13px Inter ink-700 (WCAG AA).

**S101 — Stabilization Arc:** ProgressTab 3-tier chapter hierarchy. PlotTab 3-tier recency hierarchy. Editorial hierarchy pass to combat accumulated flatness.

**S102 — Companion Ritual Flow:** ChapterUpdateModal full rebuild (select dropdown + expressive textarea). NotesTab restructure (writing surface at top, newest→oldest). CTA → outlined editorial buttons. Done state staggered card reveal (300/1100/2000/2900ms).

**S103 — Cross-Book Memory:** `crossBookMemory.js`. `LibraryCompanion` ambient observation. `generateCompletionAfterimageLine()` in CompanionHeader.

**S104 — Companion Cognition:** Reading gap archaeology (last note pull-quote, 7d+ gap). Abandoned archaeology (paused 14d+, haunted mystery text).

**S105 — Reinterpretation Systems:** `EMOTIONAL_CLUSTERS` semantic resonance. Era-aware echo display. Theory recontextualization in AI prompt.

**S106 — Core Loop Stabilization:** `atEnd` completion pathway. `pendingAction` decoupled from `actions.length`. ChapterUpdateModal empty dropdown guard.

**S107 — Companion Memory MVP:** `detectDominantCluster()`. Emotional trajectory (confidenceArc, topFixation, motifs) injected into AI thread context. Echo cooldown via `echoGapRef`.

**S108 — Productionization:** WelcomeBanner wired with localStorage persistence. EPUB hardening (150MB limit, duplicate detection). Mobile scrollIntoView on note focus. PWA manifest.

**S109 — MVP Lock:** Empty state authorship. `og-image.png` generated.

**S110 — Public MVP Readiness:** Library + Notes memo performance. `uid.js` monotonic ID generator. Storage sanitization. EPUB 500-entry TOC cap. `_redirects` and `vercel.json`.

**S111 — Launch Candidate:** URL revoke timing. PWA PNG icons (192 + 512). Seam sweep (removed dead "Presence Frequency" Settings row). Export feedback loop.

**S112 — Closed Alpha:** `firstOpenedAt` timestamp. Removed false API key gate from CompanionHeader.

**S113 — Ship Mode Pass A:** Production metadata (apple-touch-icon, twitter:image). `BookErrorBoundary`. DiscussionTab dark mode fix.

**S114 — Ship Mode Pass B:** Plausible analytics (11 events). `logger.js`. Feedback link via env var.

**S115 — Ship Mode Pass C:** Copy accuracy (EPUB without AI key). Trust signal ("your key and all your reading data are stored locally").

**S116 — Ship Mode Pass D:** `saveBooks()` return value with quota detection. `StorageBanner`. `deviceId` stable device identity. `lastExportedAt`.

**S117–118 — Public Alpha Launch:** Companion language sweep (24 total fixes). Silence architecture audited. Production verified end-to-end. First-reader walkthrough passed.

**S119 — Language Sweep Pass 2:** 11 fixes across 3 files. CALIBRATION_LOG.md created.

**S120 — Alpha Week 1 UX Hardening:** 10 items: dark mode nav toggle, NLP improvements, mobile keyboard handling, modal focus, reflection suppression/deduplication/saturation detection, tablet two-column layout, keyboard status transitions, edit metadata improvements.

**S121 — Design System 4.0 Planning:** Vellum direction selected (8 options tested). Companion-first architecture specced. No code written.

**S122 — V2 Pass 1:** Full Vellum token remap. CompanionBand built. BookDashboard restructured (single column). 6→5 tabs.

**S123 — V2 Atmospheric Pass:** Manuscript annotation conversation style. AmbientLayer. AtmosphericGlow (0.04 lerp → later 0.012).

**S124 — Playground Translation:** Full Vellum token fidelity. CompanionHeader `clamp()` typography. Note input left-border surface. BookCard ember left stripe for reading books.

---

### Sessions 49–84 (compressed)

**S84 — Companion Residency:** 5 archetype books added. New schema: `book.rereadCount`, `note.rereadEra`, `note.chapter`, `note.revisedAt`, `mystery.observation`.

**S83 — Inhabited Page:** Tab dissolution (opacity-only). Language overhaul: "Discussion"→"Wondering", "Main Characters"→"figures". Cross-surface residue.

**S82 — Literary Sediment:** Full vocabulary sweep ("visits to the story"). `logDates()` bug fix (Invalid Date). Session aging first version.

**S81 — Book as Document:** CompanionHeader deconstruction. Cover 64→50px. Header background fill removed. Near-end companion echo.

**S80 — Surface Softening + Companion Residue:** Icons removed from tabs. `SectionHeading` 15px semibold → 12px normal italic. Companion residue embedding.

**S79 — Environmental Companion:** `CompanionPanel` (sidebar) + `CompanionInsights` removed. `PresenceStrip` created. Mood color system retired — all `[data-mood]` frozen to gold. Single-column layout.

**S78 — Companion Wisdom:** Suppression expanded. `duration` weight → 0. Cap-3 bar raised to effectiveV ≥ 0.75. Interruption threshold 0.65→0.55.

**S77 — Emotional Topography:** Card dissolution. Topographic spacing classes. Companion language compression: fragments and elliptical phrasing.

**S76 — Environmental Participation:** `bookPresence()` v1. `.reading-now-zone`. Companion-direction atmosphere gradient in BookDashboard.

**S75 — Scholar's Study II Integration:** Design system integrated. Two-column book detail (later retired in S79). `CompanionPanel.jsx` created (later deleted in S130).

**S74 — Visual Identity:** 12 directions prototyped. Scholar's Study II selected. `DESIGN_SYSTEM.md`, `tokens.js`, `tokens.css`.

**S73 — Emotional Gravity + Expressive Silence:** `emotionalGravity.js`. `classifySilence` (6 types). Singularity chapters.

**S72 — Environmental Memory + Literary Patina:** `literaryPatina.js`. Chapter inset gold shadow. Note opacity aging.

**S71 — Residue Memory:** `residueMemory.js`. Companion names specific words, quotes actual text.

**S70 — Signal Hierarchy:** `signalHierarchy.js`. Observation cap 8→3. Carousel 7s→12s. Full arbitration before surfacing.

**S69 — Reader-State Evolution:** `readerState.js`. 5 detectors. Emotional loading per chapter.

**S68 — Meaning Transformation:** `transformScore.js`. Polarity reversal, collapsed certainty, mystery morphing, quote echo.

**S67 — Memory Hierarchy + Selective Haunting:** `hauntScore.js`. High-haunt signals surface preferentially and resist fading.

**S66 — Narrative Momentum:** Present-tense companion language. ActiveTensionBar momentum lines.

**S63 — Orientation Depth:** ActiveTensionBar multi-line. Return momentum to position 1 after >7d gap. First-note ceremony.

**S62 — Emotional Orientation:** CompanionPresenceZone. ActiveTensionBar. `generateFirstIntroReflection()`.

**S52 — First Response Guarantee:** `generateFirstIntroReflection()`. Dev Mode. `getActiveReflections` third param.

**S51 — Deep Reading Immersion:** Modal backdrop + spring settle. Note-writing focus dim system. `✦` breathing animation.

**S50 — Immersion Choreography:** Book page atmospheric entrance. Note/mystery form emerge. New note arrival animation.

**S49 — Immersive Dashboard:** Product renamed Lantern (from Shadow Scribe). Status-grouped library. `.atmospheric-card`. Featured hero card. Editorial filter bar.

**Sessions 1–48 — Foundation:** Library, dashboard, tabs, localStorage. Spoiler enforcement. Weighted progress + chapter types. EPUB import. Companion presence engine (13-lens). Session tracking. AI extraction. Companion Intelligence Layers v1–v4.

---

*End of handoff document.*
*Full technical depth: `ARCHITECTURE.md` · `AI_COMPANION_RULES.md` · `DESIGN_SYSTEM.md` · `PRODUCT_FOUNDATION.md` · `ROADMAP.md`*
