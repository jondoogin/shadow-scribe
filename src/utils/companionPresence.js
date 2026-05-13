import { getProgress } from './progress.js'
import { calcStreak, logDates } from './date.js'
import { isMysteryVisible, getEffectiveMode, isCharacterSafe } from './spoiler.js'

function daysSince(dateStr) {
  if (!dateStr) return null
  return Math.floor((Date.now() - new Date(dateStr)) / 86400000)
}

// Filter log to proper SessionEntry objects (not migrated stubs)
function sessionEntries(log = []) {
  return (log || []).filter(e => e && typeof e === 'object' && e.date)
}

function recentSessionCount(log = [], days = 7) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return logDates(log).filter(d => new Date(d) >= cutoff).length
}

// ── Arc observations by style ──────────────────────────────────────────────

const ARC_OBS = {
  observational: [
    "The first page hasn't been turned yet. Everything remains possible.",
    "You're in the very opening movements — the world is still finding its shape.",
    "The foundations are being laid. What's established early in a story tends to matter.",
    "Characters are finding their footing. The story is deciding what it cares about.",
    "The first tensions are crystallising. The novel is beginning to show its hand.",
    "You're approaching the story's emotional centre — where its true question sharpens.",
    "The story has crossed its axis. What follows carries the weight of what came before.",
    "You're deep in the second half. What was promised is being called upon.",
    "The threads are tightening. The author is keeping their promises.",
    "You're in the final movements. The story is deciding what it wants to mean.",
    "You've reached the last page. What remains now is the story's echo in you.",
  ],
  analytical: [
    "The story hasn't started for you yet. Opening choices haven't registered.",
    "The opening pages are calibrating distance — between narrator, reader, and world.",
    "The first act is building its terms. What's established here will be tested later.",
    "The story has identified its concerns. Whether they'll deepen is the open question.",
    "Approaching midpoint: the place where the initial premise starts to complicate.",
    "Near the structural centre — the point from which no easy return is possible.",
    "Past the axis. The second half operates on the first half's debts.",
    "Deep in the second half. Earlier choices are being honoured or exposed.",
    "The convergence phase — threads that were separate are being drawn together.",
    "Final act. The author is accounting for what they set up.",
    "Finished. The argument has been made, or not made. What did you find?",
  ],
  minimal: [
    "Not yet begun.",
    "Opening pages.",
    "Early acts.",
    "First quarter.",
    "Approaching the midpoint.",
    "Near centre.",
    "Past the axis.",
    "Second half.",
    "Converging.",
    "Final pages.",
    "Finished.",
  ],
}

function arcObs(pct, style) {
  const idx =
    pct === 0  ? 0 :
    pct < 12   ? 1 :
    pct < 25   ? 2 :
    pct < 38   ? 3 :
    pct < 50   ? 4 :
    pct < 57   ? 5 :
    pct < 65   ? 6 :
    pct < 78   ? 7 :
    pct < 90   ? 8 :
    pct < 99   ? 9 : 10
  return (ARC_OBS[style] ?? ARC_OBS.observational)[idx]
}

// ── Finished-book reflective lens ─────────────────────────────────────────

function finishedObs(pct, notes, important, style) {
  if (pct < 99) return null
  if (notes.length === 0 && important.length === 0) return null
  if (style === 'minimal') return notes.length >= 3 ? `${notes.length} notes left behind.` : null
  if (style === 'analytical') {
    if (notes.length >= 5 && important.length >= 2)
      return `You finished with ${notes.length} notes and ${important.length} starred chapters. The record of your attention is its own document.`
    if (notes.length >= 3)
      return `Your annotations remain after the last page — a record of where the story found you.`
    if (important.length >= 1)
      return `${important.length} chapter${important.length > 1 ? 's' : ''} starred as pivotal. The pattern reveals where the story's weight fell for you.`
    return null
  }
  // observational
  if (notes.length >= 5 && important.length >= 2)
    return `You finished it — with ${notes.length} notes and ${important.length} starred chapters. That's the shape of your reading of this book.`
  if (notes.length >= 3)
    return `Your notes remain after the last page. They're a kind of record of who you were while reading this.`
  if (important.length >= 1)
    return `You marked ${important.length === 1 ? 'one chapter' : `${important.length} chapters`} as pivotal. That instinct is usually right.`
  return null
}

