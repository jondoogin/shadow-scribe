/**
 * reflectionEngine.js — Companion Reflection Engine
 *
 * Generates synthesized, retrospective companion reflections from the
 * reader's accumulated notes, mysteries, and session patterns.
 *
 * Two generation paths:
 *   Rule-based — always available, synchronous, < 1ms, no API required
 *   AI-assisted — when anthropicKey is set and content is sufficient, async
 *
 * Reflections are cached in book.reflectionCache and rotated over time.
 * The cache is invalidated by a lightweight context hash so generation
 * only occurs when the reader's data has meaningfully changed.
 *
 * SPOILER SAFETY
 * The engine only reads: notes, spoiler-gated open mysteries, session data,
 * and progress %. It never reads chapter summaries, future characters,
 * or any field that contains information beyond the reader's current chapter.
 */

import { getProgress }                       from './progress.js'
import { logDates }                          from './date.js'
import { isMysteryVisible, getEffectiveMode } from './spoiler.js'

// ── Context assembly ──────────────────────────────────────────────────────────

/**
 * Assembles a lightweight, spoiler-safe snapshot of the reader's state.
 * This is the sole input to both generation paths.
 */
export function assembleReflectionContext(book, settings) {
  const notes     = book.notes        || []
  const mysteries = book.mysteries    || []
  const log       = book.readingLog   || []
  const mode      = getEffectiveMode(book, settings)
  const currentCh = book.currentChapter || 0

  // ── Note categorisation ────────────────────────────────────────────────────
  const theoryNotes    = notes.filter(n => n.tag === 'theory')
  const confusingNotes = notes.filter(n => n.tag === 'confusing')
  const characterNotes = notes.filter(n => n.tag === 'character')
  const favoriteNotes  = notes.filter(n => n.tag === 'favorite')
  const themeNotes     = notes.filter(n => n.tag === 'theme')
  const quoteNotes     = notes.filter(n => n.tag === 'quote')

  // ── Evolution signals ──────────────────────────────────────────────────────
  const revisedNotes    = notes.filter(n => n.revisedAt)
  const reflectedNotes  = notes.filter(n => n.reflection)
  const revisedTheories = theoryNotes.filter(n => n.revisedAt)

  // ── Visible mysteries only (spoiler-gated) ─────────────────────────────────
  const openMysteries = mysteries.filter(m =>
    !m.resolved && isMysteryVisible(book, m, mode)
  )
  const longestOpenMystery = [...openMysteries]
    .sort((a, b) => (a.chapter || 0) - (b.chapter || 0))[0] ?? null

  // ── Character focus — proper names from tagged notes ───────────────────────
  const focusedCharacters  = extractNameMentions(characterNotes.map(n => n.text))
  const theoryCharFocus    = extractNameMentions(theoryNotes.map(n => n.text))

  // ── Temporal evolution — early vs late note pattern ────────────────────────
  const temporalEvolution = analyzeTemporalEvolution(notes)

  // ── Session data ───────────────────────────────────────────────────────────
  const dates       = logDates(log)
  const lastDate    = [...dates].sort().pop() ?? null
  const daysSinceLast = lastDate
    ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
    : null

  return {
    noteCount:         notes.length,
    theoryNotes,
    confusingNotes,
    characterNotes,
    favoriteNotes,
    themeNotes,
    quoteNotes,
    revisedNotes,
    reflectedNotes,
    revisedTheories,
    openMysteries,
    longestOpenMystery,
    focusedCharacters,    // names from character-tagged notes
    theoryCharFocus,      // names from theory notes
    temporalEvolution,    // 'confusion-to-theory' | 'sustained-theory' | 'late-favorites' | null
    sessionCount:         dates.length,
    daysSinceLast,
    pct:                  getProgress(book),
    currentChapter:       currentCh,
    totalChapters:        book.totalChapters || 0,
    title:                book.title  || '',
    author:               book.author || '',
  }
}

// ── Context hash (cache invalidation) ────────────────────────────────────────

