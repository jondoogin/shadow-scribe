/**
 * depthLevel.js — Companion depth gating.
 *
 * Three levels per book (default 'resonant'):
 *   quiet     — mostly silent record. No AI calls, no ambient observations,
 *               no companion replies. The note + reading log still works.
 *   resonant  — default. Companion responds to notes, ambient carousel runs,
 *               session reflections fire, chat is live.
 *   saturated — same AI calls as resonant, plus more observations on screen
 *               at once. (Soft enhancement; tune over time.)
 *
 * Per-book override via book.depthLevel; falls back to settings.defaultDepthLevel.
 *
 * Call sites:
 *   - NotesTab.addNote / submitThreadReply  → aiEnabled() gate
 *   - ChapterUpdateModal session reflection → aiEnabled() gate
 *   - CompanionBand chat + ambient carousel → aiEnabled() / ambientEnabled()
 *   - CompanionBand observation density     → observationDensity()
 */

const VALID = new Set(['quiet', 'resonant', 'saturated'])

export function bookDepth(book, settings) {
  const d = book?.depthLevel
  if (VALID.has(d)) return d
  const def = settings?.defaultDepthLevel
  if (VALID.has(def)) return def
  return 'resonant'
}

/** True when AI-backed companion responses should fire for this book. */
export function aiEnabled(book, settings) {
  return bookDepth(book, settings) !== 'quiet'
}

/** True when the ambient observation carousel should render at all. */
export function ambientEnabled(book, settings) {
  return bookDepth(book, settings) !== 'quiet'
}

/**
 * Multiplier for how many observations / reflections to surface at once.
 *   quiet     → 0  (suppress)
 *   resonant  → 1  (default)
 *   saturated → 1.5 (more density)
 */
export function observationDensity(book, settings) {
  const d = bookDepth(book, settings)
  if (d === 'quiet')     return 0
  if (d === 'saturated') return 1.5
  return 1
}

/** Human-readable label for the current depth. */
export function depthLabel(book, settings) {
  const d = bookDepth(book, settings)
  if (d === 'quiet')     return 'Quiet'
  if (d === 'saturated') return 'Saturated'
  return 'Resonant'
}
