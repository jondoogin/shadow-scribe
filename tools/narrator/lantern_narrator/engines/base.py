"""Engine contract shared by every local TTS backend.

An engine turns one short piece of text into mono float32 PCM. Everything
else (segmentation, pauses, loudness, encoding, caching, packaging) lives
outside the engine so backends stay swappable.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


class EngineUnavailable(RuntimeError):
    """Raised when an engine's optional dependencies or weights are missing."""


@dataclass
class Voice:
    id: str
    label: str
    language: str = "en"
    gender: str | None = None
    license: str | None = None
    notes: str | None = None


@dataclass
class EngineInfo:
    id: str
    label: str
    model: str
    version: str
    license_code: str
    license_weights: str
    sample_rate: int
    extra: dict = field(default_factory=dict)


class Engine:
    """Base class. Subclasses implement load(), voices() and synthesize()."""

    id = "base"
    label = "Base engine"
    default_voice = ""

    def load(self) -> None:
        raise NotImplementedError

    def info(self) -> EngineInfo:
        raise NotImplementedError

    def voices(self) -> list[Voice]:
        raise NotImplementedError

    def synthesize(self, text: str, voice: str, speed: float = 1.0) -> np.ndarray:
        """Return mono float32 PCM in [-1, 1] at info().sample_rate."""
        raise NotImplementedError

    def close(self) -> None:
        pass


def to_float32_mono(audio) -> np.ndarray:
    """Normalise whatever a backend returns (torch, mx, list, int16) to float32 mono."""
    if hasattr(audio, "detach"):  # torch tensor
        audio = audio.detach().cpu().numpy()
    elif not isinstance(audio, np.ndarray):
        audio = np.asarray(audio)
    audio = np.squeeze(audio)
    if audio.ndim > 1:
        audio = audio.mean(axis=0 if audio.shape[0] < audio.shape[-1] else -1)
    if audio.dtype == np.int16:
        audio = audio.astype(np.float32) / 32768.0
    return audio.astype(np.float32, copy=False)
