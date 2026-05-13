# Shadow Scribe — AI Companion Rules
**Last updated:** 2026-05-13 (Session 48)

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
- "This reader..."
- "Your journey..."
- "You seem..."
- "You have been..."
- "One can see..."
- "There is a..." (when followed by abstract noun)
- "This speaks to..."
- "This resonates..."

### Prohibited openings (structural)
Do not open a reflection with **"The [abstract noun]"** — e.g. "The tension", "The weight", "The sense", "The feeling". This pattern sounds like a formulaic literary observation rather than genuine noticing.

### Anti-patterns to avoid
- Therapy-speak: treating the reader as a subject of analysis rather than a fellow reader
- Faux profundity: statements that sound deep but say nothing specific
- Repetitive cadence: three reflections with the same sentence rhythm or emotional register
- Overconfident framing: the companion observes, it does not diagnose or conclude

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
`generateRuleBasedReflections(ctx, style)` — 12 named signal types:

1. `interpretation-shift` — note intelligence: character valence shift between early/late notes (priority 3, weight 4)
2. `theory-arc` — reader has accumulated theories (≥2 theory notes)
3. `theme-persistence` — dominant theme appearing in ≥3 notes (priority 2, weight 2)
4. `character-focus` — character note count ≥3 or specific name appearing ≥2× in theory notes
5. `temporal-evolution` — confusion-to-theory / sustained-theory / late-favorites
6. `resonance-anchor` — a note has been both revised and had a reflection added (priority 2, weight 2)
7. `interpretation-evolution` — revised or reflected notes indicate shifting understanding
8. `mystery-continuity` — oldest open mystery unresolved ≥12 chapters
9. `reader-attention` — favourite/quote note count ≥3, or dense annotation past midpoint
10. `confusion-signal` — confusion note count ≥3 without matching theories

**Reflection priority levels (1–3):**
- Priority 3 — surfaces soonest after previous showing; for high-signal signals (`interpretation-shift`, revised theory-arc)
- Priority 2 — mid-tier; most signals
- Priority 1 — ambient; reader attention, confusion without theories

**Reflection generation rules:**
- Deduped by signal type — highest-weight entry wins per type
- Never includes chapter summaries, future character states, or mysteries beyond `currentChapter`
- Minimum content threshold before generation: `noteCount >= 3 OR openMysteries.length >= 2`
- 8h minimum resurfacing window (`MIN_RESURFACE_MS`) — reflections within this window are excluded from rotation

---

## Note Intelligence Layer

Computed on-demand from existing note data. No new localStorage fields (only `priority` on `ReflectionEntry`).

### Theme inference
`inferNoteThemes(note)` / `analyzeNoteThemes(notes)`:
- 11 themes: grief, suspicion, isolation, trust, fear, ambiguity, obsession (label: fixation), belonging, guilt, longing, uncertainty
- Keyword-set matching against joined `note.text + note.reflection`; threshold = 1 keyword hit
- Top 2 themes per note; dominant theme = most frequent across all notes; recurring = ≥3 notes
- **Companion must not**: label a reader as "grieving" or characterise them by their themes — themes inform observations, not diagnoses

### Interpretation shift detection
`detectInterpretationShifts(notes)`:
- Requires ≥4 notes; checks top 3 named characters from theory/character notes
- Splits notes at chronological midpoint; computes valence (positive/negative/uncertain/mixed) for early vs late notes per character
- Only fires when valence differs between halves
- `SHIFT_TEXT` map provides 6 directional phrase generators — always character-focused, never reader-labelling

### Resonance weighting
`computeResonanceWeights(notes)` — scores: base 1, +2 revisedAt, +2 reflection field, +1 theory tag, +1 recurring theme (≥3 notes), +1 recurring char (≥3 notes). `highResonanceNotes` = score ≥4.
- **What this is for**: identifying notes with the highest emotional investment, to power `resonance-anchor` signals and future AI context enrichment
- **Not exposed to the reader** — internal only

### AI reflection generation
`generateCompanionReflections(ctx, apiKey)` in `aiExtractor.js`:
- Fires when: `anthropicKey` present + `noteCount >= 5` + cache stale
- Context assembled by `buildAIReflectionContext(ctx)` — exported pure function, inspectable in DebugPage without API cost
- Up to 10 context lines; hard-capped to prevent prompt bloat (~600–900 chars typical)
- Signal priority order: `interpretation-shift` > `theory-arc` > `theme-persistence` > `resonance-anchor` > `confusion-signal` > `reader-attention` > `temporal-evolution` > `mystery-continuity` > `character-focus`
- Returns 3 reflections as `ReflectionEntry[]` with `priority` derived from signal presence and internal `_sourceSignals` / `_sourceLineCount` fields
- AI results prepend rule-based results in cache; silent failure leaves rule-based cache intact
- `max_tokens: 480` (3 × ~1.5 sentences; well within budget)

### AI context assembly rules
- **Curate aggressively** — never dump all notes or all metadata; prefer small, high-signal windows
- **Revised theories first** — within theory note samples, sort `revisedAt` notes to the front
- **Resonance anchor** — only the note with both `revisedAt` AND `reflection` qualifies; this represents the deepest reader investment
- **Age threshold on mysteries** — only include if unresolved for ≥5 chapters; fresher mysteries are not yet meaningful
- **Character focus threshold** — only include if ≥3 theory notes exist; lower counts produce noisy signals
- **Theme threshold** — only include `dominantTheme` if it appears in ≥3 notes
- **Spoiler safety** — note text truncated to 85 chars max; no chapter summaries, no future character states, no mysteries beyond `currentChapter`

### Cache management
- `book.reflectionCache` — persisted with book in localStorage
- Invalidated when: context hash changes OR cache older than 3 days
- `book.reflectionCache` must **never** be in the `useEffect` dep array in `CompanionInsights` — this creates a save→trigger loop. `shouldRegenerate` provides correctness instead.

---

## Reflection Memory and Rotation

- `getActiveReflections(book, limit)` — 3-tier sort: surfaceCount ASC → priority DESC → lastSurfaced AGO DESC; excludes reflections surfaced within `MIN_RESURFACE_MS` (8h)
- `markReflectionSurfaced(reflections, id)` — pure function; increments `surfaceCount`, sets `lastSurfaced`. Caller persists via `updateBook`. Wired in `CompanionInsights` carousel (session-dedup via ref) and `ChapterUpdateModal` (merged into same `onUpdateBook` call).
- `pickCompletionReflection(book)` — for chapter-completion moment; respects 8h window
- `pickReturnReflection(book)` — for return after ≥7-day gap; ignores 8h window (absence resets freshness)
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
8. Label the reader by their themes — "you seem preoccupied with grief" is not a companion observation
9. Use inferred themes as personality descriptors or reading assessments
10. Surface an interpretation-shift observation that names a character the reader hasn't met yet (`isCharacterMet` must pass before name appears in any observation)
