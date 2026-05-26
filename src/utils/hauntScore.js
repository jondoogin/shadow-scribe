/**
 * hauntScore.js — Cross-surface emotional persistence scoring
 *
 * Computes how strongly a note or mystery has "haunted" the reading —
 * how much emotional gravity it has accumulated across surfaces, revisions,
 * time, and the reader's own interpretive work.
 *
 * Higher score = more likely to resurface, resist cooling, infect multiple surfaces.
 * This is the foundation of Lantern's memory hierarchy:
 *   - Low-haunt signals quietly recede (cooling)
 *   - High-haunt signals resurface unexpectedly across surfaces (selective haunting)
 *
 * Pure functions — no React dependencies, no side effects.
 */

// ── Keyword helpers ───────────────────────────────────────────────────────────

function extractKeyWords(text) {
  if (!text) return []
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4)
  )]
}

function hasKeywordOverlap(textA, textB) {
  const wordsA = extractKeyWords(textA)
  const wordsB = new Set(extractKeyWords(textB))
  return wordsA.some(w => wordsB.has(w))
}

// ── Note haunt score ──────────────────────────────────────────────────────────

/**
 * Computes emotional persistence weight for a single note.
 *
 * Scoring factors:
 *   +2.0  revised — reader returned to refine this thought
 *   +1.5  theory tag — interpretive investment
 *   +1.0  confusing tag — unresolved friction
 *   +1.5  age ≥ 10 chapters — persisting across the reading arc
 *   +0.75 age ≥ 5 chapters — notable persistence
 *   +2.5  keyword overlap with an open mystery — cross-surface infection
 *
 * Returns: number (0–9 approx), rounded to 1 decimal
 */
export function noteHauntScore(note, book) {
  let score = 0
  const currentCh = book.currentChapter || 0
  const chAge = currentCh - (note.chapter || 0)

  if (note.revisedAt) score += 2.0
  if (note.tag === 'theory') score += 1.5
  else if (note.tag === 'confusing') score += 1.0

  if (chAge >= 10) score += 1.5
  else if (chAge >= 5) score += 0.75

  const inMystery = (book.mysteries || []).some(m =>
    !m.resolved && hasKeywordOverlap(note.text, m.text)
  )
  if (inMystery) score += 2.5

  return Math.round(score * 10) / 10
}

// ── Mystery haunt score ───────────────────────────────────────────────────────

/**
 * Computes emotional persistence weight for a single mystery.
 *
 * Scoring factors:
 *   +2.0  suspected status — reader has named their suspicion
 *   +1.5  evolving status — still actively shifting
 *   +0.5  hinted status — answer approaching
 *   -0.5  dormant status — gone quiet
 *   +2.0  age ≥ 15 chapters — deep persistence
 *   +1.0  age ≥ 8 chapters
 *   +0.5  age ≥ 4 chapters
 *   +0.75 per note with keyword overlap (capped at 3.0) — note cross-surface
 *   +1.0  reader added observation — engaged with this thread
 *
 * Returns: number (0–10 approx), rounded to 1 decimal
 */
export function mysteryHauntScore(mystery, book) {
  let score = 0
  const currentCh = book.currentChapter || 0
  const chAge = currentCh - (mystery.chapter || 0)

  if (mystery.status === 'suspected') score += 2.0
  else if (mystery.status === 'evolving') score += 1.5
  else if (mystery.status === 'hinted') score += 0.5
  else if (mystery.status === 'dormant') score -= 0.5

  if (chAge >= 15) score += 2.0
  else if (chAge >= 8) score += 1.0
  else if (chAge >= 4) score += 0.5

  const noteMatches = (book.notes || []).filter(n =>
    hasKeywordOverlap(mystery.text, n.text)
  ).length
  score += Math.min(noteMatches * 0.75, 3.0)

  if (mystery.observation) score += 1.0

  return Math.round(score * 10) / 10
}

// ── Haunt level classification ────────────────────────────────────────────────

/**
 * Classifies a haunt score into a named persistence level.
 * Used for prose differentiation and subtle visual treatment.
 *
 *   'haunted'    — cross-surface, revised, aged; feels emotionally uncanny
 *   'persistent' — notable weight; recurs across reading
 *   'active'     — present and unresolved
 *   'cooling'    — fading; low engagement; should recede
 */
export function hauntLevel(score) {
  if (score >= 6.0) return 'haunted'
  if (score >= 3.5) return 'persistent'
  if (score >= 1.5) return 'active'
  return 'cooling'
}

// ── Cross-surface helpers ─────────────────────────────────────────────────────

/**
 * Returns notes that share keyword overlap with at least one open mystery.
 * These notes are cross-surface haunted — they're tangled with unresolved threads.
 */
export function getHauntedNotes(notes, mysteries) {
  const openMyst = (mysteries || []).filter(m => !m.resolved)
  if (!openMyst.length) return []
  return notes.filter(n =>
    openMyst.some(m => hasKeywordOverlap(n.text, m.text))
  )
}
