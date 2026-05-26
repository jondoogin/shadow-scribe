/**
 * reflectionEngine.js — Companion Reflection Engine v3
 *
 * Three layers:
 *
 *   NOTE INTELLIGENCE
 *     Infers themes from note text, detects interpretation shifts over time,
 *     clusters notes by shared theme or character focus, and scores notes by
 *     emotional resonance (revised, reflected, recurring).
 *
 *   CONTEXT ASSEMBLY
 *     Builds a spoiler-safe snapshot of reader state for reflection generation
 *     and cache invalidation.
 *
 *   REFLECTION GENERATION + ROTATION
 *     Rule-based synthesis from assembled context. Reflections are cached,
 *     prioritised, and rotated with an 8-hour minimum resurfacing window.
 *     An AI generation path runs silently in the background when conditions allow.
 *
 * SPOILER SAFETY
 *   Reads only: notes, open mysteries, session data, progress %.
 *   Never reads chapter summaries, future character states, or resolved-
 *   beyond-boundary data of any kind.
 */

import { getProgress }                        from './progress.js'
import { logDates }                           from './date.js'
import { isMysteryVisible, getEffectiveMode } from './spoiler.js'
import { extractNoteFragment, extractResidueFragments, detectMotifs, detectAtmosphericSignature } from './residueMemory.js'

// ── Constants ─────────────────────────────────────────────────────────────────

export const MIN_RESURFACE_MS  = 8  * 3_600_000   // 8 hours between resurfacings
export const LONG_RESURFACE_MS = 24 * 3_600_000   // 24 hours — patience mode (self-sustaining narratives)

// ── Note intelligence — theme inference ──────────────────────────────────────

/**
 * Keyword sets for thematic inference. One keyword hit scores 1 point per theme.
 * Top 2 themes (score >= 1) are assigned to a note.
 */
const THEME_KEYWORDS = {
  grief:       ['grief', 'loss', 'lost', 'gone', 'mourning', 'absence', 'missing', 'died', 'dead'],
  suspicion:   ['suspect', 'suspicious', 'hiding', 'secret', 'lies', 'lying', 'liar', 'distrust', 'betrayal', 'deception', 'ulterior'],
  isolation:   ['alone', 'lonely', 'isolated', 'solitude', 'estranged', 'exile', 'withdrawn', 'apart', 'cut off'],
  trust:       ['trust', 'trusted', 'trustworthy', 'honest', 'faithful', 'loyal', 'loyalty', 'dependable', 'reliable'],
  fear:        ['fear', 'afraid', 'terrified', 'dread', 'anxious', 'anxiety', 'panic', 'frightened', 'horror'],
  ambiguity:   ['ambiguous', 'ambiguity', 'unclear', 'vague', 'mixed', 'hard to read', 'hard to tell'],
  obsession:   ['obsession', 'obsessed', 'fixated', 'fixation', 'haunted', 'preoccupied', 'consumed'],
  belonging:   ['belonging', 'outsider', 'home', 'roots', 'identity', 'community', 'place in', 'belong'],
  guilt:       ['guilt', 'guilty', 'shame', 'ashamed', 'blame', 'regret', 'remorse', 'responsible'],
  longing:     ['longing', 'yearning', 'desire', 'nostalgia', 'wish', 'ache', 'craving', 'wanting'],
  uncertainty: ['uncertain', 'uncertainty', 'unsure', 'doubt', 'maybe', 'perhaps', 'question whether', "don't know"],
}

// Display labels for themes (used in companion observations)
const THEME_LABELS = {
  grief: 'grief', suspicion: 'suspicion', isolation: 'isolation',
  trust: 'trust', fear: 'fear', ambiguity: 'ambiguity',
  obsession: 'fixation', belonging: 'belonging', guilt: 'guilt',
  longing: 'longing', uncertainty: 'uncertainty',
}

/**
 * Infers up to 2 themes for a single note from its text + reflection.
 * Returns string[] of theme names, empty if no theme matches.
 */
export function inferNoteThemes(note) {
  const text = ((note.text || '') + ' ' + (note.reflection || '')).toLowerCase()
  const scores = {}
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        scores[theme] = (scores[theme] || 0) + 1
      }
    }
  }
  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([theme]) => theme)
}

/**
 * Analyses theme distribution across all notes.
 *
 * @returns {Object} { themeCount, dominantTheme, recurringThemes, notesWithThemes }
 *   - themeCount        — { themeName: noteCount }
 *   - dominantTheme     — the most frequently occurring theme, or null
 *   - recurringThemes   — themes appearing in 3+ notes
 *   - notesWithThemes   — original notes with _themes field appended
 */
