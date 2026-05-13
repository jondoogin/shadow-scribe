# Shadow Scribe — Roadmap
**Last updated:** 2026-05-13 (Session 47)

---

## Active Milestone Queue

### Milestone: Companion Intelligence Layer v4 — AI Note Intelligence
Use the API to enhance note intelligence signals when conditions allow (key present + ≥8 notes).

**Planned work:**
- Pass theme distribution, interpretation shifts, and high-resonance note texts to the AI reflection call
- Let the AI generate an `interpretation-shift` type reflection from richer language than the rule-based SHIFT_TEXT map allows
- Improve AI reflection prompting to mention which themes and characters the reader has been tracking
- Deduplicate AI + rule-based reflections by semantic proximity (hash or embedding)

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