// ── Mystery observations by style ─────────────────────────────────────────

function mysteryObs(openCount, totalMysteries, pct, style) {
  if (style === 'minimal') return null
  if (style === 'analytical') {
    if (openCount > 5)                            return `${openCount} unresolved threads. The story is accumulating questions intentionally.`
    if (openCount > 2 && pct > 60)                return `${openCount} threads still open at this depth — convergence is likely deliberate.`
    if (openCount === 2 && pct > 65)              return "Two threads remain. The novel may be conserving them for the end."
    if (openCount === 1 && pct > 65)              return "One question hasn't found its answer. That's a structural choice."
    if (openCount === 0 && totalMysteries > 3)    return "All threads resolved. The story has answered itself."
    return null
  }
  // observational
  if (openCount > 5)                              return `${openCount} threads are still unresolved. This story withholds deliberately.`
  if (openCount > 2 && pct > 60)                 return "Several of the story's open questions are beginning to circle toward each other."
  if (openCount === 2 && pct > 65)               return "Two threads still hang. The novel may be saving something for the end."
  if (openCount === 1 && pct > 65)               return "One question opened early still hasn't found its answer."
  if (openCount === 0 && totalMysteries > 3)     return "All the threads have been tied. The story has answered itself."
  return null
}

// ── Lingering mystery lens ────────────────────────────────────────────────
// Fires when a visible, unresolved mystery has been open for many chapters.

function lingeringMysteryObs(mysteries, currentChapter, pct, style) {
  if (style === 'minimal' || pct < 30) return null
  const lingering = mysteries.filter(m => !m.resolved && m.chapter && (currentChapter - m.chapter) >= 10)
  if (!lingering.length) return null
  if (style === 'analytical') {
    if (lingering.length >= 2)
      return `${lingering.length} questions have been open since the early chapters. Their persistence is structural, not accidental.`
    return `A question from chapter ${lingering[0].chapter} is still unanswered — ${currentChapter - lingering[0].chapter} chapters on. The story hasn't forgotten it.`
  }
  if (lingering.length >= 2)
    return `${lingering.length} threads from early in the story are still open. The novel has been carrying them a long way.`
  return `A thread opened in chapter ${lingering[0].chapter} is still unresolved — ${currentChapter - lingering[0].chapter} chapters later. Something is being held back.`
}

// ── Character observations by style ───────────────────────────────────────

function characterObs(main, style) {
  if (style === 'minimal') return []
  const dead = main.filter(c => !c.alive).length
  const hasShift = main.some(c => c.allegiance?.includes('→'))
  const out = []
  if (style === 'analytical') {
    if (dead >= 2)   out.push(`${dead} characters within your reading are no longer living. The cast is not protected.`)
    else if (dead === 1) out.push("One character within your reading is gone. The author has made that permanent.")
    if (hasShift)    out.push("An allegiance has shifted since the opening. Earlier readings of that character need revising.")
  } else {
    if (dead >= 2)   out.push(`${dead} of the characters you've met are no longer living.`)
    else if (dead === 1) out.push("One of the characters you've encountered is no longer living.")
    if (hasShift)    out.push("At least one character's allegiance has shifted since the opening pages.")
  }
  return out
}

// ── Reader lens (style-independent, just quieter for minimal) ─────────────