export function analyzeNoteThemes(notes) {
  const themeCount = {}
  const notesWithThemes = notes.map(note => {
    const themes = inferNoteThemes(note)
    for (const t of themes) themeCount[t] = (themeCount[t] || 0) + 1
    return { ...note, _themes: themes }
  })

  const sorted = Object.entries(themeCount).sort((a, b) => b[1] - a[1])
  const dominantTheme   = sorted[0]?.[0] ?? null
  const recurringThemes = sorted.filter(([, c]) => c >= 3).map(([t]) => t)

  return { themeCount, dominantTheme, recurringThemes, notesWithThemes }
}

// ── Note intelligence — interpretation shifts ─────────────────────────────────

const POSITIVE_WORDS  = ['love', 'trust', 'good', 'innocent', 'honest', 'kind', 'hero', 'brave', 'genuine', 'empathy', 'sympathy', 'warm', 'care', 'protect', 'understand']
const NEGATIVE_WORDS  = ['hate', 'distrust', 'evil', 'guilty', 'liar', 'cruel', 'villain', 'suspicious', 'false', 'manipulative', 'dangerous', 'wrong', 'betray', 'deceive', 'selfish']
const UNCERTAIN_WORDS = ['maybe', 'perhaps', 'unsure', 'unclear', 'confused', 'uncertain', 'wonder', "don't know", 'not sure', 'hard to say', 'hard to tell', 'possibly', 'question whether']

function computeValence(noteTexts) {
  const text = noteTexts.join(' ').toLowerCase()
  const pos = POSITIVE_WORDS.filter(w => text.includes(w)).length
  const neg = NEGATIVE_WORDS.filter(w => text.includes(w)).length
  const unc = UNCERTAIN_WORDS.filter(w => text.includes(w)).length
  if (unc > pos && unc > neg) return 'uncertain'
  if (pos > neg + 1)          return 'positive'
  if (neg > pos + 1)          return 'negative'
  return 'mixed'
}

const SHIFT_TEXT = {
  'uncertain+positive': n => `A clearer picture of ${n} is forming in your notes.`,
  'uncertain+negative': n => `What started as uncertainty about ${n} is beginning to sharpen.`,
  'positive+negative':  n => `There was an earlier sympathy for ${n}. The recent notes don't quite hold that.`,
  'negative+positive':  n => `Your reading of ${n} has softened as the story developed.`,
  'positive+uncertain': n => `You were more certain about ${n} earlier. Something has complicated that.`,
  'negative+uncertain': n => `The initial reading of ${n} has become harder to hold onto.`,
}

/**
 * Detects interpretation shifts for characters mentioned across theory/character notes.
 * Compares emotional valence of early vs. late notes mentioning each character.
 *
 * Requires >= 4 notes. Checks top 3 named characters.
 *
 * @returns {Array} [ { name, earlyValence, lateValence, noteCount, text } ]
 */
export function detectInterpretationShifts(notes) {
  if (notes.length < 4) return []

  const sorted = [...notes].sort((a, b) => new Date(a.date) - new Date(b.date))
  const mid    = Math.floor(sorted.length / 2)
  const early  = sorted.slice(0, mid)
  const late   = sorted.slice(mid)

  const relevantNotes = notes.filter(n => n.tag === 'theory' || n.tag === 'character')
  const names = extractNameMentions(relevantNotes.map(n => n.text)).slice(0, 3)

  const shifts = []
  for (const name of names) {
    const earlyForName = early.filter(n => n.text.includes(name))
    const lateForName  = late.filter(n => n.text.includes(name))
    if (!earlyForName.length || !lateForName.length) continue

    const earlyV = computeValence(earlyForName.map(n => n.text))
    const lateV  = computeValence(lateForName.map(n => n.text))
    if (earlyV === lateV) continue

    const key  = `${earlyV}+${lateV}`
    const text = SHIFT_TEXT[key]?.(name)
      ?? `Your understanding of ${name} has shifted. The early notes and recent ones read differently.`

    shifts.push({ name, earlyValence: earlyV, lateValence: lateV, noteCount: earlyForName.length + lateForName.length, text })
  }

  return shifts
}

// ── Note intelligence — link clusters ────────────────────────────────────────

/**
 * Groups notes into clusters by shared theme or character focus.
 * Used by DebugPage QA and (optionally) by future surfacing logic.
 *
 * @returns {Array} [ { type: 'theme'|'character', label, noteIds, weight } ]
 *   sorted by weight desc, top 10.
 */
