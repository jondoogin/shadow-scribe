import { getProgress } from './progress.js'
import { calcStreak, logDates } from './date.js'
import { isMysteryVisible, getEffectiveMode, isCharacterSafe } from './spoiler.js'
import {
  computeObservationCap,
  shouldYieldToBook,
  computePresenceVisibility,
  computeInterruptionRisk,
  computeNarrativeDominance,
  detectSelfSustainingNarrative,
  isSolitudeProtected,
} from './invisiblePresence.js'
import { detectCollapsedCertainty, detectMysteryRefinements, detectQuoteRecontextualization } from './transformScore.js'
import { detectConfidenceDrift, detectFixations, detectNoteLengthTrajectory, detectBurstCadence, detectSilenceGap } from './readerState.js'
import { arbitrateCandidates, shouldEnterAtmosphereMode, momentumWeight } from './signalHierarchy.js'
import { extractNameMentions } from './reflectionEngine.js'
import { detectMotifs, detectAtmosphericSignature, extractQuoteFragment } from './residueMemory.js'
import { classifySilence } from './emotionalGravity.js'
import { liveItems } from './live.js'

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
      return `Your annotations remain after the last page — a record of where the story's weight fell.`
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
    if (openCount > 2 && pct > 60)                return `${openCount} threads still open at this depth — they keep pulling as you read.`
    if (openCount === 2 && pct > 65)              return "Two threads remain. The novel may be conserving them for the end."
    if (openCount === 1 && pct > 65)              return "One question hasn't found its answer. That's a structural choice."
    if (openCount === 0 && totalMysteries > 3)    return "All threads resolved. The story has answered itself."
    return null
  }
  // observational
  if (openCount > 5)                              return `${openCount} threads are still in motion. This story withholds deliberately.`
  if (openCount > 2 && pct > 60)                 return "Several of the story's open questions are still circling — not converging yet."
  if (openCount === 2 && pct > 65)               return "Two threads still pulling. The novel may be saving something for the end."
  if (openCount === 1 && pct > 65)               return "One question opened early is still gaining weight."
  if (openCount === 0 && totalMysteries > 3)     return "All the threads have been tied. The story has answered itself."
  return null
}

// ── Lingering mystery lens ────────────────────────────────────────────────
// Fires when a visible, unresolved mystery has been open for many chapters.

function lingeringMysteryObs(mysteries, currentChapter, pct, style) {
  if (style === 'minimal' || pct < 30) return null
  const lingering = mysteries.filter(m => !m.resolved && m.chapter && (currentChapter - m.chapter) >= 10)
  if (!lingering.length) return null

  const primary  = lingering[0]
  const chapGap  = currentChapter - primary.chapter
  const mystRaw  = primary.text?.trim()
  const anchor   = mystRaw && mystRaw.length > 6
    ? (mystRaw.length > 44 ? `"${mystRaw.slice(0, 41).trim()}…"` : `"${mystRaw}"`)
    : null

  if (style === 'analytical') {
    if (lingering.length >= 2)
      return `${lingering.length} questions from the early chapters are still pulling. Their persistence is structural.`
    return anchor
      ? `${anchor} — first raised in chapter ${primary.chapter}, still unanswered ${chapGap} chapters on. The story hasn't forgotten it.`
      : `A question from chapter ${primary.chapter} is still circling — ${chapGap} chapters on. The story hasn't let it go.`
  }
  if (lingering.length >= 2)
    return `${lingering.length} threads from early in the story are still in motion. The novel keeps carrying them.`
  return anchor
    ? `${anchor} — opened in chapter ${primary.chapter}, still unresolved ${chapGap} chapters later.`
    : `A thread from chapter ${primary.chapter} is still widening — ${chapGap} chapters later. Something is being held back.`
}

// ── Theory acceleration lens ──────────────────────────────────────────────
// Fires when theory notes are increasing in the second half of reading.
// Signals interpretive momentum — the reader's mind is moving faster.

function theoryAccelerationObs(notes, style) {
  if (style === 'minimal' || notes.length < 5) return null
  const sorted = [...notes].sort((a, b) => new Date(a.date) - new Date(b.date))
  const mid = Math.floor(sorted.length / 2)
  const earlyTheory = sorted.slice(0, mid).filter(n => n.tag === 'theory').length
  const lateTheory  = sorted.slice(mid).filter(n => n.tag === 'theory').length
  if (lateTheory < earlyTheory + 2 || lateTheory < 2) return null
  if (style === 'analytical')
    return "Your theory rate has increased. The story has given the mind more to work with."
  return "Theories quickening. The story is at a point where it invites that."
}

// ── Widening suspicion lens ───────────────────────────────────────────────
// Fires when suspected mysteries are gaining age.
// Communicates active suspicion deepening, not just presence.

function wideningSuspicionObs(mysteries, currentChapter, style) {
  if (style === 'minimal') return null
  const suspected = mysteries.filter(m => !m.resolved && m.status === 'suspected' && m.chapter)
  if (!suspected.length) return null
  const oldest = [...suspected].sort((a, b) => (a.chapter || 0) - (b.chapter || 0))[0]
  const age = currentChapter - (oldest.chapter || 0)
  if (age < 5) return null
  if (suspected.length >= 2) {
    if (style === 'analytical')
      return `${suspected.length} threads in active suspicion — still circling toward answers.`
    return `${suspected.length} questions in this story are still narrowing. Something is getting closer.`
  }
  if (age >= 10) {
    if (style === 'analytical') return "A thread first suspected chapters ago is still gathering meaning."
    return "A suspicion that started early is still deepening. It hasn't peaked yet."
  }
  return null
}

// ── Mystery propulsion lens ───────────────────────────────────────────────
// Fires when a mix of evolving and suspected mysteries signals active narrative motion.
// Different from mysteryObs (count/depth) — this is about directional movement.

