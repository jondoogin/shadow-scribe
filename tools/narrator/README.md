# lantern-narrator

`lantern-narrate` generates audiobook narration for Lantern **locally** from an EPUB, using open neural TTS models. It writes a portable `.lantern-audio` package that you import in Lantern's Listen page.

The full guide (evaluation, iPhone transfer, formats, privacy) is in [`docs/NARRATION.md`](../../docs/NARRATION.md).

```bash
cd tools/narrator
python3 -m venv .venv && source .venv/bin/activate
pip install -e '.[kokoro]'            # extras: kokoro, mlx (Apple Silicon), pocket, dev
(cd ../.. && npm install)             # EPUB parsing uses Lantern's own JS parser via Node

lantern-narrate doctor                # what this machine can run
lantern-narrate download kokoro       # ~340 MB (or --int8 for ~115 MB)
lantern-narrate generate book.epub --engine kokoro --voice af_heart
lantern-narrate benchmark             # compare engines on a public-domain passage
```

| Engine id | Backend | Needs |
|---|---|---|
| `kokoro` / `kokoro-int8` | kokoro-onnx (ONNX Runtime, CPU) | `[kokoro]` + `download kokoro` |
| `kokoro-mlx` | mlx-audio | Apple Silicon, `[mlx]` |
| `pocket` | pocket-tts (PyTorch CPU) | `[pocket]`; weights from Hugging Face on first use |
| `qwen3` | mlx-audio, Qwen3-TTS 0.6B 8-bit | Apple Silicon, `[mlx]` |
| `fake` | test tone | nothing (tests and dry runs) |

Ctrl-C stops after the current sentence; rerun the same command to resume.

Tests: `pip install -e '.[dev]' && pytest` (they use the `fake` engine, so no model download).

Data lives in `~/.lantern-narrator/` (`LANTERN_NARRATOR_HOME`). Model weights, job folders and generated audio must never be committed.
