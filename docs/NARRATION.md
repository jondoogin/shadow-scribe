# Lantern — Neural Narration

Listen to your own EPUBs with natural neural voices, generated on your Mac, played in Lantern on any device. Nothing about the book leaves your devices unless you move the files yourself.

**Status (Session 163):** built and tested on Linux and in headless Chromium. **Not yet run on an Apple Silicon Mac or an iPhone.** Every claim below says which of these it rests on.

---

## 1. How it fits together

```
 Mac (once per book)                                   Any device running Lantern
 ───────────────────                                   ──────────────────────────
 book.epub ─► lantern-narrate generate                  Library ─► import EPUB  (text → IndexedDB)
              │  Lantern's own JS parser → script       Listen  ─► Import narration (.lantern-audio)
              │  Kokoro / Pocket TTS / Qwen3 (local)                │
              │  per-sentence cache, resumable                      ▼
              ▼                                          IndexedDB (audio per chapter)
       book-voice.lantern-audio  ── AirDrop / Files ──►  HTMLAudioElement player
       (STORED zip: manifest.json + audio/*.m4a)          + Web Audio ambience (ducked)
                                                          + Reader highlight / shared position
```

- **Generation is local and offline** after a one-time model download. The website never runs a model and never calls a paid API.
- **Lantern stays a static Vercel site.** The narrator is a separate Python CLI in `tools/narrator/`, and the web app only *imports* its output.
- **The fallback needs no setup.** If a book has no generated narration, Listen uses the browser's built-in speech (Web Speech API). Quality depends on the device.

### Why this architecture (hybrid: offline generation + portable package)

| Option | Verdict |
|---|---|
| A. In-browser neural TTS (WASM/WebGPU) | Rejected as the default: a 300 MB+ model download per device, slow on iPhone, and it drains the battery during long listening. |
| B. Cloud TTS API | Rejected: violates "no mandatory paid API" and "no cloud upload of ebook text". |
| C. Local generator on the Mac | **Chosen** for quality and speed. |
| D. Portable package + import | **Chosen** to get audio onto the iPhone with no server or sync service. |
| Browser speech | **Chosen as the fallback.** Free and instant, but robotic on some devices. |

---

## 2. Engine evaluation

### Measured (this container: 4-core Intel Xeon, Linux, CPU only)

Same 20-segment passage (Pride and Prejudice ch. 1, public domain), same segmentation, pauses and loudness processing. Samples are in the project files under `narration-benchmark/`. Reproduce with `lantern-narrate benchmark`.

| Engine | Voice | Load s | First audio s | × realtime | Peak RSS MB | Model MB | Loudness (ffmpeg ebur128) |
|---|---|---|---|---|---|---|---|
| Kokoro fp32 (ONNX) | af_heart | 1.48 | 0.62 | 2.51 | 1013 | 337 | −18.1 LUFS / −1.3 dBFS |
| Kokoro fp32 (ONNX) | af_bella | 1.41 | 0.64 | 2.34 | 1018 | 337 | −18.1 / −1.3 |
| Kokoro fp32 (ONNX) | bf_emma | 1.50 | 0.66 | 2.44 | 988 | 337 | −18.1 / −1.2 |
| Kokoro fp32 (ONNX) | am_michael | 1.76 | 0.57 | 2.33 | 1079 | 337 | −18.6 / −0.7 |
| Kokoro fp32 (ONNX) | bm_george | 1.41 | 0.70 | 2.71 | 1027 | 337 | −18.0 / −1.3 |
| Kokoro int8 (ONNX) | af_heart | 1.30 | 0.64 | 2.39 | 801 | 115 | −18.1 / −1.2 |
| Kokoro (MLX) | — | not run | | | | | needs Apple Silicon |
| Pocket TTS | — | not run | | | | | weights are on Hugging Face, which is blocked from this container |
| Qwen3-TTS (MLX) | — | not run | | | | | needs Apple Silicon |

"× realtime" means seconds of speech per second of compute. A 10-hour novel at 2.5× takes about 4 hours on this Xeon. An M2 should be faster, but **that is not measured yet**.

Subjective quality (naturalness, prosody, pronunciation, consistency) is **left blank on purpose**. Listen to the samples and fill in `RESULTS.md` yourself. No scores are made up here.

### Licences and fit (from the projects' published terms; checked October 2026)

