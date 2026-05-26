# Voice and Language Audit
**Session 75 · May 15, 2026**

---

## What This Is

A full audit of user-visible language across the companion, UI copy, and AI prompts. The goal is to identify where the established voice rules are being violated — productivity vocabulary, analytical framing, assistant language, legacy naming — and to flag strings that have gone dead through repetition.

The Lantern voice is defined in `docs/AI_COMPANION_RULES.md` and `docs/PRODUCT_FOUNDATION.md`. The companion observes; it does not coach. It is present without intruding. It never gamifies, never praises reading behaviour, and never frames itself as an assistant.

---

## Prohibited Patterns (from AI_COMPANION_RULES.md)

The following must not appear in user-visible companion text:
- `"I notice"` — marks the companion as a speaker rather than a presence
- `"It seems"` — hedging framing that feels like qualified opinion
- `"You might"` — instructional register
- `"As a reader"` — categorising the user, lecture-adjacent
- Gamification language: streaks, goals, achievements, progress-as-score
- Productivity language: engagement, sessions as tasks, reading as habit-building

---

## Violations Found

### 1. "Sustained Engagement" in Analytical Style

**`src/utils/companionPresence.js`, line 296**
```js
if (style === 'analytical') return "You returned to this story more than once in a day — a sign of sustained engagement."
```

`"sustained engagement"` is productivity/analytics vocabulary. It belongs in a user metrics dashboard, not a literary companion. The observational equivalent on the same line is correct:
```js
return "The story pulled you back more than once in a day."
```

The analytical style should maintain Lantern's voice while being more precise — not adopt engagement-platform language.

**Fix:** Replace with something like `"Returned to this story twice in one day. That kind of pull doesn't happen with every book."` or simply `"Returned more than once in a day."` for the minimal equivalent of observational.

---

### 2. Streak Vocabulary in Observational Style

