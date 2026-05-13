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

// ── Shared API call helper ────────────────────────────────────────────────────

async function callClaude(apiKey, prompt, maxTokens = 2048) {
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
      max_tokens: maxTokens,
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

  const data = await response.json()
  return data.content?.[0]?.text ?? ''
}

// ── Main exports ──────────────────────────────────────────────────────────────

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

  const prompt  = buildPrompt(bookRef, excerpts)
  const rawText = await callClaude(apiKey, prompt, 6000)

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

// ── Discussion question generation ────────────────────────────────────────────

/**
 * Generate 6-8 literary discussion questions tailored to the reader's
 * current position and notes. Questions are stored as plain strings in
 * book.discussionQuestions.
 *
 * @param {Object} book     Full book object (uses title, author, progress, notes, summaries, mysteries)
 * @param {string} apiKey   Anthropic API key
 * @returns {string[]}      Array of question strings
 */
export async function generateDiscussionQuestions(book, apiKey) {
  if (!apiKey?.trim()) throw new Error('No API key provided')

  const pct          = Math.round((book.currentChapter / book.totalChapters) * 100)
  const visibleChaps = book.chapters?.filter(c => c.completed && c.summary) ?? []
  const notes        = (book.notes || []).slice(-12)   // most recent 12
  const mysteries    = (book.mysteries || []).filter(m => !m.resolved).slice(0, 8)

  // Build context block
  const parts = []

  if (visibleChaps.length > 0) {
    parts.push('Chapter summaries so far:\n' +
      visibleChaps.slice(-8).map(c => `  Ch.${c.num} ${c.title}: ${c.summary}`).join('\n'))
  }

  if (notes.length > 0) {
    parts.push('Reader notes:\n' +
      notes.map(n => `  [${n.tag}] ${n.text}`).join('\n'))
  }

  if (mysteries.length > 0) {
    parts.push('Open mysteries the reader is tracking:\n' +
      mysteries.map(m => `  "${m.text}"`).join('\n'))
  }

  const context = parts.length > 0
    ? `\n\nContext from their reading so far:\n${parts.join('\n\n')}`
    : ''

  const position = pct >= 99
    ? 'has just finished the book'
    : pct >= 75
      ? `is in the final quarter (${pct}% through)`
      : pct >= 50
        ? `is past the midpoint (${pct}% through)`
        : `is ${pct}% through`

  const prompt = `You are generating literary discussion questions for a reader of "${book.title}" by ${book.author}. The reader ${position} (chapter ${book.currentChapter} of ${book.totalChapters}).${context}

Generate 6-8 thoughtful discussion questions that:
- Are genuinely tailored to THIS book's themes, characters, and situations
- Are appropriate for where they are (no spoilers past chapter ${book.currentChapter})
- Range across: character psychology, thematic depth, structural craft, and personal resonance
- Feel like questions worth a long conversation, not yes/no answers

Return ONLY a JSON array of strings — no markdown, no explanation:
["Question one?", "Question two?", ...]`

  const rawText = await callClaude(apiKey, prompt, 1500)

  // Parse the array
  const jsonText = extractJSON(rawText)
  let questions
  try {
    questions = JSON.parse(jsonText)
  } catch {
    throw new Error('AI returned an unexpected format — try again')
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('No questions were generated — try again')
  }

  return questions.filter(q => typeof q === 'string' && q.trim()).map(q => q.trim())
}

// ── Companion reflection generation ──────────────────────────────────────────

/**
 * Generate AI-synthesized companion reflections from an assembled reflection
 * context (produced by reflectionEngine.assembleReflectionContext).
 *
 * Returns an array of ReflectionEntry-shaped objects ready to be stored in
 * book.reflectionCache.reflections.
 *
 * @param {Object} ctx     Output of assembleReflectionContext()
 * @param {string} apiKey  Anthropic API key
 * @returns {Array}        ReflectionEntry[]
 */
