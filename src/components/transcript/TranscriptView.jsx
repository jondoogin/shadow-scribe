import { useEffect, useMemo, useRef, useState } from 'react'
import { getSectionBlocks, getWordTimings } from '../../content/contentRepository.js'
import { segmentBlocks } from '../../narration/segmenter.js'
import { segmentWords, spokenOrdinalAt, spokenToDisplay } from '../../narration/words.js'
import { buildTranscript, splitWords } from '../../narration/transcript.js'
import { TranscriptConductor } from './TranscriptConductor.js'

function prefersReducedMotion() {
  try { return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false } catch { return false }
}

/** True when strict spoiler mode should keep this chapter's heading veiled until it is spoken. */
function veilHeadingFor(section, book) {
  const nums = section?.chapterNums || []
  return book?.spoilerMode === 'strict' && nums.length > 0 && Math.min(...nums) > (book?.currentChapter ?? 0)
}

/** A sentence, split into its measured words when the narrator timed them. */
function Sentence({ piece, timings }) {
  if (!timings) return piece.text
  return splitWords(piece.text, piece.start, timings).map((r, n) => r.w == null
    ? r.text
    : <span key={n} className="ts-w" data-t0={r.t0} data-t1={r.t1}>{r.text}</span>)
}

/**
 * Follow-along transcript of the chapter being narrated.
 * Renders the chapter once; TranscriptConductor moves the light, the words and the scroll.
 */
