import { useState } from 'react'
import { Icon } from '../../shared.jsx'
import { FlameMark } from '../../brand.jsx'
import { BAND, bandStyle } from './ui.jsx'
import { SpMark, SpLockup, AppIcon, MARK } from './mark.jsx'
import { ModeButton } from './library.jsx'

const SWATCHES = [
  ['Ember', BAND.pp.c, 'pp'], ['Saffron', BAND.gg.c, 'gg'], ['Cobalt', BAND.je.c, 'je'],
  ['Mint', BAND.md.c, 'md'], ['Rose', BAND.fr.c, 'fr'], ['Sky', BAND.mm.c, 'mm'],
]

export function Brand({ app }) {
  const [take, setTake] = useState(0)
  const copy = (name, hex) => {
    navigator.clipboard?.writeText(hex).catch(() => {})
    app.say(`${name} ${hex} copied`, hex)
  }
  return (
    <div className="sp-brand">
      <header className="sp-top sp-pad">
        <button className="sp-ic" onClick={() => app.go('library', { dir: 'fwd' })} aria-label="Back to library"><Icon name="back" /></button>
        <span className="sp-top-c">The Lantern mark</span>
        <ModeButton app={app} />
      </header>

      <section className="sp-brand-hero">
        <button className="sp-brand-stage" onClick={() => setTake(k => k + 1)} aria-label="Replay the mark animation">
          <SpLockup size={52} intro stacked key={take} />
          <span className="sp-fine">Tap to replay</span>
        </button>
      </section>

      <section className="sp-pad sp-brand-sec">
        <h2 className="sp-h2">What changed</h2>
        <div className="sp-before">
          <figure><FlameMark size={84} /><figcaption>Before<span>Soft corners, muted heat</span></figcaption></figure>
          <span className="sp-arrow" aria-hidden="true">→</span>
          <figure><SpMark size={84} /><figcaption>Spectrum<span>Crisp squares, even gaps, full heat</span></figcaption></figure>
        </div>
        <ul className="sp-ramp">
          {Object.entries(MARK).map(([k, c]) => <li key={k} style={{ '--c': c }}><i /><b>{{ t: 'Top', l: 'Left', r: 'Right', b: 'Bottom' }[k]}</b><span>{c}</span></li>)}
        </ul>
        <p className="sp-body">The same four squares as readwithlantern.com. They start as a row of spectrum bars and fold into the flame, and they pulse like a level meter while Lantern reads.</p>
      </section>

      <section className="sp-brand-sec">
        <h2 className="sp-h2 sp-pad">Lockups</h2>
        <div className="sp-lockups">
          <div className="sp-lk-tile sp-lk-tile--day"><SpLockup size={26} /></div>
          <div className="sp-lk-tile sp-lk-tile--night"><SpLockup size={26} /></div>
          <div className="sp-lk-tile sp-lk-tile--ember"><SpLockup size={26} mono="#17100C" /></div>
        </div>
        <div className="sp-icons sp-pad">
          <figure><AppIcon /><figcaption>Daylight icon</figcaption></figure>
          <figure><AppIcon night /><figcaption>Night icon</figcaption></figure>
          <figure><span className="sp-favicon"><SpMark size={16} /></span><figcaption>Favicon</figcaption></figure>
        </div>
      </section>

      <section className="sp-brand-sec">
        <h2 className="sp-h2 sp-pad">Colour <span>tap to copy</span></h2>
        {SWATCHES.map(([name, hex, id], i) => (
          <button key={name} className="sp-swatch" style={{ ...bandStyle(id), '--i': i }} onClick={() => copy(name, hex)}>
            <b>{name}</b><span>{hex}</span>
          </button>
        ))}
        <p className="sp-fine sp-pad">Every book gets one colour. In Daylight it fills the band; in Night it moves into the type and edges.</p>
      </section>

      <section className="sp-pad sp-brand-sec">
        <h2 className="sp-h2">Type</h2>
        <div className="sp-type">
          <p className="sp-type-big">64<span>%</span></p>
          <p className="sp-type-name">Bricolage Grotesque<span>Numbers, titles, interface</span></p>
          <p className="sp-type-serif">It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.</p>
          <p className="sp-type-name">Source Serif 4<span>Book text and the companion’s voice</span></p>
        </div>
      </section>

      <section className="sp-pad sp-brand-sec">
        <h2 className="sp-h2">Motion</h2>
        <ul className="sp-motion">
          <li><span className="sp-m-demo sp-m-demo--morph" aria-hidden="true"><i /></span><b>Bands morph</b><span>A book’s band follows you from the shelf into the companion and the player.</span></li>
          <li><span className="sp-m-demo sp-m-demo--count" aria-hidden="true">64</span><b>Numbers count</b><span>Progress counts up when it appears, and the clock ticks in place.</span></li>
          <li><span className="sp-m-demo" aria-hidden="true"><SpMark size={34} live /></span><b>The mark breathes</b><span>While Lantern reads, the four squares pulse like a level meter.</span></li>
          <li><span className="sp-m-demo sp-m-demo--reveal" aria-hidden="true" /><b>Night falls</b><span>Switching modes sweeps outward from the button you pressed.</span></li>
        </ul>
        <button className="sp-btn sp-btn--wide sp-btn--plain" onClick={app.exit}>Back to all design directions</button>
      </section>
    </div>
  )
}
