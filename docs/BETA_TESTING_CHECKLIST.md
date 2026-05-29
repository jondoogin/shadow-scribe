# Shadow Scribe — Beta Testing Checklist
**Version:** Session 120 (2026-05-26)

Practical checklist for external beta testers and internal QA. Not exhaustive — focuses on the flows most likely to surface real-world issues.

---

## 1. First Launch + Onboarding

- [ ] App loads without error on first visit (no prior localStorage)
- [ ] Empty shelf shows correctly with the companion explanation copy
- [ ] "Begin your first companion →" link navigates to New Companion page
- [ ] TopNav shows correctly; "New Companion" button visible on desktop, "New" on mobile
- [ ] No demo data appears unless user explicitly resets to demo

---

## 2. Manual Companion Creation

- [ ] Title field is required — Continue button disabled until filled
- [ ] All three formats (Print / E-Book / Audiobook) selectable
- [ ] All six mood colors selectable and preview updates
- [ ] Chapter count input accepts numbers; companion created with correct count
- [ ] Series toggle reveals series fields; companion summary reflects them
- [ ] All three spoiler modes selectable with clear descriptions
- [ ] Companion created and appears in library immediately after "Begin the companion"
- [ ] New book opens to Progress tab at 0% with first-use banner visible

---

## 3. EPUB Import

- [ ] EPUB file drag/drop or file picker works
- [ ] Title and author are extracted correctly for a clean EPUB
- [ ] Chapter count matches expected for the book
- [ ] Noise chapters (foreword, acknowledgments, about the author) are filtered out
- [ ] Word-ordinal chapters ("Part One", "Act Three") detected as `part` type, not `chapter`
- [ ] Chapter types can be cycled by tapping the type badge
- [ ] Chapter titles can be edited inline
- [ ] Cover art shows from EPUB data or via ISBN fallback
- [ ] With API key: AI extraction runs, loading overlay shows atmospheric phrases
- [ ] Without API key: rule-based extraction runs, loading overlay shows correct phrases
- [ ] AI extraction fallback (key set but call fails): extraction completes silently, warning shown in Progress tab
- [ ] Warning in Progress tab can be dismissed (does not reappear after dismiss)
- [ ] Malformed EPUB: shows error message below file picker; does not crash
- [ ] Very large EPUB (60+ chapters): handles gracefully, chapter list scrollable

---

## 4. Spoiler Safety

- [ ] Strict mode: future character names hidden or veiled; future chapter titles not visible
- [ ] Relaxed mode: chapter titles visible; character descriptions veiled for future characters
- [ ] Full mode: all characters and chapter titles visible
- [ ] Switching spoiler mode on per-book basis works without requiring app reload
- [ ] Characters with `revealChapter` beyond `currentChapter` are veiled correctly
- [ ] Mysteries from future chapters are not surfaced in relaxed/strict mode

---

## 5. Reading Progress

- [ ] Chapter checklist renders correctly for all chapter counts
- [ ] Checking a chapter marks it complete; unchecking reverses it
- [ ] `currentChapter` updates to the highest completed chapter
- [ ] Progress percentage updates correctly
- [ ] Session log entry created when using chapter update modal
- [ ] Session log shows date, chapter range, and duration estimate
- [ ] "Log your first session" CTA appears when progress = 0% and no sessions logged
- [ ] Chapter title can be renamed inline in the checklist

---

## 6. Companion Reflections

- [ ] Reflections appear in the companion carousel after 3+ notes exist
- [ ] Carousel cycles through reflections (prev/next navigation)
- [ ] Reflections are not generated when note count < 3
- [ ] AI reflections appear when API key is set and 5+ notes exist
- [ ] Reflection cache is cleared on reread start
- [ ] Insight style setting changes reflection voice (observational / analytical / minimal)
- [ ] Rule-based reflections fire correctly for theory notes, temporal patterns, reading rhythm
- [ ] Return moment appears after a gap of 7+ days between sessions
- [ ] Post-finish reflections appear when book progress ≥ 99%

---

## 7. Notes + Mysteries

- [ ] Notes can be added with all tag types (theory, character, confusing, favorite, theme, quote, general)
- [ ] Notes can be edited and revised (revisedAt field updates)
- [ ] Notes can have a reflection added (second-thought layer)
- [ ] Notes are chapter-scoped; spoiler mode affects visibility
- [ ] Mysteries can be created, observed, and resolved
- [ ] Mystery observations and original text preserved
- [ ] On reread: old mysteries archived; new mysteries stamped with current era

---

## 8. Reread Flow

- [ ] "Start another reading" confirmation shows archival framing copy
- [ ] Restart clears progress, reflection cache, and archived mysteries
- [ ] Previous era mysteries appear in "From a previous reading" section (read-only)
- [ ] New mysteries and notes created in new era are correctly era-stamped
- [ ] BookCard shows "Nth reading" label when rereadCount > 0
- [ ] Arc observations on Progress tab use reread-aware phrasing for returning readers

---

## 9. Export / Import

- [ ] Export produces a valid JSON file with correct filename (date-stamped)
- [ ] Import from exported file restores all companions
- [ ] Duplicate companions (same ID) are skipped during import
- [ ] Import of older-format file shows warning but still imports
- [ ] Import of invalid JSON shows error message
- [ ] Import of schema-newer file shows version mismatch warning

