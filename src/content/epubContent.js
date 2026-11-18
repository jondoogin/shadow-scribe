// ── EPUB → durable reading content ───────────────────────────────────────────
// Turns an opened EPUB package (see readEpubStructure in epubParser.js) into
// Lantern's content model: spine-ordered sections of plain-text blocks with
// stable ids. No imported HTML is ever kept or rendered; only text survives.
//
//   content = {
//     contentId,            // 'sha256:<hex>' of the EPUB bytes — same on every device
//     parserVersion,        // bump when block/section ids could change
//     title, author, language,
//     sections: [{ id, order, href, title, linear, narrate, skipReason,
//                  chapterNums, anchors: [{ label, blockId, chapterNum? }],
//                  blocks: [{ id, type, text }], charCount }],
//   }
//
// Block ids are `b<index>` within a section and are stable for a given
// parserVersion + EPUB. Locators reference { sectionId, blockId, offset }.
//
// Runs in the browser (global DOMParser) and in Node (scripts/narration-script.mjs
// installs linkedom's DOMParser as a global first).

export const PARSER_VERSION = 1

const BLOCK_TAGS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'figcaption',
  'dt', 'dd', 'caption', 'td', 'th', 'address', 'hr',
])
const CONTAINER_TAGS = new Set([
  'div', 'section', 'article', 'main', 'header', 'footer', 'body', 'ul', 'ol', 'dl',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'figure', 'hgroup', 'center', 'aside',
])
const SKIP_TAGS = new Set([
  'script', 'style', 'head', 'nav', 'svg', 'math', 'audio', 'video', 'object', 'iframe',
  'noscript', 'template', 'rt', 'rp', 'img', 'image', 'button', 'input', 'select', 'textarea',
])
const SKIP_EPUB_TYPES = /\b(footnote|endnote|rearnote|pagebreak|noteref|toc|landmarks|page-list)\b/
const SKIP_ROLES = /\b(doc-footnote|doc-endnote|doc-noteref|doc-pagebreak|doc-toc)\b/

// Sections whose landmark type means "not part of the read-aloud text".
const NON_NARRATIVE_TYPES = /\b(cover|titlepage|halftitlepage|toc|copyright-page|colophon|imprint|index|landmarks|loi|lot|seriespage|other-credits|dedication)\b/
const NON_NARRATIVE_TITLES = /^(cover|title\s*page|half.?title|copyright|contents|table of contents|toc|dedication|acknowledg(e)?ments?|bibliography|index|about the (author|publisher)|colophon|also by.*|by the same author|other (books|titles|works).*|praise for.*|endorsements?|series page|newsletter|subscribe|connect|notes?|endnotes|footnotes|permissions?|credits|copyright page)$/i

const ZERO_WIDTH = /[\u00AD\u200B-\u200D\u2060\uFEFF]/g

function epubType(el) {
  return (
    el.getAttribute?.('epub:type') ||
    el.getAttributeNS?.('http://www.idpf.org/2007/ops', 'type') ||
    ''
  )
}

function isHidden(el) {
  if (el.hasAttribute?.('hidden')) return true
  const style = (el.getAttribute?.('style') || '').replace(/\s+/g, '').toLowerCase()
  return style.includes('display:none') || style.includes('visibility:hidden')
}

function shouldSkip(el) {
  const name = (el.localName || '').toLowerCase()
  if (SKIP_TAGS.has(name)) return true
  if (isHidden(el)) return true
  if (SKIP_EPUB_TYPES.test(epubType(el))) return true
  if (SKIP_ROLES.test(el.getAttribute?.('role') || '')) return true
  if (name === 'aside' && /note/.test(epubType(el) + ' ' + (el.getAttribute?.('class') || ''))) return true
  return false
}

function hasBlockDescendant(el) {
  for (const child of el.children || []) {
    const n = (child.localName || '').toLowerCase()
    if (BLOCK_TAGS.has(n) || CONTAINER_TAGS.has(n)) return true
    if (hasBlockDescendant(child)) return true
  }
  return false
}

// Visible text of an element, skipping footnote refs/page breaks; <br> → newline.
function textOf(el) {
  let out = ''
  for (const node of el.childNodes || []) {
    if (node.nodeType === 3) out += node.nodeValue
    else if (node.nodeType === 1) {
      const n = (node.localName || '').toLowerCase()
      if (n === 'br') { out += '\n'; continue }
      if (shouldSkip(node)) continue
      out += textOf(node)
    }
  }
  return out
}