| | Kokoro-82M | Pocket TTS (Kyutai) | Qwen3-TTS |
|---|---|---|---|
| Code | MIT (kokoro-onnx), Apache-2.0 (model repo) | MIT | Apache-2.0 |
| Weights | Apache-2.0 | CC-BY-4.0 | Apache-2.0 |
| Voices | 54 built-in voices, Apache-2.0 | **Per-voice:** VCTK-derived voices are CC-BY-4.0; some (expresso/EARS-derived) are **non-commercial** | Built-in speakers (e.g. Ryan, Aiden for English) |
| Size | 82M params, 310 MB fp32 / 88 MB int8 + 27 MB voices | 100M params | 0.6B (8-bit ≈ 1 GB) / 1.7B (≈ 4.5 GB) |
| Runs on | CPU anywhere (ONNX) and Apple GPU (MLX) | CPU (PyTorch) | Apple GPU (MLX); CUDA elsewhere |
| Speed claim | measured above | Vendor reports about 6× realtime on an M4 MacBook Air (**unverified**) | Heavier; expect several times slower than Kokoro on an M2 (**unverified**) |
| Voice cloning | none | supports cloning from a prompt; **Lantern uses only built-in voices** | supports it; **Lantern uses built-in speakers only** |
| Watch out for | espeak-ng (GPL-3) is used *locally* for phonemes; it is never shipped in the web app | per-voice licences; check before sharing audio | memory on 16 GB machines; long load time |

### Recommendation

- **Primary: Kokoro.** It is permissively licensed end to end, light enough for a 16 GB M2 Air, fast on CPU, and has the largest choice of built-in voices. On a Mac, try `kokoro-mlx` first; if MLX gives any trouble, `kokoro` (ONNX) works everywhere.
- **Fallback engine: Pocket TTS.** It is a different architecture and CPU-friendly. Stick to CC-BY voices if the audio might ever be shared.
- **Qwen3-TTS: evaluated, not the default.** It is supported for experiments. Its size and speed on a 16 GB M2 make whole-novel generation impractical until measured otherwise.

**Pending on the Mac:** `lantern-narrate doctor` and `lantern-narrate benchmark` (which adds MLX, Pocket and Qwen rows), then listening to the samples.

---

## 3. Setting up the narrator (Mac)

```bash
# one time
brew install python@3.12            # 3.10–3.13 work
cd shadow-scribe && npm install     # the narrator uses Lantern's own EPUB parser (Node ≥ 20)
cd tools/narrator
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e '.[kokoro]'          # add ,mlx for Apple GPU engines and ,pocket for Pocket TTS
lantern-narrate doctor              # hardware, engines, tools, and a recommendation
lantern-narrate download kokoro     # ~340 MB into ~/.lantern-narrator/models (add --int8 for ~115 MB)
```

AAC encoding uses macOS's built-in `afconvert`. Elsewhere it uses `ffmpeg`, and with neither tool installed it falls back to WAV, which is roughly 10× bigger. `ffmpeg` is also needed for `--m4b`.

Models, jobs and caches live in `~/.lantern-narrator/` (override with `LANTERN_NARRATOR_HOME`). **Never commit them.**

## 4. Generating an audiobook

```bash
lantern-narrate voices kokoro
lantern-narrate generate ~/Books/emma.epub --engine kokoro --voice bf_emma
#   [3/55] Chapter III        12/48 · 2.4x realtime · ETA 1h12m
# → ./emma-bf-emma.lantern-audio
```

- **Cancel:** press Ctrl-C once to stop after the current sentence; progress is saved and the exit code is 130. Press it twice to abort immediately.
- **Resume:** run the same command again. Finished chapters are skipped and finished sentences come from the cache. Verified: an interrupted run resumed by reusing its cached sentences.
- **Retries:** a failing sentence is retried 3 times, then the run stops with the chapter and sentence id. Fix the cause and rerun; nothing finished is redone.
- **Edits:** if the text of a chapter changes, only that chapter is regenerated. Engine, voice, speed and bitrate are part of the job key.
- **Partial books:** `--sections 1-3` builds a package of the first three narrated sections. Lantern shows it as incomplete.
- **Front and back matter:** copyright, table of contents and similar pages are skipped by default. Use `--include-all` to narrate everything.
- **Captions:** `--no-text` leaves sentence text out of the package. The player still works, and the captions come from the book on the device.
- **Apple Books:** `--m4b` also writes a single chaptered `.m4b` file.

From inside Lantern, Listen has an **Export narration script** button that saves the same script JSON the CLI builds. `generate` accepts that `.json` directly, so the EPUB itself doesn't need to be on the Mac.