export function buildNoteLinkClusters(notes) {
  const { notesWithThemes } = analyzeNoteThemes(notes)
  const clusters = []

  // Theme clusters
  const themeGroups = {}
  for (const note of notesWithThemes) {
    for (const theme of (note._themes || [])) {
      if (!themeGroups[theme]) themeGroups[theme] = []
      themeGroups[theme].push(note.id)
    }
  }
  for (const [theme, noteIds] of Object.entries(themeGroups)) {
    if (noteIds.length >= 2) clusters.push({ type: 'theme', label: theme, noteIds, weight: noteIds.length })
  }

  // Character clusters — notes sharing a named character mention
  const charGroups = {}
  for (const note of notes) {
    for (const name of extractNameMentions([note.text])) {
      if (!charGroups[name]) charGroups[name] = []
      charGroups[name].push(note.id)
    }
  }
  for (const [name, noteIds] of Object.entries(charGroups)) {
    if (noteIds.length >= 2) clusters.push({ type: 'character', label: name, noteIds, weight: noteIds.length })
  }

  return clusters.sort((a, b) => b.weight - a.weight).slice(0, 10)
}

// ── Note intelligence — resonance weighting ───────────────────────────────────

/**
 * Scores each note by emotional resonance — how much the companion should
 * weight it in reflection generation.
 *
 * Scoring:
 *   base:                  1
 *   revisedAt:            +2  (returned to and changed)
 *   reflection:           +2  (second thought added)
 *   theory tag:           +1
 *   recurring theme (3+): +1  (theme appears ≥3× across notes)
 *   recurring char (3+):  +1  (character mentioned ≥3× across notes)
 *
 * @returns {Object} { noteId: score }
 */
export function computeResonanceWeights(notes) {
  const { notesWithThemes, themeCount } = analyzeNoteThemes(notes)

  // Count character name occurrences across all note text
  const charCounts = {}
  for (const note of notes) {
    for (const name of extractNameMentions([note.text])) {
      charCounts[name] = (charCounts[name] || 0) + 1
    }
  }

  const weights = {}
  for (const note of notesWithThemes) {
    let score = 1
    if (note.revisedAt)   score += 2
    if (note.reflection)  score += 2
    if (note.tag === 'theory') score += 1
    for (const theme of (note._themes || [])) {
      if ((themeCount[theme] || 0) >= 3) score += 1
    }
    for (const name of extractNameMentions([note.text])) {
      if ((charCounts[name] || 0) >= 3) score += 1
    }
    weights[note.id] = score
  }

  return weights
}

// ── Context assembly ──────────────────────────────────────────────────────────

/**
 * Builds a spoiler-safe, lightweight snapshot of the reader's state.
 * Sole input to both generation paths. Includes note intelligence signals.
 */
export function assembleReflectionContext(book, settings) {
  const notes     = book.notes        || []
  const mysteries = book.mysteries    || []
  const log       = book.readingLog   || []
  const mode      = getEffectiveMode(book, settings)
  const currentCh = book.currentChapter || 0

  // ── Note categorisation ───────────────────────────────────────────────────
  const theoryNotes    = notes.filter(n => n.tag === 'theory')
  const confusingNotes = notes.filter(n => n.tag === 'confusing')
  const characterNotes = notes.filter(n => n.tag === 'character')
  const favoriteNotes  = notes.filter(n => n.tag === 'favorite')
  const themeNotes     = notes.filter(n => n.tag === 'theme')
  const quoteNotes     = notes.filter(n => n.tag === 'quote')

  // ── Evolution signals ─────────────────────────────────────────────────────
  const revisedNotes    = notes.filter(n => n.revisedAt)
  const reflectedNotes  = notes.filter(n => n.reflection)
  const revisedTheories = theoryNotes.filter(n => n.revisedAt)

  // ── Note intelligence ─────────────────────────────────────────────────────
  const { themeCount, dominantTheme, recurringThemes } = analyzeNoteThemes(notes)
  const interpretationShifts = detectInterpretationShifts(notes)
  const resonanceWeights     = computeResonanceWeights(notes)
  const highResonanceNotes   = notes
    .filter(n => (resonanceWeights[n.id] || 1) >= 4)
    .sort((a, b) => (resonanceWeights[b.id] || 1) - (resonanceWeights[a.id] || 1))
    .slice(0, 5)

  // ── Residue fragments — specific remembered anchors ───────────────────────
  const residueFragments     = extractResidueFragments(notes, mysteries, currentCh, resonanceWeights)

  // ── Motif persistence — recurring concrete words across notes ─────────────
  const motifs               = detectMotifs(notes, currentCh)

  // ── Atmospheric signature — dominant emotional weather of the reading ──────
  const atmosphericSignature = detectAtmosphericSignature(notes)

  // ── Visible mysteries only ────────────────────────────────────────────────
  const openMysteries = mysteries.filter(m =>
    !m.resolved && isMysteryVisible(book, m, mode)
  )
  const longestOpenMystery = [...openMysteries]
    .sort((a, b) => (a.chapter || 0) - (b.chapter || 0))[0] ?? null

  // ── Character focus ───────────────────────────────────────────────────────
  const focusedCharacters = extractNameMentions(characterNotes.map(n => n.text))
  const theoryCharFocus   = extractNameMentions(theoryNotes.map(n => n.text))

  // ── Temporal evolution ────────────────────────────────────────────────────
  const temporalEvolution = analyzeTemporalEvolution(notes)

  // ── Session data ──────────────────────────────────────────────────────────
  const dates         = logDates(log)
  const lastDate      = [...dates].sort().pop() ?? null
  const daysSinceLast = lastDate
    ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000)
    : null

  return {
    noteCount:             notes.length,
    theoryNotes, confusingNotes, characterNotes, favoriteNotes, themeNotes, quoteNotes,
    revisedNotes, reflectedNotes, revisedTheories,
    openMysteries, longestOpenMystery,
    focusedCharacters, theoryCharFocus,
    temporalEvolution,
    // Note intelligence signals
    themeCount, dominantTheme, recurringThemes,
    interpretationShifts,
    highResonanceNotes,
    resonanceWeights,
    // Residue
    residueFragments,
    motifs,
    atmosphericSignature,
    // Session
    sessionCount:    dates.length,
    daysSinceLast,
    pct:             getProgress(book),
    currentChapter:  currentCh,
    totalChapters:   book.totalChapters || 0,
    title:           book.title  || '',
    author:          book.author || '',
  }
}

