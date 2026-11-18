"""Scene descriptors (docs/VISUAL_JOURNEY.md §4.3).

A descriptor says where and when a scene is, never what happens:

  { setting, era, timeOfDay, weather, light, palette, mood, elements, framing,
    focus: {x, y}, people: none|distant|silhouette, confidence }

`KeywordDescriber` is deterministic and needs no download (the M2 Air and the
tests use it). `LlmDescriber` asks a small local model (Qwen3 via mlx-lm) for
the same JSON and falls back to the keywords when the answer can't be used.
Both see only the scene's source window, the style profile and the previous
descriptor, never later text.
"""
from __future__ import annotations

import hashlib
import json
import re

from . import lexicon as L

# Settings whose plain name a painter misreads ("lamp room" became a room with a floor lamp).
SETTING_PHRASES = {"lamp room": "the glass lantern room at the top of a lighthouse"}

ELEMENTS = {
    "lamp room": ["a great faceted glass lens", "brass fittings", "a ring of storm windows"],
    "drawing room": ["tall windows", "an empty armchair", "a mantelpiece"],
    "library": ["shelves of old books", "a reading lamp", "a writing desk"],
    "bedroom": ["a curtained bed", "a washstand", "a small window"],
    "kitchen": ["a scrubbed table", "copper pans", "a range"],
    "hall": ["a wide staircase", "stone flags", "a long corridor"],
    "church": ["pews", "a tall window", "stone arches"],
    "inn": ["low beams", "a settle by the fire", "pewter"],
    "ballroom": ["chandeliers", "a polished floor", "long windows"],
    "cottage interior": ["a low ceiling", "a deal table", "a small hearth"],
    "cabin": ["rough timber walls", "a lantern on a hook"],
    "sea shore": ["a long beach", "breaking waves", "a distant headland"],
    "harbour": ["moored boats", "a stone quay", "gulls"],
    "ship deck": ["rigging", "a rail", "open water"],
    "forest": ["old trees", "a path under branches", "dappled ground"],
    "garden": ["a gravel walk", "clipped hedges", "a stone bench"],
    "moor": ["open heath", "a far ridge", "low cloud"],
    "hills": ["rolling hills", "a winding track", "hedgerows"],
    "mountains": ["high peaks", "a rocky path", "far snowfields"],
    "river": ["a slow river", "willows", "a footbridge"],
    "lake": ["still water", "reeds", "a far shore"],
    "field": ["open fields", "a hedge", "a gate"],
    "village street": ["cottages", "a lane", "a church tower in the distance"],
    "city street": ["tall houses", "lamp posts", "wet cobbles"],
    "road": ["a long road", "hedges", "a milestone"],
    "ruins": ["broken walls", "ivy", "an empty arch"],
}

PEOPLE_VALUES = ("none", "distant", "silhouette")


class KeywordDescriber:
    id = "keywords"
    label = "Keyword describer (no model)"

    def describe(self, window_text: str, previous: dict | None, profile: dict, context: dict | None = None) -> dict:
        ctx = context or {}
        setting = ctx.get("setting") or L.last_mentioned(L.C_SETTINGS, window_text) or (previous or {}).get("setting")
        time = ctx.get("timeOfDay") or L.last_mentioned(L.C_TIMES, window_text) or (previous or {}).get("timeOfDay")
        weather = ctx.get("weather") or L.strongest(L.C_WEATHER, window_text)[0]
        light_word = ctx.get("light") or L.strongest(L.C_LIGHT, window_text)[0]
        mood = ctx.get("mood") or L.strongest(L.C_MOODS, window_text)[0] or "quiet"
        interior = setting in L.INTERIORS
        light = light_word or (L.LIGHT_BY_TIME.get(time) if time else None) or ("soft window light" if interior else "soft diffuse daylight")
        people_hits = len(L.C_PEOPLE.findall(window_text))
        people = "distant" if people_hits >= 3 and not interior else "silhouette" if people_hits >= 3 else "none"
        h = int(hashlib.sha1(window_text.encode("utf-8")).hexdigest()[:8], 16)
        focus = {"x": round(0.35 + (h % 31) / 100, 2), "y": round(0.38 + ((h >> 5) % 21) / 100, 2)}
        return sanitize({
            "setting": SETTING_PHRASES.get(setting, setting) or ("an interior" if interior else "an open landscape"),
            "era": profile.get("era"),
            "timeOfDay": time,
            "weather": weather if weather != "clear" else None,
            "light": light,
            "palette": profile.get("palette", [])[:4],
            "mood": mood,
            "elements": ELEMENTS.get(setting, [])[:3],
            "framing": "wide interior, empty foreground" if interior else "wide landscape, low horizon, empty foreground",
            "focus": focus,
            "people": people,
            "confidence": 0.5 if setting else 0.3,
        })


SYSTEM_PROMPT = """You describe the SETTING of a passage from a novel for a painter.
Return only JSON with keys: setting, era, timeOfDay, weather, light, palette (list of 3-5 colour words),
mood, elements (list of up to 4 objects or landscape features), framing, focus ({x,y} 0..1), people
("none" | "distant" | "silhouette"), confidence (0..1).
Rules: describe only what the passage states or clearly implies about place, light, weather and objects.
Never name characters. Never describe faces, actions, events, violence, death, or any readable text.
Do not guess what happens next. People may only be "distant" or "silhouette", and only if the passage
puts people in that place. If the passage is mostly dialogue with no setting, keep the previous setting
and set confidence below 0.3."""


