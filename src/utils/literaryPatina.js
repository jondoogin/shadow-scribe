/**
 * literaryPatina.js — Environmental Memory + Literary Patina
 *
 * Lantern's reading environment should feel increasingly inhabited over time.
 * Not updated by data — altered by the act of reading.
 *
 * This module computes lightweight environmental accumulation signals:
 *
 *   NOTE AGING          Older notes fade slightly; emotionally persistent notes resist
 *   CHAPTER PATINA      Completed chapters accumulate visual warmth from reading density
 *   ATMOSPHERIC TINT    Emotional weather influences surface warmth
 *   READING DEPTH       How inhabited a book feels overall (0–1)
 *
 * RESTRAINT PRINCIPLES
 *   - No heatmaps, no visible scores, no analytics language
 *   - Changes must feel discovered subconsciously, not noticed explicitly
 *   - Emotional persistence resists fading — high-resonance notes stay warm
 *   - Everything ages gracefully; nothing disappears
 */

import { liveItems } from './live.js'

// ── Note age ──────────────────────────────────────────────────────────────────

/**
 * Returns the age category of a note based on its creation date.
 * 'fresh'    < 24 hours
 * 'recent'   < 7 days
 * 'settled'  < 30 days
 * 'archival' ≥ 30 days
 */
export function noteAgeCategory(note) {
  const ageMs   = Date.now() - new Date(note.date || Date.now()).getTime()
  const ageDays = ageMs / 86_400_000
  if (ageDays < 1)  return 'fresh'
  if (ageDays < 7)  return 'recent'
  if (ageDays < 30) return 'settled'
  return 'archival'
}

/**
 * Returns the display opacity for a note (0.72–1.0).
 *
 * Base opacity is determined by age:
 *   fresh    → 1.00
 *   recent   → 0.96
 *   settled  → 0.88
 *   archival → 0.78
 *
 * Emotionally persistent notes resist fading:
 *   resonance ≥ 5 → +0.12 (capped at 1.0)
 *   resonance ≥ 3 → +0.06
 *
 * @param {Object} note
 * @param {Object} resonanceWeights  { noteId: score } from computeResonanceWeights
 * @returns {number} 0.72–1.0
 */
export function noteAgeOpacity(note, resonanceWeights = {}) {
  const cat = noteAgeCategory(note)
  const base =
    cat === 'fresh'    ? 1.00 :
    cat === 'recent'   ? 0.96 :
    cat === 'settled'  ? 0.88 : 0.78

  const res    = resonanceWeights[note.id] || 1
  const boost  = res >= 5 ? 0.12 : res >= 3 ? 0.06 : 0

  return Math.min(1, base + boost)
}

/**
 * Returns the border alpha for a note card based on resonance and age.
 * High-resonance settled/archival notes get a slightly warmer border,
 * as if the reading has left a trace on them.
 *
 * Returns undefined (use default border) unless a warmth trace applies.
 */
export function notePatinaBorder(note, resonanceWeights = {}) {
  const cat = noteAgeCategory(note)
  const res = resonanceWeights[note.id] || 1

  // Only apply warmth to settled/archival notes with meaningful resonance
  if (cat === 'fresh' || cat === 'recent') return undefined
  if (res < 3) return undefined

  // Older high-resonance notes get a warm border trace
  const alpha = res >= 5 ? 0.28 : 0.15
  return `rgba(184, 134, 11, ${alpha})`
}

// ── Chapter patina ────────────────────────────────────────────────────────────

/**
 * Computes the patina score (0–1) for a single chapter.
 * Patina reflects how much emotional and interpretive history has
 * accumulated in this chapter — not as a visible score, but as
 * a signal for subtle visual warmth.
 *
 * Scoring:
 *   note density:            +0.12 per note (capped 0.48)
 *   resonance weight:        avg resonance × 0.04 (capped 0.20)
 *   open mysteries here:     +0.10 per unresolved mystery
 *   revised notes:           +0.08 per revised note
 *   emotionally intense:     +0.15 if peak chapter
 *   starred chapter:         +0.08 if marked important
 *   theory notes:            +0.05 per theory note (capped 0.15)
 *
 * @param {number} chNum         Chapter number
 * @param {Array}  notes         All book notes
 * @param {Array}  mysteries     All book mysteries
 * @param {Object} resonanceWeights  { noteId: score }
 * @param {Set}    peakChapters  Set of emotionally peak chapter numbers
 * @param {boolean} isImportant  Whether this chapter is starred
 * @returns {number} 0–1
 */
