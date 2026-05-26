# Lantern — Experience Principles
**Last updated:** 2026-05-15 (Session 71)

This is the experiential constitution of Lantern. It governs every product decision about how the interface behaves, moves, speaks, and feels. These principles are more permanent than feature decisions.

---

## What Lantern Is

Lantern is a **reading companion** — a quiet, archival, reflective presence that sits beside the reader as they move through a book.

It is not:
- a chatbot, mascot, or AI assistant
- a productivity tool or habit tracker
- a social reading network or recommendation engine
- a speed-reading optimizer or comprehension tester
- a Goodreads alternative

It **is**:
- a quiet presence that observes, remembers, and reflects
- a layered literary memory that survives rereads and long absences
- a notebook companion, spoiler-aware by default
- emotionally restrained — it never praises, never lectures, never urges

The companion should increasingly feel not like software for reading, but like **a place where reading lingers**.

---

## Motion Philosophy

### The principle
Motion should feel **soft, sparse, delayed, and atmospheric**. It is not feedback. It is not reward. It does not signal success.

### What motion is for
- Orienting the reader as surfaces change (slow fade-through, not a slide)
- Signaling temporal passage (reflection rotation, not a carousel)
- Creating breathing room between states (delayed appearance, not instant snap)

### What motion is not for
- Celebration
- Achievement feedback
- Attention capture
- Urgency or momentum

### Rules
- Default duration: `--dur-2` (240ms). Use `--dur-3` (420ms) for reflective transitions. Use `--dur-4` (720ms) only for breath crossfades.
- Easing: `--ease-quiet` for entries; `--ease-settle` for default movement.
- Scale never exceeds 1.04. No bounces, no spring physics, no rotation.
- The dashboard does not animate in response to achievement.
- Motion frequency **decreases** during dense reading periods, sustained immersion, post-finish, and reread states.

### Reflection rotation specifically
The companion strip should feel **present, not cycled**. Reflections are not cards in a queue — they are observations arriving gently. The auto-rotation interval (10s active / 14s finished) is slow on purpose. Occasional static persistence is preferred over continuous cycling.

---

## Spatial Philosophy

### The principle
Space is content. Negative space signals that the interface is unhurried. Density signals urgency. Lantern should never feel urgent.

### Layout rules
- Max content width: 880px (dashboard), 640px (reading copy, reflections). Wider is a dashboard; this is a journal.
- Section breathing: 24–56px between conceptual sections. Larger pauses between unrelated concepts.
- Never stack equal-weighted content blocks without visual breathing room between them.
- Avoid simultaneous focal points — reduce visual competition within any single viewport.

### Surface hierarchy
What the interface privileges spatially, in order:
1. **Reading** — the companion head, chapter position, reflection strip
2. **Emotional continuity** — reflections, notes, characters
3. **Metrics and controls** — progress percentage, chapter checklist
4. **Diagnostics and settings** — tab counts, debug info, system controls

The interface should not treat metrics and controls as primary surfaces.

### Density principles
- **Library**: archival, lived-in, temporal. Not a Netflix grid. Closer to a personal reading room.
- **Dashboard**: one quiet focal point at a time. The companion strip and the current reading state are primary.
- **Modals**: generous padding, paper-lit background, amber halo. A lit moment, not a utility overlay.

---

## Typography Philosophy

### The principle
Typography is the primary emotional instrument. Font choices carry the atmosphere before any other visual element loads.

### Type roles
- **Canela** (display): emotional and literary surfaces — book titles, companion headings, statement copy, drop caps. It is the brand voice.
- **Canela Text** (editorial): reflections, long-form notes, reading copy. Tuned for paragraphs.
- **Inter** (UI sans): everything chrome — labels, buttons, inputs, captions, navigation. Quiet and subordinate.

### Rules
- Large text should feel **calm, not heroic**. Avoid oversized headings inside app surfaces.
- Utility text should remain **quiet and low-contrast**. Do not increase font weight on metadata, captions, or secondary labels.
- Reflection copy should breathe more than standard UI text — larger line height, more vertical margin.
- Reduce excessive weight variation within a single surface.
- Sentence case everywhere except book titles.

### The overline
The `.overline` class — 10px, letter-spacing 0.18em, uppercase, `--fg-3` color — is the standard section eyebrow. Examples from the landing page: `THE READER NOTICED`, `THREADS LEFT OPEN`, `A READER'S RHYTHM`, `YOUR NOTES ARE THE COMPANION`. It sets hierarchy without weight.

---

## Interface Restraint

### The principle
The companion's authority comes from restraint, not intelligence. A companion that says less, says it more carefully, and steps away at the right moments will be trusted more than one that performs insight.

### What restraint looks like
- The interface does not respond to every action
- Silence is a valid companion state — it is not absence
- Controls are present but not prominent
- Destructive or lifecycle actions use inline confirmation, not dialogs that assert urgency
- The companion strip can be absent entirely when the narrative should speak alone