function mysteryPropulsionObs(mysteries, currentChapter, pct, style) {
  if (style === 'minimal' || pct < 25) return null
  const open     = mysteries.filter(m => !m.resolved)
  const evolving = open.filter(m => m.status === 'evolving')
  const suspectedActive = open.filter(m => m.status === 'suspected' && m.chapter && (currentChapter - m.chapter) >= 4)
  if (evolving.length >= 1 && suspectedActive.length >= 1) {
    if (style === 'analytical')
      return "Some threads are actively changing; others are circling toward resolution. The story is in motion."
    return "Some of the story's questions are still shifting. Others are beginning to converge."
  }
  if (evolving.length >= 2) {
    if (style === 'analytical') return `${evolving.length} threads are still actively evolving. The story hasn't settled them.`
    return `${evolving.length} questions keep reframing themselves. The story is still working on them.`
  }
  return null
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
    // Thresholds raised: needs 4+ theories or 3+ theme notes before surfacing
    if (theoryNotes.length >= 4)                      out.push("Your theories are accumulating. You've been reading ahead of the text.")
    else if (theoryNotes.length > 0 && themeNotes.length >= 2) out.push("You're tracking both story and argument simultaneously. That dual attention pays off.")
    else if (themeNotes.length >= 3)                  out.push("You've been reading thematically. That kind of attentiveness shifts what you notice.")
    if (confusedNotes.length >= 2)                    out.push("Several passages flagged as confusing — this story may be deliberate about what it withholds.")
    if (quoteNotes.length >= 4) {
      const qfrag = extractQuoteFragment(quoteNotes[0], 44)
      out.push(qfrag
        ? `You've been marking language — "${qfrag}" among it. This book is giving you sentences to carry.`
        : "You've been marking language. This book is giving you sentences to carry.")
    }
    if (important.length >= 3)                        out.push("Several chapters starred as pivotal. The pattern reveals where the story's weight actually falls.")
  } else {
    if (theoryNotes.length >= 4)                      out.push(`${theoryNotes.length} theories. That kind of reading usually finds what it's looking for.`)
    else if (theoryNotes.length > 0 && themeNotes.length >= 2) out.push("Reading both the story and what it means. Both at once.")
    else if (themeNotes.length >= 3)                  out.push("A thematic reading. That attention finds things a more surface pass would miss.")
    if (confusedNotes.length >= 2)                    out.push("Several passages flagged as confusing — this story may be deliberate in what it withholds.")
    if (quoteNotes.length >= 4) {
      const qfrag = extractQuoteFragment(quoteNotes[0], 44)
      out.push(qfrag
        ? `Lines being collected — "${qfrag}" among them. This book is giving you language to carry.`
        : "Lines being collected. This book is giving you language to carry.")
    }
    if (favoriteNotes.length >= 3 && pct < 60)        out.push("Several favourite moments already — and not yet halfway.")
    if (important.length >= 3)                        out.push("Several chapters starred as pivotal. The pattern shows where the story's weight falls.")
  }
  // "Parallel text" only surfaces at genuine annotation density
  if (notes.length >= 8) out.push("A parallel text is forming alongside the story.")
  return out
}

// ── Note pattern lens ─────────────────────────────────────────────────────
// Notices things readerObs doesn't cover: character-tag recurrence,
// and the "confused + theorizing" double signal.