export function normalizeText(s) {
  return (s || '')
    .replace(ZERO_WIDTH, '')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

function blockType(tag, el) {
  if (/^h[1-6]$/.test(tag)) return 'heading'
  if (tag === 'blockquote') return 'quote'
  if (tag === 'li' || tag === 'dt' || tag === 'dd') return 'item'
  if (tag === 'pre') return 'pre'
  if (tag === 'hr') return 'break'
  const cls = (el.getAttribute?.('class') || '').toLowerCase()
  if (/\b(chapter-?title|chaptertitle|title|heading|chapter-?head)\b/.test(cls) && !/subtitle/.test(cls)) return 'heading'
  return 'p'
}

/**
 * Extract text blocks from one XHTML document body.
 * Returns { blocks, anchors: Map<elementId, blockId>, landmark }.
 */
export function extractBlocks(doc) {
  const body = doc.querySelector?.('body') ||
    Array.from(doc.querySelectorAll?.('*') || []).find(e => e.localName === 'body')
  const blocks = []
  const anchors = new Map()
  let pendingIds = []
  let inline = ''

  const emit = (type, raw) => {
    const text = normalizeText(raw)
    if (type === 'break') {
      if (blocks.length && blocks[blocks.length - 1].type !== 'break') {
        blocks.push({ id: `b${blocks.length}`, type: 'break', text: '' })
      }
      return
    }
    if (!text) return
    // Decorative scene breaks ("* * *", "⁂", "~") become break blocks.
    if (!/[\p{L}\p{N}]/u.test(text)) {
      if (text.length <= 12) return emit('break', '')
    }
    const id = `b${blocks.length}`
    blocks.push({ id, type, text })
    for (const a of pendingIds) anchors.set(a, id)
    pendingIds = []
  }
  const flushInline = () => {
    if (inline.trim()) emit('p', inline)
    inline = ''
  }
  const noteIds = el => {
    const id = el.getAttribute?.('id')
    if (id) pendingIds.push(id)
  }
  const collectIds = el => {
    noteIds(el)
    for (const c of el.children || []) collectIds(c)
  }

  const walk = el => {
    for (const node of el.childNodes || []) {
      if (node.nodeType === 3) { inline += node.nodeValue; continue }
      if (node.nodeType !== 1) continue
      const tag = (node.localName || '').toLowerCase()
      if (tag === 'br') { inline += '\n'; continue }
      if (shouldSkip(node)) { noteIds(node); continue }
      const isBlock = BLOCK_TAGS.has(tag)
      const isContainer = CONTAINER_TAGS.has(tag) || ((tag === 'blockquote' || tag === 'li') && hasBlockDescendant(node))
      if (isContainer || (!isBlock && hasBlockDescendant(node))) {
        flushInline()
        noteIds(node)
        walk(node)
        flushInline()
      } else if (isBlock) {
        flushInline()
        collectIds(node)
        emit(blockType(tag, node), textOf(node))
      } else {
        collectIds(node)
        inline += textOf(node)
      }
    }
  }

  if (body) walk(body)
  flushInline()
  // Trailing anchors point at the last block.
  if (pendingIds.length && blocks.length) for (const a of pendingIds) anchors.set(a, blocks[blocks.length - 1].id)
  // A break is only ever pushed after a text block, so only trailing ones need dropping.
  while (blocks.length && blocks[blocks.length - 1].type === 'break') {
    const dropped = blocks.pop()
    for (const [k, v] of anchors) if (v === dropped.id && blocks.length) anchors.set(k, blocks[blocks.length - 1].id)
  }

  const landmark = body ? [epubType(body), ...Array.from(body.children || []).slice(0, 2).map(epubType)].join(' ') : ''
  return { blocks, anchors, landmark }
}

export function parseXhtml(str) {
  let doc = new DOMParser().parseFromString(str, 'application/xhtml+xml')
  const broken = !doc || doc.querySelector?.('parsererror') ||
    Array.from(doc.getElementsByTagName?.('parsererror') || []).length > 0
  if (broken) doc = new DOMParser().parseFromString(str, 'text/html')
  return doc
}

function safeId(raw, used) {
  let id = String(raw || 'section').replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 64) || 'section'
  let n = 2
  const base = id
  while (used.has(id)) id = `${base}_${n++}`
  used.add(id)
  return id
}

/**
 * Build the content model.
 * @param {object} pkg  from readEpubStructure(): { fs, opfDir, spine, rawToc, decode, normalizePath, resolvePath }
 * @param {object} opts { contentId, title, author, language, chapterSources: [{src}] (companion chapters, 1-based order) }
 */
