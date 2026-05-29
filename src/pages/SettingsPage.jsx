import { useState, useRef } from 'react'

const IS_DEV = import.meta.env.DEV
import { useNavigate } from 'react-router-dom'
import { useBooks } from '../context/BooksContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { Ico } from '../components/shared/icons.jsx'
import { parseImport, estimateLocalStorageUsage, downloadLibrarySnapshot } from '../utils/storage.js'
import { track } from '../utils/analytics.js'

function SettingsSection({ title, description, children }) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="font-serif text-[15px] font-semibold text-ink-800">{title}</h2>
        {description && <p className="text-[12px] text-ink-400 mt-0.5">{description}</p>}
      </div>
      <div className="bg-cream-50 rounded-2xl border border-ink-200 divide-y divide-ink-100 overflow-hidden">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({ label, description, children, danger }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className={`text-[13px] font-medium ${danger ? 'text-ember' : 'text-ink-800'}`}>{label}</p>
        {description && <p className="text-[12px] text-ink-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${value ? 'bg-gold' : 'bg-ink-200'}`}
    >
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
        value ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}


export default function SettingsPage() {
  const navigate = useNavigate()
  const { books, resetToDemo, importLibrary, clearStorageWarning } = useBooks()
  const { settings, updateSetting } = useSettings()
  const importRef = useRef()

  const [importMsg,    setImportMsg]    = useState(null)  // null | { ok, text }
  const [exportDone,   setExportDone]   = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [showKey,      setShowKey]      = useState(false)
  const [keyDraft,     setKeyDraft]     = useState(settings.anthropicKey || '')
  const [keySaved,     setKeySaved]     = useState(false)

  const saveKey = () => {
    const trimmed = keyDraft.trim()
    if (trimmed && !settings.anthropicKey) track('api_key_saved')
    updateSetting('anthropicKey', trimmed)
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  const clearKey = () => {
    setKeyDraft('')
    updateSetting('anthropicKey', '')
    setKeySaved(false)
  }

  const handleExport = () => {
    const { noteCount } = downloadLibrarySnapshot(books)
    // Record export timestamp + note count so the snapshot reminder can compute growth
    updateSetting('lastExportedAt', new Date().toISOString())
    updateSetting('lastExportedNoteCount', noteCount)
    updateSetting('snapshotReminderDismissedAt', null)
    clearStorageWarning()
    // Brief confirmation feedback (mirrors import "✓ Imported")
    setExportDone(true)
    setTimeout(() => setExportDone(false), 3000)
  }

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { books: incoming, warnings } = parseImport(ev.target.result ?? '')
      if (!incoming.length) {
        const msg = warnings[0] ?? 'No companions found in that file.'
        track('library_import_failed', { reason: msg.slice(0, 80) })
        setImportMsg({ ok: false, text: msg })
        return
      }
      const existingIds = new Set(books.map(b => b.id))
      const newCount    = incoming.filter(b => !existingIds.has(b.id)).length
      const dupCount    = incoming.length - newCount
      importLibrary(incoming)
      track('library_imported', { count: newCount, skipped: dupCount })
      let base
      if (newCount === 0) {
        base = 'All companions were already in your library.'
      } else {
        base = `${newCount} companion${newCount !== 1 ? 's' : ''} imported.`
        if (dupCount > 0) base += ` ${dupCount} already present — skipped.`
      }
      const warn = warnings.filter(w => !w.startsWith('Older export')).join(' ')
      setImportMsg({ ok: newCount > 0, text: warn ? `${base} ${warn}` : base })
      setTimeout(() => setImportMsg(null), 6000)
    }
    reader.onerror = () => {
      setImportMsg({ ok: false, text: 'The file could not be read. Try again.' })
    }
    reader.readAsText(file)
  }

  const handleReset = () => {
    if (!confirmReset) { setConfirmReset(true); return }
    resetToDemo()
    navigate('/library')
  }

  return (
    <main className="max-w-2xl mx-auto px-5 sm:px-8 py-10 pb-20">
      <div className="mb-10">
        <h1 className="font-serif text-2xl font-bold text-ink-900 mb-1">Settings</h1>
        <p className="text-[13px] text-ink-500">Your preferences travel with your companions.</p>
      </div>

      {/* ── Appearance ── */}
      <SettingsSection title="Appearance" description="How Lantern looks and feels.">
        <SettingsRow
          label="Dark Mode"
          description="Easier on the eyes for late-night reading."
        >
          <Toggle value={settings.darkMode} onChange={v => updateSetting('darkMode', v)} />
        </SettingsRow>
      </SettingsSection>

      {/* ── Companion ── */}
      <SettingsSection title="Companion Behavior" description="How your companion observes and responds.">
        <SettingsRow
          label="Insight Style"
          description="How the companion frames its observations."
        >
          <select
            value={settings.insightStyle}
            onChange={e => updateSetting('insightStyle', e.target.value)}
            className="text-[12px] text-ink-700 border border-ink-200 rounded-lg px-2.5 py-1.5 bg-cream-200 cursor-pointer"
          >
            <option value="observational">Observational</option>
            <option value="analytical">Analytical</option>
            <option value="minimal">Minimal</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* ── AI & Extraction ── */}
      <SettingsSection
        title="AI-Assisted Extraction"
        description="Use Claude to generate richer chapter summaries, character lists, and mystery threads when importing EPUBs."
      >
        <div className="px-5 py-4 space-y-4">
          {/* Status pill */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-ink-800">Anthropic API Key</p>
              <p className="text-[12px] text-ink-400 mt-0.5 leading-relaxed">
                Your key is stored locally and never leaves this device.{' '}
                <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
                  className="underline hover:text-ink-600 transition-colors">
                  Get a key →
                </a>
              </p>
            </div>
            {settings.anthropicKey ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--color-gold-bg)', color: 'var(--color-gold)', border: '1px solid var(--color-gold-pale)' }}>
                Active
              </span>
            ) : (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-400 border border-ink-200 flex-shrink-0">
                Not set
              </span>
            )}
          </div>

          {/* Key input */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={keyDraft}
                onChange={e => { setKeyDraft(e.target.value); setKeySaved(false) }}
                onKeyDown={e => e.key === 'Enter' && saveKey()}
                placeholder="sk-ant-..."
                className="w-full border border-ink-200 rounded-xl px-3.5 py-2.5 text-sm text-ink-800 placeholder-ink-300 bg-cream-200 pr-10 font-mono tracking-wider"
              />
              <button
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 hover:text-ink-500 transition-colors"
                aria-label={showKey ? 'Hide key' : 'Show key'}>
                {showKey ? <Ico.Eye /> : <Ico.EyeOff />}
              </button>
            </div>
            <button
              onClick={saveKey}
              disabled={!keyDraft.trim() || keyDraft.trim() === settings.anthropicKey}
              className="text-[12px] font-semibold px-3.5 py-2.5 rounded-xl bg-gold text-white hover:bg-gold-light transition-all disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">
              {keySaved ? '✓ Saved' : 'Save'}
            </button>
            {settings.anthropicKey && (
              <button
                onClick={clearKey}
                className="text-[12px] text-ink-400 hover:text-ember transition-colors flex-shrink-0">
                Clear
              </button>
            )}
          </div>

          <p className="text-[11px] text-ink-400 italic leading-relaxed">
            Claude Haiku is used for extraction — fast and low-cost. Each EPUB import uses approximately 1¢–3¢ of API credit depending on book length.
          </p>
        </div>
      </SettingsSection>

      {/* ── Reading Preferences ── */}
      <SettingsSection title="Reading Preferences" description="Defaults used when creating new companions.">
        <SettingsRow
          label="Default Format"
          description="Applied to new companions unless overridden."
        >
          <select
            value={settings.defaultFormat}
            onChange={e => updateSetting('defaultFormat', e.target.value)}
            className="text-[12px] text-ink-700 border border-ink-200 rounded-lg px-2.5 py-1.5 bg-cream-200 cursor-pointer"
          >
            <option value="print">Print</option>
            <option value="ebook">E-Book</option>
            <option value="audiobook">Audiobook</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="Default Spoiler Mode"
          description="How carefully companions handle future chapter details."
        >
          <select
            value={settings.spoilerMode}
            onChange={e => updateSetting('spoilerMode', e.target.value)}
            className="text-[12px] text-ink-700 border border-ink-200 rounded-lg px-2.5 py-1.5 bg-cream-200 cursor-pointer"
          >
            <option value="strict">Strict</option>
            <option value="relaxed">Relaxed</option>
            <option value="full">Full Spoilers</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="Default Companion Depth"
          description="How present the companion is by default. Per-book override available."
        >
          <select
            value={settings.defaultDepthLevel}
            onChange={e => updateSetting('defaultDepthLevel', e.target.value)}
            className="text-[12px] text-ink-700 border border-ink-200 rounded-lg px-2.5 py-1.5 bg-cream-200 cursor-pointer"
          >
            <option value="quiet">Quiet — mostly silent record</option>
            <option value="resonant">Resonant — balanced presence</option>
            <option value="saturated">Saturated — dense engagement</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* ── Data ── */}
      <SettingsSection title="Data & Privacy" description="Your reading data lives only on this device.">
        {/* Storage usage indicator */}
        {(() => {
          const usage = estimateLocalStorageUsage()
          const warn  = usage.pctOf5MB >= 70
          const crit  = usage.pctOf5MB >= 90
          if (usage.pctOf5MB < 10) return null
          return (
            <div className={`px-5 py-4 border-b border-ink-100 ${crit ? 'bg-sienna-bg' : warn ? 'bg-gold-bg/40' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-[12px] font-medium ${crit ? 'text-sienna' : warn ? 'text-gold' : 'text-ink-600'}`}>
                  Local storage
                </p>
                <p className={`text-[11px] tabular-nums ${crit ? 'text-sienna' : warn ? 'text-gold' : 'text-ink-400'}`}>
                  {usage.mb} MB · {usage.pctOf5MB}% of 5 MB
                </p>
              </div>
              <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${crit ? 'bg-sienna' : warn ? 'bg-gold' : 'bg-ink-300'}`}
                  style={{ width: `${Math.min(usage.pctOf5MB, 100)}%` }}
                />
              </div>
              {crit && (
                <p className="text-[11px] text-sienna mt-2 leading-relaxed">
                  Storage is nearly full. Export your library to avoid data loss.
                </p>
              )}
              {warn && !crit && (
                <p className="text-[11px] text-ink-400 mt-2">
                  Getting full. Consider exporting a backup.
                </p>
              )}
            </div>
          )
        })()}
        <SettingsRow
          label="Export Library"
          description={books.length > 0
            ? `Download all ${books.length} companion${books.length !== 1 ? 's' : ''} as a backup file. Keep it somewhere safe.`
            : 'No companions to export yet.'}
        >
          <button
            onClick={handleExport}
            disabled={books.length === 0}
            className="text-[12px] font-medium border rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={exportDone
              ? { background: 'var(--color-gold-bg)', color: 'var(--color-gold)', borderColor: 'var(--color-gold-pale)' }
              : { color: 'var(--color-ink-700)', borderColor: 'var(--color-ink-200)' }}
          >
            {exportDone ? '✓ Exported' : 'Export'}
          </button>
        </SettingsRow>
        <SettingsRow
          label="Import Library"
          description={importMsg
            ? importMsg.text
            : "Restore companions from a previous export. Books already in your library are not re-imported."}
        >
          <div className="flex items-center gap-2">
            <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
            <button
              onClick={() => importRef.current?.click()}
              className={`text-[12px] font-medium border rounded-lg px-3 py-1.5 transition-colors ${!importMsg ? 'text-ink-700 border-ink-200 hover:bg-ink-100' : ''}`}
              style={importMsg?.ok
                ? { background: 'var(--color-gold-bg)', color: 'var(--color-gold)', borderColor: 'var(--color-gold-pale)' }
                : importMsg
                  ? { background: 'var(--color-ember-bg)', color: 'var(--color-ember)', borderColor: 'var(--color-ember-pale)' }
                  : {}}
            >
              {importMsg?.ok ? '✓ Imported' : 'Import'}
            </button>
          </div>
        </SettingsRow>
        <SettingsRow
          label={confirmReset ? 'Are you sure? This cannot be undone.' : 'Reset to Demo Data'}
          description={confirmReset ? undefined : "Restores the five original sample companions."}
          danger={confirmReset}
        >
          <div className="flex items-center gap-2">
            {confirmReset && (
              <button
                onClick={() => setConfirmReset(false)}
                className="text-[12px] font-medium text-ink-500 border border-ink-200 rounded-lg px-3 py-1.5 hover:bg-ink-100 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              onClick={handleReset}
              className={`text-[12px] font-medium rounded-lg px-3 py-1.5 transition-colors ${
                confirmReset
                  ? 'bg-ember text-white hover:opacity-90'
                  : 'text-ember border border-ember-pale hover:bg-ember-bg'
              }`}
            >
              {confirmReset ? 'Yes, reset' : 'Reset'}
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* ── Developer — dev builds only ── */}
      {IS_DEV && (
        <SettingsSection
          title="Developer"
          description="Testing tools. Not intended for regular use."
        >
          <SettingsRow
            label="Dev Mode"
            description="Bypasses companion cooldowns and speeds up the observation carousel to 3 seconds. Use when testing companion behavior."
          >
            <Toggle value={settings.devMode} onChange={v => updateSetting('devMode', v)} />
          </SettingsRow>
        </SettingsSection>
      )}

      <p className="text-center text-[11px] text-ink-300 mt-4">
        Lantern · All data stored locally · No account required
      </p>
      {import.meta.env.VITE_FEEDBACK_URL && (
        <p className="text-center text-[11px] mt-2 mb-4">
          <a
            href={import.meta.env.VITE_FEEDBACK_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors"
            style={{ color: 'var(--color-ink-400)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-ink-600)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-ink-400)' }}
          >
            Share thoughts on this build →
          </a>
        </p>
      )}
    </main>
  )
}
