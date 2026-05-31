/**
 * SignInPanel — Multi-method auth surface.
 *
 * Supports: Google OAuth, email+password (sign in / create account),
 * magic-link, and forgot-password flow.
 *
 * Used in SettingsPage and at /signin.
 */

import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

// ── Google brand icon ──────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

// ── Or divider ─────────────────────────────────────────────────────────────────
function OrDivider() {
  return (
    <div className="flex items-center gap-3" style={{ margin: '16px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--color-hairline)' }} />
      <span className="italic" style={{ fontSize: 11, color: 'var(--color-ink-300)' }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'var(--color-hairline)' }} />
    </div>
  )
}

// ── Shared input style ─────────────────────────────────────────────────────────
const INPUT = {
  width: '100%',
  fontSize: 13,
  background: 'transparent',
  color: 'var(--color-ink-700)',
  border: '1px solid var(--color-hairline)',
  borderRadius: 8,
  padding: '8px 12px',
  outline: 'none',
  fontFamily: 'var(--font-sans)',
  fontStyle: 'normal',
  boxSizing: 'border-box',
}

// ── Normalize Supabase error messages ─────────────────────────────────────────
function normalizeError(msg) {
  if (!msg) return 'Something went wrong. Please try again.'
  if (msg.includes('Invalid login credentials'))   return 'Incorrect email or password.'
  if (msg.includes('Email not confirmed'))          return 'Check your email to confirm your account first.'
  if (msg.includes('User already registered'))      return 'An account with this email already exists. Try signing in.'
  if (msg.includes('Password should be at least')) return 'Password must be at least 8 characters.'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts — please wait a moment and try again.'
  if (msg.includes('network') || msg.includes('fetch')) return 'Connection error. Check your internet and try again.'
  return msg
}

