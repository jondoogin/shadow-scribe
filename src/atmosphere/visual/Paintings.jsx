/* eslint-disable react-refresh/only-export-components -- the plate, its panel and their hook live together */
import { useMemo, useRef, useState } from 'react'
import VisualStage from './VisualStage.jsx'
import { BACKDROP_MAX_STRENGTH } from './ReaderBackdrop.jsx'
import { useVisualJourney, usePrefersReducedMotion } from './useVisualJourney.js'
import { usePaintingSources, useThumbs } from './useBookVisuals.js'
import { eligibleImages, isEligible } from './eligibility.js'
import { importVisualPackage } from './visualImport.js'
import { backupPaintings } from '../../library/restore.js'
import { deleteVisualSet, requestPersistentStorage } from '../../content/contentRepository.js'
import { formatBytes } from '../../narration/sectionLabels.js'

// Visual journey on the real Listen and Reader pages (Catalogue III).
// A painting is a "plate", like a tipped-in colour plate in an old book.

const toRoman = (n) => {
  const m = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let s = ''
  for (const [v, r] of m) while (n >= v) { s += r; n -= v }
  return s
}

/**
 * The gate plus the queue: which painting to show for `position`, ready to draw.
 * `pinnedId` lets the reader look at an earlier plate; it is ignored unless
 * that plate is eligible, and it lapses as soon as the story brings a new one.
 */
export function usePlate({ visuals, position, enabled, pinned }) {
  const { set, images, sectionOrder } = visuals
  const { image: chosen, waitingId } = useVisualJourney({ images, sectionOrder, position, enabled: enabled && !!set })
  const shown = useMemo(() => {
    if (pinned && pinned.base === (chosen?.id ?? null)) {
      const p = images.find(i => i.id === pinned.id)
      if (p && isEligible(p, position, sectionOrder)) return p
    }
    return chosen
  }, [pinned, chosen, images, position, sectionOrder])
  const loaded = usePaintingSources(set?.id || null, images, shown, position, sectionOrder)
  // While the next painting loads, keep the last one up, but only if it is
  // still allowed at this position (after a step back it may not be).
  const [last, setLast] = useState(null)
  if (loaded && loaded !== last) setLast(loaded)
  const keep = !shown ? null : loaded || (last && isEligible(last, position, sectionOrder) ? last : null)
  const number = shown ? images.findIndex(i => i.id === shown.id) + 1 : 0
  return { chosen, shown, ready: keep, number, waitingId }
}

function caption(d) {
  if (!d) return null
  return [d.setting, d.timeOfDay, d.weather].filter(Boolean).join(' · ')
}

/** The plate at the top of the Listen slip. */
export function ListenPlate({ plate, motion, playing, total }) {
  const reduced = usePrefersReducedMotion()
  const [open, setOpen] = useState(false)
  const d = plate.shown?.descriptor
  return (
    <figure className="c3-plate">
      <button type="button" className="c3-plate-frame" onClick={() => plate.shown && setOpen(o => !o)} aria-expanded={open}
        aria-label={plate.shown ? `Plate ${plate.number} of ${total}. About this painting` : 'No painting yet'} disabled={!plate.shown}>
        <VisualStage image={plate.ready} drift={motion} shimmer={motion} paused={!playing} reduced={reduced} className="c3-plate-stage" />
        {!plate.shown && <span className="c3-plate-empty">The first plate appears once you’ve heard the passage it was painted from.</span>}
        {plate.shown && <span className="c3-plate-no">Pl. {toRoman(plate.number)}</span>}
      </button>
      {open && plate.shown && (
        <figcaption className="c3-plate-about">
          {caption(d) && <p className="c3-plate-cap">{caption(d)}</p>}
          {(d?.light || d?.mood) && <p className="c2-fine" style={{ margin: '4px 0 0' }}>{[d.light, d.mood].filter(Boolean).join('; ')}</p>}
          <p className="c2-fine" style={{ margin: '8px 0 0' }}>Generated on your Mac from the passage you just heard, never from what comes next.</p>
        </figcaption>
      )}
    </figure>
  )
}

const MODES = [['off', 'Off'], ['listen', 'Listen'], ['both', 'Listen and Reader']]

