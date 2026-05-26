# Shadow Scribe — UI Principles

---

## The Twelve Principles

These are not guidelines. They are constraints. When a design decision conflicts with a principle, the principle wins.

---

### 1. Notice More Than Explain

The UI should surface observations before it offers controls. The product's value proposition is its **interpretive intelligence** — its ability to say something true about the reading experience. Any feature that is purely mechanical (a counter, a list, a tag) should be given voice that earns its place.

*The test: could this sentence have been written by a thoughtful librarian who knows your reading?*

---

### 2. Restraint Is the Design

Shadow Scribe's visual restraint is the product, not a side effect. An interface that says less is one the reader stays in longer. Every added visual element — a color, a badge, an animation, an icon — takes something away from the literary atmosphere.

*The test: could this element be removed without the feature breaking?*

---

### 3. Language Is Interface

Microcopy is not a last step. It is the primary design material. The difference between "Update progress" and "Tell the companion where you are" is not a word choice — it is a product philosophy. Shadow Scribe should be written before it is designed.

*The test: if you read the button labels in sequence, do they sound like a product or a person?*

---

### 4. Actions Are Invitations

No action in Shadow Scribe should feel demanded, urgent, or obligatory. The reader is always in control. The companion offers; it does not require.

- Buttons have generous targets but quiet visual presence at rest
- Destructive actions are always two steps (invitation → confirmation)
- Lifecycle actions (finish, archive, restart) are phrased as possibilities, not commands

*The test: does the action feel like it's waiting for the reader, or waiting on the reader?*

---

### 5. Hierarchy Through Quiet

Visual hierarchy is established through **tone, not volume**. Section labels whisper. Primary content speaks. The companion's observations murmur.

No element should compete for attention. The book title is the most important thing on the companion page — everything else exists in service of it.

*The test: when you squint at the page, does the right element emerge first?*

---

### 6. Spoiler Safety Is Trust

The spoiler system exists to protect the reader from their own companion. It is not a feature — it is a promise. Every piece of content in the UI that can contain future-state information must pass through the spoiler engine.

This includes the print view. Breaking spoiler safety, even in a corner case, breaks trust irreversibly.

*The test: could a strict-mode reader use this feature without seeing anything beyond their current chapter?*

---

### 7. Mood Is Felt Before Seen

The companion mood system (sage, ember, ink, sienna, gold, steel) should tint the experience without declaring itself. The mood accent colors appear as edge lights on interactive elements, not as fills or backgrounds.

At no point should a reader think "this interface is themed." They should simply feel that their copy of *Middlemarch* feels different from their copy of *Blood Meridian*.

*The test: describe the companion's color without using the color's name.*

---

### 8. Accessibility Is Not Optional

- All interactive elements have `focus-visible` states
- Tab order follows reading order
- Modal dialogs have full ARIA semantics and focus traps
- Reduced-motion respects `prefers-reduced-motion`
- Touch targets are minimum 44px on mobile
- Color contrast meets WCAG AA at minimum

Accessibility work is never "done" — it is a continuous commitment.

---

### 9. Performance Is Part of the Feel

The grain texture, the ambient gradient, the shadow system — all of these contribute to a sense of physicality that depends on the UI rendering quickly and smoothly. A laggy Shadow Scribe feels like a broken atmosphere.

- Animations under 300ms
- No layout thrash on tab change
- Images always sized and cropped before storage

*The test: does interacting with the companion feel tactile and immediate?*

---

### 10. Mobile Is the Primary Canvas

Shadow Scribe is read in bed, on a commute, beside a lamp. The primary viewport is a phone. Every feature must work — and feel intentional — at 375px wide.

The desktop view is a bonus, not the target.

*The test: does this feature make sense with one thumb, lying down?*

---

### 11. Empty Is a State, Not a Bug

Empty companions — no notes, no characters, no mysteries — are a completely valid state. The product should not feel broken when a reader opens a companion they just created.

Empty states are the product's **invitation layer**. They should be written with more care than any other copy in the app.

*The test: does the empty state make the reader want to fill it, or remind them they haven't?*

---

### 12. The Archive Is a Promise

Every piece of content the reader adds to Shadow Scribe should feel permanent and owned. The export system, the print view, and the localStorage persistence all exist to fulfill the same promise: *this belongs to you*.

Archival features (export, print, JSON backup) should feel like acts of preservation, not technical utilities.

*The test: if a reader exported their companion and printed it, would they frame it?*
