"""Kyutai Pocket TTS (100M, CPU). Lantern's fallback engine.

Library: pocket-tts (MIT). Weights download from Hugging Face on first use
(kyutai/pocket-tts). Each preset voice has its own licence, listed at
huggingface.co/kyutai/tts-voices; prefer the VCTK-derived voices (CC-BY-4.0).
Voice cloning is supported upstream but deliberately not exposed here.
"""
from __future__ import annotations

import numpy as np

from .base import Engine, EngineInfo, EngineUnavailable, Voice, to_float32_mono

_CC_BY = "CC-BY-4.0 (VCTK)"
_CHECK = "see huggingface.co/kyutai/tts-voices"
VOICES = [
    Voice("alba", "Alba (female)", "en", "female", _CHECK, "upstream default"),
    Voice("anna", "Anna (female)", "en", "female", _CC_BY),
    Voice("vera", "Vera (female)", "en", "female", _CC_BY),
    Voice("jane", "Jane (female)", "en", "female", _CC_BY),
    Voice("fantine", "Fantine (female)", "en", "female", _CC_BY),
    Voice("eve", "Eve (female)", "en", "female", _CC_BY),
    Voice("charles", "Charles (male)", "en", "male", _CC_BY),
    Voice("george", "George (male)", "en", "male", _CC_BY),
    Voice("paul", "Paul (male)", "en", "male", _CC_BY),
    Voice("marius", "Marius (male)", "en", "male", _CHECK),
    Voice("javert", "Javert (male)", "en", "male", _CHECK),
]


class PocketEngine(Engine):
    id = "pocket"
    label = "Pocket TTS (Kyutai, CPU)"
    default_voice = "alba"

    def __init__(self):
        self.language = "english"
        self._model = None
        self._states: dict[str, object] = {}

    def load(self) -> None:
        try:
            from pocket_tts import TTSModel  # type: ignore
        except ImportError as e:
            raise EngineUnavailable("pocket-tts is not installed. Run: pip install -e 'tools/narrator[pocket]'") from e
        try:
            self._model = TTSModel.load_model()
        except Exception as e:  # network / HF errors
            raise EngineUnavailable(f"Could not load Pocket TTS weights from Hugging Face: {e}") from e

    def info(self) -> EngineInfo:
        try:
            from importlib.metadata import version
            lib_version = version("pocket-tts")
        except Exception:
            lib_version = "unknown"
        sr = getattr(self._model, "sample_rate", 24000) if self._model else 24000
        return EngineInfo(
            id=self.id, label=self.label, model=f"kyutai/pocket-tts ({self.language})",
            version=f"pocket-tts {lib_version}", license_code="MIT",
            license_weights="CC-BY-4.0 (model); per-voice licences vary", sample_rate=int(sr),
        )

    def voices(self) -> list[Voice]:
        return list(VOICES)

    def synthesize(self, text: str, voice: str, speed: float = 1.0) -> np.ndarray:
        if self._model is None:
            self.load()
        voice = voice or self.default_voice
        if voice not in self._states:
            self._states[voice] = self._model.get_state_for_audio_prompt(voice)
        # Pocket TTS has no native rate control; `speed` is left to the player.
        return to_float32_mono(self._model.generate_audio(self._states[voice], text))

    def close(self) -> None:
        self._model = None
        self._states.clear()
