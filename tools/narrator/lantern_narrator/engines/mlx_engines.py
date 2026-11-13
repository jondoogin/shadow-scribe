"""Apple Silicon engines through mlx-audio (macOS arm64 only).

* kokoro-mlx  — Kokoro-82M on MLX. Same Apache-2.0 weights as the ONNX engine,
  usually faster on M-series GPUs.
* qwen3       — Qwen3-TTS 12Hz 0.6B CustomVoice, 8-bit (Apache-2.0). Expressive,
  but heavier than Kokoro; evaluated, not the default.
* qwen3-1.7b  — Qwen3-TTS 12Hz 1.7B CustomVoice, bf16 (~4.5 GB download). Meant
  for 32 GB+ Macs (e.g. M5 Pro 48 GB); skipped by default on 16 GB machines.
  See docs/NARRATION.md.

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


# The nine built-in CustomVoice speakers (Qwen3-TTS README). Every speaker can
# speak English; only Ryan and Aiden are native English speakers, so the others
# carry an accent. Descriptions are Qwen's own, not our judgement.
QWEN_VOICES = [
    Voice("Ryan", "Ryan (male)", "en", "male", "Apache-2.0", "dynamic, strong rhythmic drive; native English"),
    Voice("Aiden", "Aiden (male)", "en", "male", "Apache-2.0", "sunny American, clear midrange; native English"),
    Voice("Serena", "Serena (female)", "zh", "female", "Apache-2.0", "warm, gentle, young; native Chinese"),
    Voice("Vivian", "Vivian (female)", "zh", "female", "Apache-2.0", "bright, slightly edgy, young; native Chinese"),
    Voice("Sohee", "Sohee (female)", "ko", "female", "Apache-2.0", "warm, rich emotion; native Korean"),
    Voice("Ono_Anna", "Ono Anna (female)", "ja", "female", "Apache-2.0", "playful, light; native Japanese"),
    Voice("Uncle_Fu", "Uncle Fu (male)", "zh", "male", "Apache-2.0", "seasoned, low, mellow; native Chinese"),
    Voice("Dylan", "Dylan (male)", "zh", "male", "Apache-2.0", "youthful, clear; native Beijing Chinese"),
    Voice("Eric", "Eric (male)", "zh", "male", "Apache-2.0", "lively, slightly husky; native Sichuan Chinese"),
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
            kwargs = {"text": text, "speaker": voice or self.default_voice, "language": "English"}
            if self.style:
                kwargs["instruct"] = self.style
            try:
                results = gen(**kwargs)
            except TypeError as e:
                if "instruct" in kwargs:
                    raise EngineUnavailable(
                        "This mlx-audio version does not accept a style instruction for Qwen3-TTS. "
                        "Upgrade mlx-audio or drop --style.") from e
                raise
        else:
            results = self._model.generate(text, voice=voice or self.default_voice, lang_code="English")
        return _collect(results)


class Qwen3LargeMlxEngine(Qwen3MlxEngine):
    id = "qwen3-1.7b"
    label = "Qwen3-TTS 1.7B CustomVoice (MLX, bf16)"
    supports_style = True  # Qwen: only the 1.7B CustomVoice model takes instructions

    def __init__(self, repo: str = "mlx-community/Qwen3-TTS-12Hz-1.7B-CustomVoice-bf16"):
        super().__init__(repo)