**`src/utils/companionPresence.js`, lines 381–382**
```js
if (streak >= 7) return `A ${streak}-day reading streak. This story has its hooks in you.`
if (streak >= 4) return `You've returned ${streak} days running. Something is keeping you here.`
```

The word `"streak"` is gamification vocabulary — it belongs to Duolingo and Habitica, not a literary companion. The companion tracking consecutive days is correct; the word it uses to describe that fact is wrong.

The minimal style version at line 375:
```js
if (streak >= 4) return `${streak}-day streak.`
```
This is the starkest offender — pure gamification UI text.

**ReadingMomentum.jsx** also displays `"3-day reading streak"` in the UI. This is user-visible gamification language.

**Fix:** Replace `"streak"` vocabulary with language that describes the pattern without naming it as an achievement:
- `"Seven days returning to this story."` 
- `"You've come back four days running."`
- `"Returned consistently this week."`

---

### 3. Reflection String Candidates for Revision

These strings appear in `src/utils/companionPresence.js` and `src/utils/reflectionEngine.js`. They are not voice violations — they pass the core rules — but they have been seen enough in development to have lost impact. They are candidates for rotation or revision:

**"Your annotations are beginning to form a parallel text alongside the story."**
(`companionPresence.js`, `readerObs`) — Used when `notes.length >= 5`. Correct but overheard. The phrase "parallel text" is literary-theory register that may not land for all readers.

**"That kind of reading usually finds what it's looking for."**
(`companionPresence.js`, `readerObs`) — Fires when `theoryNotes.length >= 3`. Reads as praise for annotation behaviour rather than observation of the story. Proximity to `"You might"` territory.

**"Something in the story has quickened your pace."**
(`companionPresence.js`, `pacingObs`) — Fires when the reading rate has significantly increased. The word `"something"` is doing abstraction work the companion should not need to do — it knows what's happening (pace acceleration) and could be more specific.

**"A consistent theorising thread through this reading."**
(`reflectionEngine.js`, `generateRuleBasedReflections`) — `"consistent"` is neutral-analytical. The word "thread" is fine, but the full phrase has a report-card quality.

---

### 4. AI System Prompt — Assistant Framing

**`src/utils/aiExtractor.js`, approximately line 97:**
```js
"You are a literary analysis assistant for a reading companion app."
```

The system prompt positions the AI as a `"literary analysis assistant"`. This is assistant framing — the AI is being told to behave as a helper doing analysis. The Lantern companion is not an assistant; it is a presence. The system prompt should position the AI as a companion voice generating reflections, not an assistant performing literary analysis.

This matters because the system prompt shapes the register and posture of AI-generated observations. An "assistant" tends to explain and conclude; the companion observes and withholds.

**Fix:** Reframe the system prompt toward companion voice: `"You are Lantern, a quiet literary companion. You generate brief, observational reflections about a reader's reading experience — not summaries or analysis, but quiet, specific observations that feel like they come from something that has been paying attention."` (Exact wording should follow AI_COMPANION_RULES.md.)

---

### 5. "Shadow Scribe" Naming Residue

The app has been renamed to Lantern, but `"Shadow Scribe"` persists in user-visible locations:

| Location | Context |
|----------|---------|
| `src/components/layout/TopNav.jsx` | Main header logo text |
| `src/components/layout/TopNav.jsx` | Menu dropdown description section |
| `src/components/library/CreateCompanion.jsx` | Spoiler mode description copy |
| `src/components/library/EpubImportReview.jsx` | Spoiler mode UI text |
| `src/pages/SettingsPage.jsx` | Export filename: `shadowscribe-library-${date}.json` |
| `src/pages/SettingsPage.jsx` | Import error messages, section descriptions, footer |
| `src/pages/DebugPage.jsx` | Debug page header/labels |

The export filename (`shadowscribe-library-*.json`) is the most visible external artifact — users who export and inspect their data see the old product name. The localStorage key (`shadowscribe_books`) is internal-only and its migration cost is higher than its visibility impact.

**Priority:** The TopNav header logo text is the most critical. The export filename is second. Internal keys (`shadowscribe_books`) can remain for now without user impact.

---

### 6. Discussion Tab / Companion Language in UI Copy

Several UI labels use analytical vocabulary that creates category confusion:

- `"Generate reflections"` in CompanionInsights — positions reflection generation as a user-initiated task rather than a background process
- `"AI insight style"` in settings — `"insight style"` is slightly product-analytics-adjacent
- `"Companion insights"` as a section label — the word `"insights"` is mildly analytics-platform

None of these are severe violations, but they suggest the UI copy was written slightly apart from the product voice guidelines. A dedicated pass on UI label copy (not companion observation text) is warranted.

---

## What Is Correct

**The observational-style strings throughout `companionPresence.js` are largely correct.** The arc observations, lingering mystery lens, interpretation evolution, and session stop lens all maintain the literary, non-instructional register. The choice to write three style variants (observational/analytical/minimal) for most lenses is the right architecture.

**The resonance anchor observation** (`"One thought has been returned to more than once — revised, then reflected on again. It seems to still be alive."`) — the phrase `"It seems"` here is close to the prohibited pattern but is used as literary hedging (`"seems to still be alive"`) rather than qualified opinion. This is a borderline case; it is defensible.

**The AI-generated observation path in `aiExtractor.js`** constrains voice via a prompt and rules. The system prompt issue noted above is a posture problem, not a string-level violation — the generated strings themselves may be fine.

---

## Priority Matrix

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| "sustained engagement" | companionPresence.js:296 | High | Replace string |
| "streak" vocabulary | companionPresence.js, ReadingMomentum.jsx | High | Replace all instances |
| AI system prompt framing | aiExtractor.js | Medium | Rewrite system prompt |
| "Shadow Scribe" in TopNav logo | TopNav.jsx | High | Rename to Lantern |
| Export filename "shadowscribe-" | SettingsPage.jsx | Medium | Rename to "lantern-" |
| Reflection strings gone dead | companionPresence.js, reflectionEngine.js | Medium | Rotate variants |
| UI label copy register | Multiple components | Low | Copy pass |

---

## Session 82 Update — UI Copy Pass Complete

The "UI label copy register" item above was fully addressed in Session 82 (Track B Milestone 5). See DESIGN_SYSTEM.md Language Registry section for the complete before/after table.

**Remaining UI language targets (not yet addressed):**
- `"Open a thread"` + `"+ add a thought"` on mystery cards — `+` prefix
- `"Refine"` on mystery cards — functional verb
- `"+ Add a character"` in CharactersTab
- `"Discussion"` tab label
- `"Save a copy"` in stewardship menu — "save" is file-system vocabulary
- Characters section headings "Main Characters" / "Secondary Characters" — title case