/**
 * Cheap fingerprint over the signals that meaningfully affect reflection output.
 * When this changes, the cache is stale and regeneration is triggered.
 */
export function hashContext(ctx) {
  return [
    ctx.noteCount,
    ctx.theoryNotes.length,
    ctx.confusingNotes.length,
    ctx.revisedNotes.length,
    ctx.reflectedNotes.length,
    ctx.openMysteries.length,
    ctx.currentChapter,
    ctx.sessionCount,
  ].join(':')
}

// ── Cache management ──────────────────────────────────────────────────────────

/**
 * Returns true if reflection generation should run.
 * Criteria: no existing cache, context hash changed, or cache is 3+ days old.
 */
export function shouldRegenerate(book, contextHash) {
  const cache = book.reflectionCache
  if (!cache?.contextHash) return true
  if (cache.contextHash !== contextHash) return true
  const ageMs = Date.now() - new Date(cache.generatedAt).getTime()
  return ageMs > 3 * 86_400_000
}

/**
 * Returns up to `limit` reflections to surface right now.
 * Priority: never-shown first, then least-recently-shown.
 */
export function getActiveReflections(book, limit = 3) {
  const reflections = book.reflectionCache?.reflections
  if (!reflections?.length) return []
  return [...reflections]
    .filter(r => !r.suppressed)
    .sort((a, b) => {
      const now  = Date.now()
      const aSc  = a.surfaceCount ?? 0
      const bSc  = b.surfaceCount ?? 0
      if (aSc !== bSc) return aSc - bSc
      const aAge = a.lastSurfaced ? now - new Date(a.lastSurfaced).getTime() : Infinity
      const bAge = b.lastSurfaced ? now - new Date(b.lastSurfaced).getTime() : Infinity
      return bAge - aAge
    })
    .slice(0, limit)
}

/**
 * Returns an updated reflections array with the given entry marked as surfaced.
 * Call after showing a reflection to the reader.
 */
export function markReflectionSurfaced(reflections, id) {
  return reflections.map(r =>
    r.id === id
      ? { ...r, surfaceCount: (r.surfaceCount ?? 0) + 1, lastSurfaced: new Date().toISOString() }
      : r
  )
}

// ── Rule-based generation ─────────────────────────────────────────────────────

/**
 * Generates up to 5 rule-based reflections from the assembled context.
 * Synchronous. Safe to call on every mount — the shouldRegenerate guard
 * is the caller's responsibility.
 *
 * Returns ReflectionEntry[].
 */
