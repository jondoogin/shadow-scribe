"""What the narrator has stored on disk, and removing it (`lantern-narrate clean`)."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from .paths import (benchmarks_dir, home, hf_cache_dir, is_inside_home, jobs_dir, models_dir,
                    output_dir, torch_cache_dir)

# category -> (description, folders)
CATEGORIES = {
    "models": "model weights and download caches (re-downloaded on next use)",
    "jobs": "resumable job folders: sentence cache and chapter audio (interrupted books restart)",
    "output": "finished .lantern-audio / .m4b packages",
    "benchmarks": "benchmark runs and samples",
}


def _folders(category: str) -> list[Path]:
    if category == "models":
        dirs = [models_dir(), hf_cache_dir(), torch_cache_dir()]
        # A user-exported HF_HOME/TORCH_HOME inside the narrator folder is ours too.
        for var in ("HF_HOME", "TORCH_HOME"):
            v = os.environ.get(var)
            if v and is_inside_home(Path(v)) and Path(v) not in dirs:
                dirs.append(Path(v))
        return dirs
    return {"jobs": [jobs_dir()], "output": [output_dir()], "benchmarks": [benchmarks_dir()]}[category]


def dir_bytes(p: Path) -> int:
    if not p.exists():
        return 0
    if p.is_file():
        return p.stat().st_size
    total = 0
    for root, _dirs, files in os.walk(p):
        for f in files:
            try:
                total += os.lstat(os.path.join(root, f)).st_size
            except OSError:
                pass
    return total


def usage() -> dict:
    """Bytes per category, plus caches outside the narrator folder that we use but never delete."""
    cats = {c: {"bytes": sum(dir_bytes(d) for d in _folders(c)), "folders": [str(d) for d in _folders(c)],
                "about": CATEGORIES[c]} for c in CATEGORIES}
    shared = {}
    for var in ("HF_HOME", "TORCH_HOME"):
        v = os.environ.get(var)
        if v and not is_inside_home(Path(v)):
            shared[var] = v
    return {"home": str(home()), "categories": cats, "sharedCaches": shared,
            "totalBytes": sum(c["bytes"] for c in cats.values())}


def clean(categories: list[str]) -> list[str]:
    """Delete the given categories. Only ever removes folders inside the narrator home."""
    root = home().resolve()
    if root in (Path("/").resolve(), Path.home().resolve()):
        raise RuntimeError(f"Refusing to clean: LANTERN_NARRATOR_HOME points at {root}.")
    removed = []
    for c in categories:
        if c not in CATEGORIES:
            raise ValueError(f"Unknown category '{c}'. Choose from: {', '.join(CATEGORIES)}")
        for d in _folders(c):
            if d.exists() and is_inside_home(d) and d.resolve() != root:
                shutil.rmtree(d)
                removed.append(str(d))
    return removed


def fmt_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} GB"
