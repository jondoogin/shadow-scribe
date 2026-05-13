// Spoiler intelligence — graduated narrative visibility
// Philosophy: protect what the reader doesn't know yet; never censor mechanically.
// All public functions accept an optional `mode` param that overrides book.spoilerMode.

// ── Mode resolution ────────────────────────────────────────────────────────────

export function getEffectiveMode(book, settingsOrMode = null) {
  if (typeof settingsOrMode === 'string') return settingsOrMode
  return book.spoilerMode ?? settingsOrMode?.spoilerMode ?? 'relaxed'
}

// ── Boundary helpers ───────────────────────────────────────────────────────────

export function getSpoilerBoundary(book) {
  return book.currentChapter ?? 0
}

export function isChapterVisible(book, chapterNum) {
  return chapterNum <= getSpoilerBoundary(book)
}

// How far ahead chapter titles are revealed
// strict: only completed + 1 ahead  |  relaxed/full: all titles
export function getTitleVisibilityBoundary(book, mode) {
  const m = mode ?? getEffectiveMode(book)
  if (m === 'full' || m === 'relaxed') return book.totalChapters
  return getSpoilerBoundary(book) + 1
}

// Visible progress range
export function getVisibleRange(book) {
  return { min: 1, max: getSpoilerBoundary(book) }
}

// ── Chapter content ────────────────────────────────────────────────────────────

export function getChapterContent(book, chapter, mode) {
  const m = mode ?? getEffectiveMode(book)
  if (m === 'full') return { summary: chapter.summary, reflection: chapter.reflection }
  if (isChapterVisible(book, chapter.num)) {
    return { summary: chapter.summary, reflection: chapter.reflection }
  }
  return { summary: null, reflection: null }
}

// ── Chapter title visibility ───────────────────────────────────────────────────

// Returns the display title for a chapter, respecting spoiler mode.
// In strict mode, titles beyond the reading boundary are obscured.
export function getChapterTitle(book, chapter, mode) {
  const m = mode ?? getEffectiveMode(book)
  const boundary = getTitleVisibilityBoundary(book, m)
  if (chapter.num <= boundary) return chapter.title
  // Literary placeholder — preserve the sense of a chapter existing, not a redaction
  return chapter.alternateSummary ?? '···'
}

// ── Character visibility ───────────────────────────────────────────────────────

function parseLastSeenChapter(lastSeen) {
  if (!lastSeen) return 0
  const m = lastSeen.match(/\d+/)
  return m ? parseInt(m[0]) : 0
}

function getRevealChapter(character) {
  if (character.revealChapter != null) return character.revealChapter
  return parseLastSeenChapter(character.lastSeen)
}

// Has this character been encountered yet?
export function isCharacterMet(book, character) {
  if (character.spoilerSafe) return true
  return getRevealChapter(character) <= getSpoilerBoundary(book)
}

// Is it safe to show the character's full current state?
export function isCharacterSafe(book, character) {
  if (character.spoilerSafe) return true
  const boundary = getSpoilerBoundary(book)
  return parseLastSeenChapter(character.lastSeen) <= boundary
}

// Literary veil text — evocative, not mechanical
const VEIL_DESCRIPTIONS = [
  "Their role in this story is still ahead of you.",
  "The full shape of their character hasn't yet emerged.",
  "There is more to them than is yet apparent.",
  "Their path through this story remains unwritten from your vantage.",
]

const VEIL_STATUSES = {
  protagonist: "Still very much in the middle of things.",
  antagonist:  "Their position in the story continues to shift.",
  ally:        "Where their loyalties finally rest is unclear.",
  default:     "Their path forward is uncertain.",
}

function veiledDescription(character) {
  if (character.hiddenDescription) return character.hiddenDescription
  const role = (character.role || '').toLowerCase()
  if (role.includes('protagonist')) return "Their story is still unfolding page by page."
  if (role.includes('antagonist')) return "Their role in the story has not yet fully emerged."
  if (role.includes('ferryman') || role.includes('guide')) return "They are present in ways you haven't yet fully understood."
  return VEIL_DESCRIPTIONS[character.id?.charCodeAt(0) % VEIL_DESCRIPTIONS.length] ?? VEIL_DESCRIPTIONS[0]
}

function veiledStatus(character) {
  if (character.hiddenStatus) return character.hiddenStatus
  const role = (character.role || '').toLowerCase()
  if (role.includes('protagonist')) return VEIL_STATUSES.protagonist
  if (role.includes('antagonist')) return VEIL_STATUSES.antagonist
  return VEIL_STATUSES.default
}

