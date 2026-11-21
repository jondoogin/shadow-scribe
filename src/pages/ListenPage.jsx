import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useBooks } from '../context/BooksContext.jsx'
import { usePlayback } from '../context/PlaybackContext.jsx'
import { useBookContent } from '../hooks/useBookContent.js'
import { Ico } from '../components/shared/icons.jsx'
import LinkEpub from '../components/listen/LinkEpub.jsx'
import AddFiles from '../components/listen/AddFiles.jsx'
import AssetPickers from '../components/listen/AssetPickers.jsx'
import Theatre from '../components/listen/Theatre.jsx'
import { useBookAssets } from '../library/useBookAssets.js'
import { AUTO_FETCH_BYTES, preferredOption, pickDeviceVoices } from '../library/bookAssets.js'
import { callNumber, Holes, LitLabel, Mark, Tabs } from '../catalogue/parts.jsx'
import TranscriptView from '../components/transcript/TranscriptView.jsx'
import ChapterUpdateModal from '../components/modals/ChapterUpdateModal.jsx'
import { AMBIENT_CATALOG } from '../atmosphere/ambientEngine.js'
import { SLEEP_OPTIONS } from '../narration/sleepTimer.js'
import { listSpeechVoices } from '../narration/players.js'
import { buildNarrationScript, scriptStats } from '../narration/narrationScript.js'
import { getFullContent, deleteAudiobook, deleteVisualSet, getContentMeta, getSectionBlocks, storageEstimate } from '../content/contentRepository.js'
import { segmentBlocks } from '../narration/segmenter.js'
import { sectionLabel, sectionNumber, chapterReached, formatClock, formatDuration, formatBytes } from '../narration/sectionLabels.js'
import { bookRecord, latestLocator, visualPrefs } from '../narration/listenState.js'
import { useBookVisuals } from '../atmosphere/visual/useBookVisuals.js'
import { ListenPlate, PaintingsPanel, usePlate } from '../atmosphere/visual/Paintings.jsx'

