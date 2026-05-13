import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBooks } from '../context/BooksContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'

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

function PlaceholderBadge() {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400 bg-ink-100 px-2 py-0.5 rounded-full">
      Soon
    </span>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { resetToDemo } = useBooks()
  const { settings, updateSetting } = useSettings()

  const [darkMode,     setDarkMode]     = useState(false)
  const [shadowMode,   setShadowMode]   = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

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
      <SettingsSection title="Appearance" description="How Shadow Scribe looks and feels.">
        <SettingsRow
          label="Dark Mode"
          description="Easier on the eyes for late-night reading."
        >
          <div className="flex items-center gap-2">
            <Toggle value={darkMode} onChange={setDarkMode} disabled />
            <PlaceholderBadge />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Shadow Mode"
          description="A dimmer, more contemplative reading atmosphere."
        >
          <div className="flex items-center gap-2">
            <Toggle value={shadowMode} onChange={setShadowMode} disabled />
            <PlaceholderBadge />
          </div>
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
            className="text-[12px] text-ink-700 border border-ink-200 rounded-lg px-2.5 py-1.5 bg-white cursor-pointer"
          >
            <option value="observational">Observational</option>
            <option value="analytical">Analytical</option>
            <option value="minimal">Minimal</option>
          </select>
        </SettingsRow>
        <SettingsRow
          label="Presence Frequency"
          description="How often the companion offers unsolicited observations."
        >
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-500">Always on</span>
            <PlaceholderBadge />
          </div>
        </SettingsRow>
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
            className="text-[12px] text-ink-700 border border-ink-200 rounded-lg px-2.5 py-1.5 bg-white cursor-pointer"
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
            className="text-[12px] text-ink-700 border border-ink-200 rounded-lg px-2.5 py-1.5 bg-white cursor-pointer"
          >
            <option value="strict">Strict</option>
            <option value="relaxed">Relaxed</option>
            <option value="full">Full Spoilers</option>
          </select>
        </SettingsRow>
      </SettingsSection>

      {/* ── Data ── */}
      <SettingsSection title="Data & Privacy" description="Your reading data lives only on this device.">
        <SettingsRow
          label="Export Library"
          description="Download all your companions as a JSON file."
        >
          <div className="flex items-center gap-2">
            <button
              disabled
              className="text-[12px] font-medium text-ink-400 border border-ink-200 rounded-lg px-3 py-1.5 cursor-not-allowed opacity-50"
            >
              Export
            </button>
            <PlaceholderBadge />
          </div>
        </SettingsRow>
        <SettingsRow
          label="Import Library"
          description="Restore companions from a previous export."
        >
          <div className="flex items-center gap-2">
            <button
              disabled
              className="text-[12px] font-medium text-ink-400 border border-ink-200 rounded-lg px-3 py-1.5 cursor-not-allowed opacity-50"
            >
              Import
            </button>
            <PlaceholderBadge />
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
              {confirmReset ? 'Reset' : 'Reset'}
            </button>
          </div>
        </SettingsRow>
      </SettingsSection>

      <p className="text-center text-[11px] text-ink-300 mt-4">
        Shadow Scribe · All data stored locally · No account required
      </p>
    </main>
  )
}
