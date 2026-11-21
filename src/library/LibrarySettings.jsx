import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useLibrary, createCloudLibrary, unlockCloudLibrary, lockCloudLibrary, setAutoSave, refreshLibrary,
  deleteFromLibrary, dismissJob,
} from './libraryStore.js'
import { WrongPassphraseError } from './libraryCrypto.js'
import { itemsOnDevice, restoreFromLibrary, KIND_LABEL } from './restore.js'
import { formatBytes } from '../narration/sectionLabels.js'

const KIND_ORDER = { epub: 0, audio: 1, visuals: 2 }
const inputCls = 'text-[13px] text-ink-800 border border-ink-200 rounded-lg px-3 py-2 bg-cream-200 w-full'
const btnCls = 'text-[12px] font-medium border rounded-lg px-3 py-1.5 transition-colors text-ink-700 border-ink-200 hover:bg-ink-100 disabled:opacity-40'

/**
 * Settings → Your library: set up, unlock and browse the encrypted cloud
 * library of EPUBs, narration and paintings. See docs/LIBRARY.md.
 */
export default function LibrarySettings({ Section, Row, Toggle, books }) {
  const lib = useLibrary()
  return (
    <Section title="Your library">
      {lib.status === 'disabled' && <Row label="Cloud library" description="Cloud sync isn’t configured in this build of Lantern." />}
      {lib.status === 'signed-out' && (
        <Row label="Keep your books in one place" description="Sign in to store your EPUBs, narration and paintings in an encrypted library, and get them on any device.">
          <Link to="/signin" className={btnCls}>Sign in</Link>
        </Row>
      )}
      {lib.status === 'checking' && <Row label="Cloud library" description="Checking…" />}
      {lib.status === 'error' && <Row label="Cloud library" description={lib.error} danger />}
      {lib.status === 'none' && <CreateForm />}
      {lib.status === 'locked' && <UnlockForm />}
      {lib.status === 'unlocked' && <Unlocked lib={lib} Row={Row} Toggle={Toggle} books={books} />}
    </Section>
  )
}

function PassphraseFields({ confirm, onSubmit, submitLabel, busyLabel, children }) {
  const [pass, setPass] = useState('')
  const [again, setAgain] = useState('')
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    if (confirm && pass !== again) return setError('The two passphrases don’t match.')
    setBusy(true)
    try { await onSubmit(pass, remember) } catch (err) {
      setError(err instanceof WrongPassphraseError ? err.message : (err?.message || 'Something went wrong.'))
    } finally { setBusy(false) }
  }
  return (
    <form className="px-5 py-4 space-y-3" onSubmit={submit}>
      {children}
      <input className={inputCls} type="password" autoComplete={confirm ? 'new-password' : 'current-password'} placeholder="Library passphrase" value={pass} onChange={e => setPass(e.target.value)} aria-label="Library passphrase" />
      {confirm && <input className={inputCls} type="password" autoComplete="new-password" placeholder="Passphrase again" value={again} onChange={e => setAgain(e.target.value)} aria-label="Passphrase again" />}
      <label className="flex items-center gap-2 text-[12px] text-ink-600">
        <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
        Remember on this device
      </label>
      {error && <p role="alert" className="text-[12px] text-ember">{error}</p>}
      <button type="submit" className={btnCls} disabled={busy || !pass}>{busy ? busyLabel : submitLabel}</button>
    </form>
  )
}

function CreateForm() {
  return (
    <PassphraseFields confirm submitLabel="Create library" busyLabel="Creating…" onSubmit={createCloudLibrary}>
      <p className="text-[13px] font-medium text-ink-800">Keep your books in one place</p>
      <p className="text-[12px] text-ink-400 leading-relaxed">
        EPUBs, narration and paintings you import are saved to your Lantern account, encrypted on this device first.
        Only your passphrase can open them, not Lantern and not the server. <strong>If you forget it, nobody can recover your library.</strong> A password manager is a good home for it.
      </p>
    </PassphraseFields>
  )
}

function UnlockForm() {
  return (
    <PassphraseFields submitLabel="Unlock" busyLabel="Unlocking…" onSubmit={unlockCloudLibrary}>
      <p className="text-[13px] font-medium text-ink-800">Unlock your library</p>
      <p className="text-[12px] text-ink-400 leading-relaxed">Enter your library passphrase to see and download your books on this device.</p>
    </PassphraseFields>
  )
}

