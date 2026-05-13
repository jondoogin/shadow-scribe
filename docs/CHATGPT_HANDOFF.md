# Shadow Scribe — Current State Briefing
**Last updated:** 2026-05-13 (Session 46)

This is a **lightweight current-state briefing** for external AI collaboration (ChatGPT, etc.).
For full technical depth, read the modular docs: ARCHITECTURE.md, AI_COMPANION_RULES.md, DESIGN_SYSTEM.md, PRODUCT_FOUNDATION.md, ROADMAP.md.

---

## What It Is

A personal reading companion app. Literary, reflective, spoiler-aware. Not a productivity tool. The companion feels like a quiet presence alongside the reader — it observes, remembers, and reflects. It never lectures or gamifies.

**Stack:** React 19 · Vite 8 · Tailwind CSS v4 · React Router v7 · localStorage (no backend)

---

## Where We Are (Session 46)

### Recently completed — Companion Intelligence Layer v1
The companion's observation strip is now a **two-layer system**:

1. **Presence layer** — 13-lens immediate observations (`companionPresence.js`). Contextual, synchronous, spoiler-boundary-aware.
2. **Reflection layer** — retrospective synthesis of the reader's own engagement patterns (`reflectionEngine.js` + `aiExtractor.generateCompanionReflections`). Rule-based (sync, always) + AI-enhanced (async, silent, requires key + ≥5 notes). Cached in `book.reflectionCache`. Woven into the presence pool at positions 1 and 4.

Companion voice was also sharpened — eliminated assistant-like phrasing ("I notice", "It seems", "Pay attention to…").

DebugPage now has a Reflection Inspector panel for QA.

### Previously completed (Sessions 44–45)
- Mystery + discussion question deletion
- AI EPUB re-extraction ("✦ Re-extract with Claude…")
- AI discussion question generation ("✦ Generate with Claude")
- Character name/tier editing
- Notes search (covers reflections)
- Chapter inline rename
- Dark mode (full `html.dark` palette override)
- Settings nav fix

---

## Immediate Next Step

**Companion Intelligence Layer v2: Continuity Surface**

The engine generates observations — v2 surfaces them at *meaningful moments*:
- Brief reflection when reader marks a chapter complete
- Pattern summary at top of Discussion tab
- Wire `markReflectionSurfaced` into the carousel tick (currently defined but not called)

See ROADMAP.md for full milestone queue.

---

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/utils/reflectionEngine.js` | Reflection context assembly, rule-based generation, cache management |
| `src/utils/aiExtractor.js` | All Anthropic API calls: EPUB extraction, discussion questions, companion reflections |
| `src/utils/companionPresence.js` | 13-lens immediate observation engine |
| `src/utils/spoiler.js` | Graduated narrative visibility — must read before touching character/mystery/chapter code |
| `src/components/dashboard/CompanionInsights.jsx` | Two-layer observation strip, reflection generation trigger |
| `src/context/BooksContext.jsx` | Global books state; `updateBook(id, changes)` shallow-merges |
| `src/context/SettingsContext.jsx` | `{spoilerMode, insightStyle, defaultFormat, anthropicKey, darkMode}` |

---

## Critical Constraints

- **Vite build:** `node node_modules/vite/bin/vite.js build` — `.bin/vite` is not a real symlink
- **Tailwind v4:** All CSS resets in `@layer base {}`. Unlayered rules silently win over all utilities.
- **`book.reflectionCache` must not be in `CompanionInsights` useEffect deps** — causes save→trigger loop
- **Companion voice:** No "I notice", "It seems", "You might", "As a reader" — see AI_COMPANION_RULES.md
- **Accent colors:** Always `var(--ca, #B8860B)` inside companion dashboard. Never hardcode mood colors.
- **Dark mode:** Use `html.dark` CSS variable overrides, not `dark:` utility prefixes

---

## Data Shape (quick reference)

```js
// Book key fields
{ id, title, author, currentChapter, totalChapters, mood, spoilerMode,
  notes: [{id, text, tag, date, revisedAt?, reflection?}],
  mysteries: [{id, text, status, chapter, resolved}],
  chapters: [{num, title, completed, summary, reflection, important}],
  characters: { main: [...], secondary: [...], relationships: [...] },
  reflectionCache: { contextHash, generatedAt, reflections: ReflectionEntry[], aiEnhanced },
  readingLog: SessionEntry[] }

// ReflectionEntry
{ id, text, type: 'rule-based'|'ai', surfaceCount, lastSurfaced, suppressed, generatedAt }
```

---

## Docs Index

| Doc | Contains |
|-----|---------|
| `PRODUCT_FOUNDATION.md` | Philosophy, voice rules, emotional goals, what the companion is not |
| `ARCHITECTURE.md` | Stack, component tree, file structure, state management, data models, utility reference |
| `AI_COMPANION_RULES.md` | Spoiler system, observation pipeline, reflection rules, voice constraints |
| `DESIGN_SYSTEM.md` | Color palette, dark mode, typography, layout, animations, CSS classes |
| `ROADMAP.md` | Active milestone, known issues, backlog, completed milestones |
| `SESSION_NOTES.md` | Rolling session-by-session implementation log |
