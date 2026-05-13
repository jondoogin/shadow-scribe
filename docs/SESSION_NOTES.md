# Shadow Scribe — Session Notes
Reverse-chronological log of what was built, fixed, and decided in each working session.

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
