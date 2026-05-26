/**
 * emotionalGravity.js — Emotional Gravity + Memory Asymmetry
 *
 * Human reading memory is not evenly distributed. Some chapters disappear.
 * Others become permanent. Some notes fade; others distort the emotional
 * atmosphere around them for weeks. This module identifies the asymmetry.
 *
 * GRAVITY accumulates from signals that indicate disproportionate pull:
 *   - resonance density (reader kept returning to notes from this chapter)
 *   - theory revision (collapsed certainty leaves gravitational traces)
 *   - persistent open mysteries (unresolved threads refuse to loosen)
 *   - silence aftermath (dense chapter followed by the reader going quiet)
 *   - motif origin (this chapter introduced a word the reading won't let go)
 *   - starred chapter (reader consciously marked it as pivotal)
 *   - ancient unresolved mystery (gap ≥ 8 chapters = accumulating weight)
 *
 * SINGULARITIES are chapters with gravity significantly above average —
 * the places in the reading history that bend nearby memory and atmosphere.
 * They are rare, earned, and slightly mysterious.
 *
 * SILENCE TAXONOMY differentiates kinds of reading absence:
 *   peaceful    — quiet without tension
 *   unresolved  — gap with active open threads
 *   exhausted   — silence after a burst of engagement
 *   post-climax — quiet after an emotionally dense stretch
 *   grieving    — pause after destabilization
 *   dormant     — very long absence (30+ days)
 *
 * RESTRAINT PRINCIPLES
 *   - Gravity scores are never shown to the reader
 *   - Singularities influence atmosphere, not labels
 *   - Silence types shape companion language, not UI states
 *   - Jitter makes gravity slightly non-deterministic — partially mysterious
 */

// ── Deterministic jitter ──────────────────────────────────────────────────────

/**
 * Adds ±0.05 jitter to a gravity score based on a string seed.
 * Deterministic (same inputs → same output) but not obviously legible.
 * This makes gravity slightly asymmetric even for otherwise identical inputs,
 * and prevents the system from feeling like clean analytics.
 */
function gravityJitter(seed) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0xffffffff
  }
  return ((Math.abs(hash) % 100) / 1000) - 0.05
}

// ── Chapter gravity ───────────────────────────────────────────────────────────

/**
 * Computes the emotional gravity of a single chapter (0–1).
 * Gravity is heavier than patina — it reflects how much disproportionate
 * pull this chapter exerts on the reading experience as a whole.
 *
 * @param {number}  chNum            Chapter number
 * @param {Object}  book             Full book object
 * @param {Object}  resonanceWeights { noteId: score } from computeResonanceWeights
 * @param {Array}   motifs           [{ word, firstChapter, ... }] from detectMotifs
 * @returns {number} 0–1
 */
