# Lantern — Visual Journey (architecture)

Ambient imagery that follows the book. As you listen or read, Lantern shows a very slow sequence of images drawn from the place you are in the story: a slow pan and zoom on one image, a long dissolve into the next. The images interpret setting, light, weather and mood. They never show what happens next.

**Status (Session 165, 2026-11-15; revised 2026-11-16 with John's answers):** build step 1 is done (section 11): the spoiler gate, the painterly WebGL stage and the Reader backdrop, shown on a preview page (`/preview/visuals`) with sample paintings drawn by code. Nothing is generated or benchmarked yet. Every number is marked **measured** (with its source) or **estimate**. The design follows the narration feature (`docs/NARRATION.md`) and the Listen & Atmosphere brief (FR-05, FR-06), and reuses their locators, storage rules and spoiler rules.

---

## 1. Decisions in one screen

**John decided (2026-11-16):** the look is **painterly**, and the motion should be painterly too, not just a camera move. Images change at **scene and context shifts**, not on a timer, and about every 4 to 8 minutes on average is the right feel. The **Reader backdrop goes in the first build**. **Distant figures and silhouettes are allowed**; faces never are (section 4.3).

| Question | Recommendation |
|---|---|
| Where are images made? | **Locally on the Mac**, in a batch alongside narration (`lantern-narrate visuals`). Hosted generation is an opt-in fallback, off by default. |
| Which image model? | **FLUX.2 [klein] 4B** (Apache-2.0) via `mflux` on the M5 Pro and the M2 Air, with painterly style presets (gouache, watercolour, oil sketch). Z-Image Turbo leans photographic, so it drops to a backup. |
| How are prompts made? | A small **local LLM** (Qwen3 4B or 8B, 4-bit, MLX) turns a short, spoiler-bounded window of text into a structured scene description. Book text never leaves the Mac. |
| How much imagery? | One image per **context shift**: a new place, time of day, weather, or a clear turn in mood. That averages about one every 4 to 8 minutes, but the story sets the pace, not a clock. A 10-hour novel gets about **80 to 150 images**. |
| How does it reach the iPhone? | A `.lantern-visuals` package (STORED zip, like `.lantern-audio`), imported into IndexedDB `lantern_content`. |
| Spoiler rule | An image becomes visible only after the reader's **current position** passes the last word the image was made from (`visibleAfter`). Prefetching may load it early but never shows it. |
| Motion | **Painterly:** each new image *paints itself in* over the old one along its brushstrokes (a WebGL paint-bleed dissolve, about 14 s), the image keeps a faint living-paint shimmer and a slow drift, and a paper-and-canvas texture sits over everything. Reduced Motion gives still images and a short fade. |
| Default | **Off.** In Listen the user turns on Visuals per book. The Reader backdrop ships in the first build but stays off until chosen, as the brief requires. |

---

## 2. How it fits together

```
 Mac (once per book, after or with narration)               Any device running Lantern
 ────────────────────────────────────────────               ──────────────────────────
 narration script (same segments, same ids)                  Listen / Reader position (locator)
   │                                                                   │
   ▼                                                                   ▼
 1. Scene planner   → context-shift scenes, source windows     VisualJourney engine
 2. Style profile   → palette, medium, seed (from opening only)  ├─ eligibility gate (visibleAfter ≤ position)
 3. Scene describer → SceneDescriptor JSON (local LLM)           ├─ queue: current + next 2 eligible-soon
 4. Prompt builder  → model prompt (deterministic, audited)      ├─ decode-ahead (img.decode, not in DOM)
 5. Image model     → PNG (mflux, local)                         └─ painterly stage: paint-in + drift   
 6. Validator       → rejects faces/text/unsafe, retries                   ▲
 7. Encoder         → WebP 1600×1000 + thumb + stroke map                  │
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
| Z-Image Turbo | Apache-2.0 | 6B | 8 | about 10 to 20 s (**estimate**) | about 90 to 180 s, tight on memory (**estimate**) | Backup. Its strength is photorealism, which John ruled out. |
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

### 4.1 Scene planning: change on context, not on time

John's rule: the picture changes when the story moves somewhere new, not because a timer ran out. So scenes are cut where the **context shifts**, in two passes.

**Pass 1, candidates (deterministic, no model).** Every narrated section start and every explicit scene break (`***`, `* * *`, `⁂`, an empty `<hr>`, or a blank-line break the parser keeps as a block) is a *hard* boundary. Every paragraph start is a *soft* candidate.

**Pass 2, context shifts (local LLM).** The describer (4.3) reads the text in order, a few paragraphs at a time, and keeps a running **context**: setting, time of day, weather, light and mood. At each soft candidate it answers one question about the paragraph it has just read: has the context changed? A new scene starts when:

- the **setting** changes (a new room, house, town or landscape), or
- **time** jumps (night falls, "the next morning", "three weeks later"), or
- the **weather or light** turns (a storm breaks, candles are lit), or
- the **mood** turns sharply and stays turned for more than a paragraph or two.

Only text up to and including the paragraph being judged is ever read for that decision, so detecting a shift cannot look ahead.

**Pacing guards (so the story sets the pace without flicker):**

- A shift less than about 90 seconds of narration after the last image waits, and the newest context wins. A burst of quick cuts becomes one change, not three.
- A context that holds for a long time keeps its image. There is **no maximum** time on screen; the image just keeps drifting (7.2). Only if the same place holds for more than about 15 minutes *and* the light or mood has shifted within it does the planner add an **alternate**: the same place, newly lit.
- If a book ends up far outside the 4 to 8 minute average (very static or very restless), the shift threshold is tuned per book in the audition step, not replaced by a timer.

Each scene gets a **source window**: the paragraphs from the shift point that established the new context, usually the first 150 to 300 words, cut at a segment boundary. Only that window, the style profile and the previous context go into the describer. An alternate has its own later window and its own `visibleAfter`, so it can only appear further in.

**Without an LLM** (the keyword fallback in 4.3), pass 2 uses keyword changes in place, time and weather words. It cuts less accurately but stays context-based.

Pass 1 and the guards are plain code, testable in pytest with the public-domain fixtures. Pass 2 is tested on a few hand-labelled public-domain chapters (where are the real setting changes?) to tune the threshold.

### 4.2 Style profile (once per book)

A book keeps one look for consistency: medium ("soft gouache", "ink and wash", "muted oil", "cinematic photograph"), palette (4 to 6 colours), light quality, texture words, framing rules, a seed, and the abstraction level (`abstract`, `environmental` (the default) or `figurative-minimal`).

- **Made only from the title, author, and the first 2,000 words.** A profile built from the whole book could leak its arc ("war-torn, ash-grey palette"), so it is never built from later text, even when the whole book is on the Mac.
- **Painterly is the default (John, 2026-11-16).** Presets: `gouache` (the default), `watercolour`, `oil-sketch` and `ink-and-wash`. Each is tuned to sit beside the Vellum palette: warm, low-saturation, nothing neon, with visible brushwork, because the painterly animation (7.2) needs real strokes to follow. Photographic styles are not offered.
- The profile is versioned. Changing it changes every image's cache key, as a voice change does for narration.

### 4.3 Scene describer (local LLM)

A small local LLM (default Qwen3 4B Instruct, 4-bit MLX, about 2.5 GB, Apache-2.0; Qwen3 8B on the M5 Pro if it describes better) reads the source window and returns strict JSON:

```jsonc
{ "setting": "a country house drawing room", "era": "early 19th century", "timeOfDay": "evening",
  "weather": "rain", "light": "candlelight, warm, low", "palette": ["umber", "candle gold", "slate blue"],
  "mood": "restless anticipation", "elements": ["tall rain-streaked windows", "embroidery frame", "fire"],
  "framing": "wide interior, empty foreground", "focus": { "x": 0.62, "y": 0.45 },
  "people": "none" | "distant" | "silhouette",
  "confidence": 0.8 }
```

Rules the describer is prompted with, and that the prompt builder enforces again in code:

- Describe **only** what the window states or clearly implies about place, light, weather and objects. Do not guess what happens next.
- **No named characters, no faces, no readable text, no violence or death, no plot events.** Abstract the place, not the action.

**Figures (John, 2026-11-16): distant figures and silhouettes are okay.** A lone walker on a far hill, two small shapes on a beach, a silhouette in a lit window or against a doorway. The rules that keep them from spoiling or replacing the reader's imagination:

- **Small or unlit.** A distant figure stays under about 5% of the frame height. A silhouette may be larger but is dark against light, with no facial features, and is never the main subject of a close-up.
- **Only who the text puts there.** The describer may add figures only if the source window has people in that place. It never adds a figure to show who is coming, and never shows an action (no fights, embraces, falls).
- **Never identifiable.** No faces, no named characters' distinguishing features (a scar, a red coat the story makes significant). The prompt builder strips character names and appearance details before they reach the image model.
- The validator's face check (4.5) still rejects any visible face, whatever its size, so a figure that came out too close is regenerated.
- If the window is mostly dialogue with no setting, the context hasn't really shifted: keep the previous setting, set `confidence` low, and make no new image. The current painting stays.

**Fallback without an LLM:** a keyword pass (place nouns, weather, time of day, light words) fills the same schema less well. It lets the M2 Air skip the LLM download, and it gives tests something deterministic.

### 4.4 Prompt builder (code, not model)

`prompt = style profile + descriptor fields + fixed tail`, assembled by a template, never by the LLM. The fixed tail asks for "no text, no lettering, no people in the foreground" (distant figures or silhouettes come only from the descriptor). FLUX.2 klein and schnell ignore negative prompts, so the exclusions are written as positive phrases ("empty room", "landscape without figures"). The final prompt is stored in the manifest so every image can be audited.

### 4.5 Validator

Before an image is kept:

- **Faces:** Apple Vision face detection (through `pyobjc`, built into macOS, no download). Any detected face is rejected (distant figures and silhouettes are fine as long as no face is readable) and regenerated with the next seed, up to 3 times. Then the scene falls back to the previous image.
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
eligible(image, position) = compareLocators(image.visibleAfter, position) < 0   // strictly past the window's last segment
```

- `position` is the **current** locator from `lantern_listen` (the most recent of Listen and Reader, as today). It is not the furthest point ever reached. Seeking back hides images that are now ahead.
- `compareLocators` (`src/atmosphere/visual/eligibility.js`) orders by spine `order`, then block number, then segment number. A locator with no segment (the Reader's top paragraph) counts as the start of that paragraph, so a Reader position never counts as having read the paragraph it is on.
- The Reader's position must be the **topmost paragraph in the reading band**, taken from all paragraphs currently in the band. The existing `ReaderPage` observer picks the topmost of the paragraphs that *changed* in each callback, which can be a later one; it must be fixed when the backdrop is wired into the real Reader (the preview already does this).
- **There is no slideshow timer to leak anything.** Images change only when the position passes the next image's `visibleAfter` (and the 90-second minimum has passed). If the reader lingers, the current painting just keeps drifting. Nothing ever moves forward early.
- **Prefetch is not display.** The engine decodes the next 2 images ahead of time with `img.decode()` on detached elements, so the dissolve is smooth, but an image is only placed on the stage after the gate allows it.
- **Gallery and thumbnails** show only eligible images. Ineligible ones are not rendered at all, not blurred, because a blurred colour field can still hint at "something red happens".
- **Scrubbing** shows no image previews. Dragging the scrubber forward moves the position, and the image follows after release, as a reader turning pages would see.
- **Strict mode:** the same gate applies. Labels use `sectionLabel()`, so an image's caption in the gallery reads "Section 7", not the chapter title. Narration still never changes `currentChapter`.
- **Manual navigation** (previous/next image) moves only through eligible images and never changes the reading position, as the brief requires (FR-05).

### 5.3 Tests to write

1. For every image in a generated fixture package, `visibleAfter` equals the end of its source window.
2. No prompt contains a token from any segment after `visibleAfter` (checked with the fixture book's text).
3. The engine never puts an ineligible image on stage: a long pause on one scene, seek back, seek forward, chapter jump and resume after reload.
4. The gallery DOM contains no element for an ineligible image.
5. The style profile builder never reads past word 2,000.

---

## 6. Queueing, prefetch and caching

### 6.1 Generation (Mac)

- **Order:** scenes are generated in reading order, so a package exported halfway (`--sections 1-5`) is already usable from the start, and a book can be read while the rest is still rendering.
- **Resumable:** a job folder per book, `~/.lantern-narrator/visuals/<book>/` (plan.json, images, strokes, thumbs, rejected.log). Ctrl-C stops after the current image; rerunning skips finished ones.
- **Cache key:** `sha256(descriptor JSON + style profile version + model + model version + seed + size)`. Editing the style regenerates everything; changing one scene's text regenerates only that scene.
- **Memory:** the describer runs first for all scenes, then unloads, then the image model runs. On the M2 Air the two never share memory, and visuals never run at the same time as Qwen3 narration.
- **One folder:** models go in `~/.lantern-narrator/hf-cache/`, outputs in `output/`, as CLAUDE.md requires for the work machine. `lantern-narrate clean --visuals` lists and removes the job folders; packages are in `output/`.

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

John asked for images that are painterly and *animated in a painterly way*. So the stage is not two photos crossfading under a moving camera; it is a painting that paints itself in and stays faintly wet.

It is one WebGL canvas (a 2D canvas plus CSS crossfade is the fallback where WebGL is unavailable). It holds the outgoing image, the incoming image and each image's **stroke map**, and draws three layers in one pass: the paint-in transition, the living-paint shimmer, and a paper texture. Only the canvas redraws; the page around it doesn't reflow.

### 7.2 Painterly animation

**The stroke map (made on the Mac).** For every image the generator also writes a small greyscale map (about 256×160) that says *when* each part of the picture gets painted. It is built from the image itself: broad flat areas (sky, walls, water) come first, edges and fine detail later, and the focal point last, the way a painter blocks in washes before details. Stroke direction comes from the image's own brushwork (the local edge orientation), so the reveal follows the strokes that are really there. It costs about 10 to 20 KB per image and needs no extra model.

**1. Paint-in (the transition, about 14 s).** The new image appears stroke by stroke over the old one, in stroke-map order. Each stroke's edge is soft and slightly darker for a moment, like pigment pooling at the edge of a wet wash, then settles. The outgoing painting doesn't vanish; it is painted over. With the watercolour preset the edges bloom outward a little; with oil sketch they are drier and more directional.

**2. Living paint (between transitions).** The current image never sits perfectly still:

- a slow drift and zoom, scale 1.03 → 1.07 over the whole time on screen, toward or away from the descriptor's `focus` point, alternating direction from image to image, eased near-linearly so it never visibly starts or stops;
- a very faint **shimmer** along the stroke directions (displacement of at most about 1.5 px, slow noise), so the paint looks freshly laid rather than printed. It is meant to be felt more than seen.

Both pause when narration pauses, so the painting "holds its breath" with the voice. Both are seeded from the image id, so the same image moves the same way on every device.

**3. Paper.** A procedural paper or canvas grain (generated in the shader, no image asset) is multiplied over everything at low strength, in the Vellum palette. It ties the pictures to Lantern's page and hides the smoothness that gives AI images away.

**Cost.** The paint-in runs at full frame rate for its 14 seconds. Between transitions the shimmer redraws at about 20 frames per second, which is light for any iPhone GPU, but the battery effect over a long listen is **not measured**. If it matters, "Living paint" can be switched off per book and the drift falls back to a plain CSS transform on the compositor.

**Later, not in the first build:** a depth map (Depth Anything V2 Small, Apache-2.0, run on the Mac) would allow gentle 2.5D parallax, as if the painting had layers of paper. It is left out until the basic stage has been seen.

### 7.3 Timing tokens (new, in `src/index.css`)

| Token | Value | Why |
|---|---|---|
| `--visual-paint-in` | 14 s | Inside the brief's 12 to 20 s range. Long enough that you notice the new painting, not the change. |
| `--visual-min-on-screen` | 90 s | The brief's minimum dwell. A shift sooner than this waits. There is no maximum. |
| `--visual-drift-scale` | 1.03 → 1.07 | Subtle; the design system wants motion that is "remembered, not triggered". |
| `--visual-shimmer` | 1.5 px | The living-paint displacement. 0 turns it off. |
| `--visual-grain` | 0.06 | Paper texture strength. |
| `--visual-veil` | gradient, 0.35 to 0.75 opacity | Keeps controls and captions legible. |

These are far longer than the 150 to 600 ms UI tokens, on purpose: the stage is atmosphere, not interface. `docs/DESIGN_SYSTEM.md` should gain an "Atmosphere motion" subsection that says so, so a later audit doesn't flag them as outliers (see `MOTION_AND_TIMING_AUDIT.md`).

### 7.4 Pacing

Images change on **context**, never on a clock (4.1). A new painting arrives when the position passes its `visibleAfter` and the current one has been up for at least 90 seconds. Long scenes keep their painting as long as the story stays there. Fast listening (2×) or skimming means some scenes are skipped rather than flickered through: when two images become eligible during one minimum dwell, the stage goes straight to the newer one.

### 7.5 Surfaces

- **Listen:** full-bleed stage behind the player, a bottom gradient veil in the page's own ink colours (light and dark mode), and controls on the existing card surfaces. The current mood accent (`--ca`) stays on the controls, not the image.
- **Reader backdrop (in the first build, John 2026-11-16):** off until chosen. When on, the painting sits behind the page at low strength (default 22%, at most 40%), softly blurred, under a veil of the page colour that is strongest behind the text column (60% in light mode, 70% in dark mode, where the painting is also dimmed to 60% brightness). It follows the reading position exactly like Listen does. The paint-in still happens, but slower (about 20 s) and at backdrop strength, so it reads as the page's colour slowly changing. Drift and shimmer are off behind text by default, because motion under words is tiring; a Motion toggle can turn them on. Body text contrast must stay at or above WCAG AA. `Clear page` hides it in one tap.
- **Mini-player:** no imagery. It stays quiet.
- **Fallback:** no visuals for a book means the existing Lantern gradient or the cover, never unrelated stock art.
- **Labelling:** a small "Generated image" note in the gallery, and a "Why this image" sheet that shows the descriptor (setting, light, mood). That sheet only exists for eligible images.

### 7.6 Accessibility

- `prefers-reduced-motion` (or the per-book Motion toggle): no paint-in, no drift and no shimmer. Images change with a 1-second opacity fade, or an instant swap if the user also chose "No transitions". The paper grain stays, because it doesn't move.
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
               "strokes": "strokes/img-0007.webp", "focus": { "x": 0.62, "y": 0.45 }, "descriptor": { … }, "prompt": "…", "bytes" }] }
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