class LlmDescriber:
    id = "qwen3-4b-instruct-4bit"
    label = "Qwen3 4B Instruct (MLX, 4-bit)"
    repo = "mlx-community/Qwen3-4B-Instruct-2507-4bit"

    def __init__(self, repo: str | None = None):
        if repo:
            self.repo = repo
            self.id = repo.split("/")[-1].lower()
        try:
            from mlx_lm import load, generate  # noqa: F401
        except ImportError as e:  # pragma: no cover - needs Apple Silicon
            raise RuntimeError("The LLM describer needs mlx-lm: pip install -e '.[visuals]'") from e
        self._model = None
        self._fallback = KeywordDescriber()

    def _load(self):  # pragma: no cover - needs Apple Silicon
        if self._model is None:
            from mlx_lm import load
            self._model, self._tok = load(self.repo)
        return self._model, self._tok

    def describe(self, window_text, previous, profile, context=None):  # pragma: no cover - needs Apple Silicon
        from mlx_lm import generate
        model, tok = self._load()
        msgs = [{"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps({"previousSetting": (previous or {}).get("setting"),
                                                        "era": profile.get("era"), "passage": window_text})}]
        prompt = tok.apply_chat_template(msgs, add_generation_prompt=True, tokenize=False)
        raw = generate(model, tok, prompt=prompt, max_tokens=400, verbose=False)
        d = parse_json(raw)
        base = self._fallback.describe(window_text, previous, profile, context)
        if not d:
            return base
        merged = {**base, **{k: v for k, v in d.items() if v not in (None, "", [])}}
        # The book's palette is fixed so a set hangs together; the model may add one colour of its own.
        own = [c for c in (d.get("palette") or []) if isinstance(c, str) and c not in base["palette"]]
        merged["palette"] = (base["palette"] + own[:1])[:5]
        return sanitize(merged, window_text)

    def unload(self):  # pragma: no cover
        self._model = None


def parse_json(raw: str) -> dict | None:
    m = re.search(r"\{.*\}", raw or "", re.S)
    if not m:
        return None
    try:
        d = json.loads(m.group(0))
        return d if isinstance(d, dict) else None
    except json.JSONDecodeError:
        return None


def proper_names(window_text: str) -> set[str]:
    """Capitalised words that are not sentence starts: likely names, never sent to the image model."""
    names = set()
    for m in re.finditer(r"(?<![.!?“\"‘]\s)(?<!^)\b([A-Z][a-z]{2,})\b", window_text or ""):
        names.add(m.group(1))
    return names - {"The", "And", "But", "She", "Her", "His", "They", "There", "Then", "When", "What", "With"}


def _clean_str(v, names: set[str], n: int = 80) -> str | None:
    if not isinstance(v, str):
        return None
    s = L.FORBIDDEN.sub("", v)
    for name in names:
        s = re.sub(rf"\b{re.escape(name)}(?:'s|’s)?\b", "", s)
    # A removed name can leave "harbour at , with a quay": drop the dangling word.
    s = re.sub(r"\b(?:at|in|of|near|by|on|from|to|the|a|an)\s*(?=[,;.]|$)", "", s, flags=re.I)
    s = re.sub(r"\s+([,;.])", r"\1", s)
    s = re.sub(r"([,;])\s*(?=[,;.]|$)", "", s)
    s = re.sub(r"\s{2,}", " ", s).strip(" ,;.")
    return s[:n] or None


def sanitize(d: dict, window_text: str = "") -> dict:
    """Enforce the descriptor rules in code, whatever produced it."""
    names = proper_names(window_text)
    out = {k: _clean_str(d.get(k), names) for k in ("setting", "era", "timeOfDay", "weather", "light", "mood", "framing")}
    out["palette"] = [x for x in (_clean_str(p, names, 30) for p in (d.get("palette") or [])[:5]) if x]
    out["elements"] = [x for x in (_clean_str(e, names, 50) for e in (d.get("elements") or [])[:4]) if x]
    f = d.get("focus") or {}
    try:
        out["focus"] = {"x": min(1.0, max(0.0, float(f.get("x", 0.5)))), "y": min(1.0, max(0.0, float(f.get("y", 0.45))))}
    except (TypeError, ValueError):
        out["focus"] = {"x": 0.5, "y": 0.45}
    out["people"] = d.get("people") if d.get("people") in PEOPLE_VALUES else "none"
    try:
        out["confidence"] = round(min(1.0, max(0.0, float(d.get("confidence", 0.5)))), 2)
    except (TypeError, ValueError):
        out["confidence"] = 0.5
    return out


def create_describer(kind: str):
    if kind in ("keywords", "keyword", "none"):
        return KeywordDescriber()
    if kind in ("llm", "qwen3", "qwen3-4b"):
        return LlmDescriber()
    if kind == "qwen3-8b":
        return LlmDescriber("mlx-community/Qwen3-8B-4bit")
    raise ValueError(f"Unknown describer {kind!r} (keywords, qwen3-4b, qwen3-8b).")