function Unlocked({ lib, Row, Toggle, books }) {
  const [onDevice, setOnDevice] = useState(new Set())
  const [busy, setBusy] = useState(null) // item id
  const [note, setNote] = useState(null)
  useEffect(() => { refreshLibrary() }, [])
  useEffect(() => {
    let live = true
    itemsOnDevice(lib.items).then(s => { if (live) setOnDevice(s) }, () => {})
    return () => { live = false }
  }, [lib.items, busy])

  const groups = useMemo(() => {
    const byBook = new Map()
    for (const it of lib.items) {
      if (!byBook.has(it.contentId)) byBook.set(it.contentId, [])
      byBook.get(it.contentId).push(it)
    }
    return [...byBook.entries()].map(([contentId, items]) => {
      const companion = books.find(b => b.contentId === contentId)
      const title = companion?.title || items.find(i => i.meta?.title)?.meta.title || 'Untitled'
      return { contentId, title, items: items.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]) }
    }).sort((a, b) => a.title.localeCompare(b.title))
  }, [lib.items, books])

  const total = lib.items.reduce((n, i) => n + (i.status === 'ready' ? i.bytes : 0), 0)

  const get = async (item) => {
    setBusy(item.id); setNote(null)
    try {
      await restoreFromLibrary(item)
      setNote({ ok: true, text: `${KIND_LABEL[item.kind]} downloaded to this device.` })
    } catch (err) { setNote({ ok: false, text: err.message }) } finally { setBusy(null) }
  }
  const remove = async (item) => {
    if (!window.confirm(`Delete this ${KIND_LABEL[item.kind].toLowerCase()} from your cloud library? Copies on your devices stay.`)) return
    setBusy(item.id)
    try { await deleteFromLibrary(item) } catch (err) { setNote({ ok: false, text: err.message }) } finally { setBusy(null) }
  }

  return (
    <>
      <Row label="Save imports to my library"
        description={`New EPUBs, narration and paintings are encrypted and uploaded in the background. ${lib.items.length ? `${groups.length} book${groups.length === 1 ? '' : 's'} · ${formatBytes(total)}.` : 'Nothing stored yet. Import a book, narration or paintings to add it.'}`}>
        <Toggle value={lib.autoSave} onChange={setAutoSave} />
      </Row>
      {lib.jobs.length > 0 && (
        <div className="px-5 py-3 space-y-1" role="status">
          {lib.jobs.map(j => (
            <p key={j.id} className={`text-[12px] ${j.error ? 'text-ember' : 'text-ink-500'}`}>
              {j.kind === 'upload' ? 'Saving' : 'Downloading'} {j.label}
              {j.error ? `: ${j.error} ` : ` · part ${j.done} of ${j.total}`}
              {j.error && <button className="underline" onClick={() => dismissJob(j.id)}>Dismiss</button>}
            </p>
          ))}
        </div>
      )}
      {groups.map(g => (
        <div key={g.contentId} className="px-5 py-3">
          <p className="font-serif text-[14px] text-ink-800">{g.title}</p>
          <ul className="mt-1 space-y-1">
            {g.items.map(it => (
              <li key={it.id} className="flex items-center justify-between gap-3 text-[12px] text-ink-500">
                <span className="min-w-0">
                  {KIND_LABEL[it.kind]}{it.meta?.label ? ` · ${it.meta.label}` : ''} · {formatBytes(it.bytes)}
                  {it.status !== 'ready' && ' · upload unfinished'}
                </span>
                <span className="flex items-center gap-3 flex-shrink-0">
                  {it.status === 'ready' && (onDevice.has(it.id)
                    ? <span className="text-ink-400">On this device</span>
                    : <button className="underline" disabled={!!busy} onClick={() => get(it)}>{busy === it.id ? 'Getting…' : 'Get'}</button>)}
                  <button className="underline text-ink-400" disabled={!!busy} onClick={() => remove(it)} aria-label={`Delete ${KIND_LABEL[it.kind]} from library`}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {note && <p role={note.ok ? 'status' : 'alert'} className={`px-5 py-3 text-[12px] ${note.ok ? 'text-ink-500' : 'text-ember'}`}>{note.text}</p>}
      {lib.error && <p role="alert" className="px-5 py-3 text-[12px] text-ember">{lib.error}</p>}
      <Row label="Lock on this device" description="Forget the passphrase here. Your library and the books already on this device stay.">
        <button className={btnCls} onClick={lockCloudLibrary}>Lock</button>
      </Row>
    </>
  )
}