const RATES = [0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2]

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function ListenPage() {
  const { bookId } = useParams()
  const { books, updateBook } = useBooks()
  const book = books.find(b => b.id === bookId)
  const pb = usePlayback()
  const { meta, audiobooks, loading, reload, error: storeError } = useBookContent(book)
  const [voices, setVoices] = useState([])
  const [showChapters, setShowChapters] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)
  const [exportNote, setExportNote] = useState(null)
  const [storage, setStorage] = useState(null)
  const record = bookRecord(pb.listenState, bookId)
  const vPrefs = visualPrefs(record)
  const visuals = useBookVisuals(book, meta, vPrefs.setId)
  const [pinned, setPinned] = useState(null)
  const [theatre, setTheatre] = useState(false)

  const onUpdateBook = useCallback(changes => updateBook(bookId, changes), [updateBook, bookId])
  const reloadVisuals = visuals.reload
  const onAssetsChanged = useCallback(() => { reload(); reloadVisuals() }, [reload, reloadVisuals])
  const assets = useBookAssets(book, { onUpdateBook, onChanged: onAssetsChanged })

  useEffect(() => {
    if (book?.title) document.title = `Listen · ${book.title} — Lantern`
  }, [book?.title])

  useEffect(() => {
    listSpeechVoices().then(vs => setVoices(pickDeviceVoices(vs)))
  }, [])

  // Narration audio is large; show how much this device holds (refreshes when narrations change).
  useEffect(() => {
    storageEstimate().then(setStorage)
  }, [audiobooks.length])

  // Open (or reuse) the session once storage has loaded.
  const sessionForThisBook = pb.session?.book.id === bookId
  useEffect(() => {
    if (!book || loading || sessionForThisBook) return
    if (!meta && !audiobooks.length) return
    pb.openSession(book).catch(err => console.warn('[lantern] listen session failed', err))
  }, [book?.id, book?.contentId, loading, meta, audiobooks.length, sessionForThisBook]) // eslint-disable-line react-hooks/exhaustive-deps

  const ps = sessionForThisBook ? pb.playerState : null
  const sections = sessionForThisBook ? pb.session.sections : []
  const section = ps ? sections[ps.sectionIndex] : null
  const isAudio = ps?.kind === 'audio'
  const view = pb.prefs.listenView === 'text' ? 'text' : 'now'

  // Paintings follow the spoken position; before playback starts, the saved one.
  const saved = latestLocator(record)
  const position = useMemo(() => (ps?.sectionId
    ? { sectionId: ps.sectionId, blockId: ps.blockId, segmentId: ps.segmentId }
    : saved ? { sectionId: saved.sectionId, blockId: saved.blockId, segmentId: saved.segmentId } : null
  ), [ps?.sectionId, ps?.blockId, ps?.segmentId, saved?.sectionId, saved?.blockId, saved?.segmentId]) // eslint-disable-line react-hooks/exhaustive-deps
  const showPlate = !!visuals.set && vPrefs.mode !== 'off'
  const plate = usePlate({ visuals, position, enabled: showPlate, pinned })

  const caption = useMemo(() => {
    if (!ps || !section) return null
    // Before the first sentence starts (chapter lead-in) show what is about to be read.
    if (isAudio) return section.segments?.[Math.max(ps.segmentIndex, 0)]?.text || null
    return null
  }, [ps, section, isAudio])

  const [speechCaption, setSpeechCaption] = useState(null)
  useEffect(() => {
    if (!ps || isAudio || !pb.session) return
    let cancelled = false
    const p = pb.session
    ;(async () => {
      const contentSection = p.sections[ps.sectionIndex]
      if (!contentSection) return
      const segs = segmentBlocks(await getSectionBlocks(p.contentId, contentSection.id) || [])
      if (!cancelled) setSpeechCaption(segs[ps.segmentIndex]?.text || null)
    })()
    return () => { cancelled = true }
  }, [ps?.sectionIndex, ps?.segmentIndex, isAudio]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Seamless start: bring the book, its narrator and its paintings down ──
  // from the library without being asked. Each step runs once per book; a
  // large narration (over AUTO_FETCH_BYTES) waits for the reader to pick it.
  const autoDone = useRef({})
  useEffect(() => {
    if (!book || loading || !assets.ready || assets.status || assets.error) return
    const done = autoDone.current[bookId] || (autoDone.current[bookId] = {})
    const src = record.prefs?.source || record.listen?.source || null
    ;(async () => {
      if (!meta && assets.epubs.size && !done.text) {
        done.text = true
        await assets.bringText()
        return
      }
      if (!assets.narrators.some(o => o.onDevice) && !done.audio && src?.type !== 'speech') {
        done.audio = true
        const want = preferredOption(assets.narrators, src?.audiobookId)
        if (want && want.bytes <= AUTO_FETCH_BYTES) {
          const r = await assets.bring(want)
          if (r) {
            pb.setBookPrefs(bookId, { source: { type: 'audio', audiobookId: r.id } })
            await pb.openSession({ ...book, contentId: r.contentId }, { source: { type: 'audio', audiobookId: r.id } }).catch(() => {})
          }
        }
        return
      }
      if (vPrefs.mode !== 'off' && !visuals.loading && !visuals.set && !done.paintings && assets.paintings.length) {
        done.paintings = true
        const want = preferredOption(assets.paintings, vPrefs.setId)
        const r = want && await assets.bring(want)
        if (r) pb.setBookVisuals(bookId, { setId: r.id })
      }
    })()
  }, [bookId, loading, meta, assets.ready, assets.status, assets.error, assets.narrators, assets.paintings, assets.epubs, visuals.loading, visuals.set, vPrefs.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!book) return <Navigate to="/library" replace />

  const currentSource = pb.session?.source
  const reachedChapter = section ? chapterReached(section, book) : null
  const playing = ps?.status === 'playing'
  const busy = ps?.status === 'loading'

  const at = ps?.sectionId ? { sectionId: ps.sectionId, blockId: ps.blockId } : undefined
  const chooseSource = async (source, forBook = book) => {
    pb.setBookPrefs(bookId, { source })
    await pb.openSession(forBook, { source, at })
  }

  // Narrator dropdown: an option id, or 'speech' for the device voice.
  const narratorValue = currentSource?.type === 'audio' ? currentSource.audiobookId
    : currentSource?.type === 'speech' ? 'speech'
      : record.prefs?.source?.type === 'speech' ? 'speech' : record.prefs?.source?.audiobookId || null
  const onNarrator = async (value) => {
    if (value === 'speech') return chooseSource({ type: 'speech' })
    const opt = assets.narrators.find(o => o.id === value)
    if (!opt) return
    const r = await assets.bring(opt)
    if (!r) return
    await chooseSource({ type: 'audio', audiobookId: r.id }, { ...book, contentId: (await getContentMeta(r.contentId)) ? r.contentId : book.contentId })
  }

  // Paintings dropdown: a set id, or 'off'.
  const paintingsValue = vPrefs.mode === 'off' ? 'off' : visuals.set?.id || vPrefs.setId || 'off'
  const onPaintings = async (value) => {
    if (value === 'off') return pb.setBookVisuals(bookId, { mode: 'off' })
    const opt = assets.paintings.find(o => o.id === value)
    if (!opt) return
    const r = await assets.bring(opt)
    if (r) pb.setBookVisuals(bookId, { setId: r.id, mode: vPrefs.mode === 'off' ? 'listen' : vPrefs.mode })
  }

  const removePaintings = async () => {
    if (!visuals.set || !window.confirm('Remove these paintings from this device? They stay in your library.')) return
    await deleteVisualSet(visuals.set.id)
    onAssetsChanged()
    assets.refresh()
  }

  const exportScript = async () => {
    const content = await getFullContent(book.contentId)
    if (!content) return
    const script = buildNarrationScript(content)
    const st = scriptStats(script)
    const slug = (book.title || 'book').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    downloadJson(script, `${slug}.narration.json`)
    setExportNote(`${st.narratedSections} sections · about ${formatDuration(st.estimatedSeconds)} of speech (estimate). On your Mac: lantern-narrate generate ${slug}.narration.json`)
  }

  const removeNarration = async (id) => {
    if (!window.confirm('Remove this narration from this device? It stays in your library.')) return
    if (currentSource?.audiobookId === id) pb.closeSession()
    await deleteAudiobook(id)
    reload()
    assets.refresh()
  }

  const remaining = isAudio && ps ? Math.max(0, ps.duration - ps.time) : 0
  const pct = !ps ? 0 : isAudio
    ? (ps.duration ? (ps.time / ps.duration) * 100 : 0)
    : (ps.duration ? ((Math.max(0, ps.segmentIndex) + 1) / ps.duration) * 100 : 0)
  const voiceName = currentSource?.type === 'audio'
    ? assets.narrators.find(o => o.id === currentSource.audiobookId)?.label || 'Narration'
    : currentSource?.type === 'speech' ? 'Device voice' : null
  const line = (isAudio ? caption : speechCaption) || null
  const pickers = (
    <AssetPickers assets={assets} hasText={!!meta}
      narratorValue={narratorValue} onNarrator={onNarrator}
      paintingsValue={paintingsValue} onPaintings={onPaintings}
      deviceVoices={voices} deviceVoiceURI={currentSource?.voiceURI}
      onDeviceVoice={uri => chooseSource({ type: 'speech', voiceURI: uri })} />
  )
  const sleepMin = pb.sleep.mode === 'minutes' ? Math.ceil((pb.sleep.remainingMs || 0) / 60000) : 0
  const wickOn = pb.sleep.mode === 'minutes' ? (SLEEP_OPTIONS.find(o => o.minutes && o.minutes >= sleepMin)?.id || '60') : pb.sleep.mode
  const wickPct = pb.sleep.mode === 'minutes' ? Math.min(100, ((pb.sleep.remainingMs || 0) / 3_600_000) * 100) : pb.sleep.mode === 'chapter' ? 100 : 0

  return (
    <div className="cat c2 listen-page">
      <header className="c2-top">
        <div><Link to={`/book/${bookId}`} className="c2-ic" aria-label={`Back to ${book.title}`}><Ico.Left /></Link></div>
        <div className="c2-top-c">{voiceName && <span className="c2-label">Listening · {voiceName}</span>}</div>
        <div className="c2-top-r">
          {ps && <button type="button" className="c2-ic" onClick={() => setShowChapters(v => !v)} aria-expanded={showChapters} aria-label={`Chapters (${sections.length})`}><Ico.Menu /></button>}
        </div>
      </header>

      {storeError && <p role="alert" className="c2-fine" style={{ color: 'var(--color-ember)' }}>{storeError}</p>}
      {pb.error && sessionForThisBook && (
        <p role="alert" className="c2-fine" style={{ color: 'var(--color-ember)' }}>
          {pb.error} <button type="button" className="c2-link" onClick={pb.clearError}>Dismiss</button>
        </p>
      )}

      {!loading && !meta && !audiobooks.length && (
        <article className="c2-card">
          <div className="c2-card-head"><span className="c2-call">{callNumber(book)}</span><span className="c2-label">Listen</span></div>
          <h1 className="c2-title">{book.title}</h1>
          <p className="c2-by">{book.author}</p>
          {assets.status || (assets.epubs.size > 0 && !assets.error) ? (
            <p role="status" className="c2-fine" style={{ marginTop: 16 }}>{assets.status || 'Getting the book from your library…'}</p>
          ) : assets.narrators.length > 0 ? (
            <div style={{ marginTop: 16 }}>{pickers}</div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <LinkEpub book={book} onUpdateBook={onUpdateBook} onLinked={onAssetsChanged} />
              {assets.libraryStatus !== 'unlocked' && assets.libraryStatus !== 'disabled' && pickers}
            </div>
          )}
        </article>
      )}

      {/* ── Now playing: the loan slip ── */}
      {ps && section && (
        <>
          <section className="c3-box c2-listen-box">
          <Tabs label="Listen view" items={[['now', 'Now playing'], ['text', 'Text']]} value={view}
            onChange={v => pb.setPrefs({ listenView: v })} />
          {view === 'text' ? (
            <TranscriptView book={book} session={pb.session} playerState={ps} pb={pb} />
          ) : (
          <article className={`c2-card c2-card--slip${showPlate ? ' has-plate' : ''}`} aria-label="Now playing">
            {showPlate && <ListenPlate plate={plate} motion={vPrefs.motion} playing={playing} total={visuals.images.length} onOpen={() => setTheatre(true)} />}
            <div className="c2-card-head">
              <span className="c2-call">{callNumber(book)} · {sectionNumber(section, ps.sectionIndex)}</span>
              <LitLabel lit={playing}>{sectionLabel(section, ps.sectionIndex, book)}</LitLabel>
            </div>
            <p className="c2-time">{isAudio ? formatClock(ps.time) : `${Math.max(0, ps.segmentIndex) + 1}/${ps.duration || '—'}`}</p>
            <p className="c2-by">
              {book.title} · {isAudio ? `${formatClock(remaining)} left` : 'sentences read aloud'}
            </p>
            <div className="c2-scrub">
              <Holes pct={pct} />
              {isAudio ? (
                <input type="range" min={0} max={Math.max(1, ps.duration)} step={0.5} value={Math.min(ps.time, ps.duration || 0)}
                  onChange={e => pb.seek(Number(e.target.value))} aria-label="Position in chapter" />
              ) : (
                <input type="range" min={0} max={Math.max(0, ps.duration - 1)} step={1} value={Math.max(0, ps.segmentIndex)}
                  onChange={e => pb.seek(Number(e.target.value))} aria-label="Sentence in chapter" />
              )}
            </div>
            <div className="c2-dates">
              <span>{sectionLabel(section, ps.sectionIndex, book)}</span>
              <span>{isAudio ? formatClock(ps.duration) : 'Device voice'}</span>
            </div>
          </article>
          )}
          </section>

          <div className="c2-keys">
            <button type="button" className="c2-key-sm" aria-label="Previous chapter" onClick={pb.prev}><Ico.SkipBack /></button>
            <button type="button" aria-label={isAudio ? 'Back 15 seconds' : 'Previous sentence'} onClick={() => pb.skip(isAudio ? -15 : -1)}>{isAudio ? '−15' : '−1'}</button>
            <button type="button" className="c2-key-go" aria-label={playing ? 'Pause' : 'Play'} onClick={pb.toggle} disabled={busy}>
              {playing ? <Ico.Pause /> : <Ico.Play />}
            </button>
            <button type="button" aria-label={isAudio ? 'Forward 15 seconds' : 'Next sentence'} onClick={() => pb.skip(isAudio ? 15 : 1)}>{isAudio ? '+15' : '+1'}</button>
            <button type="button" className="c2-key-sm" aria-label="Next chapter" onClick={pb.next}><Ico.SkipFwd /></button>
          </div>

          <div className="c2-opts">
            <label className="c2-btn">
              <span className="sr-only">Speed</span>
              <select value={pb.prefs.rate} onChange={e => pb.setRate(Number(e.target.value))} aria-label="Speed">
                {RATES.map(r => <option key={r} value={r}>{r}×</option>)}
              </select>
            </label>
            <button type="button" className="c2-btn" onClick={() => setShowChapters(v => !v)} aria-expanded={showChapters}>Chapters</button>
            <Link className="c2-btn" to={`/book/${bookId}/read`}>Read along</Link>
          </div>

          {pickers}

          {showChapters && (
            <section className="c3-box" aria-label="Chapters" style={{ marginTop: 18 }}>
              <header className="c3-box-head"><h2>Chapters</h2><span className="c2-label">{sections.length}</span></header>
              <ol className="c2-drawer">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <button type="button" className={`c2-row${i === ps.sectionIndex ? ' is-on' : ''}`}
                      onClick={() => { pb.goTo(i, null, { autoplay: playing }); setShowChapters(false) }}>
                      <span className="c2-call">{String(i + 1).padStart(2, '0')}</span>
                      <span className="c2-row-t"><b>{sectionLabel(s, i, book)}</b></span>
                      <span className="c2-row-s">{s.durationSec ? formatDuration(s.durationSec) : ''}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {reachedChapter && (
            <div className="c2-card c2-seal-row" style={{ marginTop: 18, borderTop: 0 }}>
              <span className="c2-stamp">Unseal<small>ch. {reachedChapter}</small></span>
              <p>
                You’re listening to chapter {reachedChapter}; your companion is still at chapter {book.currentChapter || 0}.{' '}
                <button type="button" className="c2-link" style={{ color: 'var(--red-ink)' }} onClick={() => setShowUpdate(true)}>Mark it read</button>
              </p>
            </div>
          )}

          {/* ── Wick: the sleep timer burns down ── */}
          <section className="c3-wick" aria-label="Sleep timer" style={{ marginTop: 18 }}>
            <div className="c3-wick-head">
              <span className="c2-label">Wick</span>
              <span className="c3-wick-v">{pb.sleep.mode === 'minutes' ? `${sleepMin} min` : pb.sleep.mode === 'chapter' ? 'End of chapter' : 'Off'}</span>
            </div>
            <div className="c3-wick-bar"><i style={{ width: `${wickPct}%` }}>{wickPct > 0 && <Mark size={16} live={playing} />}</i></div>
            <div className="c3-wick-opts">
              {SLEEP_OPTIONS.map(o => (
                <button key={o.id} type="button" className={wickOn === o.id ? 'is-on' : ''} onClick={() => pb.setSleep(o.id)} aria-pressed={wickOn === o.id}>
                  {o.minutes ? `${o.minutes}m` : o.id === 'chapter' ? 'Ch.' : 'Off'}
                </button>
              ))}
            </div>
          </section>

          {view === 'now' && <section className="c2-transcript" aria-live="polite">
            <p className="is-now">{line || (busy ? 'Loading…' : ' ')}</p>
          </section>}
        </>
      )}

      {/* ── Reading room: ambience ── */}
      {ps && (
        <>
          <div className="c2-sec"><h2>Reading room</h2></div>
          <div className="c2-chips" role="radiogroup" aria-label="Ambient sound">
            <button type="button" role="radio" aria-checked={!pb.ambient.trackId} className={!pb.ambient.trackId ? 'is-on' : ''} onClick={() => pb.setAmbientTrack(null)}>Quiet</button>
            {AMBIENT_CATALOG.map(t => (
              <button key={t.id} type="button" role="radio" aria-checked={pb.ambient.trackId === t.id}
                className={pb.ambient.trackId === t.id ? 'is-on' : ''} onClick={() => pb.setAmbientTrack(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="c2-card c2-levels">
            <label>
              <span className="c2-label">Ambience</span>
              <input type="range" min={0} max={1} step={0.01} value={pb.prefs.ambientVolume}
                onChange={e => pb.setAmbientVolume(Number(e.target.value))} aria-label="Ambience volume" />
            </label>
            {isAudio && (
              <label>
                <span className="c2-label">Narration</span>
                <input type="range" min={0} max={1} step={0.01} value={pb.prefs.narrationVolume}
                  onChange={e => pb.setNarrationVolume(Number(e.target.value))} aria-label="Narration volume" />
              </label>
            )}
            <label className="c2-check">
              <input type="checkbox" checked={pb.prefs.duck} onChange={e => pb.setDuck(e.target.checked)} />
              <span>Soften ambience while narrating</span>
            </label>
            <p className="c2-fine" style={{ marginTop: 6 }}>Ambient sounds are generated in your browser. On iPhone, narration volume follows the side buttons.</p>
          </div>
        </>
      )}

      {/* ── Paintings (visual journey) ── */}
      {meta && (
        <PaintingsPanel visuals={visuals} prefs={vPrefs} position={position}
          onPrefs={patch => pb.setBookVisuals(bookId, patch)}
          onPin={id => setPinned({ id, base: plate.chosen?.id ?? null })} shownId={showPlate ? plate.shown?.id : null} />
      )}

      {/* ── Files on this device (rarely needed: the library brings them) ── */}
      {(meta || audiobooks.length > 0) && (
        <details className="c3-files">
          <summary className="c2-link">On this device</summary>
          <div className="c2-card listen-panel">
            {currentSource?.type === 'audio' && (
              <p className="c2-fine" style={{ marginTop: 0 }}>
                {voiceName} · {formatDuration(audiobooks.find(a => a.id === currentSource.audiobookId)?.manifest.totalDurationSec)} · {formatBytes(audiobooks.find(a => a.id === currentSource.audiobookId)?.totalBytes)}
              </p>
            )}
            {visuals.set && (
              <p className="c2-fine" style={{ marginTop: 0 }}>{visuals.images.length} paintings · {formatBytes(visuals.set.totalBytes)}</p>
            )}
            <div className="c2-links">
              <AddFiles book={book} onUpdateBook={onUpdateBook} onAdded={() => { onAssetsChanged(); assets.refresh() }} />
              {currentSource?.type === 'audio' && <button type="button" className="c2-link" onClick={() => removeNarration(currentSource.audiobookId)}>Remove this narration</button>}
              {visuals.set && <button type="button" className="c2-link" onClick={removePaintings}>Remove these paintings</button>}
              {meta && <button type="button" className="c2-link" onClick={exportScript}>Export narration script</button>}
            </div>
            {exportNote && <p className="c2-fine">{exportNote}</p>}
            {storage?.quota > 0 && (
              <p className="c2-fine">
                Lantern uses {formatBytes(storage.usage)} of {formatBytes(storage.quota)} on this device
                {storage.persisted ? '.' : '. On iPhone, Add to Home Screen so it isn’t cleared.'}
              </p>
            )}
            {meta && <LinkEpub book={book} onUpdateBook={onUpdateBook} onLinked={onAssetsChanged} compact />}
          </div>
        </details>
      )}

      {theatre && (
        <Theatre plate={plate} motion={vPrefs.motion} playing={playing} busy={busy} line={line}
          title={book.title} chapter={section ? sectionLabel(section, ps.sectionIndex, book) : null}
          onToggle={pb.toggle} onClose={() => setTheatre(false)} />
      )}

      {showUpdate && <ChapterUpdateModal book={book} onClose={() => setShowUpdate(false)} onUpdateBook={onUpdateBook} />}
    </div>
  )
}
