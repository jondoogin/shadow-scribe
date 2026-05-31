/**
 * signalHierarchy.js — Signal Hierarchy & Discernment System
 * Session 70
 *
 * Determines which companion observations are worth surfacing.
 * The companion can detect more than it should say — this module decides
 * what emotionally matters most RIGHT NOW.
 *
 * Architecture:
 *   SIGNAL WEIGHTS      Emotional importance per observation category
 *   SEMANTIC DOMAINS    One signal per domain surfaces (highest weight wins)
 *   SUPPRESSION MAP     High-tier domain present → lower-tier domain suppressed
 *   ARBITRATION         Greedy selection: weight-ordered, domain-deduplicated
 *   ATMOSPHERE MODE     Companion breathes without commentary
 */

import { computeInterruptionRisk } from './invisiblePresence.js'
import { getProgress }              from './progress.js'
import { liveItems }               from './live.js'

// ── Signal weights ─────────────────────────────────────────────────────────────
// Higher = more emotionally important. Determines surfacing priority.
// Categories map directly to observation functions in companionPresence.js.

export const SIGNAL_WEIGHTS = {
  // ── Destabilization tier — reader's prior understanding was overturned
  polarity_reversal:       10,
  collapsed_certainty:     10,
  mystery_morph:            9,

  // ── Reader transformation tier — how the reader has been changed
  reader_silence:           9,
  reader_fixation:          8,
  cross_chapter_echo:       8,
  reader_confidence:        7,
  recall:                   7,
  quote_echo:               7,
  haunted_thread:           7,
  lingering_mystery:        7,

  // ── Interpretive motion tier — active meaning-making
  theory_acceleration:      6,
  dormant_mystery:          6,
  gravitation:              6,
  reader_trajectory:        5,
  reader_cadence:           5,
  interpretation_evolution: 5,
  note_pattern:             5,
  mystery_propulsion:       5,
  widening_suspicion:       5,

  // ── Expressive silence tier — emotionally typed absence
  expressive_silence:       5.5, // sits above generic momentum; wired with explicit weight in generatePresence

  // ── Narrative context tier — story state observations
  mystery_count:            4,
  momentum:                 4,   // boosted dynamically for large gaps; superseded by expressive_silence when silence is typed
  session_stop:             3,   // reduced: stopping near a starred chapter is notable but not deeply significant
  finished_obs:             4,

  // ── Ambient tier — grounding but not surprising
  character_obs:            3,
  session_rhythm:           2,   // reduced: same-day return is minor relative to interpretive signals
  pacing:                   2,   // reduced: pace shift is context, not revelation
  reader_obs:               2,
  character_ownership:      1,   // reduced: cast-shaping is minor relative to interpretive work
  duration:                 0,   // effectively suppressed — performative, adds nothing insightful

  // ── Baseline — always included, not competed for
  arc:                      0,
}

// ── Semantic domains ───────────────────────────────────────────────────────────
// Within each domain, only the highest-weight candidate surfaces.
// This prevents semantically similar observations from both appearing.

const DOMAINS = {
  destabilization:  ['polarity_reversal', 'collapsed_certainty', 'mystery_morph'],
  reader_cadence:   ['reader_silence', 'reader_cadence', 'reader_trajectory', 'reader_fixation'],
  reader_transform: ['reader_confidence', 'recall', 'quote_echo'],
  cross_surface:    ['cross_chapter_echo', 'haunted_thread', 'gravitation'],
  mystery:          ['mystery_count', 'lingering_mystery', 'mystery_propulsion', 'widening_suspicion', 'dormant_mystery'],
  session:          ['expressive_silence', 'momentum', 'session_rhythm', 'session_stop', 'pacing'],
  reader_notes:     ['reader_obs', 'note_pattern', 'interpretation_evolution', 'theory_acceleration'],
  character:        ['character_obs', 'character_ownership'],
  narrative:        ['finished_obs', 'duration'],
}

// ── Suppression map ────────────────────────────────────────────────────────────
// If domain A is selected, these domains are blocked from also surfacing.
// Wisdom deepening: suppression expanded — high-tier signals own the moment fully.
// The companion says one thing well, not several things adequately.

