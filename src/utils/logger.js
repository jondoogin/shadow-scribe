/**
 * logger.js — Centralized error and warning logger for Lantern.
 *
 * Dev:  full console output with stack traces and context objects.
 * Prod: minimal console output — message only, no stack, no context.
 *
 * All output is prefixed with [Lantern:Category] for easy filtering.
 *
 * Future: replace the prod console.error with a call to Sentry or similar.
 */

const IS_DEV = import.meta.env.DEV

/**
 * Log a recoverable error.
 * Use when something went wrong but the app continued gracefully.
 *
 * @param {string} category — e.g. 'Companion', 'Import', 'Storage', 'EPUB', 'AI'
 * @param {Error|string} error
 * @param {object} [context] — Extra debug info (only logged in dev)
 */
export function logError(category, error, context) {
  const label = `[Lantern:${category}]`
  if (IS_DEV) {
    console.error(label, error, ...(context ? [context] : []))
  } else {
    const msg = typeof error === 'string' ? error : (error?.message ?? 'Unknown error')
    console.error(label, msg)
  }
}

/**
 * Log a non-fatal warning (dev only).
 *
 * @param {string} category
 * @param {string} message
 * @param {object} [context]
 */
export function logWarn(category, message, context) {
  if (IS_DEV) {
    console.warn(`[Lantern:${category}]`, message, ...(context ? [context] : []))
  }
}
