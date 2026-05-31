// ── Cross-Book Memory ─────────────────────────────────────────────────────────
// Detects patterns across the full library to generate ambient observations
// about the reader's identity — not analytics, but literary self-portrait.
//
// These observations are different from within-book companion observations:
// they speak to the reader as a reader, to patterns that only emerge over time.
// They should feel like something a thoughtful friend might notice after
// watching you read for a year.
//
// Output: one carefully qualified observation, or null.
// Null is the correct output when data is insufficient. Never generalize thin data.

import { liveItems } from './live.js'

// ── Thematic word clusters ────────────────────────────────────────────────────
const THEME_CLUSTERS = {
  grief:    ['grief', 'loss', 'death', 'dying', 'absence', 'mourning', 'missing', 'gone', 'buried', 'widow', 'orphan', 'funeral', 'bereaved'],
  tension:  ['tension', 'conflict', 'danger', 'desperate', 'threat', 'uneasy', 'violent', 'war', 'fight', 'power', 'control', 'escape', 'trapped'],
  strange:  ['strange', 'surreal', 'uncanny', 'bizarre', 'dream', 'weird', 'haunted', 'ghost', 'impossible', 'liminal', 'unsettling', 'eerie'],
  warmth:   ['home', 'love', 'belonging', 'comfort', 'hope', 'tender', 'safe', 'warmth', 'care', 'family', 'connection', 'trust', 'friendship'],
  identity: ['identity', 'self', 'who am i', 'becoming', 'transformation', 'exile', 'displacement', 'memory', 'past', 'origin', 'inheritance'],
  moral:    ['justice', 'wrong', 'right', 'ethics', 'guilt', 'complicit', 'moral', 'responsibility', 'choice', 'conscience', 'betrayal', 'integrity'],
}

const THEME_OBSERVATIONS = {
  grief:    "Grief keeps finding you in what you read.",
  tension:  "You're drawn to stories under pressure.",
  strange:  "The strange keeps appearing in what stays with you.",
  warmth:   "You look for belonging in the stories you hold.",
  identity: "Questions of identity and becoming run through what you choose.",
  moral:    "Moral weight — who is responsible and for what — keeps surfacing.",
}

// ── Minimum thresholds ────────────────────────────────────────────────────────
const MIN_BOOKS_FOR_PATTERN  = 3   // need 3+ annotated books to speak to pattern
const MIN_BOOKS_FOR_THEME    = 3   // need 3+ books showing a theme to name it
const MIN_NOTES_FOR_BOOK     = 4   // a book must have 4+ notes to count in pattern

// ── Helpers ───────────────────────────────────────────────────────────────────
function annotatedBooks(books) {
  return books.filter(b =>
    (b.notes || []).length >= MIN_NOTES_FOR_BOOK &&
    b.status !== 'want'
  )
}

function allNotes(books) {
  return books.flatMap(b => b.notes || [])
}

function daysSince(dateStr) {
  if (!dateStr) return 9999
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
}

// ── Annotation style detection ────────────────────────────────────────────────
// Returns the reader's dominant annotation identity across all annotated books.
function detectAnnotationStyle(annotated) {
  if (annotated.length < MIN_BOOKS_FOR_PATTERN) return null

  let totalNotes = 0, totalWords = 0
  let theoryCount = 0, confusingCount = 0, quoteCount = 0, favCount = 0

  for (const book of annotated) {
    const notes = liveItems(book.notes)
    totalNotes += notes.length
    totalWords += notes.reduce((s, n) => s + (n.text || '').trim().split(/\s+/).length, 0)
    theoryCount    += notes.filter(n => n.tag === 'theory').length
    confusingCount += notes.filter(n => n.tag === 'confusing').length
    quoteCount     += notes.filter(n => n.tag === 'quote').length
    favCount       += notes.filter(n => n.tag === 'favorite').length
  }

  if (!totalNotes) return null

  const avgWords        = totalWords / totalNotes
  const theoryRatio     = theoryCount    / totalNotes
  const confusingRatio  = confusingCount / totalNotes
  const quoteRatio      = quoteCount     / totalNotes
  const favRatio        = favCount       / totalNotes

  // Theorist — builds interpretations ahead of the text
  if (theoryRatio > 0.30 && theoryCount >= 6)
    return {
      style: 'theorist',
      obs: "You tend to read ahead of the text — theories accumulate before the story confirms them.",
    }

  // Questioner — holds uncertainty more than certainty
  if (confusingRatio > 0.22 && confusingCount >= 5 && theoryRatio < 0.25)
    return {
      style: 'questioner',
      obs: "Questions hold more weight in what you write than conclusions do.",
    }

  // Collector — drawn to the language itself
  if (quoteRatio > 0.28 && quoteCount >= 6)
    return {
      style: 'collector',
      obs: "You collect lines. The particular word matters to you.",
    }

  // Impressionist — brief, immediate, sensory
  if (avgWords < 22 && favRatio > 0.18 && totalNotes >= 12)
    return {
      style: 'impressionist',
      obs: "You mark what arrives — brief, immediate, before it settles into interpretation.",
    }

  // Analyst — extended, interpretive notes
  if (avgWords > 55 && totalNotes >= 8)
    return {
      style: 'analyst',
      obs: "Your notes reach toward interpretation. You build on what you notice rather than letting it rest.",
    }

  return null
}