export default function TranscriptView({ book, session, playerState, pb }) {
  const section = session?.sections?.[playerState?.sectionIndex]
  const isAudio = playerState?.kind === 'audio'
  const contentId = session?.contentId
  const [loaded, setLoaded] = useState({ key: null, blocks: null, words: null })
  const [following, setFollowing] = useState(true)
  const [heardWords, setHeardWords] = useState(false) // the device voice reports word boundaries
  const scrollerRef = useRef(null)
  const columnRef = useRef(null)
  const poolRef = useRef(null)
  const conductorRef = useRef(null)
  const reveal = !!pb.prefs.transcriptReveal
  const wordLevel = pb.prefs.transcriptWords !== false
  const audiobookId = isAudio ? session?.audiobook?.id : null

  // The book's own text for this chapter (never the package's copy: it keeps the book's formatting).
  // Word timings come only from the narrator's measurements (never estimated).
  const key = contentId && section ? `${contentId}/${section.id}/${audiobookId || 'speech'}` : null
  useEffect(() => {
    if (!key) return
    let cancelled = false
    Promise.all([
      getSectionBlocks(contentId, section.id),
      audiobookId ? getWordTimings(audiobookId, section.id).catch(() => null) : null,
    ])
      .then(([b, w]) => { if (!cancelled) setLoaded({ key, blocks: b || null, words: w || null }) })
      .catch(() => { if (!cancelled) setLoaded({ key, blocks: null, words: null }) })
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const blocks = loaded.key === key ? loaded.blocks : null
  const words = loaded.key === key ? loaded.words : null
  const missing = !contentId || (loaded.key === key && !loaded.blocks)

  // Audio: the package's timed segments. Device voice: the same segmentation the player speaks.
  const segments = useMemo(() => {
    if (!section || !blocks) return []
    return isAudio ? (section.segments || []) : segmentBlocks(blocks)
  }, [section, blocks, isAudio])

  const model = useMemo(() => buildTranscript(blocks || [], segments), [blocks, segments])

  // Device voice: every sentence's words, to light from the engine's boundary events.
  const speechWords = useMemo(() => {
    if (isAudio || !blocks) return null
    const text = new Map(blocks.map(b => [b.id, b.text]))
    return segments.map(g => {
      const ws = segmentWords(text.get(g.blockId) || '', g.start, g.end, g.kind === 'heading' ? 'heading' : 'sentence')
      return { spans: ws.map(w => [w.s, w.e]), map: spokenToDisplay(ws) }
    })
  }, [isAudio, blocks, segments])

  const headings = useMemo(() => {
    const set = new Set()
    for (const b of model) if (b.type === 'heading') for (const p of b.pieces) if (p.seg != null) set.add(p.seg)
    return set
  }, [model])

  // One conductor per rendered chapter.
  useEffect(() => {
    if (!blocks || !columnRef.current) return
    const c = new TranscriptConductor({
      scroller: scrollerRef.current,
      column: columnRef.current,
      pool: poolRef.current,
      segments,
      headings,
      getTime: isAudio ? pb.mediaTime : null,
      onFollowChange: setFollowing,
      reducedMotion: prefersReducedMotion(),
      win: window,
    })
    conductorRef.current = c
    setFollowing(true)
    c.setOptions({ reveal, veilHeading: veilHeadingFor(section, book), words: wordLevel })
    c.setIndex(playerState?.segmentIndex ?? -1, { force: true })
    c.syncWords()
    return () => { c.dispose(); conductorRef.current = null }
  }, [model, words]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAudio || !speechWords) return
    return pb.onWords((i, charIndex) => {
      const c = conductorRef.current
      const sw = speechWords[i]
      if (!c || !sw || !segments[i]) return
      setHeardWords(true)
      const k = sw.map[spokenOrdinalAt(segments[i].spoken, charIndex)]
      if (k == null) return
      c.setIndex(i)
      c.setWordIndex(k)
    })
  }, [isAudio, speechWords, session]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const c = conductorRef.current
    c?.setOptions({ reveal, veilHeading: veilHeadingFor(section, book), words: wordLevel })
    c?.syncWords()
  }, [reveal, wordLevel, book?.spoilerMode, book?.currentChapter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Audio follows the frame clock while playing; otherwise follow the player's own state.
  const status = playerState?.status
  useEffect(() => {
    const c = conductorRef.current
    if (!c) return
    if (isAudio && status === 'playing') { c.start(); return () => c.stop() }
    c.stop()
    c.setIndex(playerState?.segmentIndex ?? -1)
    c.syncWords()
  }, [isAudio, status, playerState?.segmentIndex, playerState?.time, model, words])

  const onTap = (e) => {
    const el = e.target.closest?.('[data-seg]')
    if (!el || playerState?.sectionIndex == null) return
    const sel = globalThis.getSelection?.()
    if (sel && String(sel).length > 0) return // selecting text, not asking to jump
    pb.goToSegment(playerState.sectionIndex, Number(el.dataset.seg), { autoplay: true })
    conductorRef.current?.resumeFollow()
  }

  if (missing) {
    return (
      <p className="c2-text-note">
        This book’s text isn’t on this device yet. Link its EPUB below to follow along.
      </p>
    )
  }

  return (
    <div className="c2-text">
      <div ref={scrollerRef} className="c2-text-scroller" tabIndex={0}
        aria-label="Book text. Tap a sentence to listen from there.">
        <article key={section?.id} ref={columnRef} className="c2-text-col c2-text-enter" lang={session?.book?.language || 'en'} onClick={onTap}>
          <div ref={poolRef} className="c2-text-pool" aria-hidden="true" data-visible="false" />
          {!blocks && <p className="c2-dim">Opening…</p>}
          {model.map(b => {
            if (b.type === 'break') return <hr key={b.id} className="c2-break" />
            const content = b.pieces.map((p, n) => p.seg == null
              ? <span key={n}>{p.text}</span>
              : <span key={n} className="ts-seg" data-seg={p.seg} data-state="ahead">
                  <Sentence piece={p} timings={isAudio ? words?.[segments[p.seg]?.id] : speechWords?.[p.seg]?.spans} />
                </span>)
            if (b.type === 'heading') return <h2 key={b.id}>{content}</h2>
            if (b.type === 'quote') return <blockquote key={b.id}>{content}</blockquote>
            return <p key={b.id}>{content}</p>
          })}
        </article>
      </div>
      {!following && (
        <button type="button" className="c2-text-return" onClick={() => conductorRef.current?.resumeFollow()}>
          Back to narration
        </button>
      )}
      <div className="c2-text-foot">
        {(words || heardWords) && (
          <label className="c2-check">
            <input type="checkbox" checked={wordLevel} onChange={e => pb.setPrefs({ transcriptWords: e.target.checked })} />
            <span>Word by word</span>
          </label>
        )}
        <label className="c2-check">
          <input type="checkbox" checked={reveal} onChange={e => pb.setPrefs({ transcriptReveal: e.target.checked })} />
          <span>Reveal as spoken</span>
        </label>
      </div>
    </div>
  )
}
