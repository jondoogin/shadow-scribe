// ── Narrator shelf (development server only) ─────────────────────────────────
// When Lantern runs on the Mac with `npm run dev`, this serves what the Mac
// narrator has finished, so the app can pick it up with no file picker:
//
//   GET /__lantern/shelf            → { home, files: [{ name, kind, bytes, mtimeMs }] }
//   GET /__lantern/shelf/<name>     → the file
//
// Only these are listed: `*.epub` at the top of the narrator home, and
// `*.lantern-audio` / `*.lantern-visuals` at the top of `<home>/output/`.
// Sub-folders (auditions, archive, contact sheets…) are never served, which is
// how a set is retired: move it into `output/archive/`.
//
// It is never part of the production build (Vite applies `configureServer`
// only to the dev server), and it binds to whatever the dev server binds to.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const KINDS = [
  { re: /\.epub$/i, kind: 'epub', dir: '' },
  { re: /\.lantern-audio$/i, kind: 'audio', dir: 'output' },
  { re: /\.lantern-visuals$/i, kind: 'visuals', dir: 'output' },
]
const SAFE = /^[A-Za-z0-9][A-Za-z0-9 ._()-]{0,180}$/

/** The narrator home: $LANTERN_NARRATOR_HOME, else ../narrator-data beside the repo (John's ~/Lantern layout), else ~/.lantern-narrator. */
export function narratorHome(root = process.cwd(), env = process.env) {
  if (env.LANTERN_NARRATOR_HOME) return path.resolve(env.LANTERN_NARRATOR_HOME.replace(/^~(?=$|\/)/, os.homedir()))
  const beside = path.resolve(root, '..', 'narrator-data')
  if (fs.existsSync(beside)) return beside
  return path.join(os.homedir(), '.lantern-narrator')
}

export function listShelf(home) {
  const files = []
  for (const k of KINDS) {
    const dir = path.join(home, k.dir)
    let names = []
    try { names = fs.readdirSync(dir) } catch { continue }
    for (const name of names) {
      if (!k.re.test(name) || !SAFE.test(name)) continue
      let st
      try { st = fs.statSync(path.join(dir, name)) } catch { continue }
      if (!st.isFile()) continue
      files.push({ name, kind: k.kind, bytes: st.size, mtimeMs: Math.round(st.mtimeMs) })
    }
  }
  return files
}

/** Resolve a requested name to a listed file, or null. */
export function shelfPath(home, name) {
  if (!SAFE.test(name || '')) return null
  const k = KINDS.find(x => x.re.test(name))
  if (!k) return null
  const p = path.join(home, k.dir, name)
  if (path.dirname(p) !== path.join(home, k.dir)) return null
  return fs.existsSync(p) && fs.statSync(p).isFile() ? p : null
}

export default function narratorShelf() {
  return {
    name: 'lantern-narrator-shelf',
    apply: 'serve',
    configureServer(server) {
      const home = narratorHome(server.config.root)
      server.middlewares.use('/__lantern/shelf', (req, res) => {
        const name = decodeURIComponent((req.url || '/').split('?')[0].replace(/^\//, ''))
        if (!name) {
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Cache-Control', 'no-store')
          res.end(JSON.stringify({ home, files: listShelf(home) }))
          return
        }
        const p = shelfPath(home, name)
        if (!p) { res.statusCode = 404; res.end('not on the shelf'); return }
        res.setHeader('Content-Type', 'application/octet-stream')
        res.setHeader('Content-Length', String(fs.statSync(p).size))
        fs.createReadStream(p).pipe(res)
      })
    },
  }
}