const SUPPRESSES = {
  // Destabilization is the highest emotional register — everything else yields
  destabilization:  ['mystery', 'reader_notes', 'session', 'narrative', 'character',
                     'reader_transform', 'reader_cadence', 'cross_surface'],
  // Cross-surface observations (entangled notes/mysteries/echoes) own their territory
  cross_surface:    ['mystery', 'reader_notes', 'reader_transform'],
  // Active reader-state signals suppress ambient session and character talk
  reader_cadence:   ['session', 'reader_notes', 'character', 'narrative'],
  reader_transform: ['reader_notes', 'character'],
  // Active mystery state suppresses ambient duration/narrative framing
  mystery:          ['narrative'],
}

// ── Internal domain lookup ─────────────────────────────────────────────────────

function getDomain(category) {
  for (const [domain, categories] of Object.entries(DOMAINS)) {
    if (categories.includes(category)) return domain
  }
  return `solo_${category}` // each solo candidate is its own domain
}

// ── Momentum weight boost ──────────────────────────────────────────────────────
// Momentum observations have variable emotional importance based on gap size.
// A "month away from this story" is far more significant than a current streak.

export function momentumWeight(streak, gapDays) {
  if (gapDays != null && gapDays > 60) return 7
  if (gapDays != null && gapDays > 30) return 6
  if (gapDays != null && gapDays > 14) return 5
  if (streak >= 7) return 5
  if (gapDays != null && gapDays > 7)  return 4
  if (streak >= 4) return 4
  return 3
}

// ── Arbitration ───────────────────────────────────────────────────────────────

/**
 * Given an array of { text, category, weight? } candidates,
 * returns the top N observation texts by emotional importance.
 *
 * Process:
 *   1. Domain deduplication — keep only highest-weight candidate per domain
 *   2. Sort by weight descending
 *   3. Greedy selection with suppression — once a high-tier domain is chosen,
 *      its suppressed domains are blocked from also surfacing
 *
 * The arc observation is excluded — handle separately (always first).
 *
 * @param {Array<{text: string, category: string, weight?: number}>} candidates
 * @param {number} cap — max observations to return
 * @returns {string[]}
 */
export function arbitrateCandidates(candidates, cap) {
  if (!candidates.length || cap <= 0) return []

  // 1. Domain deduplication — keep only the highest-weight per domain
  const domainBest = {}
  for (const c of candidates) {
    const w = c.weight ?? (SIGNAL_WEIGHTS[c.category] ?? 1)
    const d = getDomain(c.category)
    if (!domainBest[d] || w > domainBest[d].weight) {
      domainBest[d] = { ...c, weight: w, domain: d }
    }
  }

  // 2. Sort domain winners by weight descending
  const ranked = Object.values(domainBest).sort((a, b) => b.weight - a.weight)

  // 3. Greedy selection with suppression
  const selected = []
  const suppressedDomains = new Set()

  for (const candidate of ranked) {
    if (selected.length >= cap) break
    if (suppressedDomains.has(candidate.domain)) continue

    selected.push(candidate)

    // Apply this domain's suppression rules
    for (const blocked of (SUPPRESSES[candidate.domain] || [])) {
      suppressedDomains.add(blocked)
    }
  }

  return selected.map(c => c.text)
}

// ── Atmosphere mode ────────────────────────────────────────────────────────────

/**
 * Returns true when the companion should breathe without commentary —
 * showing only the arc observation (you are here) and nothing else.
 *
 * Different from shouldYieldToBook() which returns nothing at all.
 * Atmosphere mode is a quieter state: orientation, no interpretation.
 *
 * Triggers:
 *   High interruption risk — the book is already fully carrying the experience
 *   Narrative climax with no annotation — absorbed reader, don't interrupt
 *   Dense recent interpretation — reader is already in active dialogue with text
 *
 * Wisdom deepening: interruption risk threshold lowered (0.65 → 0.55).
 * The companion yields sooner. Silence is the default, not the fallback.
 */
export function shouldEnterAtmosphereMode(book, settings) {
  const pct = getProgress(book)

  // Climax zone with no annotation — pure forward absorption
  if (pct >= 80 && pct < 97 && liveItems(book.notes).length === 0) return true

  // Lowered interruption risk threshold — companion steps back sooner
  if (computeInterruptionRisk(book) >= 0.55) return true

  // Dense recent interpretation (3+ theory/confusing/theme notes in last 24h):
  // the reader is already in deep dialogue with the text — companion would be noise
  const now = Date.now()
  const recentDeep = liveItems(book.notes).filter(n =>
    ['theory', 'confusing', 'theme'].includes(n.tag) &&
    n.date && (now - new Date(n.date).getTime()) < 86_400_000
  ).length
  if (recentDeep >= 3) return true

  return false
}