function notePatternObs(notes, style) {
  if (style === 'minimal' || notes.length < 4) return null
  const charNotes     = notes.filter(n => n.tag === 'character')
  const theoryNotes   = notes.filter(n => n.tag === 'theory')
  const confusedNotes = notes.filter(n => n.tag === 'confusing')

  // Both theorizing and confused: a distinct reading state
  if (theoryNotes.length >= 2 && confusedNotes.length >= 2) {
    if (style === 'analytical')
      return "You're forming theories and flagging confusion simultaneously — that's what a deliberately ambiguous story produces."
    return "Theorising and unsettled at the same time. Some stories demand both at once."
  }

  // Extract a specific name from character notes for grounded language
  const charNames   = charNotes.length >= 2 ? extractNameMentions(charNotes.map(n => n.text)) : []
  const primaryName = charNames[0]

  // Recurring attention to characters — requires 3+ notes (raised from 2+)
  if (charNotes.length >= 3) {
    if (style === 'analytical')
      return primaryName
        ? `${charNotes.length} character notes — ${primaryName} appearing most. That focus tends to find the story's real argument.`
        : `${charNotes.length} notes about characters. The reading is character-centred — that focus tends to find the story's real argument.`
    return primaryName
      ? `Your attention keeps returning to ${primaryName}. Something about them is still unsettled.`
      : "Your attention keeps returning to the characters. They're carrying something."
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
  // Raised entrance gate: a single revision doesn't warrant surfacing
  if (total < 2) return null

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
      return `${withObservation.length} open threads have your current thinking attached. Layers are building.`
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
    return "These notes have been moving. The reading isn't settled — neither are they."
  if (reflectedNotes.length >= 2 && withObservation.length >= 2)
    return "Notes and threads both revisited. The understanding is still forming."
  if (withObservation.length >= 2)
    return "Thoughts added to the open threads as you read. They're being worked on."
  if (reflectedNotes.length >= 2)
    return "Second thoughts on earlier notes. The story is developing layers."
  if (theoriesRevised.length >= 1)
    return "One theory has shifted. The story pushed back."
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
    return "Twice in one day. The story pulled you back."
  }
  if (immersedCount >= 2) {
    if (style === 'analytical') return "Several recent sessions have been extended. The story has found its grip."
    return "This stretch has been holding you. The reading is deep."
  }
  if (briefReturn) {
    if (style === 'analytical') return "A shorter session after a sustained stretch — a natural rhythm."
    return "A brief return. The story is still here."
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
  return "You stopped near something that mattered."
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
  if (streak >= 7)          return `${streak} days running.`
  if (streak >= 4)          return `${streak} days back to back. Something is keeping you here.`
  if (streak >= 2)          return "Returning consistently. That's the thing that matters most."
  if (recent7 >= 4)         return "An absorbed stretch this week."
  if (gapDays != null && gapDays > 60 && sessions > 0) return "A long absence. The book is unchanged. You may not be."
  if (gapDays != null && gapDays > 30 && sessions > 0) return "Over a month away. It's still here."
  if (gapDays != null && gapDays > 14 && sessions > 0) return "About two weeks. The story is patient."
  if (gapDays != null && gapDays > 7  && sessions > 0) return "A week since you last opened this."
  return null
}

// ── Character ownership lens ──────────────────────────────────────────────
// Fires when the reader has shaped the cast themselves.

function characterOwnershipObs(allChars, style) {
  if (style === 'minimal') return null
  const userAdded = allChars.filter(c => c.userAdded)

  // Single-character observation removed — too minor to surface
  // Requires 2+ user-added characters before this becomes noteworthy
  if (userAdded.length < 2) return null

  if (style === 'analytical') {
    if (userAdded.length >= 3)
      return `${userAdded.length} characters added by you. The cast is becoming partly your own construction.`
    return "You've added characters to this companion. The cast is partly yours now."
  }
  if (userAdded.length >= 3)
    return `You've added ${userAdded.length} characters to this story. The companion is becoming yours.`
  return "You've introduced characters to this companion. They're part of the story as you're reading it."
}

// ── Recall lens — chronological interpretation shift ──────────────────────
// Fires when the reader's notes about a character show a clear arc:
// early confusion → later theory, or early sympathy → later suspicion.

function recallObs(notes, style) {
  if (style === 'minimal' || notes.length < 4) return null
  const sorted = [...notes].sort((a, b) => new Date(a.date) - new Date(b.date))
  const mid    = Math.floor(sorted.length / 2)
  const early  = sorted.slice(0, mid)
  const late   = sorted.slice(mid)

  // Confusing in early, theory in late → interpretation evolved
  const earlyConfused = early.filter(n => n.tag === 'confusing').length
  const lateTheory    = late.filter(n => n.tag === 'theory').length
  if (earlyConfused >= 2 && lateTheory >= 2) {
    if (style === 'analytical')
      return "Your earlier confusion has given way to interpretation. The story clarified something."
    return "You began writing questions. More recently, you've been writing explanations."
  }

  // Theory in early, theory still in late → sustained analytical attention
  const earlyTheory = early.filter(n => n.tag === 'theory').length
  if (earlyTheory >= 2 && lateTheory >= 2) {
    if (style === 'analytical')
      return "You've been theorising since the opening pages. That analytical thread hasn't let up."
    return "A thread of theory running through this whole reading, early to now."
  }

  return null
}

// ── Gravitation lens — character in both notes and mysteries ─────────────
// Fires when a character name appears in both theory notes AND open mystery threads.
// Signals interpretive gravity around a specific figure.

function gravitationObs(notes, mysteries, style) {
  if (style === 'minimal' || notes.length < 3) return null
  const theoryNotes = notes.filter(n => n.tag === 'theory' || n.tag === 'character')
  if (!theoryNotes.length || !mysteries.length) return null

  // Extract names from theory notes
  const nameCounts = {}
  theoryNotes.forEach(n => {
    const words = n.text.match(/\b[A-Z][a-z]{2,}\b/g) ?? []
    words.forEach(w => { nameCounts[w] = (nameCounts[w] || 0) + 1 })
  })

  // Check if any mystery thread text mentions those same names
  const mystText = mysteries.filter(m => !m.resolved).map(m => m.text).join(' ')
  const shared = Object.entries(nameCounts)
    .filter(([name, count]) => count >= 2 && mystText.includes(name))
    .map(([name]) => name)

  if (!shared.length) return null
  const name = shared[0]

  if (style === 'analytical')
    return `${name} appears in both your notes and open threads. They're the centre of gravity here.`
  return `${name} keeps appearing — in your notes and in the story's open questions. Something about them hasn't settled.`
}

// ── Haunted-thread lens — cross-surface note × mystery overlap ───────────
// Fires when the reader's notes share keyword overlap with open mystery threads.
// Signals that what the reader has been writing and what remains unresolved
// are becoming entangled — the interpretation is infecting the questions.

function hauntedThreadObs(notes, mysteries, style) {
  if (style === 'minimal' || notes.length < 2) return null
  const openMyst = mysteries.filter(m => !m.resolved)
  if (!openMyst.length) return null

  // Simple keyword overlap check (words > 4 chars, lowercased)
  function kw(text) {
    if (!text) return []
    return [...new Set(text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 4))]
  }
  function overlaps(textA, textB) {
    const wb = new Set(kw(textB))
    return kw(textA).some(w => wb.has(w))
  }

  const hauntedNotes = notes.filter(n => openMyst.some(m => overlaps(n.text, m.text)))
  if (!hauntedNotes.length) return null

  const revisedAndHaunted = hauntedNotes.filter(n => n.revisedAt)

  if (hauntedNotes.length >= 3) {
    if (style === 'analytical')
      return "Multiple notes are thematically connected to open threads. The questions and the reading are converging."
    return "Your notes and the open threads are starting to rhyme."
  }
  if (revisedAndHaunted.length >= 1) {
    if (style === 'analytical')
      return "A thought you've returned to is also tied to an open thread. The two are reinforcing each other."
    return "A thought you revised keeps appearing in the open questions. They're not separate anymore."
  }
  if (hauntedNotes.length >= 2) {
    if (style === 'analytical')
      return "Your reading notes and the open threads share subject matter. The concerns are entangled."
    return "The notes and the questions are circling the same ground."
  }
  return null
}

// ── Cross-chapter echo lens — early interpretation still alive late ───────
// Fires when theory notes from the first third of the reading share keyword
// overlap with theory notes from the final third.
// Signals an interpretive thread that has persisted — and keeps returning.