// ── Context hash ──────────────────────────────────────────────────────────────

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
    ctx.dominantTheme ?? '',
    ctx.interpretationShifts.length,
    ctx.residueFragments?.length ?? 0,
    ctx.motifs?.length ?? 0,
    ctx.atmosphericSignature?.signature ?? '',
  ].join(':')
}

// ── Cache management ──────────────────────────────────────────────────────────

export function shouldRegenerate(book, contextHash) {
  const cache = book.reflectionCache
  if (!cache?.contextHash) return true
  if (cache.contextHash !== contextHash) return true
  const ageMs = Date.now() - new Date(cache.generatedAt).getTime()
  return ageMs > 3 * 86_400_000
}

/**
 * Returns up to `limit` reflections for surface, ordered by:
 *   1. Unseen first (surfaceCount = 0)
 *   2. Higher priority first (among same surfaceCount)
 *   3. Longest-unsurfaced first (among same priority)
 *
 * Excludes reflections surfaced within MIN_RESURFACE_MS (8 h).
 *
 * Cooling: prefers reflections shown fewer than 4 times ("fresh pool").
 * Falls back to the full eligible pool only when the fresh pool is exhausted.
 * This lets well-worn reflections naturally recede without storing extra state.
 */
export function getActiveReflections(book, limit = 3, devMode = false) {
  const reflections = book.reflectionCache?.reflections
  if (!reflections?.length) return []
  const now = Date.now()

  const sortFn = (a, b) => {
    const aSc = a.surfaceCount ?? 0
    const bSc = b.surfaceCount ?? 0
    if (aSc !== bSc) return aSc - bSc                       // unseen first
    const aP = a.priority ?? 1
    const bP = b.priority ?? 1
    if (aP !== bP) return bP - aP                           // higher priority first
    const aAge = a.lastSurfaced ? now - new Date(a.lastSurfaced).getTime() : Infinity
    const bAge = b.lastSurfaced ? now - new Date(b.lastSurfaced).getTime() : Infinity
    return bAge - aAge                                      // longest ago first
  }

  const eligible = [...reflections]
    .filter(r => !r.suppressed)
    // devMode bypasses the 8h cooldown — all reflections are eligible for testing
    .filter(r => devMode || !r.lastSurfaced || now - new Date(r.lastSurfaced).getTime() > MIN_RESURFACE_MS)

  // Prefer fresh reflections (shown < 4 times); fall back to full pool when saturated
  const fresh = eligible.filter(r => (r.surfaceCount ?? 0) < 4)
  const pool  = fresh.length >= limit ? fresh : eligible

  return pool.sort(sortFn).slice(0, limit)
}

/**
 * Returns an updated reflections array with the given entry marked surfaced.
 * Pure function — does not mutate. Caller must persist via updateBook.
 */
export function markReflectionSurfaced(reflections, id) {
  return reflections.map(r =>
    r.id === id
      ? { ...r, surfaceCount: (r.surfaceCount ?? 0) + 1, lastSurfaced: new Date().toISOString() }
      : r
  )
}

/**
 * Picks the best reflection to show at a chapter-completion moment.
 * Respects the MIN_RESURFACE_MS window. Returns null if nothing eligible.
 */
