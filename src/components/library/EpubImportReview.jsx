import { useState, useRef, useEffect } from 'react'
import { uid } from '../../utils/uid.js'
import { useNavigate } from 'react-router-dom'
import { Ico } from '../shared/icons.jsx'
import SectionLabel from '../shared/SectionLabel.jsx'
import { MOOD_CONFIG, STRUCTURE_TYPES, CHAPTER_TYPES } from '../../data/config.js'
import { useSettings } from '../../context/SettingsContext.jsx'
import { extractNarrative } from '../../utils/narrativeExtractor.js'
import { aiExtractNarrative } from '../../utils/aiExtractor.js'
import { useBooks } from '../../context/BooksContext.jsx'
import { fetchCoverUrl } from '../../utils/coverLookup.js'

const MOOD_COLORS = {
  sage: '#3A6647', ember: '#9B2335', ink: '#44403C',
  sienna: '#8B4513', gold: '#B8860B', steel: '#2D4A6B',
}

const TYPE_LABELS = { chapter:'Ch.', part:'Pt.', section:'§', prologue:'Pro.', epilogue:'Epi.', interlude:'Int.' }

const spoilerModes = [
  { k:'strict',  l:'Strict',        desc:'Never show upcoming chapter info' },
  { k:'relaxed', l:'Relaxed',       desc:'Show chapter titles, hide plot details' },
  { k:'full',    l:'Full Spoilers', desc:'Show everything freely' },
]

// Cycle through chapter types for manual override
const CYCLE_TYPES = ['chapter', 'part', 'section', 'prologue', 'epilogue', 'interlude']
function nextType(t) { return CYCLE_TYPES[(CYCLE_TYPES.indexOf(t) + 1) % CYCLE_TYPES.length] }

// ── Transform EPUB import into a Shadow Scribe companion object ──────────────
function buildBook(epubData, form) {
  const n = parseInt(form.totalChapters) || epubData.totalChapters || 20
  const labelPrefix = form.structureType === 'part' ? 'Part' : form.structureType === 'section' ? 'Section' : 'Chapter'

  // Use EPUB-detected chapters if count matches; otherwise regenerate with generic titles
  let chapters
  if (form.chapters.length === n) {
    chapters = form.chapters.map((ch, i) => ({
      num: i + 1,
      title: ch.title || `${labelPrefix} ${i + 1}`,
      type: ch.type || form.structureType,
      completed: false,
      summary: null,
      reflection: null,
      important: false,
    }))
  } else {
    // User changed the count — pad/trim EPUB chapters, fill gaps with generic titles
    chapters = Array.from({ length: n }, (_, i) => {
      const src = form.chapters[i]
      return {
        num: i + 1,
        title: src?.title || `${labelPrefix} ${i + 1}`,
        type: src?.type || form.structureType,
        completed: false,
        summary: null,
        reflection: null,
        important: false,
      }
    })
  }

  return {
    id: uid('book_'),
    title: form.title || 'Untitled',
    author: form.author || 'Unknown Author',
    isbn: form.isbn || null,
    coverData: epubData.coverData || null,
    format: form.format,
    spoilerMode: form.spoilerMode,
    structureType: form.structureType,
    status: 'reading',
    currentChapter: 1,
    totalChapters: n,
    lastUpdated: new Date().toISOString().split('T')[0],
    coverBg: `linear-gradient(160deg,${MOOD_COLORS[form.mood]}CC 0%,${MOOD_COLORS[form.mood]}66 100%)`,
    mood: form.mood,
    depthLevel: form.depthLevel,
    readingLog: [],
    series: form.hasSeries && form.seriesName
      ? { name: form.seriesName, position: parseInt(form.seriesPos) || 1, total: parseInt(form.seriesTotal) || 0 }
      : null,
    chapters,
    characters: { main: [], secondary: [], relationships: [] },
    mysteries: [], notes: [], discussionQuestions: [], userDiscussionQuestions: [],
  }
}

// Atmospheric loading phrases — rule-based path
const EXTRACTION_PHRASES = [
  'The companion is gathering what it knows…',
  'Tracing recurring names through the pages…',
  'The chronicle is taking shape…',
  'Noting threads that remain unresolved…',
  'Listening for what the story holds…',
  'The archive is organizing the chronicle…',
]

