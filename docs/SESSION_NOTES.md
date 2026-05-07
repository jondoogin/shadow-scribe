# Shadow Scribe — Session Notes
Reverse-chronological log of what was built, fixed, and decided in each working session.

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
