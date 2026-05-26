/**
 * companionThread.js — AI-generated note thread responses + semantic echo detection
 *
 * Generates a companion response to each reader note, grounded in
 * the specific book, the reader's full interpretive history in it,
 * and the evolving emotional texture of what they've been attending to.
 *
 * Also exports detectNoteEcho: a semantic scanner that surfaces older
 * notes that resonate with a newly written one — by keyword overlap
 * AND emotional cluster proximity. Distinguishes era echoes (from a
 * previous reading) from within-reading resonances.
 *
 * Falls back to canned responses when no API key is present.
 */

import { PROVIDER_CONFIG } from './aiRequest.js'
import { detectConfidenceDrift, detectFixations } from './readerState.js'
import { detectMotifs } from './residueMemory.js'

// ── Stopwords ─────────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  'the','a','an','and','or','but','is','it','its','this','that','with','for','of',
  'in','on','at','to','by','be','was','are','were','has','have','had','not','no',
  'i','my','me','he','she','they','them','his','her','their','we','our','you','your',
  'who','what','when','where','why','how','would','could','should','might','does',
  'did','do','than','then','so','if','as','from','up','out','about','which','been',
  'into','through','after','before','between','also','just','really','very','more',
  'some','like','think','know','feel','see','get','make','way','even','still','seem',
  'here','there','these','those','such','only','well','will','same','being','going',
])

// ── Emotional clusters for resonance detection ────────────────────────────────
// Words within a cluster are treated as semantically related when scoring echo
// candidates. A note about "grief" resonates with one about "loss" — not
// because the words match, but because they occupy the same emotional territory.
const EMOTIONAL_CLUSTERS = [
  ['grief', 'loss', 'death', 'dying', 'missing', 'gone', 'mourning', 'absence', 'buried', 'bereaved', 'widow', 'orphan'],
  ['fear', 'afraid', 'dread', 'terror', 'scared', 'horror', 'threatening', 'danger', 'uneasy', 'anxiety'],
  ['wonder', 'strange', 'uncanny', 'surreal', 'impossible', 'bizarre', 'mysterious', 'liminal', 'eerie', 'haunted'],
  ['love', 'tender', 'warmth', 'care', 'belonging', 'connection', 'trust', 'comfort', 'safe', 'hope'],
  ['guilt', 'betrayal', 'wrong', 'complicit', 'conscience', 'regret', 'integrity', 'moral', 'responsibility'],
  ['power', 'control', 'escape', 'trapped', 'desperate', 'pressure', 'violence', 'conflict', 'struggle'],
  ['identity', 'becoming', 'self', 'memory', 'past', 'displacement', 'origin', 'inheritance', 'exile'],
]

// Human-readable labels for each cluster — used in ambient observations
const CLUSTER_LABELS = ['grief', 'fear', 'wonder', 'love', 'guilt', 'power', 'identity']

function extractKeywords(text) {
  return text.toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
}

function clusterOf(word) {
  for (let i = 0; i < EMOTIONAL_CLUSTERS.length; i++) {
    if (EMOTIONAL_CLUSTERS[i].includes(word)) return i
  }
  return -1
}

// Score semantic overlap between two keyword sets.
// Exact match = 1.0 pt. Same emotional cluster = 0.6 pt.
function scoreOverlap(keywords, noteWords) {
  let score = 0
  for (const k of keywords) {
    if (noteWords.includes(k)) {
      score += 1
    } else {
      const kc = clusterOf(k)
      if (kc >= 0 && noteWords.some(w => clusterOf(w) === kc)) {
        score += 0.6
      }
    }
  }
  return score
}

// ── Dominant emotional cluster detection ──────────────────────────────────────
// Identifies the emotional territory a reader has been inhabiting most across
// their notes. Returns null when notes are too few or no cluster is dominant.
// Dominant = ≥35% of all emotionally-scored keywords. Requires ≥6 scored words.
//
// This is the foundation of emotional trajectory awareness — the companion can
// observe "you've been writing in the territory of grief" without naming it
// explicitly. Used in AI thread context and in note-area presence observations.

export function detectDominantCluster(notes) {
  if (!notes?.length || notes.length < 5) return null
  const counts = new Array(EMOTIONAL_CLUSTERS.length).fill(0)
  let total = 0
  for (const note of notes) {
    for (const w of extractKeywords(note.text || '')) {
      const ci = clusterOf(w)
      if (ci >= 0) { counts[ci]++; total++ }
    }
  }
  if (total < 6) return null
  const maxCount = Math.max(...counts)
  const maxIdx   = counts.indexOf(maxCount)
  const pct      = maxCount / total
  if (pct < 0.35) return null
  return { label: CLUSTER_LABELS[maxIdx], pct }
}