function crossChapterEchoObs(notes, currentChapter, style) {
  if (style === 'minimal') return null
  const theoryNotes = notes.filter(n => n.tag === 'theory' && n.chapter)
  if (theoryNotes.length < 3) return null

  const sorted = [...theoryNotes].sort((a, b) => (a.chapter || 0) - (b.chapter || 0))
  const early  = sorted.filter(n => n.chapter <= currentChapter * 0.35)
  const late   = sorted.filter(n => n.chapter >= currentChapter * 0.65)
  if (!early.length || !late.length) return null

  function kw(text) {
    if (!text) return []
    return [...new Set(text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w.length > 4))]
  }
  const earlyWords = new Set(early.flatMap(n => kw(n.text)))
  const hasEcho = late.some(n => kw(n.text).some(w => earlyWords.has(w)))
  if (!hasEcho) return null

  if (style === 'analytical')
    return "An interpretation from the opening pages is still relevant now. The reading has a persistent thread."
  return "An early observation, still active. It keeps returning in what you write."
}

// ── Dormant mystery lens — old unresolved thread resurfacing ─────────────
// Fires when a mystery has been open for 7+ chapters with no reader observation.
// Signals a thread the story hasn't closed — and the reader hasn't returned to.

function dormantMysteryObs(mysteries, currentChapter, pct, style) {
  if (style === 'minimal' || pct < 20) return null
  const dormant = mysteries.filter(m =>
    !m.resolved &&
    !m.observation &&
    m.chapter &&
    (currentChapter - m.chapter) >= 7
  )
  if (!dormant.length) return null

  if (style === 'analytical') {
    if (dormant.length >= 2)
      return `${dormant.length} early threads are still open — drifting, but unresolved.`
    return `A question from the early chapters hasn't been closed — or returned to.`
  }
  if (dormant.length >= 2)
    return `${dormant.length} early threads — still open, still unanswered.`
  return `An early question, still drifting. The story hasn't closed it.`
}

// ── Polarity reversal lens — character valence shifted from positive to negative ─
// Uses local word lists (lighter than importing reflectionEngine) to detect
// whether a character who attracted warm early notes is now attracting dark ones.

const POLAR_POS = ['trust', 'honest', 'kind', 'hero', 'brave', 'good', 'innocent', 'genuine', 'warm', 'care', 'love', 'protect', 'sympathy']
const POLAR_NEG = ['distrust', 'guilty', 'liar', 'cruel', 'villain', 'evil', 'false', 'manipulative', 'dangerous', 'betray', 'deceive', 'suspicious', 'wrong']

function polarityReversalObs(notes, style) {
  if (style === 'minimal' || notes.length < 4) return null

  const sorted = [...notes].sort((a, b) => new Date(a.date) - new Date(b.date))
  const mid   = Math.floor(sorted.length / 2)
  const early = sorted.slice(0, mid)
  const late  = sorted.slice(mid)

  // Extract proper names from all notes
  const nameSet = new Set()
  notes.forEach(n => {
    const words = n.text.match(/\b[A-Z][a-z]{2,}\b/g) ?? []
    words.forEach(w => nameSet.add(w))
  })

  for (const name of nameSet) {
    const earlyFor = early.filter(n => n.text.includes(name))
    const lateFor  = late.filter(n => n.text.includes(name))
    if (!earlyFor.length || !lateFor.length) continue

    const earlyText = earlyFor.map(n => n.text).join(' ').toLowerCase()
    const lateText  = lateFor.map(n => n.text).join(' ').toLowerCase()

    const earlyPos = POLAR_POS.filter(w => earlyText.includes(w)).length
    const earlyNeg = POLAR_NEG.filter(w => earlyText.includes(w)).length
    const latePos  = POLAR_POS.filter(w => lateText.includes(w)).length
    const lateNeg  = POLAR_NEG.filter(w => lateText.includes(w)).length

    // Clear reversal: early warm, late cold
    if (earlyPos >= 2 && earlyNeg <= 0 && lateNeg >= 2 && latePos <= earlyPos - 2) {
      if (style === 'analytical')
        return `Your early notes about ${name} carried sympathy. The recent ones don't quite hold that reading.`
      return `${name} looked different in your earlier notes. Something in the story has shifted that.`
    }

    // Clear reversal: early suspicious, late warmth
    if (earlyNeg >= 2 && earlyPos <= 0 && latePos >= 2 && lateNeg <= earlyNeg - 2) {
      if (style === 'analytical')
        return `You were suspicious of ${name} early on. More recently, that reading has softened.`
      return `${name} has become harder to dismiss. Your earlier suspicion keeps revising itself.`
    }
  }

  return null
}

// ── Collapsed certainty lens — revised theory = destabilised interpretation ───
// A theory that has been revised is a prior certainty that didn't hold.
// The reader was sure; the story pushed back.

function collapsedCertaintyObs(notes, style) {
  if (style === 'minimal') return null
  const collapsed = detectCollapsedCertainty(notes)
  if (!collapsed.length) return null

  if (collapsed.length >= 3) {
    if (style === 'analytical')
      return "Several of your theories have been revised — each one a certainty the story wouldn't hold."
    return "The story keeps refusing your earlier explanations. The reading is still open."
  }
  if (collapsed.length >= 2) {
    if (style === 'analytical')
      return "You've revised more than one theory. Each revision is an earlier reading that didn't survive the story."
    return "What you were certain about has changed shape more than once. The story is still working on you."
  }
  // exactly 1
  if (style === 'analytical')
    return "One of your theories has been revised. An earlier certainty didn't hold."
  return "Something you were sure of has been rewritten by the story. Your reading is still forming."
}

// ── Mystery morph lens — the question itself changed ─────────────────────────
// A mystery with `originalText` means the reader changed the phrasing.
// This is not an answer — the question mutated.

function mysteryMorphObs(mysteries, style) {
  if (style === 'minimal') return null
  const morphed = detectMysteryRefinements(mysteries)
  if (!morphed.length) return null

  if (morphed.length >= 2) {
    if (style === 'analytical')
      return `${morphed.length} of your mystery threads have been reframed — the questions themselves have changed shape.`
    return "Some of the questions you're carrying have changed. Not answered — transformed."
  }
  if (style === 'analytical')
    return "One of your open questions has been reframed. The mystery didn't resolve — it mutated."
  return "A question you opened has changed shape. The story didn't answer it — it made it stranger."
}

