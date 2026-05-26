/**
 * readerState.js — Session 69
 * Pure detection functions for reader-state evolution.
 * These track how the reader changes emotionally while reading —
 * not how the book changes, but how the person reading it changes.
 *
 * All functions are pure — no side effects, no imports required.
 * Minimum 5 notes required before drawing any trajectory conclusions.
 */

// ── Vocabulary ────────────────────────────────────────────────────────────────

// High-confidence language — reader is certain
const CERTAINTY_W = [
  'must', 'clearly', 'definitely', 'obviously', 'convinced', 'certain',
  'know that', 'proves', 'confirm', 'no doubt', 'obviously', 'undoubtedly',
  'has to be', 'without question', 'clear that', 'evident',
]

// Low-confidence language — reader is questioning
const UNCERTAIN_W = [
  'maybe', 'perhaps', 'wonder', 'unclear', 'confused', 'unsure', 'possibly',
  "don't know", 'might be', 'uncertain', 'not sure', 'hard to tell',
  'hard to say', 'not certain', 'beginning to doubt', 'questioning whether',
]

// Emotional intensity — reader is emotionally activated
const INTENSE_W = [
  'afraid', 'terror', 'love', 'hate', 'obsess', 'devastat', 'shock',
  'betray', 'haunt', 'disturb', 'overwhelm', 'desperat', 'grief', 'dread',
  'horror', 'fascinat', 'compel', 'unbearabl', 'can\'t stop', 'can\'t shake',
  'keeps circling', 'keeps coming back', 'won\'t let go',
]

// Noise words to exclude from fixation detection
const SKIP_WORDS = new Set([
  'about', 'after', 'again', 'being', 'could', 'every', 'first', 'going',
  'their', 'there', 'these', 'think', 'though', 'three', 'under', 'where',
  'which', 'while', 'would', 'write', 'wrote', 'story', 'chapter', 'character',
  'something', 'nothing', 'anything', 'everything', 'because', 'really',
  'still', 'other', 'maybe', 'perhaps', 'seems', 'almost',
])

// ── Utilities ─────────────────────────────────────────────────────────────────

function splitHalves(notes) {
  const sorted = [...notes].sort((a, b) => new Date(a.date) - new Date(b.date))
  const mid    = Math.floor(sorted.length / 2)
  return { early: sorted.slice(0, mid), late: sorted.slice(mid), sorted }
}

function confidenceScore(noteTexts) {
  const text = noteTexts.join(' ').toLowerCase()
  const cert = CERTAINTY_W.filter(w => text.includes(w)).length
  const unc  = UNCERTAIN_W.filter(w => text.includes(w)).length
  return cert - unc
}

function intensityScore(noteTexts) {
  const text = noteTexts.join(' ').toLowerCase()
  return INTENSE_W.filter(w => text.includes(w)).length
}

function contentWords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 6 && !SKIP_WORDS.has(w))
}

// ── detectConfidenceDrift ─────────────────────────────────────────────────────
// Tracks how interpretive certainty evolves across the reading.
// Returns arc classification based on early vs. late confidence scores.

/**
 * @param {Array} notes
 * @returns {{ arc: 'building'|'collapsing'|'oscillating'|null, earlyScore: number, lateScore: number }}
 */
export function detectConfidenceDrift(notes) {
  if (!notes?.length || notes.length < 5) return { arc: null, earlyScore: 0, lateScore: 0 }

  const { early, late } = splitHalves(notes)
  const earlyScore = confidenceScore(early.map(n => n.text))
  const lateScore  = confidenceScore(late.map(n => n.text))
  const delta      = lateScore - earlyScore

  if (Math.abs(delta) < 2) return { arc: null, earlyScore, lateScore }

  // Check for oscillation: both early and late have mixed signals
  const earlyHasBoth = confidenceScore([early.map(n => n.text).join(' ')]) === 0
    && CERTAINTY_W.some(w => early.map(n => n.text).join(' ').toLowerCase().includes(w))
    && UNCERTAIN_W.some(w => early.map(n => n.text).join(' ').toLowerCase().includes(w))
  const lateHasBoth  = Math.abs(lateScore) <= 1
    && CERTAINTY_W.some(w => late.map(n => n.text).join(' ').toLowerCase().includes(w))
    && UNCERTAIN_W.some(w => late.map(n => n.text).join(' ').toLowerCase().includes(w))

  if (earlyHasBoth && lateHasBoth) return { arc: 'oscillating', earlyScore, lateScore }

  const arc = delta > 0 ? 'building' : 'collapsing'
  return { arc, earlyScore, lateScore }
}

