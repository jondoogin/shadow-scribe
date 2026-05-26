# Shadow Scribe — UI Screenshot Capture Guide

**Purpose:** Assemble a visual continuity packet for Claude Design. These screenshots become the ground truth for all future visual work — dark mode, typography refinement, landing page design, and component iteration.

---

## Setup Before Capturing

1. Open Shadow Scribe at `http://localhost:5173`
2. Use the demo data (click "Reset to Demo Data" in Settings if needed)
3. Browser: **Chrome or Safari** — not Firefox (font rendering differs)
4. Zoom: **100%** — never screenshot at other zoom levels
5. Light mode only for this first pass — dark mode screenshots come after implementation

---

## Desktop Screenshots (1440px or 1280px wide)

### Library Views

| # | Screen | State | Notes |
|---|--------|-------|-------|
| D-01 | Library — active shelf | 3+ companions, mixed status | Shows series grouping + standalone books |
| D-02 | Library — archived shelf | 1–2 archived companions | Shows the archived section |
| D-03 | Library — empty state | No companions | After clicking "Reset to Demo Data", delete all companions |
| D-04 | Library — series group | 2+ books in same series | Captures `buildGroups` visual hierarchy |

### Companion Dashboard

| # | Screen | State | Notes |
|---|--------|-------|-------|
| D-05 | Companion header — reading state | Book in progress | Shows cover, progress bar, mood swatches |
| D-06 | Companion header — finished state | Completed book | Shows completion copy + "The story ended here" |
| D-07 | Companion header — metadata edit open | Edit form expanded | Shows all fields: title, format, series, cover |
| D-08 | Progress tab | Mid-book with some completed chapters | Shows weighted progress bar |
| D-09 | Characters tab — populated | Multiple characters | Main + secondary groups |
| D-10 | Characters tab — veiled (strict mode) | Strict spoiler mode | Shows literary veil text |
| D-11 | Chronicle tab | Book with summaries | Shows chapter entries with summaries |
| D-12 | Notes tab — populated | Multiple notes, mixed tags | Shows tag filtering UI |
| D-13 | Mysteries tab — mixed | Some open, some resolved | Shows status badges |
| D-14 | Discussion tab — populated | Questions visible | Shows curated + user-added questions |
| D-15 | Companion Insights strip | Multiple observations | Capture the insight-strip background and copy |

### Modals

| # | Screen | State | Notes |
|---|--------|-------|-------|
| D-16 | Chapter update modal — input state | Just opened | Shows natural language input |
| D-17 | Chapter update modal — success state | After completing a chapter | Shows ✦ success state |
| D-18 | Companion header — lifecycle confirm | "Mark as finished?" confirm | Shows the confirmation dialog within CompanionHeader |

### Creation Flow

| # | Screen | State | Notes |
|---|--------|-------|-------|
| D-19 | CreateCompanion — Step 1 | Fresh | Shows EPUB import option + manual fields + cover slot |
| D-20 | CreateCompanion — Step 1 with ISBN cover | ISBN filled | Shows live cover preview from OpenLibrary |
| D-21 | CreateCompanion — Step 1 with custom cover | Custom cover uploaded | Shows "Remove" link below cover |
| D-22 | CreateCompanion — Step 2 | Structure + series | |
| D-23 | CreateCompanion — Step 3 | Spoiler + summary | Shows the companion summary card |

### Print View

| # | Screen | State | Notes |
|---|--------|-------|-------|
| D-24 | Print page — full scroll | Well-populated companion | Shows all sections: header, characters, mysteries, notes, chronicle |
| D-25 | Print page — header detail | Cover + title block | Shows cover image, dates, progress |
| D-26 | Print — browser print dialog | Chrome's "Save as PDF" dialog open | Shows the clean print layout vs. the dialog |

### Settings

| # | Screen | State | Notes |
|---|--------|-------|-------|
| D-27 | Settings page | All sections visible | Shows insight style, spoiler, export/import rows |

---

## Mobile Screenshots (390px — iPhone 14 width)

### Library

| # | Screen | State |
|---|--------|-------|
| M-01 | Library | Scrolled slightly — shows books + status badges |
| M-02 | Library — bottom of screen | Shows the grid layout on mobile |

### Companion

| # | Screen | State |
|---|--------|-------|
| M-03 | Companion header | Shows cover, title, mood swatches — mobile layout |
| M-04 | Tab bar | Shows horizontal scroll + fade indicator |
| M-05 | Notes tab | One or two note cards |
| M-06 | Sticky bottom bar | "Tell the companion where you are" button |
| M-07 | Chapter update modal | Full-screen modal with slide-up |
| M-08 | Chapter update — success | Success state, full screen |

---

## Special States to Capture

| # | Description | How to achieve |
|---|-------------|----------------|
| S-01 | **Strict spoiler mode** — characters tab | Set spoilerMode to strict on a book mid-read |
| S-02 | **Paused companion** — header | Pause a companion, wait or set date back |
| S-03 | **Series grouping** — library | Ensure 2+ books have the same series name |
| S-04 | **Mood variation** — library | Have companions in 3+ different moods |
| S-05 | **EPUB import review** | Import an EPUB file (non-DRM) |
| S-06 | **Empty Notes tab** | Open a fresh companion's notes tab |
| S-07 | **Print view — strict mode** | Print a companion with strict spoiler mode |

---

## Naming Convention

```
screenshots/
  desktop/
    D-01-library-active.png
    D-02-library-archived.png
    ...
  mobile/
    M-01-library.png
    ...
  special/
    S-01-strict-characters.png
    ...
```

---

## Quality Criteria

- Crisp at 2x/Retina if possible (use macOS screenshot at Retina)
- No browser UI in the frame (use fullscreen or hide chrome)
- No personal data in the screenshots (use demo data)
- No cursor visible in screenshots
- No system notifications visible

---

## Priority Order

Capture these first (essential for Claude Design to begin dark mode work):

1. D-05 (companion header — reading)
2. D-08 (progress tab)
3. D-12 (notes tab)
4. D-01 (library)
5. D-16, D-17 (chapter update modal — both states)
6. M-03 (mobile companion header)
7. M-06, M-07 (mobile sticky bar + modal)
