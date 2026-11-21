"""The short list (Session 170, decided for John).

Lantern offers a few voices and painting styles instead of every speaker an
engine ships with. Other voices still work with an explicit ``--voice`` or
``--voices``; they are just not offered by default.

Narrators
  * Aiden, Qwen3-TTS 1.7B, with the warm audiobook style. John picked Aiden by
    ear (Session 164); the warm style replaces plain Aiden.
  * Margaret, Walter, Niamh: voices designed in Lantern (``qwen3-designed``).
  * Kokoro ``af_heart`` and ``bm_george`` for Macs that can't fit Qwen3 1.7B.

Paintings
  * ``ink-and-gouache`` (default) and ``ink-and-wash``, both with the Qwen3 4B
    describer when mlx-lm is installed.
"""

from __future__ import annotations

import importlib.util

AIDEN_STYLE = "warm, unhurried audiobook narration"

# engine id → (voice, default style) in the order they are offered
CURATED_VOICES: dict[str, list[tuple[str, str]]] = {
    "qwen3-1.7b": [("Aiden", AIDEN_STYLE)],
    "qwen3-designed": [("Margaret", ""), ("Walter", ""), ("Niamh", "")],
    "kokoro": [("af_heart", ""), ("bm_george", "")],
    "kokoro-mlx": [("af_heart", ""), ("bm_george", "")],
}

PAINTING_STYLES = ["ink-and-gouache", "ink-and-wash"]
DEFAULT_PAINTING_STYLE = PAINTING_STYLES[0]


def curated_voices(engine_id: str, available: list[str]) -> list[str]:
    """The curated voices this engine actually has, else everything it has."""
    picks = [v for v, _ in CURATED_VOICES.get(engine_id, []) if v in available]
    return picks or list(available)


def default_style(engine_id: str, voice: str) -> str:
    for v, style in CURATED_VOICES.get(engine_id, []):
        if v == voice:
            return style
    return ""


def default_describer() -> str:
    """qwen3-4b when its runtime is installed, else the keyword describer."""
    return "qwen3-4b" if importlib.util.find_spec("mlx_lm") else "keywords"
