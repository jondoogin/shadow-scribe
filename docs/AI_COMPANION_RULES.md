# Shadow Scribe — AI Companion Rules
**Last updated:** 2026-05-13 (Session 46)

Rules governing companion voice, spoiler behavior, reflection generation, and AI constraints.
These rules are foundational — do not change them without explicit product discussion.

---

## Companion Voice

The companion is **literary, restrained, quietly perceptive**. Not a chatbot. Not a therapist. Not a writing coach.

### Prohibited phrases
These patterns break character and must never appear in companion observations or reflections:
- "I notice..."
- "It seems..."
- "You might..."
- "It appears..."
- "As a reader..."
- "I can see that..."
- "It looks like..."
- "That's great!"
- "Well done!"

### The tone is
Observational. The companion has been watching quietly — it does not analyze loudly.

### Reflection rules
1. Each reflection is 1–2 sentences maximum
2. Do not quote the reader's notes directly
3. Do not reference future chapters or events
4. Vary sentence rhythm — avoid starting consecutive reflections the same way
5. Write as if the companion has been sitting beside the reader throughout

### Three tonal styles (insightStyle setting)
- `observational` — metaphorical, warm, uses natural imagery
- `analytical` — structural, notices craft, slightly more detached
- `minimal` — sparse phrases, 3 observations max, skips mystery/character/reader lenses

---

## Spoiler System

Shadow Scribe uses **graduated narrative visibility** — literary, not mechanical. The philosophy: protect what the reader doesn't know yet; never censor mindlessly.

### Mode resolution
`getEffectiveMode(book, settings)` → `book.spoilerMode ?? settings.spoilerMode ?? 'relaxed'`

Per-book spoilerMode overrides the global default.

### Mode behavior

| Mode | Characters | Mysteries | Chapter titles |
|------|-----------|-----------|---------------|
| `strict` | Unmet → `null` (filtered); met-but-unsafe → veiled text | Future → `null` | Hidden beyond currentChapter+1; shows `···` or `alternateSummary` |
| `relaxed` | Unmet → literary placeholder + `_veiled: true` | Future → "A thread the story is still gathering." + `_veiled: true` | All visible |
| `full` | All shown with full detail | All shown | All visible |

### Character safety — two axes
- `isCharacterMet(book, c)` — appeared yet? Uses `revealChapter ?? parse(lastSeen)` vs `currentChapter`
- `isCharacterSafe(book, c)` — is character's *current state* safe? Uses `lastSeen` vs `currentChapter`
- A character can be met-but-unsafe: name visible, status/description veiled

### Veiled rendering rule
Veiled characters/mysteries always have *something* to render. `_veiled: true` triggers a dimmed/italic card. Never a blank. Never "hidden". Literary vagueness, not mechanical absence.

### Allegiance strings
Allegiance values containing `→` indicate a shift. Pre-shift text is trimmed for future characters in veiled view.

### Standard pattern
```jsx
const mode = getEffectiveMode(book, settings)
const views = book.characters.main
  .map(c => getCharacterView(book, c, mode))
  .filter(Boolean)         // null = filtered in strict mode
// c._veiled → render veiled card; otherwise render full card
```

---

## Companion Observation System

### Layer 1: Presence (immediate/contextual)
`generatePresence(book, settings)` — 13 lenses, synchronous, returns string[].

**13 lenses:**
1. `arcObs` — story arc position based on % progress
2. `finishedObs` — fires at ≥99%; reflects on notes left and starred chapters
3. `mysteryObs` — mystery count and proportion resolved
4. `lingeringMysteryObs` — fires when a mystery has been open ≥10 chapters
5. `characterObs` — character count relative to position
6. `characterOwnershipObs` — fires when reader has added/edited characters
7. `readerNotesObs` — reflects on note count and tag distribution
8. `notePatternObs` — detects character-focused notes (≥2) or simultaneous theory+confusion (≥2 each)
9. `interpretationObs` — fires when notes revised/reflected or mysteries have observations
10. `sessionRhythmObs` — session pattern (consistent, sporadic, returning)
11. `sessionStopObs` — notes when reader stopped at a significant point
12. `pacingObs` — detects acceleration/deceleration between first/second half of readingLog
13. `momentumObs` — current streak or session count

**Spoiler constraints:**
- Dead character count only counts `isCharacterSafe()` characters
- Allegiance-shift observation only fires for characters within `lastSeen` boundary
- Mystery observations only count `isMysteryVisible()` mysteries
- Never references future chapter content, resolved-beyond-boundary mysteries, or unsafe character states

### Layer 2: Reflections (retrospective/synthesized)
`generateRuleBasedReflections(ctx, style)` — 9 named signal types:

1. `theory-arc` — reader has accumulated theories (≥2 theory notes)
2. `character-focus` — character note count ≥3
3. `character-focus-named` — specific character name appearing ≥2× in theory notes (`theoryCharFocus`)
4. `confusion-to-theory` — temporal evolution: early notes confused, later notes interpretive
5. `sustained-theory` — temporal evolution: consistent theorising throughout
6. `late-favorites` — temporal evolution: favourite passages concentrated in second half
7. `interpretation-evolution` — revised or reflected notes indicate shifting understanding
8. `mystery-continuity` — oldest open mystery has been unresolved ≥5 chapters
9. `confusion-signal` — confusion note count ≥2 relative to total

**Reflection generation rules:**
- Deduped by signal type — highest-weight entry wins per type
- Never includes chapter summaries, future character states, or mysteries beyond `currentChapter`
- Minimum content threshold before generation: `noteCount >= 3 OR openMysteries.length >= 2`

### AI reflection generation
`generateCompanionReflections(ctx, apiKey)` in `aiExtractor.js`:
- Fires when: `anthropicKey` present + `noteCount >= 5` + cache stale
- Context passed: note samples (theory, confusing, favourite), character focus, temporal evolution label, oldest open mystery age
- Returns 3 reflections as `ReflectionEntry[]`
- AI results prepend rule-based results in cache
- Silent failure; rule-based cache remains

### Cache management
- `book.reflectionCache` — persisted with book in localStorage
- Invalidated when: context hash changes OR cache older than 3 days
- `book.reflectionCache` must **never** be in the `useEffect` dep array in `CompanionInsights` — this creates a save→trigger loop. `shouldRegenerate` provides correctness instead.

---

## Reflection Memory and Rotation

- `getActiveReflections(book, limit)` — sorts unsuppressed reflections by `surfaceCount` ascending (least-shown first), `generatedAt` descending as tiebreaker
- `markReflectionSurfaced(reflections, id)` — increments `surfaceCount` (currently defined but not yet wired to carousel)
- `suppressed: true` on a `ReflectionEntry` removes it from rotation permanently

---

## What the Companion Must Never Do

1. Reference events or character states beyond `book.currentChapter`
2. Reveal the resolution status of mysteries the reader hasn't reached
3. Quote the reader's notes verbatim
4. Use productivity/motivational language ("Great work!", "Keep it up!")
5. Initiate conversation — the companion observes, it does not prompt
6. Reference future chapter titles in strict mode
7. Surface a "welcome back" message based on time gap alone (no temporal manipulation)