// ── Quote recontextualization lens — early capture, late echo ────────────────
// A quote the reader saved early is echoed by their recent theories.
// The capture aged into evidence.

function quoteEchoObs(notes, currentChapter, style) {
  if (style === 'minimal') return null
  const echoes = detectQuoteRecontextualization(notes, currentChapter)
  if (!echoes.length) return null

  if (style === 'analytical')
    return "A passage you captured early in the reading is echoing in your recent theories. What you noticed then has become relevant in a different way."
  return "Something you held onto early has started appearing in your recent thinking."
}

// ── Reader confidence arc lens ────────────────────────────────────────────────
// Tracks how interpretive certainty shifts across the reading.
// A building arc: the reader is growing more sure. A collapsing arc: earlier
// certainties are failing. Both are meaningful; neither is better.

function readerConfidenceObs(notes, style) {
  if (style === 'minimal' || notes.length < 5) return null
  const { arc } = detectConfidenceDrift(notes)
  if (!arc) return null

  if (arc === 'building') {
    if (style === 'analytical')
      return "The certainty in your notes has grown. The story is confirming, not just suggesting."
    return "Your interpretations have become more certain as the reading deepened. Something has settled."
  }
  if (arc === 'collapsing') {
    if (style === 'analytical')
      return "The confident readings from earlier in the book have become more tentative. The story is resisting."
    return "You wrote with more certainty earlier. Something in the story has unsettled that."
  }
  if (arc === 'oscillating') {
    if (style === 'analytical')
      return "Your notes oscillate between conviction and uncertainty throughout. The story hasn't resolved its ambiguity."
    return "Your reading keeps shifting between certainty and doubt. The story is holding its ambiguity."
  }
  return null
}

// ── Reader fixation lens ──────────────────────────────────────────────────────
// Fires when the reader keeps returning to the same word across many notes.
// Obsessive return is itself an emotional signal — a fixation the reading
// has created but not yet resolved.

function readerFixationObs(notes, style) {
  if (style === 'minimal' || notes.length < 6) return null
  const fixations = detectFixations(notes)
  if (!fixations.length) return null

  const top = fixations[0]
  const name = top.word

  if (style === 'analytical')
    return `The word "${name}" keeps appearing across your notes — in ${top.noteCount} different entries. That kind of repetition usually means something unresolved.`
  return `"${name}" keeps returning in what you write.`
}

// ── Reader cadence lens ───────────────────────────────────────────────────────
// Detects the emotional rhythm of note-writing:
// bursts signal absorption or urgency; quiet signals processing or withdrawal;
// fragmentation signals a reader being pulled in many directions at once.

function readerCadenceObs(notes, currentChapter, style) {
  if (style === 'minimal' || notes.length < 4) return null
  const { type, chapterSpan, noteCount } = detectBurstCadence(notes, currentChapter)
  if (!type) return null

  if (type === 'burst') {
    if (style === 'analytical')
      return `${noteCount} notes across ${chapterSpan} chapter${chapterSpan === 1 ? '' : 's'} — a concentrated burst. Something in this stretch has held you.`
    return "A burst of notes here. These chapters haven't let you move on."
  }
  if (type === 'quiet') {
    if (style === 'analytical')
      return "The note-writing has slowed considerably. Saturation or processing — hard to say which."
    return "Fewer thoughts written down lately. Something may be settling, or the story is moving faster than words."
  }
  if (type === 'fragmenting') {
    if (style === 'analytical')
      return "Notes thin across many chapters — brief catches, no sustained dwelling. The story may be outpacing interpretation."
    return "Brief catches, chapter after chapter. The reading is accelerating faster than interpretation."
  }
  return null
}

// ── Reader silence lens ───────────────────────────────────────────────────────
// Detects a significant gap — chapters the reader moved through without writing.
// Following a period of active engagement, sustained silence is often the
// most emotionally loaded response to what the story did.

function readerSilenceObs(notes, book, style) {
  if (style === 'minimal') return null
  const gap = detectSilenceGap(notes, book)
  if (!gap) return null

  const { afterChapter, gapLength } = gap

  if (style === 'analytical')
    return `After chapter ${afterChapter}, silence — ${gapLength} chapters without a note. Follows a stretch of active engagement. May be processing, not absence.`
  return `After chapter ${afterChapter}: ${gapLength} chapters, no notes. Not nothing.`
}

// ── Reader trajectory lens ────────────────────────────────────────────────────
// Tracks whether the reader's notes are getting longer or shorter over time.
// Lengthening: deepening absorption, increasingly layered interpretation.
// Shortening: fatigue, confident economy, or emotional withdrawal.

function readerTrajObs(notes, style) {
  if (style === 'minimal' || notes.length < 5) return null
  const { direction } = detectNoteLengthTrajectory(notes)
  if (direction === 'stable') return null

  if (direction === 'lengthening') {
    if (style === 'analytical')
      return "Your notes have grown longer as the reading progressed — more layered, more qualified. The story is asking more of you."
    return "Your notes are getting longer as you go deeper. The further in, the more this book opens up."
  }
  if (direction === 'shortening') {
    if (style === 'analytical')
      return "The notes have become shorter over time. That can mean confidence, or it can mean the story is outpacing reflection."
    return "Notes getting shorter. Certainty, or something heavier — hard to say which."
  }
  return null
}

// ── Orientation observations — steadying / re-entry / "you are here" ─────────
// Used exclusively by CompanionOrientation in ProgressTab.
// These are shorter, quieter, and more grounding than arc observations —
// they locate the reader in time and narrative position without interpretation.

