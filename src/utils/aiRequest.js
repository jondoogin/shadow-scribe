/**
 * aiRequest.js — AI Operation Infrastructure Layer
 *
 * Central registry for AI operation metadata, lifecycle states, provider config,
 * in-flight deduplication, and dev observability.
 *
 * Single source of truth for:
 *   - Operation type identifiers (AI_OP)
 *   - Lifecycle state constants (AI_STATE)
 *   - Error classification codes (AI_ERROR_CODE)
 *   - Provider configuration (PROVIDER_CONFIG)
 *   - In-flight request deduplication (dedupRequest)
 *   - Dev-mode structured logging (devLog)
 *
 * All async AI operations in aiExtractor.js import from here.
 * Synchronous operations (generatePresence) do not need dedup.
 */

// ── Operation types ──────────────────────────────────────────────────────────

export const AI_OP = {
  REFLECTIONS: 'reflections',  // generateCompanionReflections
  DISCUSSION:  'discussion',   // generateDiscussionQuestions
  EXTRACTION:  'extraction',   // aiExtractNarrative (EPUB → characters/summaries/mysteries)
  SUMMARIES:   'summaries',    // generateChapterSummaries (post-import, knowledge-based)
  EPUB_PARSE:  'epub_parse',   // parseEpub (in-browser ZIP decompression)
  PRESENCE:    'presence',     // generatePresence (synchronous; listed for completeness)
}

// ── Lifecycle states ──────────────────────────────────────────────────────────
// UI components may use these to drive loading/error/success rendering.
// Async operations transition: idle → running → completed | failed | fallback.
// 'stale' marks a cache entry that needs regeneration but hasn't started yet.

export const AI_STATE = {
  IDLE:      'idle',
  RUNNING:   'running',
  COMPLETED: 'completed',
  FAILED:    'failed',
  FALLBACK:  'fallback',   // AI failed; rule-based or cached result used instead
  STALE:     'stale',      // cached result exists but is outdated
  PARTIAL:   'partial',    // operation completed but with warnings or missing data
}

// ── Error classification ──────────────────────────────────────────────────────
// Maps API errors to stable codes that callers can branch on.
// callClaude() in aiExtractor.js throws errors whose messages already describe
// these cases in user-friendly terms; these codes are for programmatic logic.

export const AI_ERROR_CODE = {
  INVALID_KEY:          'invalid_key',
  RATE_LIMITED:         'rate_limited',
  TIMED_OUT:            'timed_out',
  BAD_FORMAT:           'bad_format',
  INSUFFICIENT_CONTENT: 'insufficient_content',
  EPUB_DRM:             'epub_drm',
  EPUB_CORRUPT:         'epub_corrupt',
  EPUB_TOO_LARGE:       'epub_too_large',
  EPUB_INVALID:         'epub_invalid',
  NETWORK_ERROR:        'network_error',
}

// ── Provider configuration ────────────────────────────────────────────────────
// Single source of truth for Anthropic API integration details.
// Changing MODEL here upgrades all AI operations simultaneously.
// Keeping this extracted prepares for future provider-switching without
// touching individual operation functions.

export const PROVIDER_CONFIG = {
  apiUrl:    'https://api.anthropic.com/v1/messages',
  model:     'claude-haiku-4-5',
  timeoutMs: 50_000,
  version:   '2023-06-01',
}

// ── Dev-only structured logging ───────────────────────────────────────────────
// Emits structured debug events in development only. No-ops in production.
// Use instead of ad-hoc console.log in AI operation paths.
// Output visible in browser DevTools console filtered by "[AI:" prefix.

export function devLog(op, event, data = {}) {
  if (!import.meta.env?.DEV) return
  console.debug(`[AI:${op}] ${event}`, { ...data, _ts: Date.now() })
}

// ── In-flight request deduplication ──────────────────────────────────────────
// Prevents concurrent duplicate AI calls for the same logical operation.
// If a request with the same key is already in flight, returns the same promise.
//
// Key format convention:
//   'reflections:{bookId}'  — companion reflection generation
//   'discussion:{bookId}'   — discussion question generation
//   'extraction:{bookId}'   — AI narrative extraction (EPUB import)
//
// The map is module-level: deduplication spans all component instances in one tab.
// It is NOT deduplicated across browser tabs (each tab has its own module scope).
//
// Typical guard pattern in a component:
//   if (isInflight(`reflections:${book.id}`)) return
//   dedupRequest(`reflections:${book.id}`, () => generateCompanionReflections(...))

const _inflight = new Map()

/**
 * Deduplicate an async operation by key.
 * If a request for this key is already in flight, returns the existing promise.
 * Otherwise calls fn() and tracks the resulting promise until it settles.
 *
 * @param {string}   key  Deduplication key (see format convention above)
 * @param {Function} fn   Function returning a Promise (called at most once per key)
 * @returns {Promise}
 */
export function dedupRequest(key, fn) {
  if (_inflight.has(key)) {
    devLog('dedup', 'hit', { key })
    return _inflight.get(key)
  }
  devLog('dedup', 'new', { key })
  const promise = Promise.resolve()
    .then(fn)
    .finally(() => { _inflight.delete(key) })
  _inflight.set(key, promise)
  return promise
}

/**
 * Returns true if a request for this key is currently in flight.
 * Use as a quick guard before triggering new requests.
 */
export function isInflight(key) {
  return _inflight.has(key)
}

/**
 * Returns an array of currently in-flight operation keys.
 * Exported for DebugPage inspection; not used in production paths.
 */
export function getInflightKeys() {
  return [..._inflight.keys()]
}

// ── Shared API call builder ───────────────────────────────────────────────────
// Constructs the fetch arguments for an Anthropic API request.
//
// When a user API key is present: calls Anthropic directly (existing behaviour).
// When no key is configured: routes through /api/companion (shared alpha key).
//
// Callers receive { url, headers, bodyStr } and should do:
//   fetch(url, { method: 'POST', headers, body: bodyStr, signal })

export function buildAiCall(apiKey, requestBody) {
  const hasKey = !!apiKey?.trim()
  return {
    url: hasKey ? PROVIDER_CONFIG.apiUrl : '/api/companion',
    headers: {
      'Content-Type': 'application/json',
      ...(hasKey ? {
        'x-api-key': apiKey.trim(),
        'anthropic-version': PROVIDER_CONFIG.version,
        'anthropic-dangerous-direct-browser-access': 'true',
      } : {}),
    },
    bodyStr: JSON.stringify(requestBody),
  }
}
