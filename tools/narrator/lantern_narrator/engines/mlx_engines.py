"""Apple Silicon engines through mlx-audio (macOS arm64 only).

* kokoro-mlx  — Kokoro-82M on MLX. Same Apache-2.0 weights as the ONNX engine,
  usually faster on M-series GPUs.
* qwen3       — Qwen3-TTS 12Hz 0.6B CustomVoice (Apache-2.0). Expressive, but
  heavier; evaluated, not the default. See docs/NARRATION.md for why.

Weights download from Hugging Face (mlx-community/*) on first use.
"""
from __future__ import annotations

import platform

import numpy as np

from .base import Engine, EngineInfo, EngineUnavailable, Voice, to_float32_mono
from .kokoro_onnx import VOICES as KOKORO_VOICES


def _require_mlx():
    if platform.system() != "Darwin" or platform.machine() != "arm64":
        raise EngineUnavailable("MLX engines need an Apple Silicon Mac (macOS arm64).")
    try:
        from mlx_audio.tts.utils import load_model  # type: ignore
    except ImportError as e:
        raise EngineUnavailable("mlx-audio is not installed. Run: pip install -e 'tools/narrator[mlx]'") from e
    return load_model


def _collect(results) -> np.ndarray:
    parts = []
    for r in results:
        a = r.audio
        parts.append(to_float32_mono(np.array(a)))
    return np.concatenate(parts) if parts else np.zeros(0, dtype=np.float32)


class KokoroMlxEngine(Engine):
    id = "kokoro-mlx"
    label = "Kokoro-82M (MLX, Apple Silicon)"
    default_voice = "af_heart"

    def __init__(self, repo: str = "mlx-community/Kokoro-82M-bf16"):
        self.repo = repo
        self._model = None

    def load(self) -> None:
        load_model = _require_mlx()
        self._model = load_model(self.repo)

    def info(self) -> EngineInfo:
        return EngineInfo(self.id, self.label, self.repo, "mlx-audio", "MIT (mlx-audio)", "Apache-2.0",
                          int(getattr(self._model, "sample_rate", 24000) if self._model else 24000))

    def voices(self) -> list[Voice]:
        return list(KOKORO_VOICES)

    def synthesize(self, text: str, voice: str, speed: float = 1.0) -> np.ndarray:
        if self._model is None:
            self.load()
        voice = voice or self.default_voice
        lang = "b" if voice.startswith("b") else "a"
        return _collect(self._model.generate(text=text, voice=voice, speed=speed, lang_code=lang))


QWEN_VOICES = [
    Voice("Ryan", "Ryan (male, dynamic)", "en", "male", "Apache-2.0"),
    Voice("Aiden", "Aiden (male, sunny US)", "en", "male", "Apache-2.0"),
    Voice("Vivian", "Vivian (female)", "zh", "female", "Apache-2.0", "native Chinese speaker"),
    Voice("Serena", "Serena (female)", "zh", "female", "Apache-2.0", "native Chinese speaker"),
]


class Qwen3MlxEngine(Engine):
    id = "qwen3"
    label = "Qwen3-TTS 0.6B CustomVoice (MLX)"
    default_voice = "Ryan"

    def __init__(self, repo: str = "mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"):
        self.repo = repo
        self._model = None

    def load(self) -> None:
        load_model = _require_mlx()
        self._model = load_model(self.repo)

    def info(self) -> EngineInfo:
        return EngineInfo(self.id, self.label, self.repo, "mlx-audio", "MIT (mlx-audio)", "Apache-2.0",
                          int(getattr(self._model, "sample_rate", 24000) if self._model else 24000))

    def voices(self) -> list[Voice]:
        return list(QWEN_VOICES)

    def synthesize(self, text: str, voice: str, speed: float = 1.0) -> np.ndarray:
        if self._model is None:
            self.load()
        gen = getattr(self._model, "generate_custom_voice", None)
        if gen is not None:
            results = gen(text=text, speaker=voice or self.default_voice, language="English")
        else:
            results = self._model.generate(text, voice=voice or self.default_voice, lang_code="English")
        return _collect(results)
