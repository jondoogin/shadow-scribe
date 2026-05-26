/**
 * transformScore.js — Session 68
 * Pure detection functions for interpretive mutation signals:
 * meaning that has changed shape, not merely persisted.
 *
 * All functions are pure — no side effects, no imports required.
 */

// ── Collapsed certainty ───────────────────────────────────────────────────────
// A theory note that has been revised = the reader was certain, then wasn't.
// `revisedAt` is set by the notes update flow when the reader edits a theory.

/**
 * Returns theory notes that have been revised — collapsed interpretive certainty.
 * @param {Array} notes
 * @returns {Array} revised theory notes
 */
export function detectCollapsedCertainty(notes) {
  if (!notes?.length) return []
  return notes.filter(n => n.tag === 'theory' && n.revisedAt)
}

// ── Mystery refinements ───────────────────────────────────────────────────────
// A mystery with `originalText` = the reader changed the question itself.
// The question wasn't answered — it mutated.

/**
 * Returns unresolved mysteries whose phrasing has changed since first written.
 * `originalText` is set when the reader edits a mystery thread.
 * @param {Array} mysteries
 * @returns {Array} mysteries with originalText
 */
export function detectMysteryRefinements(mysteries) {
  if (!mysteries?.length) return []
  return mysteries.filter(m => !m.resolved && m.originalText)
}

// ── Quote recontextualization ─────────────────────────────────────────────────
// A quote note from early in the reading whose keywords appear in recent theory notes.
// The reader captured something; later their theories started circling back to it.

/**
 * Returns quote notes that are echoed by recent theory notes (keyword overlap).
 * "Early" = note chapter ≤ currentChapter * 0.40
 * "Recent" = theory notes from the last 5 chapters
 * @param {Array} notes
 * @param {number} currentChapter
 * @returns {Array} quote notes with echo property { note, echoNotes }
 */
export function detectQuoteRecontextualization(notes, currentChapter) {
  if (!notes?.length || !currentChapter) return []

  function kw(text) {
    if (!text) return []
    return [...new Set(text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 4))]
  }

  const earlyQuotes = notes.filter(n =>
    n.tag === 'quote' && n.chapter && n.chapter <= currentChapter * 0.40
  )
  const recentTheories = notes.filter(n =>
    n.tag === 'theory' && n.chapter && n.chapter >= currentChapter - 5
  )

  if (!earlyQuotes.length || !recentTheories.length) return []

  const results = []
  for (const q of earlyQuotes) {
    const qWords = new Set(kw(q.text))
    const echoNotes = recentTheories.filter(t => kw(t.text).some(w => qWords.has(w)))
    if (echoNotes.length) results.push({ note: q, echoNotes })
  }
  return results
}

// ── Chapter destabilization ───────────────────────────────────────────────────
// A map of chapters where meaning has been actively renegotiated:
// notes revised, theories collapsed, or mysteries reframed in that chapter.

/**
 * Returns a map of chapter numbers → destabilization signals.
 * { [chNum]: { revised: number, collapsedTheories: number, hasRefinedMystery: boolean } }
 * Only includes chapters with at least one destabilization signal.
 * @param {Object} book
 * @returns {Object}
 */
export function detectChapterDestabilization(book) {
  const notes     = book?.notes || []
  const mysteries = book?.mysteries || []
  const result    = {}

  for (const note of notes) {
    if (!note.chapter) continue
    const ch = note.chapter
    if (!result[ch]) result[ch] = { revised: 0, collapsedTheories: 0, hasRefinedMystery: false }
    if (note.revisedAt)                           result[ch].revised++
    if (note.revisedAt && note.tag === 'theory')  result[ch].collapsedTheories++
  }

  for (const m of mysteries) {
    if (!m.resolved && m.originalText && m.chapter) {
      const ch = m.chapter
      if (!result[ch]) result[ch] = { revised: 0, collapsedTheories: 0, hasRefinedMystery: false }
      result[ch].hasRefinedMystery = true
    }
  }

  // Filter to only chapters with at least one signal
  return Object.fromEntries(
    Object.entries(result).filter(([, v]) => v.revised > 0 || v.hasRefinedMystery)
  )
}