function readerObs(notes, important, pct, style) {
  if (style === 'minimal') return []
  const theoryNotes   = notes.filter(n => n.tag === 'theory')
  const favoriteNotes = notes.filter(n => n.tag === 'favorite')
  const confusedNotes = notes.filter(n => n.tag === 'confusing')
  const quoteNotes    = notes.filter(n => n.tag === 'quote')
  const themeNotes    = notes.filter(n => n.tag === 'theme')
  const out = []

  if (style === 'analytical') {
    if (theoryNotes.length >= 3)                      out.push("Your theories are accumulating. You've been reading ahead of the text.")
    else if (theoryNotes.length > 0 && themeNotes.length > 0) out.push("You're tracking both story and argument simultaneously. That dual attention pays off.")
    else if (themeNotes.length >= 2)                  out.push("You've been reading thematically. That kind of attentiveness shifts what you notice.")
    if (confusedNotes.length >= 2)                    out.push("Several passages flagged as confusing — this story may be deliberate about what it withholds.")
    if (quoteNotes.length >= 3)                       out.push("You've been marking language. This book is giving you sentences to carry.")
    if (important.length >= 3)                        out.push("Several chapters starred as pivotal. The pattern reveals where the story's weight actually falls.")
  } else {
    if (theoryNotes.length >= 3)                      out.push(`${theoryNotes.length} theory notes already. That kind of reading usually finds what it's looking for.`)
    else if (theoryNotes.length > 0 && themeNotes.length > 0) out.push("You've been reading both the story and what it means simultaneously.")
    else if (themeNotes.length >= 2)                  out.push("You've been reading thematically. That attention finds things a more surface reading misses.")
    if (confusedNotes.length >= 2)                    out.push("You've flagged several passages as confusing — this story may be deliberate in what it withholds.")
    if (quoteNotes.length >= 3)                       out.push("You've been collecting lines. This book is giving you language to carry.")
    if (favoriteNotes.length >= 2 && pct < 60)        out.push("You've already marked several favourite moments — and you're not even halfway.")
    if (important.length >= 3)                        out.push("You've marked several chapters as pivotal. The pattern shows where the story's weight falls.")
  }
  if (notes.length >= 5)                              out.push("Your annotations are beginning to form a parallel text alongside the story.")
  else if (notes.length >= 3)                         out.push("Your notes are becoming their own companion to this book.")
  return out
}

// ── Note pattern lens ─────────────────────────────────────────────────────
// Notices things readerObs doesn't cover: character-tag recurrence,
// and the "confused + theorizing" double signal.

function notePatternObs(notes, style) {
  if (style === 'minimal' || notes.length < 3) return null
  const charNotes     = notes.filter(n => n.tag === 'character')
  const theoryNotes   = notes.filter(n => n.tag === 'theory')
  const confusedNotes = notes.filter(n => n.tag === 'confusing')

  // Both theorizing and confused: a distinct reading state
  if (theoryNotes.length >= 2 && confusedNotes.length >= 2) {
    if (style === 'analytical')
      return "You're forming theories and flagging confusion simultaneously — that's what a deliberately ambiguous story produces."
    return "You've been both theorising and unsettled at the same time. Some stories demand both at once."
  }
  // Recurring attention to characters
  if (charNotes.length >= 3) {
    if (style === 'analytical')
      return `${charNotes.length} notes about characters. The reading is character-centred — that focus tends to find the story's real argument.`
    return "Your attention keeps returning to the characters. They're carrying something."
  }
  if (charNotes.length >= 2) {
    if (style === 'analytical') return "Your notes keep coming back to the characters."
    return "You keep writing about the characters. Something in them has hold of you."
  }
  return null
}

// ── Interpretation evolution lens ────────────────────────────────────────
// Notices when the reader has been revising notes, refining mysteries,
// or adding second thoughts — signals an actively evolving reading.

