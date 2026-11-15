# lantern-narrator

`lantern-narrate` generates audiobook narration for Lantern **locally** from an EPUB, using open neural TTS models. It writes a portable `.lantern-audio` package that you import in Lantern's Listen page.

The full guide (evaluation, iPhone transfer, formats, privacy) is in [`docs/NARRATION.md`](../../docs/NARRATION.md).

```bash
cd tools/narrator
python3 -m venv .venv && source .venv/bin/activate
pip install -e '.[kokoro,mlx,pocket]' # extras: kokoro, mlx (Apple Silicon), pocket, dev
(cd ../.. && npm install)             # EPUB parsing uses Lantern's own JS parser via Node

lantern-narrate doctor                # what this machine can run
lantern-narrate download kokoro       # ~340 MB (or --int8 for ~115 MB)
lantern-narrate audition book.epub      # hear the book's opening in every voice
lantern-narrate generate book.epub --voice Aiden   # voice (and engine/style/speed) remembered per book
lantern-narrate design "calm, low American man" --name Walter   # design a voice, then --keep a take
lantern-narrate benchmark             # compare engines on a public-domain passage
lantern-narrate clean                 # show (and with --yes, remove) everything it stored
```

| Engine id | Backend | Needs |
|---|---|---|
| `kokoro` / `kokoro-int8` | kokoro-onnx (ONNX Runtime, CPU) | `[kokoro]` + `download kokoro` |
| `kokoro-mlx` | mlx-audio | Apple Silicon, `[mlx]` |
| `pocket` | pocket-tts (PyTorch CPU) | `[pocket]`; weights from Hugging Face on first use |
| `qwen3` | mlx-audio, Qwen3-TTS 0.6B 8-bit | Apple Silicon, `[mlx]`, about 12 GB memory |
| `qwen3-1.7b` | mlx-audio, Qwen3-TTS 1.7B bf16 (~4.3 GB); takes `--style` | Apple Silicon, `[mlx]`, about 24 GB memory. **Default engine on the M5 Pro**; skipped by default on a 16 GB Air |
| `qwen3-designed` | mlx-audio, Qwen3-TTS 1.7B Base cloning a voice made by `lantern-narrate design` (VoiceDesign) | Apple Silicon, `[mlx]`, about 24 GB; ~9 GB of downloads. Clones only Lantern-designed voices |
| `fake` | test tone | nothing (tests and dry runs) |

Ctrl-C stops after the current sentence; rerun the same command to resume.

Tests: `pip install -e '.[dev]' && pytest` (they use the `fake` engine, so no model download).

Everything (models, Hugging Face downloads, jobs, packages, benchmark runs) lives in one folder, `~/.lantern-narrator/` (`LANTERN_NARRATOR_HOME`). The narrator points `HF_HOME` and `TORCH_HOME` inside it unless you set them yourself. Delete the folder, or use `lantern-narrate clean`, to remove it all. Model weights, job folders and generated audio must never be committed.

Hardware targets: the main machine is a MacBook Pro M5 Pro with 48 GB; a MacBook Air M2 with 16 GB stays supported. `doctor` reports the tier and what fits. Without `--engine`, `generate` uses the book's saved choice, else `qwen3-1.7b` on Apple Silicon with 24 GB or more, else `kokoro`.
