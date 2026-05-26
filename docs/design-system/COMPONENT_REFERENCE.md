# Shadow Scribe — Component Reference

*Emotional purpose, interaction tone, and drift prevention for key components.*

---

## CompanionHeader

**File:** `src/components/dashboard/CompanionHeader.jsx`

**Emotional purpose:**
This is the reader's first moment with a companion. It should feel like opening a book to its first pages — the title, the cover, the sense of where you are in the story. It carries the book's identity (title, author, cover) and the companion's identity (mood, progress, lifecycle state).

**What it does:**
- Displays book cover, title, author, series, progress, mood
- Mood selector (inline swatch bar)
- Lifecycle actions (begin/pause/resume/finish/restart/archive/restore)
- Metadata edit form (title, author, chapters, format, spoilerMode, series, cover)
- Export ("carry elsewhere ↓") and print ("print companion") entry points

**Interaction tone:**
- Lifecycle actions are italic text links at rest — they don't demand attention
- The "Tell the companion where you are" button is the primary action — it should always feel reachable, never urgent
- Edit mode opens inline, within the existing layout — not in a modal
- Mood swatches are minimal dots that bloom slightly on hover

**What must not drift:**
- The book title stays serif (`font-serif`) and leads the hierarchy
- The lifecycle actions must remain at the bottom — never elevated
- The mood selector must remain subtle — never a full-width color picker
- The "edit" trigger must remain a quiet `· edit` link — never a button

---

## BookCard

**File:** `src/components/library/BookCard.jsx`

**Emotional purpose:**
A book card in the Library is a **spine on a shelf** — recognizable at a glance, quietly communicating the book's identity and the reader's relationship to it. The mood accent color personalizes each card without visual competition between cards.

**What it does:**
- Displays cover thumbnail, title, author, series info (if any)
- Progress bar (mood-accented)
- Status badge + chapter progress + percentage
- `data-mood` scoped per-card so each carries its own `--ca` values

**Interaction tone:**
- Hover: gentle `translateY(-1px)` lift — tactile, not dramatic
- Title color transitions on hover via `.book-card-title` — feels atmospheric, not UI-ish
- No visible hover overlay or color fill — just the light shift

**What must not drift:**
- The `data-mood` attribute must stay on the card root — it's how mood scoping works
- The card must remain `bg-cream-50` — the slightly-lighter-than-background surface
- The cover thumbnail must maintain `72px` width — any wider makes the card feel like a poster
- The percentage text color must remain `var(--ca)` — it connects to the mood system

---

## ReadingMomentum

**File:** `src/components/dashboard/ReadingMomentum.jsx`

**Emotional purpose:**
A quiet acknowledgment of the rhythm of the reader's engagement with the book. It is the companion's most observational element — it says something true about how the reader has been reading, without instruction or judgment.

**What it does:**
- Displays streak count, session count, last session
- Paused-state copy (10 tiers based on how long ago the reader paused)
- Active-state copy (streak and session observations)
- The momentum dot (pulsing, very subtle)

**Interaction tone:**
- No interactive elements — purely observational
- The copy should feel *earned* — it knows something about this specific reader
- The dot pulses slowly, like a quiet heartbeat

**What must not drift:**
- Never add gamification language ("Keep it up!", "Day 5!")
- The dot color must remain mood-accented (`var(--ca)`)
- The copy tier system must remain literary — no metric-speak

---

## CompanionInsights

**File:** `src/components/dashboard/CompanionInsights.jsx`

**Emotional purpose:**
The product's primary voice. Companion Insights is where Shadow Scribe speaks — where the 11-lens presence engine produces literary observations about the reader's relationship with the book. It is the single most differentiated piece of the product.

**What it does:**
- Displays up to 8 rotating literary observation strings
- Auto-advances every 7 seconds
- Tinted background using `--ca-bg` (the `.insight-strip` class)

**Interaction tone:**
- Passive — the reader doesn't interact with it
- The observations appear and cycle quietly; no progress dots, no arrows
- The background tint is subtle — the reader should not feel "inside" a colored box

**What must not drift:**
- Never add "like/save" controls to individual insights
- Never show all insights simultaneously (list mode) — the cycling is intentional
- The background must remain the `.insight-strip` tint — never a solid color
- Font size must remain readable but not dominant — these are observations, not headlines

---