/** The Paintings section of Listen: on/off, backdrop, plates so far, import, remove. */
export function PaintingsPanel({ book, meta, visuals, prefs, onPrefs, position, onPin, shownId }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(null)
  const [note, setNote] = useState(null)
  const { set, images, sectionOrder, reload } = visuals
  const seen = useMemo(() => (set ? eligibleImages(images, position, sectionOrder) : []), [set, images, position, sectionOrder])
  const recent = seen.slice(-8)
  const thumbs = useThumbs(set?.id, recent.map(i => i.id))

  const handleFile = async (file) => {
    if (!file) return
    setNote(null)
    setBusy({ done: 0, total: 0 })
    try {
      const r = await importVisualPackage(file, book, meta, p => setBusy(p))
      await requestPersistentStorage()
      backupPaintings(file, r, book)
      setNote({ ok: true, text: `${r.count} paintings imported · ${formatBytes(r.totalBytes)}.${r.warnings.length ? ' ' + r.warnings.join(' ') : ''}` })
      if (prefs.mode === 'off') onPrefs({ mode: 'listen' })
      reload()
    } catch (err) {
      setNote({ ok: false, text: err?.message || 'Import failed. Nothing was saved.' })
    } finally {
      setBusy(null)
      if (input.current) input.current.value = ''
    }
  }

  const remove = async () => {
    if (!set || !window.confirm('Remove these paintings from this device? You can import the package again later.')) return
    await deleteVisualSet(set.id)
    reload()
  }

  const st = set?.manifest?.style
  return (
    <section aria-label="Paintings">
      <div className="c2-sec"><h2>Paintings</h2>{set && <span className="c2-label">{seen.length} of {images.length}</span>}</div>
      <div className="c2-card c3-paintings">
        <input ref={input} type="file" hidden accept={IS_IOS ? undefined : '.lantern-visuals,.zip,application/zip'} onChange={e => handleFile(e.target.files?.[0])} />
        {set ? (
          <>
            <div className="c2-chips" role="radiogroup" aria-label="Where paintings appear">
              {MODES.map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={prefs.mode === id} className={prefs.mode === id ? 'is-on' : ''} onClick={() => onPrefs({ mode: id })}>{label}</button>
              ))}
            </div>
            {prefs.mode !== 'off' && (
              <div className="c2-levels">
                <label className="c2-check"><input type="checkbox" checked={prefs.motion} onChange={e => onPrefs({ motion: e.target.checked })} /><span>Living paint (slow drift)</span></label>
                {prefs.mode === 'both' && (
                  <label>
                    <span className="c2-label">Behind the text · {Math.round(prefs.strength * 100)}%</span>
                    <input type="range" min={0.05} max={BACKDROP_MAX_STRENGTH} step={0.01} value={prefs.strength} onChange={e => onPrefs({ strength: Number(e.target.value) })} aria-label="Strength behind the text" />
                  </label>
                )}
              </div>
            )}
            {recent.length > 0 && (
              <>
                <p className="c2-label" style={{ marginTop: 16 }}>Plates so far</p>
                <ol className="c3-plates-row">
                  {recent.map(img => {
                    const n = images.findIndex(i => i.id === img.id) + 1
                    return (
                      <li key={img.id}>
                        <button type="button" className={shownId === img.id ? 'is-on' : ''} onClick={() => onPin(img.id)} aria-label={`Show plate ${n}`} aria-pressed={shownId === img.id}>
                          {thumbs[img.id] ? <img src={thumbs[img.id]} alt="" /> : <span />}
                          <small>{toRoman(n)}</small>
                        </button>
                      </li>
                    )
                  })}
                </ol>
              </>
            )}
            <p className="c2-fine" style={{ marginTop: 14 }}>
              {images.length} paintings{st?.preset ? ` · ${st.preset}` : ''} · {formatBytes(set.totalBytes)}. A plate appears only after you’ve heard or read the passage it was painted from.
            </p>
          </>
        ) : (
          <p className="c2-fine" style={{ marginTop: 0 }}>
            Slow paintings that follow the story, made on your Mac from each passage after you reach it. Make them with <code>lantern-narrate visuals generate</code>, then import the <code>.lantern-visuals</code> file.
          </p>
        )}
        {busy ? (
          <p role="status" className="c2-fine">Importing painting {busy.done} of {busy.total || '…'}…</p>
        ) : (
          <div className="c2-links">
            <button type="button" className="c2-link" onClick={() => input.current?.click()}>{set ? 'Replace paintings…' : 'Import paintings…'}</button>
            {set && <button type="button" className="c2-link" onClick={remove}>Remove</button>}
          </div>
        )}
        {note && <p role={note.ok ? 'status' : 'alert'} className="c2-fine" style={{ marginTop: 6, color: note.ok ? undefined : 'var(--color-ember)' }}>{note.text}</p>}
      </div>
    </section>
  )
}

const IS_IOS = typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