## 10. Code map (as built, Session 168)

| Path | Role |
|---|---|
| `src/atmosphere/visual/eligibility.js` | `compareLocators`, `isEligible` (unknown sections never pass), `chooseImage` (gate plus 90 s minimum); pure, unit-tested |
| `src/atmosphere/visual/visualPackage.js` | Reads `.lantern-visuals` with the shared zip reader; validates (limits, safe paths, raster only, `sourceWindow.to === visibleAfter.segmentId`); holds paintings to the end of their chapter when the parser version differs |
| `src/atmosphere/visual/visualImport.js` | Open, decode-check (`createImageBitmap`), store |
| `src/content/contentRepository.js` | Schema v2: `visualSets`, `visualImages`; `saveVisualSet`, `listVisualSets`, `getVisualImage`, `deleteVisualSet`; `deleteContent` removes paintings too |
| `src/atmosphere/visual/useBookVisuals.js` | The book's set and section order; `usePaintingSources` holds object URLs for the plate on stage, the one before, and the next two (decoded ahead on detached elements); `useThumbs` |
| `src/atmosphere/visual/Paintings.jsx` | `usePlate` (gate, manual look-back at earlier plates, keeps the last plate while the next loads only if still eligible), `ListenPlate`, `PaintingsPanel` |
| `src/atmosphere/visual/VisualStage.jsx`, `paintRenderer.js`, `motion.js`, `ReaderBackdrop.jsx` | The painterly WebGL stage and the backdrop (step 1) |
| `src/pages/ListenPage.jsx` | Plate at the top of the loan slip; Paintings section (Off, Listen, Listen and Reader; living paint; strength behind text; plates so far; import, replace, remove) |
| `src/pages/ReaderPage.jsx` | Band-tracking position fix; backdrop behind a translucent page card; Clear page (eye icon) in the top bar |
| `src/catalogue/catalogue.css` | Plate, plates row, backdrop styles in the Catalogue III look |
| `tools/narrator/lantern_narrator/visuals/` | `plan.py` (context shifts, guards, windows), `style.py`, `describe.py` (keywords or Qwen3 via mlx-lm), `prompt.py`, `painters.py` (fixture, FLUX.2 klein via mflux), `strokes.py`, `validate.py` (Apple Vision), `generate.py` (job, cache, package) |

