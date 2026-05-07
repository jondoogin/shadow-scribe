# Shadow Scribe — Feature Backlog
Prioritised list of improvements and new features. Updated 2026-05-06.

Status key: `[ ]` not started · `[~]` in progress · `[x]` done

---

## P0 — Critical (do first)

- [ ] **`localStorage` persistence**  
  Serialize `books` state on every update; hydrate on mount. Single `useEffect` + `useState` initializer. Without this, every note, mystery toggle, and progress update is lost on refresh.  
  _Effort: ~20 lines_

- [ ] **Wire `DiscussionTab` questions into book state**  
  User-added questions currently live in local component state and disappear on tab switch. Add to `book.discussionQuestions` via `onUpdateBook`.  
  _Effort: ~10 lines_

- [ ] **ESC key closes `ChapterUpdateModal`**  
  Standard accessibility expectation. Copy `useEffect` keydown pattern from `TopNav`.  
  _Effort: 5 lines_

---

## P1 — High value

- [ ] **`mood` selection in `CreateCompanion`**  
  Add a color swatch row (5 mood options) to the wizard. Currently all new books default to `'gold'`.

- [ ] **`spoilerMode` enforcement**  
  The field is collected but never used. Minimum viable: in `CharactersTab`, blur/hide `lastSeen` and `description` for characters whose `lastSeen` chapter > `book.currentChapter` when `spoilerMode === 'strict'`.

- [ ] **Edit / delete notes**  
  Notes can be added but not removed or corrected. Add inline edit mode and a delete button.

- [ ] **Edit / add mysteries manually**  
  Mysteries are currently pre-authored in `data.js`. Users should be able to add their own open questions from the Mysteries tab.

- [ ] **Edit / add characters**  
  Characters are pre-authored. Users should be able to add characters they encounter and fill in details progressively.

- [ ] **Cover image management**  
  No UI to update a book's ISBN or re-attempt a cover fetch. Add an "Edit" action on `CompanionHeader` that lets users update ISBN / choose gradient color.

---

## P2 — Medium value

- [ ] **URL routing (`react-router-dom`)**  
  Routes: `/` (library), `/book/:id` (dashboard → defaults to progress tab), `/book/:id/:tab`, `/new`. Enables browser back button, bookmarkable URLs, direct deep-links.

- [ ] **Edit book metadata**  
  No way to change title, author, total chapters, format, spoiler mode, or mood after creation. Add a Settings tab or edit modal.

- [ ] **Book status transitions**  
  No UI to change a book from `reading` to `finished` or `paused`. Should auto-offer "Mark as finished" when `currentChapter === totalChapters`.

- [ ] **Notes: edit + delete**  
  Currently add-only. Should support inline editing and soft-delete.

- [ ] **Series progress across books**  
  The `series` field tracks position and total. A potential library view enhancement: group books by series and show series-level progress bar.

- [ ] **Import / export JSON**  
  Export a single book's companion data as JSON. Import to restore or share with a book club member.

- [ ] **Keyboard navigation in modals**  
  `ChapterUpdateModal` auto-focuses textarea but doesn't trap focus. Should follow ARIA modal dialog pattern.

- [ ] **Loading shimmer for covers**  
  `BookCover` has a layout shift while the Open Library image loads. Show a gradient placeholder that fades to the real image.

- [ ] **Fix `DiscussionTab` AccordionList for large question sets**  
  Currently renders all questions as a flat list. Should collapse/expand if a book has many questions.

---

## P3 — Nice to have

- [ ] **Multiple reading sessions in the same day**  
  `readingLog` dedupes by date — only one entry per day. A future enhancement might track session count within a day.

- [ ] **`mood` displayed in library cards**  
  Library `BookCard` doesn't visually reflect the book's mood. Consider a subtle color accent on the progress bar.

- [ ] **Print / PDF view**  
  A print stylesheet for exporting a book's full companion as a formatted document.

- [ ] **Dark mode**  
  The current palette (cream backgrounds, ink text) is warm and intentional. A dark mode would need a carefully designed alternative — not just color-invert.

- [ ] **Custom cover upload**  
  Let users upload their own cover image instead of relying on Open Library.

- [ ] **Companion archiving**  
  When a book is `finished`, offer to "archive" it — visible in library but collapsed, not polluting active reading view.

- [ ] **`RelationshipMap` interactivity**  
  Currently read-only. Future: click a node to highlight its connections; click a line to edit the label/type.

- [ ] **Tablet / desktop layout optimisation**  
  Current layout is mobile-first and scales reasonably, but the `BookDashboard` could use a two-column layout on wider screens (sidebar + content).

---

## AI integration opportunities (future)

- [ ] **AI-assisted chapter summaries**  
  After marking a chapter complete, offer to generate a spoiler-safe summary using Claude. Optional, lazy — don't auto-generate.

- [ ] **Contextual insights from real chapter content**  
  Replace or augment the rule-based `generateInsights` with an LLM call that reads actual summaries and notes. The function signature is clean for this swap.

- [ ] **Discussion question generation**  
  Generate per-book discussion questions using title, author, and accumulated notes/theories.

- [ ] **Natural-language chapter entry improvement**  
  Pass textarea input to an LLM to extract chapter number from any phrasing ("almost done with it", "just started act two", "finished right before the twist"). Confirm with user before update.

- [ ] **Character relationship suggestions**  
  As the user adds characters and notes, suggest relationships to add to the map.

- [ ] **Voice input for notes**  
  `window.SpeechRecognition` for quick voice-to-text notes — especially useful for audiobook listeners.

---

## Infrastructure (when backend is added)

- [ ] **User accounts + cloud sync** (Supabase / Firebase / PocketBase)
- [ ] **Open Library / Google Books API integration** for auto-populating chapter count, description, cover
- [ ] **Cross-device reading session sync** (update chapter count from phone while reading in bed)
- [ ] **Book club sharing** — share a companion's discussion questions and mysteries (read-only) with others
