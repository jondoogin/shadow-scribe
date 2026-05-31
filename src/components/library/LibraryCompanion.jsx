import { useMemo } from 'react'
import { generateCrossBookObservation } from '../../utils/crossBookMemory.js'

// ── LibraryCompanion ──────────────────────────────────────────────────────────
// One ambient observation about the reader, drawn from patterns across all books.
// Appears at the top of the library when there's enough data to say something true.
//
// This is different from book-level PresenceStrip observations:
// those speak to a specific story.
// This speaks to the reader as a reader.
//
// Rules:
// - shows at most one observation
// - returns null when data is insufficient (< 2 annotated books)
// - no cycling, no carousel — this is settled, not rotating
// - no ✦ glyph — that belongs to the book companion. This uses ◦.
// - text is 13px italic ink-600, receded but legible
// - only visible in grouped library view (not filtered/search)

export default function LibraryCompanion({ books }) {
  const observation = useMemo(
    () => generateCrossBookObservation(books),
    // Regenerate when book count or annotation count changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [books.length, books.reduce((s, b) => s + (b.notes || []).length + (b.mysteries || []).length, 0)]
  )

  if (!observation) return null

  return (
    <div className="animate-fade-in" style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{
          fontSize: 9,
          color: 'var(--color-ink-400)',
          marginTop: 4,
          flexShrink: 0,
        }}>◦</span>
        <p
          className="font-serif italic"
          style={{
            fontSize: 13,
            color: 'var(--color-ink-600)',
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {observation}
        </p>
      </div>
    </div>
  )
}
