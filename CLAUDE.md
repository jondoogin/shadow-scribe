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
  - On a device, book text and audio live **only** in IndexedDB `lantern_content` (`src/content/contentRepository.js`); the encrypted cloud library keeps the original files.
  - The companion record gets one string, `contentId` (`sha256:` + EPUB hash).
  - Positions and prefs live in localStorage `lantern_listen`.
  - **Never** put book text or audio in `shadowscribe_books` or `lantern_books`. They reach Supabase **only** as ciphertext through the encrypted cloud library (below).
- **One segmentation:** `src/narration/narrationScript.js` / `segmenter.js` is the single source of segments. The Python CLI calls it through Node and must not re-implement it.
- **Stable ids:** `sectionId` comes from the spine, `blockId = b<N>`, and `segmentId = <blockId>.<n>`. Bump `PARSER_VERSION` / `SEGMENTER_VERSION` when ids could move.
- **Reader ↔ Listen:** the most recent locator wins. Narration **never** changes `book.currentChapter`; it only offers the ChapterUpdateModal. Strict spoiler mode hides unreached chapter titles (`sectionLabels.js`).
- **Audio graph:** narration stays out of Web Audio, so iOS keeps playing it with the screen locked. Ambience is Web Audio and ducks via events. iOS ignores `<audio>.volume`.
- **One playback session** app-wide (`PlaybackContext`). `openSession` is sequence-guarded, because concurrent opens used to orphan a player (found in the browser e2e run).
- **Follow-along transcript (Sessions 165, 168):** see `docs/TRANSCRIPT.md` (§12 is what was built). The Text tab in Listen: `TranscriptView` renders a chapter once and `TranscriptConductor` moves classes, the light pool, word states and the scroll per frame, so never re-render React per frame. Only the narrated chapter is rendered. Word tokens come from `src/narration/words.js` (`WORDS_VERSION`), added to the narration script. Word times come only from measured alignment (`tools/narrator/lantern_narrator/align.py`, `generate --words`) or the device voice's own boundary events; never display estimated word times. Timing sidecars hold offsets and milliseconds, never book text, and are stored as `words` on the chapter's IndexedDB `audio` record (no extra store). First real run (M5 Pro, 2026-11-18): 69/69 sentences aligned, alignment about 250× realtime on MPS.
- **DRM:** encrypted EPUBs keep no text. Do not implement DRM removal.

## Encrypted cloud library (Session 169). Full doc: `docs/LIBRARY.md`

