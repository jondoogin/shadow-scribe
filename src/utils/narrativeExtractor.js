/**
 * narrativeExtractor.js
 *
 * First-generation rule-based narrative extraction pipeline.
 * Takes raw chapter HTML and derives characters, chapter summaries, and mystery seeds.
 * No AI, no external services — pure browser JavaScript.
 *
 * Design principles:
 *   - Restraint over completeness: prefer under-extraction to over-confident guesses
 *   - Spoiler safety: all extracted items are tagged with their source chapter
 *   - Literary tone: summaries use the author's own words (extractive, not generative)
 *   - Everything extracted is editable by the reader after import
 *   - Raw chapter text is NEVER persisted to localStorage; only the derived artifacts are stored
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. HTML → plain text
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Strip EPUB HTML markup down to clean prose text.
 * Removes scripts, nav, figures, and formatting noise.
 */
export function cleanChapterHtml(html) {
  if (!html) return ''
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    // Remove non-prose elements
    doc.querySelectorAll(
      'script, style, nav, aside, figure, figcaption, sup, sub, ' +
      '[epub\\:type="toc"], [role="doc-toc"], [role="navigation"]'
    ).forEach(el => el.remove())

    let text = (doc.body || doc.documentElement)?.textContent || ''

    // Unicode normalization: remove zero-width and control characters
    text = text
      .replace(/\0/g, '')
      .replace(/­/g, '')   // soft hyphen
      .replace(/​/g, '')   // zero-width space
      .replace(/‌/g, '')   // zero-width non-joiner
      .replace(/﻿/g, '')   // BOM
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()

    return text
  } catch {
    return ''
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Character extraction
// ─────────────────────────────────────────────────────────────────────────────

// Comprehensive blocklist of capitalized words that are not character names.
// Covers sentence-starting common words, time/direction, titles used as standalone words.
const WORD_BLOCKLIST = new Set([
  'The','A','An','And','But','Or','In','On','At','To','For','Of','It',
  'He','She','They','We','You','I','My','His','Her','Their','Our','Your',
  'This','That','These','Those','When','Where','What','Who','How','Why',
  'If','Then','There','Here','Now','As','With','From','By','Up','Out',
  'Into','After','Before','Chapter','Part','Section','Book','Volume','Appendix',
  'One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
  'First','Second','Third','Fourth','Last','Next','New','Old','Same','Other',
  'Good','Great','Little','Small','Large','Big','Long','Short','High','Low',
  'Yes','No','Not','All','Some','More','Less','Just','Still','Only','Even',
  'Well','Very','Too','So','About','Over','Under','Back','Down','Away',
  'Could','Would','Should','Have','Has','Had','Was','Were','Been','Being',
  'Will','Can','May','Must','Shall','Did','Does','Do','Am','Is','Are',
  'Get','Got','Make','Made','Take','Took','Come','Came','Go','Went',
  'See','Saw','Look','Know','Knew','Think','Thought','Say','Said','Tell','Told',
  'Ask','Asked','Feel','Felt','Want','Wanted','Need','Needed','Let','Seem',
  'North','South','East','West','Morning','Evening','Afternoon','Night','Day',
  'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
  'January','February','March','April','June','July','August',
  'September','October','November','December',
  'Oh','Ah','Okay','Please','Thank','Sorry',
  'Something','Someone','Somewhere','Nothing','Nobody','Everyone','Anything',
  'Always','Never','Sometimes','Often','Already','Again','Once','Twice',
  'Even','Though','Although','Because','Since','While','Until','Unless',
  'Perhaps','Maybe','Probably','Certainly','Suddenly','Slowly','Quietly',
  'Finally','Actually','Clearly','Quickly','Carefully','Gently','Softly',
  'Still','Already','Almost','Barely','Hardly','Nearly','Rather','Quite',
  'Above','Below','Beside','Between','Beyond','Through','Toward','Against',
  'True','False','Right','Wrong','Sure','Certain','Possible','Impossible',
])

function isLikelyName(name) {
  if (!name || name.length < 2 || name.length > 35) return false
  const parts = name.split(' ')
  if (parts.length > 3) return false  // unlikely to be a character name
  return parts.every(p => p.length >= 2 && /^[A-Z][a-z]/.test(p) && !WORD_BLOCKLIST.has(p))
}

/**
 * Extract likely character names from cleaned chapter texts.
 * Uses three high-precision patterns: dialogue attribution, possessives, and honorifics.
 * Returns { main, secondary, relationships } in Shadow Scribe's character shape.
 */
export function extractCharacters(chapterTexts, chapters) {
  const nameCounts  = new Map()   // name → count of reliable mentions
  const nameChapter = new Map()   // name → first chapter number

  const sortedNums = Object.keys(chapterTexts).map(Number).sort((a, b) => a - b)

  for (const chNum of sortedNums) {
    const text = chapterTexts[chNum]
    if (!text) continue

    const chapterHits = new Set()

    // ── Pattern 1: Dialogue attribution (highest signal) ──────────────────
    // "Hugo said", "Wallace replied", "Mei Freeman whispered"
    const attr = /\b([A-Z][a-z]{1,20}(?:\s[A-Z][a-z]{1,18})?)\s+(?:said|asked|replied|whispered|shouted|murmured|called|answered|muttered|continued|added|declared|announced|admitted|insisted|suggested|agreed|objected)\b/g
    for (const m of text.matchAll(attr)) chapterHits.add(m[1].trim())

    // ── Pattern 2: Possessives ─────────────────────────────────────────────
    // "Hugo's", "Wallace's coat", "Mei Freeman's voice"
    const poss = /\b([A-Z][a-z]{2,20}(?:\s[A-Z][a-z]{1,18})?)'s\b/g
    for (const m of text.matchAll(poss)) chapterHits.add(m[1].trim())

    // ── Pattern 3: After honorifics ───────────────────────────────────────
    // "Mr. Blake", "Dr. Foster", "Captain Reyes"
    const honor = /\b(?:Mr\.|Mrs\.|Miss|Ms\.|Dr\.|Sir|Lady|Lord|Captain|Colonel|Major|Sergeant|Detective|Professor|Inspector)\s+([A-Z][a-z]{1,20}(?:\s[A-Z][a-z]{1,18})?)\b/g
    for (const m of text.matchAll(honor)) chapterHits.add(m[1].trim())

    // Update global counts
    for (const name of chapterHits) {
      if (!isLikelyName(name)) continue
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1)
      if (!nameChapter.has(name)) nameChapter.set(name, chNum)
    }
  }

  // Prefix-based dedup: if "Wallace" and "Wallace Price" both appear, merge
  // the shorter form into the longer (more complete) name. Prevents duplicate
  // characters like ["Wallace", "Wallace Price"] from polluting the cast.
  for (const [name] of [...nameCounts]) {
    if (!nameCounts.has(name)) continue
    for (const [other] of [...nameCounts]) {
      if (name === other || !nameCounts.has(other)) continue
      // name is a strict prefix of other (e.g. "Wallace" / "Wallace Price")
      if (other.startsWith(name + ' ')) {
        nameCounts.set(other, (nameCounts.get(other) || 0) + (nameCounts.get(name) || 0))
        nameCounts.delete(name)
        break
      }
    }
  }

  // Filter: require ≥2 reliable mentions
  const MIN_MENTIONS = 2
  const candidates = [...nameCounts.entries()]
    .filter(([name]) => isLikelyName(name))
    .filter(([, count]) => count >= MIN_MENTIONS)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)  // cap — restraint over completeness

  if (candidates.length === 0) {
    return { main: [], secondary: [], relationships: [] }
  }

  // Tier: main (~top third, max 4), secondary (rest)
  const mainCutoff = Math.max(1, Math.min(4, Math.ceil(candidates.length * 0.35)))

  const chars = candidates.map(([name, mentions], idx) => ({
    id: `ext_${Date.now()}_${idx}`,
    name,
    role: idx === 0 ? 'Protagonist' : idx < mainCutoff ? 'Main character' : 'Character',
    status: null,
    allegiance: null,
    description: null,
    lastSeen: null,
    mentionCount: mentions,         // used by debug panel; not rendered in the main UI
    revealChapter: nameChapter.get(name) ?? 1,
    spoilerSafe: false,
    alive: true,
    userAdded: false,
    extracted: true,                // marks this as auto-extracted (vs. manually added)
  }))

  return {
    main: chars.slice(0, mainCutoff),
    secondary: chars.slice(mainCutoff),
    relationships: [],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Chapter summary generation (extractive)
// ─────────────────────────────────────────────────────────────────────────────

// Score a sentence for how informative it is as a chapter summary.
// Prefers sentences with proper nouns, favours opening sentences, penalises questions.
function scoreSentence(sentence, idx, total) {
  let score = 0
  // Mid-sentence capitals suggest named entities (characters, places)
  const midCapitals = (sentence.match(/\s[A-Z][a-z]+/g) || []).length
  score += midCapitals * 1.5
  // Position: first sentence of a chapter is usually the scene-setter
  if (idx === 0) score += 5
  if (idx === 1) score += 1.5
  // Last few sentences often carry chapter resolution
  if (idx >= total - 3 && total > 5) score += 1.5
  // Questions are less useful as standalone summaries
  if (sentence.trimEnd().endsWith('?')) score -= 3
  // Very short sentences carry less information
  if (sentence.length < 60) score -= 1.5
  // Dialogue-heavy sentences (contain quotation marks) may be too context-dependent
  const quoteCount = (sentence.match(/["""]/g) || []).length
  if (quoteCount >= 4) score -= 1
  return score
}

/**
 * Generate an extractive summary from a chapter's cleaned text.
 * Uses the author's own words — two high-scoring sentences in reading order.
 * Returns null if the text is too sparse to summarise.
 */
export function generateChapterSummary(text, _title) {
  if (!text || text.length < 100) return null

  const rawSentences = text.match(/[^.!?]+[.!?][""'’“”]?\s*/g) || []
  const sentences = rawSentences
    .map(s => s.trim())
    .filter(s => s.length >= 50 && s.length <= 380)
    .filter(s => !/^\s*\d+\s*$/.test(s))                        // page-number artifacts
    .filter(s => !/^(chapter|part|section|epilogue|prologue)\b/i.test(s))  // heading bleed
    .filter(s => !/^(copyright|published|all rights|isbn)\b/i.test(s))    // front-matter

  if (sentences.length === 0) return null

  const scored = sentences.map((s, i) => ({ s, score: scoreSentence(s, i, sentences.length), i }))
  scored.sort((a, b) => b.score - a.score)

  // Pick top 2 sentences; restore to original reading order for coherence
  const top = scored.slice(0, 2).sort((a, b) => a.i - b.i).map(x => x.s)
  const result = top.join(' ').replace(/\s{2,}/g, ' ').trim()
  return result.length >= 40 ? result : null
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Mystery / unresolved thread extraction
// ─────────────────────────────────────────────────────────────────────────────

// Patterns that flag narratively significant uncertainty or unresolved tension.
// Ordered by precision: question patterns first, then uncertainty, then wondering.
const MYSTERY_PATTERNS = [
  // Weighted questions — "why", "who", "how could" etc. with enough content to be meaningful
  /[^.!?]{8,}?\b(?:why|how could|who would|what if|who was|where did|when did|how did|what was)\b[^?!]{15,150}[?]/gi,
  // Explicit uncertainty / confusion
  /[^.!?]{5,}?\b(?:didn't know why|couldn't understand|had no idea|couldn't explain|didn't make sense|seemed wrong|seemed strange|something odd|something off|something wrong|couldn't be sure|wasn't sure why|didn't understand why|couldn't figure out)[^.!?]{10,130}[.!?]/gi,
  // Wondering / puzzlement with an object
  /[^.!?]{5,}?\b(?:wondered why|puzzled by|troubled by|confused by|disturbed by|couldn't shake|kept thinking about|strange about|odd about)\b[^.!?]{15,130}[.!?]/gi,
]

/**
 * Extract mystery seeds from chapter texts.
 * Caps at 12 total; max 2 per chapter to ensure book-wide spread.
 * Returned mysteries have extractionChapter set for spoiler gating.
 */
export function extractMysteries(chapterTexts) {
  const mysteries = []
  const seen = new Set()  // rough deduplication

  for (const [numStr, text] of Object.entries(chapterTexts)) {
    const chNum = parseInt(numStr)
    let chapterCount = 0

    for (const pattern of MYSTERY_PATTERNS) {
      if (mysteries.length >= 12 || chapterCount >= 2) break

      for (const m of text.matchAll(pattern)) {
        if (mysteries.length >= 12 || chapterCount >= 2) break

        const sentence = m[0].trim().replace(/\s+/g, ' ')
        if (sentence.length < 35 || sentence.length > 220) continue

        // Fingerprint for rough dedup (first 50 chars, lowercased, stripped)
        const fp = sentence.slice(0, 50).toLowerCase().replace(/\W/g, '')
        if (seen.has(fp)) continue
        seen.add(fp)

        mysteries.push({
          id: `ext_mys_${chNum}_${mysteries.length}`,
          text: sentence,
          chapter: chNum,
          status: 'open',
          resolved: false,
          extracted: true,
        })
        chapterCount++
      }
    }
  }

  return mysteries
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Main pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * extractNarrative(chapterContents, chapters)
 *
 * chapterContents — { [chapterNum: number]: rawHtmlString }
 *   Raw HTML for each chapter, keyed by chapter number (1-indexed).
 *   Produced by epubParser.js; must NOT be persisted to localStorage.
 *
 * chapters — Chapter[]
 *   The book's chapter array (num, title, type).
 *
 * Returns:
 * {
 *   characters:     { main, secondary, relationships },
 *   summaries:      { [chapterNum]: string | null },
 *   mysteries:      Mystery[],
 *   extractionMeta: { chaptersExtracted, characterCount, mysteryCount, warnings }
 * }
 *
 * Spoiler safety: all extracted items carry their source chapter number.
 * The existing spoiler system (getCharacterView, getMysteryView) filters them
 * based on book.currentChapter automatically.
 */
export function extractNarrative(chapterContents, chapters) {
  const EMPTY = {
    characters: { main: [], secondary: [], relationships: [] },
    summaries: {},
    mysteries: [],
    extractionMeta: { chaptersExtracted: 0, characterCount: 0, mysteryCount: 0, warnings: [] },
  }

  if (!chapterContents || Object.keys(chapterContents).length === 0) return EMPTY

  const warnings = []

  // ── Step 1: Clean HTML → plain text ───────────────────────────────────────
  const cleanedTexts = {}
  let extracted = 0

  for (const [num, html] of Object.entries(chapterContents)) {
    const text = cleanChapterHtml(html)
    if (text.length >= 80) {
      cleanedTexts[num] = text
      extracted++
    }
  }

  if (extracted === 0) {
    warnings.push('No readable chapter text was found in this EPUB.')
    return { ...EMPTY, extractionMeta: { ...EMPTY.extractionMeta, warnings } }
  }

  const totalExpected = chapters.length
  if (extracted < totalExpected * 0.5) {
    warnings.push(`${extracted} of ${totalExpected} chapters had extractable text. Some content may be missing.`)
  }

  // ── Step 2: Character extraction ──────────────────────────────────────────
  const characters = extractCharacters(cleanedTexts, chapters)

  if (characters.main.length === 0 && characters.secondary.length === 0) {
    warnings.push('No character names were reliably detected. You can add characters manually in the Characters tab.')
  }

  // ── Step 3: Per-chapter summaries ─────────────────────────────────────────
  const summaries = {}
  let summarized = 0

  for (const ch of chapters) {
    const text = cleanedTexts[String(ch.num)] ?? cleanedTexts[ch.num]
    if (text) {
      const s = generateChapterSummary(text, ch.title)
      summaries[ch.num] = s
      if (s) summarized++
    }
  }

  if (summarized === 0 && extracted > 0) {
    warnings.push('Chapter summaries could not be generated. The chronicle will fill in as you read.')
  }

  // ── Step 4: Mystery / thread extraction ───────────────────────────────────
  const mysteries = extractMysteries(cleanedTexts)

  return {
    characters,
    summaries,
    mysteries,
    extractionMeta: {
      chaptersExtracted: extracted,
      summariesGenerated: summarized,
      characterCount: characters.main.length + characters.secondary.length,
      mysteryCount: mysteries.length,
      warnings,
    },
  }
}
