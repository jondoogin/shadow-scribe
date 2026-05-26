# Lantern — Product Foundation
**Last updated:** 2026-05-19 (Session 67)

---

## What It Is

Lantern is a **living literary space** — a personal, atmospheric environment that sits alongside the reader while they read. It is part reading journal, part spoiler-safe chapter tracker, part literary notebook, part reflective companion.

It is not a productivity app. It is not a social platform. It is not a gamified tracker. It is not an app presenting features.

It is becoming: a place where literary memory lives.

---

## Core Identity

**The single most important design principle:** Lantern should feel like entering an inhabited reading environment — not opening a dashboard.

The companion observes. It remembers. It reflects. It never lectures. The interface itself communicates memory, continuity, illumination, and lingering thought.

**The UI is not a container for features. It is part of the literary experience.**

---

## Product Pillars

### 1. Companion Voice, Not App Voice
Microcopy is literary, observational, unhurried.

| Do | Don't |
|----|-------|
| "Tell the companion where you are" | "Update progress" |
| "Return to the companion ✦" | "Close" / "Done" |
| "The chronicle begins when you do" | "No chapters yet" |
| "Capture a thought" | "Add note" |
| "Nothing written down yet" | "Empty" |
| "A question of your own" | "Custom question" |
| "Questions worth sitting with" | "Discussion Questions" |
| "Every story withholds something." | "No mysteries added" |

The ✦ glyph is the companion's visual signature. It marks moments of literary intention — not decoration.

### 2. Information Without Noise
- Sections appear only when they have content
- Empty states use poetic copy, never CTAs
- Data is surfaced by the companion when it matters — not dumped all at once

### 3. No Gamification
- No streaks as achievements
- No points, no badges, no rewards
- The Reading Momentum display is informational, not motivational
- "You've been reading consistently" is observation, not praise

### 4. Living Literary Environment
- Cream paper backgrounds, ink color palette, layered atmospheric warmth
- Playfair Display serif — for headings, observations, editorial hierarchy
- Grain texture overlay — subtle paper presence throughout
- Status-grouped library: reading now / set aside / finished — not a uniform grid
- The feeling of a warm literary observatory, not a dashboard
- Cards: atmospheric containment (shadow-based, not hard-bordered)
- Library: curated shelf groupings, not SaaS filter panels
- BookCard: featured hero treatment for solo active reading book

### 5. Spoiler-Aware as Default
The app never reveals what the reader doesn't know yet. Spoiler awareness is built into the data layer and every component that renders narrative data. This is a foundational constraint — not a feature.

### 6. Mood-Adaptive
Each book has a `mood` value. The entire companion dashboard shifts its accent colors to match that mood. The companion feels *tuned to the book*.

---

## Reader-State Evolution Principle (Session 69)

Lantern should increasingly understand: not only what the reader thinks — but how the reader is changing emotionally while reading.

A book changes the person reading it. Not all at once, and not in ways that are always visible. But the companion has access to something the reader may not notice themselves: the full arc of their reading — every note, every revision, every silence, every burst of writing, every theory that didn't hold. The companion should increasingly be able to say something true about who the reader is becoming through this story.

**Reading changes readers in detectable ways:**

- A reader who begins with confident theories and ends with hesitant questions has been destabilised by the story.
- A reader who begins with confusion and ends with conviction has found their footing inside the book.
- A reader who keeps writing the same word, again and again, without naming it as a fixation — is circling something.
- A reader who stopped writing after a certain chapter may have been changed by it too much to annotate.
- A reader whose notes grow longer is going deeper; one whose notes grow shorter may be outrunning interpretation, or settling.

**The companion should notice, not diagnose.** It observes: "You wrote with more certainty earlier." It does not conclude: "You are now uncertain." The observation invites the reader to notice themselves.

**Silence is as informative as language.** A long stretch of completed chapters with no notes — following a period of active engagement — says something. The companion should be able to name the shape of that silence without pathologising it.

**Fixation is psychological, not topical.** A word the reader keeps writing across many unconnected notes is not merely a theme. It is something that hasn't released them. The companion can name it without explaining it.

### The restraint rule