- **John's decision (2026-11-21):** EPUBs, `.lantern-audio`, `.lantern-visuals` and per-book presets live in the Lantern Supabase project so he stops re-importing per device. Everything is **encrypted in the browser first** (PBKDF2 passphrase → wrapped library secret → HKDF file and dedupe keys; 8 MiB AES-GCM chunks bound to item, index and count). Never upload plaintext, never send the passphrase or an extractable key anywhere, and never add server-side decryption.
- Server: `docs/SUPABASE_LIBRARY.sql` (tables `lantern_library_keys|items|presets`, private bucket `lantern-library`, owner-only RLS on `<user_id>/…`). Additive only.
- Code in `src/library/`. Imports call `backupEpub` / `backupNarration` / `backupPaintings`, which never block or fail the import. Restores run the normal importers. Remembered keys live in IndexedDB `lantern_library_device`; device prefs in localStorage `lantern_library`.
- Presets = `lantern_listen` per-book `prefs` + `visuals` and the global Listen prefs; reading positions are not synced by the library.
- **Seamless Listen (Session 170, John's ask: no manual import, AirDrop or edition errors).** Listen offers Narrator and Paintings dropdowns built from device + library (`src/library/bookAssets.js`); picking downloads and re-links the book to the asset's EPUB. A device with nothing fetches the book, the preferred narrator (<80 MB) and painting set on its own. On the Mac, the dev server's narrator shelf (`scripts/narrator-shelf.mjs`, never in production) feeds finished files into the app and the library; retire a file by moving it to `<narrator home>/output/archive/`.
- **Curated set (Session 170, decided for John):** narrators Aiden (Qwen3 1.7B, style "warm, unhurried audiobook narration"), Margaret, Walter, Niamh (designed); Kokoro af_heart / bm_george on small Macs. Paintings: ink-and-gouache (default) and ink-and-wash, Qwen3 4B describer when mlx-lm is installed. Lives in `tools/narrator/lantern_narrator/curated.py` and the JS `NARRATOR_ORDER` / `PAINTING_ORDER`.
- **Paintings motion (Session 170):** the 14 s stroke-by-stroke paint-in became a 7.5 s ink bloom from the focus point; drift eases to rest on pause. Tap the plate for full screen (`Theatre.jsx`): painting plus the line being read.

## Design lab (Session 166, demo only)

`/design-lab` is an unlinked, lazy-loaded demo of candidate design directions on sample Library, Companion, Reader and Listen screens. Round 2: John picked **Specimen** (archive labels, measuring rule). Round 3: five Specimen explorations; John picked **Field Lab** and asked for it cleaner, simpler and subtler with the grid lines. Round 4: three thin Field Lab variants (Ledger, Instrument, Lamplight). John wanted much more variety, so round 5 (current) has five aggressive Field Lab offshoots, each its own module with its own layouts, type and palette: **Scope** (amber oscilloscope, `dirs/scope.jsx`), **Catalogue** (library card drawer, rubber-stamp spoiler seal), **Elements** (periodic table of books, undiscovered chapters), **Sketchbook** (hand-drawn field notebook, Caveat + Literata), **Spectrum** (full-bleed colour bands, spectrogram). John then picked **Spectrum** (round 6): an immersive clickable prototype (commit e3bf039, since removed; recover with git). Round 7 (2026-11-17): Catalogue II, Spectrum II, Swatch, Ticket, Thumb Index (commit ac400ec, recover with git). John then clarified he meant **Catalogue and Field Lab**, not Spectrum, and picked **Catalogue II** to push further. Round 8 has five modules in `dirs/`: **Catalogue III** (`catalogue.jsx`, white index cards with the next cards peeking from the drawer, pull-up card animation, stamped spoiler seal, a date-stamped loan record on Listen), **Herbarium** (`herbarium.jsx`, mounted specimen sheets on faint grid, collection label, millimetre rule progress, "not yet collected"), **Sample Rack** (`rack.jsx`, books as test tubes that fill as you read; capped empty tubes for sealed chapters), **Field Guide** (`guide.jsx`, naturalist entries with colour keys, a range bar, "not yet observed" species), **Survey Book** (`survey.jsx`, yellow field-book band, whisper grid, a traverse route as progress, ruled book log). Round 9 (current, 2026-11-17): John liked Catalogue III and asked for smaller progress circles, softer white/black contrast, tabs that don't look "tacky and disconnected", a style tweaker, lantern details, and a Lantern mark coloured by the theme. Catalogue III now derives every colour (mark panes included) from `--accent`/`--paper`/`--k` contrast/`--warm`; tabs sit inside a `.c3-box` card; lantern details are pierced-tin progress holes, a "Lit" status, a lamp log and a wick sleep timer. **Style tweaker:** `src/design-lab/tweaks.jsx` (Tune button and panel) works for any module exporting a `tweaks` schema plus `tweakVars(values, mode)`; `attr: true` items become `data-<id>` attributes on `.lx`. Values persist per direction in the lab-only localStorage key `lantern_lab_tweaks`. The panel's Copy button copies the settings as text. **John's settled Catalogue III settings (2026-11-17), now the defaults:** accent deep teal #236D86, Stone paper, contrast 25, lamplight 20, Literata titles, Spline Sans Mono labels, 18px text, 6px corners, Soft cards, Comfy spacing, Bar progress, Guide tabs, glow on, drawer cards off, motion on. Readability rules: body 17px+, labels 12px+ in a clean mono, 44px+ tap targets, one obvious primary action per screen. `meta.immersive` support still exists in `DesignLab.jsx` but no module uses it. `src/design-lab/brand.jsx` holds the **Lantern mark from readwithlantern.com** (`FlameMark`: four rounded squares turned 45° in a diamond, #D3C2A6 top, #A47044 left, #D69058 right, #AA5634 bottom; it replaces the ✦ star), the `Lockup` per variant and `Cover`. Styles are scoped to `.lx--<id>` / `.lab-*`; it reads and writes no app data (only its own `lantern_lab_tweaks` key). `App.jsx` returns it before the normal shell. Query params: `d` direction, `s` screen, `m` light/dark. Avoid the AI-generic tells John rejected: purple gradients, frosted glass, glow blobs, Inter, identical card grids. **Session 167: John picked Catalogue III and asked for it in the real app.** The app theme now lives in the Catalogue theme block at the end of `src/index.css` (details in `docs/DESIGN_SYSTEM.md`); the design lab stays as the place to try changes. The four main screens are rebuilt on the prototype's markup (`src/catalogue/parts.jsx`, `src/catalogue/catalogue.css`); see `docs/DESIGN_SYSTEM.md`, "Catalogue screens".

## Visual journey (Sessions 165 and 168). Full doc: `docs/VISUAL_JOURNEY.md`

- **Built end to end (Session 168), not merged.** Ambient painterly "plates" follow the reading position. The Mac CLI (`lantern-narrate visuals plan|generate|doctor|benchmark`, `tools/narrator/lantern_narrator/visuals/`) plans scenes, describes them, paints them (FLUX.2 [klein] 4B via `mflux-generate-flux2`, Apache-2.0; or the code-drawn `fixture` painter for tests) and writes a `.lantern-visuals` STORED zip. Lantern imports it into IndexedDB `lantern_content` **schema v2** (`visualSets`, `visualImages`), shows the plate on Listen and an optional backdrop in the Reader. Hosted image APIs are not built; book text never leaves the Mac.
- **Spoiler gate:** every image carries `visibleAfter` = the last segment of its source window (import refuses a manifest where `sourceWindow.to` differs). Show it only when the current locator is strictly past it (`compareLocators(visibleAfter, position) < 0` in `src/atmosphere/visual/eligibility.js`); a block-only Reader locator counts as the start of that block; an image or position in an unknown section is never eligible. Prefetch decodes on detached elements only. Nothing time-based ever advances past the gate. The planner builds each scene's descriptor context from the previous scene plus its own window only, never from the running context (which can be ahead).
- The style profile reads the title, author and first 2,000 words only (`visuals/style.py:opening_text`).
- **John's choices (2026-11-16):** painterly look and animation; images change on **context shifts**, never on a timer (90 s minimum on screen, no maximum); Reader backdrop available but off until chosen; distant figures and silhouettes allowed, faces never.
- **Reader position:** `ReaderPage` now tracks every block in the reading band and takes the topmost (it used to take the topmost *changed* entry, which could run ahead).
- Preferences: per book in `lantern_listen` (`books[id].visuals`: mode off/listen/both, strength, motion, backdropMotion). Never in `shadowscribe_books`, never synced.
- The transcript work did not need a schema bump; if it later does, it takes v3 (additive `if (oldVersion < N)` migrations only).
- Test book: `src/test/storyEpub.js` (original story, `node scripts/make-story-epub.mjs`). Preview with code-drawn samples: `/preview/visuals`.

## Declutter pass (Session 168, PR 5, on top of PR 4)

John approved every item in the declutter audit (2026-11-18). Keep these when changing screens:
- **Light Stone paper is the default theme** (`SETTINGS_DEFAULTS.darkMode = false`). Saved settings keep the reader's own choice.
- **One message per idea.** The book page shows one "away" note (the return card); `ReadingMomentum` and the Chronicle orientation lines are gone. No intro lines on tabs.
- **The companion's ambient one-liners were cut** outside the Ask tab: Library cross-book remark, chapter greeting, People/Themes/Threads/Notes residue lines, thread "gravity" lines and age fading. Ask keeps its observation, which is the companion's own place.
- **Status changes live in the book's ⋯ menu** (put aside, mark finished, archive, begin again). Only "begin reading" and "restore" stay on the card.
- Library rows have no call numbers; the card keeps it. Plot shows the last 5 chapters, older ones behind "Earlier chapters". Listen has no lamp log (Chronicle holds the history). About is one card.
- `.cat button` / `.c2 button` resets sit in `@layer base` so Tailwind utilities on the older tab components still apply inside Catalogue screens.

## Never commit

Model weights, `~/.lantern-narrator/` job folders, `*.lantern-audio`, `*.lantern-visuals`, generated audio (`*.m4a`, `*.m4b`, `*.wav`), proprietary EPUBs, secrets, or large temporary assets. `.gitignore` covers the usual paths. Test fixtures use public-domain text built in code (`src/test/sampleEpub.js`).

---

## Product name

Lantern (renamed from Shadow Scribe in Session 49). `shadowscribe_*` localStorage keys are frozen.
