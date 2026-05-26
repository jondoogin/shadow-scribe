import { useState, useMemo } from 'react'
import { Ico } from '../components/shared/icons.jsx'
import WeightedProgressBar from '../components/shared/WeightedProgressBar.jsx'
import SectionHeading from '../components/shared/SectionHeading.jsx'
import { getProgress } from '../utils/progress.js'
import { getChapterLabel, isSpecialChapter } from '../utils/chapterHelpers.js'
import { getChapterTitle, getEffectiveMode } from '../utils/spoiler.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { fmtDate } from '../utils/date.js'
import { generateOrientationLines } from '../utils/companionPresence.js'
import { noteHauntScore, hauntLevel } from '../utils/hauntScore.js'
import { detectChapterDestabilization } from '../utils/transformScore.js'
import { detectEmotionalLoading } from '../utils/readerState.js'
import { computeResonanceWeights } from '../utils/reflectionEngine.js'
import { computeChapterPatina, chapterPatinaStyle } from '../utils/literaryPatina.js'
import { buildGravityMap, detectSingularities, amplifyPatina } from '../utils/emotionalGravity.js'
import { detectMotifs } from '../utils/residueMemory.js'

// ── CompanionOrientation — steadying / re-entry / "you are here" ─────────────
// Shows above the progress block when there's reading context.
// Emotionally distinct from CompanionPresenceZone — quieter, more grounding.
// Does NOT source from cached reflections (those belong to the carousel above).
// Short, present-tense sentences. Locates the reader without interpretation.

function CompanionOrientation({ book, settings }) {
  const lines = useMemo(
    () => generateOrientationLines(book, settings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.currentChapter, book.readingLog?.length, settings.insightStyle]
  )

  const hasContext = (book.currentChapter > 0) || (book.notes?.length > 0)
  if (!lines.length || !hasContext) return null

  return (
    <div className="companion-orientation-block mb-6 animate-fade-in">
      <div className="flex items-start gap-2.5">
        <span className="text-[9px] mt-[5px] flex-shrink-0 opacity-50" style={{ color: 'var(--ca, #B8860B)' }}>✦</span>
        <div>
          <p className="font-serif italic leading-relaxed" style={{ fontSize: 13, color: 'var(--color-ink-500)' }}>{lines[0]}</p>
          {lines[1] && (
            <p className="leading-relaxed mt-1.5" style={{ fontSize: 11, color: 'var(--color-ink-300)' }}>{lines[1]}</p>
          )}
        </div>
      </div>
    </div>
  )
}

const DURATION_LABELS = {
  brief:    'A brief return',
  steady:   'A steady stretch',
  immersed: 'Pulled you in',
}

const SESSION_PAGE = 8

