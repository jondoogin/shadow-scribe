# Lantern — Roadmap
**Last updated:** 2026-05-30 (Session 147)

---

## Active Milestone Queue

### Milestone: LibraryCompanion Atmosphere Pass — ✓ Session 147 — complete

Visual and language pass on the cross-book companion surface at the library entrance.

**`LibraryCompanion.jsx`**: Removed outer `opacity: 0.75` suppressor. Text `12px ink-500` → `13px ink-600` — receded but legible. Glyph `◦` `7px ink-300` → `9px ink-400` — warm and present (the old treatment made it nearly invisible). `marginBottom` 28 → 40 for breathing room into the reading-now zone.

**`crossBookMemory.js`**: Impressionist observation text sharpened (redundant second sentence removed). Analyst observation moved to active voice. New `detectMultipleReadings()` detection added — readers holding 4+ annotated reading-now books get "You hold several stories open at once — each one waiting for when you return to it." Priority: behavioral → multi-reader → annotation style → mystery → collapse → theme.

**Build:** clean ✓ | 134 modules

---

### Milestone: Automatic cover lookup — ✓ Session 146 — complete

Google Books API cover resolution wired throughout the creation and library surfaces. `coverLookup.js` queries by ISBN first, title+author fallback. `BookCover` chain: `coverData → coverUrl → isbn → gradient`. Creation-time lookup fires async after `onCreate` in both `CreateCompanion` and `EpubImportReview`. Library background refresh fires for up to 5 uncovered books per session on mount, staggered 500ms. `book.coverUrl` stored as URL string (not base64). Module-level `_coverLookupAttempted` Set prevents duplicate requests within a session.

**Build:** clean ✓

---

### Milestone: Typographic Gravity Pass — ✓ Session 145 — complete

Thorough typography audit covering both light and dark mode. Two structural contrast failures fixed (light mode text too light; dark mode text too dark), plus a type size hierarchy bump on the primary reading surfaces.

