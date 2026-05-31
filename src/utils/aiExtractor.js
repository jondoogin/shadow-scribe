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
import { PROVIDER_CONFIG, AI_OP, devLog, dedupRequest, buildAiCall } from './aiRequest.js'
import { liveItems } from './live.js'

const MAX_CHAPTER_CHARS = 2500  // chars per chapter excerpt — ~600 tokens each
const MAX_CHAPTERS      = 60    // hard cap for very long books

// ── Shared API call helper ────────────────────────────────────────────────────

async function callClaude(apiKey, prompt, maxTokens = 2048, op = 'api') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROVIDER_CONFIG.timeoutMs)

  devLog(op, 'request:start', { maxTokens })

  const { url, headers, bodyStr } = buildAiCall(apiKey, {
    model: PROVIDER_CONFIG.model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  let response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      method: 'POST',
      headers,
      body: bodyStr,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      devLog(op, 'request:timeout')
      throw new Error('Request timed out — please try again')
    }
    devLog(op, 'request:network-error', { message: err.message })
    throw err
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    const msg = errData.error?.message || `API error ${response.status}`
    devLog(op, 'request:error', { status: response.status, msg })
    if (response.status === 401) throw new Error('Invalid API key — check your key in Settings')
    if (response.status === 429) throw new Error('Rate limit reached — please try again in a moment')
    throw new Error(msg)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''
  devLog(op, 'request:complete', { chars: text.length })
  return text
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
  const rawText = await callClaude(apiKey, prompt, 6000, AI_OP.EXTRACTION)

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
- characters: identify 4–12 significant named characters. tier "main" = protagonist(s) and central antagonists (4 max total). tier "secondary" = supporting cast. Set revealChapter to the chapter number where the character first meaningfully appears. Character descriptions must be based only on what is established up to and including their revealChapter — do NOT reference deaths, betrayals, identity reveals, or outcomes from later chapters. When uncertain, describe less.
- summaries: one entry per chapter provided, keyed by chapter number as a string. Past tense, literary tone. Each summary must cover only what happens within that chapter's excerpt — do not reference events from other chapters. Keep each under 60 words.
- mysteries: 5–15 genuinely unresolved questions the narrative raises and does not yet answer. Phrase each as an open question or a statement of withheld information. Skip observations, mundane questions, and anything already resolved within the excerpts. Minimum 25 characters each.

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

  const totalChapters = chapters.length || Infinity

  rawChars.forEach((c, i) => {
    if (!c.name || typeof c.name !== 'string' || !c.name.trim()) return
    const rawReveal = typeof c.revealChapter === 'number' ? Math.floor(c.revealChapter) : 1
    const char = {
      id:            `char_ai_${ts}_${i}`,
      name:          c.name.trim(),
      role:          c.role        || 'supporting',
      description:   c.description || '',
      allegiance:    undefined,
      // Clamp revealChapter: must be ≥1 and ≤ totalChapters. Prevents spoiler-gating failures.
      revealChapter: Math.min(Math.max(rawReveal, 1), totalChapters),
      extracted:     true,
      spoilerSafe:   false,
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
    // Require ≥25 chars — rejects placeholder/truncated summaries
    if (s && typeof s === 'string' && s.trim().length >= 25) {
      summaries[ch.num] = s.trim()
      summariesGenerated++
    }
  })

  if (summariesGenerated === 0) warnings.push('No chapter summaries were generated by AI')

  // ── Mysteries ──────────────────────────────────────────────────────────────
  const rawMysteries = Array.isArray(json.mysteries) ? json.mysteries : []
  const mysteries = rawMysteries
    // Require ≥25 chars and filter out purely declarative statements with no interrogative quality
    .filter(m => m.text && typeof m.text === 'string' && m.text.trim().length >= 25)
    .slice(0, 15)
    .map((m, i) => {
      const rawChap = typeof m.chapter === 'number' ? Math.floor(m.chapter) : 1
      return {
        id:        `myst_ai_${ts}_${i}`,
        text:      m.text.trim(),
        // Clamp chapter attribution to valid range
        chapter:   Math.min(Math.max(rawChap, 1), totalChapters),
        status:    'open',
        resolved:  false,
        extracted: true,
      }
    })

  if (mysteries.length === 0) warnings.push('No mysteries were extracted by AI')

  return {
    characters: { main: mainChars, secondary: secChars, relationships: [] },
    summaries,
    mysteries,
    extractionMeta: {
      method:              'ai',
      model:               PROVIDER_CONFIG.model,
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
export function generateDiscussionQuestions(book, apiKey) {

  return dedupRequest(`discussion:${book.id}`, async () => {
    const pct          = Math.round((book.currentChapter / book.totalChapters) * 100)
    const visibleChaps = book.chapters?.filter(c => c.completed && c.summary) ?? []
    const notes        = liveItems(book.notes).slice(-12)   // most recent 12
    const mysteries    = liveItems(book.mysteries).filter(m => !m.resolved).slice(0, 8)

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

    const rawText = await callClaude(apiKey, prompt, 1500, AI_OP.DISCUSSION)

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
  })
}

// ── Chapter summary generation (post-import) ─────────────────────────────────

/**
 * Generate brief summaries for completed chapters that are missing them.
 *
 * Called from PlotTab when a book has no AI-extracted summaries (e.g. the
 * original import ran the rule-based fallback). Uses Claude's general
 * knowledge of the book — not the raw chapter text — so accuracy varies.
 * The prompt instructs Claude to write an honest placeholder rather than
 * fabricate events for books it doesn't know well.
 *
 * @param {Object} book    Full book object
 * @param {string} apiKey  Anthropic API key (may be empty — proxied in prod)
 * @returns {Object}       { [chapterNum]: summaryString } — numbers as keys
 */
export function generateChapterSummaries(book, apiKey) {
  return dedupRequest(`summaries:${book.id}`, async () => {
    const toGenerate = (book.chapters || [])
      .filter(c => c.completed && !c.summary)
      .slice(0, 40) // cap — avoid enormous prompts for very long books

    if (!toGenerate.length) return {}

    const chapterList = toGenerate
      .map(c => `  Chapter ${c.num}${c.title ? ': ' + c.title : ''}`)
      .join('\n')

    const prompt = `You are writing brief chapter summaries for a reading companion. The book is "${book.title}" by ${book.author}.

Write a 1–2 sentence summary for each of the following completed chapters:
${chapterList}

Return ONLY valid JSON — no markdown, no explanation:
{"summaries": {"1": "summary text", "2": "summary text"}}

Guidelines:
- Past tense, literary tone, under 50 words per summary
- Only cover what happens in that chapter — no references to later events
- If you don't have confident knowledge of a chapter's specific events, write a neutral placeholder such as "A significant chapter in the narrative." rather than inventing details
- The JSON keys must be the chapter numbers shown above`

    const raw      = await callClaude(apiKey, prompt, 2000, AI_OP.SUMMARIES)
    const jsonText = extractJSON(raw)
    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch {
      throw new Error('AI returned an unexpected format — try again')
    }

    const rawMap = parsed.summaries || parsed
    const result = {}
    for (const [k, v] of Object.entries(rawMap)) {
      const num = parseInt(k, 10)
      if (!isNaN(num) && typeof v === 'string' && v.trim()) {
        result[num] = v.trim()
      }
    }
    return result
  })
}

// ── AI reflection context assembly ───────────────────────────────────────────

/**
 * Assembles a compact, high-signal context block for AI reflection generation.
 * Exported for DebugPage inspection — does NOT call the API.
 *
 * Curates aggressively: never dumps all notes or all metadata.
 * Favors specific, grounded signals over volume.
 * Spoiler-safe by construction: reads only notes, open mysteries, and session
 * data — never chapter summaries, future character states, or any data beyond
 * book.currentChapter.
 *
 * @param {Object} ctx  Output of assembleReflectionContext()
 * @returns {{ lines: string[], signals: string[], estimatedChars: number }}
 */
export function buildAIReflectionContext(ctx) {
  const lines   = []
  const signals = []

  // 1. Theory patterns — revised theories first (returned-to = stronger signal)
  if (ctx.theoryNotes.length >= 2) {
    const sorted  = [...ctx.theoryNotes].sort((a, b) => (b.revisedAt ? 1 : 0) - (a.revisedAt ? 1 : 0))
    const samples = sorted.slice(0, 2).map(n => `"${n.text.slice(0, 85)}"`)
    const revNote = ctx.revisedTheories.length ? `, ${ctx.revisedTheories.length} revised` : ''
    lines.push(`Theory notes (${ctx.theoryNotes.length}${revNote}): ${samples.join(' / ')}`)
    signals.push('theory-arc')
  }

  // 2. Interpretation shift — most specific grounding signal; always include if present
  if (ctx.interpretationShifts.length > 0) {
    const s = ctx.interpretationShifts[0]
    lines.push(`Shifting view of ${s.name}: early notes felt ${s.earlyValence}; recent notes feel ${s.lateValence} (${s.noteCount} notes)`)
    signals.push('interpretation-shift')
  }

  // 3. Dominant recurring theme (only when 3+ notes carry it)
  if (ctx.dominantTheme && (ctx.themeCount[ctx.dominantTheme] || 0) >= 3) {
    const label = ctx.dominantTheme === 'obsession' ? 'fixation' : ctx.dominantTheme
    lines.push(`Recurring theme across notes: ${label} (${ctx.themeCount[ctx.dominantTheme]} notes)`)
    signals.push('theme-persistence')
  }

  // 4. Highest-resonance note: revised AND reflected = deepest reader investment
  const deepNote = ctx.highResonanceNotes.find(n => n.revisedAt && n.reflection)
  if (deepNote) {
    lines.push(`Most-revisited note: "${deepNote.text.slice(0, 85)}" (revised and reflected on)`)
    signals.push('resonance-anchor')
  }

  // 5. Confusion signal (2+ notes)
  if (ctx.confusingNotes.length >= 2) {
    const sample = `"${ctx.confusingNotes[0].text.slice(0, 70)}"`
    lines.push(`Confusing passages (${ctx.confusingNotes.length}): ${sample}`)
    signals.push('confusion-signal')
  }

  // 6. Favourite passages — count only (text already surfaced via resonance)
  if (ctx.favoriteNotes.length >= 2) {
    lines.push(`Favourite passages marked: ${ctx.favoriteNotes.length}`)
    signals.push('reader-attention')
  }

  // 7. Temporal arc
  if (ctx.temporalEvolution) {
    const label = {
      'confusion-to-theory': 'early notes confused; recent notes interpretive',
      'sustained-theory':    'theorising consistently throughout',
      'late-favorites':      'favourite passages accumulating in the second half',
    }[ctx.temporalEvolution]
    lines.push(`Reading arc: ${label}`)
    signals.push('temporal-evolution')
  }

  // 8. Oldest open mystery — only if aged ≥5 chapters (otherwise too fresh)
  if (ctx.longestOpenMystery) {
    const age = ctx.currentChapter - (ctx.longestOpenMystery.chapter || 0)
    if (age >= 5) {
      lines.push(`Oldest open question (${age} chapters): "${ctx.longestOpenMystery.text?.slice(0, 75)}"`)
      signals.push('mystery-continuity')
    }
  }

  // 9. Recurring character in theories — only when theory count is strong
  if (ctx.theoryCharFocus.length > 0 && ctx.theoryNotes.length >= 3) {
    lines.push(`Character recurring in theories: ${ctx.theoryCharFocus[0]}`)
    signals.push('character-focus')
  }

  // 10. Reading gap — signal for temporal context (only when meaningfully long)
  if (ctx.daysSinceLast !== null && ctx.daysSinceLast > 7) {
    lines.push(`Days since last reading session: ${ctx.daysSinceLast}`)
    signals.push('reading-gap')
  }

  // 11. Reread context — lets AI acknowledge the reader's prior familiarity
  if ((ctx.currentEra ?? 0) > 0) {
    const ordinals = ['second', 'third', 'fourth', 'fifth']
    const ordinal  = ordinals[ctx.currentEra - 1] ?? `${ctx.currentEra + 1}th`
    lines.push(`Reading era: ${ordinal} reading of this book`)
    signals.push('reread-context')
  }

  // 12. Cross-era character shift — strongest reread recognition signal
  if (ctx.crossEraShifts?.length > 0) {
    const s = ctx.crossEraShifts[0]
    lines.push(`Cross-reading shift: ${s.name} read as ${s.prevValence} before, ${s.currValence} now`)
    signals.push('cross-era-shift')
  }

  const bounded = lines.slice(0, 12)  // expanded hard cap for reread context
  return {
    lines:          bounded,
    signals,
    estimatedChars: bounded.join('\n').length,
  }
}

// ── Companion reflection generation ──────────────────────────────────────────

/**
 * Generate AI-synthesized companion reflections grounded in the reader's
 * actual engagement patterns: recurring themes, interpretation shifts,
 * high-resonance notes, and unresolved emotional tensions.
 *
 * Returns ReflectionEntry-shaped objects with `priority` (derived from signal
 * strength) and `_sourceSignals` / `_sourceLineCount` (internal QA metadata).
 *
 * @param {Object} ctx     Output of assembleReflectionContext()
 * @param {string} apiKey  Anthropic API key
 * @returns {Array}        ReflectionEntry[]
 */
export async function generateCompanionReflections(ctx, apiKey, insightStyle = 'observational') {
  if (ctx.noteCount < 5) throw new Error('Not enough notes for AI reflection')

  const { lines, signals } = buildAIReflectionContext(ctx)
  if (lines.length === 0) return []

  const bookRef = `"${ctx.title}"${ctx.author ? ` by ${ctx.author}` : ''}`

  const styleInstruction = insightStyle === 'analytical'
    ? 'Name patterns directly and precisely. You may state what a reading behavior suggests, but stay close to the evidence — do not drift into literary criticism or interpretation of the book itself.'
    : insightStyle === 'minimal'
    ? 'Be extremely spare — one short sentence each. Barely there. No elaboration.'
    : 'Write as if watching quietly from a distance — name what you observe, not what it means.'

  const rereadNote = (ctx.currentEra ?? 0) > 0
    ? `\nThis is not their first reading — reflections may acknowledge that prior familiarity has shaped how they approach this book now. Do not reference events beyond chapter ${ctx.currentChapter}.`
    : ''

  const prompt = `You are writing 3 companion reflections for a reader of ${bookRef}. They are ${ctx.pct}% through (chapter ${ctx.currentChapter} of ${ctx.totalChapters}).${rereadNote}

What you know about how they have been reading:
${lines.join('\n')}

Write 3 short companion reflections. These notice patterns in how this reader has been engaging — what they keep returning to, how their understanding has shifted, what remains unresolved. Not summaries of the book.

Writing style: ${styleInstruction}

Requirements:
- 1–2 sentences each. No longer.
- Literary, restrained, quietly perceptive.
- Each reflection notices something different: vary the angle across character, pattern, emotional register, or interpretive shift.
- Do NOT quote the reader's notes directly.
- Do NOT reference future chapters or events past chapter ${ctx.currentChapter}.
- Prohibited phrases: "I notice", "It seems", "You might", "It appears", "As a reader", "This reader", "Your journey", "You seem", "You have been", "One can see", "There is a", "This speaks to", "This resonates", "That's a sign", "That kind of reading", "You are a reader who", "What this suggests", "This is a reading that".
- Do not open a reflection with "The [abstract noun]" (e.g. "The tension", "The weight", "The sense").
- Do not repeat "still open", "still here", or "still unresolved" across the 3 reflections — vary how you hold absence and uncertainty.
- No therapy-speak. No faux profundity. No chatbot wisdom. No evaluative praise ("that's a deep reading", "well-noticed").

Return ONLY a JSON array of 3 strings. No markdown, no explanation.`

  const raw = await callClaude(apiKey, prompt, 480, AI_OP.REFLECTIONS)

  let arr
  try {
    arr = JSON.parse(extractJSON(raw))
  } catch {
    return []
  }

  if (!Array.isArray(arr)) return []

  // Derive priority from which signals were present in context
  // Higher-signal context → higher priority → surfaces sooner in rotation
  const topPriority = signals.includes('interpretation-shift') ? 3
    : (signals.includes('resonance-anchor') || signals.includes('theme-persistence')) ? 2
    : 1
  const priorities = [topPriority, Math.max(topPriority - 1, 1), 1]

  const ts = Date.now()
  return arr
    .filter(s => typeof s === 'string' && s.trim().length > 10)
    .slice(0, 3)
    .map((text, i) => ({
      id:                `ai_${ts}_${i}`,
      text:              text.trim(),
      type:              'ai',
      priority:          priorities[i] ?? 1,
      surfaceCount:      0,
      lastSurfaced:      null,
      suppressed:        false,
      generatedAt:       new Date().toISOString(),
      // Internal QA metadata — dev/debug only, not rendered in UI
      _sourceSignals:    signals,
      _sourceLineCount:  lines.length,
    }))
}
