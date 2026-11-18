import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useBooks } from '../context/BooksContext.jsx'
import { usePlayback } from '../context/PlaybackContext.jsx'
import { useBookContent } from '../hooks/useBookContent.js'
import { Ico } from '../components/shared/icons.jsx'
import LinkEpub from '../components/listen/LinkEpub.jsx'
import ImportNarration from '../components/listen/ImportNarration.jsx'
import { callNumber, Holes, LitLabel, Mark } from '../catalogue/parts.jsx'
import ChapterUpdateModal from '../components/modals/ChapterUpdateModal.jsx'
import { AMBIENT_CATALOG } from '../atmosphere/ambientEngine.js'
import { SLEEP_OPTIONS } from '../narration/sleepTimer.js'
import { listSpeechVoices } from '../narration/players.js'
import { buildNarrationScript, scriptStats } from '../narration/narrationScript.js'
import { getFullContent, deleteAudiobook, getSectionBlocks, storageEstimate } from '../content/contentRepository.js'
import { segmentBlocks } from '../narration/segmenter.js'
import { sectionLabel, chapterReached, formatClock, formatDuration, formatBytes } from '../narration/sectionLabels.js'
import { bookRecord, latestLocator, visualPrefs } from '../narration/listenState.js'
import { useBookVisuals } from '../atmosphere/visual/useBookVisuals.js'
import { ListenPlate, PaintingsPanel, usePlate } from '../atmosphere/visual/Paintings.jsx'