// ── Note echo detection ───────────────────────────────────────────────────────
// Finds the best-resonating older note from the book's corpus.
// Threshold: 1.5 (allows cluster matches; not just exact words).
// Returns the note object extended with __echoType: 'era' | 'resonance', or null.
//
// 'era' — the echo is from a previous reading (rereadEra < rereadCount).
//         This is a cross-era echo: first-reading certainty surfacing into reread.
// 'resonance' — within the current reading; an earlier thought returning.

export function detectNoteEcho(newNote, existingNotes, rereadCount = 0) {
  if (!existingNotes || existingNotes.length === 0) return null
  const keywords = extractKeywords(newNote.text || '')
  if (keywords.length < 2) return null

  let bestNote  = null
  let bestScore = 0

  for (const note of existingNotes) {
    if (note.id === newNote.id) continue
    const noteWords = extractKeywords(note.text || '')
    let score = scoreOverlap(keywords, noteWords)

    // Chapter proximity — prefer echoes from nearby chapters (same or within 2)
    if (newNote.chapter && note.chapter) {
      const diff = Math.abs(newNote.chapter - note.chapter)
      if (diff === 0) score += 0.5
      else if (diff <= 2) score += 0.2
    }

    if (score >= 1.5 && score > bestScore) {
      bestScore = score
      bestNote  = note
    }
  }

  if (!bestNote) return null

  const isEraEcho = rereadCount > 0 &&
    bestNote.rereadEra !== undefined &&
    bestNote.rereadEra < rereadCount

  return { ...bestNote, __echoType: isEraEcho ? 'era' : 'resonance' }
}

// ── Fallback pool ─────────────────────────────────────────────────────────────
const FALLBACKS = {
  theory:    'Held here until the text responds.',
  confusing: 'Not yet resolved — keep it open.',
  favorite:  'Something here has caught and held.',
  quote:     'Worth carrying forward.',
  character: 'This person is staying with you.',
  default:   'Noted.',
}

export function threadFallback(tag) {
  return FALLBACKS[tag] ?? FALLBACKS.default
}

// ── AI call ───────────────────────────────────────────────────────────────────

/**
 * Generate a companion response to a newly added note.
 *
 * @param {Object} note         The note just added { text, tag, chapter }
 * @param {Object} book         The full book object (notes = pre-addition corpus)
 * @param {string} apiKey       Anthropic API key
 * @param {Object} [context]    { echo } — an older resonant note (with __echoType) or null
 * @returns {Promise<string>}   One or two sentence companion response
 */
