/**
 * residueMemory.js — Residue Fragment Extraction + Motif Detection
 *
 * Extracts small "residue anchors" from reader notes and mysteries.
 * These are short fragments of remembered texture — specific names,
 * mystery questions, note phrases, quote captures — used to ground companion
 * observations in something the reader actually wrote, rather than
 * abstract emotional language.
 *
 * Residue is drawn from:
 *   - Open mystery text  (reader-named questions; already textured)
 *   - High-resonance notes  (reader's own words, most-returned-to)
 *   - Quote note captures  (verbatim prose; richest sensory language)
 *   - Recurring proper nouns across notes
 *
 * Motif detection separately tracks recurring concrete words (objects,
 * places, sensory language) that appear across 3+ notes — the textural
 * fingerprint of a reading: "photograph", "hallway", "mirror", "silence".
 *
 * All fragments respect spoiler safety — only content at or before
 * currentChapter is included.
 */

// ── Name blocklist (mirrors reflectionEngine.js) ─────────────────────────────

const NAME_BLOCKLIST = new Set([
  'The','A','An','In','On','At','But','And','Or','It','He','She','They',
  'I','You','This','That','His','Her','Their','Its','With','From','By',
  'For','Of','To','Is','Was','Were','Are','Has','Had','Have','Will',
  'Would','Could','Should','My','Your','Our','What','When','Where','Why',
  'How','Then','Just','Not','All','Can','Been','Now','So','No','More',
  'Some','One','Two','Three','Very','Still','Even','Also','Back','Same',
])

// ── Motif stopwords (common words that aren't meaningful literary motifs) ─────

const MOTIF_STOPWORDS = new Set([
  'that','this','with','from','have','they','what','when','where','there',
  'their','which','will','would','could','should','been','being','were',
  'about','after','before','still','even','just','very','also','more',
  'some','does','seem','feel','felt','like','know','much','well','only',
  'into','over','then','than','them','both','each','such','same','think',
  'make','want','tell','told','says','said','other','another','these',
  'those','book','story','chapter','author','character','reader','novel',
  'page','note','read','reading','really','actually','might','maybe',
  'wonder','whether','almost','always','never','again','through','between',
  'without','because','though','while','since','until','during','under',
  'around','along','within','himself','herself','themselves','something',
  'anything','nothing','everything','someone','anyone','everyone','somehow',
  'already','perhaps','certain','simply','quite','often','most','many',
  'really','place','scene','point','moment','thing','things','kind','part',
  'time','world','life','people','person','does','going','gets','gets',
  'came','come','goes','gone','went','seen','look','looks','looked','seem',
  'seems','seemed','makes','made','keep','kept','take','taken','gave','give',
  'hold','held','find','found','knew','know','turns','turned','help',
  'begin','began','show','shows','showed','start','starts','started','move',
  'moves','moved','mean','means','meant','open','opens','opened',
])

// ── Note fragment extraction ──────────────────────────────────────────────────

/**
 * Extracts a short anchor phrase from a note's text.
 * Returns a ≤maxLen character string, trimmed to a word boundary.
 * Returns null if the note text is too short or empty.
 */
export function extractNoteFragment(note, maxLen = 40) {
  const text = (note.text || '').trim()
  if (text.length < 8) return null
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  return lastSpace > 12 ? cut.slice(0, lastSpace) + '…' : cut.slice(0, maxLen) + '…'
}

// ── Quote fragment extraction ─────────────────────────────────────────────────

/**
 * Extracts a short fragment from a quote-tagged note.
 * Quote notes contain verbatim prose — the richest source of specific texture.
 * Returns a ≤maxLen character string trimmed to a word boundary, or null.
 */
export function extractQuoteFragment(note, maxLen = 50) {
  if (note.tag !== 'quote') return null
  const text = (note.text || '').trim()
  if (text.length < 10) return null
  if (text.length <= maxLen) return text
  const cut = text.slice(0, maxLen)
  const lastSpace = cut.lastIndexOf(' ')
  return lastSpace > 15 ? cut.slice(0, lastSpace) + '…' : cut.slice(0, maxLen) + '…'
}

// ── Motif detection ───────────────────────────────────────────────────────────

/**
 * Detects recurring concrete words (motifs) across notes — lowercase nouns,
 * objects, and sensory words that appear in 3+ different notes.
 * These are the textural fingerprint of a reading: "photograph", "hallway",
 * "mirror", "silence" — the things a book keeps returning to.
 *
 * Excludes proper names (already handled by residue fragments) and stopwords.
 * Only includes words ≥5 characters to filter incidental short words.
 * All results are spoiler-safe (≤ currentChapter).
 *
 * @param {Array}  notes           Book notes
 * @param {number} currentChapter  Reader's current chapter
 * @returns {Array} [{ word, count, firstChapter, noteIds }] sorted by count desc
 */
export function detectMotifs(notes, currentChapter = Infinity) {
  const counts  = {}
  const firstCh = {}
  const ids     = {}

  for (const note of notes) {
    if ((note.chapter || 0) > currentChapter) continue
    const text  = (note.text || '').toLowerCase()
    const words = text.match(/\b[a-z]{5,14}\b/g) ?? []
    const seen  = new Set()
    for (const word of words) {
      if (MOTIF_STOPWORDS.has(word)) continue
      if (seen.has(word)) continue
      seen.add(word)
      counts[word] = (counts[word] || 0) + 1
      const ch = note.chapter || 0
      if (firstCh[word] === undefined || ch < firstCh[word]) firstCh[word] = ch
      if (!ids[word]) ids[word] = []
      ids[word].push(note.id)
    }
  }

  return Object.entries(counts)
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({
      word,
      count,
      firstChapter: firstCh[word] || 0,
      noteIds:      ids[word] || [],
    }))
}

