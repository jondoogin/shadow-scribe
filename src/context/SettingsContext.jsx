import { createContext, useContext, useState, useEffect } from 'react'

const SettingsContext = createContext(null)

export const SETTINGS_DEFAULTS = {
  spoilerMode:    'relaxed',   // global default for new books and companion presence
  insightStyle:   'observational', // 'observational' | 'analytical' | 'minimal'
  defaultFormat:  'print',     // 'print' | 'ebook' | 'audiobook'
}

const KEY = 'shadowscribe_settings'

function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return SETTINGS_DEFAULTS
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) }
  } catch { return SETTINGS_DEFAULTS }
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