Reader-state observations should feel *occasional, intimate, and earned*. Not every reading produces a confidence arc. Not every reader develops a fixation. Most books will surface these lenses rarely. When they do fire, they should feel like the companion noticing something the reader hadn't consciously registered — a quiet recognition, not a diagnostic report.

---

## Interpretive Mutation Principle (Session 68)

Lantern should increasingly understand: not only what returns — but what changes shape emotionally.

Memory is not static. A theory revised is not the same as a theory persisting. A mystery rewritten is not the same as a mystery deepening. A character who was warm and has become suspicious is not the same as a character who was always ambiguous. The companion must be able to sense the difference between **continuity** and **transformation**.

**Collapsed certainty.** When a reader revises a theory note, they were sure of something — and then weren't. The story moved them. This should feel different from ordinary revision: it is destabilised interpretation, a prior reading that the book refused to uphold.

**Mutated questions.** When a mystery thread is reframed (the reader rewrites its phrasing), the question itself changed shape. The companion should reflect this: "Not answered — transformed." The original question is preserved in the UI as a quiet "Originally: …" line.

**Character polarity reversal.** When early notes about a character carry emotional warmth and later notes carry suspicion (or vice versa), the reader's fundamental reading of that character has inverted. This is one of the most emotionally significant signals available. It should be acknowledged, not just detected.

**Quote recontextualization.** A passage captured early in the reading that begins to echo in late-book theories has aged into evidence. The reader didn't know what they were catching when they caught it. Now they do.

### The distinction from haunting

Haunting = emotional persistence. The same thing keeps returning.
Mutation = emotional transformation. The thing has become something else.

Both are meaningful. Neither is more important. The companion should distinguish between them:
- "keeps returning" = haunting language
- "the story changed the terms" / "came apart" / "reframed" = mutation language

### The restraint rule

Interpretive mutation signals should be specific, not general. "One of your theories has been revised" is meaningful because it refers to something real. A generic "your reading is evolving" is not. The companion names what changed — it does not observe that change is happening.

---

## Selective Haunting Principle (Session 67)

Lantern should increasingly feel like it knows what the reading experience itself refuses to let go of. The companion does not merely remember everything — it increasingly remembers what keeps returning emotionally.

**Some signals should fade.** A mystery that the story hasn't addressed, the reader hasn't returned to, and that has no note overlap → cooling. Lower opacity, quieter prose, reduced resurfacing frequency. It hasn't disappeared; it's become archival.

**Other signals should haunt.** A theory that has been revised multiple times, is aged across the reading, and whose subject matter appears in an open mystery thread → haunted. Warmer visual treatment, higher resurfacing priority, surfaces across multiple companion zones, expresses active emotional weight.

### The haunting vocabulary

When a signal has accumulated significant cross-surface gravity, the companion should notice. Not loudly — never a badge or notification — but through:
- A slightly warmer text color on the gravity line
- A quiet `✦` before a mystery gravity line
- A brighter glyph opacity on the ActiveTensionBar
- Prose that says "keeps returning" rather than "still open"
- A residue line that says "Still shaping what comes after" on a chapter that wasn't flagged important

### What does NOT qualify

- Being old alone (dormant ≠ haunted)
- Having a theory tag alone
- Being confusing without revision or cross-surface overlap
- Loose thematic similarity between a note and a mystery (requires keyword overlap)

### The restraint rule

Selective haunting should be rare, quiet, and meaningful. If every mystery triggers the haunted treatment, nothing is haunted. The system should feel like a perceptive reader noticing what keeps coming up — not like an algorithm tracking engagement metrics.

---

## Present-Tense Momentum Principle (Session 66)

Lantern is a **living** reading environment. Its companion language must communicate that the story is still in motion — not archived in a past tense of unresolved things.

The companion's fundamental mistake is archival language: "still open," "still unresolved," "still unanswered." These phrases treat the story as paused. The reader is still reading. The book is still pulling. The questions are still gaining weight.

**The distinction:**
- Archival: "This question is still unresolved." *(thing persists, nothing moves)*
- Momentum: "This question keeps circling toward an answer." *(thing is active, reader is inside it)*

### Implications for companion writing

