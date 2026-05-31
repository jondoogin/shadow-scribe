/**
 * AccountPage — Minimal account management at /account.
 *
 * Sections:
 *   - Account info (email, provider, member since)
 *   - Subscription (Companion Plus tier, free by default)
 *   - Security (change password — email/password users only)
 *   - Library (export, sync status)
 *   - Danger zone (delete cloud data)
 *
 * Redirects to /signin when signed out.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useSubscription } from '../hooks/useSubscription.js'
import { useBooks } from '../context/BooksContext.jsx'
import { downloadLibrarySnapshot } from '../utils/storage.js'
import { deleteCloudData } from '../utils/syncEngine.js'
import { useSettings } from '../context/SettingsContext.jsx'

// ── Section wrapper ─────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <p
        style={{
          fontSize: 10,
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-400)',
          marginBottom: 12,
        }}
      >
        {title}
      </p>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-card-base)',
          border: '1px solid var(--color-hairline)',
        }}
      >
        {children}
      </div>
    </section>
  )
}

// ── Row within a section ────────────────────────────────────────────────────
function Row({ label, description, children, danger, noBorder }) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-5 py-4"
      style={noBorder ? {} : { borderBottom: '1px solid var(--color-hairline)' }}
    >
      <div className="min-w-0 flex-1">
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: danger ? 'var(--color-ember, #9B2335)' : 'var(--color-ink-800)',
            fontFamily: 'var(--font-sans)',
          }}
        >
          {label}
        </p>
        {description && (
          <p
            className="italic leading-relaxed mt-0.5"
            style={{ fontSize: 12, color: 'var(--color-ink-400)' }}
          >
            {description}
          </p>
        )}
      </div>
      {children && <div className="flex-shrink-0">{children}</div>}
    </div>
  )
}

// ── Small action button ─────────────────────────────────────────────────────
function ActionButton({ onClick, disabled, danger, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="transition-opacity hover:opacity-75 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        fontSize: 12,
        fontWeight: 500,
        fontFamily: 'var(--font-sans)',
        color: danger ? 'var(--color-ember, #9B2335)' : 'var(--color-ink-700)',
        background: 'transparent',
        border: `1px solid ${danger ? 'color-mix(in srgb, var(--color-ember, #9B2335) 35%, transparent)' : 'var(--color-hairline)'}`,
        borderRadius: 8,
        padding: '6px 12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// ── Change Password form ────────────────────────────────────────────────────
function ChangePasswordForm() {
  const { updatePassword } = useAuth()
  const [current,    setCurrent]    = useState('')
  const [next,       setNext]       = useState('')
  const [confirm,    setConfirm]    = useState('')
  const [showPw,     setShowPw]     = useState(false)
  const [busy,       setBusy]       = useState(false)
  const [msg,        setMsg]        = useState(null) // { ok, text }
  const [open,       setOpen]       = useState(false)

  if (!open) {
    return (
      <ActionButton onClick={() => setOpen(true)}>Change password</ActionButton>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg(null)
    if (next !== confirm) { setMsg({ ok: false, text: "Passwords don’t match." }); return }
    if (next.length < 8)  { setMsg({ ok: false, text: 'Password must be at least 8 characters.' }); return }
    setBusy(true)
    const res = await updatePassword(next)
    setBusy(false)
    if (res.ok) {
      setMsg({ ok: true, text: 'Password updated.' })
      setCurrent(''); setNext(''); setConfirm('')
      setTimeout(() => { setOpen(false); setMsg(null) }, 2000)
    } else {
      setMsg({ ok: false, text: res.error || 'Could not update password.' })
    }
  }

  const inputStyle = {
    width: '100%',
    fontSize: 13,
    background: 'transparent',
    color: 'var(--color-ink-700)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 8,
    padding: '7px 10px',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box',
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 w-full max-w-xs">
      <div style={{ position: 'relative' }}>
        <input
          type={showPw ? 'text' : 'password'}
          value={next}
          onChange={e => setNext(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          required
          disabled={busy}
          style={{ ...inputStyle, paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={() => setShowPw(v => !v)}
          className="italic transition-opacity hover:opacity-75"
          style={{
            position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)',
            fontSize: 10, color: 'var(--color-ink-400)', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: 0,
          }}
        >
          {showPw ? 'hide' : 'show'}
        </button>
      </div>
      <input
        type={showPw ? 'text' : 'password'}
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        autoComplete="new-password"
        required
        disabled={busy}
        style={inputStyle}
      />
      {msg && (
        <p
          className="italic"
          style={{
            fontSize: 11,
            color: msg.ok ? 'var(--color-ink-500)' : 'var(--color-ember, #9B2335)',
          }}
        >
          {msg.text}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy || !next || !confirm}
          style={{
            fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-serif)',
            color: 'var(--ca, #B8860B)', background: 'transparent',
            border: '1px solid var(--color-hairline)', borderRadius: 8,
            padding: '7px 12px', cursor: busy ? 'wait' : 'pointer',
            opacity: (!next || !confirm) ? 0.5 : 1,
          }}
        >
          {busy ? 'Saving…' : 'Update password →'}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setMsg(null); setNext(''); setConfirm('') }}
          className="italic transition-opacity hover:opacity-75"
          style={{ fontSize: 11, color: 'var(--color-ink-400)' }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function AccountPage() {
  const navigate = useNavigate()
  const { user, status, signOut, isCloudEnabled } = useAuth()
  const { subscription, isPro, loading: subLoading } = useSubscription()
  const { books } = useBooks()
  const { updateSetting } = useSettings()

  const [exportDone,    setExportDone]    = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting,      setDeleting]      = useState(false)

  // Redirect when not signed in
  useEffect(() => {
    if (status === 'signed-out') navigate('/signin', { replace: true })
  }, [status, navigate])

  if (status === 'loading' || status === 'signed-out') return null

  const provider  = user?.app_metadata?.provider
  const isGoogle  = provider === 'google'
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null

  const handleExport = () => {
    const { noteCount } = downloadLibrarySnapshot(books)
    updateSetting('lastExportedAt', new Date().toISOString())
    updateSetting('lastExportedNoteCount', noteCount)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 3000)
  }

  const handleDeleteCloud = async () => {
    if (!isCloudEnabled || !user?.id) return
    setDeleting(true)
    const res = await deleteCloudData(user.id)
    setDeleting(false)
    if (!res.ok) { console.warn('[account] delete failed:', res.error); return }
    await signOut()
    navigate('/library', { replace: true })
  }

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-8 py-10 pb-20">
      <div style={{ marginBottom: 36 }}>
        <h1
          className="font-serif"
          style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-ink-900)', marginBottom: 4 }}
        >
          Account
        </h1>
        <p
          className="italic"
          style={{ fontSize: 13, color: 'var(--color-ink-400)' }}
        >
          Manage your Lantern account and subscription.
        </p>
      </div>

      {/* ── Account info ── */}
      <Section title="Account">
        <Row label={user?.email || '—'} description={isGoogle ? 'Signed in via Google' : 'Email · password'} noBorder={!memberSince}>
          {isGoogle && (
            <span style={{ fontSize: 11, color: 'var(--color-ink-400)' }}>Google</span>
          )}
        </Row>
        {memberSince && (
          <Row label="Member since" noBorder>
            <span
              className="italic"
              style={{ fontSize: 12, color: 'var(--color-ink-400)' }}
            >
              {memberSince}
            </span>
          </Row>
        )}
      </Section>

      {/* ── Subscription ── */}
      <Section title="Subscription">
        {subLoading ? (
          <Row label="Loading…" noBorder />
        ) : isPro ? (
          <>
            <Row label="Companion Plus" description="Active · full companion experience.">
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 99,
                  background: 'color-mix(in srgb, var(--ca) 12%, transparent)',
                  color: 'var(--ca, #B8860B)',
                  border: '1px solid color-mix(in srgb, var(--ca) 30%, transparent)',
                }}
              >
                Active
              </span>
            </Row>
            {subscription?.current_period_end && (
              <Row
                label="Renews"
                description={new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                noBorder
              />
            )}
          </>
        ) : (
          <>
            <Row label="Free" description="Your library is fully yours — free forever." noBorder>
              <button
                onClick={() => {/* Stripe checkout — coming soon */}}
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'var(--font-serif)',
                  color: 'var(--ca, #B8860B)',
                  background: 'transparent',
                  border: '1px solid color-mix(in srgb, var(--ca) 35%, transparent)',
                  borderRadius: 8,
                  padding: '6px 12px',
                  cursor: 'pointer',
                  opacity: 0.6,
                }}
                title="Coming soon"
              >
                Upgrade ✦
              </button>
            </Row>
          </>
        )}
      </Section>

      {/* ── Security — email/password users only ── */}
      {!isGoogle && (
        <Section title="Security">
          <div className="px-5 py-4">
            <p
              style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink-800)', marginBottom: 12 }}
            >
              Change password
            </p>
            <ChangePasswordForm />
          </div>
        </Section>
      )}

      {/* ── Library ── */}
      <Section title="Library">
        <Row
          label="Export library"
          description={
            books.length > 0
              ? `Download all ${books.length} companion${books.length !== 1 ? 's' : ''} as a backup file.`
              : 'No companions to export yet.'
          }
        >
          <ActionButton onClick={handleExport} disabled={books.length === 0}>
            {exportDone ? '✓ Exported' : 'Export'}
          </ActionButton>
        </Row>
        <Row label="Cloud sync" description="Your library and preferences sync automatically across all signed-in devices." noBorder>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: 99,
              background: 'color-mix(in srgb, var(--ca) 10%, transparent)',
              color: 'var(--ca, #B8860B)',
              border: '1px solid color-mix(in srgb, var(--ca) 25%, transparent)',
            }}
          >
            On
          </span>
        </Row>
      </Section>

      {/* ── Danger zone ── */}
      <Section title="Danger Zone">
        {confirmDelete ? (
          <div className="px-5 py-4">
            <p
              className="italic leading-relaxed mb-4"
              style={{ fontSize: 12, color: 'var(--color-ink-600)' }}
            >
              This wipes every book and setting stored in the cloud for{' '}
              <span style={{ fontStyle: 'normal', fontWeight: 500 }}>{user?.email}</span>{' '}
              and signs you out. Your local library on this device is untouched.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="italic transition-opacity hover:opacity-75"
                style={{ fontSize: 11, color: 'var(--color-ink-400)' }}
              >
                Cancel
              </button>
              <ActionButton onClick={handleDeleteCloud} disabled={deleting} danger>
                {deleting ? 'Deleting…' : 'Yes, delete cloud data →'}
              </ActionButton>
            </div>
          </div>
        ) : (
          <Row
            label="Delete cloud data"
            description="Wipes your cloud library and signs you out. Local data on this device is untouched."
            danger
            noBorder
          >
            <ActionButton onClick={() => setConfirmDelete(true)} danger>
              Delete
            </ActionButton>
          </Row>
        )}
      </Section>
    </main>
  )
}
