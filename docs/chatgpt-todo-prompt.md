# Prompt: Append New To-Dos to Lantern Project List

Hey — I need you to append the following items to our existing Lantern (Shadow Scribe) to-do list. These came out of a Claude Code analysis of the live codebase and site. Add them under whatever organizational structure we already have, grouping by priority as indicated below. Don't reorganize or rewrite what's already there — just append these cleanly.

---

## Items to Append

### Must Fix (Known Bugs / Blockers)

- **Dark mode toggle discoverability** — The full dark mode palette is implemented and works, but the toggle is buried in the Settings page. Most users will never find it. Move or duplicate the toggle to the top nav.
- **ChapterUpdateModal NLP** — Current parsing can't handle ordinals ("fifth"), spelled-out numbers ("chapter five"), or phrases like "finished the book." Needs stronger natural-language parsing before this is a reliable input.
- **Mobile keyboard handling** — On mobile, the note/chapter textarea can get obscured by the on-screen keyboard. Needs scroll-into-view or viewport adjustment on focus.
- **Streak timezone bug** — `calcStreak` uses local time with no timezone normalization. Readers crossing midnight in different timezones will have streaks miscounted. Fix to use UTC date comparison.

### High Priority (UX Gaps)

- **Reflection dismissal UI** — Users can't dismiss a bad or stale companion reflection. It just loops. Add long-press (mobile) or hover (desktop) to suppress individual reflections. Roadmap already flags this.
- **Reflection deduplication** — Similar rule-based reflections can stack in the carousel with no dedup logic. Add similarity detection before surfacing.
- **Reflection pool saturation detection** — If notes haven't changed, the reflection pool stagnates. Add detection and a fallback state ("Add more notes to unlock new reflections" or similar).

### Medium Priority (Polish & Completeness)

- **Tablet two-column layout** — Dashboard is single-column at all widths. Add a two-column breakpoint for tablet (companion header/insights left, tab content right).
- **Book status transitions UI** — No clear in-app flow for moving a book from "reading" to "finished" or "paused." Should be a deliberate, possibly celebratory, action.
- **Edit book metadata** — Can't edit chapter count, format, or spoiler mode after initial setup. Needs an edit flow.
- **RelationshipMap interactivity** — Character relationship graph is view-only. Clicking a node should allow editing that character inline.
- **Keyboard focus trap in modals** — Modals don't trap focus, which is a basic accessibility and UX issue.

### Lower Priority (Nice to Have)

- **Series progress view** — No way to group books in a series or track series-level progress in the library.
- **Custom cover upload** — Fallback to Open Library covers has edge cases (null ISBN, 1px placeholder images). Allow manual cover upload as override.
- **Companion archiving** — No way to archive/hide a finished book without deleting it.
- **Grain texture visibility** — Paper grain is set at 2.2% opacity and is effectively invisible on most screens. Evaluate whether to increase or remove.

### Infrastructure / Future (Needs Backend)

- **API key onboarding friction** — Requiring users to supply their own Anthropic API key is the biggest conversion barrier for the AI features. The rule-based path works without it, but the best features (grounded reflections, discussion questions) require it. Plan a backend proxy with a free tier.
- **Cross-device sync** — Currently localStorage only. No sync, no account recovery. Prerequisite: backend.
- **Cloud backup / user accounts** — Prerequisite: backend.

---

## Notes for You

- These are additive — nothing above contradicts or cancels prior items. If any overlap with what's already on the list, merge them rather than duplicating.
- Priority ordering above reflects both user-facing impact and implementation effort. The must-fix items are all small-scope code changes. The infrastructure items are intentionally scoped as future work.
- The reflection suppression, deduplication, and saturation detection items are already acknowledged in the in-repo roadmap (`docs/ROADMAP.md`) — these are confirmations, not new discoveries.