export function pickCompletionReflection(book) {
  const reflections = book.reflectionCache?.reflections
  if (!reflections?.length) return null
  const now = Date.now()
  const eligible = reflections
    .filter(r => !r.suppressed)
    .filter(r => !r.lastSurfaced || now - new Date(r.lastSurfaced).getTime() > MIN_RESURFACE_MS)
  if (!eligible.length) return null
  return eligible.sort((a, b) => {
    const aSc = a.surfaceCount ?? 0
    const bSc = b.surfaceCount ?? 0
    if (aSc !== bSc) return aSc - bSc
    return (b.priority ?? 1) - (a.priority ?? 1)
  })[0]
}

/**
 * Picks the best reflection to surface when a reader returns after a long pause.
 * Ignores the MIN_RESURFACE_MS window — any reflection is fresh after an absence.
 */
export function pickReturnReflection(book) {
  const reflections = book.reflectionCache?.reflections
  if (!reflections?.length) return null
  return [...reflections]
    .filter(r => !r.suppressed)
    .sort((a, b) => {
      const aSc = a.surfaceCount ?? 0
      const bSc = b.surfaceCount ?? 0
      if (aSc !== bSc) return aSc - bSc
      return (b.priority ?? 1) - (a.priority ?? 1)
    })[0] ?? null
}

// ── Rule-based generation ─────────────────────────────────────────────────────

/**
 * Generates up to 5 rule-based reflections from the assembled context.
 * Synchronous; < 1ms. Caller is responsible for the shouldRegenerate guard.
 *
 * Each entry has a `priority` (1–3) used by getActiveReflections for ordering.
 * Higher priority = surfaces sooner after previous showing.
 *
 * Returns ReflectionEntry[].
 */