const ORIENT_OBS = {
  observational: [
    "The story is waiting.",                                       // 0%
    "You're in the opening pages — everything is still arriving.",  // <12
    "Still in the early going. The story is finding its shape.",    // <25
    "A quarter in. The world of the book is taking hold.",          // <38
    "Approaching the centre, where the story's real question forms.", // <50
    "Near the middle — closer to the end than the beginning now.",  // <57
    "Past the halfway mark. The second half carries its own weight.", // <65
    "Deep into the second half. What was promised is being called upon.", // <78
    "The threads are converging. You're close.",                    // <90
    "You're near the last pages. The story is deciding what it means.", // <99
    "The last page has been turned.",                               // 100
  ],
  analytical: [
    "Not yet begun.",
    "Opening pages — the terms are being set.",
    "Early act. Premises are being established.",
    "First quarter. The architecture is becoming visible.",
    "Approaching the structural centre.",
    "Near the midpoint — the premises begin to complicate here.",
    "Past the axis. Operating now on what the first half built.",
    "Deep second half. Earlier choices are being honoured or exposed.",
    "Near the end. Convergence is underway.",
    "Final pages. The argument is being made.",
    "Finished.",
  ],
  minimal: [
    "Not yet begun.", "Opening.", "Early.", "First quarter.",
    "Midpoint.", "Near centre.", "Past the axis.", "Second half.",
    "Converging.", "Final pages.", "Finished.",
  ],
}

function orientArcObs(pct, style) {
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
  return (ORIENT_OBS[style] ?? ORIENT_OBS.observational)[idx]
}

function orientSessionLine(eraLog, pct, style) {
  if (style === 'minimal') return null
  const dates = [...new Set(logDates(eraLog))].sort()
  if (!dates.length) return null
  const totalDays = Math.floor((Date.now() - new Date(dates[0])) / 86400000)
  const gapDays   = Math.floor((Date.now() - new Date(dates[dates.length - 1])) / 86400000)

  if (gapDays > 30) return style === 'analytical'
    ? `Over a month since your last session.`
    : `A long time away. The story is unchanged.`
  if (gapDays > 14) return style === 'analytical'
    ? `${gapDays} days since you last opened this.`
    : `About two weeks since you were last here.`
  if (gapDays > 7) return style === 'analytical'
    ? `${gapDays} days since your last session.`
    : `A week away. The thread is still live.`
  if (totalDays >= 30 && dates.length >= 5) return style === 'analytical'
    ? `${dates.length} sessions across ${Math.round(totalDays / 7)} weeks.`
    : `You've been living with this story for ${Math.round(totalDays / 7)} weeks.`
  if (totalDays >= 14 && dates.length >= 3) return style === 'analytical'
    ? `${dates.length} sessions across about two weeks.`
    : `${dates.length} sessions over about two weeks.`
  return null
}

/**
 * Generates 1–2 short, steadying orientation lines for CompanionOrientation
 * in ProgressTab. These are distinct from generatePresence — quieter, more
 * grounding, present-tense. They orient rather than interpret.
 */
export function generateOrientationLines(book, settings = null) {
  const style   = settings?.insightStyle ?? 'observational'
  const pct     = getProgress(book)
  const currentEra = book.rereadCount || 0
  const eraLog  = (book.readingLog || []).filter(
    s => typeof s === 'object' && (s.rereadEra ?? 0) === currentEra
  )
  const primary   = orientArcObs(pct, style)
  const secondary = orientSessionLine(eraLog, pct, style)
  return [primary, secondary].filter(Boolean)
}

// ── Motif callback lens ───────────────────────────────────────────────────
// Fires when a concrete word recurs in 4+ notes — the companion names
// something the reader kept returning to without necessarily noticing.

function motifCallbackObs(notes, currentChapter, style) {
  if (style === 'minimal' || notes.length < 5) return null
  const motifs = detectMotifs(notes, currentChapter)
  if (!motifs.length) return null

  const top = motifs[0]
  if (top.count < 4) return null

  if (style === 'analytical')
    return `"${top.word}" appears in ${top.count} of your notes. That kind of recurrence tends to mean something.`
  return `"${top.word}" keeps returning in what you write. You may not have noticed — but it does.`
}

// ── Atmospheric memory lens ───────────────────────────────────────────────
// When a dominant atmosphere emerges from the language of notes, the
// companion names the emotional weather of the reading.

const ATMOS_OBS = {
  cold: {
    observational: "Something cold runs through this reading. Distance, numbness, removal — it keeps appearing in what you write.",
    analytical:    "A cold register runs through your notes. The book seems to operate at a remove.",
  },
  dread: {
    observational: "A current of dread beneath your notes. The reading has its shadow.",
    analytical:    "Something heavy keeps surfacing in what you write. This book carries weight.",
  },
  warmth: {
    observational: "There's a warmth running through your notes — brightness, closeness, something reaching you.",
    analytical:    "A warm register in the language of your notes. This story seems to be finding you.",
  },
  grief: {
    observational: "A thread of absence through your notes — loss, longing, what isn't there anymore.",
    analytical:    "Grief keeps appearing in what you write. The reading is holding it alongside you.",
  },
  strange: {
    observational: "Something unsettled runs through your notes. This book won't resolve into ordinary.",
    analytical:    "An uncanny quality in what you write. The book resists easy reading.",
  },
  tension: {
    observational: "Something taut in the language of your notes — urgency, sharpness, something held.",
    analytical:    "A tension running through what you write. The reading is moving fast underneath.",
  },
}

function atmosphericMemoryObs(notes, style) {
  if (style === 'minimal' || notes.length < 6) return null
  const sig = detectAtmosphericSignature(notes)
  if (!sig) return null
  const pool = ATMOS_OBS[sig.signature]
  if (!pool) return null
  return pool[style] ?? pool.observational
}

// ── Expressive silence lens ───────────────────────────────────────────────
// Silence is not uniform. A gap after destabilization feels different from
// a gap after smooth reading. The companion names the kind of quiet.

