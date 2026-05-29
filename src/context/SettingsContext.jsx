import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext(null)

export const SETTINGS_DEFAULTS = {
  spoilerMode:    'relaxed',        // global default for new books and companion presence
  insightStyle:   'observational',  // 'observational' | 'analytical' | 'minimal'
  defaultFormat:  'print',          // 'print' | 'ebook' | 'audiobook'
  anthropicKey:   '',               // Anthropic API key for AI-assisted extraction
  darkMode:       true,             // dark colour palette
  devMode:        false,            // bypass companion cooldowns + fast carousel for testing
  // ── Cloud-sync groundwork ─────────────────────────────────────────────────
  // deviceId: stable identity for this device — generated once on first run.
  // Used by a future sync layer to reconcile libraries across devices.
  // Never visible to users; never sent anywhere without an explicit sync opt-in.
  deviceId:       null,
  // lastExportedAt: ISO timestamp of the most recent library export.
  // Enables future "nudge to back up" logic if the library hasn't been exported recently.
  lastExportedAt: null,
}

const KEY = 'shadowscribe_settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    const stored = raw ? JSON.parse(raw) : {}
    const merged = { ...SETTINGS_DEFAULTS, ...stored }
    // Generate a stable device identity on first run (cloud-sync groundwork)
    if (!merged.deviceId) {
      merged.deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    }
    return merged
  } catch {
    return {
      ...SETTINGS_DEFAULTS,
      deviceId: `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    }
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadSettings)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch {}
  }, [settings])

  const updateSetting = (key, value) =>
    setSettings(s => ({ ...s, [key]: value }))

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
