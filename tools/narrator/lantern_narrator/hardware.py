"""Report the machine the narrator is running on (`lantern-narrate doctor`)."""
from __future__ import annotations

import importlib.util
import os
import platform
import shutil
import subprocess

from .paths import home


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
    }


def recommend(r: dict) -> list[str]:
    tips = []
    mem = r.get("memory_gb") or 0
    if r["apple_silicon"]:
        tips.append("Apple Silicon detected: 'kokoro' (ONNX/CPU) is the default; try 'kokoro-mlx' too and keep the faster one.")
    if mem and mem < 12:
        tips.append("Under 12 GB RAM: avoid qwen3; use kokoro or pocket.")
    elif mem and mem <= 16:
        tips.append("16 GB RAM: qwen3 0.6B 8-bit fits, but expect it to be several times slower than Kokoro for a full novel.")
    if not r["tools"]["afconvert"] and not r["tools"]["ffmpeg"]:
        tips.append("No AAC encoder found (afconvert/ffmpeg). Chapters will be stored as large WAV files.")
    if not r["tools"]["node"]:
        tips.append("Node.js not found: needed to read EPUBs (run `npm install` in the repo).")
    if (r.get("disk_free_gb") or 0) < 5:
        tips.append("Less than 5 GB free disk: a 10-hour book needs ~300 MB of AAC plus temporary WAVs per chapter.")
    return tips
