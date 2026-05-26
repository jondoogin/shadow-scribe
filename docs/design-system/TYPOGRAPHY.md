# Shadow Scribe — Typography

---

## Philosophy

Two typefaces only. One for the literary layer, one for the functional layer. The serif makes the product feel **authored**. The sans makes it feel **precise**. Neither should ever encroach on the other's register.

---

## Typeface Pairing

### Playfair Display — Serif
*For the literary layer*

| Usage | Size | Weight |
|-------|------|--------|
| Page titles (book titles, wizard headings) | `text-xl` to `text-2xl` | `font-bold` |
| Section headers in print view | `text-sm` | `font-bold` |
| Companion identity moments | varied | `font-semibold` |
| Series names in Library | italic | `font-medium` |

Playfair Display reads like typesetting from a small press. It carries **gravitas without formality**. Its italic is particularly evocative — it should be used at moments when the UI is speaking in a more personal register.

### Inter — Sans
*For the functional layer*

| Usage | Size | Weight |
|-------|------|--------|
| Body text | `15px` base | `font-normal` |
| Metadata, labels | `10px–12px` | `font-medium` |
| Buttons | `text-[12px]–text-sm` | `font-semibold` |
| Tab labels | `text-[13px]` | `font-medium` |
| Section labels (uppercase) | `text-[10px]` | `font-semibold` |

Inter reads cleanly at all sizes. It should never be used for anything that needs to feel **narrative** — that belongs to Playfair.

---

## Hierarchy

```
Book title:         Playfair Display, 20–24px, bold, ink-900
Section heading:    Playfair Display or Inter, 15–16px, semibold, ink-800
Body text:          Inter, 13–15px, normal, ink-700/800
Metadata:           Inter, 11–12px, normal, ink-400/500
Section labels:     Inter, 10px, semibold, ink-400, UPPERCASE, tracking-widest
Captions/dates:     Inter, 10–11px, normal, ink-300/400
```

---

## Section Labels

Section labels are a deliberate pattern throughout the UI:

```css
text-[10px] font-semibold text-ink-400 uppercase tracking-widest
```

This creates **quiet visual anchoring** without imposing hierarchy loudly. The label should feel like a manuscript notation, not a heading.

Examples:
- `TITLE`
- `SERIES`
- `COMPANION MOOD`
- `SPOILER MODE`

This pattern must never be used for interactive controls — it is purely for labeling.

---

## Italic Usage

Italic text carries specific meaning in Shadow Scribe:

| Pattern | Meaning |
|---------|---------|
| Italic action links at rest | Low-stakes actions: "carry elsewhere ↓", "print companion", "put this aside" |
| Italic body text | The UI speaking in its own voice rather than the reader's voice |
| Italic empty states | Evocative invitations, not instructions |
| Italic metadata | Date annotations, revision markers |

Italic should feel like the product **leaning in slightly** — a change of register, not a change of importance.

---

## Typography Anti-Patterns

- No heading text in pure `ink-900` on anything but cream/white surfaces
- No `font-bold` on Inter below `13px` — it becomes illegible and heavy
- No all-caps Playfair Display — the letterforms are too decorative
- No `tracking-wider` on serif text — Playfair already has natural optical spacing
- No body text above `15px` in the functional layer — this starts to feel like an accessibility mode, not a design choice
- No Inter for book titles — always Playfair Display

---

## Line Height

| Use case | Line height |
|----------|-------------|
| Body text, notes, descriptions | `leading-relaxed` (1.625) |
| Multi-line headings | `leading-snug` (1.375) |
| Single-line labels | `leading-none` or `leading-tight` |
| Companion Insight strips | `leading-relaxed` with `max-w` constraint |

The UI breathes. Dense line spacing feels like a dashboard. Shadow Scribe should feel like a manuscript with generous margins.
