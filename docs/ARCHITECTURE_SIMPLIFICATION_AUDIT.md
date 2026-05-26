# Architecture Simplification Audit
**Session 75 · May 15, 2026**

---

## What This Is

An audit of the codebase for dead code, duplication, and structural complexity that provides no current value. The goal is not a refactor — it is an inventory of what can be safely removed or consolidated, and what should be left alone despite looking like a candidate for simplification.

No changes are made here. This is a decision document.

---

## Dead Files

### src/data.js

**Status: Dead file. Safe to delete.**

`src/data.js` is a legacy duplicate of `src/data/books.js`. It defines a `INITIAL_BOOKS` array using the old string-based readingLog format:

```js
// src/data.js (old format)
readingLog: ['2026-05-02', '2026-05-03', '2026-05-04']
```

`src/data/books.js` (the current source) uses the full SessionEntry format:
```js
readingLog: [
  { id: 'session_1', date: '2026-05-02', startChapter: 0, endChapter: 2, durationEstimate: 'brief', rereadEra: 0 }
]
```

A codebase-wide grep for imports of `src/data.js` finds zero consumers. The file is not imported anywhere. It was superseded when the reading log format was migrated to SessionEntry objects (Session 43 or earlier).

**Risk of deletion:** None. The file is not imported, not referenced, and the data it contains is a stale duplicate.

**Migration concern:** `src/utils/storage.js` contains a `normalizeReadingLog` function that handles the old string format as a migration path:
```js
function normalizeReadingLog(log) {
  if (!Array.isArray(log)) return []
  return log.map((entry, i) => {
    if (typeof entry === 'string') {
      return { id: `migrated_${entry}_${i}`, date: entry, startChapter: 0, endChapter: 0, rereadEra: 0 }
    }
    return entry
  })
}
```
This migration guard in `storage.js` should remain — it protects users who may have old localStorage data in the string format. But `src/data.js` itself can go.

---

## Dead Code in Active Files

### Unused IndexedDB Functions in storage.js

**Location:** `src/utils/storage.js`, lines 107–158

Three IndexedDB functions are defined but never called anywhere in the codebase:
- `openNarrativeStore()`
- `saveChapterText(db, bookId, chapterNum, text)`
- `loadChapterText(db, bookId, chapterNum)`

The file contains this comment:
```js
// ── IndexedDB groundwork (not yet activated) ──────────────────────────
// These functions are prepared for when raw chapter text storage is needed
// (e.g. AI re-extraction passes). They are not called anywhere in the current
// import flow — extraction happens in memory and only artifacts are persisted.
```

This code was written in Session 43 as future infrastructure for a use case that hasn't been built. The use case (re-extraction from stored raw chapter text) is a legitimate future need, but the current code:
1. Is not tested
2. Is not called
3. Adds ~50 lines of IndexedDB plumbing that readers of the file must reason around

**Decision:** Keep or delete? The comment accurately describes the intent and the ARCHITECTURE.md documents this as groundwork. **Recommendation: keep**, but document in ROADMAP.md that this code exists and is waiting for the re-extraction feature. The cost of maintaining it is near-zero; the cost of rediscovering the IndexedDB migration need if deleted is higher.

---

## Duplicated Logic

### MOOD_COLORS in CreateCompanion.jsx and EpubImportReview.jsx

Both `src/components/library/CreateCompanion.jsx` and `src/components/library/EpubImportReview.jsx` define an identical `MOOD_COLORS` object mapping mood names to hex accent and background colors.

This is a clear candidate for extraction to a shared constant. The object should live in one place — likely `src/data/moods.js` or `src/utils/moods.js` — and be imported by both components.

**Risk:** Low. This is a pure refactor with no behavioral change.

**The MOOD_COLORS object in these files is not the same as the CSS token system.** It provides JavaScript-accessible color values for mood picker preview UI (inline styles in React). The CSS token system (`[data-mood]` attribute approach) is the runtime theming mechanism; these objects are used at the mood-selection step before a mood is applied. They serve different purposes and both are needed.

What is not needed is two copies of the same object.

---

### Theme Keyword and Name Blocklist Maintenance Surface

**Location:** `src/utils/reflectionEngine.js`, `THEME_KEYWORDS` and `NAME_BLOCKLIST`

`THEME_KEYWORDS` (11 themes, ~70 keywords) and `NAME_BLOCKLIST` (50+ common English words) are defined as module-level constants with no tests. If a keyword is misspelled or a name is incorrectly blocklisted, the note intelligence system silently produces wrong results.

This is not dead code — these are active and important. But they are invisible to the developer without either tests or the DebugPage inspector. The DebugPage AI inspector (`src/pages/DebugPage.jsx`) does expose note intelligence signals, which partially addresses this.

**Status:** Not a simplification target. Flagged for test coverage.

---

## Complexity That Is Correct

### The Dual useEffect Architecture in CompanionInsights.jsx

`CompanionInsights.jsx` uses two refs (`surfacedThisSessionRef`, `reflectionCacheRef`) specifically to avoid adding `book.reflectionCache` to the reflection generation effect's dependency array. This is intentional and correct:

```js
// book.reflectionCache must not be in CompanionInsights useEffect deps — causes save→trigger loop
```

The pattern looks like unnecessary complexity (why not just read the prop?) but the reason is real: adding `book.reflectionCache` to the effect deps causes a loop where generating reflections triggers a save, which triggers the effect, which regenerates reflections. The ref-based solution is the correct way to break this cycle without adding a memoization layer.

**Status:** Correct as-is. Document in ARCHITECTURE.md if not already there.

---

### normalizeReadingLog in storage.js

The `normalizeReadingLog` migration guard is not dead code — it is actively needed for any user who has localStorage data from before the SessionEntry format change. It looks like safety code that could be removed, but removing it would silently break old data on load.

**Status:** Keep indefinitely.

---

## Summary Table

| Item | Location | Action | Risk |
|------|----------|--------|------|
| src/data.js | Root | Delete | None |
| IndexedDB functions | storage.js:107–158 | Keep, document in ROADMAP | N/A |
| MOOD_COLORS duplication | CreateCompanion.jsx, EpubImportReview.jsx | Extract to shared constant | Low |
| Dual ref pattern in CompanionInsights | CompanionInsights.jsx | Keep, document | N/A |
| normalizeReadingLog | storage.js | Keep indefinitely | N/A |
