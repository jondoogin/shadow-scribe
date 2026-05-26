# Surface Coherence Map
**Session 75 · May 15, 2026**

---

## What This Is

A complete map of every surface in Lantern, what it shows, and whether it is coherent with the product's voice and spoiler contract. The goal is to identify inconsistencies between surfaces — where the same data reads differently depending on which tab the user opens, or where a surface's presence or absence is unintentional.

---

## Surface Inventory

### Library View

**What it shows:** Book cards with title, author, mood swatch, progress bar, status badge, companion count.

**Coherence:** Correct at 5 books. The visual hierarchy between active and finished/paused books is maintained through badge state only — there is no visual dormancy signal for books last opened months ago. A book not touched in 18 months displays identically to one opened this morning.

**Gap:** False density at scale. At 40+ books, dormant books cannot be visually distinguished from active ones. The filter bar helps but cannot distinguish a dormant "Reading"-status book from an active one. This is documented in ALPHA_OBSERVATIONS.md Phase 4.

**Status:** Functionally correct, visually incomplete at scale.

---

### Library → Archived Section

**What it shows:** Books marked archived at opacity-60 with visual separation from active shelf.

**Coherence:** The archive mechanism is correct. The problem is upstream: books that were abandoned rather than intentionally archived never reach this section. The archive serves its purpose when used; the question is what happens to books the reader never explicitly archived.

**Status:** Correct as designed.

---

### Book Dashboard — Header

**What it shows:** Cover/title/author, mood swatches, progress bar, current chapter, session count, spoiler mode indicator. For finished books: "The story is complete." plus "begin again · archive this companion" affordances. For in-progress books: no finish-state language.

**Coherence:** The header is the most consistently calm surface. Session count ("3 sessions recorded.") is honest and small. Mood swatches offer colour without demanding interaction.

**Finished-book header:** Correct. "begin again" is tonally precise. The affordance acknowledges the weight of returning to something already finished.

**Status:** Correct.

---

### Book Dashboard — Companion Insight Strip (CompanionInsights.jsx)

**What it shows:** A horizontally cycling carousel of observations. Maximum 8 items (3 for minimal style). Auto-advances every 7 seconds with 420ms fade. Navigation dots visible when more than 1 observation.

**Architecture:** Two-layer pool. Layer 1: `generatePresence()` — up to 8 immediate contextual observations. Layer 2: `getActiveReflections()` — up to 3 cached synthesis reflections injected at positions 1 and 4 in the pool.

**Generation trigger:** The reflection generation effect fires when `book.notes.length`, `book.currentChapter`, `book.readingLog.length`, or `book.mysteries.length` change. The `book.reflectionCache` is deliberately excluded from effect dependencies to avoid a save→trigger loop.

**Minimum threshold:** Reflections are only generated when `noteCount >= 3` OR `openMysteries >= 2`. Below this threshold, the strip shows presence observations only.

**Coherence issues:**

1. **Carousel density.** At heavy annotation (10+ notes, 4+ mysteries), the presence pool can reach 8 items and reflections add 2 more, for a potential pool of 10 before the cap of 8 truncates. Under the Whispering Door currently generates 9 observations. At 9 items × 7 seconds, a full rotation takes 63 seconds. The carousel shifts from companion presence to content feed above approximately 5 items.

2. **Navigation dot count announces the burden.** Nine dots in a row visually communicate "there are nine things to read" before the reader has read any of them. The act of consuming the strip becomes a task.

3. **Finished-book strip inconsistency.** A finished book with sparse annotation (Republic of Thieves, 2 notes) renders no `.insight-strip` element — the DOM contains nothing. A finished book with dense annotation (10 notes) renders the full carousel. This asymmetry is either correct silence or an unintentional edge case; it has not been resolved.

4. **Reflection injection positions.** Reflections at positions 1 and 4 feel interspersed in a 5-item pool; they become invisible injection points in a 9-item pool where the user may not reach position 4 before the next session.

**Status:** Architecturally correct but requires a density ceiling. See COMPANION_INTEGRITY_AUDIT.md.

---

### Book Dashboard — Notes Tab

**What it shows:** Note cards with text, tag, date, optional reflection. Tag filter bar. "+ reflect" affordance. Edit affordance.

**Coherence:** The notes tab is one of the strongest temporal surfaces. Cards with dates ("April 30 / May 1 / May 2") create a quiet chronological texture that accumulates over weeks of annotation. The tag filter is quick. The `+ reflect` affordance is quietly available without competing for attention.

**Spoiler safety:** Notes are not filtered by spoiler mode — the user wrote them, so they can see them regardless of boundary. This is correct.

