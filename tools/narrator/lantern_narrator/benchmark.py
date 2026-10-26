"""Reproducible narration benchmark.

Every engine voices the *same* narration script (same segments, same pauses),
is trimmed/joined by the same code, and gets the same single loudness gain,
so the samples differ only by the model. Each engine × voice runs in its own
subprocess so peak-memory numbers are not polluted by the previous model.

Subjective quality (naturalness, prosody, pronunciation, consistency) is NOT
scored here; the report leaves those columns for a human listener.
"""
from __future__ import annotations

import json
import os
import platform
import resource
import subprocess
import sys
import time
from pathlib import Path

from . import audio as A
from .engines import EngineUnavailable, create_engine
from .generate import assemble, _spoken
from .hardware import report as hw_report
from .script import load_script, narrated_sections


def _peak_rss_mb() -> float:
    r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return round(r / (1024 * 1024) if platform.system() == "Darwin" else r / 1024, 1)


def _dir_size_mb(paths) -> float | None:
    total = 0
    found = False
    for p in paths:
        p = Path(p)
        if p.is_file():
            total += p.stat().st_size
            found = True
        elif p.is_dir():
            for f in p.rglob("*"):
                if f.is_file():
                    total += f.stat().st_size
                    found = True
    return round(total / 1024 ** 2, 1) if found else None


def _model_footprint(engine) -> float | None:
    hf = Path(os.environ.get("HF_HOME", Path.home() / ".cache" / "huggingface")) / "hub"
    if engine.id == "kokoro":
        return _dir_size_mb([engine.model_path, engine.voices_path])
    if engine.id == "pocket":
        return _dir_size_mb(hf.glob("models--kyutai--*"))
    repo = getattr(engine, "repo", None)
    if repo:
        return _dir_size_mb([hf / ("models--" + repo.replace("/", "--"))])
    return None


def bench_one(script_path: Path, engine_id: str, voice: str, out_dir: Path, speed: float = 1.0) -> dict:
    script = load_script(script_path)
    segments = [seg for s in narrated_sections(script) for seg in s["segments"]]
    engine = create_engine(engine_id)
    result = {"engine": engine_id, "voice": voice, "speed": speed, "ok": False}
    t = time.perf_counter()
    try:
        engine.load()
    except EngineUnavailable as e:
        result["error"] = str(e)
        return result
    result["loadSec"] = round(time.perf_counter() - t, 2)
    info = engine.info()
    sr = info.sample_rate
    pieces, seg_times = [], []
    t_all = time.perf_counter()
    for seg in segments:
        ts = time.perf_counter()
        pieces.append(engine.synthesize(_spoken(seg), voice, speed))
        seg_times.append(time.perf_counter() - ts)
    compute = time.perf_counter() - t_all
    timings, pcm = assemble(segments, pieces, sr)
    pcm, gain_db = A.normalize(pcm, sr)
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{engine_id}-{voice}".replace("/", "_")
    wav = out_dir / f"{stem}.wav"
    A.write_wav_atomic(wav, pcm, sr)
    m4a = A.encode_aac(wav, out_dir / f"{stem}.m4a")
    raw_speech = sum(len(p) for p in pieces) / sr
    peak_mlx = None
    try:  # unified-memory GPU allocations are not always in ru_maxrss
        import mlx.core as mx  # type: ignore
        peak_mlx = round(mx.get_peak_memory() / 1024 ** 2, 1)
    except Exception:
        pass
    result.update({
        "ok": True,
        "model": info.model,
        "engineVersion": info.version,
        "licenseCode": info.license_code,
        "licenseWeights": info.license_weights,
        "sampleRate": sr,
        "segments": len(segments),
        "chars": sum(len(_spoken(s)) for s in segments),
        "firstAudioSec": round(seg_times[0], 3) if seg_times else None,
        "computeSec": round(compute, 2),
        "speechSec": round(raw_speech, 2),
        "outputSec": round(len(pcm) / sr, 2),
        "realtimeFactor": round(raw_speech / compute, 2) if compute else None,
        "peakRssMb": _peak_rss_mb(),
        "peakMlxMb": peak_mlx,
        "modelDiskMb": _model_footprint(engine),
        "gainDb": round(gain_db, 2),
        "wav": wav.name,
        "m4a": m4a.name,
        "m4aKb": round(m4a.stat().st_size / 1024, 1),
    })
    return result


def run(script_path: Path, combos: list[tuple[str, str]], out_dir: Path, speed: float = 1.0) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for engine_id, voice in combos:
        print(f"▶ {engine_id} / {voice}", flush=True)
        proc = subprocess.run(
            [sys.executable, "-m", "lantern_narrator.cli", "_bench-one", str(script_path),
             "--engine", engine_id, "--voice", voice, "--speed", str(speed), "-o", str(out_dir)],
            capture_output=True, text=True,
        )
        try:
            r = json.loads(proc.stdout.strip().splitlines()[-1])
        except Exception:
            r = {"engine": engine_id, "voice": voice, "ok": False,
                 "error": (proc.stderr or proc.stdout).strip()[-800:]}
        results.append(r)
        print("  ", "ok" if r.get("ok") else f"skipped: {r.get('error', '')[:200]}", flush=True)
    report = {"hardware": hw_report(), "script": str(script_path), "speed": speed,
              "ranAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "results": results}
    (out_dir / "results.json").write_text(json.dumps(report, indent=1), encoding="utf-8")
    (out_dir / "RESULTS.md").write_text(markdown(report), encoding="utf-8")
    return report


def markdown(report: dict) -> str:
    hw = report["hardware"]
    lines = [
        "# Lantern narration benchmark",
        "",
        f"Run {report['ranAt']} on **{hw.get('model') or hw['cpu']}** ({hw['machine']}, "
        f"{hw.get('cpu_cores')} cores, {hw.get('memory_gb')} GB RAM, {hw['os']}).",
        "",
        "Same script, segmentation, pauses and loudness gain for every engine. "
        "*x realtime* = seconds of speech produced per second of compute (higher is faster).",
        "",
        "| Engine | Voice | Load s | First audio s | x realtime | Peak RSS MB | Model MB | Sample | Naturalness | Prosody | Pronunciation | Consistency |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for r in report["results"]:
        if not r.get("ok"):
            lines.append(f"| {r['engine']} | {r['voice']} | — | — | — | — | — | not run: {r.get('error', '')[:90]} | | | | |")
            continue
        mem = r["peakRssMb"] if not r.get("peakMlxMb") else f"{r['peakRssMb']} (+{r['peakMlxMb']} MLX)"
        lines.append(
            f"| {r['engine']} | {r['voice']} | {r['loadSec']} | {r['firstAudioSec']} | {r['realtimeFactor']} | "
            f"{mem} | {r.get('modelDiskMb') or '?'} | [{r['m4a']}]({r['m4a']}) | _listen_ | _listen_ | _listen_ | _listen_ |"
        )
    lines += ["", "Subjective columns are intentionally blank: fill them in after listening."]
    return "\n".join(lines) + "\n"