export async function generateCompanionReflections(ctx, apiKey) {
  if (!apiKey?.trim()) throw new Error('No API key provided')
  if (ctx.noteCount < 5) throw new Error('Not enough notes for AI reflection')

  // Build a compact, spoiler-safe context block
  const lines = []

  if (ctx.theoryNotes.length) {
    const samples = ctx.theoryNotes.slice(0, 3).map(n => `"${n.text.slice(0, 90)}"`)
    lines.push(`Theory notes (${ctx.theoryNotes.length}): ${samples.join(' / ')}`)
  }
  if (ctx.confusingNotes.length) {
    const samples = ctx.confusingNotes.slice(0, 2).map(n => `"${n.text.slice(0, 70)}"`)
    lines.push(`Confusing passages noted (${ctx.confusingNotes.length}): ${samples.join(' / ')}`)
  }
  if (ctx.favoriteNotes.length) {
    const samples = ctx.favoriteNotes.slice(0, 2).map(n => `"${n.text.slice(0, 70)}"`)
    lines.push(`Favourite passages (${ctx.favoriteNotes.length}): ${samples.join(' / ')}`)
  }
  if (ctx.characterNotes.length) {
    lines.push(`Character notes (${ctx.characterNotes.length})${ctx.focusedCharacters.length ? `, recurring name: ${ctx.focusedCharacters[0]}` : ''}`)
  }
  if (ctx.revisedNotes.length) {
    lines.push(`Notes revised since first written: ${ctx.revisedNotes.length}`)
  }
  if (ctx.reflectedNotes.length) {
    lines.push(`Notes with a later reflection added: ${ctx.reflectedNotes.length}`)
  }
  if (ctx.temporalEvolution) {
    const label = {
      'confusion-to-theory': 'early notes were confused; later notes are interpretive',
      'sustained-theory':    'consistent theorising throughout',
      'late-favorites':      'favourite passages appearing more in the second half',
    }[ctx.temporalEvolution]
    lines.push(`Reading pattern: ${label}`)
  }
  if (ctx.longestOpenMystery) {
    const age = ctx.currentChapter - (ctx.longestOpenMystery.chapter || 0)
    lines.push(`Oldest open mystery (${age} chapters unresolved): "${ctx.longestOpenMystery.text?.slice(0, 80)}"`)
  }
  if (ctx.theoryCharFocus.length) {
    lines.push(`Character appearing most in theories: ${ctx.theoryCharFocus[0]}`)
  }

  const prompt = `You are the reading companion for a reader of "${ctx.title}"${ctx.author ? ` by ${ctx.author}` : ''}. They are ${ctx.pct}% through the book (chapter ${ctx.currentChapter} of ${ctx.totalChapters}).

Here is what you know about their reading so far:
${lines.join('\n')}

Write 3 short companion reflections. These are NOT summaries. They notice patterns in the reader's own engagement — what they keep returning to, how their understanding shifts, what they keep circling.

Strict rules:
- Each reflection is 1–2 sentences maximum
- Tone: literary, restrained, quietly perceptive — NOT chatbot, NOT therapist, NOT writing coach
- Do NOT quote the reader's notes directly
- Do NOT reference future chapters or events
- Do NOT use phrases like "I notice", "It seems", "You might", "It appears", "As a reader"
- Write as if the companion has been watching quietly — not analysing loudly
- Vary sentence rhythm — avoid starting consecutive reflections the same way

Return ONLY a JSON array of 3 strings. No other text.`

  const raw = await callClaude(apiKey, prompt, 500)

  let arr
  try {
    arr = JSON.parse(extractJSON(raw))
  } catch {
    return []
  }

  if (!Array.isArray(arr)) return []

  const ts = Date.now()
  return arr
    .filter(s => typeof s === 'string' && s.trim().length > 10)
    .slice(0, 4)
    .map((text, i) => ({
      id:           `ai_${ts}_${i}`,
      text:         text.trim(),
      type:         'ai',
      surfaceCount:  0,
      lastSurfaced:  null,
      suppressed:    false,
      generatedAt:   new Date().toISOString(),
    }))
}
