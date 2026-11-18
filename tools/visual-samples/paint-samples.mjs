// Renders the sample paintings for the Visual Journey preview.
// Usage: node tools/visual-samples/paint-samples.mjs   (needs Playwright's Chromium)
// Writes public/visual-samples/<scene>.webp and <scene>.strokes.webp.
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.resolve(here, '../../public/visual-samples')
const scenes = [['evening-sea', 11], ['morning-hills', 23], ['rain-house', 37], ['candle-interior', 41], ['winter-wood', 59]]

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent('<!doctype html><body></body>')
await page.addScriptTag({ content: await readFile(path.join(here, 'painter.js'), 'utf8') })
for (const [name, seed] of scenes) {
  const t0 = Date.now()
  const { image, strokes } = await page.evaluate(([n, s]) => window.paintSample(n, s), [name, seed])
  const save = (url, file) => writeFile(path.join(outDir, file), Buffer.from(url.split(',')[1], 'base64'))
  await save(image, `${name}.webp`)
  await save(strokes, `${name}.strokes.webp`)
  console.log(name, `${((Date.now() - t0) / 1000).toFixed(1)} s`)
}
await browser.close()
