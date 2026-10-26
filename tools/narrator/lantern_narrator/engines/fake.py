"""Deterministic tone engine for tests and dry runs. No model, no download."""
from __future__ import annotations

import zlib

import numpy as np

from .base import Engine, EngineInfo, Voice


class FakeEngine(Engine):
    id = "fake"
    label = "Test tone (no model)"
    default_voice = "tone"

    def __init__(self, sample_rate: int = 24000, chars_per_second: float = 15.0, fail_on: str | None = None):
        self.sample_rate = sample_rate
        self.cps = chars_per_second
        self.fail_on = fail_on
        self.calls = 0

    def load(self) -> None:
        pass

    def info(self) -> EngineInfo:
        return EngineInfo(self.id, self.label, "sine", "1", "n/a", "n/a", self.sample_rate)

    def voices(self) -> list[Voice]:
        return [Voice("tone", "Tone", "en")]

    def synthesize(self, text: str, voice: str, speed: float = 1.0) -> np.ndarray:
        self.calls += 1
        if self.fail_on and self.fail_on in text:
            raise RuntimeError(f"fake failure on {self.fail_on!r}")
        seconds = max(0.2, len(text) / self.cps / max(speed, 0.1))
        n = int(seconds * self.sample_rate)
        t = np.arange(n, dtype=np.float32) / self.sample_rate
        tone = 0.2 * np.sin(2 * np.pi * (180 + (zlib.crc32(text.encode()) % 60)) * t)
        pad = np.zeros(int(0.08 * self.sample_rate), dtype=np.float32)  # silence the trimmer should remove
        return np.concatenate([pad, tone.astype(np.float32), pad])