---

## 10. Settings

- [ ] Dark mode toggle persists across page reloads
- [ ] Insight style change takes effect on next reflection generation
- [ ] Default format and spoiler mode apply to new companions created after changing
- [ ] API key saves correctly; "Active" badge appears
- [ ] API key cleared with Clear button; "Not set" badge appears
- [ ] Storage usage indicator appears when usage > 10% of 5MB
- [ ] Storage warning (amber) shows at 70%; critical (sienna) at 90%
- [ ] Export disabled when no companions exist
- [ ] Reset to Demo requires two-click confirmation; restores demo companions

---

## 11. Failure States + Error Handling

- [ ] App survives any React render error — boundary shows "Something went wrong" recovery UI
- [ ] Reload from error boundary returns to working state with data intact
- [ ] localStorage full: `saveBooks` fails silently (no data loss — existing data preserved)
- [ ] Book not found by ID: redirects to library (no crash)
- [ ] Empty extraction output: companion created without characters/mysteries (not blank screen)
- [ ] AI API key invalid (401): error shown in extraction flow or falls back gracefully
- [ ] AI API rate limited (429): error message shown; no silent failure

---

## 12. Mobile QA

- [ ] Empty shelf, library grid, and search/filter controls usable on phone
- [ ] Book card tap opens book correctly (no accidental navigation)
- [ ] Tab bar in book view scrollable horizontally if tabs overflow
- [ ] Sticky mobile "Tell the companion where you are" button visible when reading
- [ ] Chapter update modal usable on phone (opens above keyboard, scrollable)
- [ ] Notes tab: note creation form usable with keyboard open
- [ ] Long chapter titles truncate gracefully; chapter checklist rows not overflowing
- [ ] EPUB chapter list (320px max-height) scrollable; type badge and title both tappable

---

## 14. Session 120 — UX Hardening (new items)

- [ ] Dark mode toggle: ☀︎/◗ button visible in nav bar at all times; switches mode without opening menu
- [ ] Dark mode toggle: hamburger menu also still has the toggle (both work)
- [ ] Chapter update modal: NLP input receives focus immediately on open (no extra tap needed)
- [ ] Chapter update modal: typing "chapter twenty" shows "→ Chapter 20" feedback below input
- [ ] Chapter update modal: typing "done" or "finished" resolves to final chapter
- [ ] Chapter update modal: input NOT cleared when clicking elsewhere (field holds value until submit)
- [ ] Chapter update modal: Enter key in NLP input submits the update
- [ ] Chapter update modal: Escape closes the modal
- [ ] Edit metadata: "· edit" form auto-focuses the title field
- [ ] Edit metadata: total chapters field is present and pre-filled with current value
- [ ] Edit metadata: changing total chapters rebuilds the chapter list (new chapters scaffold, existing preserved)
- [ ] Edit metadata: Enter in any field saves; Escape cancels
- [ ] Edit metadata: Save button disabled while title field is empty
- [ ] Status confirm dialog: confirm button is auto-focused when dialog appears
- [ ] Status confirm dialog: Enter confirms; Escape cancels
- [ ] Desktop (1024px+): CompanionPanel sidebar visible to the right of tab content
- [ ] Desktop: CompanionPanel shows "COMPANION" label, current observation, open questions
- [ ] Desktop: CompanionPanel sidebar sticks while scrolling main content
- [ ] Companion strip: hovering a reflection (cached, not a presence observation) shows ✕ dismiss button
- [ ] Companion strip: clicking ✕ dismisses the reflection and advances to next observation
- [ ] Companion strip: long-pressing (700ms) a reflection on mobile dismisses it
- [ ] Companion strip: when reflection pool is saturated, shows "Add more notes to refresh companion thoughts."

---

## 13. Atmosphere + Trust

- [ ] Companion voice feels consistent across: companion observations, reflections, return moments, and post-finish state
- [ ] No chatbot-style phrases ("I notice", "It seems", "That's a kind of reading")
- [ ] No evaluative praise ("that's a deep reading", "well-noticed")
- [ ] Companion presence feels quiet and earned — not intrusive or frequent
- [ ] Empty states (no notes, no mysteries, no reflections) feel natural — not broken
- [ ] Loading states (EPUB extraction, AI generation) are calm, not anxious
- [ ] Error messages are non-technical and do not blame the user

---

## Known Beta Risks (as of Session 61)

- **localStorage-only storage**: No cloud sync; data loss possible if browser storage is cleared. Mitigated by export reminder and storage indicator. Users should export regularly.
- **AI extraction cost**: Each EPUB import with API key costs ~1¢–3¢. No rate limiting or budget enforcement. Monitor if beta scales.
- **Large EPUB covers**: base64 cover images in localStorage can be large (50–150KB per book). Storage indicator will surface this, but no automatic compression.
- **Re-extraction not available**: Books cannot be re-extracted after initial import without re-importing the EPUB. Planned future feature.
- **No account / sync**: Beta is fully local. Tester data cannot be shared or recovered if browser data is cleared.
- **Shadow Mode and Presence Frequency**: Settings exist in UI but are not yet functional ("Soon" badges). May confuse testers.
