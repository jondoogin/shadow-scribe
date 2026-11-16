# Lantern — Claude Code Instructions

## Doc sync — MANDATORY at every session end

After completing any session work, sync all docs from the active worktree to the canonical docs directory before reporting the session as done. No exceptions.

```bash
WORKTREE="<active worktree path>/docs"
DEST=~/Projects/lantern/docs

cp "$WORKTREE/SESSION_NOTES.md"      "$DEST/SESSION_NOTES.md"
cp "$WORKTREE/ROADMAP.md"            "$DEST/ROADMAP.md"
cp "$WORKTREE/CHATGPT_HANDOFF.md"    "$DEST/CHATGPT_HANDOFF.md"
cp "$WORKTREE/PRODUCT_FOUNDATION.md" "$DEST/PRODUCT_FOUNDATION.md"
cp "$WORKTREE/DESIGN_SYSTEM.md"      "$DEST/DESIGN_SYSTEM.md"
cp "$WORKTREE/AI_COMPANION_RULES.md" "$DEST/AI_COMPANION_RULES.md"
cp "$WORKTREE/ARCHITECTURE.md"       "$DEST/ARCHITECTURE.md"
```

**Canonical location:** `~/Projects/lantern/docs/`
**Handoff file the user picks up:** `~/Projects/lantern/docs/CHATGPT_HANDOFF.md`

This file is the connective tissue between Claude Code (developer) and ChatGPT (strategist). The user is the liaison. They grab this file from the same location every session. Keep it current.

---

## localStorage keys — FROZEN

`shadowscribe_books` and `shadowscribe_settings` must not be renamed without an explicit migration plan.

---

## Build command

```bash
cd <worktree path>
node ~/Projects/lantern/node_modules/vite/bin/vite.js build
```

