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
// - text is 12px italic ink-500, very subdued
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
    <div
      className="animate-fade-in"
      style={{
        marginBottom: 28,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        opacity: 0.75,
      }}
    >
      <span style={{ fontSize: 7, color: 'var(--color-ink-300)', marginTop: 5, flexShrink: 0 }}>◦</span>
      <p
        className="font-serif italic leading-relaxed"
        style={{ fontSize: 12, color: 'var(--color-ink-500)' }}
      >
        {observation}
      </p>
    </div>
  )
}