const SILENCE_TEXT = {
  dormant: {
    observational: ["The story has been waiting a long time. It hasn't changed. You may have.",
                    "A long absence. The book is exactly as you left it."],
    analytical:    ["Over a month of silence. The book is unchanged. The reading context is not.",
                    "Extended absence. Whatever the story was doing, it's been holding still."],
  },
  grieving: {
    observational: ["A long quiet after something shifted. The story changed the terms.",
                    "Something came apart in the reading, and then the silence came."],
    analytical:    ["Silence following a destabilization. Earlier certainties collapsed; the gap may be processing.",
                    "A reading pause after the story revised what you were certain of. That has weight."],
  },
  exhausted: {
    observational: ["After all that writing — a quiet. Something seems to have asked for space.",
                    "A silence after an absorbed stretch."],
    analytical:    ["Dense annotation followed by sustained quiet. The interpretation may still be running.",
                    "A burst of engagement, then stillness. That's often when reading keeps happening."],
  },
  'post-climax': {
    observational: ["Something in those chapters seems to have silenced you. That's not nothing.",
                    "The story got heavier and then you went quiet. Those two things are connected."],
    analytical:    ["Silence after a period of emotional peak engagement. That's often where the most accumulates.",
                    "A dense reading stretch followed by stillness. The story may have outpaced words."],
  },
  unresolved: {
    observational: ["The open questions are still here. Nothing resolved while you were away.",
                    "The threads are still pulling. The quiet doesn't close them."],
    analytical:    ["Active unresolved threads have been accumulating during the gap. They haven't cooled.",
                    "Open mysteries and live theories — the silence is carrying tension, not rest."],
  },
  peaceful: {
    observational: ["A quiet spell. The story is still here when you're ready.",
                    "Some time away. The book is patient."],
    analytical:    ["A reading pause without active tension. The story is at rest.",
                    "A quiet interval. Nothing pressing has been accumulating."],
  },
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function expressiveSilenceObs(book, style) {
  if (style === 'minimal') return null
  const silence = classifySilence(book)
  if (!silence) return null
  const pool = SILENCE_TEXT[silence.type]
  if (!pool) return null
  const arr = pool[style] ?? pool.observational
  return pick(arr)
}

// ── Ending residue lens ───────────────────────────────────────────────────
// Near the end of a book (≥85%), quietly resurfaces a specific mystery
// or early thread by name — companion memory rather than structural analysis.

function endingResidueObs(openMysteries, totalChapters, pct, style) {
  if (pct < 85 || pct >= 99) return null
  if (style === 'minimal') return null

  const earlyBoundary = totalChapters * 0.40
  const withText = openMysteries.filter(
    m => (m.text || '').trim().length > 6 && (m.chapter || 0) <= earlyBoundary
  ).sort((a, b) => (a.chapter || 0) - (b.chapter || 0))

  if (!withText.length) return null
  const m    = withText[0]
  const raw  = m.text.trim()
  const frag = raw.length > 46 ? raw.slice(0, 43).trim() + '…' : raw

  if (style === 'analytical')
    return `"${frag}" — still unresolved as this book approaches its end.`
  return `"${frag}" — still here, near the last pages.`
}

// ── Main export ───────────────────────────────────────────────────────────

export function generatePresence(book, settings = null) {
  // When the narrative should speak alone, yield entirely.
  if (shouldYieldToBook(book, settings)) return []

  const mode    = getEffectiveMode(book, settings)
  const style   = settings?.insightStyle ?? 'observational'
  const pct     = getProgress(book)
  const completed = book.chapters.filter(c => c.completed)
  const allMyst   = liveItems(book.mysteries)
  const openMyst  = allMyst.filter(m => !m.resolved && isMysteryVisible(book, m, mode))
  const important = completed.filter(c => c.important)
  const notes     = liveItems(book.notes)
  const main      = (book.characters?.main || []).filter(c => isCharacterSafe(book, c))
  const allChars  = [...(book.characters?.main || []), ...(book.characters?.secondary || [])]
  const log        = book.readingLog || []
  const currentEra = book.rereadCount || 0
  const eraLog     = log.filter(s => typeof s === 'object' && (s.rereadEra ?? 0) === currentEra)
  const streak     = calcStreak(eraLog)
  const sessions   = eraLog.length
  const recent7    = recentSessionCount(eraLog, 7)
  const lastDate   = [...logDates(eraLog)].sort().pop()
  const gapDays    = daysSince(lastDate)

  // Arc — always first; not competed for
  const arcText = arcObs(pct, style)

  // Atmosphere mode: companion breathes without commentary (arc only)
  if (shouldEnterAtmosphereMode(book, settings)) return [arcText].filter(Boolean)

  // ── Collect all candidates with emotional categories ─────────────────────
  // Each candidate: { text: string, category: string, weight?: number }
  // Weight overrides the SIGNAL_WEIGHTS default when provided.
  const cands = []

  function add(text, category, weight) {
    if (!text) return
    const entry = { text, category }
    if (weight !== undefined) entry.weight = weight
    cands.push(entry)
  }

  // Finished-book reflection
  add(finishedObs(pct, notes, important, style), 'finished_obs')

  // Mystery count
  add(mysteryObs(openMyst.length, allMyst.length, pct, style), 'mystery_count')

  // Lingering mysteries — open for 10+ chapters
  add(lingeringMysteryObs(openMyst, book.currentChapter, pct, style), 'lingering_mystery')

  // Mystery propulsion — evolving + suspected mix
  add(mysteryPropulsionObs(allMyst, book.currentChapter, pct, style), 'mystery_propulsion')

  // Widening suspicion — suspected mysteries gaining age
  add(wideningSuspicionObs(allMyst, book.currentChapter, style), 'widening_suspicion')

  // Character (deaths, allegiance shifts)
  if (main.length >= 3) {
    characterObs(main, style).forEach(o => add(o, 'character_obs'))
  }

  // Character ownership — user-shaped cast
  add(characterOwnershipObs(allChars, style), 'character_ownership')

  // Reader notes lens
  readerObs(notes, important, pct, style).forEach(o => add(o, 'reader_obs'))

  // Note pattern — character recurrence & confused+theory combo
  add(notePatternObs(notes, style), 'note_pattern')

  // Interpretation evolution — revised notes, reflections, refined mysteries
  add(interpretationObs(notes, allMyst, style), 'interpretation_evolution')

  // Session rhythm
  add(sessionRhythmObs(eraLog, style), 'session_rhythm')

  // Session stop — paused near a starred chapter
  add(sessionStopObs(eraLog, book.chapters || [], style), 'session_stop')

  // Pacing change
  add(pacingObs(eraLog, pct, style), 'pacing')

  // Momentum — weight scales with gap size so long absences surface prominently
  const mmtText = momentumObs(streak, recent7, gapDays, sessions, style)
  add(mmtText, 'momentum', momentumWeight(streak, gapDays))

  // Theory acceleration
  add(theoryAccelerationObs(notes, style), 'theory_acceleration')

  // Recall — chronological interpretation shift
  add(recallObs(notes, style), 'recall')

  // Cross-chapter echo — early theory still circling in late reading
  add(crossChapterEchoObs(notes, book.currentChapter || 0, style), 'cross_chapter_echo')

  // Gravitation — character in both notes and mysteries
  add(gravitationObs(notes, allMyst, style), 'gravitation')

  // Haunted thread — notes and open mystery threads overlap
  add(hauntedThreadObs(notes, allMyst, style), 'haunted_thread')

  // Polarity reversal — character valence flipped between early and late notes
  add(polarityReversalObs(notes, style), 'polarity_reversal')

  // Collapsed certainty — revised theory notes = destabilised interpretations
  add(collapsedCertaintyObs(notes, style), 'collapsed_certainty')

  // Mystery morph — the question itself changed
  add(mysteryMorphObs(allMyst, style), 'mystery_morph')

  // Quote echo — early capture echoed by recent theories
  add(quoteEchoObs(notes, book.currentChapter || 0, style), 'quote_echo')

  // Dormant mystery — old unresolved thread without reader observation
  add(dormantMysteryObs(openMyst, book.currentChapter, pct, style), 'dormant_mystery')

  // Reader confidence arc
  add(readerConfidenceObs(notes, style), 'reader_confidence')

  // Reader fixation — recurring word
  add(readerFixationObs(notes, style), 'reader_fixation')

  // Reader cadence — burst, quiet, fragmenting
  add(readerCadenceObs(notes, book.currentChapter || 0, style), 'reader_cadence')

  // Reader silence — significant gap after active engagement
  add(readerSilenceObs(notes, book, style), 'reader_silence')

  // Reader trajectory — notes lengthening or shortening
  add(readerTrajObs(notes, style), 'reader_trajectory')

  // Ending residue — specific mystery callback near the last pages
  add(endingResidueObs(openMyst, book.totalChapters || 0, pct, style), 'ending_residue')

  // Motif callback — recurring concrete word across 4+ notes
  add(motifCallbackObs(notes, book.currentChapter || 0, style), 'motif_callback')

  // Atmospheric memory — dominant emotional weather of the reading
  add(atmosphericMemoryObs(notes, style), 'atmospheric_memory')

  // Expressive silence — emotionally typed gap observation
  // Wired with elevated weight so it wins over generic momentum gap language
  add(expressiveSilenceObs(book, style), 'expressive_silence', 5.5)

  // ── Arbitration ────────────────────────────────────────────────────────────
  // The cap reserves position 0 for the arc observation.
  // arbitrateCandidates selects the top (cap - 1) most emotionally important
  // signals, applying domain deduplication and cross-domain suppression.
  const cap     = computeObservationCap(book, settings)
  const topObs  = arbitrateCandidates(cands, Math.max(0, cap - 1))
  return [arcText, ...topObs].filter(Boolean)
}

// ── Debug export ──────────────────────────────────────────────────────────────
// Companion signal audit for developer inspection.
// Returns presence output plus orchestration metrics — visibility, cap,
// silence state, atmosphere mode, narrative dominance, gravity pressure.
// Reader-invisible. Toggle via: localStorage.setItem('lantern_debug_companion','1')

// (All imports for debug are already declared at top of file — no re-import needed)

export function generatePresenceDebug(book, settings = null) {
  const style      = settings?.insightStyle ?? 'observational'
  const surfaced   = generatePresence(book, settings)
  const pct        = getProgress(book)
  const openMyst   = liveItems(book.mysteries).filter(m => !m.resolved)

  const visibility        = computePresenceVisibility(book, settings)
  const cap               = computeObservationCap(book, settings)
  const interruptionRisk  = computeInterruptionRisk(book)
  const narrativeDominance = computeNarrativeDominance(book, settings)
  const gravityPressure   = openMyst.length >= 6 ? 0.15 : openMyst.length >= 4 ? 0.08 : 0
  const { selfSustaining, signals: ssSignals } = detectSelfSustainingNarrative(book)
  const atmosphereMode    = shouldEnterAtmosphereMode(book, settings)
  const yieldsToBook      = shouldYieldToBook(book, settings)
  const solitudeProtected = isSolitudeProtected(book)

  return {
    // ── What surfaced ──────────────────────────────────────────────────────
    surfaced,
    surfacedCount: surfaced.length,

    // ── Orchestration scores ───────────────────────────────────────────────
    visibility:           +visibility.toFixed(3),
    effectiveVisibility:  +(Math.max(0, visibility - gravityPressure)).toFixed(3),
    cap,
    interruptionRisk:     +interruptionRisk.toFixed(3),
    narrativeDominance:   +narrativeDominance.toFixed(3),
    gravityPressure:      +gravityPressure.toFixed(3),

    // ── Mode flags ─────────────────────────────────────────────────────────
    atmosphereMode,
    yieldsToBook,
    solitudeProtected,
    selfSustaining,
    selfSustainingSignals: ssSignals,

    // ── Context ────────────────────────────────────────────────────────────
    pct:         +pct.toFixed(1),
    style,
    openMystCount: openMyst.length,
    noteCount:   liveItems(book.notes).length,
  }
}