export function computeChapterGravity(chNum, book, resonanceWeights = {}, motifs = []) {
  const notes     = book.notes     || []
  const mysteries = book.mysteries || []
  const chapters  = book.chapters  || []
  const currentCh = book.currentChapter || 0

  const chNotes = notes.filter(n => (n.chapter || 0) === chNum)
  const chMyst  = mysteries.filter(m => (m.chapter || 0) === chNum)

  let score = 0

  // Resonance density — emotionally loaded notes from this chapter
  const totalRes = chNotes.reduce((s, n) => s + (resonanceWeights[n.id] || 1), 0)
  score += Math.min(totalRes * 0.05, 0.35)

  // Theory revision — collapsed certainties leave lasting traces
  const revisedTheories = chNotes.filter(n => n.tag === 'theory' && n.revisedAt).length
  score += revisedTheories * 0.12

  // Open mysteries that originated here
  const openMyst = chMyst.filter(m => !m.resolved)
  score += Math.min(openMyst.length * 0.10, 0.20)

  // Ancient unresolved mystery (8+ chapters open) — accumulated weight
  const ancientMyst = openMyst.filter(() => (currentCh - chNum) >= 8).length
  score += ancientMyst * 0.10

  // Silence aftermath — dense chapter followed by reading going quiet
  const afterNotes   = notes.filter(n => (n.chapter || 0) > chNum)
  const nextChNotes  = notes.filter(n => (n.chapter || 0) === chNum + 1).length
  if (chNotes.length >= 2 && afterNotes.length > 0 && nextChNotes === 0) {
    score += 0.14
  }

  // Motif origin — this chapter introduced a word the reading keeps returning to
  const chMotifOrigins = motifs.filter(m => m.firstChapter === chNum).length
  score += Math.min(chMotifOrigins * 0.07, 0.14)

  // Starred as pivotal — reader consciously marked it
  const ch = chapters.find(c => c.num === chNum)
  if (ch?.important) score += 0.08

  // Reflected or revised notes (second thoughts happened here)
  const deepNotes = chNotes.filter(n => n.reflection || n.revisedAt).length
  score += Math.min(deepNotes * 0.06, 0.12)

  // Deterministic jitter — makes the system feel partially mysterious
  score += gravityJitter(String(chNum) + (book.id || ''))

  return Math.min(1, Math.max(0, score))
}

// ── Singularity detection ─────────────────────────────────────────────────────

/**
 * Identifies memory singularities — chapters with gravity significantly
 * above the reading's average. These are the places that bend nearby
 * memory and atmosphere.
 *
 * Singularity threshold:
 *   gravity ≥ 0.45 AND ≥ 1.7× the average chapter gravity
 *
 * Returns at most 3 singularities. Designed to be rare.
 *
 * @param {Object} book
 * @param {Object} resonanceWeights
 * @param {Array}  motifs
 * @returns {Array} [{ num, gravity }] sorted by gravity desc
 */
export function detectSingularities(book, resonanceWeights = {}, motifs = []) {
  const completed = (book.chapters || []).filter(c => c.completed)
  if (completed.length < 3) return []

  const gravities = completed.map(ch => ({
    num:     ch.num,
    gravity: computeChapterGravity(ch.num, book, resonanceWeights, motifs),
  }))

  const avg = gravities.reduce((s, g) => s + g.gravity, 0) / gravities.length

  return gravities
    .filter(g => g.gravity >= 0.45 && g.gravity >= avg * 1.7)
    .sort((a, b) => b.gravity - a.gravity)
    .slice(0, 3)
}

// ── Chapter gravity map ───────────────────────────────────────────────────────

/**
 * Computes gravity for all completed chapters.
 * Returns { chNum: gravityScore }.
 */
export function buildGravityMap(book, resonanceWeights = {}, motifs = []) {
  const map = {}
  for (const ch of (book.chapters || [])) {
    if (ch.completed) {
      map[ch.num] = computeChapterGravity(ch.num, book, resonanceWeights, motifs)
    }
  }
  return map
}

// ── Silence taxonomy ──────────────────────────────────────────────────────────

/**
 * Classifies the current reading silence into an emotional type.
 * Returns null if gap < 3 days (not a meaningful silence) or no sessions.
 *
 * Silence types and their emotional character:
 *   'dormant'     Very long absence (≥30 days) — story suspended in time
 *   'grieving'    Gap after destabilization — certainties came apart
 *   'exhausted'   Silence after an annotation burst — something asked for space
 *   'post-climax' Quiet after a dense, intense reading stretch
 *   'unresolved'  Gap with active open threads pulling at the silence
 *   'peaceful'    Absence without apparent tension — story is simply waiting
 *
 * @param {Object} book
 * @returns {{ type: string, gapDays: number } | null}
 */
