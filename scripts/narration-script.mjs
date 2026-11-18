#!/usr/bin/env node
// EPUB or TXT → Lantern narration script (JSON on stdout).
// Uses the app's own parser and segmenter so ids/offsets match the web app.
//
//   node scripts/narration-script.mjs book.epub [--include-all] > script.json

import { readFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import { DOMParser } from 'linkedom'

globalThis.DOMParser = DOMParser

const { parseEpubContent } = await import('../src/utils/epubParser.js')
const { buildTextContent, sha256Hex } = await import('../src/content/epubContent.js')
const { buildNarrationScript, scriptStats } = await import('../src/narration/narrationScript.js')

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
if (!file) {
  console.error('usage: node scripts/narration-script.mjs <book.epub|passage.txt> [--include-all]')
  process.exit(2)
}

try {
  const bytes = new Uint8Array(await readFile(file))
  let content
  if (extname(file).toLowerCase() === '.txt') {
    const text = new TextDecoder().decode(bytes)
    const [first, ...rest] = text.split('\n')
    const titled = first.startsWith('Title:')
    content = buildTextContent(titled ? rest.join('\n') : text, {
      contentId: 'sha256:' + await sha256Hex(bytes),
      title: titled ? first.slice(6).trim() : basename(file, '.txt'),
    })
  } else {
    content = await parseEpubContent(bytes)
  }
  const script = buildNarrationScript(content, { includeAll: args.includes('--include-all') })
  process.stdout.write(JSON.stringify(script))
  const st = scriptStats(script)
  console.error(`${content.title}: ${st.narratedSections}/${st.sections} sections narrated, ${st.segments} segments, ${st.chars} chars`)
  for (const w of content.warnings || []) console.error(`warning: ${w}`)
} catch (err) {
  console.error(err?.message || String(err))
  process.exit(1)
}