// "16 NOV" for the lamp log's date stamps. Dates are stored as YYYY-MM-DD.
function stampDate(d) {
  if (!d) return '—'
  const t = new Date(d.length <= 10 ? `${d}T12:00:00` : d)
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
}

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
  const visuals = useBookVisuals(book, meta)
  const [pinned, setPinned] = useState(null)

  const onUpdateBook = changes => updateBook(bookId, changes)

  useEffect(() => {
    if (book?.title) document.title = `Listen · ${book.title} — Lantern`
  }, [book?.title])

  useEffect(() => {
    listSpeechVoices().then(vs => setVoices(
      vs.filter(v => /^en\b|^en-/i.test(v.lang)).sort((a, b) => Number(b.localService) - Number(a.localService))
    ))
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

  // Paintings follow the spoken position; before playback starts, the saved one.
  const record = bookRecord(pb.listenState, bookId)
  const vPrefs = visualPrefs(record)
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

  if (!book) return <Navigate to="/library" replace />

  const currentSource = pb.session?.source
  const reachedChapter = section ? chapterReached(section, book) : null
  const playing = ps?.status === 'playing'
  const busy = ps?.status === 'loading'

  const chooseSource = async (source) => {
    await pb.openSession(book, { source, at: ps?.sectionId ? { sectionId: ps.sectionId, blockId: ps.blockId } : undefined })
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
    if (!window.confirm('Remove this narration from this device? You can import the package again later.')) return
    if (currentSource?.audiobookId === id) pb.closeSession()
    await deleteAudiobook(id)
    reload()
  }

  const remaining = isAudio && ps ? Math.max(0, ps.duration - ps.time) : 0
  const pct = !ps ? 0 : isAudio
    ? (ps.duration ? (ps.time / ps.duration) * 100 : 0)
    : (ps.duration ? ((Math.max(0, ps.segmentIndex) + 1) / ps.duration) * 100 : 0)
  const n = currentSource?.type === 'audio' ? audiobooks.find(ab => ab.id === currentSource.audiobookId)?.manifest.narration : null
  const voiceName = n ? String(n.voice || 'Narration').replace(/_/g, ' ') : currentSource?.type === 'speech' ? 'Device voice' : null
  const sleepMin = pb.sleep.mode === 'minutes' ? Math.ceil((pb.sleep.remainingMs || 0) / 60000) : 0
  const wickOn = pb.sleep.mode === 'minutes' ? (SLEEP_OPTIONS.find(o => o.minutes && o.minutes >= sleepMin)?.id || '60') : pb.sleep.mode
  const wickPct = pb.sleep.mode === 'minutes' ? Math.min(100, ((pb.sleep.remainingMs || 0) / 3_600_000) * 100) : pb.sleep.mode === 'chapter' ? 100 : 0
  const log = (book.readingLog || []).slice(-3).reverse()

  return (
    <div className="cat c2 listen-page">
      <header className="c2-top">
        <div><Link to={`/book/${bookId}`} className="c2-ic" aria-label={`Back to ${book.title}`}><Ico.Left /></Link></div>
        <div className="c2-top-c"><span className="c2-label">{voiceName ? `Listening · ${voiceName}` : 'Listen'}</span></div>
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
          <div style={{ marginTop: 16 }}><LinkEpub book={book} onUpdateBook={onUpdateBook} onLinked={reload} /></div>
        </article>
      )}

      {/* ── Now playing: the loan slip ── */}
      {ps && section && (
        <>
          <article className={`c2-card c2-card--slip${showPlate ? ' has-plate' : ''}`} aria-label="Now playing">
            {showPlate && <ListenPlate plate={plate} motion={vPrefs.motion} playing={playing} total={visuals.images.length} />}
            <div className="c2-card-head">
              <span className="c2-call">{callNumber(book)} · {ps.sectionIndex + 1}</span>
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

          <section className="c2-transcript" aria-live="polite">
            <p className="is-now">{(isAudio ? caption : speechCaption) || (busy ? 'Loading…' : ' ')}</p>
          </section>
        </>
      )}

      {/* ── Lamp log: recent sessions from the reading log ── */}
      {log.length > 0 && (
        <>
          <div className="c2-sec"><h2>Lamp log</h2><span className="c2-label">Ch. {book.currentChapter || 0}</span></div>
          <ol className="c2-loans">
            {log.map((e, i) => (
              <li key={e.id || i}>
                <span className="c2-datestamp" style={{ '--rot': `${[-3, 2, -1][i % 3]}deg` }}>{stampDate(e.date)}</span>
                <span>
                  <b>{e.endChapter > e.startChapter ? `Lit ch. ${e.startChapter + 1}–${e.endChapter}` : `Lit ch. ${e.endChapter || e.startChapter || 1}`}</b>
                  <small>{e.durationEstimate ? `${e.durationEstimate} session` : 'reading session'}</small>
                </span>
              </li>
            ))}
          </ol>
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
        <PaintingsPanel book={book} meta={meta} visuals={visuals} prefs={vPrefs} position={position}
          onPrefs={patch => pb.setBookVisuals(bookId, patch)}
          onPin={id => setPinned({ id, base: plate.chosen?.id ?? null })} shownId={showPlate ? plate.shown?.id : null} />
      )}

      {/* ── Narration source ── */}
      {(meta || audiobooks.length > 0) && (
        <section aria-label="Narration">
          <div className="c2-sec"><h2>Narration</h2></div>
          <div className="c2-card listen-panel">
          <ul className="listen-sources">
            {audiobooks.map(ab => {
              const n = ab.manifest.narration || {}
              const active = currentSource?.type === 'audio' && currentSource.audiobookId === ab.id
              return (
                <li key={ab.id} className={active ? 'active' : ''}>
                  <button onClick={() => chooseSource({ type: 'audio', audiobookId: ab.id })} aria-pressed={active}>
                    <span className="font-serif">{String(n.voice || '').replace(/_/g, ' ')} · {n.engineLabel || n.engine}</span>
                    {n.style && <span className="listen-dim">“{n.style}”</span>}
                    <span className="listen-dim">
                      Neural · {formatDuration(ab.manifest.totalDurationSec)} · {ab.manifest.sections.length} chapters · {formatBytes(ab.totalBytes)}
                      {!ab.manifest.complete && ' · partial'}
                    </span>
                  </button>
                  <button className="listen-link" onClick={() => removeNarration(ab.id)} aria-label="Remove narration">Remove</button>
                </li>
              )
            })}
            {meta && (
              <li className={currentSource?.type === 'speech' ? 'active' : ''}>
                <button onClick={() => chooseSource({ type: 'speech', voiceURI: currentSource?.voiceURI })} aria-pressed={currentSource?.type === 'speech'}>
                  <span className="font-serif">Device voice</span>
                  <span className="listen-dim">Built-in browser speech · live, no download · quality varies by device</span>
                </button>
                {currentSource?.type === 'speech' && voices.length > 0 && (
                  <select aria-label="Device voice" value={currentSource.voiceURI || ''}
                    onChange={e => chooseSource({ type: 'speech', voiceURI: e.target.value || undefined })}>
                    <option value="">Default voice</option>
                    {voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}{v.localService ? '' : ' (online)'}</option>)}
                  </select>
                )}
              </li>
            )}
          </ul>
          <div className="flex flex-wrap gap-x-6 gap-y-2" style={{ marginTop: 12 }}>
            <ImportNarration book={book} onUpdateBook={onUpdateBook} onImported={async (id) => {
              reload()
              await pb.openSession({ ...book, contentId: book.contentId }, { source: { type: 'audio', audiobookId: id } })
            }} />
            {meta && <button className="listen-link" onClick={exportScript}>Export narration script for the Mac narrator</button>}
          </div>
          {exportNote && <p className="listen-dim" style={{ fontSize: 12, marginTop: 8 }}>{exportNote}</p>}
          {storage?.quota > 0 && (
            <p className="listen-dim" style={{ fontSize: 12, marginTop: 8 }}>
              Lantern uses {formatBytes(storage.usage)} of {formatBytes(storage.quota)} available on this device
              {storage.persisted ? '.' : ' · storage may be cleared if unused (on iPhone, Add to Home Screen to keep it).'}
            </p>
          )}
          {!audiobooks.length && meta && (
            <p className="listen-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
              For natural neural narration, generate it on your Mac (free, offline) with <code>lantern-narrate</code>,
              then import the <code>.lantern-audio</code> file here or on your iPhone.
            </p>
          )}
          {meta && <div style={{ marginTop: 12 }}><LinkEpub book={book} onUpdateBook={onUpdateBook} onLinked={reload} compact /></div>}
          </div>
        </section>
      )}

      <p className="c2-fine">Your companion stays at chapter {book.currentChapter || 0} until you move it.</p>

      {showUpdate && <ChapterUpdateModal book={book} onClose={() => setShowUpdate(false)} onUpdateBook={onUpdateBook} />}
    </div>
  )
}
