# Lantern — Visual Journey (architecture)

Ambient imagery that follows the book. As you listen or read, Lantern shows a very slow sequence of images drawn from the place you are in the story: a slow pan and zoom on one image, a long dissolve into the next. The images interpret setting, light, weather and mood. They never show what happens next.

**Status (Session 165, 2026-11-15):** design only. Nothing here is built or benchmarked. Every number is marked **measured** (with its source) or **estimate**. The design follows the narration feature (`docs/NARRATION.md`) and the Listen & Atmosphere brief (FR-05, FR-06), and reuses their locators, storage rules and spoiler rules.

---

## 1. Decisions in one screen

| Question | Recommendation |
|---|---|
| Where are images made? | **Locally on the Mac**, in a batch alongside narration (`lantern-narrate visuals`). Hosted generation is an opt-in fallback, off by default. |
| Which image model? | **FLUX.2 [klein] 4B** (Apache-2.0) via `mflux` on the M5 Pro and the M2 Air. **Z-Image Turbo** (6B, Apache-2.0) is the alternative to audition on the M5 Pro. |
| How are prompts made? | A small **local LLM** (Qwen3 4B or 8B, 4-bit, MLX) turns a short, spoiler-bounded window of text into a structured scene description. Book text never leaves the Mac. |
| How much imagery? | About one scene image per 4 to 8 minutes of listening, plus 1 or 2 alternate framings for long scenes. A 10-hour novel gets about **80 to 150 images**. |
| How does it reach the iPhone? | A `.lantern-visuals` package (STORED zip, like `.lantern-audio`), imported into IndexedDB `lantern_content`. |
| Spoiler rule | An image becomes visible only after the reader's **current position** passes the last word the image was made from (`visibleAfter`). Prefetching may load it early but never shows it. |
| Motion | Ken Burns drift of 4 to 8% over the whole dwell, 14-second crossfade, 90 to 240 seconds per image. Reduced Motion gives still images and a short fade. |
| Default | **Off.** In Listen the user turns on Visuals per book. In Reader the backdrop stays off unless chosen, as the brief requires. |

---

## 2. How it fits together

```
 Mac (once per book, after or with narration)               Any device running Lantern
 ────────────────────────────────────────────               ──────────────────────────
 narration script (same segments, same ids)                  Listen / Reader position (locator)
   │                                                                   │
   ▼                                                                   ▼
 1. Scene planner   → scene boundaries, source windows         VisualJourney engine
 2. Style profile   → palette, medium, seed (from opening only)  ├─ eligibility gate (visibleAfter ≤ position)
 3. Scene describer → SceneDescriptor JSON (local LLM)           ├─ queue: current + next 2 eligible-soon
 4. Prompt builder  → model prompt (deterministic, audited)      ├─ decode-ahead (img.decode, not in DOM)
 5. Image model     → PNG (mflux, local)                         └─ two-layer stage: Ken Burns + crossfade
 6. Validator       → rejects faces/text/unsafe, retries                   ▲
 7. Encoder         → WebP 1600×1000 + 400 px thumb                        │
   │                                                                       │
   ▼                                                                       │
 book.lantern-visuals ── AirDrop / Files ──► Import ──► IndexedDB lantern_content
 (manifest.json + images/*.webp)                        (visualSets, visualImages)
```

- **It mirrors narration on purpose.** Generation runs where the GPU is, the output is a portable package, and the web app only imports and displays. Lantern stays a static Vercel site with no paid API.
- **One segmentation.** The planner reads the same narration script (`src/narration/narrationScript.js` through `scripts/narration-script.mjs`), so every scene is anchored to the same `sectionId` / `blockId` / `segmentId` that Listen and Reader already use. The Python side must not re-segment.
- **Independent of audio.** A book can have visuals without narration (Reader mode, or device voice) and narration without visuals. The two packages share only `contentId`.

---

## 3. Local versus hosted image generation

