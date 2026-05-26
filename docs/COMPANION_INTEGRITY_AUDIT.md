# Companion Integrity Audit
**Session 75 · May 15, 2026**

---

## What This Is

A deep audit of the companion's two core systems — `companionPresence.js` and `reflectionEngine.js` — for behavioral correctness. Not voice (see VOICE_AND_LANGUAGE_AUDIT.md) and not token compliance (see TOKEN_INTEGRITY_AUDIT.md). This is about whether the companion's observations are accurate, well-timed, and structurally sound. Where observations are wrong, misleading, or architecturally broken, this document says so and why.

---

## System Overview

The companion generates two types of output:

**Presence observations** (`companionPresence.js`) — Up to 8 immediate observations based on current book state. Era-filtered for session data. Synchronous. 13 lenses.

**Reflections** (`reflectionEngine.js`) — Up to 5 synthesized observations generated when note/mystery content changes. Cached with 8-hour minimum resurface window. Rule-based (synchronous) or AI-enhanced (async, background). NOT era-filtered.

Both streams are combined in `CompanionInsights.jsx` into a single carousel pool (reflections injected at positions 1 and 4).

---

## Critical Issues

### 1. Reread Era Contamination in Reflection Engine

**Location:** `src/utils/reflectionEngine.js`, `assembleReflectionContext()`

`assembleReflectionContext` does not filter notes by `rereadEra`. All notes — from all reading eras — are analyzed together by:

- `analyzeNoteThemes()` — theme inference across all notes
- `detectInterpretationShifts()` — character valence comparison, early vs. late notes
- `computeResonanceWeights()` — note scoring
- `analyzeTemporalEvolution()` — tag distribution shift, first half vs. second half

The presence system (`companionPresence.js`) correctly filters session data via `eraLog`:
```js
const currentEra = book.rereadCount || 0
const eraLog = log.filter(s => typeof s === 'object' && (s.rereadEra ?? 0) === currentEra)
```

No equivalent filter exists for notes in the reflection engine.

**Concrete failure:** For a rereader of *The Master and Margarita*:
- Era 0 note (2024): `"Woland feels theatrical, performative."`
- Era 1 note (2026): `"Woland's menace feels less theatrical now."`

`detectInterpretationShifts` would generate: `"Your reading of Woland has softened as the story developed."` — which is technically true across both eras but presents a deliberate reread shift as an unconscious evolution within the current reading. The companion is misrepresenting what happened.

More seriously: `analyzeTemporalEvolution` would see 2024 notes as "early" and 2026 notes as "late" within a single chronological progression, potentially generating "confusion-to-theory" or "sustained-theory" observations based on notes spanning two complete readings across two years.

**Fix:** `assembleReflectionContext` should accept a `rereadEra` parameter (defaulting to `book.rereadCount || 0`) and filter notes before analysis:
```js
const currentEra = book.rereadCount || 0
const notes = (book.notes || []).filter(n => (n.rereadEra ?? 0) === currentEra)
```
This requires that note objects carry a `rereadEra` field — which they should at the time of creation, set to the book's `rereadCount` at the time the note was written. Notes without a `rereadEra` field should default to Era 0.

**Note:** Previous-era notes should remain visible in the Notes tab for continuity. The filter applies only to reflection analysis — notes are not deleted or hidden.

---

### 2. Finished-Book Semantic Mismatches

Three observation lenses fire semantically incorrect observations for finished books.

#### 2a. mysteryObs — Anticipatory Language

**Location:** `src/utils/companionPresence.js`, `mysteryObs()`, observational style

For a finished book with 2 unresolved mysteries past chapter 65, the current output is:
```
"Two threads still hang. The novel may be saving something for the end."
```

`"The novel may be saving something for the end"` is anticipatory — it implies the reader has not yet reached the ending. For a finished book, the ending has already occurred. The threads are simply unresolved.

The analytical style equivalent:
```
"Two threads remain. The novel may be conserving them for the end."
```
Same problem.

**Fix:** Add a finished-book variant. When `pct >= 99` and `openCount > 0`:
- Observational: `"${openCount} threads were never resolved. That may be the point."` or `"Some questions this story asked, it didn't answer."`
- Analytical: `"${openCount} unresolved threads at the close. Whether intentional or not, the ambiguity is now part of the book as you've read it."`

#### 2b. momentumObs — "Waiting" Language

**Location:** `src/utils/companionPresence.js`, `momentumObs()`, observational style

For a finished book with a 60+ day gap since the last session:
```
"This story has been waiting a long time. It hasn't changed. You may have."
```

A finished book is not *waiting*. A finished book is *done*. The "waiting" framing implies unfinished business — which is correct for an abandoned reading but wrong for a completed one.

For finished books, a long gap since the last session means: the reader finished it and hasn't returned to add more notes, or hasn't considered rereading. It is a different emotional state from abandonment.

