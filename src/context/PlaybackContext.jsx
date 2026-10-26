import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { GeneratedAudioPlayer, SpeechNarrationPlayer, listSpeechVoices } from '../narration/players.js'
import { segmentBlocks } from '../narration/segmenter.js'
import { createSleepTimer } from '../narration/sleepTimer.js'
import {
  loadListenState, saveListenState, bookRecord, withBookRecord, latestLocator, findSegmentIndex,
} from '../narration/listenState.js'
import { AmbientEngine } from '../atmosphere/ambientEngine.js'
import { getAudiobook, getAudioBlob, getContentMeta, getSectionBlocks, listAudiobooks } from '../content/contentRepository.js'

// ── One listening session for the whole app ──────────────────────────────────
// Owns the single narration player and the single ambience engine so route
// changes never spawn duplicates. Pages (Listen, Reader, mini-player) only
// talk to this context.

const PlaybackContext = createContext(null)

const SAVE_DEBOUNCE_MS = 1500

export function PlaybackProvider({ children }) {
  const [listenState, setListenState] = useState(loadListenState)
  const stateRef = useRef(listenState)
  useEffect(() => { stateRef.current = listenState }, [listenState])

  const [session, setSession] = useState(null)       // { book, contentId, source, sections, audiobook }
  const [player, setPlayer] = useState(null)
  const [playerState, setPlayerState] = useState(null)
  const [ambient, setAmbient] = useState({ trackId: null, playing: false, volume: listenState.prefs.ambientVolume, ducked: false })
  const [sleep, setSleep] = useState({ mode: 'off', remainingMs: null })
  const [error, setError] = useState(null)

  const playerRef = useRef(null)
  const sessionRef = useRef(null)
  const segCache = useRef(new Map())
  const openSeq = useRef(0) // only the latest openSession call may install its player
  const ambientRef = useRef(null)

  const updateListen = useCallback((fn) => {
    setListenState(prev => {
      const next = fn(prev)
      saveListenState(next)
      stateRef.current = next
      return next
    })
  }, [])

  const getAmbient = useCallback(() => {
    if (!ambientRef.current) {
      ambientRef.current = new AmbientEngine()
      ambientRef.current.setVolume(stateRef.current.prefs.ambientVolume)
      ambientRef.current.setDuckEnabled(stateRef.current.prefs.duck)
      ambientRef.current.subscribe(setAmbient)
    }
    return ambientRef.current
  }, [])

  // ── Sleep timer ─────────────────────────────────────────────────────────
  const timerRef = useRef(null)
  useEffect(() => {
    const t = createSleepTimer({
      onFire: () => {
        const p = playerRef.current
        p?.stopAtNextBoundary()
        // Hard stop if no sentence boundary arrives soon (e.g. a long final line).
        setTimeout(() => { if (playerRef.current === p && p?.state.status === 'playing') p.pause() }, 30_000)
        ambientRef.current?.fadeOut(6000)
        setSleep(t.state())
      },
    })
    timerRef.current = t
    const tick = () => { t.check(); setSleep(t.state()) }
    const id = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick) }
  }, [])

  // ── Position persistence ────────────────────────────────────────────────
  const savePosition = useCallback((ps = playerRef.current?.state) => {
    const s = sessionRef.current
    if (!s || !ps?.sectionId) return
    updateListen(st => withBookRecord(st, s.book.id, {
      listen: {
        sectionId: ps.sectionId,
        blockId: ps.blockId,
        segmentId: ps.segmentId,
        time: ps.kind === 'audio' ? ps.time : null,
        source: s.source,
        updatedAt: new Date().toISOString(),
      },
    }))
  }, [updateListen])

  useEffect(() => {
    if (!playerState?.sectionId) return
    const t = setTimeout(() => savePosition(playerState), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [playerState?.sectionId, playerState?.segmentId, savePosition]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') savePosition() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', savePosition)
    return () => { document.removeEventListener('visibilitychange', onHide); window.removeEventListener('pagehide', savePosition) }
  }, [savePosition])

  // Ambience follows narration: duck while speaking.
  useEffect(() => {
    ambientRef.current?.setDucked(playerState?.status === 'playing')
  }, [playerState?.status])

  // ── Session lifecycle ───────────────────────────────────────────────────
  const teardown = useCallback(() => {
    savePosition()
    playerRef.current?.dispose()
    playerRef.current = null
    setPlayer(null)
    setPlayerState(null)
  }, [savePosition])

  /**
   * Prepare narration for a book. Does not start playback (autoplay rules).
   * @param book       companion record (needs id, title, author, contentId)
   * @param opts.source  { type: 'audio', audiobookId } | { type: 'speech', voiceURI } | undefined (auto)
   * @param opts.at      { sectionId, blockId, time? } to start from (default: latest saved locator)
   */
  const openSession = useCallback(async (book, { source, at } = {}) => {
    const seq = ++openSeq.current
    const stale = () => seq !== openSeq.current
    setError(null)
    const contentId = book.contentId || null
    const record = bookRecord(stateRef.current, book.id)
    const audiobooks = contentId ? await listAudiobooks(contentId) : []
    let chosen = source || record.listen?.source || null
    if (chosen?.type === 'audio' && !audiobooks.find(a => a.id === chosen.audiobookId)) chosen = null
    if (!chosen) chosen = audiobooks[0] ? { type: 'audio', audiobookId: audiobooks[0].id } : { type: 'speech' }

    const same = sessionRef.current && sessionRef.current.book.id === book.id &&
      JSON.stringify(sessionRef.current.source) === JSON.stringify(chosen)
    if (same && playerRef.current && !at) return sessionRef.current
    if (stale()) return sessionRef.current

    const rate = stateRef.current.prefs.rate
    let p, sections, audiobook = null
    if (chosen.type === 'audio') {
      audiobook = await getAudiobook(chosen.audiobookId)
      if (stale()) return sessionRef.current
      sections = audiobook.manifest.sections
    } else {
      const meta = contentId ? await getContentMeta(contentId) : null
      if (stale()) return sessionRef.current
      if (!meta) {
        teardown()
        setError('This book has no text on this device yet. Link its EPUB to listen.')
        sessionRef.current = { book, contentId, source: chosen, sections: [], audiobook: null }
        setSession(sessionRef.current)
        return sessionRef.current
      }
      sections = meta.sections.filter(s => s.narrate)
      const loadSegments = async i => {
        const s = sections[i]
        if (!segCache.current.has(s.id)) segCache.current.set(s.id, segmentBlocks(await getSectionBlocks(contentId, s.id) || []))
        return segCache.current.get(s.id)
      }
      const voices = await listSpeechVoices()
      if (stale()) return sessionRef.current
      const voice = voices.find(v => v.voiceURI === chosen.voiceURI) || null
      p = new SpeechNarrationPlayer({ sections, loadSegments, voice })
      p.segmentsFor = loadSegments
    }
    // Everything below is synchronous until p.load(), so no other open can interleave.
    teardown()
    segCache.current.clear()
    if (chosen.type === 'audio') {
      p = new GeneratedAudioPlayer({ sections, getBlob: s => getAudioBlob(audiobook.id, s.id) })
      p.setVolume(stateRef.current.prefs.narrationVolume)
    }
    p.setRate(rate)
    p.onSectionEnded = () => timerRef.current?.chapterEnded()
    p.onBoundaryPause = () => savePosition()
    p.subscribe(setPlayerState)
    playerRef.current = p
    setPlayer(p)

    const s = { book, contentId, source: chosen, sections, audiobook }
    sessionRef.current = s
    setSession(s)

    // Resume from the latest locator (Reader or Listen), else the first section.
    const loc = at || latestLocator(record)
    let si = loc ? sections.findIndex(x => x.id === loc.sectionId) : -1
    if (si < 0) si = 0
    if (sections.length) {
      if (p.kind === 'audio') {
        const sameAudio = !at && loc === record.listen && record.listen?.source?.audiobookId === chosen.audiobookId && loc.time != null
        const segs = sections[si].segments || []
        const t = sameAudio ? loc.time : (segs[findSegmentIndex(segs, loc?.blockId)]?.t0 ?? 0)
        await p.load(si, t)
      } else {
        const segs = await p.segmentsFor(si)
        await p.load(si, findSegmentIndex(segs, loc?.blockId))
      }
    }
    return s
  }, [teardown, savePosition])

  const closeSession = useCallback(() => {
    teardown()
    ambientRef.current?.stop()
    sessionRef.current = null
    setSession(null)
  }, [teardown])

  // ── Controls ────────────────────────────────────────────────────────────
  const controls = useMemo(() => ({
    play: () => playerRef.current?.play(),
    pause: () => { playerRef.current?.pause(); savePosition() },
    toggle: () => {
      const p = playerRef.current
      if (!p) return
      if (p.state.status === 'playing') { p.pause(); savePosition() } else p.play()
    },
    skip: (amount) => playerRef.current?.skip(amount),
    seek: (v) => playerRef.current?.seek(v),
    next: () => playerRef.current?.nextSection(),
    prev: () => playerRef.current?.prevSection(),
    goTo: async (sectionIndex, blockId, opts) => {
      const p = playerRef.current
      if (!p) return
      const segs = p.kind === 'audio' ? p.sections[sectionIndex]?.segments || [] : await p.segmentsFor(sectionIndex)
      await p.goTo(sectionIndex, findSegmentIndex(segs, blockId), opts)
    },
    setRate: (rate) => {
      playerRef.current?.setRate(rate)
      updateListen(st => ({ ...st, prefs: { ...st.prefs, rate } }))
    },
    setNarrationVolume: (v) => {
      playerRef.current?.setVolume(v)
      updateListen(st => ({ ...st, prefs: { ...st.prefs, narrationVolume: v } }))
    },
    setAmbientTrack: async (trackId) => {
      const eng = getAmbient()
      try {
        if (trackId) await eng.play(trackId)
        else eng.stop()
        updateListen(st => ({ ...st, prefs: { ...st.prefs, ambientTrack: trackId } }))
      } catch (err) {
        setError(err?.message || 'Ambience could not start.')
      }
    },
    setAmbientVolume: (v) => {
      getAmbient().setVolume(v)
      updateListen(st => ({ ...st, prefs: { ...st.prefs, ambientVolume: v } }))
    },
    setDuck: (on) => {
      getAmbient().setDuckEnabled(on)
      if (on) ambientRef.current.setDucked(playerRef.current?.state.status === 'playing')
      updateListen(st => ({ ...st, prefs: { ...st.prefs, duck: on } }))
    },
    setSleep: (optionId) => {
      timerRef.current?.set(optionId)
      if (timerRef.current) setSleep(timerRef.current.state())
    },
    saveReadPosition: (bookId, locator) => {
      updateListen(st => withBookRecord(st, bookId, { read: { ...locator, updatedAt: new Date().toISOString() } }))
    },
  }), [getAmbient, savePosition, updateListen])

  // ── Media Session (lock screen / headphone controls where supported) ──────
  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null
    if (!ms || !session || !playerState) return
    const section = session.sections[playerState.sectionIndex]
    try {
      ms.metadata = new window.MediaMetadata({
        title: section?.title || session.book.title,
        artist: session.book.author || '',
        album: session.book.title,
        artwork: session.book.coverData ? [{ src: session.book.coverData, sizes: '300x450', type: 'image/jpeg' }] : [],
      })
      ms.playbackState = playerState.status === 'playing' ? 'playing' : 'paused'
    } catch { /* partial support */ }
  }, [session, playerState?.sectionIndex, playerState?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : null
    if (!ms || !player) return
    const audio = player.kind === 'audio'
    const handlers = {
      play: () => controls.play(),
      pause: () => controls.pause(),
      seekbackward: () => controls.skip(audio ? -15 : -1),
      seekforward: () => controls.skip(audio ? 15 : 1),
      previoustrack: () => controls.prev(),
      nexttrack: () => controls.next(),
      seekto: audio ? (d) => controls.seek(d.seekTime) : null,
    }
    for (const [k, fn] of Object.entries(handlers)) { try { ms.setActionHandler(k, fn) } catch { /* unsupported action */ } }
    return () => { for (const k of Object.keys(handlers)) { try { ms.setActionHandler(k, null) } catch { /* ignore */ } } }
  }, [player, controls])

  useEffect(() => () => { playerRef.current?.dispose(); ambientRef.current?.dispose() }, [])

  const value = {
    session, playerState, ambient, sleep, error, clearError: () => setError(null),
    prefs: listenState.prefs, listenState, openSession, closeSession, ...controls,
  }
  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayback() {
  const ctx = useContext(PlaybackContext)
  if (!ctx) throw new Error('usePlayback must be used inside PlaybackProvider')
  return ctx
}