function interpretationObs(notes, mysteries, style) {
  if (style === 'minimal') return null
  const revisedNotes    = notes.filter(n => n.revisedAt)
  const reflectedNotes  = notes.filter(n => n.reflection)
  const theoriesRevised = notes.filter(n => n.tag === 'theory' && n.revisedAt)
  const withObservation = mysteries.filter(m => m.observation)
  const refinedMyst     = mysteries.filter(m => m.originalText)
  const total = revisedNotes.length + reflectedNotes.length + withObservation.length + refinedMyst.length
  if (total < 1) return null

  if (style === 'analytical') {
    if (theoriesRevised.length >= 2)
      return "You've revised multiple theories. The story is actively resisting your initial readings."
    if (refinedMyst.length >= 2)
      return `${refinedMyst.length} of your mystery threads have been reframed as your reading developed.`
    if (revisedNotes.length >= 3)
      return "Your notes have been revised as you've moved through the story — a reading that's still in motion."
    if (reflectedNotes.length >= 2 && withObservation.length >= 2)
      return "You've been adding second thoughts to notes and threads alike. This is close reading."
    if (withObservation.length >= 2)
      return `${withObservation.length} open threads have your current thinking attached. The companion has been accumulating layers.`
    if (reflectedNotes.length >= 2)
      return "You've added later reflections to earlier notes. The story is accumulating more layers for you."
    if (theoriesRevised.length >= 1)
      return "At least one theory has been revised. The story may be doing exactly what it intended."
    return null
  }

  // observational
  if (theoriesRevised.length >= 2)
    return "Several of your theories have shifted since you first wrote them. The story is still surprising you."
  if (refinedMyst.length >= 2)
    return "Some of the questions you opened early have been reframed as you've moved deeper into the story."
  if (revisedNotes.length >= 3)
    return "Your notes have been changing alongside your reading. That's an active companion."
  if (reflectedNotes.length >= 2 && withObservation.length >= 2)
    return "You've been revisiting both notes and threads. Your understanding of this story is still forming."
  if (withObservation.length >= 2)
    return "You've been adding thoughts to the open threads as you read. Something in you is working on them."
  if (reflectedNotes.length >= 2)
    return "You've gone back to add thoughts to earlier notes. The story is developing a second layer as you go."
  if (theoriesRevised.length >= 1)
    return "One of your theories has shifted. The story pushed back."
  return null
}

// ── Session rhythm lens ───────────────────────────────────────────────────
// Notices patterns within session granularity: multiple same-day sessions,
// a run of immersed sessions, a brief return after sustained reading.

function sessionRhythmObs(log, style, temperament) {
  if (style === 'minimal') return null
  const entries = sessionEntries(log)
  if (entries.length < 2) return null

  // Multiple sessions same day
  const dates = entries.map(e => e.date)
  const dateCounts = dates.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc }, {})
  const multiDay = Object.values(dateCounts).some(c => c > 1)

  // Recent immersed run (2+ immersed in last 5 entries)
  const recent5 = entries.slice(-5)
  const immersedCount = recent5.filter(e => e.durationEstimate === 'immersed').length

  // Brief return after 4+ sessions
  const lastEntry = entries[entries.length - 1]
  const briefReturn = entries.length >= 4 && lastEntry.durationEstimate === 'brief'

  if (multiDay) {
    if (style === 'analytical') return "You returned to this story more than once in a single day — a sign of sustained engagement."
    return "The story pulled you back more than once in a day."
  }
  if (immersedCount >= 2) {
    if (style === 'analytical') return "Several recent sessions have been extended. The story has found its grip."
    return "Something in this stretch has been pulling you through."
  }
  if (briefReturn) {
    if (style === 'analytical') return "A shorter session after a sustained stretch — a natural rhythm."
    return "A brief return — the story hasn't moved on without you."
  }
  return null
}

// ── Session stop lens ─────────────────────────────────────────────────────
// Notices when the reader stopped near a starred chapter.

function sessionStopObs(log, chapters, style) {
  if (style === 'minimal') return null
  const entries = sessionEntries(log)
  if (!entries.length) return null

  const last = entries[entries.length - 1]
  if (!last.endChapter || (last.endChapter - last.startChapter) > 4) return null

  // Check if they stopped within 2 chapters of a starred chapter
  const nearImportant = chapters.some(c => c.important && Math.abs(c.num - last.endChapter) <= 2)
  if (!nearImportant) return null

  if (style === 'analytical') return "Your last session stopped near a chapter marked as pivotal. That proximity may not be accidental."
  return "You stopped near something that mattered. Some chapters ask to be sat with."
}

// ── Pacing lens ───────────────────────────────────────────────────────────
// Detects whether the reader has accelerated or slowed over time.

