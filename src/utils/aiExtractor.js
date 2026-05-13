/**
 * aiExtractor.js — AI-powered narrative extraction via Anthropic API
 *
 * Calls Claude Haiku directly from the browser. Requires the
 * anthropic-dangerous-direct-browser-access header, which is appropriate
 * for personal apps where the user supplies their own key.
 *
 * Returns the same shape as extractNarrative() in narrativeExtractor.js
 * so EpubImportReview can use either path without structural changes.
 */

import { cleanChapterHtml } from './narrativeExtractor.js'

const API_URL  = 'https://api.anthropic.com/v1/messages'
const MODEL    = 'claude-3-5-haiku-20241022'
const MAX_CHAPTER_CHARS = 2500  // chars per chapter excerpt — ~600 tokens each
const MAX_CHAPTERS      = 60    // hard cap for very long books

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Extract characters, chapter summaries, and mysteries using Claude.
 *
 * @param {Object} chapterContents  { [chapterNum]: rawHtmlString }
 * @param {Array}  chapters         Chapter objects from the book
 * @param {string} apiKey           Anthropic API key (sk-ant-...)
 * @param {Object} opts             Optional: { title, author }
 * @returns {Object}                Same shape as extractNarrative()
 */
export async function aiExtractNarrative(chapterContents, chapters, apiKey, { title = '', author = '' } = {}) {
  if (!apiKey?.trim()) throw new Error('No API key provided')

  const chaptersToProcess = chapters.slice(0, MAX_CHAPTERS)

  // Build the chapter excerpt block sent to Claude
  const excerpts = chaptersToProcess
    .filter(ch => chapterContents[ch.num])
    .map(ch => {
      const text = cleanChapterHtml(chapterContents[ch.num])
      return `[Chapter ${ch.num}: ${ch.title}]\n${text.trim().slice(0, MAX_CHAPTER_CHARS)}`
    })
    .join('\n\n---\n\n')

  if (!excerpts) throw new Error('No chapter content available for extraction')

  const bookRef = title
    ? `"${title}"${author ? ` by ${author}` : ''}`
    : 'this novel'

  const prompt = buildPrompt(bookRef, excerpts)

  // ── API call ──────────────────────────────────────────────────────────────
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 6000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    const msg = errData.error?.message || `API error ${response.status}`
    if (response.status === 401) throw new Error('Invalid API key — check your key in Settings')
    if (response.status === 429) throw new Error('Rate limit reached — please try again in a moment')
    throw new Error(msg)
  }

  const data    = await response.json()
  const rawText = data.content?.[0]?.text ?? ''

  // Parse JSON — handle potential markdown fences
  let parsed
  try {
    parsed = JSON.parse(extractJSON(rawText))
  } catch {
    throw new Error('AI returned an unexpected format — try again')
  }

  return normalizeAIResult(parsed, chaptersToProcess)
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(bookRef, excerpts) {
  return `You are a literary analysis assistant for a reading companion app. Analyze these chapter excerpts from ${bookRef} and extract structured narrative data.

Return ONLY a valid JSON object — no markdown fences, no explanation outside the JSON:

{
  "characters": [
    {
      "name": "Character Full Name",
      "role": "protagonist|antagonist|supporting",
      "tier": "main|secondary",
      "description": "1-2 sentence description of who this character is",
      "revealChapter": <chapter number where this character first appears>
    }
  ],
  "summaries": {
    "1": "2-3 sentence summary of chapter 1 in past tense",
    "2": "2-3 sentence summary of chapter 2 in past tense"
  },
  "mysteries": [
    {
      "text": "What unanswered question does the story raise here?",
      "chapter": <chapter number where this mystery first appears>
    }
  ]
}

Rules:
- characters: identify 4–12 significant named characters. tier "main" = protagonist(s) and central antagonists (4 max total). tier "secondary" = supporting cast.
- summaries: one entry per chapter provided, keyed by chapter number as a string. Past tense, literary tone, no spoilers beyond that chapter's excerpt. Keep each under 60 words.
- mysteries: 5–15 genuinely unresolved questions raised by the narrative. Focus on withheld information, unexplained events, and character motivations. Skip trivial or mundane questions.

Chapter excerpts:

${excerpts}`
}

// ── JSON extraction ───────────────────────────────────────────────────────────

/** Pull a JSON object out of text that might have markdown or prose around it */
function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced) return fenced[1].trim()
  const start = text.indexOf('{')
  const end   = text.lastIndexOf('}')
  if (start !== -1 && end > start) return text.slice(start, end + 1)
  return text.trim()
}

// ── Result normalization ──────────────────────────────────────────────────────

/** Map AI JSON to the same shape extractNarrative() produces */
function normalizeAIResult(json, chapters) {
  const warnings = []
  const ts = Date.now()

  // ── Characters ─────────────────────────────────────────────────────────────
  const rawChars  = Array.isArray(json.characters) ? json.characters : []
  const mainChars = []
  const secChars  = []

  rawChars.forEach((c, i) => {
    if (!c.name || typeof c.name !== 'string') return
    const char = {
      id:           `char_ai_${ts}_${i}`,
      name:         c.name.trim(),
      role:         c.role        || 'supporting',
      description:  c.description || '',
      allegiance:   undefined,
      revealChapter: typeof c.revealChapter === 'number' ? c.revealChapter : 1,
      extracted:    true,
      spoilerSafe:  false,
    }
    if (c.tier === 'main') mainChars.push(char)
    else                   secChars.push(char)
  })

  if (rawChars.length === 0) warnings.push('No characters were extracted by AI')

  // ── Summaries ──────────────────────────────────────────────────────────────
  const rawSummaries    = json.summaries && typeof json.summaries === 'object' ? json.summaries : {}
  const summaries       = {}
  let   summariesGenerated = 0

  chapters.forEach(ch => {
    const s = rawSummaries[String(ch.num)] ?? rawSummaries[ch.num]
    if (s && typeof s === 'string' && s.trim()) {
      summaries[ch.num] = s.trim()
      summariesGenerated++
    }
  })

  if (summariesGenerated === 0) warnings.push('No chapter summaries were generated by AI')

  // ── Mysteries ──────────────────────────────────────────────────────────────
  const rawMysteries = Array.isArray(json.mysteries) ? json.mysteries : []
  const mysteries = rawMysteries
    .filter(m => m.text && typeof m.text === 'string')
    .slice(0, 15)
    .map((m, i) => ({
      id:       `myst_ai_${ts}_${i}`,
      text:     m.text.trim(),
      chapter:  typeof m.chapter === 'number' ? m.chapter : 1,
      status:   'open',
      resolved: false,
      extracted: true,
    }))

  if (mysteries.length === 0) warnings.push('No mysteries were extracted by AI')

  return {
    characters: { main: mainChars, secondary: secChars, relationships: [] },
    summaries,
    mysteries,
    extractionMeta: {
      method:              'ai',
      model:               MODEL,
      chaptersExtracted:   chapters.length,
      summariesGenerated,
      characterCount:      mainChars.length + secChars.length,
      mysteryCount:        mysteries.length,
      warnings,
    },
  }
}