export function generateRuleBasedReflections(ctx, insightStyle = 'observational') {
  const candidates = []

  // ── Theory arc ─────────────────────────────────────────────────────────────
  // Reader has built theories; detect whether they've shifted
  if (ctx.theoryNotes.length >= 3) {
    if (ctx.revisedTheories.length >= 2) {
      candidates.push({
        text: pick([
          "Your theories haven't stayed still. Something in the story keeps revising them.",
          "The explanations you started with have shifted. The story has pushed back.",
          "You've been rewriting your own reading of this. The earlier theories no longer hold.",
        ]),
        type: 'theory-arc', weight: 3,
      })
    } else if (ctx.revisedTheories.length === 1) {
      candidates.push({
        text: pick([
          "At least one theory has been revised since you first wrote it. Something changed.",
          "One of your earlier readings has been updated. The story is still surprising you.",
        ]),
        type: 'theory-arc', weight: 2,
      })
    } else {
      candidates.push({
        text: pick([
          `${ctx.theoryNotes.length} theory notes. You've been reading ahead of the text.`,
          "Your notes keep reaching for explanations. Something is being worked out.",
          "A consistent theorising thread through this reading. That attention tends to find what it's looking for.",
        ]),
        type: 'theory-arc', weight: 1,
      })
    }
  }

  // ── Theory pointing at a specific character ────────────────────────────────
  if (ctx.theoryNotes.length >= 2 && ctx.theoryCharFocus.length > 0) {
    const name = ctx.theoryCharFocus[0]
    candidates.push({
      text: pick([
        `Most of your theories lead back to ${name}.`,
        `${name} keeps appearing in your theories. Something about them is unresolved.`,
        `You've been trying to make sense of ${name} since early on.`,
      ]),
      type: 'character-focus', weight: 2,
    })
  }

  // ── Temporal evolution: how notes have shifted over the reading ────────────
  if (ctx.temporalEvolution === 'confusion-to-theory') {
    candidates.push({
      text: pick([
        "You began writing questions. More recently, you've been writing explanations.",
        "The early notes were confused. The recent ones are more certain. Something clarified.",
        "Your relationship with this story has shifted — from uncertainty toward interpretation.",
      ]),
      type: 'temporal-evolution', weight: 3,
    })
  } else if (ctx.temporalEvolution === 'sustained-theory') {
    candidates.push({
      text: pick([
        "You've been theorising from the very beginning. That analytical attention hasn't let up.",
        "A thread of theory running through this whole reading, from early on to now.",
      ]),
      type: 'temporal-evolution', weight: 2,
    })
  } else if (ctx.temporalEvolution === 'late-favorites') {
    candidates.push({
      text: pick([
        "You've been marking passages as favourites more in the second half. Something in the writing has found you.",
        "The favourites are appearing more now than they were early on. The language is landing differently.",
      ]),
      type: 'temporal-evolution', weight: 2,
    })
  }

  // ── Character fixation: character-tagged notes clustering around a name ────
  if (ctx.characterNotes.length >= 3 && ctx.focusedCharacters.length > 0) {
    const name = ctx.focusedCharacters[0]
    candidates.push({
      text: pick([
        `More of your notes lead back to ${name} than anywhere else.`,
        `${name} has weight for you. The character keeps appearing in what you write.`,
        `You keep returning to ${name}. Something there is still unresolved.`,
      ]),
      type: 'character-focus', weight: 2,
    })
  }

  // ── Reader has been revisiting their own notes ─────────────────────────────
  if (ctx.reflectedNotes.length >= 2) {
    candidates.push({
      text: pick([
        "You've returned to earlier notes and added to them. The meaning is still moving.",
        "Some of your notes carry two layers now — the first thought and a later one.",
        "You've been revisiting earlier thoughts. Something is still unfinished.",
      ]),
      type: 'interpretation-evolution', weight: 2,
    })
  }

  // ── Long-open mystery thread ───────────────────────────────────────────────
  if (ctx.longestOpenMystery) {
    const age = ctx.currentChapter - (ctx.longestOpenMystery.chapter || 0)
    if (age >= 12) {
      candidates.push({
        text: pick([
          `The first thread opened is still unanswered — ${age} chapters on.`,
          "The oldest question in this story is still open. The novel has been carrying it a long way.",
          "Something from the early pages is still waiting. The story knows it's there.",
        ]),
        type: 'mystery-continuity', weight: 2,
      })
    }
  }

  // ── Favourite passages accumulating ───────────────────────────────────────
  if (ctx.favoriteNotes.length >= 3) {
    candidates.push({
      text: pick([
        `${ctx.favoriteNotes.length} passages kept. The writing has been working on you.`,
        "You've been holding onto certain lines. That's a kind of reading.",
        "What you've marked as favourite is its own portrait of what this story means to you.",
      ]),
      type: 'reader-attention', weight: 1,
    })
  }

  // ── Quote collection ───────────────────────────────────────────────────────
  if (ctx.quoteNotes.length >= 3) {
    candidates.push({
      text: pick([
        "You've been collecting sentences. This book is giving you language to carry.",
        `${ctx.quoteNotes.length} passages marked as quotes. The writing is doing something to you.`,
        "The quotes you've kept suggest a reader paying close attention to how the story is told, not just what it tells.",
      ]),
      type: 'reader-attention', weight: 1,
    })
  }

  // ── Dense annotation past the midpoint ────────────────────────────────────
  if (ctx.noteCount >= 10 && ctx.pct >= 50) {
    candidates.push({
      text: pick([
        `${ctx.noteCount} notes into a story past its midpoint. The companion has been keeping watch.`,
        "You've left a lot behind in this story — notes, threads, theories. It's been an active reading.",
      ]),
      type: 'reader-attention', weight: 1,
    })
  }

  // ── Confusion without theories to match ───────────────────────────────────
  if (ctx.confusingNotes.length >= 3 && ctx.theoryNotes.length < 2) {
    candidates.push({
      text: pick([
        "Several passages have confused you. This story may be deliberate about what it withholds.",
        "The confusing notes outnumber the theories. Some stories need to be finished before they can be understood.",
        "You've flagged more than you've explained. That's not necessarily a problem.",
      ]),
      type: 'confusion-signal', weight: 1,
    })
  }

  // Deduplicate by type (highest weight wins per type), sort, limit
  const byType = {}
  for (const c of candidates) {
    if (!byType[c.type] || c.weight > byType[c.type].weight) byType[c.type] = c
  }

  const ts = Date.now()
  return Object.values(byType)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((c, i) => makeEntry(`rb_${ts}_${i}`, c.text, 'rule-based'))
}

