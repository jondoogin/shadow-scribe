"""One style profile per book (docs/VISUAL_JOURNEY.md §4.2).

Made ONLY from the title, author and the first PROFILE_WORDS words of the
narrated text. A profile built from the whole book could leak its arc
("war-torn, ash-grey palette"), so later text is never read, even though the
whole book is on the Mac. `opening_text` enforces the cut.
"""
from __future__ import annotations

import hashlib
import re

from ..script import narrated_sections
from . import lexicon as L

PROFILE_WORDS = 2000
STYLE_VERSION = 1

# Painterly presets (John, 2026-11-16: painterly look, painterly animation).
# Warm, low saturation, visible brushwork: the paint-in follows real strokes.
PRESETS = {
    "gouache": {"medium": "soft gouache painting", "texture": "matte opaque brushwork, visible broad strokes, paper showing at the edges"},
    "watercolour": {"medium": "loose watercolour painting", "texture": "wet-in-wet washes, blooming edges, granulating pigment on cold-press paper"},
    "oil-sketch": {"medium": "plein-air oil sketch", "texture": "directional dry brushwork, thick impasto highlights, canvas grain"},
    "ink-and-wash": {"medium": "ink and wash drawing", "texture": "fine pen line over muted washes, sparse and airy"},
}
DEFAULT_PRESET = "gouache"


def opening_text(script: dict, limit: int = PROFILE_WORDS) -> str:
    """The first `limit` words of narrated prose, and nothing after them."""
    out: list[str] = []
    n = 0
    for sec in narrated_sections(script):
        for seg in sec["segments"]:
            if seg.get("kind") == "heading":
                continue
            ws = re.findall(r"\S+", seg.get("text") or "")
            take = ws[: max(0, limit - n)]
            out.extend(take)
            n += len(take)
            if n >= limit:
                return " ".join(out)
    return " ".join(out)


def build_profile(script: dict, preset: str = DEFAULT_PRESET, seed: int | None = None) -> dict:
    if preset not in PRESETS:
        raise ValueError(f"Unknown style preset {preset!r}. Choose one of: {', '.join(PRESETS)}.")
    book = script["book"]
    opening = opening_text(script)
    setting, _ = L.strongest(L.C_SETTINGS, opening)
    palette = L.PALETTES.get(setting) or (L.INTERIOR_PALETTE if setting in L.INTERIORS else ["umber", "sage", "slate blue", "cream"])
    if seed is None:
        seed = int(hashlib.sha256(f"{book['contentId']}\0{preset}".encode()).hexdigest()[:8], 16)
    era = _era(opening)
    p = PRESETS[preset]
    return {
        "id": f"{preset}-v{STYLE_VERSION}",
        "version": STYLE_VERSION,
        "preset": preset,
        "medium": p["medium"],
        "texture": p["texture"],
        "palette": palette,
        "era": era,
        "abstraction": "environmental",
        "seed": seed,
        "sourceWords": len(opening.split()),
    }


def _era(text: str) -> str | None:
    t = text.lower()
    if re.search(r"\b(?:carriage|candle|bonnet|parlour|footman|squire|curate)\b", t):
        return "nineteenth century"
    if re.search(r"\b(?:telephone|motor[- ]?car|wireless)\b", t):
        return "early twentieth century"
    return None
