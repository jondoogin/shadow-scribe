# Shadow Scribe — Current State Briefing
**Last updated:** 2026-05-13 (Session 48)

This is a **lightweight current-state briefing** for external AI collaboration (ChatGPT, etc.).
For full technical depth, read the modular docs: ARCHITECTURE.md, AI_COMPANION_RULES.md, DESIGN_SYSTEM.md, PRODUCT_FOUNDATION.md, ROADMAP.md.

---

## What It Is

A personal reading companion app. Literary, reflective, spoiler-aware. Not a productivity tool. The companion feels like a quiet presence alongside the reader — it observes, remembers, and reflects. It never lectures or gamifies.

**Stack:** React 19 · Vite 8 · Tailwind CSS v4 · React Router v7 · localStorage (no backend)

---

## Where We Are (Session 48)

### Recently completed — Companion Intelligence Layer v4: AI Note Intelligence

AI reflections are now **grounded in the reader's actual engagement patterns** — not just raw note samples:

- **`buildAIReflectionContext(ctx)`** (exported, pure) — assembles up to 10 high-signal context lines from: revised theories, interpretation shifts, dominant theme, highest-resonance note, confusion/favourite counts, temporal arc, oldest mystery, recurring character. Exported for DebugPage inspection without API cost.
- **Signal-derived priority** — if `interpretation-shift` is in context → p3; `resonance-anchor` or `theme-persistence` → p2; otherwise p1. Each AI reflection gets a different tier.
- **`_sourceSignals` / `_sourceLineCount`** — internal attribution metadata stored on each `ReflectionEntry` (underscore-prefixed, not rendered in UI, visible in DebugPage).
- **Upgraded prompt** — diversity instruction, expanded prohibited-phrase list, structural prohibition on "The [abstract noun]" openings, no therapy-speak.
- **DebugPage AI context inspector** — collapsible panel in Reflection Engine tab shows context lines, signal badges, and char count. AI reflection rows show source signals below the text.

### Previously completed (Sessions 44–47)
- v2+v3: note intelligence layer, continuity surfaces, carousel surfacing, chapter/return reflections, Discussion Tab header
- Mystery + discussion question deletion, AI EPUB re-extraction, AI discussion questions, character editing, notes search, dark mode

---

## Immediate Next Step

**Companion Intelligence Layer v5: Reflection Quality + Deduplication**

Deduplicate AI vs rule-based reflections by text similarity. Add reader-facing suppression. Audit pool health over time.

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
