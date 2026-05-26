# Information Hierarchy Audit
**Session 75 · May 15, 2026**

---

## What This Is

An audit of how information is prioritized, weighted, and sequenced across Lantern's surfaces. This is not about what information exists — that is covered by SURFACE_COHERENCE_MAP.md — but about whether the *importance* of information is correctly expressed through layout, typography, and visual weight.

A correct information hierarchy means: the most important thing on a surface is also the most visually prominent. A reader should not need to scan a surface to find what matters.

---

## Library View Hierarchy

### Current State

The library grid presents all books with equal visual weight:
- Cover (largest element)
- Title + Author
- Status badge (Reading / Finished / Paused)
- Progress bar (thin gold line)
- Companion count ("5 companions")

This hierarchy is correct for a library at 5 books. Every book that appears in the active library is worth roughly equal attention.

### Breakdown at Scale

At 40+ books, the equal-weight presentation produces false density. A book not touched in 18 months has the same card weight as one opened this morning. The visual system cannot express the difference between *active reading* and *forgotten but not archived*.

**The dormancy gap.** There is no visual signal for a book that was never explicitly paused or archived but has simply been sitting untouched for months. The status badge can show "Paused" or "Reading" — but only if the reader set that status. A book left on "Reading" for two years looks identical to a book opened yesterday.

**The filter limitation.** The filter bar can show all "Paused" books, but cannot show "dormant Reading" books (books with Reading status that haven't been opened in 90+ days). This is a navigation gap that grows with library size.

**The archive mechanism works, but requires intent.** Books that were abandoned rather than consciously paused tend to linger in the active library indefinitely. The reader would need to notice the absence of activity and manually change the status.

**Philosophy question (not resolved here):** Is the library a mirror (showing exactly what the reader has set) or a witness (showing patterns the reader may not have noticed)? A witness library could auto-dim books that haven't been touched in 90 days. A mirror library shows only what the reader has explicitly set. The current library is a mirror. ALPHA_OBSERVATIONS.md Phase 4 recommends considering whether dormancy should be surfaced automatically.

---

## Book Dashboard Hierarchy

### Header

The header correctly presents the most important information at the top: book identity (title, author), emotional register (mood palette), and reading position (progress bar + chapter). Session count is correctly small.

For finished books, "The story is complete." is the dominant statement, which is correct — it is the most important fact about a finished book's current state.

### Tab Navigation

The tab order (Overview / Notes / Mysteries / Chapters / Characters / Discussion) roughly follows a reading-frequency hierarchy:
- Overview (highest traffic — companion insights, quick progress update)
- Notes (primary annotation surface)
- Mysteries (open questions)
- Chapters (structural map)
- Characters (reference)
- Discussion (discussion questions — least traffic)

This ordering is correct. The tabs the reader uses most frequently are leftmost and first in tab order.

### Companion Insight Strip

The strip runs beneath the header above the tab content — it is always visible regardless of which tab is active. This placement is correct: the companion is ambient, not tab-specific.

**The dot indicator problem.** When the observation pool has 9 items, 9 dots are visible in the strip. This is the most significant information hierarchy failure in the product:

- Nine dots visually communicate "there are nine things to read here"
- The reader perceives this as a queue before reading the first observation
- The companion transitions from ambient presence to content feed

The dots are functionally necessary for navigation (allowing the reader to jump to any observation), but they should not announce the total count. A possible fix: show only 3–5 dots regardless of pool size, with the active dot sliding within that range. This hides the pool depth while preserving navigation.

---

## Notes Tab Hierarchy

### Current State

Note cards present:
- Note text (dominant)
- Tag badge (secondary)
- Date stamp (tertiary)
- Optional reflection text (below note text)
- "+ reflect" and "Edit" affordances (on hover/focus)

This hierarchy is correct. The note content dominates; the tag and date are context rather than primary information. The affordances appearing on hover keeps the tab quiet by default.

### Revised Notes

Notes with `revisedAt` set do not have a visible indicator distinguishing them from unrevised notes. The presence of a `revisedAt` date is valuable temporal information — it tells the reader that a note was returned to and changed. This is currently invisible in the Notes tab UI.

Similarly, notes with a `reflection` field have the reflection text displayed, but there is no visual weight difference between a note that has a reflection and one that does not. Both display the same card layout.

**Minor gap:** The most layered notes (revised + reflected) should have the highest visual weight. Currently they display identically to single-entry notes.

---

## Mysteries Tab Hierarchy

### Current State

Mystery cards present:
- Mystery text (dominant)
- Status badge (secondary)
- Chapter origin ("Ch. 12", tertiary)
- "X ch. open" indicator

The "X ch. open" indicator is the strongest temporal surface in the product. It correctly surfaces time-weight — how long a question has been carried — without announcing it as a feature.

**This hierarchy is correct.** The mystery text dominates; the temporal indicator adds weight without competing. The status badge (Open/Suspected/Evolving/etc.) provides categorical context at a glance.

### Resolved Mysteries

Resolved mysteries display with a "Resolved" badge. Whether they should appear at all in the default view is a question — a reader with 10 resolved mysteries and 3 open ones sees a list dominated by closed cases. A default filter showing only open mysteries (with resolved accessible via toggle) would improve the hierarchy for books with many resolved threads.

This is an enhancement suggestion, not a current deficiency.

---

## Chapters Tab Hierarchy

The chapter list correctly weights starred chapters (`c.important === true`) distinctly from standard chapters. The summary visibility is correctly gated by spoiler mode.

**No hierarchy issues found.**

---

## Characters Tab Hierarchy

The character cards present main and secondary characters in separate sections. The relationship map is a visual overlay of the character space.

**The secondary characters section may overweight relative to its reading-utility.** Secondary characters are often present in greater number than main characters and may dominate the visual space of the Characters tab even though main characters are where the reader's focus lies.

**Minor gap:** No current weighting mechanism to surface the characters the reader has most annotated or theorized about. The character with 5 theory notes looks identical to the character with none.

---

## Summary: Hierarchy Gaps by Priority

| Surface | Issue | Severity |
|---------|-------|----------|
| Companion strip | Dot indicator announces pool depth | High |
| Library | No dormancy signal at scale | Medium |
| Notes tab | Revised/reflected notes not visually distinguished | Low |
| Mysteries tab | Resolved mysteries may dominate list | Low |
| Characters tab | No annotation-weight surfacing | Low |

---

## What Is Well-Designed

**The arc observation's position in the companion strip.** Arc observations always fire first — the reader's position in the story is always the first thing the companion says. This is a correct hierarchy decision: reading position is the most contextually relevant fact.

**The mystery "X ch. open" indicator.** This is the cleanest piece of information hierarchy in the product. A number, quietly present, doing exactly the emotional work needed. No label. No decoration.

**The Notes tab affordances.** `+ reflect` and `Edit` appearing only on hover keeps the tab quiet. The reader is not presented with action affordances they don't need; they appear when attention is focused.

**The finished-book header.** The dominant statement for a finished book is "The story is complete." — not a prompt, not a call to action. The hierarchy correctly places the book's state above any interactive affordance.
