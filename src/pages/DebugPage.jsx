/**
 * DebugPage — Narrative Extraction QA Panel
 *
 * Accessible at /debug (not linked from main nav — direct URL only, or via Settings).
 * Shows per-book extraction quality: character list with mention counts,
 * mystery seeds with source chapters, chapter summary previews,
 * and localStorage usage stats.
 *
 * Dev/QA use only. No production-facing functionality here.
 */

import { useState } from 'react'
import { useBooks }    from '../context/BooksContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { estimateLocalStorageUsage, estimateBookSize } from '../utils/storage.js'
import { fmtDate } from '../utils/date.js'
import {
  assembleReflectionContext,
  hashContext,
  shouldRegenerate,
  generateRuleBasedReflections,
  analyzeNoteThemes,
  detectInterpretationShifts,
  buildNoteLinkClusters,
  computeResonanceWeights,
  MIN_RESURFACE_MS,
} from '../utils/reflectionEngine.js'
import { buildAIReflectionContext } from '../utils/aiExtractor.js'

function Badge({ children, color = 'ink' }) {
  const colors = {
    ink:    'bg-ink-100 text-ink-600 border-ink-200',
    sage:   'bg-sage-bg text-sage border-sage-pale',
    sienna: 'bg-sienna-bg text-sienna border-sienna-pale',
    gold:   'bg-gold-bg text-gold border-gold-border',
    ember:  'text-ember border-ember/30',
  }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${colors[color] ?? colors.ink}`}>
      {children}
    </span>
  )
}

function StorageBar({ pct }) {
  const color = pct > 75 ? 'bg-ember' : pct > 50 ? 'bg-gold' : 'bg-sage'
  return (
    <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

function ChapterSummaryRow({ ch }) {
  const [open, setOpen] = useState(false)
  const hasSummary = !!ch.summary
  return (
    <div className="border-b border-ink-100 last:border-b-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-cream-50 transition-colors">
        <span className="text-[10px] font-semibold text-ink-400 w-6 tabular-nums flex-shrink-0">
          {ch.num}
        </span>
        <span className={`text-[12px] flex-1 truncate ${hasSummary ? 'text-ink-700' : 'text-ink-300 italic'}`}>
          {hasSummary ? ch.summary.slice(0, 80) + (ch.summary.length > 80 ? '…' : '') : 'No summary'}
        </span>
        {hasSummary && <span className="text-[10px] text-ink-300">{open ? '▲' : '▼'}</span>}
      </button>
      {open && hasSummary && (
        <div className="px-12 pb-2.5">
          <p className="text-[12px] text-ink-600 leading-relaxed italic border-l-2 border-ink-200 pl-3">
            {ch.summary}
          </p>
        </div>
      )}
    </div>
  )
}

function BookPanel({ book }) {
  const [open, setOpen] = useState(false)
  const extracted = book.narrativeExtracted
  const meta = book.extractionMeta
  const { kb } = estimateBookSize(book)
  const mainChars  = book.characters?.main     ?? []
  const secChars   = book.characters?.secondary ?? []
  const mysteries  = book.mysteries ?? []
  const allChars   = [...mainChars, ...secChars]
  const extractedChars = allChars.filter(c => c.extracted)
  const extractedMysts = mysteries.filter(m => m.extracted)

  return (
    <div className="border border-ink-200 rounded-xl overflow-hidden mb-4">
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-cream-50 hover:bg-cream-200 transition-colors text-left">
        <span className="font-serif text-[14px] font-semibold text-ink-900 flex-1 truncate">
          {book.title}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {extracted
            ? <Badge color="sage">extracted</Badge>
            : <Badge color="ink">manual</Badge>}
          <Badge color="ink">{kb}KB</Badge>
          {meta?.warnings?.length > 0 && <Badge color="sienna">{meta.warnings.length} warn</Badge>}
        </div>
        <span className="text-[10px] text-ink-300 flex-shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-5 bg-white">

          {/* Extraction meta */}
          {meta && (
            <section>
              <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-2">Extraction metadata</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['Chapters extracted', meta.chaptersExtracted ?? '—'],
                  ['Summaries generated', meta.summariesGenerated ?? '—'],
                  ['Characters found', meta.characterCount ?? '—'],
                  ['Mysteries found', meta.mysteryCount ?? '—'],
                ].map(([label, val]) => (
                  <div key={label} className="bg-cream-50 rounded-lg p-2.5 border border-ink-100">
                    <p className="text-[18px] font-bold text-ink-900 tabular-nums">{val}</p>
                    <p className="text-[10px] text-ink-400">{label}</p>
                  </div>
                ))}
              </div>
              {meta.warnings?.length > 0 && (
                <div className="mt-3 space-y-1">
                  {meta.warnings.map((w, i) => (
                    <p key={i} className="text-[11px] text-sienna bg-sienna-bg border border-sienna-pale rounded-lg px-3 py-1.5">{w}</p>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Characters */}
          <section>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-2">
              Characters ({allChars.length} total · {extractedChars.length} extracted)
            </p>
            {allChars.length === 0 ? (
              <p className="text-[12px] text-ink-300 italic">None</p>
            ) : (
              <div className="space-y-1">
                {allChars.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-[12px]">
                    <span className={`font-medium ${c.extracted ? 'text-ink-700' : 'text-ink-500'}`}>{c.name}</span>
                    <span className="text-ink-400">{c.role ?? 'Character'}</span>
                    {c.revealChapter > 0 && (
                      <span className="text-ink-300">Ch. {c.revealChapter}</span>
                    )}
                    {c.mentionCount != null && (
                      <span className="text-ink-300 tabular-nums">×{c.mentionCount}</span>
                    )}
                    {c.extracted && <Badge color="gold">auto</Badge>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Mysteries */}
          <section>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-2">
              Mysteries ({mysteries.length} total · {extractedMysts.length} extracted)
            </p>
            {mysteries.length === 0 ? (
              <p className="text-[12px] text-ink-300 italic">None</p>
            ) : (
              <div className="space-y-2">
                {mysteries.map(m => (
                  <div key={m.id} className="flex items-start gap-2">
                    <span className="text-ink-300 text-[10px] mt-0.5 flex-shrink-0 tabular-nums">Ch.{m.chapter}</span>
                    <p className="text-[12px] text-ink-600 leading-relaxed flex-1">{m.text}</p>
                    {m.extracted && <Badge color="gold">auto</Badge>}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Chapter summaries */}
          <section>
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-2">
              Chapter summaries ({book.chapters.filter(c => c.summary).length} of {book.chapters.length})
            </p>
            <div className="border border-ink-100 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {book.chapters.map(ch => <ChapterSummaryRow key={ch.num} ch={ch} />)}
            </div>
          </section>

        </div>
      )}
    </div>
  )
}

// ── Reflection Inspector ──────────────────────────────────────────────────────

function ReflectionPanel({ book, settings, onUpdateBook }) {
  const ctx         = assembleReflectionContext(book, settings)
  const hash        = hashContext(ctx)
  const cache       = book.reflectionCache
  const stale       = shouldRegenerate(book, hash)
  const reflections = cache?.reflections ?? []
  const [preview,     setPreview]     = useState(null)
  const [aiCtxOpen,   setAiCtxOpen]   = useState(false)

  const aiCtx = aiCtxOpen ? buildAIReflectionContext(ctx) : null

  const handlePreview = () => {
    const r = generateRuleBasedReflections(ctx, settings.insightStyle)
    setPreview(r)
  }

  const handleForceRegen = () => {
    const r = generateRuleBasedReflections(ctx, settings.insightStyle)
    if (!r.length) return
    onUpdateBook(book.id, {
      reflectionCache: {
        contextHash: hash,
        generatedAt: new Date().toISOString(),
        reflections: r,
        aiEnhanced:  false,
      },
    })
    setPreview(null)
  }

  return (
    <div className="border border-ink-100 rounded-xl overflow-hidden mb-4">
      <div className="px-4 py-3 bg-cream-50 flex items-center gap-3">
        <span className="font-serif text-[13px] font-semibold text-ink-900 flex-1 truncate">{book.title}</span>
        <div className="flex items-center gap-1.5">
          {cache
            ? <Badge color="sage">{reflections.length} cached</Badge>
            : <Badge color="ink">no cache</Badge>}
          {cache?.aiEnhanced && <Badge color="gold">AI</Badge>}
          {stale && <Badge color="sienna">stale</Badge>}
        </div>
      </div>

      <div className="px-4 py-3 space-y-3 bg-white">
        {/* Context snapshot */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            ['Notes',      ctx.noteCount],
            ['Theories',   ctx.theoryNotes.length],
            ['Revised',    ctx.revisedNotes.length],
            ['Reflected',  ctx.reflectedNotes.length],
            ['Mysteries',  ctx.openMysteries.length],
            ['Sessions',   ctx.sessionCount],
          ].map(([label, val]) => (
            <div key={label} className="bg-cream-50 rounded-lg px-2.5 py-2 border border-ink-100 text-center">
              <p className="text-[16px] font-bold text-ink-900 tabular-nums">{val}</p>
              <p className="text-[10px] text-ink-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Context hash */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-ink-400">Context hash:</span>
          <code className="font-mono text-ink-600 bg-ink-100 px-1.5 py-0.5 rounded">{hash}</code>
          {cache && (
            <>
              <span className="text-ink-300">·</span>
              <span className="text-ink-400">cached: <code className="font-mono text-ink-600">{cache.contextHash}</code></span>
            </>
          )}
        </div>

        {/* Temporal evolution signal */}
        {ctx.temporalEvolution && (
          <p className="text-[11px] text-ink-500">
            Pattern signal: <span className="font-medium text-ink-700">{ctx.temporalEvolution}</span>
          </p>
        )}

        {/* AI context inspector */}
        <div className="border border-ink-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setAiCtxOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2 bg-cream-50 hover:bg-cream-200 text-left transition-colors">
            <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-widest">AI context payload</span>
            <span className="text-[10px] text-ink-300">{aiCtxOpen ? '▲' : '▼'}</span>
          </button>
          {aiCtxOpen && aiCtx && (
            <div className="px-3 py-2.5 space-y-2.5 bg-white">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-ink-400">Lines:</span>
                <span className="font-medium text-ink-700">{aiCtx.lines.length}</span>
                <span className="text-ink-300">·</span>
                <span className="text-ink-400">~{aiCtx.estimatedChars} chars</span>
                <span className="text-ink-300">·</span>
                <span className="text-ink-400">Signals:</span>
                <div className="flex gap-1 flex-wrap">
                  {aiCtx.signals.map(s => (
                    <Badge key={s} color={s === 'interpretation-shift' ? 'sienna' : s === 'resonance-anchor' || s === 'theme-persistence' ? 'sage' : 'ink'}>{s}</Badge>
                  ))}
                  {aiCtx.signals.length === 0 && <span className="text-ink-300 italic">none</span>}
                </div>
              </div>
              {aiCtx.lines.length > 0 ? (
                <div className="space-y-1">
                  {aiCtx.lines.map((line, i) => (
                    <p key={i} className="text-[11px] text-ink-600 leading-relaxed font-mono bg-ink-50 rounded px-2 py-1">
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-ink-300 italic">No context lines — insufficient note signal</p>
              )}
            </div>
          )}
        </div>

        {/* Cached reflections */}
        {reflections.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest">
              Cached reflections
              {cache?.generatedAt && <span className="ml-2 font-normal normal-case">{fmtDate(cache.generatedAt.split('T')[0])}</span>}
            </p>
            {reflections.map(r => {
              const cooling = r.lastSurfaced && (Date.now() - new Date(r.lastSurfaced).getTime() < MIN_RESURFACE_MS)
              return (
                <div key={r.id} className={`space-y-1 pb-2 border-b border-ink-50 last:border-0 last:pb-0 ${cooling ? 'opacity-40' : ''}`}>
                  <div className="flex items-start gap-2.5 text-[12px]">
                    <span className="text-ink-300 flex-shrink-0 tabular-nums mt-0.5">×{r.surfaceCount ?? 0}</span>
                    <p className="text-ink-600 italic leading-relaxed flex-1">"{r.text}"</p>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <Badge color={r.type === 'ai' ? 'gold' : 'ink'}>{r.type === 'ai' ? 'AI' : 'rule'}</Badge>
                        <Badge color={r.priority === 3 ? 'sienna' : r.priority === 2 ? 'sage' : 'ink'}>p{r.priority ?? 1}</Badge>
                      </div>
                      {r.lastSurfaced && (
                        <span className="text-[10px] text-ink-300">{fmtDate(r.lastSurfaced.split('T')[0])}</span>
                      )}
                      {cooling && <span className="text-[10px] text-ink-300">cooling</span>}
                    </div>
                  </div>
                  {r._sourceSignals?.length > 0 && (
                    <div className="flex items-center gap-1 pl-7 flex-wrap">
                      <span className="text-[10px] text-ink-300">grounded in:</span>
                      {r._sourceSignals.map(s => (
                        <Badge key={s} color="ink">{s}</Badge>
                      ))}
                      {r._sourceLineCount != null && (
                        <span className="text-[10px] text-ink-300 ml-1">{r._sourceLineCount} ctx lines</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Preview of fresh rule-based generation */}
        {preview && (
          <div className="space-y-2 border-t border-ink-100 pt-3">
            <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest">
              Preview (not saved)
            </p>
            {preview.map((r, i) => (
              <p key={i} className="text-[12px] text-ink-600 italic leading-relaxed">"{r.text}"</p>
            ))}
          </div>
        )}

        {/* Spoiler boundary check */}
        <div className="text-[11px] text-ink-400 border-t border-ink-100 pt-2">
          Spoiler mode: <span className="font-medium text-ink-600">{book.spoilerMode ?? settings?.spoilerMode ?? 'relaxed'}</span>
          {' · '}Chapter {book.currentChapter} of {book.totalChapters}
          {' · '}Visible mysteries: {ctx.openMysteries.length} of {book.mysteries?.length ?? 0}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap border-t border-ink-100 pt-2">
          <button
            onClick={handlePreview}
            className="text-[11px] font-medium text-ink-600 border border-ink-200 rounded-lg px-2.5 py-1 hover:bg-ink-100 transition-colors">
            Preview rule-based
          </button>
          <button
            onClick={handleForceRegen}
            className="text-[11px] font-medium text-ink-600 border border-ink-200 rounded-lg px-2.5 py-1 hover:bg-ink-100 transition-colors">
            Force regenerate
          </button>
          {cache && (
            <button
              onClick={() => onUpdateBook(book.id, { reflectionCache: null })}
              className="text-[11px] font-medium text-ember border border-ember-pale rounded-lg px-2.5 py-1 hover:bg-ember-bg transition-colors">
              Clear cache
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Note Intelligence Inspector ───────────────────────────────────────────────

function NoteIntelligencePanel({ book }) {
  const notes = book.notes || []

  if (!notes.length) {
    return (
      <div className="border border-ink-100 rounded-xl p-4 mb-4 text-center">
        <p className="text-[12px] text-ink-400 italic">No notes yet for <em>{book.title}</em></p>
      </div>
    )
  }

  const { themeCount, dominantTheme } = analyzeNoteThemes(notes)
  const shifts          = detectInterpretationShifts(notes)
  const clusters        = buildNoteLinkClusters(notes)
  const resonanceW      = computeResonanceWeights(notes)
  const highResNotes    = [...notes]
    .filter(n => (resonanceW[n.id] || 1) >= 4)
    .sort((a, b) => (resonanceW[b.id] || 1) - (resonanceW[a.id] || 1))
    .slice(0, 3)
  const themeEntries = Object.entries(themeCount).sort((a, b) => b[1] - a[1])

  return (
    <div className="border border-ink-100 rounded-xl overflow-hidden mb-4">
      <div className="px-4 py-3 bg-cream-50 flex items-center gap-3">
        <span className="font-serif text-[13px] font-semibold text-ink-900 flex-1 truncate">{book.title}</span>
        <div className="flex items-center gap-1.5">
          <Badge color="ink">{notes.length} notes</Badge>
          {dominantTheme && <Badge color="gold">{dominantTheme}</Badge>}
        </div>
      </div>
      <div className="px-4 py-3 space-y-4 bg-white">

        {/* Theme distribution */}
        <section>
          <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-2">Theme distribution</p>
          {themeEntries.length === 0 ? (
            <p className="text-[12px] text-ink-300 italic">No themes detected</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {themeEntries.map(([theme, count]) => (
                <span key={theme} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-ink-100 text-ink-600 border border-ink-200">
                  {theme} <span className="text-ink-400">×{count}</span>
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Interpretation shifts */}
        <section>
          <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-2">Interpretation shifts</p>
          {shifts.length === 0 ? (
            <p className="text-[12px] text-ink-300 italic">None detected</p>
          ) : (
            <div className="space-y-2">
              {shifts.map((s, i) => (
                <div key={i} className="text-[12px] space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink-700">{s.name}</span>
                    <span className="text-ink-400">{s.earlyValence} → {s.lateValence}</span>
                    <span className="text-ink-300">×{s.noteCount} notes</span>
                  </div>
                  <p className="text-ink-500 italic leading-relaxed pl-2 border-l-2 border-ink-100">{s.text}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* High-resonance notes */}
        <section>
          <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-2">High-resonance notes (score ≥ 4)</p>
          {highResNotes.length === 0 ? (
            <p className="text-[12px] text-ink-300 italic">None</p>
          ) : (
            <div className="space-y-2">
              {highResNotes.map(n => (
                <div key={n.id} className="flex items-start gap-2 text-[12px]">
                  <Badge color="gold">{resonanceW[n.id]}</Badge>
                  <Badge color="ink">{n.tag}</Badge>
                  <p className="text-ink-600 italic leading-relaxed flex-1">
                    "{n.text.slice(0, 80)}{n.text.length > 80 ? '…' : ''}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Link clusters */}
        <section>
          <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-2">Top link clusters</p>
          {clusters.length === 0 ? (
            <p className="text-[12px] text-ink-300 italic">None</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {clusters.slice(0, 6).map((cl, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] bg-cream-50 border border-ink-100 rounded-lg px-2.5 py-1.5">
                  <Badge color={cl.type === 'theme' ? 'gold' : 'sage'}>{cl.type}</Badge>
                  <span className="font-medium text-ink-700">{cl.label}</span>
                  <span className="text-ink-400">×{cl.weight}</span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default function DebugPage() {
  const { books, updateBook } = useBooks()
  const { settings }          = useSettings()
  const storage = estimateLocalStorageUsage()
  const [filter, setFilter] = useState('all')     // 'all' | 'extracted' | 'manual'
  const [panel,  setPanel]  = useState('extraction') // 'extraction' | 'reflection' | 'intelligence'

  const visible = books.filter(b => {
    if (filter === 'extracted') return b.narrativeExtracted
    if (filter === 'manual')    return !b.narrativeExtracted
    return true
  })

  return (
    <main className="max-w-3xl mx-auto px-5 sm:px-8 py-8 pb-16">

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full bg-sienna-bg text-sienna border border-sienna-pale">
            Dev / QA
          </span>
        </div>
        <h1 className="font-serif text-2xl font-bold text-ink-900">Companion Inspector</h1>
        <p className="text-sm text-ink-500 mt-1">
          Narrative extraction quality and reflection engine diagnostics. Not linked from the main UI.
        </p>
      </div>

      {/* Section toggle */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          ['extraction',   'Narrative Extraction'],
          ['reflection',   'Reflection Engine'],
          ['intelligence', 'Note Intelligence'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setPanel(k)}
            className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all ${
              panel === k ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:border-ink-400'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {/* Reflection Inspector panel */}
      {panel === 'reflection' && (
        <div className="mb-10">
          <p className="text-[12px] text-ink-500 mb-5 leading-relaxed">
            Inspect the reflection cache, context signals, and spoiler boundary for each companion.
            Use "Preview rule-based" to see what would generate without saving.
            Use "Force regenerate" to refresh the cache.
          </p>
          {books.map(b => (
            <ReflectionPanel key={b.id} book={b} settings={settings} onUpdateBook={updateBook} />
          ))}
        </div>
      )}

      {/* Note Intelligence panel */}
      {panel === 'intelligence' && (
        <div className="mb-10">
          <p className="text-[12px] text-ink-500 mb-5 leading-relaxed">
            Theme inference, interpretation shifts, resonance scores, and note link clusters.
            All computed on-demand from existing notes — nothing stored beyond <code className="font-mono text-ink-700 bg-ink-100 px-1 rounded">priority</code> on cached reflections.
          </p>
          {books.map(b => (
            <NoteIntelligencePanel key={b.id} book={b} />
          ))}
        </div>
      )}

      {/* Extraction inspector (conditionally shown) */}
      {panel === 'extraction' && (<>
        {/* Storage stats */}
        <div className="bg-cream-50 border border-ink-200 rounded-xl p-4 mb-8">
          <p className="text-[10px] font-semibold text-ink-400 uppercase tracking-widest mb-3">localStorage usage</p>
          <StorageBar pct={storage.pctOf5MB} />
          <div className="flex items-center justify-between mt-2">
            <span className="text-[12px] text-ink-600">{storage.mb} MB used</span>
            <span className="text-[12px] text-ink-400">{storage.pctOf5MB}% of 5 MB limit</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {books.map(b => {
              const { kb } = estimateBookSize(b)
              return (
                <div key={b.id} className="text-[11px] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink-300 flex-shrink-0" />
                  <span className="truncate text-ink-500">{b.title}</span>
                  <span className="text-ink-300 flex-shrink-0">{kb}KB</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 mb-5">
          {[['all', 'All books'], ['extracted', 'Extracted'], ['manual', 'Manual only']].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-1 rounded-full text-[12px] font-medium transition-all ${
                filter === k ? 'bg-ink-900 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:border-ink-400'
              }`}>
              {l}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-ink-400">{visible.length} companion{visible.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Book panels */}
        {visible.length === 0 ? (
          <p className="text-[13px] text-ink-400 italic text-center py-12">No companions match this filter.</p>
        ) : (
          visible.map(b => <BookPanel key={b.id} book={b} />)
        )}
      </>)}

      <p className="text-center text-[11px] text-ink-300 italic mt-8">
        Shadow Scribe · Companion inspector · Dev/QA only
      </p>
    </main>
  )
}