`.bin/vite` is not a real symlink in this project (on John's Mac). In a fresh clone `npm run build` also works (verified Session 163).

---

## Commands (verified Session 163)

| Command | What it does | State on `main` |
|---|---|---|
| `npm run dev` | Vite dev server (port 5230) | — |
| `npm run build` | Production build → `dist/` | passes |
| `npm test` | Vitest (`src/**/*.test.{js,jsx}`, Node env, linkedom DOMParser + fake-indexeddb from `src/test/setup.js`) | added S163 |
| `npm run lint` | ESLint | **fails on main: 49 errors, 9 warnings, all pre-existing.** New code must add none. Compare per file, not just the total. |
| `npm run narration-script -- book.epub > script.json` | Narration script via Lantern's parser | — |
| `cd tools/narrator && pytest` | Narrator CLI tests (fake engine, no downloads) | — |

There is no CI in `.github/`. Vercel builds with `npm run build`.

---

## Narration, Reader and Listen (Session 163). Full doc: `docs/NARRATION.md`

- **Architecture:** a local Mac CLI (`tools/narrator`, `lantern-narrate`) generates per-chapter AAC plus a `.lantern-audio` package (STORED zip + `manifest.json`). Lantern imports the package into IndexedDB and plays it with `HTMLAudioElement`. Browser Web Speech is the zero-setup fallback. Lantern stays a static site, with **no paid API and no server TTS**.
- **Engines:** on the M5 Pro (Apple Silicon, 24 GB+) the default is **Qwen3-TTS 1.7B** (`qwen3-1.7b`, Apache-2.0), chosen by John by ear in Session 164, default voice **Aiden**; everywhere else it is **Kokoro-82M** (Apache-2.0). Pocket TTS is the fallback (CC-BY; check per-voice licences). The default lives in `hardware.default_engine`. Voices are either built-in or **designed in Lantern** (see below); **never clone a real recording**.
- **Voice per book:** `generate` saves engine/voice/style/speed per `contentId` in `<narrator home>/books.json` (settings and title only, no text); flags override and re-save. `audition` renders a book's opening in every voice into `output/auditions/`. `--style` (Qwen3 1.7B `instruct`) is part of the cache key via `generate.voice_key`.
- **Designed voices (John's decision, Session 164):** `lantern-narrate design` uses Qwen3 VoiceDesign to render takes of a fixed reference passage; `--keep N` stores `reference.wav` plus provenance (`origin: lantern-voicedesign`, kept take's SHA-256) in `<narrator home>/voices/<slug>/`. The `qwen3-designed` engine (Qwen3 1.7B Base) clones **only** voices that pass `voice_design.load()`. Never add a flag, path or API that clones an arbitrary audio file. The voice's cache key includes the reference hash (`Engine.voice_cache_key`).
- **Hardware targets (Session 164):** the main generation machine is a work-issued MacBook Pro 16-inch, **M5 Pro, 48 GB**. The **M2 Air, 16 GB** stays a supported lower-spec target. Engine memory needs live in `ENGINE_MIN_MEMORY_GB`; the default benchmark skips engines a machine can't fit (Qwen3 1.7B below 24 GB) and says why. The M5 Pro was benchmarked on 2026-11-13 (numbers in `docs/NARRATION.md`); the Air has not been.
- **Narrator files stay in one folder:** `~/.lantern-narrator/` (`LANTERN_NARRATOR_HOME`) holds models, `hf-cache/` (the CLI sets `HF_HOME`/`TORCH_HOME` there unless the user set them), jobs, `output/` and `benchmarks/`. `lantern-narrate clean` lists and removes them. New code must not write anywhere else by default, because the main Mac is a work machine.
- **Storage rules:**
  - Book text and audio live **only** in IndexedDB `lantern_content` (`src/content/contentRepository.js`).
  - The companion record gets one string, `contentId` (`sha256:` + EPUB hash).
  - Positions and prefs live in localStorage `lantern_listen`.
  - **Never** put book text or audio in `shadowscribe_books`, and never sync them to Supabase.
- **One segmentation:** `src/narration/narrationScript.js` / `segmenter.js` is the single source of segments. The Python CLI calls it through Node and must not re-implement it.
- **Stable ids:** `sectionId` comes from the spine, `blockId = b<N>`, and `segmentId = <blockId>.<n>`. Bump `PARSER_VERSION` / `SEGMENTER_VERSION` when ids could move.
- **Reader ↔ Listen:** the most recent locator wins. Narration **never** changes `book.currentChapter`; it only offers the ChapterUpdateModal. Strict spoiler mode hides unreached chapter titles (`sectionLabels.js`).
- **Audio graph:** narration stays out of Web Audio, so iOS keeps playing it with the screen locked. Ambience is Web Audio and ducks via events. iOS ignores `<audio>.volume`.
- **One playback session** app-wide (`PlaybackContext`). `openSession` is sequence-guarded, because concurrent opens used to orphan a player (found in the browser e2e run).
- **DRM:** encrypted EPUBs keep no text. Do not implement DRM removal.

## Design lab (Session 166, demo only)

`/design-lab` is an unlinked, lazy-loaded demo of candidate design directions on sample Library, Companion, Reader and Listen screens. Round 2: John picked **Specimen** (archive labels, measuring rule). Round 3 (current): five explorations of Specimen with a scientific tinkerer / explorer feel, flame and heat brought back: Field Lab, Expedition, Kiln, Patent, Beacon, one module per direction in `src/design-lab/dirs/` (each exports `meta`, `screens`, `Preview` and owns its CSS). `src/design-lab/brand.jsx` holds the new **four-pane diamond flame mark** (`FlameMark`, replaces the ✦ star beside the wordmark), one logotype lockup per direction (`Lockup`) and the shared `Cover`. Styles are scoped to `.lx--<id>` / `.lab-*`; it reads and writes no app data. `App.jsx` returns it before the normal shell. Query params: `d` direction, `s` screen, `m` light/dark. Avoid the AI-generic tells John rejected: purple gradients, frosted glass, glow blobs, Inter, identical card grids. It does not replace the current design system until John picks a direction.

## Never commit

Model weights, `~/.lantern-narrator/` job folders, `*.lantern-audio`, generated audio (`*.m4a`, `*.m4b`, `*.wav`), proprietary EPUBs, secrets, or large temporary assets. `.gitignore` covers the usual paths. Test fixtures use public-domain text built in code (`src/test/sampleEpub.js`).

---

## Product name

Lantern (renamed from Shadow Scribe in Session 49). `shadowscribe_*` localStorage keys are frozen.