function pacingObs(log, pct, style) {
  if (style === 'minimal') return null
  const sorted = [...new Set(logDates(log))].sort()
  if (sorted.length < 5 || pct < 30) return null

  const mid = Math.floor(sorted.length / 2)
  const firstHalf  = sorted.slice(0, mid)
  const secondHalf = sorted.slice(mid)

  const spanDays = (arr) => {
    if (arr.length < 2) return 7
    return Math.max(7, Math.floor((new Date(arr[arr.length - 1]) - new Date(arr[0])) / 86400000))
  }

  const rate1 = (firstHalf.length / spanDays(firstHalf)) * 7
  const rate2 = (secondHalf.length / spanDays(secondHalf)) * 7

  if (rate2 > rate1 * 1.8) {
    if (style === 'analytical') return "Your reading pace has increased significantly. The story has found traction."
    return "Something in the story has quickened your pace."
  }
  if (rate1 > rate2 * 1.8) {
    if (style === 'analytical') return "Your reading pace has slowed considerably since the beginning. That can mean resistance — or closer attention."
    return "You've been moving more slowly through this part of the story than you were at the start."
  }
  return null
}

// ── Momentum lens ─────────────────────────────────────────────────────────

function momentumObs(streak, recent7, gapDays, sessions, style) {
  if (style === 'analytical') {
    if (streak >= 7)        return `${streak} consecutive days. Whatever this book is doing, it's working.`
    if (streak >= 4)        return `${streak} days returning. Something has engaged.`
    if (streak >= 2)        return "Returning consistently. That's the thing that matters most."
    if (recent7 >= 4)       return "An absorbed stretch this week."
    if (gapDays != null && gapDays > 60 && sessions > 0) return "Over two months since the last session. The story is unchanged. You may not be."
    if (gapDays != null && gapDays > 30 && sessions > 0) return "A month since the last session. The book has been sitting still, waiting."
    if (gapDays != null && gapDays > 14 && sessions > 0) return "Some time since the last session. The story is still here when you're ready."
    if (gapDays != null && gapDays > 7  && sessions > 0) return "A week since you last opened this."
    return null
  }
  if (style === 'minimal') {
    if (streak >= 4)        return `${streak}-day streak.`
    if (gapDays != null && gapDays > 30 && sessions > 0) return "A long time has passed."
    if (gapDays != null && gapDays > 14 && sessions > 0) return "Some time has passed."
    return null
  }
  // observational
  if (streak >= 7)          return `A ${streak}-day reading streak. This story has its hooks in you.`
  if (streak >= 4)          return `You've returned ${streak} days running. Something is keeping you here.`
  if (streak >= 2)          return "You've been returning to it consistently. That's a good sign."
  if (recent7 >= 4)         return "You've been reading in an absorbed stretch this week."
  if (gapDays != null && gapDays > 60 && sessions > 0) return "This story has been waiting a long time. It hasn't changed. You may have."
  if (gapDays != null && gapDays > 30 && sessions > 0) return "Over a month away from this story. It's still here, unchanged."
  if (gapDays != null && gapDays > 14 && sessions > 0) return "Some time has passed since your last session. The story is still here."
  if (gapDays != null && gapDays > 7  && sessions > 0) return "A week has passed since you last opened this."
  return null
}

// ── Character ownership lens ──────────────────────────────────────────────
// Fires when the reader has shaped the cast themselves.

function characterOwnershipObs(allChars, style) {
  if (style === 'minimal') return null
  const userAdded     = allChars.filter(c => c.userAdded)
  const recentlyEdited = allChars.filter(c => !c.userAdded && c.updatedAt)

  if (!userAdded.length && !recentlyEdited.length) return null

  if (style === 'analytical') {
    if (userAdded.length >= 3)
      return `${userAdded.length} characters added by you. The cast is becoming partly your own construction.`
    if (userAdded.length >= 1)
      return "You've added a character to this companion. The companion will treat them as part of the story."
    if (recentlyEdited.length >= 1)
      return "You've revised your understanding of at least one character. That kind of updating is how close reading works."
    return null
  }
  // observational
  if (userAdded.length >= 3)
    return `You've added ${userAdded.length} characters to this story. The companion is becoming yours.`
  if (userAdded.length >= 1)
    return "You've introduced a character to this companion. They're part of the story as you're reading it now."
  if (recentlyEdited.length >= 1)
    return "Your understanding of some of these characters has shifted. That's a sign you're reading closely."
  return null
}