function veiledAllegiance(character, boundary) {
  if (!character.allegiance) return null
  const allegiance = character.allegiance
  // If an allegiance shift hasn't happened yet within the reader's view
  if (allegiance.includes('→')) {
    const lastSeenNum = parseLastSeenChapter(character.lastSeen)
    if (lastSeenNum > boundary) {
      // Show only the pre-shift part — the reader hasn't seen the shift yet
      return allegiance.split('→')[0].trim()
    }
  }
  return allegiance
}

// Returns a character object safe to render at the current reading position.
// Fields may be replaced with literary vague text rather than nulled.
export function getCharacterView(book, character, mode) {
  const m = mode ?? getEffectiveMode(book)
  if (m === 'full') return { ...character, _veiled: false }

  const boundary = getSpoilerBoundary(book)
  const met      = isCharacterMet(book, character)
  const safe     = isCharacterSafe(book, character)

  // Character fully within reader's boundary — show everything
  if (safe) {
    return {
      ...character,
      allegiance: veiledAllegiance(character, boundary) ?? character.allegiance,
      _veiled: false,
    }
  }

  // Character hasn't been met yet
  if (!met) {
    if (m === 'strict') return null  // signal to caller: don't render this character
    // Relaxed: show with veiled name/role but nothing revealing
    return {
      ...character,
      description: veiledDescription(character),
      status:      veiledStatus(character),
      allegiance:  "Unknown",
      lastSeen:    null,
      _veiled: true,
      _veilReason: 'not-yet-encountered',
    }
  }

  // Character has been met but has future-state info (description/status reflects beyond boundary)
  return {
    ...character,
    description: safe ? character.description : veiledDescription(character),
    status:      safe ? character.status : veiledStatus(character),
    allegiance:  veiledAllegiance(character, boundary) ?? character.allegiance,
    _veiled: true,
    _veilReason: 'partial-view',
  }
}

// ── Mystery visibility ─────────────────────────────────────────────────────────

const MYSTERY_VEIL_STATUS = 'suspected'

// Mystery status progression — from narrative uncertainty to resolution
export const MYSTERY_STATUSES = {
  open:       { label: 'Open',             color: 'ember',  weight: 1 },
  suspected:  { label: 'Suspected',        color: 'gold',   weight: 2 },
  evolving:   { label: 'Evolving',         color: 'sienna', weight: 3 },
  hinted:     { label: 'Hinted at',        color: 'gold',   weight: 3 },
  dormant:    { label: 'Dormant',          color: 'ink',    weight: 2 },
  resolved:   { label: 'Resolved',         color: 'sage',   weight: 0 },
}

export function getMysteryVisibilityThreshold(mystery) {
  return mystery.visibilityThreshold ?? mystery.chapter ?? 0
}

export function isMysteryVisible(book, mystery, mode) {
  const m = mode ?? getEffectiveMode(book)
  if (m === 'full') return true
  const threshold = getMysteryVisibilityThreshold(mystery)
  return threshold <= getSpoilerBoundary(book)
}

// ── Discussion question visibility ────────────────────────────────────────

// Questions may be plain strings (always visible) or objects:
// { text, chapter?, visibilityThreshold?, alternatePrompt? }
export function getDiscussionQuestionView(book, question, mode) {
  if (typeof question === 'string') return { text: question, _veiled: false }

  const m         = mode ?? getEffectiveMode(book)
  const threshold = question.visibilityThreshold ?? question.chapter ?? 0
  const boundary  = getSpoilerBoundary(book)

  if (m === 'full' || threshold <= boundary) return { text: question.text, _veiled: false }
  if (m === 'strict') return null
  // Relaxed: show an alternate prompt or a generic placeholder
  return {
    text: question.alternatePrompt ?? "A question for later in the story.",
    _veiled: true,
  }
}

// ── Mystery visibility ─────────────────────────────────────────────────────

// Returns a mystery safe to render, with alternate text if needed
export function getMysteryView(book, mystery, mode) {
  const m = mode ?? getEffectiveMode(book)
  if (!isMysteryVisible(book, mystery, m)) {
    if (m === 'strict') return null
    // Relaxed: show vague placeholder
    return {
      ...mystery,
      text:   mystery.alternateSummary ?? "A thread the story is still gathering.",
      status: 'suspected',
      _veiled: true,
    }
  }
  return { ...mystery, _veiled: false }
}
