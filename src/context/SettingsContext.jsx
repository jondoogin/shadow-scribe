import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext.jsx'
import { syncSettings, pullAndMerge } from '../utils/syncEngine.js'

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
  // lastExportedNoteCount: total notes across all books at the moment of last export.
  // Used to detect when meaningful new content has accumulated since the snapshot.
  lastExportedNoteCount: 0,
  // snapshotReminderDismissedAt: when the user last dismissed the snapshot banner.
  // Banner suppressed for 7 days after dismissal.
  snapshotReminderDismissedAt: null,
  // firstBookInvitationDismissedAt: when the user last deferred the "add your
  // first book" invitation. Suppressed for 7 days after dismissal.
  firstBookInvitationDismissedAt: null,
  // defaultDepthLevel: how present the companion is by default for new books.
  // 'quiet' | 'resonant' | 'saturated'. Per-book override on book.depthLevel.
  defaultDepthLevel: 'resonant',
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
  const { user, status } = useAuth()
  const userId = user?.id ?? null
  const lastSignedInUserId = useRef(null)

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch {}
  }, [settings])

  // ── Cloud sync ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== 'signed-in' || !userId) return
    if (lastSignedInUserId.current === userId) return
    lastSignedInUserId.current = userId

    let cancelled = false
    ;(async () => {
      const { settings: cloudSettings } = await pullAndMerge(userId, null, settings)
      if (cancelled) return
      if (cloudSettings && typeof cloudSettings === 'object') {
        // Cloud wins on conflict; preserve device-local fields (deviceId, anthropicKey)
        // that should remain per-device rather than syncing across.
        const next = {
          ...cloudSettings,
          deviceId:      settings.deviceId,
          anthropicKey:  settings.anthropicKey,
        }
        setSettings(next)
        syncSettings(userId, next)
      } else {
        syncSettings(userId, settings)
      }
    })()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId])

  useEffect(() => {
    if (status === 'signed-out') lastSignedInUserId.current = null
  }, [status])

  useEffect(() => {
    if (status === 'signed-in' && userId) syncSettings(userId, settings)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, status, userId])

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
