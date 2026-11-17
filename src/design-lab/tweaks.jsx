/* eslint-disable react-refresh/only-export-components -- the hook and panel live together; fast refresh is irrelevant in the lab */
import { useEffect, useState } from 'react'

// Style tweaker for design-lab directions that export a `tweaks` schema.
// Values persist per direction in a lab-only localStorage key. It never
// touches the app's own keys (shadowscribe_* stay frozen).
const KEY = 'lantern_lab_tweaks'

const defaultsOf = (schema) => Object.fromEntries((schema || []).flatMap(g => g.items.map(it => [it.id, it.default])))

function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { return {} }
}

export function useTweaks(dir) {
  const [all, setAll] = useState(readAll)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* private mode: keep in memory */ }
  }, [all])
  const id = dir?.meta.id
  const values = { ...defaultsOf(dir?.tweaks), ...(id ? all[id] : null) }
  const set = (k, v) => setAll(a => ({ ...a, [id]: { ...a[id], [k]: v } }))
  const reset = () => setAll(a => { const n = { ...a }; delete n[id]; return n })
  return { values, set, reset }
}

// Inline style plus data attributes for the .lx element.
export function tweakProps(dir, values, mode) {
  if (!dir?.tweaks) return {}
  const props = { style: dir.tweakVars ? dir.tweakVars(values, mode) : undefined }
  dir.tweaks.forEach(g => g.items.forEach(it => { if (it.attr) props[`data-${it.id}`] = String(values[it.id]) }))
  return props
}

export function TweakPanel({ dir, values, set, reset }) {
  const [open, setOpen] = useState(false)
  if (!dir?.tweaks) return null
  return (
    <>
      <button className={`lab-tune-btn${open ? ' is-on' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h7M13 4h1M2 12h2M8 12h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="11" cy="4" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="6" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
        Tune
      </button>
      {open && (
        <section className="lab-tune" aria-label={`Tune ${dir.meta.name}`}>
          <header className="lab-tune-head">
            <b>Tune {dir.meta.name}</b>
            <div>
              <button className="lab-tune-reset" onClick={reset}>Reset</button>
              <button className="lab-tune-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
            </div>
          </header>
          <div className="lab-tune-body">
            {dir.tweaks.map(g => (
              <fieldset key={g.group} className="lab-tune-group">
                <legend>{g.group}</legend>
                {g.items.map(it => <Control key={it.id} it={it} value={values[it.id]} onChange={(v) => set(it.id, v)} />)}
              </fieldset>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

function Control({ it, value, onChange }) {
  if (it.type === 'swatch') {
    return (
      <div className="lab-tune-row lab-tune-row--stack">
        <span className="lab-tune-l">{it.label} <em>{it.options.find(o => o[1].toLowerCase() === String(value).toLowerCase())?.[0] || value}</em></span>
        <div className="lab-tune-sw">
          {it.options.map(([name, hex]) => (
            <button key={hex} style={{ background: hex }} className={hex.toLowerCase() === String(value).toLowerCase() ? 'is-on' : ''} onClick={() => onChange(hex)} aria-label={name} title={name} />
          ))}
          <label className="lab-tune-custom" title="Custom colour">
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`Custom ${it.label.toLowerCase()}`} />
            <span>+</span>
          </label>
        </div>
      </div>
    )
  }
  if (it.type === 'choice') {
    return (
      <div className="lab-tune-row">
        <span className="lab-tune-l">{it.label}</span>
        <div className="lab-tune-seg">
          {it.options.map(([name, v]) => <button key={v} className={v === value ? 'is-on' : ''} onClick={() => onChange(v)}>{name}</button>)}
        </div>
      </div>
    )
  }
  if (it.type === 'range') {
    return (
      <div className="lab-tune-row lab-tune-row--stack">
        <span className="lab-tune-l">{it.label} <em>{value}{it.unit || ''}</em></span>
        <input className="lab-tune-range" type="range" min={it.min} max={it.max} step={it.step || 1} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={it.label} />
        {it.ends && <span className="lab-tune-ends"><span>{it.ends[0]}</span><span>{it.ends[1]}</span></span>}
      </div>
    )
  }
  if (it.type === 'toggle') {
    return (
      <div className="lab-tune-row">
        <span className="lab-tune-l">{it.label}</span>
        <button className={`lab-tune-tog${value ? ' is-on' : ''}`} role="switch" aria-checked={!!value} aria-label={it.label} onClick={() => onChange(!value)}><i /></button>
      </div>
    )
  }
  return null
}