export function computeChapterPatina(chNum, notes, mysteries, resonanceWeights = {}, peakChapters = new Set(), isImportant = false) {
  const chNotes = notes.filter(n => (n.chapter || 0) === chNum)
  const chMyst  = (mysteries || []).filter(m => !m.resolved && (m.chapter || 0) === chNum)

  let score = 0

  // Note density
  score += Math.min(chNotes.length * 0.12, 0.48)

  // Average resonance weight
  if (chNotes.length) {
    const avgRes = chNotes.reduce((s, n) => s + (resonanceWeights[n.id] || 1), 0) / chNotes.length
    score += Math.min((avgRes - 1) * 0.04, 0.20)
  }

  // Open mysteries from this chapter
  score += Math.min(chMyst.length * 0.10, 0.20)

  // Revised notes
  const revised = chNotes.filter(n => n.revisedAt).length
  score += Math.min(revised * 0.08, 0.16)

  // Theory notes
  const theories = chNotes.filter(n => n.tag === 'theory').length
  score += Math.min(theories * 0.05, 0.15)

  // Emotional peak
  if (peakChapters.has(chNum)) score += 0.15

  // Starred chapter
  if (isImportant) score += 0.08

  return Math.min(1, score)
}

/**
 * Returns an inline style object for a chapter row based on its patina score.
 * Only applied to completed chapters.
 *
 * Visual effect: a subtle left inset shadow in the book's accent gold.
 * At low scores: barely perceptible (reader won't notice consciously).
 * At high scores: a quiet warmth — the chapter feels inhabited.
 *
 * Uses rgba(184, 134, 11, alpha) — the base gold (#B8860B) for accent.
 *
 * @param {number}  score        Patina score 0–1
 * @param {boolean} isCompleted  Only completed chapters get patina
 * @returns {Object} style object (possibly empty)
 */
export function chapterPatinaStyle(score, isCompleted) {
  if (!isCompleted || score < 0.12) return {}

  // Inset left shadow: narrow, low opacity — felt more than seen
  const alpha = score < 0.28 ? 0.14 : score < 0.45 ? 0.22 : score < 0.65 ? 0.30 : 0.38
  return {
    boxShadow: `inset 3px 0 0 rgba(184, 134, 11, ${alpha})`,
  }
}

// ── Overall reading depth ─────────────────────────────────────────────────────

/**
 * Computes how inhabited a book feels overall (0–1).
 * Combines: note count, session count, revision depth, mystery density.
 *
 * Used for atmospheric tinting decisions — heavily inhabited books
 * deserve the strongest environmental accumulation effects.
 *
 * @param {Object} book
 * @returns {number} 0–1
 */
export function computeReadingDepth(book) {
  const notes     = liveItems(book.notes)
  const mysteries = liveItems(book.mysteries)
  const log       = book.readingLog   || []

  let depth = 0

  // Note density
  depth += Math.min(notes.length * 0.025, 0.30)

  // Revision/reflection depth
  const revised   = notes.filter(n => n.revisedAt).length
  const reflected = notes.filter(n => n.reflection).length
  depth += Math.min((revised + reflected) * 0.04, 0.20)

  // Mystery complexity
  depth += Math.min(mysteries.length * 0.03, 0.15)

  // Session span
  const sessions = log.filter(e => e && typeof e === 'object' && e.date)
  depth += Math.min(sessions.length * 0.02, 0.15)

  // Quote collection
  const quotes = notes.filter(n => n.tag === 'quote').length
  depth += Math.min(quotes * 0.03, 0.10)

  return Math.min(1, depth)
}

// ── Age distribution summary ──────────────────────────────────────────────────

/**
 * Returns a count breakdown of note age categories.
 * Used for DebugPage environmental memory inspection.
 *
 * @param {Array} notes
 * @returns {{ fresh: number, recent: number, settled: number, archival: number }}
 */
export function noteAgeDistribution(notes) {
  const dist = { fresh: 0, recent: 0, settled: 0, archival: 0 }
  for (const note of notes) dist[noteAgeCategory(note)]++
  return dist
}