**Reread era:** Notes from all eras are visible in the Notes tab. Era 0 and Era 1 notes appear together. This is correct for the Notes tab; the problem is that `reflectionEngine.js` analyzes them together for reflection generation. See COMPANION_INTEGRITY_AUDIT.md.

**Status:** Correct.

---

### Book Dashboard — Mysteries Tab

**What it shows:** Mystery cards with text, status badge, chapter origin, optional observation. "X ch. open" indicator showing chapters elapsed since mystery was opened.

**Coherence:** The mysteries tab is the strongest archival surface in the product. The "X ch. open" indicator is a genuinely temporal surface — it shows how long a question has been carried without announcing it. This is doing honest emotional work.

**Spoiler safety:** Mysteries respect the spoiler boundary. Mysteries with `visibilityThreshold > currentChapter` are veiled or hidden depending on spoiler mode. This is correctly implemented.

**Finished-book mysteries:** Unresolved mysteries for finished books display with the same observation-for-active-reading language. `mysteryObs` fires `"The novel may be saving something for the end"` for a finished book with 2 unresolved mysteries past chapter 65. This is a semantic mismatch. See COMPANION_INTEGRITY_AUDIT.md.

**Status:** Mostly correct. Semantic mismatch on finished-book mystery observations.

---

### Book Dashboard — Chapters Tab

**What it shows:** Chapter list with completion state, title (spoiler-aware), summary (spoiler-aware), optional reflection, starred/important flag.

**Coherence:** Correctly implements spoiler boundary. In strict mode, chapter titles beyond `currentChapter + 1` are obscured. Summaries for unread chapters are hidden.

**Status:** Correct.

---

### Book Dashboard — Characters Tab

**What it shows:** Main/secondary character cards with description, status, allegiance, last seen, role. Relationship map (RelationshipMap.jsx). User-editable character fields.

**Coherence:** Character visibility correctly respects spoiler boundary. Characters not yet met are either hidden (strict mode) or shown with veiled description/status (relaxed mode). Allegiance shifts that happen after the reader's boundary are partially obscured.

**The relationship map** renders as a canvas visualization with typed edges (love, ally, tension, hierarchy, neutral). Edge colors are hardcoded and do not use the token system. See TOKEN_INTEGRITY_AUDIT.md.

**Status:** Correct for spoiler safety. Token compliance gap in RelationshipMap.

---

### Book Dashboard — Discussion Tab

**What it shows:** AI-generated or manually added discussion questions. Spoiler-aware visibility by chapter threshold.

**Coherence:** Questions respect spoiler boundary. Questions with `visibilityThreshold > currentChapter` show alternate text or are hidden.

**Status:** Correct.

---

### Settings Page

**What it shows:** Spoiler mode global setting, insight style preference, export/import library, API key entry, dark mode toggle. Section descriptions and footer.

**Coherence:** Settings are functional. The export filename (`shadowscribe-library-${date}.json`) uses the old product name. Several section description strings reference "Shadow Scribe". The API key entry is correctly handled — key is stored in localStorage settings under `anthropicKey`.

**Status:** Functionally correct. Naming residue in copy.

---

### Debug Page

**What it shows:** Book-level debug inspector. Reflection cache state, note intelligence signals, presence generation output, context hash. AI inspector panel.

**Coherence:** Internal tool only; not part of the reader experience. "Shadow Scribe" appears in header labels. Not a priority for copy.

**Status:** Correct as developer tooling.

---

## Cross-Surface Coherence Issues

### The Finished-Book State

The finished-book experience is incoherent across surfaces:

| Surface | Finished-book behavior |
|---------|----------------------|
| Header | Shows "The story is complete." + begin again/archive |
| Companion strip | Variable — silent for sparse books, full carousel for dense |
| Mysteries tab | Shows unresolved mysteries with active-reading language |
| Momentum obs | "This story has been waiting a long time" fires for finished books with long gaps |
| Arc observation | Correctly shows "You've reached the last page. What remains now is the story's echo in you." |

The header and arc observation handle the finished state correctly. The companion strip, mystery observations, and momentum observations do not.

### The Reread State

For books on a second+ reading era:

| Surface | Reread behavior |
|---------|----------------|
| Header | Shows "begin again" affordance correctly; updates rereadCount |
| Presence observations | Correctly era-filtered via `eraLog` |
| Reflection generation | NOT era-filtered — all notes from all eras analyzed together |
| Notes tab | Shows all eras' notes together (correct for Notes tab) |

The presence system and reflection system handle the reread state differently. This is an architectural gap. See COMPANION_INTEGRITY_AUDIT.md.

---

## Summary

The product surfaces are largely coherent in isolation. The inconsistencies appear at boundary states — finished books and rereads — where the presence system handles the state but the reflection system does not. The companion insight strip is the primary incoherence risk due to density at heavy annotation and unresolved silence behavior for finished books.
