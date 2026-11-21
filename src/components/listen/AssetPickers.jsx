import { Link } from 'react-router-dom'
import { formatBytes } from '../../narration/sectionLabels.js'

/**
 * Two dropdowns: who reads the book, and which paintings go with it.
 * Options come from this device and the cloud library alike; one that isn't
 * here yet shows its download size and comes down when picked.
 */
export default function AssetPickers({ assets, narratorValue, onNarrator, paintingsValue, onPaintings, hasText, deviceVoices, deviceVoiceURI, onDeviceVoice }) {
  const { narrators, paintings, status, error, libraryStatus } = assets
  const busy = !!status
  const showPaintings = paintings.length > 0
  const libraryHint = libraryStatus === 'signed-out' || libraryStatus === 'locked' || libraryStatus === 'none'

  return (
    <section className="c3-pickers" aria-label="Narrator and paintings">
      <label className="c3-picker">
        <span className="c2-label">Narrator</span>
        <select value={narratorValue || ''} disabled={busy} onChange={e => onNarrator(e.target.value)}>
          {!narratorValue && <option value="" disabled>Choose…</option>}
          {narrators.map(o => (
            <option key={o.id} value={o.id}>{o.label}{o.onDevice ? '' : ` · ${formatBytes(o.bytes)}`}</option>
          ))}
          {hasText && <option value="speech">Device voice</option>}
        </select>
      </label>
      {showPaintings && (
        <label className="c3-picker">
          <span className="c2-label">Paintings</span>
          <select value={paintingsValue || 'off'} disabled={busy} onChange={e => onPaintings(e.target.value)}>
            {paintings.map(o => (
              <option key={o.id} value={o.id}>{o.label}{o.onDevice ? '' : ` · ${formatBytes(o.bytes)}`}</option>
            ))}
            <option value="off">None</option>
          </select>
        </label>
      )}
      {narratorValue === 'speech' && deviceVoices.length > 1 && (
        <label className="c3-picker c3-picker--wide">
          <span className="c2-label">Device voice</span>
          <select value={deviceVoiceURI || ''} onChange={e => onDeviceVoice(e.target.value || undefined)}>
            <option value="">Best available</option>
            {deviceVoices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name.replace(/\s*\(.*\)$/, '')}</option>)}
          </select>
        </label>
      )}
      {(status || error) && (
        <p role={error ? 'alert' : 'status'} className="c3-picker-note" style={error ? { color: 'var(--color-ember)' } : undefined}>
          {error || status}
        </p>
      )}
      {libraryHint && !status && (
        <p className="c3-picker-note">
          <Link to="/settings" className="c2-link" style={{ minHeight: 0 }}>
            {libraryStatus === 'locked' ? 'Unlock your library' : libraryStatus === 'none' ? 'Set up your library' : 'Sign in'}
          </Link>{' '}to get every narrator and painting set on this device.
        </p>
      )}
    </section>
  )
}
