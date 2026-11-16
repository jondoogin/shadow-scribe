import { useEffect, useRef, useState } from 'react'
import { BOOKS, REFLECTION } from '../../sample.js'
import { Icon } from '../../shared.jsx'
import { bandStyle, Sheet, Seg } from './ui.jsx'
import { SpMark } from './mark.jsx'

const HEATS = ['#FF5B2E', '#FFB627', '#00B39A', '#3D5AFE', '#FF8FB1', '#7CC4FF']
const TOTAL = 61
const SPOIL = /\b(darcy|wickham|pemberley|collins|marr(y|ies|ied|iage)|engag\w*|ending|end of the book|later on|dies?|elope\w*|propos\w*|what happens next)\b/i
const SUGGEST = ['Is Mr. Bennet teasing her?', 'Who has taken Netherfield?', 'Does Lizzy marry Darcy?', 'What does the first line mean?']

function answer(q, reached) {
  if (SPOIL.test(q)) return { sealed: true, text: `That reaches past chapter ${reached}, so I’m keeping it dark. Ask me again once you get there.` }
  if (/lizzy|elizabeth/i.test(q)) return { text: 'Mr. Bennet singles her out in chapter 1: his “little Lizzy” has “something more of quickness than her sisters.” Mrs. Bennet disagrees, which tells you as much about the parents as about Lizzy.' }
  if (/bingley|netherfield|taken|tenant/i.test(q)) return { text: 'All chapter 1 tells us is that Netherfield is taken by “a young man of large fortune from the north of England,” a Mr. Bingley, who moves in before Michaelmas. Mrs. Bennet has already decided he’s meant for one of her daughters.' }
  if (/mrs\.? bennet|mother|wife/i.test(q)) return { text: 'The chapter ends by summing her up: “a woman of mean understanding, little information, and uncertain temper.” The business of her life is getting her daughters married.' }
  if (/mr\.? bennet|father|teas/i.test(q)) return { text: 'The narrator calls him “a mixture of quick parts, sarcastic humour, reserve, and caprice.” He teases her by pretending not to care, and she never quite gets the joke.' }
  if (/first line|truth|universal|mean|line|paragraph/i.test(q)) return { text: 'It sounds like a rule of the world, but by the end of the page it’s clearly Mrs. Bennet’s rule. The irony is that the families want the man, not the other way round.' }
  return { text: 'Chapter 1 is almost all dialogue between Mr. and Mrs. Bennet: the news about Netherfield, her plans, his teasing. Ask me about either of them, or about that first line.' }
}

const PEOPLE = [
  { n: 'Mr. Bennet', c: '#3D5AFE', role: 'Father of five daughters', q: '“a mixture of quick parts, sarcastic humour, reserve, and caprice”' },
  { n: 'Mrs. Bennet', c: '#FF5B2E', role: 'His wife, and the engine of chapter 1', q: '“a woman of mean understanding, little information, and uncertain temper”' },
  { n: 'Lizzy', c: '#FFB627', role: 'Their second daughter, her father’s favourite', q: '“something more of quickness than her sisters”' },
  { n: 'Mr. Bingley', c: '#00B39A', role: 'Only talked about so far. Netherfield’s new tenant.', q: '“a young man of large fortune from the north of England”' },
]
const BEATS = ['Netherfield Park is let at last.', 'Mrs. Bennet wants her husband to call on the new tenant.', 'He teases her, and takes Lizzy’s side.', 'The narrator sums them both up.']

export function Stripes({ reached, onTap, shake, preview }) {
  const lit = preview ?? reached
  return (
    <div className="sp-stripes" onClick={onTap} role={onTap ? 'button' : undefined} aria-label={`Chapters 1 to ${lit} unlocked. Chapters after ${lit} are sealed.`}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <i key={i} className={`${i < lit ? 'is-on' : ''}${shake === i ? ' is-shake' : ''}`} style={{ '--c': HEATS[i % HEATS.length], '--i': i }} />
      ))}
    </div>
  )
}