**Loudness:** every chapter is normalised to −18 LUFS integrated (ITU-R BS.1770, matching ffmpeg's ebur128 within 0.1 LU). A limiter keeps sample peaks at or below −1.5 dBFS to leave headroom for AAC. Narration sounds consistent from chapter to chapter and sits comfortably under ambience.

## 5. Getting it onto the iPhone

1. AirDrop the `.lantern-audio` file to the iPhone. It saves to Files (or save it to iCloud Drive).
2. In Lantern on the iPhone, import the **same EPUB** (or open a book that already has it), then go to **Listen → Import narration…** and pick the file.
3. Lantern checks that the package belongs to that EPUB (via the SHA-256 `contentId`) and asks before importing a mismatched one.

Import reads chapters straight out of the zip with `Blob.slice`, so a whole novel is never held in memory. Each chapter is written to IndexedDB in its own transaction. A failed import rolls back completely.

**Storage on iPhone (not yet verified on a device):**
- 64 kbps AAC is about 29 MB per hour, so a 10-hour novel is about 290 MB.
- Safari can **evict website storage after 7 days without a visit**. Lantern asks for persistent storage (`navigator.storage.persist()`), but the reliable fix is to **Add to Home Screen**, because home-screen web apps are exempt from that rule.
- Lantern shows the storage used and quota on the Listen page. **Remove** deletes a narration; deleting the book's text removes its narrations too.

## 6. Listening

- **Controls:** play/pause, ±15 s (crosses chapter boundaries), previous/next chapter (previous restarts the chapter if you're more than 4 s in), scrubber, speed 0.8–2× (pitch preserved), chapter list, sleep timer (15/30/45/60 min or end of chapter), and a live caption of the current sentence.
- **Mini-player:** shows on every other page and keeps playing while you browse the companion.
- **Lock screen and headphones:** Media Session metadata, play/pause, seek ±15 s, next/previous chapter and scrubbing.
- **Device voice:** the fallback reads sentence by sentence, so skip moves by sentences and speed changes take effect at the next sentence.
- **Resume:** position is saved every 1.5 s while playing, on pause, when the tab is hidden, and on page close. Reopening resumes at the exact second. Verified by reloading in Chromium.

### Reader ↔ Listen

- Both views store a locator `{ sectionId, blockId }` (plus `time` for audio) in `lantern_listen`. **Whichever was used most recently wins**, so reading ahead and then pressing Listen starts from the paragraph you were reading.
- **Read along** opens the Reader at the narrated paragraph and highlights it live. **Listen from here** starts narration from the first paragraph on screen.
- **Spoilers:** narration never changes your companion progress (`currentChapter`). When narration passes a chapter you haven't marked, Listen points it out and offers **Update companion progress**, which opens the usual chapter-update dialog. In strict spoiler mode, titles of chapters you haven't reached are shown as "Section N".

### Ambience

- Rain, fireplace, ocean, night wind, brown and white noise. They are generated procedurally in the browser (no audio files, no licences) and loop seamlessly.
- Ambience volume is separate from narration volume. Ambience **ducks** to 45% while narration plays (this can be turned off) and fades out with the sleep timer.
- **iPhone:** iOS ignores web volume controls for `<audio>`, so narration follows the hardware buttons and only the ambience slider works there. Narration is kept out of Web Audio on purpose, because `<audio>` is what keeps playing with the screen locked. Whether ambience also keeps playing when locked is **not verified on a device**.

---

## 7. Data and privacy

| Data | Where it lives | Synced to Supabase? |
|---|---|---|
| Companion record (notes, progress…) plus the new `contentId` (a SHA-256 hash, no text) | localStorage `shadowscribe_books` (frozen key, unchanged shape plus one string field) | Yes, as before |
| Book text (sections, paragraphs, anchors) | IndexedDB `lantern_content` → `contents`, `sections` | **No** |
| Generated narration audio + timings | IndexedDB `lantern_content` → `audiobooks`, `audio` | **No** |
| Listen/Reader positions, player prefs | localStorage `lantern_listen` | **No** |
| Models, job caches | `~/.lantern-narrator/` on the Mac | **No** |

- No ebook text or audio is uploaded anywhere. Moving a package between devices is a manual file transfer.
- Encrypted EPUBs (DRM) are detected: Lantern can still create a companion, but it doesn't keep their text for reading or listening. Lantern does not and will not remove DRM. Font obfuscation, which is not DRM, is allowed.
- Generated narration is for **personal use** with books you own. Don't redistribute narrations of copyrighted books.

## 8. Formats

### Narration script (`lantern-narration-script` v1)
Produced by `src/narration/narrationScript.js`, which is the **single source of segmentation**: the CLI calls it through `scripts/narration-script.mjs` and does not re-implement it.

```jsonc
{ "format": "lantern-narration-script", "version": 1,
  "book": { "contentId": "sha256:…", "title", "author", "language", "parserVersion" },
  "sections": [{ "id": "ch1", "order": 2, "title": "Chapter I", "narrate": true, "skipReason": null,
                 "chapterNums": [1], "anchors": [...],
                 "segments": [{ "id": "b3.0", "blockId": "b3", "start": 0, "end": 118,
                                "text": "It is a truth…", "spoken": "It is a truth…",
                                "kind": "sentence|paragraph|heading", "pauseAfterMs": 650 }] }] }
```

### Package (`.lantern-audio`, `lantern-audiobook` v1)
A ZIP with **STORED** (uncompressed) entries, which lets the browser slice audio without inflating it. A package re-zipped with deflate also imports.

```jsonc
// manifest.json
{ "format": "lantern-audiobook", "version": 1, "complete": true, "totalDurationSec": 41234.5,
  "book": { "contentId", "title", "author", "language", "parserVersion", "sectionCount" },
  "narration": { "engine", "engineLabel", "model", "engineVersion", "licenseWeights", "voice", "speed",
                 "sampleRate", "generator", "generatedAt" },
  "sections": [{ "id", "order", "title", "chapterNums", "anchors", "file": "audio/002-ch1.m4a",
                 "mime": "audio/mp4", "bytes", "durationSec",
                 "segments": [{ "id": "b3.0", "blockId": "b3", "t0": 0.35, "t1": 7.9, "start", "end", "text" }] }] }
```

### Stable locators
- `contentId = "sha256:" + hex(SHA-256(EPUB bytes))`
- `sectionId` comes from the spine item (its manifest id, deduplicated). `blockId = "b<N>"` is the Nth text block in that spine document. `segmentId = "<blockId>.<n>"`.
- Bump `PARSER_VERSION` / `SEGMENTER_VERSION` if a change would move ids. Packages record the parser version.

## 9. Code map

| Path | Role |
|---|---|
| `src/content/epubContent.js` | EPUB XHTML → text blocks, anchors, landmarks; `buildBookContent` |
| `src/utils/epubParser.js` | Existing parser, now also returns `content` and offers `parseEpubContent` for Node |
| `src/content/contentRepository.js` | IndexedDB `lantern_content` (content + audio) |
| `src/narration/segmenter.js`, `narrationScript.js` | Sentences, pauses, spoken normalisation, script |
| `src/narration/audiobookPackage.js` | Reads `.lantern-audio` (EOCD/ZIP64, Blob slicing), validates the manifest |
| `src/narration/players.js` | `GeneratedAudioPlayer` (HTMLAudio) and `SpeechNarrationPlayer` (Web Speech) behind one interface |
| `src/narration/sleepTimer.js`, `listenState.js`, `sectionLabels.js` | Timer, `lantern_listen` persistence and locators, spoiler-aware labels |
| `src/atmosphere/ambientEngine.js` | Procedural ambience, ducking, fades |
| `src/context/PlaybackContext.jsx` | One app-wide session: player, ambience, sleep, Media Session, saving |
| `src/pages/ListenPage.jsx`, `ReaderPage.jsx`, `components/listen/*` | UI |
| `tools/narrator/` | Python CLI (`lantern-narrate`): engines, generator, packaging, benchmark |

## 10. Troubleshooting

| Symptom | Fix |
|---|---|
| "This book has no text on this device yet" | Listen → **Link EPUB** and pick the same file. Older companions didn't keep the text. |
| "This narration was generated from a different EPUB file" | Use the same EPUB file on both devices. A re-downloaded EPUB from a store can differ byte for byte. |
| "Tap play to start audio" | The browser blocked autoplay. Tap play once. |
| Import fails with a storage message | Free space, remove an old narration, or Add to Home Screen (iPhone). |
| Narration disappeared on iPhone | Safari evicted it after 7 days unused. Re-import, and use Add to Home Screen. |
| Generation stops with "Segment … failed" | Rerun the command; if it fails at the same place, report the quoted sentence. |
| `kokoro-mlx`/`qwen3` "need an Apple Silicon Mac" | Use `--engine kokoro` (ONNX), or check you are in an arm64 Python (`python -c "import platform;print(platform.machine())"`). |
| Package is WAV and huge | Install ffmpeg, or run on macOS where `afconvert` is built in. |
