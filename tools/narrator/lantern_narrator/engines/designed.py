"""Narrate with a voice designed in Lantern (see lantern_narrator/voice_design.py).

Qwen3-TTS 1.7B Base clones the kept reference clip for every sentence, which
keeps a designed voice consistent across a whole book. Only voices that pass
voice_design.load() (made by `lantern-narrate design`, unchanged since) are
accepted; there is deliberately no way to pass an arbitrary recording.
"""
from __future__ import annotations

import numpy as np

from .base import Engine, EngineInfo, EngineUnavailable, Voice


class DesignedVoiceEngine(Engine):
    id = "qwen3-designed"
    label = "Qwen3-TTS 1.7B, voice designed in Lantern (MLX)"
    repo = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16"

    def __init__(self, repo: str | None = None, backend=None):
        if repo:
            self.repo = repo
        self._model = None
        self._backend = backend  # tests inject a fake: backend(text, ref_path, ref_text) -> pcm
        self._voices: dict = {}

    @property
    def default_voice(self) -> str:  # type: ignore[override]
        ready = [v for v in self.voices()]
        return ready[0].id if ready else ""

    def load(self) -> None:
        if self._backend is not None or self._model is not None:
            return
        from .mlx_engines import _require_mlx
        self._model = _require_mlx()(self.repo)

    def info(self) -> EngineInfo:
        sr = int(getattr(self._model, "sample_rate", 24000) if self._model else 24000)
        return EngineInfo(self.id, self.label, self.repo, "mlx-audio", "MIT (mlx-audio)", "Apache-2.0", sr)

    def voices(self) -> list[Voice]:
        from ..voice_design import list_all
        return [Voice(r["name"], r["name"], "en", None, "designed in Lantern", r["description"])
                for r in list_all() if r["status"] == "ready"]

    def _voice(self, name: str):
        from ..voice_design import VoiceError, load
        if not name:
            raise EngineUnavailable("No designed voice chosen. Create one with `lantern-narrate design`, "
                                    "then pass --voice <name>.")
        if name not in self._voices:
            try:
                self._voices[name] = load(name)
            except VoiceError as e:
                raise EngineUnavailable(str(e)) from e
        return self._voices[name]

    def voice_cache_key(self, voice: str) -> str:
        return self._voice(voice).cache_key

    def voice_info(self, voice: str) -> dict | None:
        v = self._voice(voice)
        return {"designed": True, "description": v.description, "referenceSha256": v.reference_sha256}

    def synthesize(self, text: str, voice: str, speed: float = 1.0) -> np.ndarray:
        v = self._voice(voice)
        if self._backend is not None:
            return self._backend(text, str(v.reference), v.reference_text)
        if self._model is None:
            self.load()
        from .mlx_engines import _collect
        return _collect(self._model.generate(text=text, ref_audio=str(v.reference), ref_text=v.reference_text,
                                             lang_code="english"))
