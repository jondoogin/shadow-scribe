import { Link, useLocation } from 'react-router-dom'
import { usePlayback } from '../../context/PlaybackContext.jsx'
import { Ico } from '../shared/icons.jsx'
import { sectionLabel } from '../../narration/sectionLabels.js'

/** Compact transport that stays visible while navigating inside Lantern. */
export default function MiniPlayer() {
  const { session, playerState: ps, toggle, closeSession, ambient } = usePlayback()
  const { pathname } = useLocation()
  if (!session || !ps || ps.status === 'idle') return null
  const listenPath = `/book/${session.book.id}/listen`
  if (pathname === listenPath) return null
  const section = session.sections[ps.sectionIndex]
  const playing = ps.status === 'playing'
  const pct = ps.duration ? Math.min(100, (ps.time / ps.duration) * 100) : 0

  return (
    <div className="mini-player" role="region" aria-label="Now playing">
      <div className="mini-player-progress" style={{ width: `${pct}%` }} />
      <Link to={listenPath} className="mini-player-meta">
        <span className="font-serif mini-player-title">{session.book.title}</span>
        <span className="mini-player-sub">
          {section ? sectionLabel(section, ps.sectionIndex, session.book) : ''}
          {ambient.trackId ? ' · ambience on' : ''}
        </span>
      </Link>
      <button className="mini-player-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Ico.Pause /> : <Ico.Play />}
      </button>
      <button className="mini-player-btn mini-player-close" onClick={closeSession} aria-label="Stop and close player">
        <Ico.X />
      </button>
    </div>
  )
}