export async function generateNoteThreadResponse(note, book, apiKey, context = {}) {
  if (!apiKey?.trim()) throw new Error('No API key')

  const { echo = null } = context

  // ── Reading history signals ─────────────────────────────────────────────
  const allNotes       = book.notes || []
  const theoryNotes    = allNotes.filter(n => n.tag === 'theory')
  const theoryCount    = theoryNotes.length
  const collapsedCount = theoryNotes.filter(n => n.revisedAt).length
  const confusingCount = allNotes.filter(n => n.tag === 'confusing').length
  const rereadCount    = book.rereadCount || 0

  // Theory recontextualization — detect if the new note relates to a prior
  // theory that was later revised. When the reader returns to ground that
  // already shifted once, the companion can hold that awareness.
  const noteKeywords    = extractKeywords(note.text || '')
  const relatedCollapse = (note.tag === 'theory' || note.tag === 'confusing')
    ? theoryNotes.find(n =>
        n.revisedAt &&
        n.id !== note.id &&
        scoreOverlap(noteKeywords, extractKeywords(n.text || '')) >= 1.0
      )
    : null

  // ── Emotional trajectory — what arc has this reading been tracing? ─────
  // These signals give the companion awareness of the reader's interpretive
  // momentum — not just isolated notes, but the direction of travel.
  const confidenceArc    = allNotes.length >= 5 ? detectConfidenceDrift(allNotes).arc : null
  const dominantCluster  = detectDominantCluster(allNotes)
  const topFixation      = allNotes.length >= 6 ? (detectFixations(allNotes)[0] ?? null) : null
  // Recurring motifs — concrete words that keep surfacing across ≥3 notes.
  // These are the textural fingerprint of a reading; the companion can be
  // aware of what imagery keeps returning without naming the pattern.
  const motifs           = allNotes.length >= 5 ? detectMotifs(allNotes, book.currentChapter || Infinity) : []

  // ── Recent note context (up to 5) ─────────────────────────────────────
  const recentNotes = allNotes
    .filter(n => n.id !== note.id)
    .slice(-5)
    .map(n => `  — [${n.tag}] ${n.text}`)
    .join('\n')

  // ── Book context ───────────────────────────────────────────────────────
  const bookContext = [
    `"${book.title}"${book.author ? ` by ${book.author}` : ''}`,
    book.description ? `\nDescription: ${book.description}` : '',
    book.currentChapter ? `\nReader is at chapter ${book.currentChapter}.` : '',
  ].join('')

  // ── History lines ──────────────────────────────────────────────────────
  const historyLines = []
  if (rereadCount > 0)
    historyLines.push(
      `This is their ${rereadCount === 1 ? 'second' : `${rereadCount + 1}th`} reading — annotations carry the weight of a returning reader.`
    )
  if (theoryCount > 0)
    historyLines.push(
      `They have written ${theoryCount} ${theoryCount === 1 ? 'theory' : 'theories'}${collapsedCount > 0 ? `, ${collapsedCount} of which ${collapsedCount === 1 ? 'was' : 'were'} later revised` : ''}.`
    )
  if (confusingCount >= 3)
    historyLines.push(
      `They have marked ${confusingCount} things as confusing — uncertainty has been accumulating.`
    )
  if (relatedCollapse)
    historyLines.push(
      `A related certainty from earlier in this reading was later revised — the ground here has shifted before.`
    )
  if (confidenceArc === 'collapsing')
    historyLines.push(
      `Their interpretive certainty has been declining across the reading — earlier confidence is giving way to doubt.`
    )
  else if (confidenceArc === 'building')
    historyLines.push(
      `Their certainty has been strengthening as they read deeper into the book.`
    )
  else if (confidenceArc === 'oscillating')
    historyLines.push(
      `Their reading has been oscillating between conviction and doubt — nothing has fully settled.`
    )
  if (dominantCluster)
    historyLines.push(
      `Their emotional vocabulary across these notes has been predominantly in the territory of ${dominantCluster.label}.`
    )
  if (topFixation)
    historyLines.push(
      `The word "${topFixation.word}" keeps appearing in what they write — something about it hasn't resolved.`
    )
  if (motifs.length > 0) {
    const topMotifWords = motifs.slice(0, 2).map(m => `"${m.word}"`).join(' and ')
    historyLines.push(
      `Recurring word${motifs.length > 1 ? 's' : ''} across their notes: ${topMotifWords}. These keep returning.`
    )
  }

  // ── Echo context ───────────────────────────────────────────────────────
  const echoLabel = echo?.__echoType === 'era'
    ? 'An archival note from a previous reading of this book'
    : 'An earlier note from this reading'
  const echoLine = echo
    ? `${echoLabel}${echo.chapter ? ` (ch. ${echo.chapter})` : ''}: "${(echo.text || '').slice(0, 120)}${(echo.text || '').length > 120 ? '…' : ''}"`
    : null

  // ── Tone qualifiers derived from context ───────────────────────────────
  const qualifiers = [
    echo?.__echoType === 'era'
      ? '- This echo crosses a reading era — if meaningful, you may note how interpretation may have shifted between readings'
      : echo
        ? '- If the resonance with the earlier note is meaningful, you may quietly acknowledge it'
        : null,
    collapsedCount > 0 && '- This reader has had theories revised before — hold any new certainties with appropriate tentativeness',
    relatedCollapse && '- The related prior collapse is relevant — the reader may not recognize that this ground has shifted before',
    rereadCount > 0 && '- The reader is rereading — returning readers notice what was invisible the first time; acknowledge if relevant',
    confidenceArc === 'collapsing' && '- Their certainty is eroding — receive this note without reinforcing confidence they are losing',
    dominantCluster && `- The reader has been emotionally oriented toward ${dominantCluster.label} — if this note continues that thread, you may quietly acknowledge the accumulation`,
    motifs.length > 0 && `- Motifs recurring in their notes: ${motifs.slice(0, 2).map(m => `"${m.word}"`).join(', ')} — if this note touches those, you may note the return without announcement`,
  ].filter(Boolean)

  const prompt = `You are a literary companion embedded in a reading app. The reader is annotating a book as they read.

Book: ${bookContext}
${historyLines.length ? `\nReading history:\n${historyLines.map(l => `  ${l}`).join('\n')}\n` : ''}${echoLine ? `\nResonance: ${echoLine}\n` : ''}${recentNotes ? `\nRecent notes:\n${recentNotes}\n` : ''}
New note [${note.tag}]:
"${note.text}"

Write one sentence (two at most if genuinely needed) responding to this note. Your response must:
- Be specific to this book and this note — not generic
- Feel like a quiet, intelligent presence, not a chatbot
- Use no affirmation ("Great!", "Interesting!", etc.)
- Use no "I" — write impersonally
- Be understated and literary in tone
- Add something — a small observation, a pattern the reader may not have named, a connection to the book's broader arc
${qualifiers.length ? qualifiers.join('\n') + '\n' : ''}
Do not introduce yourself. Do not ask questions. Just the response — nothing else.`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 12_000)

  let response
  try {
    response = await fetch(PROVIDER_CONFIG.apiUrl, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': PROVIDER_CONFIG.version,
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: PROVIDER_CONFIG.model,
        max_tokens: 120,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } finally {
    clearTimeout(timer)
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API error ${response.status}`)
  }

  const data = await response.json()
  const text = (data.content?.[0]?.text ?? '').trim()
  if (!text) throw new Error('Empty response')
  return text
}
