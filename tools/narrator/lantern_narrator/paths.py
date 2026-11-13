"""Where the narrator keeps models, job state and output. All overridable by env.

Everything lives under one folder (default ``~/.lantern-narrator``) so it is
easy to find and to delete, which matters on a work machine:

    ~/.lantern-narrator/
      models/        Kokoro ONNX weights (lantern-narrate download)
      hf-cache/      Hugging Face downloads (Pocket TTS, MLX Kokoro, Qwen3)
      torch-cache/   PyTorch hub files, if any engine asks for them
      jobs/          per-book resumable job folders (sentence cache, chapter audio)
      output/        finished .lantern-audio / .m4b packages (default -o)
      benchmarks/    benchmark runs (default -o), one timestamped folder each

`lantern-narrate clean` shows and removes these.
"""
from __future__ import annotations

import os
from pathlib import Path


def home() -> Path:
    return Path(os.environ.get("LANTERN_NARRATOR_HOME", Path.home() / ".lantern-narrator")).expanduser()


def models_dir() -> Path:
    return home() / "models"


def jobs_dir() -> Path:
    return home() / "jobs"


def output_dir() -> Path:
    return home() / "output"


def benchmarks_dir() -> Path:
    return home() / "benchmarks"


def hf_cache_dir() -> Path:
    return home() / "hf-cache"


def torch_cache_dir() -> Path:
    return home() / "torch-cache"


def isolate_caches(env=None) -> dict:
    """Point Hugging Face / PyTorch downloads into the narrator folder.

    Without this, Pocket TTS and the MLX models would land in the shared
    ``~/.cache/huggingface``, mixed with anything else on the machine. A value
    the user already exported wins; it is then reported as a shared cache and
    `clean` leaves it alone.
    """
    env = os.environ if env is None else env
    env.setdefault("HF_HOME", str(hf_cache_dir()))
    env.setdefault("TORCH_HOME", str(torch_cache_dir()))
    return {"HF_HOME": env["HF_HOME"], "TORCH_HOME": env["TORCH_HOME"]}


def is_inside_home(p: Path) -> bool:
    try:
        Path(p).expanduser().resolve().relative_to(home().resolve())
        return True
    except ValueError:
        return False