## ChapterUpdateModal

**File:** `src/components/modals/ChapterUpdateModal.jsx`

**Emotional purpose:**
The primary ritual of the companion relationship. Opening this modal is the act of **checking in** — telling the companion where you are in the story. It should feel momentous without being ceremonial.

**What it does:**
- Natural-language chapter input (parses "chapter 12", "I'm on 12", etc.)
- Chapter title resolution
- Success state with ✦ animation
- Full ARIA dialog semantics, focus trap, scroll lock, ESC close

**Interaction tone:**
- The input is generous — it accepts human phrasing, not just numbers
- The success state ("Return to the companion ✦") is the modal's emotional peak
- The ✦ is `aria-hidden` — it is decorative, not content

**What must not drift:**
- The success state must remain the primary interaction outcome — it should feel like a moment
- The modal must remain accessible: focus trap, ARIA labelling, ESC close, focus restoration
- The input must not become a form — it must remain a single, generous text field

---

## RelationshipMap

**File:** `src/components/dashboard/RelationshipMap.jsx`

**Emotional purpose:**
A **constellation** of the characters the reader has been tracking. The relationship map is the visual expression of the story's social world — it should feel like looking at the night sky, not at a database.

**What it does:**
- SVG-based force-positioned character nodes
- Lines connecting related characters with type encoding (love, ally, tension, hierarchy, neutral)
- Spoiler-gated — hides future characters in strict/relaxed modes

**Interaction tone:**
- Hover on nodes: `scale(1.12)` — stars brightening slightly
- Currently read-only; interactivity is a future milestone

**What must not drift:**
- The constellation metaphor — nodes are stars, not boxes
- Spoiler gating must remain absolute — no future characters visible in strict mode
- The SVG approach (not a graph library) — it preserves full control over aesthetics

---

## WeightedProgressBar

**File:** `src/components/shared/WeightedProgressBar.jsx`

**Emotional purpose:**
An honest representation of the reader's progress — acknowledging that not all chapters are equal in weight. It is more sophisticated than a percentage bar without being demonstrative about it.

**What it does:**
- Segmented bar with proportional chapter weights
- Completed chapters filled with mood accent color
- Very subtle, very small (`h-2`)

**What must not drift:**
- Height must remain small — `h-2` or similar; this is an accent, not a feature
- Fill must remain `var(--ca)` — mood-accented
- Segments must remain subtle — no heavy borders between segments

---

## EmptyState

**File:** `src/components/shared/EmptyState.jsx`

**Emotional purpose:**
The most literary moment in the product. Empty states must be written *better* than any other copy. They are the companion speaking into the silence of an unfilled section — and they must make the reader want to fill it.

**What must not drift:**
- Never use procedural empty state copy ("No items yet")
- Never use emoji in empty states
- Always include a quiet literary invitation — the companion is *waiting*, not empty
- The action link (when present) must be text-only, small, and restrained

---

## Print View (`CompanionPrint`)

**File:** `src/components/print/CompanionPrint.jsx`

**Emotional purpose:**
The **archival climax** of a companion. Printing a companion is an act of permanence — the reader is creating a lasting document of their experience with a book. The print view should feel like something you would keep.

**What must not drift:**
- White background always (even in dark mode — print is always light)
- Serif-forward typography for section headers
- Absolute dates only (no relative "3d ago")
- Spoiler engine fully applied — no leakage
- Minimal decoration — borders and left-rules only, no accent colors

---

## CreateCompanion

**File:** `src/components/library/CreateCompanion.jsx`

**Emotional purpose:**
The beginning of a companionship. The 3-step wizard should feel like **choosing a book from the shelf and opening it** — deliberate, personal, slightly ceremonial.

**What it does:**
- Step 1: Title, author, ISBN (with live cover preview), format, mood selection
- Step 2: Chapter structure, series
- Step 3: Spoiler mode, companion summary, creation

**Interaction tone:**
- The mood selection is the most personal step — it should feel like choosing a reading atmosphere
- The format selection uses large tap targets with icons — this is a meaningful choice
- The companion summary on Step 3 should feel like a preview of the relationship

**What must not drift:**
- The 3-step structure — never collapse into a single form
- The mood selection must remain visible — it is a creative act, not a setting
- The creation button copy: "✦ Begin the companion" — never "Create" or "Save"
