import { useState, useRef } from 'react'
import { uid } from '../../utils/uid.js'
import { Ico } from '../shared/icons.jsx'
import SectionLabel from '../shared/SectionLabel.jsx'
import { STRUCTURE_TYPES } from '../../data/config.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { useBooks } from '../../context/BooksContext.jsx'
import { parseEpub } from '../../utils/epubParser.js'
import EpubImportReview from './EpubImportReview.jsx'
import { track } from '../../utils/analytics.js'

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
  const { books } = useBooks()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title:'', author:'', isbn:'', format: settings.defaultFormat ?? 'print', mood:'gold',
    spoilerMode: settings.spoilerMode ?? 'relaxed', structureType:'chapter',
    hasSeries:false, seriesName:'', seriesPos:'', seriesTotal:'',
    totalChapters:'',
  })
  const [coverErr, setCoverErr] = useState(false)

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
      mood: form.mood,
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

  const coverUrl = form.isbn && !coverErr
    ? `https://covers.openlibrary.org/b/isbn/${form.isbn}-M.jpg`
    : null

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
            <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">Tell me about your book</h1>
            <p className="text-sm text-ink-500 mb-5">We'll build your companion from here.</p>

            {/* EPUB import affordance */}
            <div className="mb-7 p-4 rounded-xl border border-dashed border-ink-200 bg-cream-50">
              <p className="text-[12px] text-ink-500 mb-3 italic">Have an EPUB file? Import it to auto-detect chapters, characters, and themes.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".epub"
                className="hidden"
                onChange={e => handleEpubFile(e.target.files[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-ink-200 bg-cream-200 text-[13px] font-medium text-ink-700 hover:border-ink-400 hover:text-ink-900 transition-all">
                <Ico.Book /> Import from EPUB
              </button>
              {importError && (
                <p className="text-[12px] text-ember mt-2">{importError}</p>
              )}
            </div>

            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-5">Or enter details manually</p>

            <div className="flex gap-5 mb-7">
              <div className="flex-shrink-0">
                {coverUrl ? (
                  <img src={coverUrl} onError={() => setCoverErr(true)} alt="Cover"
                    className="w-[72px] h-[108px] rounded-xl object-cover"
                    style={{ boxShadow:'var(--shadow-panel)' }} />
                ) : (
                  <div className="w-[72px] h-[108px] rounded-xl bg-ink-100 border border-ink-200 flex items-center justify-center text-ink-300">
                    <Ico.Book />
                  </div>
                )}
                {form.isbn && !coverErr && <p className="text-[10px] text-ink-400 text-center mt-1.5">Preview</p>}
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

            <button onClick={() => form.title && setStep(2)}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                form.title ? 'bg-gold text-white hover:bg-gold-light' : 'bg-ink-100 text-ink-400 cursor-not-allowed'
              }`}>
              Continue →
            </button>
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
                {form.author || 'Unknown'} · {form.format} · {form.totalChapters || '?'} {form.structureType}s · {form.spoilerMode} spoilers
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
