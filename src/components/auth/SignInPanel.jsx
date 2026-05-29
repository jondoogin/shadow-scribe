/**
 * SignInPanel — Magic-link sign-in surface.
 *
 * Rendered from Settings (and optionally elsewhere). When Supabase is not
 * configured, returns null. When the user is signed in, shows their email
 * and a sign-out button. When signed out, shows the magic-link form.
 *
 * No password fields. No OAuth dependencies. One email, one link, in.
 */

import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function SignInPanel({ onDeleteCloudData }) {
  const { status, user, sendMagicLink, signOut, isCloudEnabled } = useAuth()
  const [email, setEmail]               = useState('')
  const [sent, setSent]                 = useState(false)
  const [error, setError]               = useState(null)
  const [busy, setBusy]                 = useState(false)
  const [confirmSignOut, setConfirmOut] = useState(false)
  const [confirmDelete, setConfirmDel]  = useState(false)
  const [deleting, setDeleting]         = useState(false)

  if (!isCloudEnabled) {
    return (
      <div
        className="px-5 py-4 rounded-xl"
        style={{
          background: 'var(--color-card-base)',
          border:     '1px solid var(--color-hairline)',
        }}
      >
        <p className="italic leading-relaxed" style={{ fontSize: 12, color: 'var(--color-ink-500)' }}>
          Cloud sync isn't configured yet. Your library lives in this browser only.
          To enable cross-device sync, follow the setup in <code style={{ fontFamily: 'var(--font-sans)', fontSize: 11 }}>docs/SUPABASE_SETUP.md</code>.
        </p>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <p className="italic" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
        Connecting…
      </p>
    )
  }

  if (status === 'signed-in') {
    const handleDelete = async () => {
      if (!onDeleteCloudData) return
      setDeleting(true)
      try { await onDeleteCloudData() } finally { setDeleting(false); setConfirmDel(false) }
    }
    return (
      <div
        className="px-5 py-4 rounded-xl"
        style={{
          background: 'var(--color-card-base)',
          border:     '1px solid var(--color-hairline)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: 12, color: 'var(--color-ink-400)', marginBottom: 2 }}>Signed in as</p>
            <p
              className="truncate"
              style={{
                fontSize:   13,
                color:      'var(--color-ink-700)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
              }}
              title={user?.email || ''}
            >
              {user?.email || '—'}
            </p>
            <p className="italic mt-1.5" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
              Your library syncs across devices.
            </p>
          </div>
        </div>

        {/* ── Sign out — explicit about what stays vs goes ── */}
        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid var(--color-hairline)' }}
        >
          {confirmSignOut ? (
            <div className="animate-fade-in">
              <p className="italic mb-3" style={{ fontSize: 12, color: 'var(--color-ink-500)', lineHeight: 1.55 }}>
                Your library stays on this device. To get it back later, sign in with the same email.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setConfirmOut(false)}
                  className="italic transition-colors hover:text-ink-600"
                  style={{ fontSize: 11, color: 'var(--color-ink-400)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmOut(false); signOut() }}
                  className="font-medium transition-opacity hover:opacity-75"
                  style={{ fontSize: 12, color: 'var(--ca, #B8860B)' }}
                >
                  Sign out →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                onClick={() => setConfirmOut(true)}
                className="italic transition-colors hover:text-ink-600"
                style={{ fontSize: 11, color: 'var(--color-ink-400)' }}
              >
                Sign out (your library stays on this device)
              </button>
              {onDeleteCloudData && (
                <button
                  onClick={() => setConfirmDel(true)}
                  className="italic transition-colors hover:opacity-80"
                  style={{ fontSize: 10, color: 'var(--color-ember, #9B2335)', opacity: 0.7 }}
                >
                  Delete cloud data
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Delete cloud data — destructive confirmation ── */}
        {confirmDelete && (
          <div
            className="mt-4 pt-4 animate-fade-in"
            style={{ borderTop: '1px solid color-mix(in srgb, var(--color-ember, #9B2335) 25%, transparent)' }}
          >
            <p
              className="italic mb-3 leading-relaxed"
              style={{ fontSize: 12, color: 'var(--color-ink-600)' }}
            >
              This wipes every book and setting stored in the cloud for{' '}
              <span style={{ fontStyle: 'normal', fontWeight: 500 }}>{user?.email}</span>
              {' '}and signs you out. Your local library on this device is untouched — you can re-upload it by signing back in.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDel(false)}
                disabled={deleting}
                className="italic transition-colors hover:text-ink-600"
                style={{ fontSize: 11, color: 'var(--color-ink-400)' }}
              >
                Keep my cloud data
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="font-medium transition-opacity hover:opacity-75"
                style={{ fontSize: 12, color: 'var(--color-ember, #9B2335)' }}
              >
                {deleting ? 'Deleting…' : 'Yes, delete it →'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // signed-out: magic-link form
  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await sendMagicLink(email)
    setBusy(false)
    if (res.ok) setSent(true)
    else setError(res.error || 'Could not send the sign-in link.')
  }

  if (sent) {
    return (
      <div
        className="px-5 py-5 rounded-xl"
        style={{
          background: 'var(--color-card-base)',
          border:     '1px solid var(--color-hairline)',
        }}
      >
        <p
          className="italic leading-relaxed mb-2"
          style={{ fontSize: 13, color: 'var(--color-ink-600)' }}
        >
          A sign-in link is on its way to <span style={{ fontStyle: 'normal', fontWeight: 500 }}>{email}</span>.
        </p>
        <p className="italic" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
          Open it from this device to return here, signed in.
        </p>
        <button
          onClick={() => { setSent(false); setEmail('') }}
          className="italic transition-colors hover:text-ink-500 mt-3"
          style={{ fontSize: 11, color: 'var(--color-ink-300)' }}
        >
          ← use a different email
        </button>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      className="px-5 py-4 rounded-xl"
      style={{
        background: 'var(--color-card-base)',
        border:     '1px solid var(--color-hairline)',
      }}
    >
      <label
        htmlFor="signin-email"
        className="block italic mb-2"
        style={{ fontSize: 11, color: 'var(--color-ink-500)' }}
      >
        Sync your library across devices
      </label>
      <div className="flex items-center gap-2">
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          autoComplete="email"
          required
          disabled={busy}
          style={{
            flex:        1,
            fontSize:    13,
            background:  'transparent',
            color:       'var(--color-ink-700)',
            border:      '1px solid var(--color-hairline)',
            borderRadius: 8,
            padding:      '8px 12px',
            outline:      'none',
            fontFamily:   'var(--font-sans)',
            fontStyle:    'normal',
          }}
        />
        <button
          type="submit"
          disabled={busy || !email}
          style={{
            fontSize:   12,
            fontWeight: 500,
            fontFamily: 'var(--font-serif)',
            color:      'var(--ca, #B8860B)',
            background: 'transparent',
            border:     '1px solid var(--color-hairline)',
            borderRadius: 8,
            padding:    '8px 14px',
            cursor:     busy ? 'wait' : 'pointer',
            whiteSpace: 'nowrap',
            opacity:    !email ? 0.5 : 1,
            transition: 'opacity 200ms',
          }}
        >
          {busy ? 'Sending…' : 'Email a link →'}
        </button>
      </div>
      {error && (
        <p className="italic mt-2" style={{ fontSize: 11, color: 'var(--color-ember, #9B2335)' }}>
          {error}
        </p>
      )}
      <p className="italic mt-2" style={{ fontSize: 11, color: 'var(--color-ink-400)', lineHeight: 1.55 }}>
        No password. One link, one sign-in. Sync is optional — your library works without it.
      </p>
    </form>
  )
}
