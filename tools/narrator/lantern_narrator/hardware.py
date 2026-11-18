"""Report the machine the narrator is running on (`lantern-narrate doctor`)."""
from __future__ import annotations

import importlib.util
import os
import platform
import shutil
import subprocess
from pathlib import Path

from .paths import home, is_inside_home


def _sysctl(name: str) -> str | None:
    try:
        return subprocess.run(["sysctl", "-n", name], capture_output=True, text=True, timeout=5).stdout.strip() or None
    except Exception:
        return None


def _mem_bytes() -> int | None:
    if platform.system() == "Darwin":
        v = _sysctl("hw.memsize")
        return int(v) if v and v.isdigit() else None
    try:
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
    except Exception:
        return None


def _cpu_name() -> str:
    if platform.system() == "Darwin":
        return _sysctl("machdep.cpu.brand_string") or platform.processor()
    try:
        with open("/proc/cpuinfo") as f:
            for line in f:
                if line.startswith("model name"):
                    return line.split(":", 1)[1].strip()
    except Exception:
        pass
    return platform.processor() or "unknown"


def _model_name() -> str | None:
    if platform.system() != "Darwin":
        return None
    try:
        out = subprocess.run(["system_profiler", "SPHardwareDataType"], capture_output=True, text=True, timeout=20).stdout
        for line in out.splitlines():
            if "Model Name" in line or "Model Identifier" in line:
                return line.split(":", 1)[1].strip()
    except Exception:
        pass
    return None


def report() -> dict:
    disk = shutil.disk_usage(str(home().parent if home().parent.exists() else "/"))
    mem = _mem_bytes()
    perf = _sysctl("hw.perflevel0.physicalcpu") if platform.system() == "Darwin" else None
    eff = _sysctl("hw.perflevel1.physicalcpu") if platform.system() == "Darwin" else None
    return {
        "os": f"{platform.system()} {platform.release()}",
        "macos": platform.mac_ver()[0] or None,
        "machine": platform.machine(),
        "model": _model_name(),
        "cpu": _cpu_name(),
        "cpu_cores": os.cpu_count(),
        "performance_cores": int(perf) if perf and perf.isdigit() else None,
        "efficiency_cores": int(eff) if eff and eff.isdigit() else None,
        "memory_gb": round(mem / 1024 ** 3, 1) if mem else None,
        "disk_free_gb": round(disk.free / 1024 ** 3, 1),
        "python": platform.python_version(),
        "apple_silicon": platform.system() == "Darwin" and platform.machine() == "arm64",
        "tools": {t: bool(shutil.which(t)) for t in ("afconvert", "ffmpeg", "node", "espeak-ng")},
        "packages": {p: importlib.util.find_spec(p) is not None
                     for p in ("kokoro_onnx", "onnxruntime", "pocket_tts", "mlx_audio", "torch")},
        "narrator_home": str(home()),
        "shared_caches": {v: os.environ[v] for v in ("HF_HOME", "TORCH_HOME")
                          if os.environ.get(v) and not is_inside_home(Path(os.environ[v]))},
    }


# Hardware tiers the narrator is tuned for (see docs/NARRATION.md, "Hardware targets").
TIER_SMALL = 12   # below: Kokoro / Pocket only
TIER_LARGE = 24   # at or above: Qwen3 1.7B is worth testing (e.g. M5 Pro 48 GB)


def tier(r: dict) -> str:
    mem = r.get("memory_gb") or 0
    if mem and mem < TIER_SMALL:
        return "small"
    if mem and mem < TIER_LARGE:
        return "standard"   # e.g. M2 Air 16 GB
    return "large"           # e.g. M5 Pro 48 GB (also used when memory is unknown)


def default_engine(r: dict) -> str:
    """Engine `generate` and `audition` use when neither --engine nor a remembered
    per-book choice says otherwise. Qwen3 1.7B on an Apple Silicon Mac with 24 GB
    or more (John's M5 Pro, chosen by ear in Session 164); Kokoro everywhere else."""
    return "qwen3-1.7b" if r.get("apple_silicon") and tier(r) == "large" else "kokoro"


def recommend(r: dict) -> list[str]:
    tips = []
    mem = r.get("memory_gb") or 0
    t = tier(r)
    if r["apple_silicon"] and t != "large":
        tips.append("Apple Silicon detected: 'kokoro' (ONNX/CPU) is the default; the benchmark also runs "
                    "'kokoro-mlx' (GPU). Keep whichever is faster.")
    if t == "small":
        tips.append(f"{mem:g} GB memory: use kokoro or pocket; qwen3 is skipped.")
    elif t == "standard":
        tips.append(f"{mem:g} GB memory: qwen3 0.6B fits but will be several times slower than Kokoro for a "
                    "whole novel; qwen3-1.7b is skipped by default.")
    elif mem:
        if r["apple_silicon"]:
            tips.append(f"{mem:g} GB memory: the default engine is qwen3-1.7b (~4.3 GB download, about 2.5x "
                        "realtime on an M5 Pro, so a 10-hour book takes about 4 hours). Run `lantern-narrate "
                        "audition book.epub` to hear every voice read that book's opening, then pick one with "
                        "--voice; the choice is remembered for that book. Use --engine kokoro for speed.")
        else:
            tips.append(f"{mem:g} GB memory, but qwen3 needs Apple Silicon (MLX): kokoro stays the default.")
    if not r["tools"]["afconvert"] and not r["tools"]["ffmpeg"]:
        tips.append("No AAC encoder found (afconvert/ffmpeg). Chapters will be stored as large WAV files.")
    if not r["tools"]["node"]:
        tips.append("Node.js not found: needed to read EPUBs (run `npm install` in the repo).")
    free = r.get("disk_free_gb") or 0
    need = 15 if t == "large" else 5
    if free < need:
        tips.append(f"Less than {need} GB free disk: models take 0.3–6 GB and a 10-hour book needs ~300 MB of AAC "
                    "plus temporary WAVs per chapter.")
    tips.append(f"Everything the narrator downloads or writes is in {r['narrator_home']} "
                "(`lantern-narrate clean` shows and removes it).")
    for var, path in (r.get("shared_caches") or {}).items():
        tips.append(f"{var} is set to {path}, outside the narrator folder: model downloads go there and "
                    "`clean` will not remove them.")
    return tips