- Mysteries are **circling**, **deepening**, **gaining weight**, **changing shape** — not just sitting open
- Theories are **still forming**, **still shifting** — not just existing
- Reader interpretations **evolve** — a character "has become harder to read" not "has new notes"
- Return-after-gap language: the story **hasn't moved on**; the threads are **still live**; everything **still holds**
- Chapter residue: notes from a chapter are **still shaping what comes after**, not just "3 notes"

The companion should feel like it is tracking movement inside the book — not cataloguing what has yet to be resolved.

### Constraint: not urgency, not pressure

Momentum language is **quiet** and **persistent**. It does not create anxiety. "Your suspicion keeps returning here." is momentum. "This must be answered!" is pressure. The companion observes motion; it never demands resolution.

---

## Emotional Goals

The companion should produce these feelings:
- **Seen** — "It noticed something about how I'm reading."
- **Held** — "This book and my relationship to it are being kept."
- **Curious** — "What will it say about this chapter?"
- **Unhurried** — "I can take my time here."
- **Returning** — "The story is still here. The companion hasn't moved on."
- **Recognized** — "It knows what I've been wrestling with."

It should never produce:
- Urgency or pressure
- The feeling of being graded
- Information overload
- The experience of using an app

---

## What the Companion Is Not

- Not a chat interface
- Not a writing coach
- Not an AI assistant
- Not a social reading app
- Not a recommendation engine
- Not a productivity tool

The companion is a *presence* — quiet, literary, retrospective. It surfaces observations; it does not initiate conversation.

---

## Spatial Philosophy

The interface should feel:
- **Inhabited** — like someone reads here
- **Layered** — depth through atmosphere, not data density
- **Temporally aware** — older books look and feel older; active books glow warmer
- **Editorially composed** — hierarchy through meaning, not widget rows
- **Restrained** — inevitable, not decorated

The shelf is not navigation chrome. It is a continuity surface. Books have different weights and presences depending on their status and recency.

**Atmosphere hierarchy:**
1. Active reading → warmest, most present
2. Paused / want-to-read → secondary, quiet
3. Finished → honored, slightly dormant
4. Archive → very quiet, almost a footnote

**Design restraint rule:** Before adding visual atmosphere, ask: does removing it make the experience feel colder? If yes, keep it. If no, remove it.

---

## Emotional Legibility Principle

Lantern should feel emotionally understandable, not mechanically understandable.

Readers must never feel like they are looking at an exposed AI system. They should gradually learn the emotional language of the environment itself. Meaning emerges through atmosphere, timing, warmth, motion, and subtle continuity cues — not through tooltips, badges, labels, or dashboards.

**The companion's behavior is a language, not a feature set.** Readers learn it the same way they learn the emotional register of a room: by being in it, not by reading about it.

### Illumination language (design language, not reader documentation)

| Signal | Emotional meaning |
|--------|------------------|
| ✦ breathing slowly | Companion is present, attentive, not absent |
| Warmer insight strip | Surfacing something held in memory (a reflection) |
| Cooler insight strip | Offering an in-the-moment observation of the reading |
| Multiple carousel dots | Several observations in circulation — the companion has things to say |
| Single observation, no dots | Companion is quiet; stillness is intentional, not broken |
| Secondary tension signal | An unresolved thread actively pressing — what still matters |
| Quoted mystery text in secondary | The companion names the specific thing unresolved, not just its existence |
| Return momentum at position 1 | After a gap, the companion acknowledges the return before anything else |
| First-note ceremony | The companion's inline response to the reader's first thought — immediate, then fading |

### Continuity momentum philosophy

The dashboard should increasingly feel like **returning to an active relationship with the book**, not opening an interface.

The first emotional impression on entry should be: *What still matters here?*

- Metadata (cover, chapter count, percentage) serves as supporting texture — not the focal hierarchy.
- Companion voice leads. Narrative gravity follows. Statistics recede.
- When the reader has been away, the companion acknowledges the gap before offering observations.
- Specific reader content (quoted mystery threads, named theories) is preferred over generic observation.

### First-note ceremony philosophy

The first note a reader gives the companion is a meaningful relational moment. The companion should respond directly and immediately — not generically, not mechanically.

