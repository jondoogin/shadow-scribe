import { unzipSync } from 'fflate'

const decode = bytes => new TextDecoder('utf-8', { fatal: false }).decode(bytes)
const parseXml = str => new DOMParser().parseFromString(str, 'application/xml')

// Namespace-safe: find first element with a given localName
function findEl(doc, localName) {
  return Array.from(doc.querySelectorAll('*')).find(el => el.localName === localName) ?? null
}
function findEls(doc, localName) {
  return Array.from(doc.querySelectorAll('*')).filter(el => el.localName === localName)
}
function getText(doc, localName) {
  return findEl(doc, localName)?.textContent?.trim() ?? null
}

// Resolve a path relative to a base directory (e.g. "OEBPS/")
function resolvePath(base, rel) {
  if (!rel) return base
  if (rel.startsWith('/')) return rel.slice(1)
  return base + rel
}

// Normalize a path: resolve ".." and "." segments
function normalizePath(path) {
  const parts = path.replace(/\\/g, '/').split('/')
  const result = []
  for (const part of parts) {
    if (part === '..') result.pop()
    else if (part !== '.' && part !== '') result.push(part)
  }
  return result.join('/')
}

// Word-number ordinals for Part/Act detection ("Part One", "Act Two", etc.)
const WORD_ORDINAL = /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/i

// Detect chapter type from a title string
function detectType(title) {
  const t = title.toLowerCase().trim()
  if (/^prologue/.test(t)) return 'prologue'
  if (/^epilogue/.test(t)) return 'epilogue'
  if (/^interlude/.test(t)) return 'interlude'
  if (/^(part|act)\s*[ivxlcdm\d]/i.test(t)) return 'part'
  if (/^(part|act)\s+/.test(t) && WORD_ORDINAL.test(t.replace(/^(part|act)\s+/, ''))) return 'part'
  if (/^(part|act)$/.test(t)) return 'part'
  if (/^section\s/.test(t)) return 'section'
  return 'chapter'
}

// Determine dominant structure type from chapter array
function detectStructureType(chapters) {
  let parts = 0, sections = 0, chapters_ = 0
  for (const ch of chapters) {
    if (ch.type === 'part') parts++
    else if (ch.type === 'section') sections++
    else if (ch.type === 'chapter') chapters_++
  }
  if (parts > chapters_ / 2) return 'part'
  if (sections > chapters_ / 2) return 'section'
  return 'chapter'
}

// Resize an image data URL to ≤maxWidth, JPEG at quality. Returns Promise<string|null>
async function resizeImage(dataUrl, maxWidth = 300, quality = 0.75) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
}

// Convert raw bytes to base64 data URL
function bytesToDataUrl(bytes, mime) {
  let bin = ''
  const chunk = 8192
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return `data:${mime};base64,${btoa(bin)}`
}

// Parse EPUB3 nav.xhtml TOC
function parseNav(html) {
  const doc = new DOMParser().parseFromString(html, 'application/xhtml+xml')
  // Find <nav epub:type="toc"> or just the first <nav>
  const nav = Array.from(doc.querySelectorAll('nav')).find(el => {
    const t = el.getAttribute('epub:type') || el.getAttributeNS('http://www.idpf.org/2007/ops', 'type') || ''
    return t.includes('toc')
  }) ?? doc.querySelector('nav')
  if (!nav) return []
  return Array.from(nav.querySelectorAll('li > a, li > span'))
    .map(el => ({ title: el.textContent.trim(), src: el.getAttribute('href') || '' }))
    .filter(ch => ch.title.length > 0)
}

// Parse EPUB2 toc.ncx TOC
function parseNcx(xml) {
  const doc = parseXml(xml)
  return findEls(doc, 'navPoint')
    .map(np => ({
      title: findEl(np, 'text')?.textContent?.trim() ?? '',
      src:   findEl(np, 'content')?.getAttribute('src') ?? '',
    }))
    .filter(ch => ch.title.length > 0)
}

// Build a case-insensitive path lookup map from the zip file set
function buildFileMap(files) {
  const map = new Map()
  for (const [path, bytes] of Object.entries(files)) {
    map.set(path, bytes)
    map.set(path.toLowerCase(), bytes)
  }
  return {
    get: path => map.get(path) ?? map.get(path.toLowerCase()) ?? null,
  }
}

// ──────────────────────────────────────────────────
// Main export
// ──────────────────────────────────────────────────
const MAX_EPUB_BYTES = 150 * 1024 * 1024  // 150 MB hard limit