### What restraint forbids
- Toasts, success banners, or celebration states
- Action prompts that appear without reader initiation
- Hover states that feel performative rather than useful
- Badge counts or urgency indicators
- Any interface element that implies the reader is falling behind

---

## Emotional Pacing

### The principle
The interface should move at the reader's speed, not at the app's speed. It should wait. It should be patient. It should not rush.

### What this means in practice
- Empty states use poetic copy and no CTA — the companion does not nag
- The library shows books in different states of dormancy, not uniform urgency
- The chapter update flow is calm and confirmatory, not form-like
- Completion moments are quiet, not celebratory
- Long absences from a book are acknowledged gently, not flagged as failures

### Prohibited urgency signals
- Streaks as motivational pressure
- "You haven't read in N days" framing
- Red or warning-colored states for paused/abandoned books
- Progress displayed as a deficit ("only 36% read")
- Any interface copy that implies the reader owes the book something

---

## Silence Principles

### The principle
Silence is not absence. It is the companion choosing the book over itself.

### When the companion goes silent
The invisible presence layer (`invisiblePresence.js`) manages four silence modes:
1. **Fade** — fewer observations, lower strip opacity, longer carousel intervals
2. **Deep fade** — minimal observations, very low opacity, static strip
3. **Yield to book** — companion renders nothing at all
4. **Solitude protection** — complete silence for post-finish, sustained immersion, and early rereads

When the narrative is doing powerful work, the companion's highest contribution is to not interrupt.

### Silence is architectural, not stylistic
Silence is enforced by `shouldYieldToBook` returning true → `CompanionInsights` renders `null`. It is not a reduced-opacity strip that still occupies space. True silence means the companion is absent from the viewport entirely.

---

## Onboarding Tone

### The promise
The landing page establishes an emotional promise: Lantern is a quiet reading companion, not a productivity tool or AI assistant. The onboarding must fulfill this promise without feature-tour energy.

### What new users must understand
By the end of onboarding, without being told explicitly:
- Lantern accompanies reading, it does not replace or summarize it
- Notes and memories accumulate quietly over time
- The companion observes patterns — it does not analyze or diagnose
- Rereads matter and are remembered distinctly
- The reader remains primary; the companion is secondary
- Data is local and private

### Voice in onboarding
Avoid:
- "Unlock insights"
- "Supercharge your reading"
- "AI-powered"
- "Deep understanding"
- "Optimize retention"
- "Analyze your reading"
- Any productivity or self-improvement framing

Prefer:
- Continuity, memory, return, lingering
- "Tell the companion where you are"
- "A thread the story is still gathering"
- "Nothing written down yet"
- Literary, unhurried, observational tone

The companion's voice in onboarding is the same as the companion's voice throughout the product: **it has been sitting beside the reader the whole time**.

---

## What "Presence" Means Visually

Companion presence is not a toggle — it is a spectrum expressed through:

| Element | Full presence | Fading | Absent |
|---------|--------------|--------|--------|
| Strip opacity | 1.0 | 0.72 | — (not rendered) |
| Carousel interval | 10s | 14s | static / null |
| Observation count | up to 8 | 2–4 | 0 |
| Strip border | visible | visible | — |
| Background tint | `--ca-bg` at 55% | reduced | — |

The strip should never appear "broken" or "loading" in any presence state — it is either meaningfully present or meaningfully absent.

---

## How Lantern Differs from Productivity Software

Productivity software:
- Measures progress as a deficit to close
- Rewards streaks and consistency
- Summarizes rather than holds
- Treats the reader as a goal-seeking agent
- Values speed and completion

Lantern:
- Holds the reader's current place without judgment
- Acknowledges patterns without naming them as achievements
- Preserves the reader's own noticings rather than replacing them with better ones
- Treats the reader as a contemplative presence in an ongoing relationship with a book
- Values depth, patience, and the willingness to linger

The distinction is not marketing language — it is an architectural constraint. Every UI decision should preserve the contemplative relationship between reader and book.

---

## Anti-Patterns to Avoid

### Interface anti-patterns
- Dashboard density that makes the reading feel like a project
- Cards that feel like task items (borders, checkmarks, counts)
- Section headers that feel like report categories
- Progress displayed as a percentage of completion (implies a deadline)
- Companion observations that compete with the book's own atmosphere

### Copy anti-patterns
- "Track your reading" — implies obligation
- "AI insights" — implies analysis, not observation
- "Discover patterns" — implies the system has found something the reader missed
- "Your journey" — patronizing; the book is a journey, the companion is a witness
- "Keep going" or "Great work" — motivational, evaluative
- "Optimize" or "Improve" — productivity framing

### Motion anti-patterns
- Celebration animations for chapter completion
- Eager hover states that respond before intent is clear
- Simultaneous stacked transitions
- Animations that call attention to themselves

### Presence anti-patterns
- The companion speaking more than the book warrants
- Surfacing reflections at moments of emotional intensity in the narrative
- Repeating the same thematic observation until it becomes the reader's lens
- Making the companion more interesting than the book it accompanies