export function generateRuleBasedReflections(ctx, insightStyle = 'observational') {
  const candidates = []

  // ── Interpretation shift (note intelligence) ───────────────────────────────
  // Highest priority: the companion has detected a change in how the reader
  // understands a character. This feels like genuine memory.
  if (ctx.interpretationShifts.length > 0) {
    const shift = ctx.interpretationShifts[0]
    candidates.push({ text: shift.text, type: 'interpretation-shift', weight: 4, priority: 3 })
  }

  // ── Theory arc ─────────────────────────────────────────────────────────────
  if (ctx.theoryNotes.length >= 3) {
    const focusName = ctx.theoryCharFocus?.[0]
    if (ctx.revisedTheories.length >= 2) {
      candidates.push({
        text: focusName
          ? pick([
            `Your theories about ${focusName} haven't stayed still. The story keeps revising them.`,
            `The early reading of ${focusName} has shifted more than once.`,
          ])
          : pick([
            "Your theories haven't stayed still. The story keeps revising them.",
            "The explanations you started with have shifted. The story has pushed back.",
            "There was an earlier reading of this. It's moved since.",
          ]),
        type: 'theory-arc', weight: 3, priority: 3,
      })
    } else if (ctx.revisedTheories.length === 1) {
      candidates.push({
        text: focusName
          ? pick([
            `One theory about ${focusName} has been revised since you first wrote it. Something changed.`,
            `You've updated at least one explanation of ${focusName}. The story pushed back.`,
          ])
          : pick([
            "At least one theory has been revised since you first wrote it. Something changed.",
            "One of your earlier explanations has been updated. The story is still surprising you.",
            "You've been returning to earlier theories and reworking them.",
          ]),
        type: 'theory-arc', weight: 2, priority: 2,
      })
    } else {
      candidates.push({
        text: focusName
          ? pick([
            `${ctx.theoryNotes.length} theory notes, many returning to ${focusName}. You've been reading ahead of the text.`,
            `Your theories keep returning to ${focusName}. Something about them is unresolved.`,
          ])
          : pick([
            `${ctx.theoryNotes.length} theory notes. You've been reading ahead of the text.`,
            "Your notes keep reaching for explanations. That pattern keeps building.",
            "A consistent theorising thread through this reading.",
          ]),
        type: 'theory-arc', weight: 1, priority: 2,
      })
    }
  }

  // ── Theme persistence (note intelligence) ─────────────────────────────────
  if (ctx.dominantTheme && (ctx.themeCount[ctx.dominantTheme] || 0) >= 3) {
    const label = THEME_LABELS[ctx.dominantTheme] || ctx.dominantTheme
    candidates.push({
      text: pick([
        `A thread of ${label} runs through many of your notes.`,
        `${label.charAt(0).toUpperCase() + label.slice(1)} keeps appearing in what you write. The story seems to be working on it.`,
        `You keep circling back to ${label}. Something there is unresolved.`,
      ]),
      type: 'theme-persistence', weight: 2, priority: 2,
    })
  }

  // ── Theory pointing at a specific character ────────────────────────────────
  if (ctx.theoryNotes.length >= 2 && ctx.theoryCharFocus.length > 0) {
    const name = ctx.theoryCharFocus[0]
    candidates.push({
      text: pick([
        `Most of your theories lead back to ${name}.`,
        `${name} keeps appearing in your theories. Something about them is unresolved.`,
        `You've kept returning to ${name} since early on. Something there hasn't settled.`,
      ]),
      type: 'character-focus', weight: 2, priority: 3,
    })
  }

  // ── Temporal evolution ─────────────────────────────────────────────────────
  if (ctx.temporalEvolution === 'confusion-to-theory') {
    candidates.push({
      text: pick([
        "You began writing questions. More recently, you've been writing explanations.",
        "The early notes were confused. The recent ones are more certain. Something clarified.",
        "Your relationship with this story has shifted — from uncertainty toward interpretation.",
      ]),
      type: 'temporal-evolution', weight: 3, priority: 3,
    })
  } else if (ctx.temporalEvolution === 'sustained-theory') {
    candidates.push({
      text: pick([
        "You've been theorising from the very beginning. That analytical attention hasn't let up.",
        "A thread of theory running through this whole reading, from early on to now.",
      ]),
      type: 'temporal-evolution', weight: 2, priority: 2,
    })
  } else if (ctx.temporalEvolution === 'late-favorites') {
    candidates.push({
      text: pick([
        "You've been marking passages as favourites more in the second half. The language is landing differently.",
        "The favourites are appearing more now than they were early on. The language is landing differently.",
      ]),
      type: 'temporal-evolution', weight: 2, priority: 2,
    })
  }

  // ── Character fixation ─────────────────────────────────────────────────────
  if (ctx.characterNotes.length >= 3 && ctx.focusedCharacters.length > 0) {
    const name = ctx.focusedCharacters[0]
    candidates.push({
      text: pick([
        `More of your notes lead back to ${name} than anywhere else.`,
        `${name} has weight for you. They keep appearing in what you write.`,
        `You keep returning to ${name}. Something there is still unresolved.`,
      ]),
      type: 'character-focus', weight: 2, priority: 2,
    })
  }

  // ── Resonance anchor (note intelligence) ──────────────────────────────────
  // A note that has been both revised and reflected on is a strong signal.
  // The note fragment is injected for specificity — companion sounds like it read the note.
  const deepNote = ctx.highResonanceNotes.find(n => n.revisedAt && n.reflection)
  if (deepNote) {
    const frag = extractNoteFragment(deepNote, 38)
    candidates.push({
      text: frag
        ? pick([
          `One thought — "${frag}" — has been returned to more than once. It's still alive.`,
          `Something you wrote — "${frag}" — keeps getting revised. That thread hasn't closed.`,
        ])
        : pick([
          "One thought has been returned to more than once — revised, then reflected on again. It's still alive.",
          "There's a note you've kept coming back to. It has the quality of something not yet finished.",
          "Something you wrote early has been revisited more than once. A thread you haven't closed.",
        ]),
      type: 'resonance-anchor', weight: 2, priority: 2,
    })
  }

  // ── Early-note callback ────────────────────────────────────────────────────
  // When past the midpoint, resurface a specific note fragment from the first
  // quarter of the book — feels like the companion remembering alongside you.
  if (ctx.pct > 55 && ctx.totalChapters > 0) {
    const earlyBoundary = ctx.totalChapters * 0.28
    const earlyDeepNote = ctx.highResonanceNotes.find(
      n => n.chapter && n.chapter <= earlyBoundary && (n.revisedAt || n.reflection)
    )
    if (earlyDeepNote) {
      const frag = extractNoteFragment(earlyDeepNote, 40)
      if (frag) {
        candidates.push({
          text: pick([
            `"${frag}" — something from early in this reading, still carrying weight.`,
            `You wrote "${frag}" near the start. That thought has had a long time to settle.`,
          ]),
          type: 'early-note-callback', weight: 2, priority: 2,
        })
      }
    }
  }

  // ── Revisiting notes ───────────────────────────────────────────────────────
  if (ctx.reflectedNotes.length >= 2) {
    candidates.push({
      text: pick([
        "You've returned to earlier notes and added to them. The meaning is still moving.",
        "Some of your notes carry two layers now — the first thought and a later one.",
        "You've been revisiting earlier thoughts. The reading hasn't closed yet.",
      ]),
      type: 'interpretation-evolution', weight: 2, priority: 2,
    })
  }

  // ── Long-open mystery ──────────────────────────────────────────────────────
  // Inject mystery text when available — the reader named this question themselves.
  if (ctx.longestOpenMystery) {
    const age      = ctx.currentChapter - (ctx.longestOpenMystery.chapter || 0)
    const mystRaw  = ctx.longestOpenMystery.text?.trim()
    const mystFrag = mystRaw && mystRaw.length > 6
      ? (mystRaw.length > 44 ? mystRaw.slice(0, 41).trim() + '…' : mystRaw)
      : null
    if (age >= 12) {
      candidates.push({
        text: mystFrag
          ? pick([
            `"${mystFrag}" — still unanswered, ${age} chapters on.`,
            `That question — "${mystFrag}" — has followed you for ${age} chapters.`,
          ])
          : pick([
            `The first thread opened is still unanswered — ${age} chapters on.`,
            "The oldest question in this story is still open. The novel has been carrying it a long way.",
            `This question has followed you for ${age} chapters. It hasn't let go.`,
          ]),
        type: 'mystery-continuity', weight: 2, priority: 2,
      })
    }
  }

  // ── Motif callback — recurring concrete image ─────────────────────────────
  // A word appearing in 4+ notes is something the reader keeps returning to
  // without always noticing it. Naming it feels like the companion remembering.
  if (ctx.motifs?.length) {
    const top = ctx.motifs[0]
    if (top.count >= 4) {
      candidates.push({
        text: pick([
          `"${top.word}" keeps appearing in what you write — in ${top.count} separate notes. That kind of recurrence usually means something.`,
          `The word "${top.word}" runs through your notes. You may not have noticed — but it keeps returning.`,
        ]),
        type: 'motif-callback', weight: 1.5, priority: 2,
      })
    }
  }

  // ── Atmospheric memory — emotional weather of the reading ─────────────────
  // When a dominant atmosphere emerges from note language, the companion
  // can name it — acknowledging the texture of the reading experience.
  if (ctx.atmosphericSignature && ctx.noteCount >= 6) {
    const { signature } = ctx.atmosphericSignature
    const ATMOS_TEXT = {
      cold:    ["Something cold runs through this reading. It keeps appearing in what you write.",
                "A chill in the language of your notes — distance, numbness, removal. This book is cold somewhere."],
      dread:   ["A current of dread beneath your notes. The reading has its shadow.",
                "Something heavy keeps appearing in what you write. This story carries weight."],
      warmth:  ["There's a warmth running through your notes — brightness, closeness, light.",
                "Your notes have a warmth to them. This story seems to be reaching you."],
      grief:   ["A thread of absence through your notes — loss, longing, what isn't there anymore. This book is sitting with something.",
                "Grief keeps surfacing in what you write. The reading is holding it."],
      strange: ["An unsettled quality runs through your notes. Something in this story resists easy reading.",
                "Your notes keep circling something uncanny. This book won't resolve into ordinary."],
      tension: ["Something taut in the language of your notes — urgency, sharpness, breath held.",
                "A tension running through what you write. The reading is moving fast underneath."],
    }
    const pool = ATMOS_TEXT[signature]
    if (pool) {
      candidates.push({
        text: pick(pool),
        type: 'atmospheric-memory', weight: 1.5, priority: 2,
      })
    }
  }

  // ── Residue callback — recurring mystery anchor ────────────────────────────
  // Fires between 8–11 chapters open (gap before mystery-continuity at 12+).
  if (ctx.longestOpenMystery && ctx.residueFragments?.length) {
    const mystAge = ctx.currentChapter - (ctx.longestOpenMystery.chapter || 0)
    const mystFrag = ctx.residueFragments.find(f => f.type === 'mystery')
    if (mystFrag && mystAge >= 8 && mystAge < 12) {
      candidates.push({
        text: pick([
          `"${mystFrag.text}" — still here, unresolved.`,
          `That question — "${mystFrag.text}" — is still open.`,
        ]),
        type: 'residue-callback', weight: 1.5, priority: 2,
      })
    }
  }

  // ── Favourite passages ─────────────────────────────────────────────────────
  if (ctx.favoriteNotes.length >= 3) {
    candidates.push({
      text: pick([
        `${ctx.favoriteNotes.length} passages kept. The writing has been working on you.`,
        "You've been holding onto certain lines. That's a kind of reading.",
        "What you've marked as favourite is its own portrait of what this story means to you.",
      ]),
      type: 'reader-attention', weight: 1, priority: 1,
    })
  }

  // ── Quote collection ───────────────────────────────────────────────────────
  if (ctx.quoteNotes.length >= 3) {
    const topQuote = ctx.quoteNotes.sort((a, b) => (ctx.resonanceWeights[b.id] || 1) - (ctx.resonanceWeights[a.id] || 1))[0]
    const qfrag    = extractNoteFragment(topQuote, 44)
    candidates.push({
      text: qfrag
        ? pick([
          `You've been collecting sentences — "${qfrag}" among them. The writing is doing something to you.`,
          `"${qfrag}" — one of ${ctx.quoteNotes.length} passages you've held onto. This book is giving you language to carry.`,
        ])
        : pick([
          "You've been collecting sentences. This book is giving you language to carry.",
          `${ctx.quoteNotes.length} passages marked as quotes. The writing is doing something to you.`,
        ]),
      type: 'reader-attention', weight: 1, priority: 1,
    })
  }

  // ── Dense annotation past the midpoint ────────────────────────────────────
  if (ctx.noteCount >= 10 && ctx.pct >= 50) {
    candidates.push({
      text: pick([
        `${ctx.noteCount} notes into a story past its midpoint. It's been an active reading.`,
        "You've left a lot behind in this story — notes, threads, theories.",
      ]),
      type: 'reader-attention', weight: 1, priority: 1,
    })
  }

  // ── Confusion without matching theories ───────────────────────────────────
  if (ctx.confusingNotes.length >= 3 && ctx.theoryNotes.length < 2) {
    candidates.push({
      text: pick([
        "Several passages have confused you. This story may be deliberate about what it withholds.",
        "The confusing notes outnumber the theories. Some stories need to be finished before they can be understood.",
        "You've flagged more than you've explained. That's not necessarily a problem.",
      ]),
      type: 'confusion-signal', weight: 1, priority: 1,
    })
  }

  // ── Deduplicate by type, highest weight wins ───────────────────────────────
  const byType = {}
  for (const c of candidates) {
    if (!byType[c.type] || c.weight > byType[c.type].weight) byType[c.type] = c
  }

  const ts = Date.now()
  return Object.values(byType)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((c, i) => makeEntry(`rb_${ts}_${i}`, c.text, 'rule-based', c.priority ?? 1))
}