export function Companion({ app }) {
  const pp = BOOKS[0]
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [shake, setShake] = useState({ i: -1, k: 0 })
  const [move, setMove] = useState(false)
  const [target, setTarget] = useState(app.reached)
  const [open, setOpen] = useState(null)
  const [noteDraft, setNoteDraft] = useState('')
  const endRef = useRef(null)

  const send = (text) => {
    if (!text.trim()) return
    const id = Date.now()
    app.setChat(c => [...c, { who: 'reader', text, id }])
    setDraft('')
    setTyping(true)
    const a = answer(text, app.reached)
    setTimeout(() => {
      setTyping(false)
      const words = a.text.split(' ')
      app.setChat(c => [...c, { who: 'companion', text: '', id: id + 1, sealed: a.sealed }])
      words.forEach((_, i) => setTimeout(() => app.setChat(c => c.map(m => (m.id === id + 1 ? { ...m, text: words.slice(0, i + 1).join(' ') } : m))), i * 32))
    }, 1100)
  }
  const sendRef = useRef(send)
  useEffect(() => { sendRef.current = send })

  const { pendingAsk, setPendingAsk, setCTab } = app
  useEffect(() => {
    if (!pendingAsk) return
    const id = setTimeout(() => { setCTab('ask'); sendRef.current(pendingAsk); setPendingAsk(null) }, 450)
    return () => clearTimeout(id)
  }, [pendingAsk, setPendingAsk, setCTab])

  const seenLen = useRef(app.chat.length)
  useEffect(() => {
    if (app.chat.length === seenLen.current && !typing) return
    seenLen.current = app.chat.length
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [app.chat, typing])

  const tapStripes = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.min(TOTAL - 1, Math.floor(((e.clientX - r.left) / r.width) * TOTAL))
    if (i < app.reached) app.say(`Chapter ${i + 1} is open. Ask me anything about it.`, HEATS[i % HEATS.length])
    else { setShake(s => ({ i, k: s.k + 1 })); app.say(`Chapter ${i + 1} stays dark until you get there.`, '#17100C') }
  }
  const confirmMove = () => {
    app.setReached(target); setMove(false)
    app.say(target > app.reached ? `Your companion now discusses up to chapter ${target}.` : `Moved back to chapter ${target}. Later chapters are sealed again.`, '#3D5AFE')
  }
  const addNote = () => {
    if (!noteDraft.trim()) return
    app.setNotes(ns => [{ tag: 'Note', text: noteDraft, c: HEATS[ns.length % HEATS.length], id: Date.now() }, ...ns])
    setNoteDraft('')
  }

  return (
    <div className="sp-comp">
      <section className="sp-head" style={{ ...bandStyle('pp'), viewTransitionName: 'band-pp' }}>
        <header className="sp-top">
          <button className="sp-ic" onClick={() => app.go('library', { dir: 'back' })} aria-label="Back to library"><Icon name="back" /></button>
          <span className="sp-top-c">Companion</span>
          <button className="sp-ic" onClick={() => app.go('reader')} aria-label="Read"><Icon name="book" /></button>
        </header>
        <h1 className="sp-title sp-title--xl">{pp.title}</h1>
        <p className="sp-by">{pp.author}, 1813</p>
      </section>

      <section className="sp-seal">
        <Stripes reached={app.reached} onTap={tapStripes} shake={shake.i} key={shake.k} />
        <div className="sp-seal-row">
          <p><b>{app.reached}</b> of {TOTAL} chapters open. The rest stay dark.</p>
          <button className="sp-chip" onClick={() => { setTarget(app.reached); setMove(true) }}>Update progress</button>
        </div>
      </section>

      <div className="sp-pad">
        <Seg items={[{ id: 'ask', label: 'Ask' }, { id: 'notes', label: 'Notes' }, { id: 'people', label: 'People' }, { id: 'plot', label: 'Plot' }]}
          value={app.cTab} onChange={app.setCTab} color="#3D5AFE" className="sp-seg--tabs" />

        <div className="sp-tabpane" key={app.cTab}>
          {app.cTab === 'ask' && (
            <>
              <p className="sp-pull">{REFLECTION}</p>
              <div className="sp-chat" aria-live="polite">
                {app.chat.map(m => (
                  <div key={m.id} className={`sp-msg sp-msg--${m.who}${m.sealed ? ' sp-msg--sealed' : ''}`}>
                    {m.who === 'companion' && <span className="sp-msg-who"><SpMark size={14} /> {m.sealed ? 'Sealed' : 'Lantern'}</span>}
                    {m.sealed && <Stripes reached={app.reached} />}
                    <p>{m.text}</p>
                  </div>
                ))}
                {typing && <div className="sp-typing" aria-label="Lantern is thinking"><i /><i /><i /><i /></div>}
                <span ref={endRef} />
              </div>
              <div className="sp-suggest">{SUGGEST.map(s => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
              <form className="sp-compose" onSubmit={e => { e.preventDefault(); send(draft) }}>
                <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={`Ask about chapter ${app.reached === 1 ? '1' : `1–${app.reached}`}`} aria-label="Message your companion" />
                <button aria-label="Send" disabled={!draft.trim()}><Icon name="send" size={18} /></button>
              </form>
              <p className="sp-fine">Try asking about Darcy to see the spoiler seal.</p>
            </>
          )}

          {app.cTab === 'notes' && (
            <>
              <form className="sp-compose sp-compose--note" onSubmit={e => { e.preventDefault(); addNote() }}>
                <input value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Jot a theory or question" aria-label="New note" />
                <button aria-label="Add note" disabled={!noteDraft.trim()}><Icon name="plus" size={18} /></button>
              </form>
              <ul className="sp-notes">
                {app.notes.map((n, i) => (
                  <li key={n.id} className="sp-note" style={{ '--c': n.c, '--i': i }}><b>{n.tag}</b>{n.quote && <q>{n.quote}</q>}<p>{n.text}</p></li>
                ))}
              </ul>
              <p className="sp-fine">Highlights you make while reading land here too.</p>
            </>
          )}

          {app.cTab === 'people' && (
            <ul className="sp-people">
              {PEOPLE.map((p, i) => (
                <li key={p.n} className={open === i ? 'is-open' : ''} style={{ '--c': p.c, '--i': i }}>
                  <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                    <span className="sp-person-chip">{p.n.split(' ').pop()[0]}</span>
                    <span><b>{p.n}</b><span>{p.role}</span></span>
                    <Icon name="down" size={18} />
                  </button>
                  <div className="sp-acc"><div><q>{p.q}</q><span className="sp-fine">First seen in chapter 1</span></div></div>
                </li>
              ))}
            </ul>
          )}

          {app.cTab === 'plot' && (
            <>
              <ol className="sp-beats">
                {BEATS.map((t, i) => <li key={t} style={{ '--i': i }}><span>1.{i + 1}</span>{t}</li>)}
                {Array.from({ length: app.reached - 1 }, (_, i) => <li key={`c${i}`} style={{ '--i': i + 4 }}><span>{i + 2}</span>Chapter {i + 2} is open. Ask me about it.</li>)}
              </ol>
              <div className="sp-sealed-block"><Stripes reached={0} /><p>Chapters {app.reached + 1}–{TOTAL} are sealed.</p></div>
            </>
          )}
        </div>
      </div>

      <Sheet open={move} onClose={() => setMove(false)} title="Where are you?" accent="#3D5AFE">
        <p className="sp-sheet-p">Lantern talks about everything up to the chapter you pick, and nothing after it.</p>
        <div className="sp-stepper">
          <button onClick={() => setTarget(v => Math.max(1, v - 1))} aria-label="Earlier chapter">−</button>
          <span><b>{target}</b>finished up to chapter</span>
          <button onClick={() => setTarget(v => Math.min(TOTAL, v + 1))} aria-label="Later chapter">+</button>
        </div>
        <Stripes reached={app.reached} preview={target} />
        <button className="sp-btn sp-btn--wide" style={{ '--c': '#3D5AFE', '--on': '#fff' }} onClick={confirmMove}>Open chapters 1–{target}</button>
      </Sheet>
    </div>
  )
}