// ── Behavioral pattern detection ──────────────────────────────────────────────
// Detects how the reader moves through books over time.
function detectBehavioralPattern(books) {
  const annotated = annotatedBooks(books)
  if (annotated.length < 2) return null  // behavioral needs fewer books

  // Rereader
  const rereadCount = annotated.filter(b => (b.rereadCount || 0) > 0).length
  if (rereadCount >= 2)
    return {
      pattern: 'rereader',
      obs: "You go back. A second reading finds things a first reading couldn't.",
    }

  // Holder — multiple paused books still densely annotated
  const pausedAnnotated = books.filter(b =>
    (b.status === 'paused') &&
    (b.notes || []).length >= 5
  )
  if (pausedAnnotated.length >= 3)
    return {
      pattern: 'holder',
      obs: "You hold books open that you're not currently reading. Something in them is still working.",
    }

  // Finisher — finished books are substantially more annotated than paused ones
  const finishedAnnotated = books.filter(b => b.status === 'finished' && (b.notes || []).length >= MIN_NOTES_FOR_BOOK)
  const pausedSparse      = books.filter(b => b.status === 'paused'   && (b.notes || []).length < MIN_NOTES_FOR_BOOK)
  if (finishedAnnotated.length >= 3 && pausedSparse.length >= 2)
    return {
      pattern: 'finisher',
      obs: "The books you finish tend to be the ones you've lived in.",
    }

  // Wanderer — multiple dormant books, none deeply annotated
  const dormant = books.filter(b => b.status === 'paused' && daysSince(b.lastUpdated) > 60)
  if (dormant.length >= 3 && annotated.filter(b => b.status === 'reading').length === 0)
    return {
      pattern: 'wanderer',
      obs: "Your reading leaves many books open at once. You move between them as the mood shifts.",
    }

  return null
}

// ── Thematic resonance detection ──────────────────────────────────────────────
// Looks for recurring thematic vocabulary across note texts in 3+ different books.
function detectThematicResonance(books) {
  const annotated = annotatedBooks(books)
  if (annotated.length < MIN_BOOKS_FOR_THEME) return null

  const clusterCounts = {}

  for (const book of annotated) {
    const noteText = liveItems(book.notes).map(n => (n.text || '').toLowerCase()).join(' ')
    for (const [cluster, words] of Object.entries(THEME_CLUSTERS)) {
      const matchCount = words.filter(w => noteText.includes(w)).length
      if (matchCount >= 2) {
        clusterCounts[cluster] = (clusterCounts[cluster] || 0) + 1
      }
    }
  }

  // Find cluster appearing in the most books, require 3+ books
  const sorted = Object.entries(clusterCounts)
    .filter(([, count]) => count >= MIN_BOOKS_FOR_THEME)
    .sort((a, b) => b[1] - a[1])

  if (!sorted.length) return null

  const [topCluster] = sorted[0]
  return {
    theme: topCluster,
    obs: THEME_OBSERVATIONS[topCluster],
  }
}

