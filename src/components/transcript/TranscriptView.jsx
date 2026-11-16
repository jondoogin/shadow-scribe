import { useEffect, useMemo, useRef, useState } from 'react'
import { getSectionBlocks } from '../../content/contentRepository.js'
import { segmentBlocks } from '../../narration/segmenter.js'
import { buildTranscript } from '../../narration/transcript.js'
import { TranscriptConductor } from './TranscriptConductor.js'

function prefersReducedMotion() {
  try { return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false } catch { return false }
}

/** True when strict spoiler mode should keep this chapter's heading veiled until it is spoken. */
function veilHeadingFor(section, book) {
  const nums = section?.chapterNums || []
  return book?.spoilerMode === 'strict' && nums.length > 0 && Math.min(...nums) > (book?.currentChapter ?? 0)
}

/**
 * Follow-along transcript of the chapter being narrated (Phase 1: sentence level).
 * Renders the chapter once; TranscriptConductor moves the light and the scroll.
 */
export default function TranscriptView({ book, session, playerState, pb }) {
  const section = session?.sections?.[playerState?.sectionIndex]
  const isAudio = playerState?.kind === 'audio'
  const contentId = session?.contentId
  const [loaded, setLoaded] = useState({ key: null, blocks: null })
  const [following, setFollowing] = useState(true)
  const scrollerRef = useRef(null)
  const columnRef = useRef(null)
  const poolRef = useRef(null)
  const conductorRef = useRef(null)
  const reveal = !!pb.prefs.transcriptReveal

  // The book's own text for this chapter (never the package's copy: it keeps the book's formatting).
  const key = contentId && section ? `${contentId}/${section.id}` : null
  useEffect(() => {
    if (!key) return
    let cancelled = false
    getSectionBlocks(contentId, section.id)
      .then(b => { if (!cancelled) setLoaded({ key, blocks: b || null }) })
      .catch(() => { if (!cancelled) setLoaded({ key, blocks: null }) })
    return () => { cancelled = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const blocks = loaded.key === key ? loaded.blocks : null
  const missing = !contentId || (loaded.key === key && !loaded.blocks)

  // Audio: the package's timed segments. Device voice: the same segmentation the player speaks.
  const segments = useMemo(() => {
    if (!section || !blocks) return []
    return isAudio ? (section.segments || []) : segmentBlocks(blocks)
  }, [section, blocks, isAudio])

  const model = useMemo(() => buildTranscript(blocks || [], segments), [blocks, segments])

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
    c.setOptions({ reveal, veilHeading: veilHeadingFor(section, book) })
    c.setIndex(playerState?.segmentIndex ?? -1, { force: true })
    return () => { c.dispose(); conductorRef.current = null }
  }, [model]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    conductorRef.current?.setOptions({ reveal, veilHeading: veilHeadingFor(section, book) })
  }, [reveal, book?.spoilerMode, book?.currentChapter]) // eslint-disable-line react-hooks/exhaustive-deps

  // Audio follows the frame clock while playing; otherwise follow the player's own state.
  const status = playerState?.status
  useEffect(() => {
    const c = conductorRef.current
    if (!c) return
    if (isAudio && status === 'playing') { c.start(); return () => c.stop() }
    c.stop()
    c.setIndex(playerState?.segmentIndex ?? -1)
  }, [isAudio, status, playerState?.segmentIndex, model])

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
      <p className="listen-dim transcript-note">
        The text of this book isn’t on this device yet, so there’s nothing to follow along with. Link its EPUB below to see it.
      </p>
    )
  }

  return (
    <div className="transcript">
      <div ref={scrollerRef} className="transcript-scroller" tabIndex={0} aria-label="Book text, following the narration">
        <article key={section?.id} ref={columnRef} className="transcript-column transcript-enter" lang={session?.book?.language || 'en'} onClick={onTap}>
          <div ref={poolRef} className="transcript-pool" aria-hidden="true" data-visible="false" />
          {!blocks && <p className="listen-dim">Opening…</p>}
          {model.map(b => {
            if (b.type === 'break') return <hr key={b.id} className="reader-break" />
            const content = b.pieces.map((p, n) => p.seg == null
              ? <span key={n}>{p.text}</span>
              : <span key={n} className="ts-seg" data-seg={p.seg} data-state="ahead">{p.text}</span>)
            if (b.type === 'heading') return <h2 key={b.id}>{content}</h2>
            if (b.type === 'quote') return <blockquote key={b.id}>{content}</blockquote>
            return <p key={b.id}>{content}</p>
          })}
        </article>
      </div>
      {!following && (
        <button className="transcript-return" onClick={() => conductorRef.current?.resumeFollow()}>
          Back to narration
        </button>
      )}
      <div className="transcript-options">
        <label className="listen-check">
          <input type="checkbox" checked={reveal} onChange={e => pb.setPrefs({ transcriptReveal: e.target.checked })} />
          <span>Reveal as spoken</span>
        </label>
        <span className="listen-dim">Tap a sentence to listen from there</span>
      </div>
    </div>
  )
}
