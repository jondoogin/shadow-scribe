import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useBooks } from '../context/BooksContext.jsx'
import { usePlayback } from '../context/PlaybackContext.jsx'
import { useBookContent } from '../hooks/useBookContent.js'
import { Ico } from '../components/shared/icons.jsx'
import LinkEpub from '../components/listen/LinkEpub.jsx'
import ImportNarration from '../components/listen/ImportNarration.jsx'
import ChapterUpdateModal from '../components/modals/ChapterUpdateModal.jsx'
import { AMBIENT_CATALOG } from '../atmosphere/ambientEngine.js'
import { SLEEP_OPTIONS } from '../narration/sleepTimer.js'
import { listSpeechVoices } from '../narration/players.js'
import { buildNarrationScript, scriptStats } from '../narration/narrationScript.js'
import { getFullContent, deleteAudiobook, getSectionBlocks, storageEstimate } from '../content/contentRepository.js'
import { segmentBlocks } from '../narration/segmenter.js'
import { sectionLabel, chapterReached, formatClock, formatDuration, formatBytes } from '../narration/sectionLabels.js'

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

  return (
    <div className="max-w-[760px] mx-auto px-5 sm:px-10 pt-8 pb-32 listen-page">
      <Link to={`/book/${bookId}`} className="listen-link inline-flex items-center gap-1.5" style={{ marginBottom: 18 }}>
        <Ico.Left /> {book.title}
      </Link>

      <header className="flex items-center gap-4" style={{ marginBottom: 22 }}>
        {book.coverData || book.coverUrl
          ? <img src={book.coverData || book.coverUrl} alt="" style={{ width: 56, height: 84, objectFit: 'cover', borderRadius: 4, boxShadow: 'var(--shadow-card)' }} />
          : <div style={{ width: 56, height: 84, borderRadius: 4, background: book.coverBg || 'var(--color-card-deep)' }} />}
        <div className="min-w-0">
          <p className="listen-eyebrow">Listen</p>
          <h1 className="font-serif" style={{ fontSize: 22, color: 'var(--color-text-primary)', lineHeight: 1.25 }}>{book.title}</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-dim)' }}>{book.author}</p>
        </div>
      </header>

      {storeError && <p role="alert" className="listen-panel" style={{ color: 'var(--color-ember)', fontSize: 13 }}>{storeError}</p>}
      {pb.error && sessionForThisBook && (
        <p role="alert" style={{ color: 'var(--color-ember)', fontSize: 13, marginBottom: 12 }}>
          {pb.error} <button className="listen-link" onClick={pb.clearError}>Dismiss</button>
        </p>
      )}

      {!loading && !meta && !audiobooks.length && (
        <LinkEpub book={book} onUpdateBook={onUpdateBook} onLinked={reload} />
      )}

      {/* ── Now playing ── */}
      {ps && section && (
        <section className="listen-stage" aria-label="Now playing">
          <p className="listen-eyebrow">{sectionLabel(section, ps.sectionIndex, book)}</p>
          <p className="listen-caption" aria-live="polite">
            {(isAudio ? caption : speechCaption) || (busy ? 'Loading…' : ' ')}
          </p>

          {isAudio ? (
            <div className="listen-scrub">
              <input
                type="range" min={0} max={Math.max(1, ps.duration)} step={0.5} value={Math.min(ps.time, ps.duration || 0)}
                onChange={e => pb.seek(Number(e.target.value))} aria-label="Position in chapter"
              />
              <div className="flex justify-between" style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                <span>{formatClock(ps.time)}</span>
                <span>−{formatClock(Math.max(0, ps.duration - ps.time))}</span>
              </div>
            </div>
          ) : (
            <div className="listen-scrub">
              <input
                type="range" min={0} max={Math.max(0, ps.duration - 1)} step={1} value={Math.max(0, ps.segmentIndex)}
                onChange={e => pb.seek(Number(e.target.value))} aria-label="Sentence in chapter"
              />
              <div className="flex justify-between" style={{ fontSize: 11, color: 'var(--color-text-dim)' }}>
                <span>Sentence {Math.max(0, ps.segmentIndex) + 1} of {ps.duration || '—'}</span>
                <span>Device voice · no timeline</span>
              </div>
            </div>
          )}

          <div className="listen-transport">
            <button aria-label="Previous chapter" onClick={pb.prev}><Ico.SkipBack /></button>
            <button aria-label={isAudio ? 'Back 15 seconds' : 'Previous sentence'} onClick={() => pb.skip(isAudio ? -15 : -1)}>
              <Ico.Back /><span className="listen-skip-label">{isAudio ? '15' : '1'}</span>
            </button>
            <button className="listen-play" aria-label={playing ? 'Pause' : 'Play'} onClick={pb.toggle} disabled={busy}>
              {playing ? <Ico.Pause /> : <Ico.Play />}
            </button>
            <button aria-label={isAudio ? 'Forward 15 seconds' : 'Next sentence'} onClick={() => pb.skip(isAudio ? 15 : 1)}>
              <Ico.Forward /><span className="listen-skip-label">{isAudio ? '15' : '1'}</span>
            </button>
            <button aria-label="Next chapter" onClick={pb.next}><Ico.SkipFwd /></button>
          </div>

          <div className="listen-options">
            <label>
              <span>Speed</span>
              <select value={pb.prefs.rate} onChange={e => pb.setRate(Number(e.target.value))}>
                {RATES.map(r => <option key={r} value={r}>{r}×</option>)}
              </select>
            </label>
            <label>
              <span><Ico.Moon style={{ display: 'inline', width: 12, height: 12 }} /> Sleep</span>
              <select value={pb.sleep.mode === 'minutes' ? String(Math.round((pb.sleep.remainingMs || 0) / 60000)) : pb.sleep.mode}
                onChange={e => pb.setSleep(e.target.value)}>
                {pb.sleep.mode === 'minutes' && <option value={String(Math.round((pb.sleep.remainingMs || 0) / 60000))}>{Math.ceil((pb.sleep.remainingMs || 0) / 60000)} min left</option>}
                {SLEEP_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <button className="listen-link" onClick={() => setShowChapters(v => !v)} aria-expanded={showChapters}>
              Chapters ({sections.length})
            </button>
            <Link className="listen-link" to={`/book/${bookId}/read`}>Read along</Link>
          </div>

          {reachedChapter && (
            <p style={{ fontSize: 12, color: 'var(--color-text-dim)', marginTop: 14, lineHeight: 1.6 }}>
              You’re listening to chapter {reachedChapter}; your companion still thinks you’re at chapter {book.currentChapter || 0}.{' '}
              <button className="listen-link" onClick={() => setShowUpdate(true)}>Update companion progress</button>
            </p>
          )}
        </section>
      )}

      {showChapters && ps && (
        <section className="listen-panel" aria-label="Chapters">
          <ol className="listen-chapters">
            {sections.map((s, i) => (
              <li key={s.id}>
                <button
                  className={i === ps.sectionIndex ? 'active' : ''}
                  onClick={() => { pb.goTo(i, null, { autoplay: playing }); setShowChapters(false) }}
                >
                  <span>{sectionLabel(s, i, book)}</span>
                  {s.durationSec ? <span className="listen-dim">{formatDuration(s.durationSec)}</span> : null}
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ── Atmosphere ── */}
      {ps && (
        <section className="listen-panel" aria-label="Atmosphere">
          <p className="listen-eyebrow" style={{ marginBottom: 10 }}>Atmosphere</p>
          <div className="listen-chips" role="radiogroup" aria-label="Ambient sound">
            <button role="radio" aria-checked={!pb.ambient.trackId} className={!pb.ambient.trackId ? 'active' : ''} onClick={() => pb.setAmbientTrack(null)}>Off</button>
            {AMBIENT_CATALOG.map(t => (
              <button key={t.id} role="radio" aria-checked={pb.ambient.trackId === t.id}
                className={pb.ambient.trackId === t.id ? 'active' : ''} onClick={() => pb.setAmbientTrack(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="listen-options" style={{ marginTop: 12 }}>
            <label style={{ flex: 1 }}>
              <span>Ambience volume</span>
              <input type="range" min={0} max={1} step={0.01} value={pb.prefs.ambientVolume}
                onChange={e => pb.setAmbientVolume(Number(e.target.value))} aria-label="Ambience volume" />
            </label>
            {isAudio && (
              <label style={{ flex: 1 }}>
                <span>Narration volume</span>
                <input type="range" min={0} max={1} step={0.01} value={pb.prefs.narrationVolume}
                  onChange={e => pb.setNarrationVolume(Number(e.target.value))} aria-label="Narration volume" />
              </label>
            )}
            <label className="listen-check">
              <input type="checkbox" checked={pb.prefs.duck} onChange={e => pb.setDuck(e.target.checked)} />
              <span>Soften ambience while narrating</span>
            </label>
          </div>
          <p className="listen-dim" style={{ fontSize: 11, marginTop: 8 }}>
            Ambient sounds are generated in your browser. On iPhone, narration volume follows the side buttons.
          </p>
        </section>
      )}

      {/* ── Narration source ── */}
      {(meta || audiobooks.length > 0) && (
        <section className="listen-panel" aria-label="Narration">
          <p className="listen-eyebrow" style={{ marginBottom: 10 }}>Narration</p>
          <ul className="listen-sources">
            {audiobooks.map(ab => {
              const n = ab.manifest.narration || {}
              const active = currentSource?.type === 'audio' && currentSource.audiobookId === ab.id
              return (
                <li key={ab.id} className={active ? 'active' : ''}>
                  <button onClick={() => chooseSource({ type: 'audio', audiobookId: ab.id })} aria-pressed={active}>
                    <span className="font-serif">{n.voice} · {n.engineLabel || n.engine}</span>
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
        </section>
      )}

      {showUpdate && <ChapterUpdateModal book={book} onClose={() => setShowUpdate(false)} onUpdateBook={onUpdateBook} />}
    </div>
  )
}