Design fit (Catalogue III): a painting is a tipped-in colour **plate**, framed by the loan slip card with a thin mount and a mono "Pl. IV" label. The Reader's page card becomes slightly translucent so the backdrop shows around and faintly through it. No frosted glass, no glow.

## 11. Build order (none merged without John)

1. **Stage, gate and Reader backdrop with fixture art. Done (Session 165).** Preview at `/preview/visuals`.
2. **Package format and import. Done (Session 168).** Reader, validation, schema v2, storage, remove; wired into the real Listen and Reader pages; Reader position fix.
3. **Mac CLI: planning, style profile, describer, prompt builder. Done (Session 168).** `lantern-narrate visuals plan` runs with no image model.
4. **Mac CLI: painters, stroke maps, validator, package, benchmark. Code done (Session 168); FLUX.2 klein, the Qwen3 describer and Apple Vision are not yet run on a Mac.** Next: `lantern-narrate visuals doctor` and `visuals benchmark` on the M5 Pro (Remote Control), then the M2 Air, and replace every estimate here with measured numbers.
5. **John chooses the painterly preset by eye** from real FLUX paintings of a book he knows.
6. Later, if wanted: an audition sheet (`visuals audition`, not built), depth parallax, generation while reading, hosted generation behind a flag.

**Verified (Session 168, cloud container):** 92 Vitest tests (13 new for the package, storage, migration and gate) and 54 pytest tests (10 new: windows end at `visibleAfter`, no descriptor word that the reader hasn't reached, profile never past word 2,000, 90 s guard, no extra scenes without a context change, descriptor rules, fixture package round trip and resume). Lint unchanged per file. A Playwright run on the real app (phone size, SwiftShader WebGL, fake clock) imported the original test story, a fake-voice narration and a fixture paintings package through the UI, swept every chapter forward and back on Listen and scrolled every chapter in the Reader, and found no ineligible painting on screen.

## 12. Questions

**Answered by John (2026-11-16):**

- **Look:** painterly, and animated in a painterly way (4.2, 7.2).
- **Cadence:** 4 to 8 minutes feels right, but driven by context, not time (4.1, 7.4).
- **Reader backdrop:** yes, in the first build (7.5, step 1 above).

- **Figures:** distant figures and silhouettes are okay; faces never (4.3).

Nothing is open now. The remaining choices (which painterly preset, the context-shift threshold) are made by eye in the audition step.

## 13. Not yet verified

FLUX.2 [klein] through mflux, the Qwen3 describer and the Apple Vision checks have not run anywhere yet (they need Apple Silicon; the cloud container can't reach Hugging Face either). So image quality, style consistency, seconds per image, memory, and how often Vision rejects painterly images are all unknown. The keyword describer's context shifts were only checked on the short test story; real novels may cut too often or too rarely (the guard and thresholds are in `plan.py`). The painterly stage has only run in headless SwiftShader, not on an iPhone or Mac GPU, so battery and smoothness are unmeasured. WebP sizes for real paintings are estimates.

**Checked in the browser (Session 168, headless Chromium, SwiftShader WebGL, phone size):** the test story's eight fixture paintings imported through the real Listen screen; a sweep through every chapter on Listen (forward, with a 91 s wait at each step, then a seek back to the opening) and a scroll through every chapter in the Reader with the backdrop on found no painting shown before its passage, every painting shown at some point, the plate cleared at once on seeking back, and no console errors. Two fixes came out of it: a window must leave part of its scene unread (`plan._window`), and `PaintRenderer.dispose()` releases its WebGL context only once the canvas has left the page.