export default function ProgressTab({ book, onUpdateBook, onOpenUpdate }) {
  const { settings } = useSettings()
  const mode = getEffectiveMode(book, settings)
  const pct = getProgress(book)
  const [celebrating,   setCelebrating]   = useState(null)
  const [showAllSess,   setShowAllSess]   = useState(false)
  const [editingChNum,  setEditingChNum]  = useState(null)
  const [editingTitle,  setEditingTitle]  = useState('')

  // ── Chapter-note index — forward pull signals ────────────────────────────
  // Notes carry `chapter: book.currentChapter` from Session 60.
  // Used to show "N thoughts from this chapter" inline + forward-pull language.
  const notesByChapter = useMemo(() => {
    const map = {}
    for (const n of (book.notes || [])) {
      if (n.chapter) {
        if (!map[n.chapter]) map[n.chapter] = []
        map[n.chapter].push(n)
      }
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.notes?.length])

  // ── Chapter destabilization map — chapters where meaning was renegotiated ──
  const destabMap = useMemo(
    () => detectChapterDestabilization(book),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.notes?.length, book.mysteries?.length]
  )

  // ── Emotional loading — chapters of peak reader intensity ─────────────────
  // Returns the top chapter by emotional word density. Used to mark chapters
  // where the reader was most emotionally activated while writing.
  const emotionalPeakChapters = useMemo(() => {
    const loaded = detectEmotionalLoading(book.notes || [])
    const peak = loaded[0]
    if (!peak) return new Set()
    // Mark top chapter + any others within 80% of peak density
    return new Set(
      loaded.filter(l => l.density >= peak.density * 0.8).map(l => l.chapter)
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.notes?.length])

  // ── Chapter patina — accumulated warmth from reading history ──────────────
  // Computed once per note/mystery change. Used to apply subtle environmental
  // warmth to completed chapters — felt more than seen.
  const resonanceWeights = useMemo(
    () => computeResonanceWeights(book.notes || []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.notes?.length]
  )
  // ── Gravity map + singularities ────────────────────────────────────────────
  const motifs = useMemo(
    () => detectMotifs(book.notes || [], book.currentChapter || Infinity),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.notes?.length, book.currentChapter]
  )
  const gravityMap = useMemo(
    () => buildGravityMap(book, resonanceWeights, motifs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.notes?.length, book.mysteries?.length, motifs]
  )
  const singularities = useMemo(
    () => new Set(detectSingularities(book, resonanceWeights, motifs).map(s => s.num)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [book.notes?.length, book.mysteries?.length, motifs]
  )

  const chapterPatinaMap = useMemo(() => {
    const notes     = book.notes     || []
    const mysteries = book.mysteries || []
    const map = {}
    for (const ch of (book.chapters || [])) {
      if (ch.completed) {
        const rawPatina  = computeChapterPatina(
          ch.num, notes, mysteries, resonanceWeights,
          emotionalPeakChapters, ch.important || false
        )
        const gravity    = gravityMap[ch.num] ?? 0
        map[ch.num]      = amplifyPatina(rawPatina, gravity)
      }
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.notes?.length, book.mysteries?.length, emotionalPeakChapters, gravityMap])

  const startEditTitle = (e, ch) => {
    e.stopPropagation()
    setEditingChNum(ch.num)
    setEditingTitle(ch.title)
  }

  const saveTitle = (num) => {
    const t = editingTitle.trim()
    if (t) {
      onUpdateBook({ chapters: book.chapters.map(c => c.num === num ? { ...c, title: t } : c) })
    }
    setEditingChNum(null)
  }
  const isNew = pct === 0 && !(book.readingLog?.length)

  const label = book.format === 'audiobook' ? 'Part' : 'Chapter'

  // Normalise and reverse for display (most recent first)
  const sessions = [...(book.readingLog || [])]
    .filter(e => e && typeof e === 'object' && e.date)
    .reverse()

  const visibleSessions = showAllSess ? sessions : sessions.slice(0, SESSION_PAGE)

  const toggleChapter = num => {
    const ch = book.chapters.find(c => c.num === num)
    if (!ch) return
    const wasCompleted = ch.completed
    const updated = book.chapters.map(c => c.num === num ? { ...c, completed: !c.completed } : c)
    const newCurrent = !wasCompleted
      ? Math.max(...updated.filter(c => c.completed).map(c => c.num))
      : book.currentChapter
    onUpdateBook({ chapters:updated, currentChapter:newCurrent, lastUpdated:new Date().toISOString().split('T')[0] })
    if (!wasCompleted) { setCelebrating(num); setTimeout(() => setCelebrating(null), 700) }
  }

  return (
    <div className="max-w-2xl">
      {/* ── Companion orientation — re-entry warmth + continuity ── */}
      <CompanionOrientation book={book} settings={settings} />

      {/* ── Progress — editorial spine, no container ── */}
      <div className="mb-10">
        <div className="flex items-baseline gap-3 mb-3">
          <span
            className="font-serif tabular-nums"
            style={{ fontSize: 52, fontWeight: 300, color: 'var(--color-gold-accent)', letterSpacing: '-0.04em', lineHeight: 1 }}
          >
            {pct}
          </span>
          <span
            className="font-serif italic"
            style={{ fontSize: 18, color: 'var(--color-text-dim)', fontWeight: 300 }}
          >%</span>
          <span
            className="font-serif italic"
            style={{ fontSize: 13, color: 'var(--color-ink-400)' }}
          >
            — {book.chapters.filter(c => c.completed).length} of {book.totalChapters} {book.format === 'audiobook' ? 'parts' : 'chapters'}
          </span>
        </div>
        {/* Architectural spine — full-width manuscript rule */}
        <WeightedProgressBar book={book} height="h-px" />
        {/* Near-end ambient trace — companion noticing the weight shift */}
        {pct >= 85 && pct < 100 && (
          <p className="companion-echo mt-2" style={{ fontSize: 10 }}>
            The weight shifts toward the end.
          </p>
        )}
      </div>

      {isNew && (
        <div className="mb-8 pb-6 border-b border-ink-100 animate-fade-in">
          <p className="font-serif italic text-[14px] text-ink-500 leading-relaxed mb-3">
            The companion is open. Mark chapters as you read — notes, mysteries, and characters gather here over time.
          </p>
          {onOpenUpdate && (
            <button onClick={onOpenUpdate}
              className="text-[12px] italic transition-opacity hover:opacity-75"
              style={{ color:'var(--color-gold-accent)' }}>
              Log your first session →
            </button>
          )}
        </div>
      )}

      {/* ── Extraction warning (AI fallback or parse issues) ── */}
      {book.extractionMeta?.aiFailedFallback && !book.extractionMeta?.warningsDismissed && (
        <div className="rounded-xl border border-sienna-pale bg-sienna-bg p-4 mb-6 flex items-start gap-3 animate-fade-in">
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-sienna font-medium leading-relaxed">
              Claude wasn't available during import — characters and summaries were extracted using a simpler approach.
              You can add characters and notes manually as you read.
            </p>
          </div>
          <button
            onClick={() => onUpdateBook({ extractionMeta: { ...book.extractionMeta, warningsDismissed: true } })}
            className="flex-shrink-0 text-sienna/60 hover:text-sienna transition-colors mt-0.5"
            aria-label="Dismiss">
            <Ico.X />
          </button>
        </div>
      )}

      <SectionHeading>chapters</SectionHeading>
      <div className="space-y-2 mb-16">
        {book.chapters.map(ch => {
          const isCurrent    = ch.num === book.currentChapter && !ch.completed
          const isNext       = ch.num === book.currentChapter + 1 && !ch.completed
          const isSingularity = singularities.has(ch.num)
          // Important chapters breathe more — they deserve more space
          // Completed chapters settle slightly — they've been lived through
          // Current chapter breathes dramatically; completed chapters compress; upcoming is neutral
          const chPy = isCurrent                                        ? 'py-4'
                     : isNext                                           ? 'py-3'
                     : ch.completed && (ch.important || isSingularity) ? 'py-2'
                     : ch.completed                                     ? 'py-1.5'
                     : ch.important || isSingularity                   ? 'py-3.5'
                     :                                                    'py-2.5'
          // Current chapter draws a breath before it; singularity chapters carry silence around them
          const chapterMargin = isCurrent
            ? { marginTop: 16, marginBottom: 4 }
            : (isSingularity && ch.completed)
            ? { marginTop: 10, marginBottom: 8 }
            : {}
          return (
            <div
              key={ch.num}
              onClick={() => editingChNum !== ch.num && toggleChapter(ch.num)}
              className={`group flex items-center gap-3 px-4 ${chPy} rounded-xl cursor-pointer transition-all select-none ${
                ch.completed ? 'border border-ink-100'
                : isCurrent  ? 'border'
                : 'border border-ink-100 hover:border-ink-200'
              } ${celebrating === ch.num ? 'animate-celebrate' : ''}`}
              style={
                ch.completed
                  ? { ...chapterPatinaStyle(chapterPatinaMap[ch.num] ?? 0, ch.completed), background: 'transparent', ...chapterMargin }
                  : isCurrent && !ch.completed
                  ? { background:'var(--ca-bg, #FDF8EC)', borderColor:'var(--ca-border, #E8D090)', ...chapterMargin }
                  : { ...chapterMargin }
              }
            >
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
                  ch.completed ? 'border-ink-300' : isCurrent ? 'border-2' : 'border-2 border-ink-300'
                }`}
                style={
                  ch.completed
                    ? { borderColor: 'var(--color-gold-accent)', opacity: singularities.has(ch.num) ? 0.75 : 0.55 }
                    : isCurrent && !ch.completed
                    ? { borderColor: 'var(--ca, #B8860B)' }
                    : {}
                }
              >
                {ch.completed && (
                  <span style={{ fontSize: 8, color: 'var(--color-gold-accent)', opacity: 0.8 }}>✦</span>
                )}
                {isCurrent && !ch.completed && <span className="w-2 h-2 rounded-full block" style={{ background:'var(--ca, #B8860B)' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                  <span
                    style={{
                      fontSize:    ch.completed ? 10 : isCurrent ? 11 : 10,
                      fontWeight:  isCurrent ? 600 : 500,
                      letterSpacing: '0.04em',
                      color: isCurrent && !ch.completed
                        ? 'var(--ca, #B8860B)'
                        : ch.completed
                        ? 'var(--color-ink-200)'
                        : isSpecialChapter(ch)
                        ? 'var(--color-ink-500)'
                        : 'var(--color-ink-400)',
                    }}
                  >
                    {getChapterLabel(ch, book.format)}
                  </span>
                  {isNext    && <span className="text-[10px] text-ink-300 italic">next</span>}
                  {isCurrent && (
                    <span className="text-[10px] italic" style={{ color:'var(--ca, #B8860B)', opacity: 0.75 }}>
                      here
                    </span>
                  )}
                  {ch.important && <span className="text-gold text-[11px] leading-none">★</span>}
                </div>
                {editingChNum === ch.num ? (
                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={() => saveTitle(ch.num)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveTitle(ch.num)
                      if (e.key === 'Escape') setEditingChNum(null)
                    }}
                    onClick={e => e.stopPropagation()}
                    className="w-full text-[13px] font-medium text-ink-800 bg-transparent border-b border-ink-300 outline-none py-0.5"
                  />
                ) : (
                  <p
                    className="truncate"
                    style={{
                      fontFamily:  isCurrent ? 'var(--font-serif)' : 'var(--font-sans)',
                      fontSize:    isCurrent ? 15 : ch.completed ? 12 : isNext ? 13 : 13,
                      fontWeight:  isCurrent ? 500 : 400,
                      color: isCurrent
                        ? 'var(--color-ink-900)'
                        : ch.completed
                        ? 'var(--color-ink-300)'
                        : isNext
                        ? 'var(--color-ink-600)'
                        : 'var(--color-ink-500)',
                    }}
                  >
                    {getChapterTitle(book, ch, mode)}
                  </p>
                )}
                {/* Forward-pull note signal — chapters carry their reading residue */}
                {/* Haunted notes (cross-surface, revised, aged) elevate the line + warm the color */}
                {ch.completed && (() => {
                  const chNotes  = notesByChapter[ch.num] || []
                  const destab   = destabMap[ch.num]
                  const isPeak   = emotionalPeakChapters.has(ch.num)
                  if (!chNotes.length && !destab && !isPeak) return null
                  const hasTheory = chNotes.some(n => n.tag === 'theory')
                  const hasConf   = chNotes.some(n => n.tag === 'confusing')
                  const count     = chNotes.length
                  const maxHaunt  = chNotes.length ? Math.max(...chNotes.map(n => noteHauntScore(n, book))) : 0
                  const hl        = hauntLevel(maxHaunt)
                  const haunted   = hl === 'haunted' || hl === 'persistent'

                  // Destabilization — meaning renegotiated here
                  const hasDestab = destab && (destab.collapsedTheories >= 1 || destab.hasRefinedMystery)

                  const line = hasDestab
                    ? (destab.collapsedTheories >= 1 && destab.hasRefinedMystery)
                      ? 'What this chapter meant has kept changing.'
                      : destab.collapsedTheories >= 1
                      ? 'A certainty formed here later came apart.'
                      : 'A question opened here was reframed.'
                    : haunted || (ch.important && count >= 2)
                    ? 'Still shaping what comes after.'
                    : isPeak && count >= 1
                    ? 'Your writing intensified here.'
                    : hasTheory && count >= 2
                    ? 'A theory formed here.'
                    : hasConf
                    ? `${count === 1 ? 'A question' : `${count} questions`} opened here.`
                    : count === 1
                    ? 'One thought from here.'
                    : count > 1
                    ? `${count} thoughts from here.`
                    : null

                  if (!line) return null
                  const isSingularity = singularities.has(ch.num)
                  return (
                    <p
                      className={`text-[10px] italic mt-0.5 truncate ${
                        hasDestab ? 'text-ink-400' : haunted || isPeak || isSingularity ? 'text-ink-400' : 'text-ink-300'
                      }`}
                      style={isSingularity ? { color: 'rgba(184, 134, 11, 0.70)' } : undefined}
                    >
                      {line}
                    </p>
                  )
                })()}
              </div>
              {celebrating === ch.num
                ? <span className="confetti-dot text-base">✨</span>
                : (
                  <button
                    onClick={e => startEditTitle(e, ch)}
                    className="flex-shrink-0 text-ink-200 hover:text-ink-400 transition-colors opacity-0 group-hover:opacity-100 ml-1"
                    aria-label="Rename chapter"
                  >
                    <Ico.Edit />
                  </button>
                )
              }
            </div>
          )
        })}
      </div>

      {/* ── Session history ── */}
      {sessions.length > 0 && (
        <>
          <SectionHeading>visits</SectionHeading>
          <div className="mb-6">
            {visibleSessions.map((s, i) => {
              const chRange = (s.startChapter === 0 && s.endChapter === 0)
                ? null  // migrated entry — no chapter data
                : s.startChapter === s.endChapter
                  ? `${label} ${s.endChapter}`
                  : `${label} ${s.startChapter + 1}–${s.endChapter}`
              // Temporal aging — older visits settle progressively into silence
              const sessionAge = s.date ? Math.floor((Date.now() - new Date(s.date)) / 86400000) : 0
              const sessionOpacity = sessionAge > 90 ? 0.28
                : sessionAge > 60 ? 0.42
                : sessionAge > 30 ? 0.65
                : 1
              const aged = sessionAge > 30
              const deepAged = sessionAge > 60
              return (
                <div key={s.id || i}
                  className="session-row flex items-start gap-4 py-2.5"
                  style={{ opacity: sessionOpacity, transition: 'opacity 0.2s ease' }}
                >
                  <span
                    className="w-20 flex-shrink-0 pt-0.5 tabular-nums"
                    style={{
                      fontSize: deepAged ? 10 : 11,
                      color: deepAged ? 'var(--color-ink-200)' : aged ? 'var(--color-ink-300)' : 'var(--color-ink-400)',
                    }}
                  >
                    {fmtDate(s.date)}
                  </span>
                  <div className="flex-1 min-w-0">
                    {chRange && (
                      <span style={{
                        fontSize: deepAged ? 11 : 12,
                        color: deepAged ? 'var(--color-ink-300)' : aged ? 'var(--color-ink-400)' : 'var(--color-ink-700)',
                      }}>{chRange}</span>
                    )}
                    {s.durationEstimate && (
                      <span
                        className="italic"
                        style={{ fontSize: deepAged ? 10 : 11, color: 'var(--color-ink-400)', marginLeft: chRange ? 8 : 0 }}
                      >
                        {DURATION_LABELS[s.durationEstimate]}
                      </span>
                    )}
                    {!chRange && !s.durationEstimate && (
                      <span style={{ fontSize: deepAged ? 11 : 12, color: 'var(--color-ink-400)', fontStyle: 'italic' }}>a visit</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {sessions.length > SESSION_PAGE && (
            <button
              onClick={() => setShowAllSess(v => !v)}
              className="text-[11px] text-ink-400 italic hover:text-ink-600 transition-colors mb-8">
              {showAllSess ? 'show fewer' : `show all ${sessions.length} visits`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