export function buildBookContent(pkg, opts = {}) {
  const { spine, rawToc = [], fs, decode, resolve } = pkg
  const used = new Set()
  const tocByFile = new Map()
  rawToc.forEach(entry => {
    const [file, frag] = (entry.src || '').split('#')
    if (!file) return
    const key = resolve(file)
    if (!tocByFile.has(key)) tocByFile.set(key, [])
    tocByFile.get(key).push({ label: entry.title, fragment: frag || null })
  })
  const chapterByFile = new Map()
  ;(opts.chapterSources || []).forEach((ch, i) => {
    const [file, frag] = (ch.src || '').split('#')
    if (!file) return
    const key = resolve(file)
    if (!chapterByFile.has(key)) chapterByFile.set(key, [])
    chapterByFile.get(key).push({ num: i + 1, fragment: frag || null })
  })

  const sections = []
  const warnings = []
  spine.forEach((item, order) => {
    const path = resolve(item.href)
    const bytes = fs.get(path)
    if (!bytes) {
      warnings.push(`Missing spine document: ${item.href}`)
      return
    }
    if (!/x?html|xml/.test(item.mediaType || 'application/xhtml+xml')) return
    let parsed
    try {
      parsed = extractBlocks(parseXhtml(decode(bytes)))
    } catch {
      warnings.push(`Could not read ${item.href}`)
      return
    }
    const { blocks, anchors, landmark } = parsed
    const tocEntries = tocByFile.get(path) || []
    const firstHeading = blocks.find(b => b.type === 'heading')
    const title = tocEntries[0]?.label || (firstHeading && firstHeading.text.length <= 90 ? firstHeading.text : null)
    const blockFor = frag => (frag && anchors.get(frag)) || blocks[0]?.id || null
    const chapters = chapterByFile.get(path) || []
    const charCount = blocks.reduce((n, b) => n + b.text.length, 0)

    let skipReason = null
    if (!item.linear) skipReason = 'nonlinear'
    else if (NON_NARRATIVE_TYPES.test(landmark) && !/bodymatter|chapter/.test(landmark)) skipReason = 'front-or-back-matter'
    else if (title && NON_NARRATIVE_TITLES.test(title.trim())) skipReason = 'front-or-back-matter'
    else if (!blocks.some(b => b.type !== 'break')) skipReason = 'empty'
    else if (charCount < 40 && !chapters.length) skipReason = 'too-short'

    sections.push({
      id: safeId(item.idref || `s${order}`, used),
      order,
      href: item.href,
      title: title ? normalizeText(title) : null,
      linear: item.linear,
      narrate: !skipReason,
      skipReason,
      chapterNums: chapters.map(c => c.num),
      anchors: [
        ...tocEntries.map(t => ({ label: normalizeText(t.label), blockId: blockFor(t.fragment) })),
      ].concat(chapters.map(c => ({ chapterNum: c.num, blockId: blockFor(c.fragment) }))),
      blocks,
      charCount,
    })
  })

  return {
    contentId: opts.contentId || null,
    parserVersion: PARSER_VERSION,
    title: opts.title || null,
    author: opts.author || null,
    language: opts.language || 'en',
    sections,
    warnings,
  }
}

/** Plain-text books (benchmark passages, .txt files): blank lines split paragraphs, "Chapter …" lines split sections. */
export function buildTextContent(text, { contentId, title = 'Untitled', author = null } = {}) {
  const paras = normalizeText(text.replace(/\r\n?/g, '\n').replace(/\n[ \t]*\n/g, '\u0000'))
    .split('\u0000').map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean)
  const sections = []
  let current = null
  const start = (heading) => {
    current = { id: `s${sections.length}`, order: sections.length, href: null, title: heading, linear: true,
      narrate: true, skipReason: null, chapterNums: [], anchors: [], blocks: [], charCount: 0 }
    sections.push(current)
  }
  for (const p of paras) {
    const isHeading = /^(chapter|part|book|prologue|epilogue)\b[^.!?]{0,60}$/i.test(p)
    if (isHeading || !current) start(isHeading ? p : title)
    current.blocks.push({ id: `b${current.blocks.length}`, type: isHeading ? 'heading' : 'p', text: p })
    current.charCount += p.length
  }
  sections.forEach(s => { s.anchors = [{ label: s.title, blockId: 'b0' }] })
  return { contentId, parserVersion: PARSER_VERSION, title, author, language: 'en', sections, warnings: [] }
}

export async function sha256Hex(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}