### What a book needs

A 10-hour novel (about 90,000 words) at one scene image per 4 to 8 minutes, with alternates for long scenes, comes to about 80 to 150 images (**estimate**). Generating at 1024×640 and upscaling to 1600×1000 for display is enough for a slow, softly filtered image.

### Local models (Apple Silicon, MLX)

| Model | Licence | Size | Steps | M5 Pro 48 GB, 1024×640 | M2 Air 16 GB, 1024×640 | Fit for Lantern |
|---|---|---|---|---|---|---|
| **FLUX.2 [klein] 4B** | Apache-2.0 (weights and commercial use) | 4B, about 4 to 8 GB in 4/8-bit | 4 | about 6 to 12 s (**estimate**) | about 40 to 90 s (**estimate**) | **Recommended default.** Small, fast, permissive, good at painterly landscapes. |
| Z-Image Turbo | Apache-2.0 | 6B | 8 | about 10 to 20 s (**estimate**) | about 90 to 180 s, tight on memory (**estimate**) | Audition on the M5 Pro. Strong photorealism; may suit realist novels. |
| FLUX.1 [schnell] | Apache-2.0 | 12B | 4 | about 15 to 25 s (**estimate**) | swaps heavily in 4-bit (**estimate**) | Fallback only; older and heavier than klein. |
| FLUX.2 [klein] 9B, FLUX dev | FLUX Non-Commercial | 9B / 32B | | | | **Avoid.** The licence restricts deployment; keep the stack Apache-2.0 like narration. |
| Qwen-Image | Apache-2.0 | 20B | 20+ | minutes per image (**estimate**) | does not fit | Too heavy for a background batch. |