// ── Atmospheric signature detection ──────────────────────────────────────────

const ATMOSPHERE_CLUSTERS = {
  cold:    ['cold','frozen','distant','remote','detached','numb','bleak','frost','chill','hollow'],
  dread:   ['dread','shadow','heavy','haunted','sinister','foreboding','void','darkness','menace','ominous'],
  warmth:  ['warm','bright','tender','gentle','golden','intimate','comfort','light','safe','soft'],
  grief:   ['grief','absence','empty','longing','ache','mourning','gone','missing','lost','hollow'],
  strange: ['strange','uncanny','wrong','unsettled','peculiar','surreal','eerie','uncanny','disquiet'],
  tension: ['urgent','breathless','sharp','panic','racing','taut','edge','sudden','knife','threat'],
}

/**
 * Detects the dominant atmospheric signature across all note text.
 * Returns { signature: string, score: number } or null if no clear signal.
 *
 * @param {Array} notes   Book notes (all chapters)
 * @returns {{ signature: string, score: number } | null}
 */
export function detectAtmosphericSignature(notes) {
  if (!notes.length) return null
  const combined = notes.map(n => (n.text || '').toLowerCase()).join(' ')
  const scores = {}
  for (const [sig, words] of Object.entries(ATMOSPHERE_CLUSTERS)) {
    scores[sig] = words.filter(w => combined.includes(w)).length
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] < 2) return null
  return { signature: top[0], score: top[1] }
}

// ── Recurring name extraction ─────────────────────────────────────────────────

/**
 * Finds proper nouns that recur across multiple notes (spoiler-safe).
 * Returns fragments sorted by frequency.
 */
function extractRecurringNames(notes, currentChapter) {
  const counts  = {}
  const firstCh = {}
  const ids     = {}

  for (const note of notes) {
    if ((note.chapter || 0) > currentChapter) continue
    const words = (note.text || '').match(/\b[A-Z][a-z]{2,}\b/g) ?? []
    const seen  = new Set()
    for (const word of words) {
      if (NAME_BLOCKLIST.has(word)) continue
      if (seen.has(word)) continue
      seen.add(word)
      counts[word] = (counts[word] || 0) + 1
      const ch = note.chapter || 0
      if (firstCh[word] === undefined || ch < firstCh[word]) firstCh[word] = ch
      if (!ids[word]) ids[word] = []
      ids[word].push(note.id)
    }
  }

  return Object.entries(counts)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({
      text:         name,
      type:         'name',
      noteCount:    count,
      noteIds:      ids[name],
      firstChapter: firstCh[name] || 0,
    }))
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Extracts residue fragments from reader notes and mysteries.
 * Returns up to 8 fragments ordered by signal strength.
 *
 * Fragment types:
 *   'mystery' — open mystery text (reader-named question)
 *   'note'    — short anchor from a high-resonance note
 *   'quote'   — verbatim prose capture from a quote-tagged note
 *   'name'    — recurring proper noun across 2+ notes
 *
 * All fragments are spoiler-safe (≤ currentChapter).
 *
 * @param {Array}  notes            Book notes
 * @param {Array}  mysteries        Book mysteries
 * @param {number} currentChapter   Reader's current chapter
 * @param {Object} resonanceWeights { noteId: score } from computeResonanceWeights
 * @returns {Array} ResidueFragment[]
 */
export function extractResidueFragments(
  notes,
  mysteries      = [],
  currentChapter = Infinity,
  resonanceWeights = {},
) {
  const fragments = []

  // 1. Open mystery text — the reader named these; they're already residue
  const openMysteries = (mysteries || []).filter(
    m => !m.resolved && (m.chapter || 0) <= currentChapter && (m.text || '').trim().length > 6
  )
  for (const m of openMysteries.slice(0, 3)) {
    const raw  = m.text.trim()
    const frag = raw.length > 42 ? raw.slice(0, 39).trim() + '…' : raw
    fragments.push({
      text:         frag,
      type:         'mystery',
      noteIds:      [],
      firstChapter: m.chapter || 0,
      noteCount:    1,
    })
  }

  // 2. High-resonance note fragments
  const highRes = notes
    .filter(n => (resonanceWeights[n.id] || 1) >= 3 && (n.chapter || 0) <= currentChapter)
    .sort((a, b) => (resonanceWeights[b.id] || 1) - (resonanceWeights[a.id] || 1))
    .slice(0, 3)

  for (const note of highRes) {
    const frag = extractNoteFragment(note, 40)
    if (frag) {
      fragments.push({
        text:         frag,
        type:         'note',
        noteIds:      [note.id],
        firstChapter: note.chapter || 0,
        noteCount:    1,
      })
    }
  }

  // 3. Quote fragments — verbatim prose captures (spoiler-safe)
  const quoteNotes = (notes || [])
    .filter(n => n.tag === 'quote' && (n.chapter || 0) <= currentChapter)
    .sort((a, b) => (resonanceWeights[b.id] || 1) - (resonanceWeights[a.id] || 1))
    .slice(0, 2)

  for (const note of quoteNotes) {
    const frag = extractQuoteFragment(note, 48)
    if (frag) {
      fragments.push({
        text:         frag,
        type:         'quote',
        noteIds:      [note.id],
        firstChapter: note.chapter || 0,
        noteCount:    1,
      })
    }
  }

  // 4. Recurring proper nouns
  fragments.push(...extractRecurringNames(notes, currentChapter))

  return fragments.slice(0, 10)
}
