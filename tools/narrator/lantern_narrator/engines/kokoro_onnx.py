"""Kokoro-82M through ONNX Runtime (CPU). The default Lantern engine.

Weights: Apache-2.0 (hexgrad/Kokoro-82M), ONNX export from the kokoro-onnx
GitHub releases. Library: kokoro-onnx (MIT). Phonemisation falls back to
espeak-ng (GPL-3.0) through phonemizer/espeakng-loader; that is fine for a
local tool, but it is a reason not to bundle this engine into the web app.
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np

from .base import Engine, EngineInfo, EngineUnavailable, Voice, to_float32_mono
from ..paths import models_dir

MODEL_RELEASE = "model-files-v1.0"
MODEL_FILES = {
    "fp32": "kokoro-v1.0.onnx",   # ~310 MB
    "int8": "kokoro-v1.0.int8.onnx",  # ~88 MB
}
VOICES_FILE = "voices-v1.0.bin"
RELEASE_URL = f"https://github.com/thewh1teagle/kokoro-onnx/releases/download/{MODEL_RELEASE}/"

# Curated English voices. Grades come from the upstream VOICES.md and are the
# model authors' own ratings, not Lantern measurements.
VOICES = [
    Voice("af_heart", "Heart (US, female)", "en-us", "female", notes="upstream grade A; default"),
    Voice("af_bella", "Bella (US, female)", "en-us", "female", notes="upstream grade A-"),
    Voice("af_nicole", "Nicole (US, female, soft)", "en-us", "female", notes="upstream grade B-"),
    Voice("af_sarah", "Sarah (US, female)", "en-us", "female", notes="upstream grade C+"),
    Voice("am_michael", "Michael (US, male)", "en-us", "male", notes="upstream grade C+"),
    Voice("am_fenrir", "Fenrir (US, male)", "en-us", "male", notes="upstream grade C+"),
    Voice("am_puck", "Puck (US, male)", "en-us", "male", notes="upstream grade C+"),
    Voice("bf_emma", "Emma (UK, female)", "en-gb", "female", notes="upstream grade B-"),
    Voice("bf_isabella", "Isabella (UK, female)", "en-gb", "female", notes="upstream grade C"),
    Voice("bm_george", "George (UK, male)", "en-gb", "male", notes="upstream grade C"),
    Voice("bm_fable", "Fable (UK, male)", "en-gb", "male", notes="upstream grade C"),
]
for _v in VOICES:
    _v.license = "Apache-2.0"


def default_model_paths(variant: str = "fp32") -> tuple[Path, Path]:
    base = Path(os.environ.get("LANTERN_KOKORO_DIR", models_dir() / "kokoro"))
    return base / MODEL_FILES[variant], base / VOICES_FILE


class KokoroOnnxEngine(Engine):
    id = "kokoro"
    label = "Kokoro-82M (ONNX, CPU)"
    default_voice = "af_heart"

    def __init__(self, variant: str = "fp32", model_path: str | None = None, voices_path: str | None = None):
        self.variant = variant
        mp, vp = default_model_paths(variant)
        self.model_path = Path(model_path) if model_path else mp
        self.voices_path = Path(voices_path) if voices_path else vp
        self._k = None

    def load(self) -> None:
        try:
            from kokoro_onnx import Kokoro  # type: ignore
        except ImportError as e:
            raise EngineUnavailable("kokoro-onnx is not installed. Run: pip install -e 'tools/narrator[kokoro]'") from e
        if not self.model_path.exists() or not self.voices_path.exists():
            raise EngineUnavailable(
                f"Kokoro weights not found at {self.model_path.parent}. Run: lantern-narrate download kokoro"
            )
        self._k = Kokoro(str(self.model_path), str(self.voices_path))

    def info(self) -> EngineInfo:
        try:
            from importlib.metadata import version
            lib_version = version("kokoro-onnx")
        except Exception:  # pragma: no cover
            lib_version = "unknown"
        return EngineInfo(
            id=self.id,
            label=self.label,
            model=f"Kokoro-82M v1.0 ({self.variant})",
            version=f"kokoro-onnx {lib_version}",
            license_code="MIT (kokoro-onnx); espeak-ng fallback is GPL-3.0",
            license_weights="Apache-2.0",
            sample_rate=24000,
        )

    def voices(self) -> list[Voice]:
        return list(VOICES)

    def _lang_for(self, voice: str) -> str:
        return "en-gb" if voice.startswith("b") else "en-us"

    def synthesize(self, text: str, voice: str, speed: float = 1.0) -> np.ndarray:
        if self._k is None:
            self.load()
        audio, _sr = self._k.create(text, voice=voice or self.default_voice, speed=speed, lang=self._lang_for(voice))
        return to_float32_mono(audio)

    def close(self) -> None:
        self._k = None