The only published Apple Silicon number found: FLUX.2 [klein] 4B with mflux, 4 steps, 1024×1024 took **21.4 s of inference (31.7 s wall) on an M1 Max 64 GB** ([lilting.ch](https://lilting.ch/en/articles/flux2-klein-4b-mflux-iris-m1-max)). The M5 Pro and M2 Air rows above are scaled from that and from the relative GPU sizes, so they must be benchmarked before anything is promised. 1024×640 is about 60% of the pixels of 1024×1024.

**What a book costs locally (estimate):** at 100 images, about 10 to 20 minutes on the M5 Pro, and about 1.5 to 2.5 hours on the M2 Air. Add the scene describer (about 1 to 3 s per scene on the Pro). Electricity is a few cents. Running it after narration, rather than at the same time, keeps the Air within 16 GB.

### Hosted APIs (opt-in fallback only)

| Service | Price per image | Notes |
|---|---|---|
| OpenAI GPT Image 2, low quality | about $0.005 (derived from token prices) | Cheapest hosted option found; quality at "low" is unrated for this use. |
| Black Forest Labs FLUX.2 [klein] | $0.014 to $0.015 | Same model family as the local default, so styles stay consistent. |
| Google Gemini image | $0.039 | Imagen 4 Fast ($0.02) shuts down on 2026-08-17, so it is no longer an option. |

Prices are from [invideo's August 2026 rate survey](https://invideo.io/blog/ai-image-model-pricing/) and need rechecking before any build. Licences are from [invideo's licence matrix](https://invideo.io/blog/open-source-image-models-licenses/).

A 100-image book costs about **$0.50 to $4** hosted. That is cheap, but hosted generation has three costs that local doesn't:

1. **Privacy.** Only the prompt is sent, never book text, but a prompt still paraphrases the book ("a candlelit drawing room, rain on tall windows"). The user must consent per book, and the prompt is shown before sending.
2. **Keys and servers.** API keys can't sit in the Vite bundle. It needs a Vercel function with a per-user quota and budget, like `api/companion.js`, and it breaks "Lantern needs no paid API".
3. **Scene descriptions still come from the Mac.** Describing scenes with a hosted LLM would upload book passages, which the narration rules forbid. So hosted image generation helps only someone who has a Mac for the describer but a weak GPU. That is a narrow case.

**Recommendation:** local only for the first build. Keep a `Provider` interface (`generate(prompt, seed, size) → image`) so a hosted provider can be added later behind a feature flag (`generatedVisualsHosted`), with explicit consent and a spending cap.

### Quality expectations

None of the models has been looked at for this use. The audition step (section 9) renders the same three scenes in each candidate model and style so John can choose by eye, as he chose the Qwen3 voice by ear.

---

## 4. From text to scene prompt

### 4.1 Scene planning (deterministic, no model)

The planner walks the narration script in order and cuts **scenes**:

- A new scene starts at every narrated section, at every scene break (`***`, `* * *`, `⁂`, an empty `<hr>`, or a blank-line break the parser already keeps as a block), and whenever a running scene passes about 1,400 words (about 9 minutes at narration pace) without a break.
- Scenes shorter than about 250 words merge into the previous scene in the same section.
- Each scene gets a **source window**: the first 150 to 300 words of the scene, cut at a segment boundary. Only that text, plus the book's style profile and the previous scene's descriptor, goes into the describer.
- A long scene can get 1 or 2 **alternates**. Each alternate has its own later window inside the same scene and its own `visibleAfter`, so it can only appear further in.

Scene planning uses only text positions, so it is cheap, testable in Vitest or pytest with the public-domain fixtures, and reproducible.

### 4.2 Style profile (once per book)

A book keeps one look for consistency: medium ("soft gouache", "ink and wash", "muted oil", "cinematic photograph"), palette (4 to 6 colours), light quality, texture words, framing rules, a seed, and the abstraction level (`abstract`, `environmental` (the default) or `figurative-minimal`).

- **Made only from the title, author, and the first 2,000 words.** A profile built from the whole book could leak its arc ("war-torn, ash-grey palette"), so it is never built from later text, even when the whole book is on the Mac.
- John can pick a preset instead (`--style-preset gouache`). Presets are tuned to sit beside the Vellum palette: warm, low-saturation, nothing neon.
- The profile is versioned. Changing it changes every image's cache key, as a voice change does for narration.

### 4.3 Scene describer (local LLM)

A small local LLM (default Qwen3 4B Instruct, 4-bit MLX, about 2.5 GB, Apache-2.0; Qwen3 8B on the M5 Pro if it describes better) reads the source window and returns strict JSON:

```jsonc
{ "setting": "a country house drawing room", "era": "early 19th century", "timeOfDay": "evening",
  "weather": "rain", "light": "candlelight, warm, low", "palette": ["umber", "candle gold", "slate blue"],
  "mood": "restless anticipation", "elements": ["tall rain-streaked windows", "embroidery frame", "fire"],
  "framing": "wide interior, empty foreground", "focus": { "x": 0.62, "y": 0.45 },
  "people": "none" | "distant figures" | "silhouette",
  "confidence": 0.8 }
```

Rules the describer is prompted with, and that the prompt builder enforces again in code:

- Describe **only** what the window states or clearly implies about place, light, weather and objects. Do not guess what happens next.
- **No named characters, no faces, no readable text, no violence or death, no plot events.** Abstract the place, not the action. At most "distant figures" or a silhouette.
- If the window is mostly dialogue with no setting, reuse the previous scene's setting with the new mood, and set `confidence` low. Low-confidence scenes get no new image; the previous image's alternate carries on.

**Fallback without an LLM:** a keyword pass (place nouns, weather, time of day, light words) fills the same schema less well. It lets the M2 Air skip the LLM download, and it gives tests something deterministic.

### 4.4 Prompt builder (code, not model)

`prompt = style profile + descriptor fields + fixed tail`, assembled by a template, never by the LLM. The fixed tail asks for "no text, no lettering, no people in the foreground". FLUX.2 klein and schnell ignore negative prompts, so the exclusions are written as positive phrases ("empty room", "landscape without figures"). The final prompt is stored in the manifest so every image can be audited.

### 4.5 Validator

Before an image is kept:

- **Faces:** Apple Vision face detection (through `pyobjc`, built into macOS, no download). Any face larger than about 3% of the frame is rejected and regenerated with the next seed, up to 3 times. Then the scene falls back to the previous image.
- **Text:** Vision text recognition. Any legible word is rejected, because image models love to invent signs and book covers.
- **Safety:** the model's own safety checker where one exists, plus a rejection list for the describer's output.
- Everything rejected is logged with its reason in the job folder, never shipped.

---

## 5. Spoiler protection

The core rule is: **an image is never shown before the reader has passed every word it was made from.**

### 5.1 Generation side

- Each image is made only from its source window, the style profile (opening only), and the previous scene's descriptor (which itself came from earlier text). Nothing from later in the book can reach the prompt.
- `visibleAfter` is the locator of the **last segment in the source window**. The planner records the window as `{ from, to }`, and a test asserts `visibleAfter === to` for every image.
- The describer never sees the section title. In strict mode, chapter titles can themselves be spoilers.

### 5.2 Display side

```js
eligible(image, position) = compareLocators(image.visibleAfter, position) <= 0
```

- `position` is the **current** locator from `lantern_listen` (the most recent of Listen and Reader, as today). It is not the furthest point ever reached. Seeking back hides images that are now ahead.
- `compareLocators` orders by spine `order`, then block number, then segment number. It belongs in `src/narration/listenState.js` beside the existing locator code, with unit tests.
- **The slideshow timer cannot reveal anything.** When the dwell runs out and the next image isn't eligible yet, the stage shows an alternate of the current scene or keeps drifting on the current image (reversing the pan). It never moves forward early.
- **Prefetch is not display.** The engine decodes the next 2 images ahead of time with `img.decode()` on detached elements, so the dissolve is smooth, but an image is only placed on the stage after the gate allows it.
- **Gallery and thumbnails** show only eligible images. Ineligible ones are not rendered at all, not blurred, because a blurred colour field can still hint at "something red happens".
- **Scrubbing** shows no image previews. Dragging the scrubber forward moves the position, and the image follows after release, as a reader turning pages would see.
- **Strict mode:** the same gate applies. Labels use `sectionLabel()`, so an image's caption in the gallery reads "Section 7", not the chapter title. Narration still never changes `currentChapter`.
- **Manual navigation** (previous/next image) moves only through eligible images and never changes the reading position, as the brief requires (FR-05).

### 5.3 Tests to write

1. For every image in a generated fixture package, `visibleAfter` equals the end of its source window.
2. No prompt contains a token from any segment after `visibleAfter` (checked with the fixture book's text).
3. The engine never puts an ineligible image on stage: timer expiry, seek back, seek forward, chapter jump and resume after reload.
4. The gallery DOM contains no element for an ineligible image.
5. The style profile builder never reads past word 2,000.

---

## 6. Queueing, prefetch and caching

### 6.1 Generation (Mac)

- **Order:** scenes are generated in reading order, so a package exported halfway (`--sections 1-5`) is already usable from the start, and a book can be read while the rest is still rendering.
- **Resumable:** the same job folder pattern as narration, `~/.lantern-narrator/jobs/<book>/visuals/`. Ctrl-C stops after the current image; rerunning skips finished ones.
- **Cache key:** `sha256(descriptor JSON + style profile version + model + model version + seed + size)`. Editing the style regenerates everything; changing one scene's text regenerates only that scene.
- **Memory:** the describer runs first for all scenes, then unloads, then the image model runs. On the M2 Air the two never share memory, and visuals never run at the same time as Qwen3 narration.
- **One folder:** models go in `~/.lantern-narrator/hf-cache/`, outputs in `output/`, as CLAUDE.md requires for the work machine. `lantern-narrate clean --visuals` lists and removes them.

### 6.2 Playback (any device)

- The engine keeps a small queue: the **current** image, the **next 2** images by `visibleAfter`, and the **previous** one (for a seek back). Only those four are held as decoded object URLs; the rest stay as Blobs in IndexedDB.
- When the position jumps (chapter change, resume), the queue is rebuilt from the new position, and stale decodes are abandoned with a sequence guard, the same pattern `PlaybackContext.openSession` uses.
- Object URLs are revoked when an image leaves the queue. Memory stays at about 4 decoded 1600×1000 images (about 25 MB), which is safe on an iPhone.

### 6.3 Storage (iPhone and elsewhere)

- WebP at quality 80, 1600×1000: about 200 to 350 KB per image (**estimate**). A 120-image book is about **30 to 40 MB**, roughly an eighth of its narration (about 290 MB).
- New IndexedDB stores in `lantern_content` (schema version 2): `visualSets` (one row per package, keyed by `id`, indexed by `contentId`) and `visualImages` (keyed by `[visualSetId, imageId]`, Blob plus thumbnail Blob).
- **Never** in `shadowscribe_books`, `lantern_listen` or Supabase. The companion record gains nothing. Per-book display preferences (on/off, intensity, motion) go in `lantern_listen` beside the player preferences.
- Removing a book's text removes its visuals, as it does its narrations. Safari's 7-day eviction applies here too, so the same "Add to Home Screen" advice holds.
- **Coordinate the version bump** with the transcript thread: whichever lands first takes `CONTENT_DB_VERSION = 2`, the other rebases onto 3. Both migrations must be additive (`if (oldVersion < N)`).

---

## 7. Display: motion, transitions and the design system

### 7.1 The stage

Two stacked layers (`<img>` elements with `object-fit: cover`), as the brief's FR-05 asks. The incoming image fades in above the outgoing one; only `opacity` and `transform` animate, so it stays on the GPU. `will-change` is set only during a transition.

### 7.2 Ken Burns

- Each image gets a start and end frame: scale **1.04 → 1.10** (or the reverse), with a pan of at most 4% of the width toward or away from the descriptor's `focus` point. Direction alternates between images, so the sequence feels like breathing rather than a conveyor.
- The move lasts the image's **whole time on screen** (dwell plus both crossfades), with a near-linear ease (`cubic-bezier(0.45, 0.05, 0.55, 0.95)`). It never stops and restarts in view.
- The motion is seeded from the image id, so the same image always moves the same way on every device.

### 7.3 Timing tokens (new, in `src/index.css`)

| Token | Value | Why |
|---|---|---|
| `--visual-crossfade` | 14 s | Inside the brief's 12 to 20 s range. Long enough that you notice the new image, not the change. |
| `--visual-dwell-min` | 90 s | The brief's minimum. |
| `--visual-dwell-max` | 240 s | Beyond this the current image's alternate or reversed drift takes over. |
| `--visual-drift-scale` | 1.06 average | Subtle; the design system wants motion that is "remembered, not triggered". |
| `--visual-veil` | gradient, 0.35 to 0.75 opacity | Keeps controls and captions legible. |

These are far longer than the 150 to 600 ms UI tokens, on purpose: the stage is atmosphere, not interface. `docs/DESIGN_SYSTEM.md` should gain an "Atmosphere motion" subsection that says so, so a later audit doesn't flag them as outliers (see `MOTION_AND_TIMING_AUDIT.md`).

### 7.4 Pacing

Images change on **story position**, not on a clock. A new scene's image arrives when its `visibleAfter` is passed and the current image has had at least `--visual-dwell-min`. If the reader is going fast (2× speed, skimming), the dwell minimum wins and scenes can be skipped, which is better than flicker. Pausing narration pauses the drift too, so the picture "holds its breath" with the voice.

### 7.5 Surfaces

- **Listen:** full-bleed stage behind the player, a bottom gradient veil in the page's own ink colours (light and dark mode), and controls on the existing card surfaces. The current mood accent (`--ca`) stays on the controls, not the image.
- **Reader backdrop:** off by default. When on, the image sits under an opaque Vellum veil at low strength (default 12%), heavily blurred, with Ken Burns off. Body text contrast must stay at or above WCAG AA. `Clear page` hides it in one tap.
- **Mini-player:** no imagery. It stays quiet.
- **Fallback:** no visuals for a book means the existing Lantern gradient or the cover, never unrelated stock art.
- **Labelling:** a small "Generated image" note in the gallery, and a "Why this image" sheet that shows the descriptor (setting, light, mood). That sheet only exists for eligible images.

### 7.6 Accessibility

- `prefers-reduced-motion` (or the per-book Motion toggle): no Ken Burns and a 1-second opacity fade, or an instant swap if the user also chose "No transitions".
- Separate controls for **Visuals** (off, backdrop, slideshow), **Intensity**, and **Motion**, as the brief asks.
- The stage is `aria-hidden`. Screen readers hear nothing about images, which avoids describing scenes aloud and adding noise to narration.
- High-contrast mode suppresses imagery behind text entirely.

---

## 8. Package format (`.lantern-visuals`, `lantern-visuals` v1)

```jsonc
// manifest.json
{ "format": "lantern-visuals", "version": 1, "complete": true,
  "book": { "contentId": "sha256:…", "title", "author", "parserVersion", "segmenterVersion" },
  "generator": { "tool": "lantern-narrate", "version", "model": "flux2-klein-4b", "modelLicense": "Apache-2.0",
                 "describer": "qwen3-4b-instruct-4bit", "generatedAt" },
  "style": { "id", "version", "preset", "medium", "palette": [...], "abstraction": "environmental", "seed",
             "sourceWindow": { "from": "ch1:b1.0", "to": "ch1:b42.3" } },
  "images": [{ "id": "img-0007", "sceneId": "s7", "alternate": 0,
               "sectionId": "ch3", "start": { "sectionId": "ch3", "blockId": "b12", "segmentId": "b12.0" },
               "sourceWindow": { "from": "b12.0", "to": "b19.2" },
               "visibleAfter": { "sectionId": "ch3", "blockId": "b19", "segmentId": "b19.2" },
               "file": "images/img-0007.webp", "thumb": "thumbs/img-0007.webp", "width": 1600, "height": 1000,
               "focus": { "x": 0.62, "y": 0.45 }, "descriptor": { … }, "prompt": "…", "bytes" }] }
```

- STORED zip, read with `Blob.slice`, exactly like `.lantern-audio`, so `src/narration/audiobookPackage.js`'s zip reader can be shared rather than copied.
- Import checks `contentId` and `parserVersion`. If the parser version differs, locators may have moved, so Lantern warns and offers to import anyway with images matched by section only.
- Import limits: at most 2,000 images, each at most 3 MB and 4096 px on a side, decoded once to check it really is an image. No SVG. Path traversal in entry names is rejected. The brief lists these import threats.
- `descriptor` and `prompt` stay in the package because they are the audit trail. They contain no book text beyond a paraphrase, and they are never synced.

---

## 9. CLI design (`tools/narrator`)

Visuals reuse the narrator package, its home folder, hardware tiers and job system, rather than adding a second tool.

```bash
lantern-narrate visuals doctor                     # image model, describer, memory tier, Vision available
lantern-narrate visuals audition book.epub          # 3 early scenes × each model × 3 style presets → output/auditions/<book>/visuals/
lantern-narrate visuals generate book.epub --model flux2-klein-4b --style-preset gouache
lantern-narrate visuals generate book.epub --sections 1-3     # partial package, usable at once
lantern-narrate visuals regenerate book.epub --image img-0007 # new seed for one image
lantern-narrate visuals benchmark                   # s/image, peak memory, per model, on this Mac
lantern-narrate clean --visuals
```

- Per-book choices (model, style preset, seed) are saved in `books.json` next to the voice choice.
- Hardware tiers: `large` (24 GB+) defaults to FLUX.2 klein 4B in 8-bit and Qwen3 8B as describer; `standard` (the 16 GB Air) defaults to klein 4B in 4-bit and Qwen3 4B, run one after the other; `small` uses the keyword describer only. Memory needs go in `ENGINE_MIN_MEMORY_GB`, as for narration.
- Extras: `pip install -e '.[visuals]'` adds `mflux`, `mlx-lm`, `pyobjc-framework-Vision` and Pillow. All are permissive licences (check `mflux`'s at build time).

## 10. Web app code map (planned)

| Path | Role |
|---|---|
| `src/atmosphere/visual/visualPackage.js` | Reads `.lantern-visuals`, validates, imports (shares the zip reader) |
| `src/atmosphere/visual/visualRepository.js` | `visualSets` / `visualImages` in `lantern_content` (or extend `contentRepository.js`) |
| `src/atmosphere/visual/eligibility.js` | `compareLocators`, `eligibleImages(position)`, `nextEligible`; pure and unit-tested |
| `src/atmosphere/visual/VisualJourneyEngine.js` | Queue, decode-ahead, dwell timing, sequence guard; no React |
| `src/atmosphere/visual/VisualStage.jsx` | Two-layer stage, Ken Burns, crossfade, reduced motion |
| `src/atmosphere/visual/VisualGallery.jsx` | Eligible thumbnails, "Why this image", regenerate hint |
| `src/context/PlaybackContext.jsx` | Publishes the current locator to the engine; no new state of its own |
| `src/pages/ListenPage.jsx`, `ReaderPage.jsx` | Mount the stage and the Visuals control |

Feature flag: `atmosphereVisualsEnabled` (local), separate from the later `generatedVisualsHosted`.

---

## 11. Build order (each step is a separate PR, none merged without John)

1. **Engine and stage with fixture art.** Eligibility, queue, Ken Burns, crossfade, reduced motion, using a few hand-made public-domain-style test images for the fixture book. This is the brief's P2. Vitest covers the gate; a Playwright run checks timings and that no ineligible image reaches the DOM.
2. **Package format and import.** `.lantern-visuals` reader, IndexedDB stores, the version-2 migration, storage display, remove.
3. **Mac CLI: planner, style profile, describer, prompt builder.** Runs without an image model and writes a manifest with prompts only, so the spoiler tests (section 5.3) can run in pytest with no GPU.
4. **Mac CLI: image model, validator, encoder, benchmark and audition.** Then benchmark on the M5 Pro (via Remote Control) and on the M2 Air, and replace every **estimate** in this doc with a measured number.
5. **John chooses model and style by eye** from the audition sheet.
6. Optional later: on-the-fly generation on the Mac while reading (a localhost companion process that fills the queue ahead of the position). Browser access from the https site to `http://localhost` differs between Chrome and Safari, and it has not been tested. Hosted generation behind a flag, if ever wanted.

## 12. Open questions for John

- **Look:** painterly (gouache, ink and wash) or photographic? This decides between klein and Z-Image more than speed does.
- **People:** strictly no figures, or distant silhouettes allowed? The default here is "distant figures at most, never faces".
- **Cadence:** is one new image every 4 to 8 minutes the right pace, or slower?
- **Reader backdrop:** worth building in the first round, or Listen only?

## 13. Not yet verified

Everything. In particular: any image model's speed on the M5 Pro or the M2 Air, image quality and style consistency across a book, how well a 4B describer abstracts scenes without leaking events, Apple Vision face and text detection rates on painterly images, WebP sizes, iPhone memory and battery during a 14-second crossfade, and Safari's handling of long CSS transforms when the screen locks.
