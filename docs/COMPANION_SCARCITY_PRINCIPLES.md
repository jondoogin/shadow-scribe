# Companion Scarcity Principles
**Session 76 · May 15, 2026**

---

## The Core Principle

Lantern is not an observation engine.

It is a scarcity engine.

Its emotional effectiveness emerges not from how much it says, but from when it chooses to say something — and what it chooses not to say. The companion becomes weaker as it becomes more present. Every additional observation reduces the weight of the observations that came before it.

This document defines why scarcity is foundational to Lantern's identity, and how that principle is expressed in the code.

---

## Why Silence Is Foundational

A companion that speaks continuously is not a companion. It is a feed.

The internal alpha (Session 74) confirmed this: under heavy annotation, the insight carousel at 9 observations × 7 seconds required 63 seconds for a full rotation. A reader returning to their book encountered the same nine observations rotating in sequence. By the third visit, the strip was background noise.

The emotional weight of the companion depends on the reader not being able to predict it. When the companion speaks rarely, each observation feels like it earned the silence it broke. When it speaks constantly, each observation arrives as part of a queue.

Silence is not absence of content. It is a deliberate companion behavior.

---

## Why Not All Observations Should Surface

The system can detect more than it should say. This is correct.

The insight engine can identify: interpretation shifts, theme persistence, temporal evolution, reading rhythm, momentum patterns, character attention, and theory arcs. Under normal reading conditions, multiple of these signals are present simultaneously. A companion that surfaces all of them simultaneously is not demonstrating intelligence — it is demonstrating throughput.

The key question for any observation is not: **"Is this valid?"** It is: **"Is this worth breaking silence for?"**

Most observations are valid. Very few are worth the silence they interrupt.

---

## The Anti-Feed Principles

These are the non-negotiable constraints that prevent the companion from becoming a content feed:

**1. Volume limits are about atmosphere, not performance.**
The observation cap (5 for standard, 2 for finished books, 3 for dormant libraries) is not a performance optimization. It is an atmosphere preservation mechanism. A carousel of 9 items announces itself as a list. A carousel of 3 items feels like the companion noticed something.

**2. Dot indicators should not announce pool depth.**
When navigation dots display 1:1 with observations, they transform the companion from an ambient presence into a numbered queue. The reader sees "9 things to read" before reading any of them. Future work: limit visible dots regardless of pool size.

**3. Timing should be asymmetrical.**
Fixed-interval carousels are metronomic. Metronomic timing is predictable. Predictable timing creates the perception of a rotating feed rather than a quiet presence. Reflections hold longer (11–13s) than presence observations (8–10s). Random jitter (0–2s) breaks the mechanical feel.

**4. Finished books should go quiet.**
The story is done. The companion's job changes from observation to archival. Finished books with sparse annotation receive silence. Finished books with dense annotation receive a maximum of 2 observations — enough to honor what the reader left behind, not enough to manufacture ongoing presence for a completed journey.

**5. Silence must feel intentional, not empty.**
The difference between deliberate silence and a broken feature is context. When the companion is quiet, the surrounding interface (the header, the mysteries tab, the notes themselves) carries the emotional weight. Silence works when the rest of the product is doing its job.

---

## The Reflection Lifecycle

Reflections are not permanent. They have a lifecycle:

| State | Meaning | Eligible for surfacing? |
|-------|---------|------------------------|
| `active` | Normal state | Yes |
| `reinforced` | Signal renewed by reader behavior | Yes (priority boosted) |
| `dormant` | Shown enough (3+ times) | No |
| `fading` | Old and never shown (14+ days) | No |
| `expired-unseen` | Fading for 30+ days, never shown | No (permanent) |
| `archival` | Book is finished | No |

A reflection becomes `reinforced` when its generating signal is still active: a character-focus reflection earns reinforcement if the reader keeps writing notes about that character. The reflection didn't become more important — the reading did.

A reflection moves to `expired-unseen` if it was never shown and too much time passed. This is not a failure — it means the observation was generated before it was needed. Some observations should never surface. The companion's restraint in not forcing them is part of its identity.

---

## Emotional Weight Preservation

As observations become rarer, each one must carry more weight. The scarcity architecture is not useful if the observations that do surface are decorative.

The following reflection qualities are what rare emergence should feel like:
- **Specific** — mentions a character, a date, a note the reader actually wrote
- **Temporally grounded** — earned by reading history, not generated from generic signals
- **Incomplete in a healthy way** — offers an observation, not a conclusion
- **Environmentally aware** — knows where the reader is in the story (arc position, momentum state)

The following qualities turn reflections into poetic wallpaper:
- Filler ambiguity ("something seems to be shifting")
- Atmospheric redundancy (same theme expressed twice in different words)
- Repetitive uncertainty phrasing ("may be", "perhaps", "something")
- Pseudo-profound abstractions that could apply to any book

The strings most at risk of becoming wallpaper are the generic threshold-based ones: "Your notes have become their own companion to this story" (fires at 7+ notes for any book), "You've been reading thematically" (fires whenever themeNotes >= 2). These are correct observations. They are not specific enough to be worth breaking silence for.

---

## Memory vs. Observation

The companion's identity promise is memory, not observation.

Observation: the companion generates text about what it can detect in the reader's current state. Any reader of this book with similar data would receive similar observations. The observation is correct but not personal.

Memory: the companion surfaces something that is specifically about this reader's arc with this book, at this moment. A note written three weeks ago is now being compared with a note written yesterday. A theory revised twice is being recognized as having changed. An interpretation that shifted between the first chapter and the thirtieth is being named.

The reflection engine's highest-value outputs — interpretation shift detection, resonance anchor identification, character focus tracking across weeks — are memory-like because they require time and accumulation. They cannot be generated on the first read. They cannot be generated without the reader having done real work.

The companion's job is to surface these rarely, precisely, at the right moment — and to be quiet the rest of the time.

---

## Scarcity Is Not Minimalism

Scarcity is not the same as being sparse for its own sake. A companion that never says anything is not scarce — it is absent.

Scarcity means: **the companion speaks when speaking is worth it, and is silent when silence is better.**

The reader who opens a book after thirty days away should see something. The reader who has written fifteen notes across six weeks of reading should encounter observations that reflect that history. The reader who has revised a theory twice should have that recognized.

But the reader who opens a book for the fifth time today should not see nine observations rotating through a carousel. They should see two things the companion has noticed, held quietly, and decided to surface now.

---

## Implementation References

- `src/utils/signalHierarchy.js` — `arbitrateCandidates()`, `shouldEnterAtmosphereMode()`, `momentumWeight()`, `SIGNAL_WEIGHTS`, domain deduplication, cross-domain suppression
- `src/utils/companionPresence.js` — `generatePresence()` collects weighted candidates and passes through arbitration; `shouldEnterAtmosphereMode` guard; arc always first
- `src/utils/invisiblePresence.js` — `computeObservationCap()` returns 3/2/1 (revised from 8/4/2); `shouldYieldToBook()` yields entirely; atmosphere mode yields arc only
- `src/components/dashboard/CompanionInsights.jsx` — 12s/18s carousel intervals; 1 injected reflection (down from 2); dots hidden at ≤2 observations
