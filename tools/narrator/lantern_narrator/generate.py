"""Chapter-level audiobook generation with segment-level resume.

Layout of a job directory (one per book × engine × voice × speed):

    job.json                 state, written atomically after every change
    seg/<section>/<key>.npy  cached PCM for finished segments (deleted once the
                             chapter file is encoded)
    audio/<NNN>-<id>.m4a     finished chapters (written via temp file + rename)

Interrupting (Ctrl-C) finishes the current segment, saves state and exits.
Re-running the same command resumes. Nothing half-written is ever renamed
into place, so a crash cannot leave a corrupt chapter that looks complete.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import signal
import tempfile
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np

from . import audio as A
from .engines import Engine
from .paths import jobs_dir
from .script import narrated_sections, segment_key

GENERATOR_VERSION = "1.0.0"
SECTION_LEAD_IN_MS = 350
SECTION_TAIL_MS = 900
DEFAULT_PAUSES = {"sentence": 260, "paragraph": 650, "heading": 1000}
MAX_ATTEMPTS = 3


class GenerationInterrupted(Exception):
    pass


class SegmentFailed(RuntimeError):
    def __init__(self, section_id: str, segment_id: str, cause: Exception):
        super().__init__(f"Segment {segment_id} in section {section_id} failed after {MAX_ATTEMPTS} attempts: {cause}")
        self.section_id = section_id
        self.segment_id = segment_id


@dataclass
class Progress:
    section_index: int
    section_count: int
    section_title: str
    segment_index: int
    segment_count: int
    audio_seconds: float
    compute_seconds: float
    remaining_chars: int
    chars_per_second: float

    @property
    def realtime_factor(self) -> float:
        return self.audio_seconds / self.compute_seconds if self.compute_seconds > 0 else 0.0

    @property
    def eta_seconds(self) -> float | None:
        return self.remaining_chars / self.chars_per_second if self.chars_per_second > 0 else None


def slug(s: str, n: int = 40) -> str:
    s = re.sub(r"[^A-Za-z0-9]+", "-", s).strip("-").lower()
    return s[:n] or "book"


def job_dir_for(content_id: str, engine_id: str, voice: str, speed: float) -> Path:
    cid = content_id.split(":")[-1][:16]
    return jobs_dir() / f"{cid}__{engine_id}__{slug(voice, 24)}__{speed:.2f}"


def _write_json_atomic(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(suffix=".json", dir=path.parent)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def _save_npy_atomic(path: Path, x: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".partial.npy")
    np.save(tmp, x)
    os.replace(tmp, path)


def pause_after(seg: dict) -> int:
    if isinstance(seg.get("pauseAfterMs"), (int, float)):
        return int(seg["pauseAfterMs"])
    return DEFAULT_PAUSES.get(seg.get("kind", "sentence"), DEFAULT_PAUSES["sentence"])


class StopFlag:
    """Cooperative cancellation. SIGINT sets it; a second SIGINT aborts immediately."""

    def __init__(self):
        self._event = threading.Event()
        self._prev = None

    def set(self):
        self._event.set()

    def is_set(self) -> bool:
        return self._event.is_set()

    def install(self):
        def handler(signum, frame):
            if self._event.is_set():
                raise KeyboardInterrupt
            self._event.set()
            print("\n⏸  Stopping after the current sentence… (Ctrl-C again to abort now)", flush=True)
        try:
            self._prev = signal.signal(signal.SIGINT, handler)
        except ValueError:  # not main thread
            self._prev = None
        return self

    def uninstall(self):
        if self._prev is not None:
            signal.signal(signal.SIGINT, self._prev)


class Generator:
    def __init__(self, script: dict, engine: Engine, voice: str, speed: float = 1.0,
                 job_dir: Path | None = None, bitrate: int = 64000,
                 on_progress: Callable[[Progress], None] | None = None,
                 stop: StopFlag | None = None, selection: str | None = None):
        self.script = script
        self.engine = engine
        self.voice = voice or engine.default_voice
        self.speed = speed
        self.bitrate = bitrate
        self.on_progress = on_progress
        self.stop = stop or StopFlag()
        self.selection = selection
        book = script["book"]
        self.job_dir = Path(job_dir) if job_dir else job_dir_for(book["contentId"], engine.id, self.voice, speed)
        self.state_path = self.job_dir / "job.json"
        self.state = self._load_state()
        self._compute = 0.0
        self._audio = 0.0
        self._chars_done = 0

    # ── state ────────────────────────────────────────────────────────────────
    def _load_state(self) -> dict:
        if self.state_path.exists():
            try:
                st = json.loads(self.state_path.read_text(encoding="utf-8"))
                if st.get("contentId") == self.script["book"]["contentId"]:
                    return st
            except json.JSONDecodeError:
                pass  # corrupt state: start fresh; cached segments are still reused by key
        return {"contentId": self.script["book"]["contentId"], "sections": {}, "createdAt": _now()}

    def _save_state(self) -> None:
        self.state["updatedAt"] = _now()
        _write_json_atomic(self.state_path, self.state)

    # ── fingerprints ─────────────────────────────────────────────────────────
    def engine_fingerprint(self) -> str:
        i = self.engine.info()
        return f"{i.id}|{i.model}|{i.version}"

    def section_hash(self, section: dict) -> str:
        fp = self.engine_fingerprint()
        h = hashlib.sha1(f"{GENERATOR_VERSION}|{self.bitrate}".encode())
        for seg in section["segments"]:
            h.update(segment_key(fp, self.voice, self.speed, _spoken(seg)).encode())
            h.update(str(pause_after(seg)).encode())
        return h.hexdigest()[:20]

    def section_is_current(self, section: dict) -> bool:
        st = self.state["sections"].get(section["id"])
        if not st or st.get("status") != "done":
            return False
        f = self.job_dir / st.get("file", "")
        return f.exists() and st.get("hash") == self.section_hash(section)

    # ── main loop ────────────────────────────────────────────────────────────
    def run(self) -> dict:
        self.engine.load()
        self.state["engine"] = _info_dict(self.engine.info())
        self.state["voice"] = self.voice
        self.state["speed"] = self.speed
        sections = narrated_sections(self.script, self.selection)
        pending = [s for s in sections if not self.section_is_current(s)]
        total_chars = sum(len(_spoken(seg)) for s in pending for seg in s["segments"])
        self._remaining = total_chars
        self._save_state()
        for idx, section in enumerate(sections, start=1):
            if self.section_is_current(section):
                continue
            self._generate_section(section, idx, len(sections))
        return self.state

    def _generate_section(self, section: dict, idx: int, count: int) -> None:
        sr = self.engine.info().sample_rate
        fp = self.engine_fingerprint()
        seg_dir = self.job_dir / "seg" / section["id"]
        pieces: list[np.ndarray] = []
        segments = section["segments"]
        self.state["sections"][section["id"]] = {"status": "partial", "hash": self.section_hash(section)}
        self._save_state()

        for n, seg in enumerate(segments):
            if self.stop.is_set():
                self._save_state()
                raise GenerationInterrupted()
            spoken = _spoken(seg)
            key = segment_key(fp, self.voice, self.speed, spoken)
            cache = seg_dir / f"{key}.npy"
            if cache.exists():
                try:
                    pcm = np.load(cache)
                except Exception:
                    cache.unlink(missing_ok=True)
                    pcm = None
            else:
                pcm = None
            if pcm is None:
                pcm = self._synthesize_with_retry(section["id"], seg, spoken)
                _save_npy_atomic(cache, pcm)
            pieces.append(pcm)
            self._remaining -= len(spoken)
            if self.on_progress:
                cps = self._chars_done / self._compute if self._compute else 0.0
                self.on_progress(Progress(idx, count, section.get("title") or section["id"], n + 1, len(segments),
                                          self._audio, self._compute, max(self._remaining, 0), cps))

        timings, pcm = assemble(segments, pieces, sr)
        pcm, gain_db = A.normalize(pcm, sr)
        out_name = f"{int(section.get('order', idx)):03d}-{slug(section['id'], 30)}.m4a"
        wav_tmp = self.job_dir / "tmp" / (out_name + ".wav")
        A.write_wav_atomic(wav_tmp, pcm, sr)
        final = A.encode_aac(wav_tmp, self.job_dir / "audio" / out_name, self.bitrate)
        wav_tmp.unlink(missing_ok=True)
        self.state["sections"][section["id"]] = {
            "status": "done",
            "hash": self.section_hash(section),
            "file": str(final.relative_to(self.job_dir)),
            "mime": A.mime_for(final),
            "bytes": final.stat().st_size,
            "durationSec": round(len(pcm) / sr, 3),
            "gainDb": round(gain_db, 2),
            "segments": timings,
            "completedAt": _now(),
        }
        self._save_state()
        # Segment cache is only needed until the chapter exists.
        for f in seg_dir.glob("*.npy"):
            f.unlink(missing_ok=True)
        try:
            seg_dir.rmdir()
        except OSError:
            pass

    def _synthesize_with_retry(self, section_id: str, seg: dict, spoken: str) -> np.ndarray:
        last: Exception | None = None
        for attempt in range(MAX_ATTEMPTS):
            try:
                t = time.perf_counter()
                pcm = self.engine.synthesize(spoken, self.voice, self.speed)
                dt = time.perf_counter() - t
                if pcm is None or len(pcm) == 0 or not np.isfinite(pcm).all():
                    raise RuntimeError("engine returned empty or non-finite audio")
                self._compute += dt
                self._audio += len(pcm) / self.engine.info().sample_rate
                self._chars_done += len(spoken)
                return pcm
            except Exception as e:  # noqa: BLE001 — any engine failure is retried, then surfaced
                last = e
                time.sleep(0.5 * (attempt + 1))
        raise SegmentFailed(section_id, seg.get("id", "?"), last or RuntimeError("unknown"))


def assemble(segments: list[dict], pieces: list[np.ndarray], sr: int) -> tuple[list[dict], np.ndarray]:
    """Trim each segment, join with deterministic pauses, return timings in seconds."""
    out = [A.silence(sr, SECTION_LEAD_IN_MS)]
    cursor = len(out[0])
    timings = []
    for seg, pcm in zip(segments, pieces):
        x = A.apply_fades(A.trim_silence(pcm, sr), sr)
        t0 = cursor / sr
        out.append(x)
        cursor += len(x)
        timings.append({"id": seg["id"], "blockId": seg.get("blockId"), "t0": round(t0, 3), "t1": round(cursor / sr, 3)})
        gap = A.silence(sr, pause_after(seg))
        out.append(gap)
        cursor += len(gap)
    out.append(A.silence(sr, SECTION_TAIL_MS))
    return timings, np.concatenate(out).astype(np.float32)


def _spoken(seg: dict) -> str:
    return (seg.get("spoken") or seg.get("text") or "").strip()


def _info_dict(info) -> dict:
    return {k: getattr(info, k) for k in ("id", "label", "model", "version", "license_code", "license_weights", "sample_rate")}


def _now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