// ── detectFixations ───────────────────────────────────────────────────────────
// Identifies content words the reader keeps returning to across many notes.
// A fixation = word appearing in ≥40% of notes (minimum 6 notes in pool).

/**
 * @param {Array} notes
 * @returns {Array} [{ word, noteCount, pct }] sorted by noteCount desc
 */
export function detectFixations(notes) {
  if (!notes?.length || notes.length < 6) return []

  const wordInNotes = {}
  for (const n of notes) {
    const words = new Set(contentWords(n.text))
    for (const w of words) {
      wordInNotes[w] = (wordInNotes[w] || 0) + 1
    }
  }

  const threshold = Math.max(4, Math.ceil(notes.length * 0.40))
  return Object.entries(wordInNotes)
    .filter(([, count]) => count >= threshold)
    .map(([word, noteCount]) => ({ word, noteCount, pct: Math.round((noteCount / notes.length) * 100) }))
    .sort((a, b) => b.noteCount - a.noteCount)
    .slice(0, 3)
}

// ── detectNoteLengthTrajectory ────────────────────────────────────────────────
// Tracks whether the reader's notes are getting longer (deeper engagement)
// or shorter (fatigue, fragmentation, or economical confidence).

/**
 * @param {Array} notes
 * @returns {{ direction: 'lengthening'|'shortening'|'stable', earlyAvg: number, lateAvg: number }}
 */
export function detectNoteLengthTrajectory(notes) {
  if (!notes?.length || notes.length < 5) return { direction: 'stable', earlyAvg: 0, lateAvg: 0 }

  const { early, late } = splitHalves(notes)
  const avg = arr => arr.reduce((s, n) => s + (n.text?.length ?? 0), 0) / arr.length
  const earlyAvg = avg(early)
  const lateAvg  = avg(late)

  if (earlyAvg === 0) return { direction: 'stable', earlyAvg, lateAvg }

  const ratio = lateAvg / earlyAvg
  if (ratio >= 1.4) return { direction: 'lengthening', earlyAvg, lateAvg }
  if (ratio <= 0.65) return { direction: 'shortening', earlyAvg, lateAvg }
  return { direction: 'stable', earlyAvg, lateAvg }
}

// ── detectBurstCadence ────────────────────────────────────────────────────────
// Detects whether the reader has been writing in concentrated bursts recently
// (many notes in few chapters) or has gone quiet.
// Uses chapter numbers attached to notes (n.chapter).

/**
 * @param {Array} notes
 * @param {number} currentChapter
 * @returns {{ type: 'burst'|'quiet'|'fragmenting'|null, chapterSpan: number, noteCount: number }}
 */