// ── Submit button ──────────────────────────────────────────────────────────────
function SubmitButton({ busy, disabled, label, busyLabel }) {
  return (
    <button
      type="submit"
      disabled={busy || disabled}
      style={{
        fontSize: 12,
        fontWeight: 500,
        fontFamily: 'var(--font-serif)',
        color: 'var(--ca, #B8860B)',
        background: 'transparent',
        border: '1px solid var(--color-hairline)',
        borderRadius: 8,
        padding: '8px 14px',
        cursor: busy ? 'wait' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 200ms',
        textAlign: 'center',
        width: '100%',
      }}
    >
      {busy ? busyLabel : label}
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function SignInPanel({ onDeleteCloudData }) {
  const {
    status, user,
    sendMagicLink, signUp, signInWithPassword, signInWithGoogle, resetPassword,
    signOut, isCloudEnabled,
  } = useAuth()

  // View state: null = main form, 'forgotPassword', 'resetSent', 'magicLinkSent', 'confirmEmail'
  const [tab,      setTab]      = useState('signIn')
  const [view,     setView]     = useState(null)
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [busy,     setBusy]     = useState(false)
  const [error,    setError]    = useState(null)

  // Signed-in state
  const [confirmSignOut, setConfirmOut] = useState(false)
  const [confirmDelete,  setConfirmDel] = useState(false)
  const [deleting,       setDeleting]   = useState(false)

  const resetForm = () => { setError(null); setPassword(''); setShowPw(false) }
  const switchTab = (t) => { setTab(t); resetForm() }

  // ── Cloud not configured ───────────────────────────────────────────────────
  if (!isCloudEnabled) {
    return (
      <div
        className="px-5 py-4 rounded-xl"
        style={{ background: 'var(--color-card-base)', border: '1px solid var(--color-hairline)' }}
      >
        <p className="italic leading-relaxed" style={{ fontSize: 12, color: 'var(--color-ink-500)' }}>
          Cloud sync isn't configured yet. Your library lives in this browser only.
          To enable cross-device sync, follow the setup in{' '}
          <code style={{ fontFamily: 'var(--font-sans)', fontSize: 11 }}>docs/SUPABASE_SETUP.md</code>.
        </p>
      </div>
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <p className="italic" style={{ fontSize: 12, color: 'var(--color-ink-400)' }}>
        Connecting…
      </p>
    )
  }

  // ── Signed-in ──────────────────────────────────────────────────────────────
  if (status === 'signed-in') {
    const handleDelete = async () => {
      if (!onDeleteCloudData) return
      setDeleting(true)
      try { await onDeleteCloudData() } finally { setDeleting(false); setConfirmDel(false) }
    }
    const isGoogle = user?.app_metadata?.provider === 'google'

    return (
      <div
        className="px-5 py-4 rounded-xl"
        style={{ background: 'var(--color-card-base)', border: '1px solid var(--color-hairline)' }}
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p style={{ fontSize: 12, color: 'var(--color-ink-400)', marginBottom: 2 }}>Signed in as</p>
            <p
              className="truncate"
              style={{ fontSize: 13, color: 'var(--color-ink-700)', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
              title={user?.email || ''}
            >
              {user?.email || '—'}
            </p>
            {isGoogle && (
              <p className="italic" style={{ fontSize: 11, color: 'var(--color-ink-400)', marginTop: 2 }}>
                via Google
              </p>
            )}
            <p className="italic mt-1.5" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
              Your library syncs across devices.
            </p>
          </div>
        </div>

        {/* ── Sign out ── */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-hairline)' }}>
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
                  className="italic transition-opacity hover:opacity-80"
                  style={{ fontSize: 10, color: 'var(--color-ember, #9B2335)', opacity: 0.7 }}
                >
                  Delete cloud data
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Delete cloud data ── */}
        {confirmDelete && (
          <div
            className="mt-4 pt-4 animate-fade-in"
            style={{ borderTop: '1px solid color-mix(in srgb, var(--color-ember, #9B2335) 25%, transparent)' }}
          >
            <p className="italic mb-3 leading-relaxed" style={{ fontSize: 12, color: 'var(--color-ink-600)' }}>
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

  // ── Forgot password view ───────────────────────────────────────────────────
  if (view === 'forgotPassword') {
    const handleReset = async (e) => {
      e.preventDefault()
      setError(null)
      setBusy(true)
      const res = await resetPassword(email)
      setBusy(false)
      if (res.ok) setView('resetSent')
      else setError(normalizeError(res.error))
    }
    return (
      <div
        className="px-5 py-5 rounded-xl"
        style={{ background: 'var(--color-card-base)', border: '1px solid var(--color-hairline)' }}
      >
        <button
          onClick={() => { setView(null); setError(null) }}
          className="italic transition-opacity hover:opacity-75 mb-4"
          style={{ fontSize: 11, color: 'var(--color-ink-400)' }}
        >
          ← Back
        </button>
        <p className="italic mb-4" style={{ fontSize: 12, color: 'var(--color-ink-500)', lineHeight: 1.55 }}>
          Enter your email and we'll send a link to reset your password.
        </p>
        <form onSubmit={handleReset} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            required
            disabled={busy}
            style={INPUT}
          />
          {error && (
            <p className="italic" style={{ fontSize: 11, color: 'var(--color-ember, #9B2335)' }}>{error}</p>
          )}
          <SubmitButton
            busy={busy}
            disabled={!email}
            label="Send reset link →"
            busyLabel="Sending…"
          />
        </form>
      </div>
    )
  }

  if (view === 'resetSent') {
    return (
      <div
        className="px-5 py-5 rounded-xl"
        style={{ background: 'var(--color-card-base)', border: '1px solid var(--color-hairline)' }}
      >
        <p className="italic leading-relaxed mb-2" style={{ fontSize: 13, color: 'var(--color-ink-600)' }}>
          A reset link is on its way to{' '}
          <span style={{ fontStyle: 'normal', fontWeight: 500 }}>{email}</span>.
        </p>
        <p className="italic" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
          Open it to set a new password, then sign in here.
        </p>
        <button
          onClick={() => { setView(null); setError(null) }}
          className="italic transition-opacity hover:opacity-75 mt-3"
          style={{ fontSize: 11, color: 'var(--color-ink-300)' }}
        >
          ← Back to sign in
        </button>
      </div>
    )
  }

  if (view === 'magicLinkSent') {
    return (
      <div
        className="px-5 py-5 rounded-xl"
        style={{ background: 'var(--color-card-base)', border: '1px solid var(--color-hairline)' }}
      >
        <p className="italic leading-relaxed mb-2" style={{ fontSize: 13, color: 'var(--color-ink-600)' }}>
          A sign-in link is on its way to{' '}
          <span style={{ fontStyle: 'normal', fontWeight: 500 }}>{email}</span>.
        </p>
        <p className="italic" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
          Open it from this device to return here, signed in.
        </p>
        <button
          onClick={() => { setView(null); setError(null) }}
          className="italic transition-opacity hover:opacity-75 mt-3"
          style={{ fontSize: 11, color: 'var(--color-ink-300)' }}
        >
          ← use a different email
        </button>
      </div>
    )
  }

  if (view === 'confirmEmail') {
    return (
      <div
        className="px-5 py-5 rounded-xl"
        style={{ background: 'var(--color-card-base)', border: '1px solid var(--color-hairline)' }}
      >
        <p className="italic leading-relaxed mb-2" style={{ fontSize: 13, color: 'var(--color-ink-600)' }}>
          Check your inbox at{' '}
          <span style={{ fontStyle: 'normal', fontWeight: 500 }}>{email}</span>.
        </p>
        <p className="italic leading-relaxed" style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>
          We sent a confirmation link. Open it to activate your account, then sign in here.
        </p>
        <button
          onClick={() => { setView(null); setError(null); switchTab('signIn') }}
          className="italic transition-opacity hover:opacity-75 mt-3"
          style={{ fontSize: 11, color: 'var(--color-ink-300)' }}
        >
          ← Sign in instead
        </button>
      </div>
    )
  }

  // ── Main form — sign in / create account ───────────────────────────────────
  const handleGoogle = async () => {
    setError(null)
    setBusy(true)
    const res = await signInWithGoogle()
    // If Google redirects, page navigates away — busy state doesn't matter.
    // If error (misconfigured), page stays and we show it.
    if (!res.ok) {
      setBusy(false)
      setError(normalizeError(res.error))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    let res
    if (tab === 'signIn') {
      res = await signInWithPassword(email, password)
    } else {
      res = await signUp(email, password)
    }
    setBusy(false)
    if (!res.ok) {
      setError(normalizeError(res.error))
    } else if (res.confirmationRequired) {
      setView('confirmEmail')
    }
    // On success without confirmationRequired: onAuthStateChange fires → status becomes
    // 'signed-in' → component re-renders to signed-in state automatically.
  }

  const handleMagicLink = async () => {
    const cleanEmail = (email || '').trim()
    if (!cleanEmail) { setError('Enter your email first.'); return }
    setError(null)
    setBusy(true)
    const res = await sendMagicLink(cleanEmail)
    setBusy(false)
    if (res.ok) setView('magicLinkSent')
    else setError(normalizeError(res.error))
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--color-card-base)', border: '1px solid var(--color-hairline)' }}
    >
      {/* ── Tab bar ── */}
      <div
        className="flex items-center px-5 pt-4"
        style={{ borderBottom: '1px solid var(--color-hairline)' }}
      >
        {[
          { key: 'signIn',        label: 'Sign in'        },
          { key: 'createAccount', label: 'Create account' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              fontWeight: tab === key ? 600 : 400,
              color: tab === key ? 'var(--color-ink-700)' : 'var(--color-ink-400)',
              borderBottom: tab === key
                ? '2px solid var(--ca, #B8860B)'
                : '2px solid transparent',
              padding: '0 0 12px 0',
              marginRight: 20,
              marginBottom: -1,
              background: 'none',
              cursor: 'pointer',
              transition: 'color 150ms, border-color 150ms',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="px-5 py-5">
        {/* ── Google button ── */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2.5 transition-opacity hover:opacity-80"
          style={{
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            fontWeight: 500,
            color: 'var(--color-ink-700)',
            background: 'transparent',
            border: '1px solid var(--color-hairline)',
            borderRadius: 8,
            padding: '9px 14px',
            cursor: busy ? 'wait' : 'pointer',
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <OrDivider />

        {/* ── Email + password form ── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoComplete="email"
            required
            disabled={busy}
            style={INPUT}
          />

          {/* Password with show/hide toggle */}
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={tab === 'signIn' ? 'Password' : 'Create a password (8+ characters)'}
              autoComplete={tab === 'signIn' ? 'current-password' : 'new-password'}
              required
              disabled={busy}
              style={{ ...INPUT, paddingRight: 52 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="italic transition-opacity hover:opacity-75"
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 10,
                color: 'var(--color-ink-400)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)',
                padding: 0,
              }}
            >
              {showPw ? 'hide' : 'show'}
            </button>
          </div>

          {error && (
            <p className="italic" style={{ fontSize: 11, color: 'var(--color-ember, #9B2335)', lineHeight: 1.5 }}>
              {error}
            </p>
          )}

          <SubmitButton
            busy={busy}
            disabled={!email || !password}
            label={tab === 'signIn' ? 'Sign in →' : 'Create account →'}
            busyLabel={tab === 'signIn' ? 'Signing in…' : 'Creating account…'}
          />
        </form>

        {/* ── Footer links ── */}
        <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
          {tab === 'signIn' ? (
            <button
              onClick={() => { setView('forgotPassword'); setError(null) }}
              className="italic transition-opacity hover:opacity-75"
              style={{ fontSize: 11, color: 'var(--color-ink-400)' }}
            >
              Forgot password?
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={handleMagicLink}
            disabled={busy}
            className="italic transition-opacity hover:opacity-75"
            style={{ fontSize: 11, color: 'var(--color-ink-400)' }}
          >
            Use a sign-in link instead
          </button>
        </div>

        <p className="italic mt-3" style={{ fontSize: 11, color: 'var(--color-ink-300)', lineHeight: 1.55 }}>
          Sync is optional — your library works without it.
        </p>
      </div>
    </div>
  )
}