- The ceremony happens in-context (NotesTab), not only in the distant carousel above.
- It is a literary acknowledgment of the reader's specific interpretive mode (theory, confusion, quote, etc.).
- It fades after a few seconds — it is a moment, not a permanent UI state.
- The response text is tag-aware: a theory note receives different acknowledgment than a confusing note or a quote.

### Metadata backgrounding rules

As companion voice deepens, visual metadata should recede:

| Element | Current treatment |
|---------|------------------|
| Cover art | 75% opacity — textural, not dominant |
| Title | Serif, medium weight — present but not heavy |
| Author | 12px, ink-400 — texture |
| Chapter position + % | 10px, opacity-50-70 — barely visible |
| Progress bar | h-1 — a whisker, not a feature |
| Mood selector | Hidden on mobile (saves vertical space for companion voice) |
| Dormant card (62% opacity) | A memory honored but not actively held |
| Archive card (38% opacity) | Very old memory; a near-footnote |

### Silence legibility rules
- Silence should feel like a held breath, not a broken system.
- The ✦ glyph always breathes even when nothing is being said.
- When the companion has only one observation, no dots appear — quietness, not absence.
- Absence of a reflection after a chapter completion is not a failure — the companion is still present in the done state's ✦ glyph.

### Continuity legibility rules
- "X days returning to this story" > "X-day reading streak" — continuity, not achievement.
- "Something has pulled you back repeatedly" > "4 sessions in 7 days" — presence, not metrics.
- Notes accumulate into a parallel text — the companion acknowledges this progression at 2 notes, 3 notes, 5 notes.
- The companion never quantifies the reader's attention as a score or badge.

### Overexplanation restraints
These patterns are prohibited throughout the UI and companion copy:
- Counts framed as achievements ("You've read X books!")
- Visible scoring systems ("You're 70% engaged")
- "Because you liked..." recommendation energy
- Pseudo-intellectual annotation ("This theme connects to...")
- Continuity dashboards showing what the companion is "tracking"
- Any copy that names internal systems ("The reflection engine noticed...")

---

## Active Reading Philosophy

Lantern must never interrupt reading. It should quietly deepen the feeling of remaining inside the book.

**The reader should feel more deeply inside the story after using Lantern — not more aware of the app.**

### Session immersion rules
- No mode switches. No "enter reading mode" buttons. The environment subtly deepens around active behavior.
- Chapter progression is a ritual, not a task completion. The modal should feel like marking movement through a story. No loading energy, no success tones.
- The companion observes without intruding. Its presence is ambient, not conversational.
- After a session, the environment should feel continuous — not reset.

### Note-taking atmosphere rules
- Writing a note is capturing a fleeting thought before it disappears — not filling in a form.
- When composing, surrounding content dims. Focus belongs to the page and the thought.
- The textarea should feel like a journal — serif, spacious, warm background. Not a data entry field.
- Placeholder copy: "A thought before it disappears…" — not instructions.

### Chapter progression ritual philosophy
- The ChapterUpdateModal backdrop arrives slowly (300ms fade) before the dialog settles in (380ms spring).
- The done state is a moment of quiet arrival — content cascades in, the close button waits.
- The companion reflection in the done state arrives last — a second thought, not simultaneous.
- "Return to the story ✦" — not "Close" or "Done". The reader is returning, not finishing.

### Low-light/night reading principles
- The dark mode ambient gradient is a candle-glow quality — warm, restrained, barely perceptible.
- Motion in dark mode should feel slower and softer than light mode.
- High contrast text (`text-ink-900` equivalents in dark) remains for reading comfort — accessibility before atmosphere.
- The grain texture overlay persists in dark mode. Paper is paper, night or day.

### Long-session restraint rules
- The reflection carousel auto-advances every 7 seconds — slow enough to read, quick enough to not feel frozen.
- The 8-hour minimum resurfacing window prevents any reflection from repeating within a reading session.
- Companion observations are not surfaced as alerts. They scroll past. The reader chooses to notice or not.
- After a long session: no summary, no achievement, no gamified conclusion. The companion is still there, unchanged.
