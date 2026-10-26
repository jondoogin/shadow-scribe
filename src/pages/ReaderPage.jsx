import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useBooks } from '../context/BooksContext.jsx'
import { usePlayback } from '../context/PlaybackContext.jsx'
import { useBookContent } from '../hooks/useBookContent.js'
import { getSectionBlocks } from '../content/contentRepository.js'
import { bookRecord, latestLocator } from '../narration/listenState.js'
import { sectionLabel, chapterReached } from '../narration/sectionLabels.js'
import { Ico } from '../components/shared/icons.jsx'
import LinkEpub from '../components/listen/LinkEpub.jsx'
import ChapterUpdateModal from '../components/modals/ChapterUpdateModal.jsx'

// Minimal, text-only reader over the retained EPUB content. Imported HTML is
// never rendered: blocks are plain text, so nothing from the EPUB can run.
export default function ReaderPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const { books, updateBook } = useBooks()
  const book = books.find(b => b.id === bookId)
  const pb = usePlayback()
  const { meta, loading, reload } = useBookContent(book)
  const [chosenIndex, setSectionIndex] = useState(null)
  const [loaded, setLoaded] = useState({ id: null, blocks: null })
  const [showUpdate, setShowUpdate] = useState(false)
  const pendingScroll = useRef(null)
  const visibleBlock = useRef(null)

  const sections = useMemo(() => (meta?.sections || []).filter(s => s.blockCount > 0 && s.skipReason !== 'nonlinear'), [meta])

  // Start at the most recent location from Reader or Listen.
  const initial = useMemo(() => {
    if (!sections.length) return { index: null, blockId: null }
    const loc = latestLocator(bookRecord(pb.listenState, bookId))
    const i = loc ? sections.findIndex(s => s.id === loc.sectionId) : -1
    return i >= 0 ? { index: i, blockId: loc.blockId } : { index: Math.max(0, sections.findIndex(s => s.narrate)), blockId: null }
  }, [sections]) // eslint-disable-line react-hooks/exhaustive-deps
  const sectionIndex = chosenIndex ?? initial.index

  const section = sectionIndex !== null ? sections[sectionIndex] : null
  const blocks = section && loaded.id === section.id ? loaded.blocks : null

  useEffect(() => {
    if (!section || !book?.contentId) return
    let cancelled = false
    getSectionBlocks(book.contentId, section.id).then(b => { if (!cancelled) setLoaded({ id: section.id, blocks: b || [] }) })
    return () => { cancelled = true }
  }, [section?.id, book?.contentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to a saved block once the section renders; otherwise to top.
  useEffect(() => {
    if (!blocks) return
    // First render of the restored section scrolls to the saved block.
    const id = pendingScroll.current === null && chosenIndex === null ? initial.blockId : null
    pendingScroll.current = false
    if (id) document.getElementById(`blk-${id}`)?.scrollIntoView({ block: 'center' })
    else window.scrollTo(0, 0)
  }, [blocks]) // eslint-disable-line react-hooks/exhaustive-deps -- runs once per loaded section

  // Track the first block in view and save it (debounced) as the reading locator.
  useEffect(() => {
    if (!blocks?.length || !section) return
    let timer = null
    const obs = new IntersectionObserver(entries => {
      const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (!top) return
      visibleBlock.current = top.target.dataset.block
      clearTimeout(timer)
      timer = setTimeout(() => pb.saveReadPosition(bookId, { sectionId: section.id, blockId: visibleBlock.current }), 1200)
    }, { rootMargin: '-20% 0px -60% 0px' })
    document.querySelectorAll('[data-block]').forEach(el => obs.observe(el))
    return () => { obs.disconnect(); clearTimeout(timer) }
  }, [blocks, section?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (book?.title) document.title = `Read · ${book.title} — Lantern`
  }, [book?.title])

  if (!book) return <Navigate to="/library" replace />

  const narrating = pb.session?.book.id === bookId && pb.playerState?.sectionId === section?.id ? pb.playerState.blockId : null
  const reachedChapter = section ? chapterReached(section, book) : null

  const go = (i) => {
    if (i < 0 || i >= sections.length) return
    pb.saveReadPosition(bookId, { sectionId: sections[i].id, blockId: 'b0' })
    setSectionIndex(i)
  }

  const listenHere = async () => {
    const at = { sectionId: section.id, blockId: visibleBlock.current || 'b0' }
    pb.saveReadPosition(bookId, at)
    await pb.openSession(book, { at, source: pb.session?.book.id === bookId ? pb.session.source : undefined })
    navigate(`/book/${bookId}/listen`)
  }

  return (
    <div className="max-w-[720px] mx-auto px-5 sm:px-10 pt-8 pb-32 reader-page">
      <div className="flex items-center justify-between gap-4" style={{ marginBottom: 20 }}>
        <Link to={`/book/${bookId}`} className="listen-link inline-flex items-center gap-1.5"><Ico.Left /> {book.title}</Link>
        {section && <button className="listen-link inline-flex items-center gap-1.5" onClick={listenHere}><Ico.Headphones /> Listen from here</button>}
      </div>

      {!loading && !meta && <LinkEpub book={book} onUpdateBook={c => updateBook(bookId, c)} onLinked={reload} />}

      {section && (
        <>
          <nav className="reader-nav" aria-label="Chapters">
            <button onClick={() => go(sectionIndex - 1)} disabled={sectionIndex === 0} aria-label="Previous chapter">‹</button>
            <select value={sectionIndex} onChange={e => go(Number(e.target.value))} aria-label="Chapter">
              {sections.map((s, i) => <option key={s.id} value={i}>{sectionLabel(s, i, book)}{s.narrate ? '' : ' (front/back matter)'}</option>)}
            </select>
            <button onClick={() => go(sectionIndex + 1)} disabled={sectionIndex === sections.length - 1} aria-label="Next chapter">›</button>
          </nav>

          <article className="reader-text" lang={meta.language || 'en'}>
            {!blocks && <p className="listen-dim">Opening…</p>}
            {blocks?.map(b => {
              const cls = narrating === b.id ? 'reader-narrating' : undefined
              if (b.type === 'break') return <hr key={b.id} id={`blk-${b.id}`} data-block={b.id} className="reader-break" />
              if (b.type === 'heading') return <h2 key={b.id} id={`blk-${b.id}`} data-block={b.id} className={cls}>{b.text}</h2>
              if (b.type === 'quote') return <blockquote key={b.id} id={`blk-${b.id}`} data-block={b.id} className={cls}>{b.text}</blockquote>
              return <p key={b.id} id={`blk-${b.id}`} data-block={b.id} className={cls}>{b.text}</p>
            })}
          </article>

          {blocks && (
            <div className="reader-end">
              {reachedChapter && (
                <p className="listen-dim" style={{ fontSize: 12, marginBottom: 12 }}>
                  Finished chapter {reachedChapter}? <button className="listen-link" onClick={() => setShowUpdate(true)}>Update companion progress</button>
                </p>
              )}
              {sectionIndex < sections.length - 1 && (
                <button className="listen-btn" onClick={() => go(sectionIndex + 1)}>Next: {sectionLabel(sections[sectionIndex + 1], sectionIndex + 1, book)} →</button>
              )}
            </div>
          )}
        </>
      )}
      {showUpdate && <ChapterUpdateModal book={book} onClose={() => setShowUpdate(false)} onUpdateBook={c => updateBook(bookId, c)} />}
    </div>
  )
}