**Fix:** The `momentumObs` function needs to know whether the book is finished. Pass `pct` to the function (it already exists in scope) and add finished-book variants:
- Long gap + finished: `"You finished this ${Math.round(gapDays / 30)} months ago. The ending is still the ending."` or simply skip momentum observations for finished books with long gaps — the arc observation already handles the finished state.

#### 2c. finishedObs and readerObs — Pivotal Chapter Duplication

**Location:** `src/utils/companionPresence.js`, `finishedObs()` and `readerObs()`

For finished books with 3+ starred chapters and fewer than 3 notes, both lenses fire observations about pivotal chapters:

`finishedObs`: `"You marked 3 chapters as pivotal. That instinct is usually right."`  
`readerObs`: `"You've marked several chapters as pivotal. The pattern shows where the story's weight falls."`

These are not identical observations, but they are close enough that encountering them in sequence within the same carousel feels like repetition.

**Fix:** `finishedObs` should check whether `readerObs` is likely to fire on the same data and suppress the duplicate. Or `readerObs` should skip the pivotal-chapter observation when the book is finished and `finishedObs` is already handling it.

---

### 3. Carousel Density Ceiling

**Location:** `src/components/dashboard/CompanionInsights.jsx`

The carousel cap is 8 observations (3 for minimal style). At heavy annotation, the presence pool can reach the cap:

- Arc: always 1
- Finished-book reflection: conditional
- Mystery observations: up to 2 (mysteryObs + lingeringMysteryObs)
- Character observations: up to 2
- Reader lens: up to 5 (multiple conditions)
- Note pattern, interpretation, session rhythm, session stop, pacing, momentum, duration: up to 7 more

The cap of 8 truncates at 8 items, but reflections are injected on top of the presence pool before the final display — making the functional ceiling higher than 8 in the displayed carousel.

At 9 observations (current UTWB count), a full carousel rotation at 7 seconds takes 63 seconds. A reader returning to a frequently-annotated book will see the same 9 observations rotating for several visits before any content changes.

**Session 74 finding:** The threshold where the carousel tips from companion presence to content feed is approximately 5 items. Above 5, the dot indicator announces the count and the act of reading the strip becomes a task.

**Fix:** Apply a ceiling of 5 in the combined pool (presence + reflections), not 8. The `style === 'minimal'` cap is already correctly set at 3. The standard cap should be reduced from 8 to 5. This does not require changing what the companion can observe — only how many observations it surfaces at one time.

---

## Architecture Observations

### pick() Has No Exhaustion Tracking

**Location:** `src/utils/reflectionEngine.js`, `generateRuleBasedReflections()`

```js
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
```

`pick()` selects randomly from an array of string variants for each reflection type. There is no tracking of which variant was last shown. On regeneration (every 3 days), the same variant may be selected twice in a row. At 3 variants per type, the odds of seeing the same string on consecutive regenerations are 1-in-3.

This is a low-severity issue — the 3-day regeneration window means most readers won't notice. But under heavy annotation (where the `shouldRegenerate` guard fires on content changes), the same variant can appear within a week.

**Fix:** When writing the reflection cache, store the selected variant index alongside the text. On next regeneration, `pick()` should skip the most recently shown variant. This is a simple one-line change in the entry factory.

---

### MIN_RESURFACE_MS Behavioral Note

The 8-hour minimum resurface window in `getActiveReflections` is correct and intentional. Reflections that have been shown within 8 hours are excluded from the active pool, ensuring the reader doesn't see the same reflection twice in one day. This is working as designed.

`pickReturnReflection` (used when a reader returns after a long pause) deliberately ignores the 8-hour window. Any reflection is treated as fresh after an absence. This is also correct — a reader returning after 30 days hasn't seen their reflections recently.

---

### shouldRegenerate — 3-Day Staleness Window

```js
export function shouldRegenerate(book, contextHash) {
  const cache = book.reflectionCache
  if (!cache?.contextHash) return true
  if (cache.contextHash !== contextHash) return true
  const ageMs = Date.now() - new Date(cache.generatedAt).getTime()
  return ageMs > 3 * 86_400_000  // 3 days
}
```

The 3-day window means reflections are regenerated on content change OR after 3 days of staleness, whichever comes first. This is correct. A reader who annotates heavily will regenerate often; a reader who only reads without annotating will see a refresh every 3 days.

---

## Priority Matrix

| Issue | Severity | Fix Complexity | Status |
|-------|----------|----------------|--------|
| Reread era contamination in reflection engine | Critical | Medium | Unimplemented |
| mysteryObs anticipatory language for finished books | High | Low | Unimplemented |
| momentumObs "waiting" for finished books | High | Low | Unimplemented |
| Carousel density ceiling (8 → 5) | High | Low | Unimplemented |
| finishedObs/readerObs pivotal chapter duplication | Medium | Low | Unimplemented |
| pick() exhaustion tracking | Low | Low | Unimplemented |