// Atmospheric loading phrases — AI path
const AI_EXTRACTION_PHRASES = [
  'Claude is reading through the chapters…',
  'Listening for the characters in the story…',
  'The mysteries are beginning to take shape…',
  'Tracing what the narrative holds in reserve…',
  'The companion is gathering its understanding…',
  'Almost there — the chronicle is forming…',
]

// ── Main component ────────────────────────────────────────────────────────────
export default function EpubImportReview({ importData, duplicateWarning, onCreate, onBack }) {
  const { settings } = useSettings()
  const { updateBook } = useBooks()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [editingIdx, setEditingIdx] = useState(null)
  const [showAllChapters, setShowAllChapters] = useState(false)
  const [coverErr, setCoverErr] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [extractPhrase, setExtractPhrase] = useState(EXTRACTION_PHRASES[0])
  const [phraseKey, setPhraseKey] = useState(0)
  const phraseRef = useRef(0)

  const [form, setForm] = useState({
    title:         importData.title,
    author:        importData.author,
    isbn:          importData.isbn || '',
    format:        settings.defaultFormat ?? 'print',
    mood:          'gold',                                          // kept for cover gradient (silent default)
    depthLevel:    settings.defaultDepthLevel ?? 'resonant',        // companion engagement level
    spoilerMode:   settings.spoilerMode ?? 'relaxed',
    structureType: importData.structureType,
    totalChapters: String(importData.totalChapters),
    chapters:      importData.chapters.map(ch => ({ ...ch })),
    hasSeries: false, seriesName: '', seriesPos: '', seriesTotal: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const updateChapter = (i, changes) => setForm(f => ({
    ...f,
    chapters: f.chapters.map((ch, idx) => idx === i ? { ...ch, ...changes } : ch),
  }))

  // Rotate loading phrases while extraction runs
  useEffect(() => {
    if (!extracting) return
    const phrases = settings.anthropicKey?.trim() ? AI_EXTRACTION_PHRASES : EXTRACTION_PHRASES
    const timer = setInterval(() => {
      phraseRef.current = (phraseRef.current + 1) % phrases.length
      setExtractPhrase(phrases[phraseRef.current])
      setPhraseKey(k => k + 1)
    }, 3500)
    return () => clearInterval(timer)
  }, [extracting, settings.anthropicKey])

  const handleCreate = async () => {
    const hasContent = importData.chapterContents && Object.keys(importData.chapterContents).length > 0

    // Pick phrase set before showing overlay
    const phrases = hasAiKey ? AI_EXTRACTION_PHRASES : EXTRACTION_PHRASES
    phraseRef.current = 0
    setExtractPhrase(phrases[0])
    setExtracting(true)

    // Yield to React so the loading overlay renders before any work starts
    await new Promise(r => setTimeout(r, 150))

    try {
      const book = buildBook(importData, form)

      if (hasContent) {
        let result

        if (hasAiKey) {
          // ── AI extraction path ─────────────────────────────────────────
          try {
            result = await aiExtractNarrative(
              importData.chapterContents,
              book.chapters,
              settings.anthropicKey || '',
              { title: book.title, author: book.author },
            )
          } catch (aiErr) {
            console.warn('AI extraction failed, falling back to rule-based:', aiErr)
            result = extractNarrative(importData.chapterContents, book.chapters)
            result.extractionMeta = {
              ...result.extractionMeta,
              aiFailedFallback: true,
              warnings: [
                ...(result.extractionMeta.warnings ?? []),
                `AI extraction failed: ${aiErr.message}`,
              ],
            }
          }
        } else {
          // ── Rule-based extraction path ─────────────────────────────────
          result = extractNarrative(importData.chapterContents, book.chapters)
        }

        const { characters, summaries, mysteries, extractionMeta } = result

        if (characters.main.length > 0 || characters.secondary.length > 0) {
          book.characters = characters
        }
        if (mysteries.length > 0) {
          book.mysteries = mysteries
        }
        book.chapters = book.chapters.map(ch => ({
          ...ch,
          summary: summaries[ch.num] ?? null,
        }))
        book.narrativeExtracted = true
        book.extractionMeta = extractionMeta
      }

      onCreate(book)
      // Fire cover lookup if the EPUB had no embedded cover image
      if (!book.coverData) {
        fetchCoverUrl(book.title, book.author, book.isbn)
          .then(url => { if (url) updateBook(book.id, { coverUrl: url }) })
      }
    } catch {
      // Total failure — create companion without any extraction
      setExtracting(false)
      const fallbackBook = buildBook(importData, form)
      onCreate(fallbackBook)
      if (!fallbackBook.coverData) {
        fetchCoverUrl(fallbackBook.title, fallbackBook.author, fallbackBook.isbn)
          .then(url => { if (url) updateBook(fallbackBook.id, { coverUrl: url }) })
      }
    }
  }

  const hasAiKey = true // proxy available for alpha testers without personal key

  const inputCls = "w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-800 placeholder-ink-400 bg-cream-200 transition-all"

  const displayChapters = showAllChapters ? form.chapters : form.chapters.slice(0, 8)
  const hasMore = form.chapters.length > 8

  const coverSrc = importData.coverData && !coverErr ? importData.coverData
    : (form.isbn && !coverErr) ? `https://covers.openlibrary.org/b/isbn/${form.isbn}-M.jpg`
    : null

  return (
    <>
      {/* ── Extraction loading overlay ── */}
      {extracting && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-fade-in"
          style={{ background: 'var(--color-bg)' }}
        >
          {/* Atmospheric glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: [
              'radial-gradient(ellipse 70% 50% at 50% 38%, color-mix(in srgb, var(--color-accent) 9%, transparent) 0%, transparent 65%)',
              'radial-gradient(ellipse 40% 30% at 70% 65%, color-mix(in srgb, var(--color-accent) 4%, transparent) 0%, transparent 60%)',
            ].join(', '),
          }} />
          {/* Content */}
          <div className="text-center relative" style={{ maxWidth: 320, padding: '0 32px' }}>
            <span
              className="epub-spark"
              style={{ fontSize: 18, color: 'var(--color-accent)', marginBottom: 28 }}
            >✦</span>
            <div key={phraseKey} className="phrase-reveal">
              <p
                className="font-serif leading-relaxed"
                style={{ fontSize: 17, color: 'var(--color-text-secondary)', marginBottom: 0 }}
              >
                {extractPhrase}
              </p>
            </div>
            <p
              className="font-serif italic"
              style={{ fontSize: 12, color: 'var(--color-text-dim)', opacity: 0.5, marginTop: 18 }}
            >
              Preparing your companion…
            </p>
          </div>
        </div>
      )}
      {/* Progress header */}
      <div className="border-b border-ink-200 bg-cream-50">
        <div className="max-w-xl mx-auto px-5 sm:px-8 h-12 flex items-center gap-4">
          <button onClick={onBack}
            className="flex items-center gap-1.5 text-ink-500 hover:text-ink-800 text-sm transition-colors flex-shrink-0">
            <Ico.Left /> Back
          </button>
          <div className="flex-1 flex gap-1.5">
            {[1, 2, 3].map(s => (
              <div key={s}
                className={`h-[2px] flex-1 rounded-full transition-all duration-400 ${s <= step ? 'bg-gold' : 'bg-ink-200'}`}
              />
            ))}
          </div>
          <span className="text-[11px] text-ink-400 font-medium tabular-nums flex-shrink-0">{step} / 3</span>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-5 sm:px-8 py-8 pb-16 animate-slide-up">

        {/* ── Step 1: Book details ── */}
        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-5">
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: 'var(--color-gold-bg)', color: 'var(--color-gold)', border: '1px solid var(--color-gold-pale)' }}>
                From EPUB
              </span>
              <span className="text-[11px] text-ink-400 italic">Review and adjust before continuing</span>
            </div>

            {duplicateWarning && (
              <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-pale)' }}>
                <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-gold)' }}>{duplicateWarning}</p>
              </div>
            )}

            {importData.warnings.length > 0 && (
              <div className="mb-5 p-3 rounded-xl bg-sienna-bg border border-sienna-pale">
                {importData.warnings.map((w, i) => (
                  <p key={i} className="text-[12px] text-sienna leading-relaxed">{w}</p>
                ))}
              </div>
            )}

            <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">Review your book</h1>
            <p className="text-sm text-ink-500 mb-7">We extracted what we could — confirm or correct these details.</p>

            <div className="flex gap-5 mb-7">
              {/* Cover preview */}
              <div className="flex-shrink-0">
                {coverSrc ? (
                  <img src={coverSrc} onError={() => setCoverErr(true)} alt="Cover"
                    className="w-[72px] h-[108px] rounded-xl object-cover"
                    style={{ boxShadow: 'var(--shadow-panel)' }} />
                ) : (
                  <div className="w-[72px] h-[108px] rounded-xl flex items-center justify-center overflow-hidden"
                    style={{
                      background: `linear-gradient(160deg,${MOOD_COLORS[form.mood]}CC 0%,${MOOD_COLORS[form.mood]}66 100%)`
                    }}>
                    <p className="text-white font-serif text-center text-[9px] font-semibold px-2 leading-tight"
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,.35)' }}>
                      {form.title}
                    </p>
                  </div>
                )}
                {importData.coverData && !coverErr && (
                  <p className="text-[10px] text-ink-400 text-center mt-1.5">EPUB cover</p>
                )}
              </div>

              <div className="flex-1 space-y-3.5">
                <div>
                  <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">Title *</label>
                  <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">Author *</label>
                  <input type="text" value={form.author} onChange={e => set('author', e.target.value)}
                    className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">
                    ISBN <span className="normal-case font-normal text-ink-400">(for cover art, optional)</span>
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
                {[{ k:'print', l:'Print', icon:'📖' }, { k:'ebook', l:'E-Book', icon:'📱' }, { k:'audiobook', l:'Audiobook', icon:'🎧' }].map(f => (
                  <button key={f.k} onClick={() => set('format', f.k)}
                    className={`flex-1 py-3.5 rounded-xl border-2 text-[13px] font-medium transition-all ${
                      form.format === f.k ? 'border-gold bg-gold-bg text-gold' : 'border-ink-200 text-ink-600 hover:border-ink-300 bg-cream-200'
                    }`}>
                    <div className="text-xl mb-1">{f.icon}</div>{f.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Depth level — ritual choice, not a settings dial */}
            <div className="mb-7">
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
                        border:      selected ? '1px solid rgba(184,134,11,0.45)' : '1px solid var(--color-hairline)',
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
          </div>
        )}

        {/* ── Step 2: Chapter structure review ── */}
        {step === 2 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">Review chapters</h1>
            <p className="text-sm text-ink-500 mb-7">
              {form.chapters.length > 0
                ? `${form.chapters.length} chapter${form.chapters.length !== 1 ? 's' : ''} detected. Adjust if anything looks wrong.`
                : 'No chapters were detected. Enter the count manually.'}
            </p>

            <div className="space-y-5 mb-8">
              {/* Structure type */}
              <div>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-2">Structure</label>
                <div className="space-y-2">
                  {STRUCTURE_TYPES.map(s => (
                    <button key={s.k} onClick={() => set('structureType', s.k)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        form.structureType === s.k ? 'border-gold bg-gold-bg' : 'border-ink-200 bg-cream-200 hover:border-ink-300'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 transition-all ${
                          form.structureType === s.k ? 'border-gold bg-gold' : 'border-ink-300'
                        }`} />
                        <span className={`text-[13px] font-semibold ${form.structureType === s.k ? 'text-gold' : 'text-ink-700'}`}>{s.l}</span>
                        <span className="text-[12px] text-ink-400">{s.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chapter count */}
              <div>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">
                  Total {STRUCTURE_TYPES.find(s => s.k === form.structureType)?.l.toLowerCase() ?? 'chapters'}
                </label>
                <input type="number" value={form.totalChapters}
                  onChange={e => set('totalChapters', e.target.value)}
                  className={inputCls} />
              </div>

              {/* Chapter preview list */}
              {form.chapters.length > 0 && (
                <div>
                  <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-2">
                    Detected chapters
                    <span className="normal-case font-normal text-ink-400 ml-1">— tap type badge to cycle; tap title to edit</span>
                  </label>
                  <div className="border border-ink-200 rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
                    {displayChapters.map((ch, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2.5 border-b border-ink-100 last:border-b-0 bg-cream-200 hover:bg-cream-50 transition-colors">
                        {/* Type badge — tap to cycle */}
                        <button
                          onClick={() => updateChapter(i, { type: nextType(ch.type) })}
                          className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded border text-ink-500 border-ink-200 bg-ink-100 hover:border-ink-400 transition-colors tabular-nums"
                          title="Tap to change type">
                          {TYPE_LABELS[ch.type] ?? 'Ch.'}
                        </button>
                        {/* Editable title */}
                        {editingIdx === i ? (
                          <input
                            autoFocus
                            type="text"
                            value={ch.title}
                            onChange={e => updateChapter(i, { title: e.target.value })}
                            onBlur={() => setEditingIdx(null)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingIdx(null) }}
                            className="flex-1 text-[13px] text-ink-800 bg-transparent border-b border-gold outline-none py-0.5"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingIdx(i)}
                            className="flex-1 text-left text-[13px] text-ink-700 hover:text-ink-900 truncate transition-colors">
                            {ch.title}
                          </button>
                        )}
                      </div>
                    ))}
                    {hasMore && !showAllChapters && (
                      <button
                        onClick={() => setShowAllChapters(true)}
                        className="w-full text-center py-2.5 text-[12px] text-ink-400 hover:text-ink-600 bg-cream-50 border-t border-ink-100 transition-colors">
                        Show {form.chapters.length - 8} more…
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-400 italic mt-2">
                    You can also rename chapters later in the Progress tab.
                  </p>
                </div>
              )}

              {/* Series */}
              <div>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-2">Series</label>
                <button
                  onClick={() => set('hasSeries', !form.hasSeries)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-[13px] font-medium transition-all ${
                    form.hasSeries ? 'border-gold bg-gold-bg text-gold' : 'border-ink-200 bg-cream-200 text-ink-600 hover:border-ink-300'
                  }`}>
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
                      placeholder="Series name" className={inputCls} />
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

        {/* ── Step 3: Spoiler settings + confirm ── */}
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
                      {form.spoilerMode === m.k && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
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
              {importData.chapters.length > 0 && (
                <p className="text-[11px] text-ink-400 mt-1 italic">
                  {importData.chapters.length} chapters detected from EPUB
                  {importData.chapterContents && Object.keys(importData.chapterContents).length > 0 && (
                    <span className="ml-1" style={{ color: 'var(--color-gold)' }}>· Claude AI extraction ready ✦</span>
                  )}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                <span className="italic" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
                  Companion depth:{' '}
                  <span style={{ color: 'var(--color-ink-600)', fontStyle: 'normal', fontWeight: 500 }}>
                    {form.depthLevel === 'quiet'     ? 'Quiet'
                    : form.depthLevel === 'saturated' ? 'Saturated'
                    : 'Resonant'}
                  </span>
                </span>
              </div>
            </div>

            {/* Key-missing notice — shown before importing without AI ─────────── */}
            {!hasAiKey && importData.chapterContents && Object.keys(importData.chapterContents).length > 0 && (
              <div className="px-4 py-3 rounded-xl mb-1" style={{ background: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)' }}>
                <p className="italic leading-relaxed" style={{ fontSize: 12, color: 'var(--color-ink-600)' }}>
                  Without an Anthropic key, the companion will use basic pattern matching to read this EPUB — characters and themes may be less fully understood than with AI extraction.
                </p>
                <button
                  onClick={() => navigate('/settings')}
                  className="mt-2 italic underline decoration-dotted underline-offset-2 hover:text-ink-800 transition-colors"
                  style={{ fontSize: 11, color: 'var(--color-ink-500)' }}
                >
                  Add an API key in Settings for deeper analysis →
                </button>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-all">← Back</button>
              <button onClick={handleCreate} disabled={extracting} className="flex-1 py-3 rounded-xl bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-all disabled:opacity-60 disabled:cursor-not-allowed">✦ Build the companion</button>
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
