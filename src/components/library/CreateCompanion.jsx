import { useState } from 'react'
import { Ico } from '../shared/icons.jsx'
import SectionLabel from '../shared/SectionLabel.jsx'

export default function CreateCompanion({ onCreate, onCancel }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title:'', author:'', isbn:'', format:'print', spoilerMode:'relaxed',
    seriesName:'', seriesPos:'', seriesTotal:'', totalChapters:'',
  })
  const [coverErr, setCoverErr] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = () => {
    const n = parseInt(form.totalChapters) || 20
    const newBook = {
      id: `book_${Date.now()}`,
      title: form.title || 'Untitled',
      author: form.author || 'Unknown Author',
      isbn: form.isbn,
      format: form.format,
      spoilerMode: form.spoilerMode,
      status: 'reading',
      currentChapter: 1,
      totalChapters: n,
      lastUpdated: new Date().toISOString().split('T')[0],
      coverBg: 'linear-gradient(160deg,#3A6647 0%,#1E3828 100%)',
      mood: 'gold',
      readingLog: [],
      series: form.seriesName
        ? { name:form.seriesName, position:parseInt(form.seriesPos)||1, total:parseInt(form.seriesTotal)||0 }
        : null,
      chapters: Array.from({ length:n }, (_,i) => ({
        num:i+1, title:`Chapter ${i+1}`, completed:false, summary:null, reflection:null, important:false,
      })),
      characters:{ main:[], secondary:[], relationships:[] },
      mysteries:[], notes:[], discussionQuestions:[],
    }
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

  const coverUrl = form.isbn ? `https://covers.openlibrary.org/b/isbn/${form.isbn}-L.jpg` : null
  const inputCls = "w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-800 placeholder-ink-400 bg-white transition-all"

  return (
    <>
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
        {step === 1 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">Tell me about your book</h1>
            <p className="text-sm text-ink-500 mb-7">We'll build your companion from here.</p>

            <div className="flex gap-5 mb-7">
              <div className="flex-shrink-0">
                {coverUrl && !coverErr ? (
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

            <div className="mb-7">
              <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-3">Format</label>
              <div className="flex gap-3">
                {formats.map(f => (
                  <button key={f.k} onClick={() => set('format', f.k)}
                    className={`flex-1 py-3.5 rounded-xl border-2 text-[13px] font-medium transition-all ${
                      form.format === f.k
                        ? 'border-gold bg-gold-bg text-gold'
                        : 'border-ink-200 text-ink-600 hover:border-ink-300 bg-white'
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

        {step === 2 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">Chapter structure</h1>
            <p className="text-sm text-ink-500 mb-7">How is this book organised?</p>

            <div className="space-y-5 mb-8">
              <div>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">Total chapters / parts</label>
                <input type="number" value={form.totalChapters}
                  onChange={e => set('totalChapters', e.target.value)}
                  placeholder="29" className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-ink-500 uppercase tracking-widest mb-1.5">
                  Series name <span className="normal-case font-normal text-ink-400">(optional)</span>
                </label>
                <input type="text" value={form.seriesName} onChange={e => set('seriesName', e.target.value)}
                  placeholder="Kingkiller Chronicle" className={`${inputCls} mb-3`} />
                {form.seriesName && (
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
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-all">← Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-all">Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">Spoiler settings</h1>
            <p className="text-sm text-ink-500 mb-7">How careful should Shadow Scribe be about future chapters?</p>

            <div className="space-y-2.5 mb-7">
              {spoilerModes.map(m => (
                <button key={m.k} onClick={() => set('spoilerMode', m.k)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    form.spoilerMode === m.k ? 'border-gold bg-gold-bg' : 'border-ink-200 hover:border-ink-300 bg-white'
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

            <div className="p-4 rounded-xl bg-cream-200 border border-ink-200 mb-6">
              <SectionLabel>Your companion</SectionLabel>
              <p className="font-serif text-ink-900 font-semibold">{form.title || 'Untitled'}</p>
              <p className="text-[12px] text-ink-500 mt-0.5">
                {form.author || 'Unknown'} · {form.format} · {form.totalChapters || '?'} chapters · {form.spoilerMode} spoilers
              </p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-ink-200 text-sm font-semibold text-ink-600 hover:bg-ink-100 transition-all">← Back</button>
              <button onClick={handleCreate} className="flex-1 py-3 rounded-xl bg-gold text-white font-semibold text-sm hover:bg-gold-light transition-all">✦ Create Companion</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
