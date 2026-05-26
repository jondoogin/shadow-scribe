/**
 * analytics.js — Lightweight event tracking for Lantern.
 *
 * Fires custom events to Plausible Analytics when VITE_PLAUSIBLE_DOMAIN is set.
 * Completely silent in every other environment — no tracking without the env var.
 *
 * Deployment:
 *   Set VITE_PLAUSIBLE_DOMAIN=your-domain.com in your hosting env vars.
 *   Lantern must be added to your Plausible dashboard.
 *
 * Usage:
 *   import { track } from '../utils/analytics.js'
 *   track('first_note', { format: 'print' })
 *
 * Events tracked:
 *   companion_created   — manual companion creation
 *   epub_imported       — EPUB import success
 *   epub_failed         — EPUB parse failure
 *   first_session       — first chapter session logged on a companion
 *   first_note          — first note ever created on a companion
 *   first_mystery       — first mystery ever opened on a companion
 *   book_completed      — companion marked as finished
 *   reread_started      — "begin again" initiated
 *   api_key_saved       — Anthropic key saved for the first time
 *   library_imported    — JSON library import success
 *   library_import_failed — JSON import failure
 */

export function initAnalytics() {
  const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN
  if (!domain) return
  try {
    const script = document.createElement('script')
    script.defer = true
    script.setAttribute('data-domain', domain)
    script.src = 'https://plausible.io/js/script.js'
    document.head.appendChild(script)
  } catch {
    // Never let analytics initialisation surface to users
  }
}

/**
 * Track a named event with optional properties.
 * No-ops silently if Plausible is not loaded or VITE_PLAUSIBLE_DOMAIN is unset.
 *
 * @param {string} event  — Event name in snake_case
 * @param {object} [props] — Optional flat key/value properties
 */
export function track(event, props) {
  try {
    if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
      window.plausible(event, props ? { props } : undefined)
    }
  } catch {
    // Never let tracking errors surface to users
  }
}