// ── Mystery thread density ─────────────────────────────────────────────────────
// Readers who consistently open many mystery threads develop a different
// relationship with uncertainty — they notice what the story doesn't name.
function detectMysteryTendency(books) {
  const annotated = annotatedBooks(books)
  if (annotated.length < MIN_BOOKS_FOR_PATTERN) return null

  const booksWithMysteries = annotated.filter(b => (b.mysteries || []).length >= 3)
  const avgOpenMysteries   = annotated.reduce(
    (s, b) => s + (b.mysteries || []).filter(m => !m.resolved).length, 0
  ) / annotated.length

  if (booksWithMysteries.length >= 3 && avgOpenMysteries >= 3)
    return {
      pattern: 'mystery-dense',
      obs: "You notice threads the story doesn't name. The open question matters as much as the answer.",
    }

  return null
}

// ── Multiple simultaneous readings ───────────────────────────────────────────
// Readers holding 4+ annotated stories open at once have a distinct reading
// rhythm. This is the most immediately observable fact about such a library —
// it deserves to be named before annotation style.
function detectMultipleReadings(books) {
  const activeAnnotated = books.filter(b =>
    b.status === 'reading' && liveItems(b.notes).length >= 2
  )
  if (activeAnnotated.length >= 4)
    return {
      pattern: 'multi-reader',
      obs: "You hold several stories open at once — each one waiting for when you return to it.",
    }
  return null
}

// ── Theory collapse awareness ─────────────────────────────────────────────────
// Readers whose theories keep collapsing are developing a different
// relationship with certainty — they're being taught something by repetition.
function detectCollapsePattern(books) {
  const annotated = annotatedBooks(books)
  if (annotated.length < 2) return null

  const booksWithCollapse = annotated.filter(b =>
    (b.notes || []).some(n => n.tag === 'theory' && n.revisedAt)
  )

  if (booksWithCollapse.length >= 3)
    return {
      pattern: 'collapse-prone',
      obs: "Stories keep revising what you were certain about.",
    }

  return null
}

// ── Main: generate one cross-book observation ─────────────────────────────────
// Priority: behavioral > multi-reader > annotation style > mystery > collapse > theme
// Returns a single observation string, or null if nothing is specific enough.
export function generateCrossBookObservation(books) {
  if (!books || books.length < 2) return null

  const annotated = annotatedBooks(books)
  if (annotated.length < 2) return null

  // Prioritized: most specific and earned observations first.
  // Multiple readings is checked before annotation style — it's the most
  // immediately observable fact about a library with 4+ active annotated books.
  const detected = [
    detectBehavioralPattern(books),
    detectMultipleReadings(books),
    detectAnnotationStyle(annotated),
    detectMysteryTendency(books),
    detectCollapsePattern(books),
    detectThematicResonance(books),
  ].filter(Boolean)

  if (!detected.length) return null

  return detected[0].obs
}

// ── Post-completion lingering ─────────────────────────────────────────────────
// Generates a quiet observation for recently completed books.
// Called from CompanionHeader when `isFinished` and completedAt is recent.
// Returns a short, specific, settled line — not congratulations.
export function generateCompletionAfterimageLine(book) {
  const notes         = liveItems(book.notes)
  const mysteries     = liveItems(book.mysteries)
  const openMysteries = mysteries.filter(m => !m.resolved)
  const daysAgo       = daysSince(book.completedAt)
  const theoryNotes   = notes.filter(n => n.tag === 'theory')
  const collapsedCount = theoryNotes.filter(n => n.revisedAt).length
  const quoteCount    = notes.filter(n => n.tag === 'quote').length

  // Very recent completion — still in the immediate aftermath
  if (daysAgo <= 2)
    return "The ending is still settling."

  // High open mystery count — threads the story never resolved
  if (openMysteries.length >= 4)
    return "Not all the threads resolved. Some questions are yours to carry now."

  if (openMysteries.length >= 2)
    return "Some threads are still open. The story left those with you."

  // Many theories collapsed — the story kept resisting
  if (collapsedCount >= 3)
    return "It revised you more than once. That tends to stay."

  // Deeply annotated — they lived in this book
  if (notes.length >= 15)
    return "You left a lot of yourself in this one."

  if (notes.length >= 8)
    return "Something in how you read this one will carry forward."

  // Quote collector — the language mattered
  if (quoteCount >= 4)
    return "The lines you collected from this will resurface."

  // Sparse annotator who finished — quiet completion
  if (notes.length < 4)
    return "It settled quietly. You let it."

  // Default
  return "The story is complete. What stays, stays."
}