export function detectBurstCadence(notes, currentChapter) {
  if (!notes?.length || !currentChapter || notes.length < 4) return { type: null }

  // Notes from the last 5 chapters
  const recent = notes.filter(n => n.chapter && n.chapter >= currentChapter - 4)
  const earlier = notes.filter(n => n.chapter && n.chapter < currentChapter - 4)

  if (!recent.length) return { type: null }

  // Unique chapters that have recent notes
  const recentChapters = new Set(recent.map(n => n.chapter))
  const span = recentChapters.size

  // Burst: 4+ notes in ≤2 chapters recently
  if (recent.length >= 4 && span <= 2) {
    return { type: 'burst', chapterSpan: span, noteCount: recent.length }
  }

  // Quiet: reader was active before, now has <2 notes in last 5 chapters
  if (recent.length <= 1 && earlier.length >= 3) {
    return { type: 'quiet', chapterSpan: span, noteCount: recent.length }
  }

  // Fragmenting: many chapters touched, but each with only 1 note (rapid shallow)
  const avgPerChapter = recent.length / span
  if (span >= 4 && avgPerChapter < 1.3 && recent.length >= 4) {
    return { type: 'fragmenting', chapterSpan: span, noteCount: recent.length }
  }

  return { type: null }
}

// ── detectSilenceGap ──────────────────────────────────────────────────────────
// Finds a significant gap — chapters the reader has passed through without
// writing anything — that follows an active writing period.
// Silence is often the most emotionally loaded response to a chapter.

/**
 * @param {Array} notes
 * @param {Object} book - needs book.chapters, book.currentChapter
 * @returns {{ afterChapter: number, gapLength: number }|null}
 */
export function detectSilenceGap(notes, book) {
  if (!notes?.length || notes.length < 3) return null

  const completed = (book?.chapters || [])
    .filter(c => c.completed && c.num)
    .map(c => c.num)
    .sort((a, b) => a - b)

  if (completed.length < 5) return null

  // Build a set of chapters that have at least one note
  const notedChapters = new Set(notes.filter(n => n.chapter).map(n => n.chapter))
  if (!notedChapters.size) return null

  // Walk through completed chapters looking for the longest silent stretch
  // that follows a chapter with ≥2 notes
  const denseChs = notes.reduce((acc, n) => {
    if (!n.chapter) return acc
    acc[n.chapter] = (acc[n.chapter] || 0) + 1
    return acc
  }, {})

  let bestGap = null
  let gapStart = null
  let gapLength = 0

  for (const ch of completed) {
    if (!notedChapters.has(ch)) {
      gapLength++
      if (gapStart === null) gapStart = ch
    } else {
      // End of silent stretch — check if the preceding dense chapter qualifies
      if (gapLength >= 5 && gapStart !== null) {
        const prevChapter = gapStart - 1
        if ((denseChs[prevChapter] ?? 0) >= 2) {
          if (!bestGap || gapLength > bestGap.gapLength) {
            bestGap = { afterChapter: prevChapter, gapLength }
          }
        }
      }
      gapStart = null
      gapLength = 0
    }
  }
  // Check trailing silence
  if (gapLength >= 5 && gapStart !== null) {
    const prevChapter = gapStart - 1
    if ((denseChs[prevChapter] ?? 0) >= 2) {
      if (!bestGap || gapLength > bestGap.gapLength) {
        bestGap = { afterChapter: prevChapter, gapLength }
      }
    }
  }

  return bestGap
}

// ── detectEmotionalLoading ────────────────────────────────────────────────────
// Identifies which chapters carried the highest emotional intensity
// based on the emotional word density of their notes.
// Returns chapter numbers sorted by loading score (highest first).

/**
 * @param {Array} notes
 * @returns {Array} [{ chapter, score, noteCount }] sorted by score desc
 */
export function detectEmotionalLoading(notes) {
  if (!notes?.length) return []

  const chapterScores = {}
  const chapterCounts = {}

  for (const n of notes) {
    if (!n.chapter) continue
    const score = intensityScore([n.text])
    chapterScores[n.chapter] = (chapterScores[n.chapter] || 0) + score
    chapterCounts[n.chapter] = (chapterCounts[n.chapter] || 0) + 1
  }

  return Object.entries(chapterScores)
    .map(([chapter, score]) => ({
      chapter:   parseInt(chapter),
      score,
      noteCount: chapterCounts[chapter],
      density:   score / chapterCounts[chapter],
    }))
    .filter(({ density }) => density >= 1.5)
    .sort((a, b) => b.density - a.density)
}