export function classifySilence(book) {
  const log = (book.readingLog || []).filter(e => e && typeof e === 'object' && e.date)
  const era = book.rereadCount || 0
  const eraLg = log.filter(s => (s.rereadEra ?? 0) === era)
  if (!eraLg.length) return null

  const dates = [...new Set(eraLg.map(s => s.date))].sort()
  const lastDate = dates[dates.length - 1]
  const gapDays = (Date.now() - new Date(lastDate).getTime()) / 86_400_000
  if (gapDays < 3) return null

  const gap = Math.floor(gapDays)
  const notes     = book.notes     || []
  const mysteries = book.mysteries || []
  const currentCh = book.currentChapter || 0

  // Dormant — very long absence; the story is unchanged and waiting
  if (gapDays >= 30) return { type: 'dormant', gapDays: gap }

  // Grieving — gap following destabilization (revised theory / reframed mystery)
  const recentCh       = Math.max(0, currentCh - 5)
  const recentRevised  = notes.filter(n => n.revisedAt && (n.chapter || 0) >= recentCh).length
  const recentReframed = mysteries.filter(m => m.originalText && (m.chapter || 0) >= recentCh).length
  if ((recentRevised + recentReframed) >= 1 && gapDays >= 5) {
    return { type: 'grieving', gapDays: gap }
  }

  // Exhausted — annotation burst followed by abrupt quiet
  const recentNotes   = notes.filter(n => (n.chapter || 0) >= Math.max(1, currentCh - 4))
  const currentChN    = notes.filter(n => (n.chapter || 0) === currentCh)
  if (recentNotes.length >= 5 && currentChN.length === 0 && gapDays >= 4) {
    return { type: 'exhausted', gapDays: gap }
  }

  // Post-climax — quiet after dense reading in immediately prior chapter
  const priorDense = notes.filter(n => (n.chapter || 0) === currentCh - 1).length
  if (priorDense >= 3 && currentChN.length === 0 && gapDays >= 3) {
    return { type: 'post-climax', gapDays: gap }
  }

  // Unresolved — open tension waiting in the silence
  const openMyst  = mysteries.filter(m => !m.resolved).length
  const theories  = notes.filter(n => n.tag === 'theory').length
  if (openMyst >= 2 && theories >= 2) {
    return { type: 'unresolved', gapDays: gap }
  }

  // Peaceful — absence without apparent narrative tension
  return { type: 'peaceful', gapDays: gap }
}

// ── Gravity-amplified patina ──────────────────────────────────────────────────

/**
 * Returns the combined patina+gravity score for visual warmth.
 * Gravity amplifies patina — high-gravity chapters resist environmental cooling.
 *
 * amplifiedPatina = patina + gravity * 0.30
 *
 * @param {number} patina   Raw patina score (0–1)
 * @param {number} gravity  Raw gravity score (0–1)
 * @returns {number} 0–1
 */
export function amplifyPatina(patina, gravity) {
  return Math.min(1, patina + gravity * 0.30)
}

// ── Note gravity (individual note persistence) ────────────────────────────────

/**
 * Computes whether an individual note has gravitational persistence —
 * whether it refuses to cool even as it ages.
 *
 * Returns a persistence multiplier for opacity: 1.0 (no effect) to 1.2.
 * Applied on top of the standard age opacity.
 *
 * Signals:
 *   - Part of a singularity chapter: +0.15
 *   - Has reflection AND revision (deepest engagement): +0.12
 *   - Resonance ≥ 6: +0.10
 *   - Quote tag (verbatim capture = emotional event): +0.06
 *   - Theory tag + revised (collapsed certainty): +0.08
 */
export function noteGravityPersistence(note, resonanceWeights = {}, singularityNums = new Set()) {
  let bonus = 0
  if (singularityNums.has(note.chapter || 0)) bonus += 0.15
  if (note.reflection && note.revisedAt) bonus += 0.12
  const res = resonanceWeights[note.id] || 1
  if (res >= 6) bonus += 0.10
  else if (res >= 4) bonus += 0.05
  if (note.tag === 'quote') bonus += 0.06
  if (note.tag === 'theory' && note.revisedAt) bonus += 0.08
  return 1 + Math.min(bonus, 0.25)
}
