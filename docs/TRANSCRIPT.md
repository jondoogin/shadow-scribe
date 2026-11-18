# Lantern — Follow-Along Transcript (design)

**Status (Session 168, 2026-11-18):** design approved by John (decisions in §10). **Built: sentence follow-along (Phase 1), word tokens and the narrator's word aligner (Phase 3), word animation in Lantern including the device voice (Phase 4), and the Reader's narrated sentence (Phase 5, reduced scope).** Restyled for Catalogue III. Tested in Node, pytest and headless Chromium at phone size, with fixture word times. **Phase 2 ran on the M5 Pro on 2026-11-18 (§13): 69 of 69 sentences aligned.** Not yet done: an iPhone check, and a listen to one suspect sentence. §12 lists where the build differs from the design below. Branch: on top of Catalogue III (PR #4), which is on the neural narration branch (PR #1); none of them is merged.

**What John asked for:** while narration plays, show the book's text on screen and animate it as each sentence, or even each word, is spoken. Like Spotify's lyrics view, but more intelligent and more beautifully animated.

---

## 0. Summary

| Question | Decision |
|---|---|
| Where do **sentence** timings come from? | They already exist. The narrator stitches each chapter from per-sentence clips, so every segment in a `.lantern-audio` manifest has exact `t0`/`t1`. Phase 1 needs no narrator changes. |
| Where do **word** timings come from? | **Forced alignment on the Mac, per sentence clip, after synthesis.** The default engine (Qwen3-TTS 1.7B) produces no word timings, so one aligner serves every engine. Primary candidate: **Qwen3-ForcedAligner-0.6B** (Apache-2.0, MLX port exists). Fallback: a wav2vec2 CTC model with a small Viterbi aligner in numpy. A short spike on the M5 Pro picks one. |
| Can existing narrations get word timings? | Yes. `lantern-narrate align book.lantern-audio` decodes each chapter, cuts it at the known sentence `t0`/`t1`, aligns each piece and rewrites the package. No re-synthesis. |
| Who decides what a "word" is? | Lantern's JS segmenter, as for sentences (one segmentation rule). The script gains per-segment word tokens with display offsets and spoken forms. |
| How are timings stored? | A per-chapter sidecar in the package, `timings/<chapter>.words.json`, holding only character offsets and milliseconds, **no text**. Imported into a new IndexedDB store, `timings`. Manifest stays version 1 (additive, optional). |
| How does it stay in sync? | A frame clock reads `audio.currentTime` on every animation frame while the transcript is visible, smoothed between the browser's coarse `timeupdate` events, plus a user sync offset for Bluetooth latency. React renders the chapter once; a small imperative "conductor" moves classes and one CSS variable. |
| What does it look like? | A pool of warm lantern light glides behind the sentence being read; the current word fills with ink from left to right as it is spoken; spoken text settles to a quieter tone; the view follows the voice without ever fighting the reader's own scrolling. |
| Is it honest about precision? | Yes. Word animation appears **only** where a measured alignment passed its confidence check. Elsewhere the transcript is sentence-level and never fakes word timing (product spec §Read/Listen: "don't imply guaranteed word-level boundaries"). |
| Spoilers? | It only ever shows the chapter being narrated, never text from later chapters, never changes companion progress, and follows strict mode for titles. An optional "reveal as spoken" veil covers the rest of the chapter. Timings carry no text and never leave the device. |

---

## 1. What exists today (audited on the narration branch)

- **Segments are the timing unit already.** `src/narration/segmenter.js` splits each text block into sentence segments `{ id: "b3.0", blockId, start, end, text, spoken, kind, pauseAfterMs }`. `start`/`end` are character offsets into the display text of the block.
- **The narrator synthesizes one segment at a time** and joins them in `generate.assemble()` (`tools/narrator/lantern_narrator/generate.py`): trim silence, fade, add a deterministic pause. It records `t0`/`t1` for each segment in seconds. These are exact, not estimated, because Lantern built the chapter itself.
- **The package carries them.** `manifest.sections[].segments[] = { id, blockId, t0, t1, start, end, text? }`. `--no-text` drops `text`; the device then uses the book text it already has in IndexedDB.
- **The player already knows the current sentence.** `GeneratedAudioPlayer._onTime()` binary-searches segments on each `timeupdate` (`segmentAt`) and publishes `segmentIndex/segmentId/blockId`. `timeupdate` fires only about every 250 ms, which is fine for sentences and too coarse for words.
- **Reader "Read along" highlights the paragraph** (`.reader-narrating`, a 600 ms background fade) from `playerState.blockId`.
- **The Listen page shows a one-line caption** of the current sentence (`listen-caption`, `aria-live="polite"`).
- **No word timings exist anywhere.** None of the engines in use exposes them: Qwen3-TTS (autoregressive codec at 12 Hz) has no duration output, Pocket TTS none, and `kokoro-onnx` none. (Kokoro's PyTorch pipeline does expose per-token timestamps, but the Mac's default engine is Qwen3.)
- **Web Speech fallback** speaks one segment per utterance. Some voices fire `onboundary` with a `charIndex` per word; many (notably on iOS) don't, or fire unreliably.

So: sentence-level follow-along is a front-end feature on data we already ship. Word-level needs one new step in the narrator and one new field in the script.

---

## 2. Where word timings come from

### Options considered

| Option | Verdict |
|---|---|
| **A. Engine-native timings** (Kokoro PyTorch `KPipeline` token `start_ts`/`end_ts`) | Exact for Kokoro, but only Kokoro, and not the ONNX build the narrator uses. Qwen3 1.7B, the default on the Pro, has nothing equivalent. Kept as a possible later shortcut, not the design. |
| **B. Estimate words inside each sentence** (by syllables or characters between `t0` and `t1`) | Free, but visibly wrong on long words, pauses at commas and dialogue. It would imply word precision we don't have. **Rejected for display.** Used only internally as the aligner's sanity check. |
| **C. Forced alignment of the finished chapter** | Works, but chapter-long alignment is slow and drifts; one error can smear across minutes. |
| **D. Forced alignment per sentence clip (chosen)** | We already know each sentence's exact text and its exact time window. Aligning a 2–20 s clip against a known transcript is the easiest case for an aligner: fast, robust, and an error stays inside one sentence. Works for every engine and for designed voices. |
| **E. ASR (Whisper) timestamps** | Recognises its own words, which then have to be matched back to the book; worse word boundaries than a forced aligner. Rejected. |

### The aligner

Two candidates, both local, both free to use commercially. A spike (see §9) runs both on the benchmark passage on the M5 Pro and picks one.

1. **Qwen3-ForcedAligner-0.6B** (Qwen, Apache-2.0, described in the Qwen3-ASR report, arXiv 2601.21337). An MLX port exists (`mlx-qwen3-asr`). Same family and licence as the TTS model, multilingual, built to produce word timestamps for a given transcript. Unverified here: its speed on the M5 Pro, its accuracy on synthetic speech, and whether the MLX port's API is stable.
2. **wav2vec2 CTC + our own Viterbi** (e.g. `facebook/wav2vec2-base-960h`, Apache-2.0, about 360 MB, English only). CTC forced alignment is about 60 lines of numpy, so Lantern does not depend on `torchaudio.functional.forced_align`, which torchaudio has been winding down. Proven technique (it is what WhisperX uses). English only, which matches today's library.

Avoid the MMS forced-alignment weights (`torchaudio` `MMS_FA`): they are CC-BY-NC.

Either way the aligner is an optional extra (`pip install -e '.[align]'`), its weights go in `~/.lantern-narrator/hf-cache/` like every other model, and `lantern-narrate clean --models` removes them.

### Where it runs in the pipeline

```
segment text ─► TTS engine ─► PCM ─► trim + fade ─► ALIGN (new) ─► cache ─► assemble ─► AAC
                                               │
                         word tokens from the script (spoken forms)
```

- Alignment runs on the **trimmed** clip, the exact audio that lands in the chapter, so word times are simply `segment.t0 + local time`. No drift across a chapter is possible.
- Results are cached next to the segment's PCM under the same cache key, plus the aligner's id and version. Resuming, editing a chapter or changing voice behaves exactly like synthesis does today.
- Cost (estimate, to be measured): a CTC model on Apple GPU or CPU runs far faster than realtime, so alignment should add only a few percent to a 4-hour Qwen3 run.

### Confidence and fallback, per sentence

The aligner gives every word a score. A sentence is published with word timings only if:

- every token aligned, with mean confidence above a threshold set during the spike;
- no word is shorter than 40 ms or longer than 2.5 s (except the last word before a pause);
- words are monotonic and inside `[t0, t1]`.

Otherwise that sentence is stored with **no** word timings and the transcript shows it at sentence level. The package records the share of sentences that passed (`timings.wordCoverage`), and Listen shows "Word timing for 97% of this narration".

### A bonus: catching TTS mistakes

Autoregressive TTS (Qwen3 included) occasionally skips, repeats or garbles a word. A failed alignment is a strong signal of exactly that. `generate` will log those sentences, and an optional `--retry-misreads` regenerates a sentence once if its alignment fails. That improves the audio itself, not just the transcript. (Off by default until the spike shows how often it triggers.)

### Without a Mac: Web Speech

The fallback player listens for `onboundary` (`name === "word"`). If a voice fires boundary events, the transcript lights each word as the event arrives (event-driven, no time map, no sweep). If no boundary arrives within the first two segments, it stays sentence-level for the session. This is best effort and is labelled as such in code and docs.

---

## 3. Words: one source of truth

The aligner needs the words that were **spoken**; the transcript needs the words that are **displayed**. They differ: `toSpoken()` turns `&` into "and", `CHAPTER IV` into "Chapter 4", drops `[12]` footnote markers, and so on.

So the segmenter, which already owns both strings, also owns the word mapping. `narrationScript.js` adds `words` to every segment:

```jsonc
{ "id": "b3.0", "blockId": "b3", "start": 0, "end": 118, "text": "…", "spoken": "…",
  "words": [ { "s": 0, "e": 2,  "sp": "It" },
             { "s": 3, "e": 5,  "sp": "is" },
             { "s": 42, "e": 43, "sp": "and" },      // "&" in the book
             { "s": 60, "e": 64, "sp": "" } ] }       // "[12]": displayed, not spoken
```

- `s`/`e` are offsets into the **block's display text**, the same coordinate system as segment `start`/`end`. Punctuation attaches to its neighbouring word for display (so `“Oh!` lights as one unit), but is not part of `sp`.
- Words come from `Intl.Segmenter(lang, { granularity: "word" })` (Node 20 and every current browser), then joined with adjacent punctuation. Running it once at script time and **storing offsets** means a browser's different ICU version can't move them.
- `sp` is the spoken form, which may be several words ("1813" becomes "eighteen thirteen") or empty. The aligner aligns the spoken words and maps the times back to the display word that produced them.
- A new `WORDS_VERSION` constant is recorded in the script and the package. Segment ids don't move, so `SEGMENTER_VERSION` stays at 1.
- The Python CLI still never segments anything itself (CLAUDE.md "One segmentation").

---

## 4. Storage

### In the package (`.lantern-audio`)

Manifest stays `version: 1`; every new field is optional, so older Lantern builds import new packages and simply ignore word timings.

```jsonc
// manifest.json (additions only)
{ "timings": { "level": "word", "aligner": "qwen3-forced-aligner-0.6b", "alignerVersion": "…",
               "wordsVersion": 1, "wordCoverage": 0.97 },
  "sections": [{ "id": "ch1", …, "segments": [ … unchanged … ],
                 "wordTimings": "timings/002-ch1.words.json" }] }
```

```jsonc
// timings/002-ch1.words.json  (one per chapter, no book text inside)
{ "format": "lantern-word-timings", "version": 1, "sectionId": "ch1",
  "segments": {
    "b3.0": [0, 2, 350, 512,   3, 5, 512, 640,   …],   // flat: s, e, t0ms, t1ms per word
    "b3.1": null                                      // alignment failed → sentence level
  } }
```

- **Why a sidecar** and not inside the manifest: a novel has about 100,000 words, roughly 2–3 MB of JSON. The manifest is parsed whole at import and kept in the `audiobooks` record; per-chapter sidecars load lazily, one chapter at a time.
- **Why offsets, not words:** the file holds no book text, so `--no-text` packages get word follow-along too, and nothing readable leaks if a timings file is shared.
- Milliseconds as integers, chapter-relative, keep files small and comparisons exact.

### On the device (IndexedDB `lantern_content`)

- New object store `timings`, key `[audiobookId, sectionId]`, value `{ audiobookId, sectionId, wordsVersion, segments }`. Opening the DB bumps `CONTENT_DB_VERSION` from 1 to 2; the upgrade only **adds** the store (no data migration).
- `saveAudiobook()` writes timings in the same per-chapter transaction as that chapter's audio, so the existing rollback covers it. `deleteAudiobook()` deletes them.
- A narration imported before this feature can be upgraded by importing the re-aligned package (`lantern-narrate align`); Lantern replaces the old one in place and keeps the listening position (positions are locators, not package ids).
- Like the audio: **never** in `shadowscribe_books`, **never** synced to Supabase.

### Preferences (localStorage `lantern_listen`)

`transcript: { level: "word" | "sentence", syncOffsetMs: 0, reveal: "all" | "spoken", size: "m" }`. The existing `lantern_listen` key, no new key.

---

## 5. Playback sync

### The clock

`timeupdate` arrives about every 250 ms; a word lasts about 250–400 ms. So the transcript reads time on every animation frame instead:

```
mediaTime(now) = anchor.media + (now − anchor.perf) / 1000 × playbackRate
```

- The anchor is reset from `audio.currentTime` on `timeupdate`, `seeked`, `play`, `pause`, `ratechange` and chapter load. Between those, the clock extrapolates smoothly, so the fill never stutters.
- If extrapolation and `currentTime` differ by more than 80 ms, the clock snaps (and the animation crossfades instead of sweeping).
- The display uses `mediaTime + syncOffsetMs + 30 ms`. The 30 ms lead feels right because people expect to see a word slightly before hearing it. `syncOffsetMs` is a user setting (−400 to +100 ms) for Bluetooth headphones, whose latency the browser doesn't always report. Settings has a short "tap when you hear the word" calibration.
- Playback speed (0.8–2×) needs nothing special: timings are media time, and `currentTime` is media time.
- `GeneratedAudioPlayer` gains a `clock()` method returning that value. Its public state and its 250 ms behaviour stay unchanged, so Listen, the mini-player, Media Session and position saving don't re-render per frame.

### The conductor (no React per frame)

- React renders the chapter **once** (`TranscriptView`): blocks as paragraphs, sentences as spans with `data-seg`. Re-renders happen on chapter change only.
- A plain-JS `TranscriptConductor` runs a `requestAnimationFrame` loop **only while the transcript is visible and audio is playing**. Each frame it finds the current word (pointer walk from the last index, binary search after seeks), and:
  - on a new sentence: moves the `is-current` class and the light pool, and starts follow-scroll;
  - on a new word: moves `is-speaking` to that word span and marks earlier words `is-spoken`;
  - every frame: sets one CSS variable, `--fill` (0 to 1), on the speaking word.
- **Word spans are created lazily:** only the current sentence and the next one are split into word spans (from the stored offsets). The rest of the chapter stays plain text, so a 10,000-word chapter has a few dozen extra nodes, not 10,000.
- Budget: under 1 ms of script per frame; only `transform`, `opacity` and one gradient position change, so the browser repaints a single word and composites the rest.
- The loop stops on `pause`, `visibilitychange` (hidden) and unmount. With the screen locked, iOS stops animation frames anyway and the audio keeps playing; on wake the conductor jumps straight to the right sentence without animating the gap.

### Seeking and control

- **Tap a sentence** to play from it (`player.goTo`). This is an explicit request, which the spec allows.
- Scrolling never moves the narration (spec: "silent scrolling must not hijack narration").
- Jumps further than the next sentence (scrubber, ±15 s, chapter list) **crossfade** to the new spot instead of scrolling through the text in between.

---

## 6. Look and motion

The aim is the feeling of being read to by lamplight, not karaoke. Lantern's own metaphor gives the signature: **the light follows the voice.**

### Layout

- **Where (John's choice):** Listen gets a second view, **Now Playing ↔ Text**, a segmented control in the existing Listen header (mockup 9 already shows "Read / Listen"). The mini-player's caption opens it too. It is a full-height reading column inside Listen, with the slim transport (play, ±15 s, scrubber) pinned at the bottom.
- **Type:** EB Garamond, as in the Reader, a step larger (22 px on phones, 24 px from 768 px), line-height 1.7, measure about 34em, left-aligned like a book, not centred like lyrics. Paragraph indents and scene breaks (⁂) as in the Reader.
- The active sentence sits about 38% from the top of the column: high enough to see what's coming, low enough to keep context above.

### States

| Text | Treatment |
|---|---|
| Ahead in the chapter | `--color-text-primary` at 50% opacity: present, quiet |
| The current sentence | full `--color-text-primary`, with the **light pool** behind it |
| The word being spoken | an **ink fill**: colour sweeps left to right through the word, from the sentence colour to `--color-accent`, driven by `--fill`. A very soft `text-shadow` in `--color-accent-dim` is the glow of the lantern. |
| Words already spoken in this sentence | settle to `--color-text-primary`, keeping a trace of warmth that fades over 400 ms |
| Already read | `--color-text-secondary` at 70%: clearly behind you, still legible |

- **The light pool:** one absolutely positioned element behind the text, a soft radial gradient in `--color-accent-dim`, sized to the current sentence's bounding box plus 12 px. It glides to the next sentence with `transform` (critically damped, no overshoot, 520 ms), and its width and height ease along. It is the only moving element on screen.
- **Sentence-level mode** (no measured word timings, or the user chooses it): exactly the same, without the ink fill. Nothing pretends to know where the words are.
- **Short words** (under 120 ms) skip the sweep and simply light up; a sweep that fast reads as flicker.
- **Dialogue and pauses:** during the pause after a sentence, the pool stays put and the last word holds its colour; the next sentence lights only when its voice starts (`t0`), so silence looks like silence.
- **Chapter change:** the column dissolves with the existing `bookPageEnter` blur dissolve (420 ms), and the new chapter heading takes the pool first, as it is spoken.
- **Follow-scroll:** a damped scroll (no overshoot) keeps the current sentence near the 38% line, but only when it drifts out of a comfortable band (25%–55%), so the page moves in calm steps, not continuously. If the reader scrolls by hand, following pauses and a small **Back to narration** pill fades in (`fadeIn`, 220 ms); tapping it, or 8 s with no touch while the voice is off screen, resumes following.
- **Light and dark:** uses only existing tokens (`--color-text-*`, `--color-accent`, `--color-accent-dim`, `--color-hairline`), so both themes and the atmosphere layers work unchanged. The transcript sits on the Listen backdrop, behind a scrim strong enough to keep body text above 4.5:1. "Ahead" text at 50% must still pass 4.5:1 on the darkest backdrop; if it doesn't, it gets a stronger scrim, not more opacity tricks.

### Reduced motion

`prefers-reduced-motion`: no sweep, no glide, no glow, no smooth scroll. The current sentence (and word, where measured) changes colour instantly and the page jumps to it. Everything stays usable.

### Fit with the motion system (approved by John, 2026-11-16)

`MOTION_SYSTEM.md` says nothing runs longer than 0.5 s and nothing animates continuously except the momentum dot. The transcript is **time-driven state, not decoration**: its motion follows the voice and stops when the voice stops. John approved a documented exception, the "**listening register**":

- the light pool glides at 520 ms (the Reader's narration highlight is already 600 ms);
- the ink fill is continuous only while a word is being spoken;
- no other element moves; no bounce, overshoot, stagger or particles.

It is recorded in `docs/DESIGN_SYSTEM.md` and `docs/design-system/MOTION_SYSTEM.md`. It covers the transcript and the Reader's read-along only; no other surface may use it.

### One renderer, two places

The Reader's "Read along" will use the same `TranscriptView` + conductor at a lower intensity (paragraph highlight by default, sentence or word if the user turns it on in the Reader's Aa menu). One rendering path means the Reader and Listen can't disagree about where the voice is, and the current `.reader-narrating` code is replaced rather than duplicated.

### Accessibility

- The transcript is ordinary text in reading order. The current sentence has `aria-current="true"`. There is no `aria-live` for words (a screen reader would talk over the narration); the Listen caption keeps its polite live region for sentences.
- Every control is a button with a 44 px target; "Back to narration" is reachable by keyboard; tapping a sentence is also `Enter` on a focused sentence.
- Text size follows the Reader's size setting.

---

## 7. Spoilers and privacy

Lantern's spoiler rules protect the reader from the **companion** knowing or showing more than they've reached. The transcript shows the book itself, which the reader is choosing to hear, so the rules here are about not *leaking ahead*:

1. **Only the chapter being narrated** is ever rendered. Text from later chapters never appears, not even as a preview line at the end of a chapter.
2. **Strict spoiler mode:** chapter headings use `sectionLabels.js`, so an unreached chapter's title shows as "Section N" until narration reaches it. The heading's own words light up only as they are spoken.
3. **Reveal as spoken (optional, off by default):** for readers who don't want to glimpse the end of a scene, everything after the next sentence is veiled (a soft blur over blank lines that keep the page's shape) and unveils as the voice reaches it. **Off by default** (John, 2026-11-16): by default the whole chapter shows, as in the Reader. The switch lives in the Text view's Aa menu and is saved in `lantern_listen` (`transcript.reveal`).
4. **Progress stays conservative:** the transcript never changes `book.currentChapter`. It uses the same "Update companion progress" prompt as Listen when narration passes an unmarked chapter. Showing text is not the same as confirming the reader has reached it.
5. **No AI involvement:** nothing in this feature calls the companion or any model at runtime. The companion's spoiler bound is unaffected. (The visual-journey feature, designed in its own thread, is where image prompts meet spoiler rules.)
6. **Privacy:** timings are offsets and milliseconds only, live in IndexedDB beside the audio, and are never uploaded or synced. Alignment runs on the Mac with local weights.

---

## 8. Edge cases

| Case | Behaviour |
|---|---|
| Sentence failed alignment | That sentence is sentence-level; its neighbours keep word timing. |
| Footnote markers, `[12]` | Displayed, not spoken (`sp: ""`); never light up. |
| Numbers, abbreviations ("1813", "Mr.") | One display word, several or different spoken words; it lights for the whole spoken span. |
| Hyphenated and em-dash runs | `Intl.Segmenter` splits them; dashes attach to the preceding word. |
| Verse and letters (newlines) | Lines stay as lines; newlines are already sentence boundaries. |
| Headings and scene breaks | Headings are spoken segments and light up; ⁂ breaks don't. |
| Chapters the narrator skipped (front matter) | Not shown; chapter list behaviour as today. |
| Partial package (`--sections`) | Transcript only for narrated chapters; others say "Not narrated yet". |
| Book text missing on this device | Transcript explains, offers **Link EPUB** (as Listen does). Package `text` is not used as a substitute, so the transcript always shows the real book formatting. |
| EPUB re-imported with a different parser version | `wordsVersion`/`parserVersion` mismatch: fall back to sentence level and say why. |
| Speed 2× | Works; the sweep shortens with the words. |
| AirPods latency | User sync offset; calibration in Settings. |
| Web Speech without boundary events | Sentence level. |

---

## 9. Plan

Each phase is a PR into the narration branch (or `main` once that merges), and each is useful on its own.

**Phase 1 — Sentence transcript (front end only, no package change). Built, Session 165.**
What shipped: `src/narration/clock.js` (MediaClock), `src/narration/transcript.js` (pure helpers), `src/components/transcript/TranscriptConductor.js` and `TranscriptView.jsx`, the Now Playing ↔ Text switch in Listen, `mediaTime`/`goToSegment`/`setPrefs` in `PlaybackContext`, and the prefs `listenView` and `transcriptReveal` in `lantern_listen`. Not yet in Phase 1: the Settings sync-offset calibration (moves to Phase 4, where words make it matter) and a keyboard path for "tap a sentence".
Planned scope:
`TranscriptView`, `TranscriptConductor` with the frame clock, light pool, follow-scroll with "Back to narration", tap to play, reduced motion, strict-mode labels, Now Playing ↔ Text in Listen. Works with every existing package and with Web Speech. Tests: clock extrapolation and snapping, segment lookup, conductor class changes on a fake clock, follow-scroll band logic; browser e2e on a fake-engine package.

**Phase 2 — Aligner spike (Mac, about an hour of John's machine via Remote Control).**
Run both candidates on the 20-sentence benchmark passage with Qwen3 1.7B (Aiden) and Kokoro. Measure speed, memory, pass rate and boundary error against 50 hand-checked words. Pick one and set the confidence threshold. Results go in `NARRATION.md`.

**Phase 3 — Word timings in the narrator.**
`words` in the narration script (`WORDS_VERSION` 1), `align` step and cache in `generate`, `[align]` extra, `lantern-narrate align <package>` for existing narrations, sidecar files and `timings` in the manifest, `--retry-misreads` behind a flag. Tests with the fake engine and a fake aligner (no downloads).

**Phase 4 — Word animation in Lantern.**
Package reader for sidecars, IndexedDB `timings` store (DB version 2), lazy word spans, ink fill, coverage label, sync offset and calibration, Web Speech `onboundary` mode.

**Phase 5 — Reader convergence.**
Reader "Read along" switches to the shared renderer; `.reader-narrating` retires.

### Release gates (unchanged)

`npm test`, `npm run build`, no new lint errors per file, `pytest` in `tools/narrator`, a browser e2e of Listen, and an iPhone check (lock screen, wake, Bluetooth offset) before merging Phase 4. Nothing merges or deploys without John's approval.

---

## 10. Decisions (John, 2026-11-16)

1. **Motion exception: yes.** The "listening register" (§6) may go past the 0.5 s limit: a 520 ms glide of the light pool and a continuous ink fill while a word is spoken. Added to the design system docs.
2. **Default level: word-level** wherever the narration has measured word timings. Sentences without them stay sentence-level. The user can switch to sentence-only in the Text view's Aa menu (`transcript.level`).
3. **Reveal as spoken: an option, off by default.**
4. **Placement: a Text view inside Listen** (Now Playing ↔ Text), not a separate full-screen mode.

No open questions remain for Phase 1. The aligner choice (Phase 2) is settled by the spike's measurements.

---

## 11. Code map (planned; see §12 for what was built)

| Path | Role |
|---|---|
| `src/narration/segmenter.js`, `narrationScript.js` | + `words` per segment, `WORDS_VERSION` |
| `src/narration/clock.js` | frame clock (anchor, extrapolate, snap, offset) |
| `src/narration/wordTimings.js` | sidecar parsing, validation, lookup |
| `src/components/transcript/TranscriptView.jsx` | renders a chapter once; sentence spans; lazy word spans |
| `src/components/transcript/TranscriptConductor.js` | rAF loop, classes, `--fill`, light pool, follow-scroll |
| `src/narration/audiobookPackage.js` | read `timings/*.words.json` |
| `src/content/contentRepository.js` | `timings` store, DB version 2 |
| `src/narration/players.js` | `clock()`; Web Speech `onboundary` |
| `src/pages/ListenPage.jsx`, `ReaderPage.jsx` | Now Playing ↔ Text; Reader uses the shared renderer |
| `tools/narrator/lantern_narrator/align/` | aligner engines (Qwen3 aligner, CTC), confidence checks, cache |
| `tools/narrator/lantern_narrator/package.py` | sidecars + `timings` manifest block; `align` command |


---

## 12. As built (Session 168) and where it differs from the design

**Narrator (`tools/narrator`).**
- `lantern_narrator/align.py`: `verbalize` (numbers, years, ordinals, decimals, common abbreviations, accents), `forced_align` (CTC Viterbi in numpy), `Wav2Vec2Emitter` (`facebook/wav2vec2-base-960h`, Apache-2.0, English, MPS when available, downloads into the narrator's `hf-cache`), `Aligner.align_segment` with the confidence checks (mean letter probability ≥ 0.35, no word over 2.5 s), and the sidecar writer.
- **Only the wav2vec2 CTC aligner was built.** It needs nothing beyond `torch` and `transformers` (the `[align]` extra) and its Viterbi is ours. Qwen3-ForcedAligner stays a fallback if Phase 2 shows CTC is not good enough on synthetic speech.
- Alignment runs once per chapter, after assembly, on the assembled (pre-normalisation) PCM sliced at each segment's `t0`/`t1`, the same audio that is encoded. No per-segment alignment cache: re-aligning a chapter is fast compared with synthesis.
- **No separate `align <package>` command.** `generate` takes `--words auto|on|off` (default auto: on when the `[align]` extra is installed and the book is English). Re-running `generate` on a finished job aligns chapters that lack word timings by decoding their `.m4a` (afconvert or ffmpeg), with no re-synthesis. A package that is not in a job folder can't be re-aligned yet.
- `--retry-misreads` is **not built**; failed sentences are listed in `job.json` (`words.misses`) so Phase 2 can see how often it would trigger.
- Sidecar `timings/<section>.words.json`: `{ format: "lantern-word-timings", version: 1, wordsVersion, aligner, sectionId, segments: { "<segId>": [[s, e, t0ms, t1ms], …] } }`. Failed sentences are **left out** (not `null`). Manifest additions: `sections[].wordTimings` and `timings: { words: true, wordsVersion, aligner, coverage }`. Manifest stays version 1.
- `generate` prints the coverage ("Word timings: 412/430 sentences (96%)").

**Words (`src/narration/words.js`).** `segmentWords(text, start, end, kind)` uses a Unicode regex, **not `Intl.Segmenter`**, so offsets never depend on a browser's ICU. Words widen over touching punctuation and dashes; `sp` mirrors `toSpoken` (footnote markers empty, `&` → "and", heading numerals). `buildNarrationScript` adds `words` to every segment and `book.wordsVersion` (`WORDS_VERSION = 1`); `segmentBlocks` itself is unchanged, so the players are untouched.

**Lantern.**
- Import: `openAudiobookPackage().getWordTimings(section)` reads and validates a sidecar (`parseWordTimings` drops any sentence whose words are out of order or outside its time span). `saveAudiobook(…, getWords)` stores them as `words` on the chapter's existing **`audio` record**. **No new store and no DB version bump**, so nothing conflicts with the visual journey's planned schema change. `getWordTimings(audiobookId, sectionId)` reads them back. A broken sidecar costs only that chapter's word level.
- Render: sentences with timings render their words as `span.ts-w[data-t0][data-t1]` once, at chapter render (a chapter's few thousand spans render once and never re-render).
- Conductor: `setWordTime(t)` (binary search, `data-w="said|now"`, `--fill` on the current word) and `setWordIndex(k)` (device voice). Words only change inside the current sentence (`data-words="on"`); leaving a sentence clears them.
- Look: in the sentence being read, upcoming words are `--ink-2`, spoken ones `--ink`, and the current word fills from `--ink-2` to `--ink` with a soft edge (`background-clip: text`). Reduced motion shows the whole word at once.
- Device voice: `SpeechNarrationPlayer.onWords(fn)` passes on the engine's `word` boundary events (stale utterances ignored); `spokenOrdinalAt` + `spokenToDisplay` map the spoken position back to the word on screen. The "Word by word" switch appears once a boundary has arrived.
- Prefs in `lantern_listen`: `listenView`, `transcriptReveal` (off), `transcriptWords` (on). The Text view's footer holds "Word by word" (only when the chapter has word timing) and "Reveal as spoken".
- **No sync-offset setting.** Browsers try to keep `<audio>.currentTime` in step with what is heard (they need it for video sync), so a setting would mostly add clutter. This is an expectation, not a measurement: add the setting if the iPhone check shows drift with AirPods.
- **No coverage label in the UI**, for the same reason; the CLI reports it.
- **Reader:** the narrated paragraph keeps its accent rule and the sentence being read gets a light tint (`.c2-now-sent`), using the same segmenter. The Reader does not adopt the transcript renderer or follow-scroll, because it must never move under someone reading.
- Design: the Text view lives in the Listen card's tabs (`.c3-box` + `Tabs`), styles in `src/catalogue/catalogue.css` ("Follow-along text"), all colours from the Catalogue variables; the light pool is a 9% accent tint with the Reader's 3 px accent rule, no glow.

**Tests.** Vitest: words, script words, sidecar parsing and import, word runs, the conductor's word states, speech boundaries. Pytest (`tests/test_align.py`): verbalising, the Viterbi on planned emissions, confidence rejection, sidecars in the generator and the package, aligning earlier chapters without re-synthesis. Headless Chromium at 390×844: Text view in light and dark, word inking with fixture times, device-voice words with a fake speech engine, the Reader's sentence.

**Phase 2, what to run on the M5 Pro:** `pip install -e ".[align]"`, then `lantern-narrate generate <epub> --sections 1 --words on` with Qwen3 1.7B (Aiden). Check the printed coverage, listen to a few sentences in the Text view, and look at `words.misses` in `job.json`. If coverage is under about 90% or boundaries look late, tune `MIN_MEAN_PROB` or try Qwen3-ForcedAligner.


---

## 13. First real run (Phase 2, M5 Pro 48 GB, 2026-11-18)

Pride and Prejudice chapters I–II (Standard Ebooks edition), Qwen3 1.7B, voice Aiden, `generate --sections 1-2 --words on`.

- **Coverage:** chapter I 37/37 sentences, chapter II 32/32. No misses.
- **Speed:** synthesis + alignment about 250 s for 608 s of audio (about 2.4× realtime, as before). Alignment itself took about 1.2 s per 5-minute chapter (about 250× realtime) on MPS. An alignment-only re-run was 9.7 s, mostly model loading. Peak memory 18.1 GB during synthesis, 6.3 GB alignment only.
- **Checks:** no word over 1.5 s; starts monotonic in every sentence; pauses fall at commas and full stops (300–600 ms gaps). First word vs sentence start: median 60 ms, max 780 ms. One sentence looks late: ch. II `b2.0` ("I hope Mr. Bingley will like it, Lizzy.", +780 ms), to check by ear at about 0:25 of chapter II.
- Aligning from the decoded m4a instead of in-memory PCM moved 35 of 1,598 boundaries, mostly by one 20 ms frame.
- **Two bugs found and fixed** (regression tests added): `Wav2Vec2Emitter.tokens()` ran before `load()`, and the Viterbi backtrace overflowed `int8` under NumPy 2 for sentences over about 63 letters.
- `--words off` now leaves timings out of the package.
- Kept the wav2vec2 CTC aligner; no need to try Qwen3-ForcedAligner unless the iPhone check shows lag.
