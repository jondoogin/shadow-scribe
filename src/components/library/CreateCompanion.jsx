import { useState, useRef, useEffect } from 'react'
import { uid } from '../../utils/uid.js'
import { Ico } from '../shared/icons.jsx'
import SectionLabel from '../shared/SectionLabel.jsx'
import { STRUCTURE_TYPES } from '../../data/config.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useBooks } from '../../context/BooksContext.jsx'
import { parseEpub } from '../../utils/epubParser.js'
import EpubImportReview from './EpubImportReview.jsx'
import { track } from '../../utils/analytics.js'
import { fetchCoverUrl } from '../../utils/coverLookup.js'

const MOOD_COLORS = {
  sage:   '#3A6647',
  ember:  '#9B2335',
  ink:    '#44403C',
  sienna: '#8B4513',
  gold:   '#B8860B',
  steel:  '#2D4A6B',
}

export default function CreateCompanion({ onCreate, onCancel }) {
  const { settings } = useSettings()
  const { books, updateBook } = useBooks()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title:'', author:'', isbn:'', coverUrl:'',
    format: settings.defaultFormat ?? 'print', mood:'gold',
    depthLevel: settings.defaultDepthLevel ?? 'resonant',
    spoilerMode: settings.spoilerMode ?? 'relaxed', structureType:'chapter',
    hasSeries:false, seriesName:'', seriesPos:'', seriesTotal:'',
    totalChapters:'',
  })
  const [coverErr, setCoverErr] = useState(false)

  // Google Books search state
  const [searchQuery,   setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchOpen,    setSearchOpen]    = useState(false)
  const [searchError,   setSearchError]   = useState(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) { setSearchResults([]); setSearchError(null); setSearchOpen(false); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      setSearchLoading(true)
      setSearchError(null)
      try {
        const res  = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=6&fields=items(volumeInfo/title,volumeInfo/authors,volumeInfo/industryIdentifiers,volumeInfo/imageLinks,volumeInfo/pageCount)`
        )
        if (cancelled) return
        if (!res.ok) {
          // 429 is the common one — the shared Google Books quota is exhausted
          setSearchResults([])
          setSearchError(res.status === 429
            ? 'Book search is busy right now. Enter the details below instead.'
            : 'Book search is unavailable right now. Enter the details below instead.')
        } else {
          const data = await res.json()
          if (cancelled) return
          setSearchResults(data.items || [])
        }
        setSearchOpen(true)
      } catch {
        if (cancelled) return
        setSearchResults([])
        setSearchError('Book search could not be reached. Enter the details below instead.')
        setSearchOpen(true)
      } finally {
        if (!cancelled) setSearchLoading(false)
      }
    }, 350)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [searchQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const fn = e => { if (!searchRef.current?.contains(e.target)) setSearchOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const handleSearchSelect = (item) => {
    const v    = item.volumeInfo
    const isbn = v.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier
               || v.industryIdentifiers?.find(i => i.type === 'ISBN_10')?.identifier
               || ''
    const url  = v.imageLinks?.thumbnail?.replace('http://', 'https://') || ''
    const est  = v.pageCount ? String(Math.max(1, Math.round(v.pageCount / 22))) : ''
    set('title',    v.title || '')
    set('author',   (v.authors || []).join(', '))
    set('isbn',     isbn)
    set('coverUrl', url)
    if (est) set('totalChapters', est)
    setCoverErr(false)
    setSearchQuery('')
    setSearchOpen(false)
  }

  // EPUB import state
  const [importing,        setImporting]        = useState(false)
  const [importData,       setImportData]        = useState(null)
  const [importError,      setImportError]       = useState(null)
  const [duplicateWarning, setDuplicateWarning]  = useState(null)
  const fileInputRef = useRef(null)

  const handleEpubFile = async (file) => {
    if (!file) return
    setImporting(true)
    setImportError(null)
    setDuplicateWarning(null)
    try {
      const data = await parseEpub(file)
      // Warn if a companion with this title+author already exists
      const norm = s => (s || '').toLowerCase().trim()
      const existing = books.find(b =>
        norm(b.title) === norm(data.title) && norm(b.author) === norm(data.author)
      )
      if (existing) {
        setDuplicateWarning(`A companion for "${data.title}" already exists in your library. You can still create another.`)
      }
      track('epub_imported', { chapters: data.chapters?.length ?? 0 })
      setImportData(data)
    } catch (err) {
      track('epub_failed', { reason: err?.message ?? 'unknown' })
      setImportError(err.message || 'Could not parse this EPUB file.')
    } finally {
      setImporting(false)
    }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = () => {
    const n = parseInt(form.totalChapters) || 20
    const labelPrefix = form.structureType === 'part' ? 'Part' : form.structureType === 'section' ? 'Section' : 'Chapter'
    const newBook = {
      id: uid('book_'),
      title: form.title || 'Untitled',
      author: form.author || 'Unknown Author',
      isbn: form.isbn || null,
      format: form.format,
      spoilerMode: form.spoilerMode,
      structureType: form.structureType,
      status: 'reading',
      currentChapter: 1,
      totalChapters: n,
      lastUpdated: new Date().toISOString().split('T')[0],
      coverBg: `linear-gradient(160deg,${MOOD_COLORS[form.mood]}CC 0%,${MOOD_COLORS[form.mood]}66 100%)`,
      coverUrl: form.coverUrl || undefined,
      mood: form.mood,
      depthLevel: form.depthLevel,
      readingLog: [],
      series: form.hasSeries && form.seriesName
        ? { name:form.seriesName, position:parseInt(form.seriesPos)||1, total:parseInt(form.seriesTotal)||0 }
        : null,
      chapters: Array.from({ length:n }, (_, i) => ({
        num:i+1, title:`${labelPrefix} ${i+1}`, type:form.structureType,
        completed:false, summary:null, reflection:null, important:false,
      })),
      characters:{ main:[], secondary:[], relationships:[] },
      mysteries:[], notes:[], discussionQuestions:[], userDiscussionQuestions:[],
    }
    track('companion_created', { format: form.format })
    onCreate(newBook)
    // Only fire async cover lookup if search didn't already provide one
    if (!form.coverUrl) {
      fetchCoverUrl(newBook.title, newBook.author, newBook.isbn)
        .then(url => { if (url) updateBook(newBook.id, { coverUrl: url }) })
    }
  }

  const formats = [
    { k:'print',     l:'Print',     icon:'📖' },
    { k:'ebook',     l:'E-Book',    icon:'📱' },
    { k:'audiobook', l:'Audiobook', icon:'🎧' },
  ]
  const spoilerModes = [
    { k:'strict',  l:'Strict',        desc:'Never show upcoming chapter info' },
    { k:'relaxed', l:'Relaxed',       desc:'Show chapter titles, hide plot details' },
    { k:'full',    l:'Full Spoilers', desc:'Show everything freely' },
  ]

  const coverPreviewUrl = form.coverUrl
    || (form.isbn && !coverErr ? `https://covers.openlibrary.org/b/isbn/${form.isbn}-M.jpg` : null)

  // A search that finds nothing must say so — otherwise the primary path dead-ends silently
  const searchNoResults = searchOpen && !searchLoading && !searchError
    && searchResults.length === 0 && searchQuery.trim().length >= 2
  const showSearchPanel = searchOpen && (searchResults.length > 0 || !!searchError || searchNoResults)

  const inputCls = "w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-800 placeholder-ink-400 bg-cream-200 transition-all"

  // ── EPUB import loading state ──
  if (importing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
        <p className="font-serif text-lg text-ink-700 mb-2">Reading your EPUB…</p>
        <p className="text-sm text-ink-400 italic">Extracting chapters and metadata</p>
      </div>
    )
  }

  // ── EPUB review flow ──
  if (importData) {
    return (
      <EpubImportReview
        importData={importData}
        duplicateWarning={duplicateWarning}
        onCreate={onCreate}
        onBack={() => { setImportData(null); setImportError(null); setDuplicateWarning(null) }}
      />
    )
  }

  return (
    <>
      {/* Progress bar header */}
      <div className="border-b border-ink-200 bg-cream-50">
        <div className="max-w-xl mx-auto px-5 sm:px-8 h-12 flex items-center gap-4">
          <button onClick={onCancel}
            className="flex items-center gap-1.5 text-ink-500 hover:text-ink-800 text-sm transition-colors flex-shrink-0">
            <Ico.Left /> Library
          </button>
          <div className="flex-1 flex gap-1.5">
            {[1,2,3].map(s => (
              <div key={s}
                className={`h-[2px] flex-1 rounded-full transition-all duration-400 ${s <= step ? 'bg-gold' : 'bg-ink-200'}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-ink-400 font-medium tabular-nums flex-shrink-0">{step} / 3</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 sm:px-8 py-8 pb-16 animate-slide-up">

        {/* ── Step 1: Book info + format + mood ── */}
        {step === 1 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">What are you reading?</h1>
            <p className="text-sm text-ink-500 mb-5">Search to find your book, or enter details below.</p>

            {/* ── Google Books search ── */}
            <div className="mb-6 relative" ref={searchRef}>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">
                  <Ico.Search />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => (searchResults.length > 0 || searchError) && setSearchOpen(true)}
                  placeholder="Search by title or author…"
                  className={inputCls}
                  style={{ paddingLeft: '2.25rem' }}
                />
                {searchLoading && (
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] italic text-ink-400">
                    searching…
                  </span>
                )}
              </div>

              {/* Results dropdown */}
              {showSearchPanel && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 rounded-xl overflow-hidden z-20"
                  style={{
                    background: 'var(--color-card-base)',
                    border: '1px solid var(--color-ink-200)',
                    boxShadow: 'var(--shadow-menu)',
                  }}
                >
                  {searchNoResults && (
                    <p className="px-3.5 py-3 text-[12px] italic text-ink-500">
                      Nothing found by that name. Enter the details below instead.
                    </p>
                  )}
                  {searchError && (
                    <p className="px-3.5 py-3 text-[12px] italic text-ink-500">
                      {searchError}
                    </p>
                  )}
                  {searchResults.map((item, i) => {
                    const v      = item.volumeInfo
                    const thumb  = v.imageLinks?.thumbnail?.replace('http://', 'https://')
                    const author = (v.authors || []).join(', ')
                    return (
                      <button
                        key={i}
                        onMouseDown={e => { e.preventDefault(); handleSearchSelect(item) }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-cream-200"
                        style={{ borderBottom: i < searchResults.length - 1 ? '1px solid var(--color-ink-100)' : 'none' }}
                      >
                        {thumb ? (
                          <img src={thumb} alt="" className="w-8 h-12 object-cover rounded flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-12 rounded bg-ink-100 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-ink-800 truncate">{v.title}</p>
                          {author && <p className="text-[11px] text-ink-400 truncate italic">{author}</p>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-5">Or enter details manually</p>

            <div className="flex gap-5 mb-7">
              <div className="flex-shrink-0">
                {coverPreviewUrl ? (
                  <img src={coverPreviewUrl} onError={() => setCoverErr(true)} alt="Cover"
                    className="w-[72px] h-[108px] rounded-xl object-cover"
                    style={{ boxShadow:'var(--shadow-panel)' }} />
                ) : (
                  <div className="w-[72px] h-[108px] rounded-xl bg-ink-100 border border-ink-200 flex items-center justify-center text-ink-300">
                    <Ico.Book />
                  </div>
                )}
                {coverPreviewUrl && <p className="text-[10px] text-ink-400 text-center mt-1.5">Preview</p>}
              </div>

              <div className="flex-1 space-y-3.5">
                <div>
                  <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">Title *</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                    placeholder="The Name of the Wind" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">Author *</label>
                  <input type="text" value={form.author} onChange={e => set('author', e.target.value)}
                    placeholder="Patrick Rothfuss" className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">
                    ISBN <span className="normal-case font-normal text-ink-400">(for cover art)</span>
                  </label>
                  <input type="text" value={form.isbn}
                    onChange={e => { set('isbn', e.target.value); setCoverErr(false) }}
                    placeholder="9780756404741" className={inputCls} />
                </div>
              </div>
            </div>

            {/* Format */}
            <div className="mb-6">
              <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-3">Format</label>
              <div className="flex gap-3">
                {formats.map(f => (
                  <button key={f.k} onClick={() => set('format', f.k)}
                    className={`flex-1 py-3.5 rounded-xl border-2 text-[13px] font-medium transition-all ${
                      form.format === f.k
                        ? 'border-gold bg-gold-bg text-gold'
                        : 'border-ink-200 text-ink-600 hover:border-ink-300 bg-cream-200'
                    }`}>
                    <div className="text-xl mb-1">{f.icon}</div>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Companion depth — ritual choice, not a settings dial */}
            <div className="mb-6">
              <p className="font-serif mb-1.5" style={{ fontSize: 17, fontWeight: 400, color: 'var(--color-ink-900)' }}>
                How should your companion be present?
              </p>
              <p className="italic mb-4" style={{ fontSize: 12, color: 'var(--color-ink-500)', lineHeight: 1.6 }}>
                This shapes how Lantern holds space as you read. You can change it any time.
              </p>
              <div className="space-y-2">
                {[
                  {
                    k: 'quiet',
                    label: 'Quiet',
                    tagline: 'The companion witnesses without speaking.',
                    detail: 'A silent record. Notes and chapters — no responses, no observations.',
                  },
                  {
                    k: 'resonant',
                    label: 'Resonant',
                    tagline: 'Present without performing.',
                    detail: 'Responds to your notes when something earns it. Patterns surface as they emerge.',
                    recommended: true,
                  },
                  {
                    k: 'saturated',
                    label: 'Saturated',
                    tagline: 'Fully awake to this reading.',
                    detail: 'Dense observations, frequent reflections. The companion speaks often.',
                  },
                ].map(opt => {
                  const selected = form.depthLevel === opt.k
                  return (
                    <button
                      key={opt.k}
                      onClick={() => set('depthLevel', opt.k)}
                      className="w-full text-left px-4 py-3.5 rounded-xl transition-all"
                      style={{
                        background:  selected
                          ? 'color-mix(in srgb, var(--color-gold-bg, #FDF8EC) 55%, var(--color-cream, #FAF6EE))'
                          : 'var(--color-cream-200)',
                        border:      selected ? '1px solid color-mix(in srgb, var(--ca) 45%, transparent)' : '1px solid var(--color-hairline)',
                        boxShadow:   selected ? '0 0 0 2px color-mix(in srgb, var(--color-accent) 14%, transparent)' : 'none',
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="font-serif"
                          style={{ fontSize: 14, fontWeight: 400, color: selected ? 'var(--color-accent)' : 'var(--color-ink-800)' }}
                        >
                          {opt.label}
                        </span>
                        {opt.recommended && (
                          <span className="italic" style={{ fontSize: 10, color: 'var(--color-ink-400)' }}>
                            · recommended
                          </span>
                        )}
                      </div>
                      <p
                        className="italic"
                        style={{ fontSize: 13, fontFamily: 'var(--font-serif)', color: 'var(--color-ink-600)', lineHeight: 1.45, marginBottom: 3 }}
                      >
                        {opt.tagline}
                      </p>
                      <p style={{ fontSize: 11, fontFamily: 'var(--font-sans)', color: 'var(--color-ink-400)', lineHeight: 1.45 }}>
                        {opt.detail}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <button onClick={() => form.title && setStep(2)}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                form.title ? 'bg-gold text-white hover:bg-gold-light' : 'bg-ink-100 text-ink-400 cursor-not-allowed'
              }`}>
              Continue →
            </button>

            {/* EPUB import — tertiary path for those who have the file */}
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--color-ink-100)' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".epub"
                className="hidden"
                onChange={e => handleEpubFile(e.target.files[0])}
              />
              <p className="text-[11px] italic text-center" style={{ color: 'var(--color-ink-400)' }}>
                Have an EPUB?{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="underline hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--color-ink-500)' }}
                >
                  Import it
                </button>
                {' '}to auto-detect chapters and extract the full structure.
              </p>
              {importError && (
                <p className="text-[12px] text-ember mt-2 text-center">{importError}</p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Chapter structure + series ── */}
        {step === 2 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">Chapter structure</h1>
            <p className="text-sm text-ink-500 mb-7">How is this book organised?</p>

            <div className="space-y-5 mb-8">
              {/* Structure type */}
              <div>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-2">Structure</label>
                <div className="space-y-2">
                  {STRUCTURE_TYPES.map(s => (
                    <button key={s.k} onClick={() => set('structureType', s.k)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        form.structureType === s.k
                          ? 'border-gold bg-gold-bg'
                          : 'border-ink-200 bg-cream-200 hover:border-ink-300'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${
                          form.structureType === s.k ? 'border-gold bg-gold' : 'border-ink-300'
                        }`} />
                        <div>
                          <span className={`text-[13px] font-semibold ${form.structureType === s.k ? 'text-gold' : 'text-ink-700'}`}>{s.l}</span>
                          <span className="text-[12px] text-ink-400 ml-2">{s.desc}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Count */}
              <div>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">
                  Total {STRUCTURE_TYPES.find(s => s.k === form.structureType)?.l.toLowerCase() ?? 'chapters'}
                </label>
                <input type="number" value={form.totalChapters}
                  onChange={e => set('totalChapters', e.target.value)}
                  placeholder="29" className={inputCls} />
              </div>

              {/* Series toggle */}
              <div>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-2">Series</label>
                <button
                  onClick={() => set('hasSeries', !form.hasSeries)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-[13px] font-medium transition-all ${
                    form.hasSeries
                      ? 'border-gold bg-gold-bg text-gold'
                      : 'border-ink-200 bg-cream-200 text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    form.hasSeries ? 'border-gold bg-gold' : 'border-ink-300'
                  }`}>
                    {form.hasSeries && <span className="text-white text-[9px] font-bold">✓</span>}
                  </div>
                  Part of a series
                </button>

                {form.hasSeries && (
                  <div className="mt-3 space-y-3">
                    <input type="text" value={form.seriesName} onChange={e => set('seriesName', e.target.value)}
                      placeholder="Series name (e.g. Kingkiller Chronicle)" className={inputCls} />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] text-ink-400 mb-1.5">Book #</label>
                        <input type="number" value={form.seriesPos} onChange={e => set('seriesPos', e.target.value)}
                          placeholder="1" className={inputCls} />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] text-ink-400 mb-1.5">of total</label>
                        <input type="number" value={form.seriesTotal} onChange={e => set('seriesTotal', e.target.value)}
                          placeholder="3" className={inputCls} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-all">← Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-all">Continue →</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Spoiler settings + review ── */}
        {step === 3 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">Spoiler settings</h1>
            <p className="text-sm text-ink-500 mb-7">How carefully should Lantern handle future chapter details?</p>

            <div className="space-y-2.5 mb-7">
              {spoilerModes.map(m => (
                <button key={m.k} onClick={() => set('spoilerMode', m.k)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    form.spoilerMode === m.k ? 'border-gold bg-gold-bg' : 'border-ink-200 hover:border-ink-300 bg-cream-200'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      form.spoilerMode === m.k ? 'border-gold bg-gold' : 'border-ink-300'
                    }`}>
                      {form.spoilerMode === m.k && <span className="w-1.5 h-1.5 rounded-full bg-cream-200 block" />}
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${form.spoilerMode === m.k ? 'text-gold' : 'text-ink-800'}`}>{m.l}</p>
                      <p className="text-[12px] text-ink-500 mt-0.5">{m.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Companion summary */}
            <div className="p-4 rounded-xl bg-cream-200 border border-ink-200 mb-6">
              <SectionLabel>Your companion</SectionLabel>
              <p className="font-serif text-ink-900 font-semibold">{form.title || 'Untitled'}</p>
              <p className="text-[12px] text-ink-500 mt-0.5">
                {form.author || 'Unknown'} · {form.format} · {form.totalChapters || '?'} {form.structureType}s · {form.depthLevel} · {form.spoilerMode} spoilers
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-all">← Back</button>
              <button onClick={handleCreate} className="flex-1 py-3 rounded-xl bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-all">✦ Begin the companion</button>
            </div>
            <p className="text-center text-[11px] text-ink-400 italic mt-3">
              You can add characters, mysteries, and notes as you read.
            </p>
          </div>
        )}
      </div>
    </>
  )
}