**Color contrast — light mode** (`index.css`): `ink-300` (#c8c4be → #9e9a94), `ink-400` (#b3afa9 → #8a8680), `ink-500` / `text-dim` (#999590 → #767270). Dates, chapter labels, micro-action buttons, filter links, tab bar inactive text — all significantly more readable on warm cream backgrounds. Previously ranging from 1.54:1 (invisible) to 2.44:1; now 2.7–4.3:1.

**Color contrast — dark mode** (`index.css`): `ink-300` (#3a3430 → #5c5650), `ink-400` (#504840 → #706860), `ink-500` / `text-dim` (#6e6555 → #8a8272). Previously 1.46–3.26:1 on near-black backgrounds; now 2.6–4.9:1. "reply", "settle thread →", "reflect", "edit" micro-buttons were literally invisible on dark — now appropriately receded but readable.

**Type size** (`NotesTab.jsx`, `MysteriesTab.jsx`): Primary note body text and companion thread responses 13px → 14px. Creates a cleaner break above the 12px (secondary) and 10px (micro-label) tiers. The 17px note textarea and 19px companion input continue to anchor the upper end of the hierarchy.

**Build:** clean ✓

---

### Milestone: CompanionBand Depth Sensitivity — ✓ Session 144 — complete

Two precise fixes completing quiet-mode correctness in the primary companion surface.

**Ambient silence gate** (`CompanionBand.jsx`): The block `{!hasConversation && !isFirstArrival && !ambientObservation}` was rendering `"Quiet — the companion is silent for this reading."` in quiet depth — violating the architectural invariant that silence doesn't annotate itself. Added `depth !== 'quiet'` guard. In quiet mode the ambient slot is simply empty; the chapter greeting and progress bar stand alone.

**Chapter greeting tails** (`CompanionBand.jsx`): `buildChapterGreeting()` appended interpretive companion observations to the position line ("Patterns are beginning to form.", "The story is deciding what it was.", etc.) regardless of depth. Added `depth` parameter — quiet depth returns only `"Chapter N of M."` with no tail. Companion interpretation of the story's shape stays suppressed in quiet mode.

The carousel suppression, chat input gate, and first-arrival depth-aware copy were already correct. Depth system coverage in CompanionBand is now complete.

**Build:** clean ✓ | 133 modules

---

### Milestone: The Settled Surface — ✓ Session 143 — complete

Three targeted passes dissolving the last product-UI energy from interaction states.

**Library sort `<select>` → cycling text-link** (`Library.jsx`): native browser dropdown replaced with a quiet italic button that cycles through `recent → a–z → furthest` on each click. No native chrome, no dropdown arrow — the label alone communicates the current sort state and the italic register marks it as interactive.

**Confirm dialog buttons** (`CompanionHeader.jsx`): `rounded-lg border border-ink-200` Cancel + filled `btn-accent` Save → ghost italic text-link pair. Cancel becomes `italic text-ink-400`, confirm action becomes `italic amber text fontWeight:500` with `→` suffix. Applied to: pending action confirm dialog, editMeta save/cancel, delete confirmation cancel. Destructive "Remove companion" button keeps its ember fill — destructive actions need visual weight.

**All non-destructive form button pairs** (`CharactersTab.jsx`, `MysteriesTab.jsx`, `DiscussionTab.jsx`): Same ghost link treatment across: AddCharForm cancel/save ("add to cast →"), CharCard edit cancel/save, CharCard delete confirm cancel ("keep them"), relationship add/edit cancel/save, MysteriesTab add form cancel/"Open thread →"/"Record this →", DiscussionTab question delete cancel ("keep it"). Destructive remove-character and remove-question ember buttons unchanged.

**Build:** clean ✓ | 133 modules

---

### Milestone: Empty State Atmosphere Pass — ✓ Session 142 — complete

Six targeted copy edits across all six tabs — removing product-UI vocabulary, replacing instructional phrasing with atmospheric invitations, and giving each empty moment its own distinct literary voice.

- **PlotTab**: "Mark chapters complete in the Progress tab…" → "What you've read will rest here — the shape of the reading as it accumulates." (removes UI-self-reference)
- **CharactersTab**: "Begin noting the people who matter…" → "Name the figures as they arrive. They'll gather here — described, connected, their weight accumulating."
- **NotesTab** (zero notes, resonant): 'Theories, favourite lines, confusions, hunches.' → 'Write what the story gives you.' (list → invitation)
- **ProgressTab** (isNew, resonant): "The companion is open. Mark chapters as you read…" → "The companion is open alongside this reading. Everything you write and notice settles here as it unfolds." (removes imperative instruction)
- **DiscussionTab** (quiet, no questions): "Use this space to hold the questions…" → "Questions the story opens and doesn't close. Write what you're still carrying."
- **MysteriesTab** (resolved filter): "No threads have closed yet." → "Nothing has found its answer yet." / "All the open threads…have been resolved." → "Every open thread in this reading has been resolved." EmptyState CTA: `text-sm font-medium hover:underline` → italic ghost style consistent with rest of tab; "Open the first thread →" → "raise the first question →"

**Build:** clean ✓ | 133 modules

---

### Milestone: ChapterUpdateModal Depth + CharactersTab Atmosphere — ✓ Session 141 — complete

`ChapterUpdateModal.jsx`: reflection picking now gated — `aiEnabled(book, settings)` determines whether a completion or return reflection is selected; quiet depth sets `reflection = null`. Companion `observationText` in the done-state Card 1 is suppressed on quiet (the chapter number alone is enough). `bookDepth` imported; `depth` computed after `mode`.

`CharactersTab.jsx`: `bookDepth` imported. `depth` computed at `CharactersTab` component top. `depth` threaded into every `CharCard` via `sharedCardProps`. `CharCard` signature updated to accept `depth` prop. Companion surfaces gated: (1) `charRelationalLine` / `wasUpdated` IIFE block — now `{depth !== 'quiet' && (() => { ... })()}` — companion observations about character shifts and instability suppressed in quiet; (2) `showMysteryBleed` — "The open questions are still circling some of these figures." suppressed in quiet.

Depth system coverage is now complete across all tabs and modal surfaces: ProgressTab, NotesTab, DiscussionTab, MysteriesTab, CharactersTab, ChapterUpdateModal, SettingsPage, CompanionBand.

**Build:** clean ✓ | 133 modules

---

### Milestone: Completion Ceremony + ProgressTab Depth — ✓ Session 140 — complete

`CompanionHeader.jsx`: confirm dialog body upgraded — "Mark this companion as finished?" → "The reading ends here. Everything you've written and noticed stays with this companion." OK label → "It's done". Post-completion afterimage: `animate-fade-in` added; `veryFresh` tier (0–2 days) renders at 13px ink-500 with ✦ glyph prefix vs previous 12px ink-400 — the moment the reading ends now has the presence it deserves.

`ProgressTab.jsx`: `CompanionOrientation` gated on `depth !== 'quiet'`; near-end ambient trace gated; entire forward-pull chapter residue block gated (all interpretive companion lines suppressed in quiet mode — chapters stand alone). `isNew` welcome message depth-sensitive.

---

### Milestone: Notes + Themes Depth-Sensitivity — ✓ Session 139 — complete

`NotesTab.jsx`: `notesPresence` companion observation line now gated on `depth !== 'quiet'`; zero-notes empty state is depth-aware ("A record of the reading, without interpretation." for quiet); `noteEchoes` display gated on `depth !== 'quiet'`. `bookDepth` imported alongside existing `aiEnabled`.

`DiscussionTab.jsx`: AI generate button now gated on `aiEnabled(book, settings)` (was showing even in quiet); empty state fixed — was guarded by `!hasAiKey` which is always false, so never rendered; now fires when no questions and not generating, with depth-aware copy; companion line gated on `depth !== 'quiet'` and minimum 3 notes; cross-surface residue echo gated on `depth !== 'quiet'`; input placeholder depth-sensitive.

---

### Milestone: Settings Depth Consistency + Questions Atmosphere — ✓ Session 138 — complete

`SettingsPage.jsx`: replaced the `<select>` for Default Companion Depth with a compact version of the ritual card stack from the creation wizard. Full-width layout (outside SettingsRow), warm amber selected state, serif label + italic tagline always visible, detail line on selected card only. Visual language now matches `CreateCompanion.jsx` precisely.

`MysteriesTab.jsx`: depth-aware empty state copy (quiet/saturated variants); first-mystery ceremony line "The first question opens the reading to something larger…" appears in the add-form when `liveMysteries.length === 0`; quiet depth suppresses companion thinking/reply states entirely (correct per depth contract); first mystery earns a distinct companion response "The reading is open now. This question will move with you." rather than the hash-pool response.

---

### Milestone: First-Book Arrival Atmosphere — ✓ Session 137 — complete

`CompanionBand.jsx`: when `status === 'reading'` and `readingLog` is empty and `notes` is empty (brand-new book, no sessions yet), `isFirstArrival` is true and the ambient reflection slot shows a personalized depth-calibrated opener instead of the generic arc observation. Quiet: "The companion witnesses without speaking. Notes and chapters accumulate here." Resonant: "The companion is open alongside *[Title]*. Write what you notice — the rest will follow." Saturated: "The companion is fully awake to *[Title]*. Write what you notice." Book title rendered in `<em>` inside the already-italic `companion-band-reflection` — de-italicizes it per typography convention. Normal ambient/silence states gate on `!isFirstArrival`.

---

### Milestone: Library Editorial Card Redesign — ✓ Session 135 — complete

`BookCard.jsx`: covers 56px→68px (default) / 64px→84px (hero), title weight 500→400 (more literary register), author 12→13px (clearer hierarchy). Status dot removed entirely — the ember left stripe already signals reading state. Chapter format "Ch. N/M" → "ch. N of M" (lowercase, narrative). Finished books now show only the completion date in serif italic; no chapter count, no progress bar. Want books skip the chapter line (ch. 0 of N is misleading). `STATUS_DOTS` constant and `dotColor` variable removed as dead code.

---

### Milestone: Depth Level UX Exposure — ✓ Session 136 — complete

`CreateCompanion.jsx` and `EpubImportReview.jsx`: replaced the 3-column chip picker + generic label with a full-width vertical card stack headed by a serif question ("How should your companion be present?"). Each card: name in serif + "· recommended" tag on Resonant, italic tagline, concrete detail line describing what actually changes. Quiet: "The companion witnesses without speaking." Resonant: "Present without performing." Saturated: "Fully awake to this reading." CreateCompanion Step 3 summary now includes depth level inline.

---

### Milestone: Return Experience Polish — ✓ Session 134 — complete

Reading gap archaeology surfaced in `CompanionHeader.jsx` was technically implemented but visually inert — 11px ink-300 text, invisible to most readers. Pass: lower thresholds (active 7→3 days, paused 14→7 days), mystery appearance (14→7 days), quote font 11→13px at ink-500, mystery 11→12px at ink-400, warm amber left-border container `rgba(184,134,11,0.04)` background. Literary gap labels at 7+ days for active ("A week away from this story."), always for paused. `formatGapLabel(days, paused)` helper added.

---

### Milestone: Tombstone Deletion — ✓ Session 133 — complete

Field-level sync merge was union-based: deleting an item on device A then syncing from device B revived it. Fix: `deleteNote` and `deleteMystery` now stamp `{ deleted: true, updatedAt }` instead of filtering. `mergeBook()`'s `unionById` already picks the later-timestamped item, so tombstones propagate to all devices on next sync. New `utils/live.js` exports `liveItems(arr)` — the filter used everywhere notes/mysteries are displayed or computed. All 20+ consumer sites updated; DebugPage excluded (dev-only). `book.notes`/`book.mysteries` store tombstones for sync; UI and companion see only live items.

---

### Milestone: Design System 4.0 + Companion-First Redesign — ✓ Sessions 121–132 — complete

Full redesign of Lantern's visual system and information architecture. Planned in Session 121, implemented across Sessions 122–132.

- **Phase 1 (S122–124):** Vellum token remap, Libre Baskerville, ember palette, AtmosphericGlow, AmbientLayer, button ember-fill, backdrop blur.
- **Phase 2 (S122–123):** CompanionBand built, BookDashboard restructured (single column), manuscript annotation conversation style.
- **Phase 3 (S122):** 6→5 tabs, Mysteries→Questions, Discussion→Themes, Progress content in CompanionBand.
- **Phase 4 (S128–129):** `api/companion.js` Vercel proxy live, real Claude AI wired to CompanionBand, note threads, session reflections.
- **Phase 5 (S126–128):** `/about` landing page, mobile optimization pass, typography breathing room.

Additional work in block: Cloud sync (S131), Depth Level (S131–132), field-level merge (S132), auth chip (S132).

---

### Milestone: Alpha UX Hardening Pass — ✓ Session 120 — complete

10-item implementation pass targeting the UX gaps most visible to new alpha readers. All items verified in-browser.

- **Dark mode toggle in nav** — ☀︎/◗ button in `TopNav` bar (no menu required). `TopNav.jsx`.
- **NLP improvements** — blur no longer clears input; live "→ Chapter N" feedback; Enter submits; finish phrases expanded; out-of-range clamped. `ChapterUpdateModal.jsx`.
- **Mobile keyboard** — `interactive-widget=resizes-content` + `env(keyboard-inset-height)` modal maxHeight. `index.html` + `ChapterUpdateModal.jsx`.
- **Modal initial focus** — NLP input auto-focused on mount. `ChapterUpdateModal.jsx`.
- **Reflection suppression** — `suppressReflection` wired into `PresenceStrip` (hover ✕ + 700ms long-press). `PresenceStrip.jsx`.
- **Reflection deduplication** — `deduplicateReflections()` applied in `PresenceStrip` (was missing; only in `CompanionPanel`). `PresenceStrip.jsx`.
- **Saturation detection** — `isReflectionPoolSaturated()` shown in `PresenceStrip` with actionable message. `PresenceStrip.jsx`.
- **Tablet two-column** — `BookDashboard` at `lg` uses `grid-cols-[1fr_260px]`; `CompanionPanel` activated as sticky sidebar. `BookDashboard.jsx`.
- **Status transition keyboard** — Confirm dialogs auto-focus + Enter/Escape support. `CompanionHeader.jsx`.
- **Edit metadata** — `totalChapters` field; auto-rebuild `chapters[]`; auto-focus title; Enter/Escape on all fields; Save disabled when title empty. `CompanionHeader.jsx`.

---

### Milestone: Companion Thread — AI Responses + Animation + Typography — ✓ Session 100 — complete

Note thread responses replaced from hardcoded lookup strings with real AI calls (`claude-haiku-4-5`, 120 tokens, 12s timeout) sending book title/author/description, current chapter, last 5 notes as context, and the new note. New `src/utils/companionThread.js` exports `generateNoteThreadResponse()` and `threadFallback()`. `NotesTab.jsx` routes: first note → intro pool, API key present → AI, no key → canned fallback. Arrival animation overhauled: single blur-clear replaced with two-beat staged reveal — ✦ glyph settles first (0.5s), text surfaces after (1.1s, 0.3s delay). Applied at element level, not wrapper. Typography: 12px Playfair italic ink-500 (~2.5:1 contrast) → 13px Inter regular ink-700 (~6.5:1 contrast, WCAG AA). Dev server now binds to `0.0.0.0` for phone access on local network.

---

### Milestone: Companion Presence Timing + Emotional Latency — ✓ Session 99 — complete

Deepened timing realism across the companion threading system. `calcNoteDelay()` now reads emotional and uncertainty vocabulary (uncertain +450ms, emotional +350ms, ellipsis +300ms) in addition to structural metrics, with ±220ms per-note jitter. Clamp widened to 700–4800ms. Thinking glyphs changed from uniform 2.2s to irregular `2.3s / 3.1s / 1.9s` durations at offset delays — each ✦ pulses at its own pace. Arrival animation changed from `translateY(3px)` settle to `blur(0.8px)→0` dissolve over 0.7s — responses surface rather than slide. Thread border and ✦ opacity further reduced (`.22→.15`, `0.60→0.50`). Both observation carousels (`PresenceStrip` + `CompanionInsights`) replaced `setInterval` with recursive `setTimeout` + ±1500ms jitter — cadence now environmental rather than mechanical.

---

### Milestone: Companion Moment Refinement — ✓ Session 98 — complete

Threaded companion responses replacing the floating, instant `introAck` ceremony. Two new keyframes (`companionPulse`, `companionThreadArrive`) + `.companion-thread-arrive` class in `index.css`. `NotesTab.jsx`: `calcNoteDelay()` (800–4500ms, note complexity-weighted) + `generateNoteCompanionResponse()` (responds to theory/confusing/favorite/quote/? notes; silent for plain character/theme). Thinking state (three staggered ✦ pulses at 2.2s) always appears; response or considered silence follows. `MysteriesTab.jsx`: same pattern, every new mystery always receives an acknowledgment. All responses are session-only (not persisted). `introAck` system retired.

---

### Milestone: Dev Mode + Model Fix — ✓ Session 97 — complete

`PROVIDER_CONFIG.model` updated `claude-3-5-haiku-20241022` → `claude-haiku-4-5` (was returning 404, causing silent fallback on all AI operations). Dev Mode reintroduced: `devMode: false` in `SETTINGS_DEFAULTS`, Settings → Developer toggle, `getActiveReflections` third param bypasses 8h cooldown, `PresenceStrip` + `CompanionInsights` use `devMode` to force 3s carousel and full strip opacity.

---

### Milestone: Depth of Attention + Focus Falloff — ✓ Session 96 — complete

`coverOpacity` unifies presence and temporal recession into a single cover-opacity value (deep→1.0, inhabited→0.97, sparse→0.91, 90+d→0.70, finished→0.80). `coverShadow` gains temporal falloff for sparse/dormant books (45+d and 90+d tiers). Title color steps back one tonal stop for sparse books (ink-800 vs ink-900). Flat-view BookCards now receive `presence={bookPresence(book)}` — presence identity consistent in both grouped and filtered views. `.shelf-dormant` and `.shelf-archive` brightness filters added (0.97 and 0.95) — a third cooling axis alongside existing saturation and opacity.

---

### Milestone: The Settled Surface
*(recommended next)*

The remaining "software feeling" surfaces in Lantern are interaction components that still carry product-UI energy. Three rounds of materiality work (Sessions 87–89) dissolved borders, slowed transitions, quieted chrome, opened rhythm, and broke compositional uniformity. What remains is interaction-state energy — things that only appear when the user does something.

**Key surfaces to address:**
- Book header quick-actions row ("update chapter · put this aside · mark as finished"): gestural language, softer visual hierarchy
- "New Companion" nav button: softer energy, less SaaS call-to-action feel
- Note add form: `rounded-2xl border` container still reads as a UI panel; textarea has `border border-ink-200` still
- Form Cancel/Save buttons: rounded-lg bordered buttons are the most UI-feeling elements remaining
- Sort select element: native `<select>` energy
- Focus rings: still very UI-feeling when search inputs are focused
- MysteriesTab "Open thread" button label inside the add form: action-button vocabulary

---

### Milestone: Peripheral Atmosphere + Edge Dissolution — ✓ Session 95 — complete

Reading-now zone bleed extended from -20px to -28px each side (with compensating padding). `body::before` 5th gradient added at `50% 106%` — faint warm atmospheric ground below viewport, persists on scroll via `position: fixed`. Archive grid `maskImage: linear-gradient(to bottom, black 62%, transparent)` — settled books dissolve into the page rather than ending cleanly.

---

### Milestone: Visual Current + Quiet Zones — ✓ Session 94 — complete

Six changes in `Library.jsx`. Set-aside: `paddingTop: 6` when dormancy >0.5 (suspension); grid `gap-x-4 gap-y-[22px]` (row gap > col gap). Finished: label `paddingLeft: 4` + grid `gap-x-3 gap-y-[18px]`. Archive: section `paddingTop: 16` (approach space) + label `paddingLeft: 10`. Label diagonal complete: flush → flush → +4px → +10px mirrors temporal recession. Row-gap asymmetry creates editorial vertical pacing vs uniform product grid.

---

### Milestone: Environmental Weather + Density Fields — ✓ Session 93 — complete

Reading-now zone warmth now driven by total annotation mass across all reading-now books (18–30% gold-bg, continuous scale replacing binary deep→26%). Zone padding expands for mass ≥ 6. Reading-now zone adds bottom dissolution shadow (`0 40px 48px -8px var(--color-cream)`) — warm penumbra fades into topo-gap below rather than hard boundary. Set-aside section gets `filter: saturate(0.93)` when dormancy ratio >0.7 — heavily dormant shelves become collectively more diffuse.

---

### Milestone: Shelf Ecology + Inter-Book Relationships — ✓ Session 92 — complete

Three neighborhood-awareness changes in `Library.jsx`. Set-aside label opacity computed from dormancy ratio: if >50% of books cooling (45+d), label fades to 0.38 (from 0.52). Set-aside cards: neighbor deep detection (prev/next in array) → drift `neighborDamp=0.55` + unannotated neighbor warmth (`color-mix(#B8860B 3%, card-base)`). Finished cards: same drift-damping from deep neighbors. One-hop only. No cascade. No visible system.

---

### Milestone: Interior Atmosphere + Card Identity — ✓ Session 91 — complete

Eight graduated interior variations in `BookCard.jsx`, all derived from `presence` and `daysSince`. Deep books: `p-5` padding, `mt-4` footer, `mt-1` author gap, `mb-2` chapter→bar gap, `h-[3px]` progress bar, `ink-500` chapter color, 1.0 pct opacity, `mt-2` date gap. Cooling/dormant books: compress progressively — `mb-1`, `h-px` bar, `ink-300` chapter color, 0.45–0.65 pct opacity, `mt-1` date gap. No randomness. No visible system.

---

### Milestone: Organic Composition + Environmental Drift — ✓ Session 90 — complete

Introduced deterministic `bookDrift()` function (djb2-variant hash of `book.id` → stable ±3px vertical offset). Applied to set-aside (presence-damped, cooling-settled), finished (pure drift), and archive (drift +1) card wrappers via `transform: translateY`. Multi-book reading-now primary book lifts −2px when `deep`. Reading-now zone warms to 26% gold-bg when primary is deep (vs 20% default). `.surface-inhabited-deep` shadow deepened for more physical weight on the shelf.

---

### Milestone: Editorial Composition + Spatial Asymmetry — ✓ Session 89 — complete

Removed 3-column grids from set-aside, finished, and archive sections — max 2 columns. Reading-now multi-book grid now conditionally asymmetric: when primary book is `deep`, grid uses `3fr_2fr` (most inhabited book claims more horizontal space). Archive gap compressed to `gap-2`. `topo-gap-dormant` 2.75rem → 3.25rem (set-aside and finished feel compositionally distinct). Geological break in NotesTab: first current-era note after archival strata gets `marginTop: 2rem`. Singularity chapter margin expanded to include trailing silence (`marginBottom: 8`).

---

### Milestone: Material Atmosphere + Environmental Continuity — ✓ Session 88 — complete

Removed `translateY(6px)` from page-entry animation (pure opacity crossfade). Replaced sticky bar hard border with shadow-based dissolve. Expanded topo-gap-active 5rem → 5.5rem. Reading-now shelf-title margin 1.4rem → 2rem. Completed chapter padding `py-2.5` → `py-2` (settled vs active distinction). Note list spacing `space-y-3` → `space-y-4`. Archival note padding `p-4` → `p-5`. Mystery list `space-y-2` → `space-y-3`. Chapter→visits breathing `mb-12` → `mb-16`. Notes/Mysteries filter rows `mb-5` → `mb-7`.

---

### Milestone: Materiality Pass — ✓ Session 87 — complete

Dissolved borders (note cards borderless, atmospheric-card alpha .030 → .018), deepened grain (.022 → .028), warmed ambient gradient (.11 → .14 and .042 → .055), reduced sticky blur (10px → 6px), quieted all filter/search chrome. Author color now recedes with temporal distance (three tiers: ink-500 / ink-300 / ink-200). Session aging expanded to four tiers (0.28 / 0.42 / 0.65 / 1.0). Note footer chrome reduced from 11px ink-400 to 10px ink-300 throughout. Singularity chapters breathe with marginTop: 10px. No new systems, no new features.

---

### Milestone: Temporal Layering Pass — ✓ Sessions 86 + 87 — complete

Session 86: note archaeology (`note.rereadEra`), mystery environmental dormancy, book cooling/silencing.
Session 87: session history expanded to four-tier temporal recession (0.28/0.42/0.65/1.0), font size aging for deep sessions.

---

### Milestone: Typographic Gravity Pass
*(originally recommended after Session 78)*

The interface still expresses hierarchy primarily through box/card structure. The next evolution: fewer surface boundaries, more weight differentiation in the type itself. Titles pulling harder. Companion voice in slightly larger, more weighted type. Section labels receding further. The page reads as a continuous typographic field rather than panels.

**Remaining from Companion Depth Pass:**
- CompanionOrientation differentiation — when it mirrors CompanionInsights position 0, diverge
- Companion deduplication — suppress rule-based entries semantically covered by AI entries
- Reader-facing reflection feedback (suppress button on long-press/hover)

---

### Milestone: Companion Wisdom Deepening Pass (✓ Session 78 — complete)
Orchestration pass: not new perception, but knowing what deserves to surface.

**Completed:**
- `signalHierarchy.js` — expanded SUPPRESSES map (destabilization now owns everything; mystery suppresses narrative); weight reductions for ambient signals (`duration: 0`, `session_rhythm: 2`, `pacing: 2`, `character_ownership: 1`); `shouldEnterAtmosphereMode()` more aggressive (interruption threshold 0.65 → 0.55; dense recent annotation triggers silence)
- `invisiblePresence.js` — `computeObservationCap()` raises cap-3 bar to effectiveV ≥ 0.75; cross-system gravity pressure: dense mystery state reduces companion output (narrative tension is already doing work)
- `companionPresence.js` — threshold tightening across 5 lenses; `duration` block removed; `generatePresenceDebug()` export added
- `CompanionInsights.jsx` — developer debug panel via React portal; shows all orchestration scores + surfaced observations; toggle `localStorage.setItem('lantern_debug_companion','1')`

---

### Milestone: Emotional Topography Pass (✓ Session 77 — complete)
Push Lantern from "composed interface" toward "inhabited literary topography." Uneven, settled, weathered, emotionally weighted.

**Completed:**
- `index.css` — card dissolution (`.atmospheric-card` near-invisible border, `.reading-hero-card` borderless, new `.note-card` class); `--color-card-base` warm cream `#FDFAF5`; topographic spacing classes `topo-gap-active/dormant/archive`; expanded reading-now zone; fourth ambient gradient layer for light mode depth
- `Library.jsx` — `topo-gap-*` section rhythm; deeply-inhabited solo book widens to `max-w-md`
- `companionPresence.js` — language compression: "Something in..." / "You've been..." / "What you..." reduced; fragments and elliptical phrasing introduced across 8 lenses
- `NotesTab.jsx` + `MysteriesTab.jsx` — note/mystery cards dissolved from boxed tile to `.note-card` shadow-led surface

---

### Milestone: Environmental Participation Pass (✓ Session 76 — complete)
Make the interface spatially participate in the emotional systems already computed — books affect atmosphere, companions affect surrounding space, reading history alters surfaces.

**Completed:**
- `index.css` — editorial window-light ambient (light mode asymmetric upper-left); dark mode companion-column warmth (gold from right edge); `.reading-now-zone`, `.surface-inhabited/deep`, `filter: saturate()` on dormant/archive
- `Library.jsx` — `bookPresence()` helper; reading-now zone wrapping; presence-based card shadow depth
- `BookCard.jsx` — `presence` prop; graduated cover shadow
- `BookDashboard.jsx` — companion-column atmosphere gradient layer

---

### Milestone: Visual Overhaul Milestone 1 — Scholar's Study II Integration (✓ Session 75 — complete)
Execute the design system fork: live app now runs Scholar's Study II tokens, reading-room library, two-column book detail, gold foil companion panel.

**Completed:** See Session 75 notes.

---

### Milestone: Companion Depth + Continuity Specificity Pass
*(partially complete — paused for visual overhaul)*

**Remaining work:**
- CompanionOrientation differentiation — when it mirrors CompanionInsights position 0, find a way to diverge
- Companion deduplication — suppress rule-based entries semantically covered by AI entries
- Reader-facing reflection feedback (suppress button on long-press/hover)
- Surface `hauntLevel` in CompanionOrientation secondary line when a mystery is at 'haunted' level

---

### Milestone: Reader-State Evolution + Emotional Trajectory Pass (✓ Session 69 — complete)
Track how the reader changes emotionally while reading — not just how the book changes shape.

**Completed:**
- `src/utils/readerState.js` — `detectConfidenceDrift`, `detectFixations`, `detectNoteLengthTrajectory`, `detectBurstCadence`, `detectSilenceGap`, `detectEmotionalLoading` — pure reader-state detection utility
- `companionPresence.js` — 5 new lenses: `readerConfidenceObs`, `readerFixationObs`, `readerCadenceObs`, `readerSilenceObs`, `readerTrajObs`; all wired after `dormantMysteryObs` for restraint
- `NotesTab.jsx` — `deriveNotesPresence`: confidence arc signals + fixation signal
- `ProgressTab.jsx` — `emotionalPeakChapters` Set via `detectEmotionalLoading`; "Your writing intensified here." chapter residue

---

### Milestone: Meaning Transformation + Interpretive Mutation Pass (✓ Session 68 — complete)
Transform Lantern from remembering what returns to understanding what changes shape — collapsed theories, mutated mysteries, inverted character readings, quote recontextualization.

**Completed:**
- `src/utils/transformScore.js` — `detectCollapsedCertainty`, `detectMysteryRefinements`, `detectQuoteRecontextualization`, `detectChapterDestabilization` — pure detection utility
- `companionPresence.js` — 4 new lenses: `polarityReversalObs`, `collapsedCertaintyObs`, `mysteryMorphObs`, `quoteEchoObs`; local `POLAR_POS`/`POLAR_NEG` arrays for lightweight valence detection
- `NotesTab.jsx` — `deriveNotesPresence` collapsed certainty signals (1 or 2+ revised theories)
- `MysteriesTab.jsx` — `originalText` displayed as "Originally: …" quiet italic; badge text `· refined` → `· reframed`
- `ProgressTab.jsx` — `destabMap` via `detectChapterDestabilization` useMemo; destabilization residue: "A certainty formed here later came apart." / "A question opened here was reframed."
- `CharactersTab.jsx` — `charValence` function with `CHAR_POS`/`CHAR_NEG`; polarity reversal lines in `charRelationalLine` after tag-based instability checks

---

### Milestone: Memory Hierarchy + Selective Haunting (✓ Session 67 — complete)
Introduce memory weighting so low-gravity signals cool and high-gravity signals resurface, intensify, and infect multiple surfaces.

**Completed:**
- `src/utils/hauntScore.js` — `noteHauntScore`, `mysteryHauntScore`, `hauntLevel` — foundational scoring utility
- ActiveTensionBar: sorted by hauntScore (most emotionally persistent first, not oldest); haunted signals get warmer glyph + text
- Two new companion lenses: `hauntedThreadObs` (note × mystery keyword overlap), `crossChapterEchoObs` (early theory echoing late)
- Reflection cooling: `getActiveReflections` prefers fresh pool (surfaceCount < 4), falls back to full pool when saturated
- Mystery gravity: `hauntLevel`-differentiated prose color + `✦` prefix for haunted; `opacity-60` for cooling dormant
- Chapter residue: `noteHauntScore` elevation — persistent/haunted chapters show "Still shaping what comes after." regardless of `ch.important`

---

### Milestone: Narrative Momentum Pass (✓ Session 66 — complete)
Transform companion language from archival/static to active/present-tense. The story is still moving; the companion speaks accordingly.

**Completed:**
- `ActiveTensionBar` meta labels: full status+age matrix — "still pulling," "keeps deepening," "still shifting," "gone quiet," "still resisting explanation"
- `getMysteryGravity()`: status-differentiated momentum lines; threshold lowered from age<8 to age<6
- Three new `companionPresence.js` lenses: `theoryAccelerationObs`, `wideningSuspicionObs`, `mysteryPropulsionObs`
- `mysteryObs` + `lingeringMysteryObs` language upgraded: "still unresolved" → "still in motion" / "still circling" / "still widening"
- `deriveSecondarySignal`: two new top-priority momentum conditions; lingering/gap language all upgraded
- `deriveNotesPresence`: two new movement conditions (revised theories, revised confusions)
- `charRelationalLine`: character instability detection via early/late note tag transitions
- `ReadingMomentum`: story-pull secondaries on streak-3, streak-2, and return-gap states
- `ProgressTab`: `notesByChapter` memo + forward-pull lines on completed chapters

---

### Milestone: Orientation Depth + Continuity Momentum (✓ Session 63 — complete)
Deepened quality and specificity across all orientation surfaces.

**Completed:**
- ActiveTensionBar multi-line (`line-clamp-2`), 12px text, py-3 — long mysteries no longer truncated
- `deriveSecondarySignal` now quotes specific mystery/theory text when short enough — companion familiarity
- Return momentum observation spliced to position 1 in `generatePresence()` when gapDays > 7 — surfaces early in carousel and CompanionOrientation secondary
- First-note ceremony in NotesTab — `introAck` state, inline gold-tinted serif acknowledgment, 8s fade, `animate-fade-in`
- CompanionPresenceZone: `text-[14px]`, `py-6`, secondary signal on all slots (not just non-reflection)
- CompanionHeader: cover `opacity-75`, author 12px/ink-400, chapter position 10px/opacity-70, % opacity-50, mood selector `hidden sm:block`, lifecycle actions no mobile border
- Mobile sticky bar: `"Continue from chapter {n}"` / `"Log your first session"` — reader-centric framing

---

### Milestone: Emotional Orientation + Dashboard Recomposition (✓ Session 62 — complete)
Recomposed the dashboard so companion voice leads over metadata.

**Completed:**
- CompanionHeader slimmed — cover, padding, title weight, progress bar, button text
- CompanionInsights → CompanionPresenceZone — 2-line, secondary tension signal, companion-spark
- ActiveTensionBar — most pressing unresolved element between presence zone and tabs
- CompanionOrientation in ProgressTab — above progress hero, with secondary reader-state signal
- Progress hero softened — `text-4xl font-semibold text-ink-700`; "Reading history" heading
- `generateFirstIntroReflection(note)` — 6 tag-aware emotional categories, seeds on first note
- Memory recall lenses: `recallObs`, `gravitationObs`, `dormantMysteryObs` in `companionPresence.js`

---

### Milestone: Companion Intelligence Layer v5 — Reflection Quality + Deduplication
*(next up after Session 52)*
Audit and improve the full reflection pipeline end-to-end.

**Planned work:**
- Deduplicate AI + rule-based reflections by text similarity (Jaccard or short-string distance; no embeddings)
- Suppress rule-based entries that are semantically covered by an AI entry
- Reader-facing reflection feedback (suppress button visible on long-press / hover)
- Audit reflection pool over time: surface less frequently when pool is well-surfaced

---

### Milestone: Emotional Legibility + Illumination Readability Pass (✓ Session 53 — complete)
Audit and refine how readers intuitively understand what Lantern is noticing, holding, and illuminating — without labels or explanation.

**Completed:**
- ReadingMomentum: continuity-first language pass (streak → "X days returning", removed metric secondaries)
- `companionPresence.js`: early reader acknowledgment at 2 notes — fills the gap between first-note intro reflection and richer 3+ note observations
- `CompanionInsights`: reflection warmth — insight strip shifts from 55% to 78% accent tint when showing a cached reflection vs. a presence observation (900ms transition, imperceptible as animation)
- Illumination language system formalized in docs (design language, not UI documentation)
- Future directions documented: constellations, reread echoes, warmth aging, temporal opacity

---

### Milestone: First Response Guarantee + Dev Mode Toggle Pass (✓ Session 52 — complete)
Fix the silent companion: adding 6 notes produced zero visible responses, breaking reader trust.

**Completed:**
- `generateFirstIntroReflection()` — pool of 6 literary first-response strings; enters `reflectionCache` on first note
- `addNote()` in NotesTab: detects `isFirst`, seeds cache + sets `companionIntroResponded: true` atomically
- `getActiveReflections(book, limit, devMode)` — devMode bypasses 8h cooldown entirely
- `SETTINGS_DEFAULTS.devMode = false` — persistent toggle
- `CompanionInsights`: Gate 1 bypassed in devMode; carousel 3s vs 7s; devMode passed to `getActiveReflections`
- Settings → Developer section: devMode Toggle
- DebugPage → "Response Pipeline" panel: per-book gate audit, flag states, resurfacing eligibility

---

### Milestone: Deep Reading Immersion + Active Session UX Pass (✓ Session 51 — complete)
Focus on active reading-state immersion — Lantern as a living environment during reading, not only after.

**Completed:**
- ChapterUpdateModal: backdrop fade-in (`modal-backdrop`), spring modal entrance (`modal-settle`), literary placeholder ("Where has the story taken you?"), delayed "Return to the story" button (420ms after done state settles)
- NotesTab: `note-writing-mode` focus system — search/filters/list dim during composition; textarea is now journal-adjacent (serif, `leading-relaxed`, `bg-cream-50`, 4 rows, "A thought before it disappears…")
- CompanionInsights: ✦ glyph breathing (`ambient-breathe`, 9s) — barely perceptible companion awareness
- ProgressTab: progress number softened (`font-semibold text-ink-700` vs `font-bold text-ink-900`)
- Dark mode ambient warmth: `html.dark body::before` candle-glow gradient (restrained; ~half light-mode opacity)

---

### Milestone: Immersion Choreography Pass (✓ Session 50 — complete)
Make movement through Lantern feel like shifting through literary memory, not navigating app screens.

**Completed:**
- Book page entrance: 420ms atmospheric dissolve (`.book-enter`) vs 220ms standard route entrance
- Note form: descends from above rather than sliding up (`note-form-emerge`)
- New note arrival: newly saved thought rises into view (`note-arrive` + `lastAddedId` tracking)
- Mystery form: consistent with note form entrance (`note-form-emerge`)
- Notes filter "All": filled pill → quiet text-link tab (consistent with Library and Mysteries)
- Mysteries filter: filled pills → quiet text-link tabs (consistent with Library and Notes)
- Chapter done state: scale+Y cubic-bezier warm settle (`done-arrive`)
- Companion reflection in done state: 280ms delayed entrance — arrives as a second thought
- EmptyState: warm settle entrance (`warm-settle`)
- ReadingMomentum: warm settle entrance (`warm-settle`)
- Progress chapter list: first 12 items cascade in with 35ms stagger

---

### Milestone: Immersive Dashboard Pass (✓ Session 49 — complete)
Transform Lantern from a feature-interface into a living literary environment.

**Completed:**
- Product rename: Shadow Scribe → Lantern (UI, title, copy, docs)
- Library: status-grouped layout (reading now / set aside / finished / archive)
- Library: editorial filter bar — quiet text-link tabs, minimal sort selector, no count metrics
- BookCard: `.atmospheric-card` (shadow-based, no hard border); `.reading-hero-card` for featured solo book
- TopNav: ember-drift ✦, softer "New Companion" button, Lantern brand, quieter nav menu copy
- CompanionInsights: serif italic observations, more breathing room (`py-4`), quieter dots
- CompanionHeader: mood-ambient background, softer progress display, lighter dividers
- CSS: three-layer ambient gradient; new keyframes (`illuminateIn`, `settleDown`, `emberDrift`); new classes (`.atmospheric-card`, `.reading-hero-card`, `.shelf-title`, `.shelf-dormant`, `.shelf-archive`, `.ember-drift`)
- Documentation: all 6 docs updated to Lantern philosophy

---

## Known Issues (must-fix before next major milestone)

### `ChapterUpdateModal` natural-language parsing is weak
Regex handles `chapter 21`, `ch. 5`, `part III`, `#12`. Doesn't handle ordinals, spelled-out numbers, or "finished the book". Unrecognized input silently falls back to `currentChapter + 1`.

### No mobile keyboard handling in modal
`ChapterUpdateModal` textarea may be obscured by the software keyboard on mobile. No `visualViewport` or `env(keyboard-inset-height)` handling.

### `BookCover` Open Library edge cases
Three books have `isbn: null` to avoid wrong covers. No UI to update ISBN. Open Library sometimes returns a 1px placeholder (200 OK) that the `onError` fallback doesn't catch.

### `calcStreak` uses local system time
Streak calculation uses `new Date()` without timezone awareness. Midnight readings across timezone boundaries may produce incorrect streak counts.

---

## Unresolved Immersion Risks (post Session 51)

- **note-dim pointer-events: none** — when `adding === true`, the notes list and search bar have `pointer-events: none`. If a user clicks the dimmed area expecting to cancel the form, nothing happens. Consider: clicking dimmed area cancels compose state.
- **note-writing-mode mobile keyboard** — the note form dims surrounding content, but on mobile the software keyboard pushes the form up. The dimmed content behind may still be partially visible/confusing. Test on small viewports.
- **ambient-breathe + ember-drift stacking** — ✓ fixed in Session 51: both keyframes now run via inline `animation: 'emberDrift 4s ease-in-out infinite, ambientBreath 9s ease-in-out infinite'` on the ✦ element. The `.ember-drift` and `.ambient-breathe` utility classes are no longer used on this element.
- **Dark mode ambient warmth visibility** — the candle-glow gradient at 0.022→0.012 opacity may be entirely invisible on OLED screens. Test on actual dark displays.
- **modal-settle on mobile** — the spring cubic-bezier `(0.16, 1, 0.3, 1)` at 380ms may feel slow on low-end mobile. Monitor.

---

## Unresolved UI Risks (post Session 49)

- **BookCard mood color in library** — `featured` card uses `MOOD_CONFIG[book.mood].color` for progress percentage, but standard cards also use it. This is un-themed (no `data-mood` wrapper in Library). Currently consistent but diverges from the accent theming system inside BookDashboard. Monitor for visual inconsistency.
- **Hero card max-w-xs** — the intentional asymmetry (solo reading book at `max-w-xs`, not full width) will feel odd when the screen is narrow and the max-width equals full viewport. Needs responsive review on small screens.
- **Archive at 38% opacity** — extremely faint on cream backgrounds in dim lighting. May need to be lifted to 42–45% for accessibility.
- **Grouped library loses sort on filtered views** — sort still applies within each group, but the visual grouping overrides the sort's implied ordering. Users may expect all books sorted globally.
- **Dark mode ambient gradient** — the three-layer gradient uses light-mode opacity values. In dark mode, the ambient warmth may be invisible. Consider separate dark-mode gradient.

---

## Backlog — Medium Priority

### UX
- [ ] **Shadow Mode** — distinct from dark mode. Dimmer, lower-contrast reading atmosphere. Toggle exists in Settings but is disabled.
- [ ] **Book status transitions** — no UI to change status (reading → finished → paused). Should auto-offer "Mark as finished" when at 100%.
- [ ] **Edit book metadata** — no way to change total chapters, format, or spoiler mode after creation.
- [ ] **`RelationshipMap` interactivity** — currently read-only. Click a node to highlight connections; click a line to edit.
- [ ] **Keyboard focus trap in `ChapterUpdateModal`** — follow ARIA modal dialog pattern.
- [ ] **Series progress view** — group library by series; show series-level progress bar.

### AI features
- [ ] **AI chapter summaries** — after marking a chapter complete, offer to generate a spoiler-safe summary. Optional, lazy.
- [ ] **Natural-language chapter entry** — pass textarea input to haiku to extract chapter number from any phrasing. Confirm before update.
- [ ] **Character relationship suggestions** — as reader adds characters and notes, suggest relationships for the map.

---

## Backlog — Lower Priority

- [ ] **Custom cover upload** — let users upload their own cover image
- [ ] **Companion archiving** — archive finished books; visible in library but collapsed
- [ ] **Print / PDF export** — formatted companion document
- [ ] **Series-level library view** — group books by series with series-level progress
- [ ] **Multiple reading sessions per day** — `readingLog` currently dedupes by date
- [ ] **Tablet / desktop layout optimization** — two-column layout for `BookDashboard` on wider screens
- [ ] **Voice input for notes** — `window.SpeechRecognition` for audiobook listeners
- [ ] **`mood` accent in library cards** — subtle color accent on progress bar reflecting book mood

---

## Future Infrastructure

These require a backend and are out of scope for the current localStorage-only architecture:

- User accounts + cloud sync (Supabase / Firebase / PocketBase)
- Cross-device reading session sync
- Open Library / Google Books API for auto-populating chapter count + cover
- Book club companion sharing (read-only mystery + discussion question share)

---

## Completed Milestones

| Milestone | Session | Key deliverables |
|-----------|---------|-----------------|
| Initial scaffold | 1–4 | Library, dashboard, tabs, localStorage |
| Spoiler enforcement pass | 10–11 | `spoiler.js`, graduated visibility, all surfaces wired |
| Weighted progress + chapter types | 12 | `chapterHelpers.js`, `estimatedLength`, prologue/epilogue |
| EPUB import | ~20 | `epubParser.js`, `narrativeExtractor.js`, EpubImportReview wizard |
| Companion presence engine | ~30 | `companionPresence.js`, 13-lens system, 3 tonal styles |
| Session tracking | ~38 | `SessionEntry` shape, `ChapterUpdateModal` duration picker, session history |
| Deletion affordances + AI extraction | 44 | Mystery/discussion deletion, `aiExtractor.js`, re-extraction |
| Six-feature enhancement pass | 45 | AI discussion questions, re-extraction, character editing, notes search, chapter rename, dark mode |
| Companion Intelligence Layer v1 | 46 | `reflectionEngine.js`, AI reflections, voice pass, DebugPage Reflection Inspector |
| Companion Intelligence Layer v2+v3 | 47 | `markReflectionSurfaced` wired, chapter/return reflection surfaces, Discussion Tab continuity header, note intelligence layer (themes/shifts/resonance/clusters), DebugPage Note Intelligence panel |
| Companion Intelligence Layer v4 | 48 | `buildAIReflectionContext` (exported, pure), upgraded AI reflection prompt (voice + diversity), signal-derived priority, `_sourceSignals`/`_sourceLineCount` attribution, DebugPage AI context inspector |
| Immersive Dashboard Pass | 49 | Product rename → Lantern, status-grouped library, atmospheric cards, featured hero card, editorial filter bar, softer TopNav, refined CompanionInsights + CompanionHeader, new CSS atmosphere layer, all docs updated |
| Immersion Choreography Pass | 50 | Route-aware entrance (book-enter vs view-enter), note/mystery form emerge, new note arrival animation, filter pill → text-link consistency (Notes + Mysteries), done-arrive state, delayed reflection entrance, EmptyState + Momentum warm settle, chapter list stagger |
| Deep Reading Immersion + Active Session UX | 51 | Modal backdrop fade + spring settle, note-writing focus dim system, journal-adjacent note textarea, literary placeholder, companion ✦ breathing (9s), progress number softened, dark mode ambient warmth gradient, delayed done-state close button |