// ── Main export ───────────────────────────────────────────────────────────

export function generatePresence(book, settings = null) {
  const mode    = getEffectiveMode(book, settings)
  const style   = settings?.insightStyle ?? 'observational'
  const pct     = getProgress(book)
  const completed = book.chapters.filter(c => c.completed)
  const openMyst  = (book.mysteries || []).filter(m => !m.resolved && isMysteryVisible(book, m, mode))
  const important = completed.filter(c => c.important)
  const notes     = book.notes || []
  const main      = (book.characters?.main || []).filter(c => isCharacterSafe(book, c))
  const allChars  = [...(book.characters?.main || []), ...(book.characters?.secondary || [])]
  const log        = book.readingLog || []
  const currentEra = book.rereadCount || 0
  // Filter to the current reading era so pacing/momentum don't conflate first-read and reread sessions
  const eraLog     = log.filter(s => typeof s === 'object' && (s.rereadEra ?? 0) === currentEra)
  const streak     = calcStreak(eraLog)
  const sessions   = eraLog.length
  const recent7    = recentSessionCount(eraLog, 7)
  const lastDate   = [...logDates(eraLog)].sort().pop()
  const gapDays    = daysSince(lastDate)
  const out       = []

  // Arc — always first
  out.push(arcObs(pct, style))

  // Finished-book reflection — only at 99%+, only when there's something to reflect on
  const fObs = finishedObs(pct, notes, important, style)
  if (fObs) out.push(fObs)

  // Mystery count
  const mObs = mysteryObs(openMyst.length, book.mysteries?.length ?? 0, pct, style)
  if (mObs) out.push(mObs)

  // Lingering mysteries — open for 10+ chapters
  const lmObs = lingeringMysteryObs(openMyst, book.currentChapter, pct, style)
  if (lmObs) out.push(lmObs)

  // Character (deaths, allegiance shifts — only if enough chars in view)
  if (main.length >= 3) {
    characterObs(main, style).forEach(o => out.push(o))
  }

  // Character ownership — user-shaped cast
  const coObs = characterOwnershipObs(allChars, style)
  if (coObs) out.push(coObs)

  // Reader lens
  readerObs(notes, important, pct, style).forEach(o => out.push(o))

  // Note pattern — character recurrence & confused+theory combo
  const npObs = notePatternObs(notes, style)
  if (npObs) out.push(npObs)

  // Interpretation evolution — revised notes, reflections, refined mysteries
  const intObs = interpretationObs(notes, book.mysteries || [], style)
  if (intObs) out.push(intObs)

  // Session rhythm — multiple sessions same day, immersed runs, brief returns
  const srObs = sessionRhythmObs(eraLog, style)
  if (srObs) out.push(srObs)

  // Session stop — paused near a starred chapter
  const ssObs = sessionStopObs(eraLog, book.chapters || [], style)
  if (ssObs) out.push(ssObs)

  // Pacing change
  const pObs = pacingObs(eraLog, pct, style)
  if (pObs) out.push(pObs)

  // Momentum
  const mmt = momentumObs(streak, recent7, gapDays, sessions, style)
  if (mmt) out.push(mmt)

  // Duration
  if (style !== 'minimal' && sessions >= 2) {
    const sorted    = [...logDates(eraLog)].sort()
    const totalDays = Math.floor((Date.now() - new Date(sorted[0])) / 86400000)
    if (totalDays >= 30 && pct < 85)         out.push("You've been living with this story for over a month.")
    else if (totalDays >= 14 && sessions >= 4) out.push(`You've been returning to this story for ${Math.round(totalDays / 7)} weeks.`)
  }

  const cap = style === 'minimal' ? 3 : 8
  return out.filter(Boolean).slice(0, cap)
}