// ── First-note intro reflection — tag-aware ───────────────────────────────────

/**
 * Generates a tag-aware companion response for the reader's very first note.
 * Called once, when `book.notes.length === 0` before the new note is added.
 * Returns a string — no entry object; caller wraps it in makeEntry.
 */
export function generateFirstIntroReflection(note) {
  const tag = note?.tag || 'theme'
  const pools = {
    theory: [
      "A theory right away. You came to this story already reaching for explanations.",
      "Your first note is already an interpretation. Something caught you immediately.",
      "A theory before the story has had time to unfold. Something caught you immediately.",
    ],
    confusing: [
      "Something already unsettled you. This story may be deliberate about what it withholds.",
      "Your first note is a question. Some stories begin this way — not with clarity, but with the right kind of confusion.",
      "Disorientation early. That can be exactly what a story intends.",
    ],
    quote: [
      "You stopped for the language before anything else. That's a specific kind of reading.",
      "The first thing you kept was a sentence. You came here for the writing itself.",
      "Something in the prose caught you first. The language is already working on you.",
    ],
    favorite: [
      "Something moved you early.",
      "A favourite moment already. Something in this has reach.",
      "The story reached you before you had time to be cautious about it.",
    ],
    character: [
      "Someone has already caught your attention. Early impressions in fiction are rarely accidental.",
      "You noticed a character before anything else. That kind of attention tends to stay.",
      "Someone made an impression immediately. Worth watching what the story does with that.",
    ],
    theme: [
      "You saw the larger concern beneath the surface from the very start.",
      "Something beneath the surface, noticed early.",
      "Something larger than the plot caught you first. That attentiveness tends to compound.",
    ],
  }
  const pool = pools[tag] ?? [
    "The first thought is here. The reading has begun.",
    "Something worth keeping from the very beginning.",
    "A first note. The reading has begun in earnest.",
  ]
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Entry factory ─────────────────────────────────────────────────────────────

function makeEntry(id, text, type, priority = 1) {
  return {
    id,
    text,
    type,
    priority,
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
export function extractNameMentions(texts) {
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
 * Detects meaningful tag-distribution shifts between the first and second
 * halves of a reader's notes (chronologically ordered).
 * Requires ≥5 notes.
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

  if ((e.confusing || 0) >= 2 && (l.theory || 0) >= 2 && (l.confusing || 0) < (e.confusing || 0)) {
    return 'confusion-to-theory'
  }
  if ((e.theory || 0) >= 2 && (l.theory || 0) >= 2) {
    return 'sustained-theory'
  }
  if ((l.favorite || 0) >= 2 && (l.favorite || 0) > (e.favorite || 0) + 1) {
    return 'late-favorites'
  }

  return null
}
