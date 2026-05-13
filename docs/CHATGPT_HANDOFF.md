# Shadow Scribe — Current State Briefing
**Last updated:** 2026-05-13 (Session 47)

This is a **lightweight current-state briefing** for external AI collaboration (ChatGPT, etc.).
For full technical depth, read the modular docs: ARCHITECTURE.md, AI_COMPANION_RULES.md, DESIGN_SYSTEM.md, PRODUCT_FOUNDATION.md, ROADMAP.md.

---

## What It Is

A personal reading companion app. Literary, reflective, spoiler-aware. Not a productivity tool. The companion feels like a quiet presence alongside the reader — it observes, remembers, and reflects. It never lectures or gamifies.

**Stack:** React 19 · Vite 8 · Tailwind CSS v4 · React Router v7 · localStorage (no backend)

---

## Where We Are (Session 47)

### Recently completed — Companion Intelligence Layer v2 + v3
The reflection engine now has a **full note intelligence layer** and surfaces reflections at **meaningful moments**:

**Note intelligence (v3):**
- `inferNoteThemes` / `analyzeNoteThemes` — 11-theme keyword inference; `dominantTheme`, `recurringThemes`
- `detectInterpretationShifts` — detects character valence changes between early and late notes
- `buildNoteLinkClusters` — groups notes by shared theme or character mention
- `computeResonanceWeights` — scores notes by revision depth, reflection, tag, and recurrence
- 3 new signal types: `interpretation-shift` (p3), `theme-persistence` (p2), `resonance-anchor` (p2)

**Continuity surfaces (v2):**
- `markReflectionSurfaced` wired into the `CompanionInsights` carousel (session-dedup, ref pattern)
- `pickCompletionReflection` / `pickReturnReflection` in `ChapterUpdateModal` — companion speaks at chapter milestones and after 7+ day absences
- `persistentReflection` continuity header in `DiscussionTab` — a thread the companion has been tracking
- Priority system (`priority: 1|2|3`) on all `ReflectionEntry` objects; 8h minimum resurfacing window

DebugPage has a third panel — "Note Intelligence" — showing themes, shifts, resonance scores, and clusters per book.

### Previously completed (Sessions 44–46)
- Mystery + discussion question deletion, AI EPUB re-extraction, AI discussion questions
- Character name/tier editing, notes search, chapter inline rename, dark mode

---

## Immediate Next Step

**Companion Intelligence Layer v4: AI Note Intelligence**

Feed the richer note intelligence signals into the AI reflection call — themes, character shifts, high-resonance note texts — so AI reflections can reference what the companion has learned.

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