export async function parseEpub(file) {
  if (file.size > MAX_EPUB_BYTES) {
    throw new Error(`This file is too large to import (${Math.round(file.size / 1024 / 1024)} MB). Maximum supported size is 150 MB.`)
  }

  const buffer = await file.arrayBuffer()

  let rawFiles
  try {
    rawFiles = unzipSync(new Uint8Array(buffer))
  } catch {
    throw new Error('Could not read this file. It may be corrupted or DRM-protected.')
  }

  const fs = buildFileMap(rawFiles)
  const warnings = []

  // 1. container.xml → find OPF path
  const containerBytes = fs.get('META-INF/container.xml')
  if (!containerBytes) throw new Error('Not a valid EPUB: missing META-INF/container.xml')
  const container = parseXml(decode(containerBytes))
  const opfPath = findEl(container, 'rootfile')?.getAttribute('full-path')
  if (!opfPath) throw new Error('Not a valid EPUB: could not find OPF path in container.xml')

  const opfBytes = fs.get(opfPath)
  if (!opfBytes) throw new Error(`EPUB is malformed: OPF not found at "${opfPath}"`)

  const opf = parseXml(decode(opfBytes))
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : ''

  // 2. Metadata
  const title = getText(opf, 'title') ?? 'Untitled'

  // Prefer creator with opf:role="aut"; fall back to first creator; then Unknown Author
  const allCreators = findEls(opf, 'creator')
  const primaryCreator =
    allCreators.find(el => (el.getAttribute('opf:role') || el.getAttribute('role') || '').toLowerCase() === 'aut') ??
    allCreators.find(el => !el.getAttribute('opf:role') && !el.getAttribute('role')) ??
    allCreators[0] ??
    null
  const author = primaryCreator?.textContent?.trim() || 'Unknown Author'

  // ISBN — look for dc:identifier with ISBN scheme or 13-digit value
  let isbn = null
  for (const el of findEls(opf, 'identifier')) {
    const scheme = (el.getAttribute('opf:scheme') || el.getAttribute('scheme') || '').toUpperCase()
    const val = el.textContent.trim().replace(/[-\s]/g, '')
    if (scheme === 'ISBN' || /^(978|979)\d{10}$/.test(val) || /^\d{9}[\dX]$/i.test(val)) {
      isbn = val
      break
    }
  }

  // 3. Cover image — multiple strategies
  let coverData = null

  const findCoverItem = () => {
    // EPUB3: properties="cover-image"
    const byProp = findEls(opf, 'item').find(el => (el.getAttribute('properties') || '').includes('cover-image'))
    if (byProp) return byProp
    // EPUB2: <meta name="cover" content="id">
    const coverMeta = findEls(opf, 'meta').find(el => el.getAttribute('name') === 'cover')
    if (coverMeta) {
      const id = coverMeta.getAttribute('content')
      return findEls(opf, 'item').find(el => el.getAttribute('id') === id) ?? null
    }
    // Fallback: item with cover in its id or href
    return findEls(opf, 'item').find(el => {
      const h = (el.getAttribute('href') || '').toLowerCase()
      const id = (el.getAttribute('id') || '').toLowerCase()
      const mime = el.getAttribute('media-type') || ''
      return mime.startsWith('image/') && (h.includes('cover') || id.includes('cover'))
    }) ?? null
  }

  const coverItem = findCoverItem()
  if (coverItem) {
    const href = coverItem.getAttribute('href') || ''
    const mime = coverItem.getAttribute('media-type') || 'image/jpeg'
    const coverBytes = fs.get(resolvePath(opfDir, href)) ?? fs.get(href)
    if (coverBytes) {
      try {
        const raw = bytesToDataUrl(coverBytes, mime)
        const resized = await resizeImage(raw, 300, 0.78)
        if (resized && resized.length < 300_000) {
          coverData = resized
        } else {
          warnings.push('Cover image could not be resized for local storage. A gradient will be used.')
        }
      } catch {
        warnings.push('Cover image failed to process. A gradient will be used.')
      }
    }
  }

  // 4. Table of contents
  let rawChapters = []
  let tocSource = null

  // Find nav.xhtml (EPUB3)
  const navItem = findEls(opf, 'item').find(el => {
    const props = el.getAttribute('properties') || ''
    const mt = el.getAttribute('media-type') || ''
    return props.includes('nav') || (mt.includes('xhtml') && (el.getAttribute('id') || '').toLowerCase().includes('nav'))
  })
  if (navItem) {
    const navPath = resolvePath(opfDir, navItem.getAttribute('href') || '')
    const navBytes = fs.get(navPath)
    if (navBytes) {
      rawChapters = parseNav(decode(navBytes))
      tocSource = 'nav'
    }
  }

  // Fall back to toc.ncx (EPUB2)
  if (!rawChapters.length) {
    const ncxItem = findEls(opf, 'item').find(el =>
      (el.getAttribute('media-type') || '').includes('dtbncx')
    )
    if (ncxItem) {
      const ncxPath = resolvePath(opfDir, ncxItem.getAttribute('href') || '')
      const ncxBytes = fs.get(ncxPath) ?? fs.get(opfDir + 'toc.ncx') ?? fs.get('toc.ncx')
      if (ncxBytes) {
        rawChapters = parseNcx(decode(ncxBytes))
        tocSource = 'ncx'
      }
    }
  }

  // Fall back to spine order
  if (!rawChapters.length) {
    warnings.push('No table of contents found. Chapter titles were inferred from the spine order.')
    const manifest = {}
    findEls(opf, 'item').forEach(el => { manifest[el.getAttribute('id')] = el.getAttribute('href') || '' })
    rawChapters = findEls(opf, 'itemref').map((el, i) => ({
      title: `Chapter ${i + 1}`,
      src: manifest[el.getAttribute('idref')] || '',
    }))
    tocSource = 'spine'
  }

  // Cap degenerate chapter counts — some EPUBs encode footnotes or sections as TOC entries
  const MAX_CHAPTERS = 500
  if (rawChapters.length > MAX_CHAPTERS) {
    rawChapters = rawChapters.slice(0, MAX_CHAPTERS)
    warnings.push(`This book has an unusually large number of sections. Only the first ${MAX_CHAPTERS} were imported.`)
  }

  // Filter noise: skip entries with structural/non-narrative titles
  const noisePatterns = /^(cover|title\s*page|copyright|contents|toc|table of contents|dedication|acknowledgements?|bibliography|index|about the author|colophon|half.?title|front matter|back matter|notes?|foreword|preface|afterword|introduction|also by|further reading|glossary|maps?|permissions?|author.s note|note to (the )?reader|a note on|note on|from the author|by the same author|other (books|titles|works)|endorsements?|praise for|series page|newsletter|subscribe|connect)$/i
  const meaningful = rawChapters.filter(ch => {
    const t = ch.title.trim()
    return t.length > 0 && !noisePatterns.test(t)
  })

  // If filtering removed everything, keep all (better than nothing)
  const source = meaningful.length > 0 ? meaningful : rawChapters

  if (source.length === 0) {
    warnings.push('No chapters could be detected. You\'ll need to set the chapter count manually.')
  }

  // 5. Map to Shadow Scribe chapter shape
  const chapters = source.map((ch, i) => ({
    num:   i + 1,
    title: cleanTitle(ch.title),
    type:  detectType(ch.title),
  }))

  const structureType = detectStructureType(chapters)
  if (tocSource === 'spine') warnings.push('Chapter titles are generic. You can rename them after creating the companion.')

  // Task 1 hardening: detect duplicate titles
  const titleCounts = new Map()
  for (const ch of chapters) titleCounts.set(ch.title, (titleCounts.get(ch.title) || 0) + 1)
  const duplicates = [...titleCounts.entries()].filter(([, n]) => n > 1).map(([t]) => t)
  if (duplicates.length > 0) {
    warnings.push(`Some chapter titles appear more than once (e.g. "${duplicates[0]}"). You may want to rename them.`)
  }

  // 6. Chapter HTML content — for narrative extraction pipeline
  // Raw HTML is returned here but must NOT be persisted to localStorage.
  // It is consumed by narrativeExtractor.js at import time then discarded.
  const chapterContents = {}
  const htmlCache = {}  // normalizedPath → decoded HTML (avoid re-decoding shared files)

  for (let i = 0; i < source.length; i++) {
    const src = source[i].src
    if (!src) continue

    // Strip fragment identifier (#anchor) to get the HTML file path
    const rawFilePath = src.split('#')[0]
    if (!rawFilePath) continue

    const filePath = normalizePath(resolvePath(opfDir, rawFilePath))

    if (filePath in htmlCache) {
      if (htmlCache[filePath] !== null) chapterContents[i + 1] = htmlCache[filePath]
      continue
    }

    // Try multiple path resolutions (some EPUBs use inconsistent paths)
    const bytes = fs.get(filePath) ?? fs.get(rawFilePath) ?? fs.get(resolvePath(opfDir, rawFilePath))
    if (bytes) {
      try {
        const html = decode(bytes)
        htmlCache[filePath] = html
        chapterContents[i + 1] = html
      } catch {
        htmlCache[filePath] = null
      }
    } else {
      htmlCache[filePath] = null
    }
  }

  // Warn only if we expected content but found none
  const contentCount = Object.keys(chapterContents).length
  if (contentCount === 0 && chapters.length > 0) {
    warnings.push('Chapter content could not be read. The companion will start without auto-extracted characters or summaries.')
  }

  return {
    title,
    author,
    isbn,
    coverData,
    chapters,
    totalChapters: chapters.length || 20,
    structureType,
    chapterContents,  // { [num]: rawHtmlString } — transient, not for localStorage
    warnings,
  }
}

// ── Title cleaning helper ────────────────────────────────────────────────────
// Strips "Chapter N: " prefixes when followed by a real title. Preserves plain
// "Chapter 1" titles (those ARE the title in spine-fallback EPUBs).
function cleanTitle(raw) {
  if (!raw) return raw
  const t = raw.trim()
  // Match numeric, Roman numeral, or word-ordinal prefixes with a separator
  // "Chapter 1: Some Title" → "Some Title"
  // "Part One — The Beginning" → "The Beginning"
  // "Chapter One: Title" → "Title"
  const stripped = t.replace(/^(chapter|part|section)\s+(?:[\divxlcdm]+|[a-z]+)\s*[:–—\-]\s+/i, '')
  if (stripped !== t && stripped.length > 2) return stripped
  return t
}