// ── Entry factory ─────────────────────────────────────────────────────────────

function makeEntry(id, text, type) {
  return {
    id,
    text,
    type,
    surfaceCount:  0,
    lastSurfaced:  null,
    suppressed:    false,
    generatedAt:   new Date().toISOString(),
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const NAME_BLOCKLIST = new Set([
  'The','A','An','In','On','At','But','And','Or','It','He','She','They',
  'I','You','This','That','His','Her','Their','Its','With','From','By',
  'For','Of','To','Is','Was','Were','Are','Has','Had','Have','Will',
  'Would','Could','Should','My','Your','Our','What','When','Where','Why',
  'How','Then','Just','Not','All','Can','Been','Now','So','No','More',
  'Some','One','Two','Three','Very','Still','Even','Also','Back','Same',
])

/**
 * Extracts likely proper nouns (character names) from an array of text strings.
 * Returns names with ≥2 occurrences, sorted by frequency descending.
 */
function extractNameMentions(texts) {
  const counts = {}
  texts.forEach(text => {
    const words = text.match(/\b[A-Z][a-z]{2,}\b/g) ?? []
    words.forEach(w => {
      if (!NAME_BLOCKLIST.has(w)) counts[w] = (counts[w] || 0) + 1
    })
  })
  return Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
}

/**
 * Splits notes into temporal halves and detects meaningful tag distribution shifts.
 * Requires ≥5 notes to fire.
 *
 * Returns: 'confusion-to-theory' | 'sustained-theory' | 'late-favorites' | null
 */
function analyzeTemporalEvolution(notes) {
  if (notes.length < 5) return null

  const sorted = [...notes].sort((a, b) => new Date(a.date) - new Date(b.date))
  const mid    = Math.floor(sorted.length / 2)
  const early  = sorted.slice(0, mid)
  const late   = sorted.slice(mid)

  const tags = arr => arr.reduce((acc, n) => {
    acc[n.tag] = (acc[n.tag] || 0) + 1; return acc
  }, {})

  const e = tags(early)
  const l = tags(late)

  // Confusion early → theories late: a shift toward interpretation
  if ((e.confusing || 0) >= 2 && (l.theory || 0) >= 2 && (l.confusing || 0) < (e.confusing || 0)) {
    return 'confusion-to-theory'
  }
  // Sustained theorising across the whole reading
  if ((e.theory || 0) >= 2 && (l.theory || 0) >= 2) {
    return 'sustained-theory'
  }
  // Favourites emerging more in the second half
  if ((l.favorite || 0) >= 2 && (l.favorite || 0) > (e.favorite || 0) + 1) {
    return 'late-favorites'
  }

  return null
}
