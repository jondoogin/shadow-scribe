"""Keyword lexicons for the deterministic describer and the context tracker.

Each entry maps a word pattern to a canonical value. Values are plain scene
vocabulary (never names), so anything built from them is safe to put in a
prompt.
"""
from __future__ import annotations

import re

SETTINGS = {
    # interiors
    "drawing room": r"drawing[- ]room|parlou?r|sitting[- ]room",
    "library": r"library|study",
    "bedroom": r"bed[- ]?room|bed[- ]?chamber",
    "kitchen": r"kitchen|scullery",
    "hall": r"great hall|hall(?:way)?|corridor|staircase",
    "church": r"church|chapel|cathedral|abbey",
    "inn": r"\binn\b|tavern|public[- ]house",
    "ballroom": r"ball[- ]?room|assembly[- ]rooms",
    "cottage interior": r"cottage",
    "cabin": r"cabin|\bhut\b",
    "lamp room": r"lamp[- ]room|lantern room",
    # exteriors
    "lighthouse": r"lighthouse|\btower\b",
    "sea shore": r"\bshore\b|beach|strand|sands|cove|\bsea\b|ocean|waves",
    "harbour": r"harbou?r|quay|dock|wharf|pier",
    "ship deck": r"\bdeck\b|\bship\b|vessel|\bmast",
    "forest": r"forest|\bwoods?\b|woodland|thicket|grove",
    "garden": r"garden|orchard|shrubbery|lawn",
    "moor": r"\bmoors?\b|heath|fells?\b",
    "hills": r"\bhills?\b|valley|downs\b|slope",
    "mountains": r"mountains?|peaks?|crags?|summit",
    "river": r"\briver\b|\bstreams?\b|\bbrook\b|river ?bank",
    "lake": r"\blake\b|\bmere\b|\bpond\b|loch",
    "field": r"\bfields?\b|meadow|pasture|farm",
    "village street": r"village|lane\b",
    "city street": r"\bstreets?\b|square\b|\bcity\b|\btown\b|avenue",
    "road": r"\broad\b|highway|carriage|coach",
    "ruins": r"ruins?\b|ruined",
}

TIMES = {
    "dawn": r"\bdawn|daybreak|sunrise|first light",
    "morning": r"\bmorning\b",
    "midday": r"\bnoon|midday",
    "afternoon": r"afternoon",
    "evening": r"\bevening|dusk|twilight|sunset",
    "night": r"\bnight\b|midnight|nightfall",
}

# Phrases that mark a jump in time, even without a new time of day word.
TIME_JUMPS = r"next (?:morning|day|evening|week)|following (?:morning|day|week)|\b(?:days|weeks|months|years) later|\bthe morrow|some time later|a (?:week|month|year) (?:later|passed)"

WEATHER = {
    "rain": r"\brain(?:s|y|ing|ed)?\b|drizzle|downpour|showers?\b",
    "storm": r"\bstorm(?:s|y)?\b|tempest|thunder|lightning|\bgales?\b",
    "snow": r"\bsnow(?:s|y|ing|fall)?\b|frost|\bice\b|wintry|blizzard",
    "fog": r"\bfog|\bmist|haze",
    "wind": r"\bwind(?:y|s)?\b|breeze|gust",
    "clear": r"sunshine|\bsunny|cloudless|clear sky|bright day",
}

LIGHT = {
    "candlelight": r"candle",
    "firelight": r"firelight|\bhearth|\bfire\b|embers",
    "lamplight": r"\blamps?\b|lantern|gaslight",
    "moonlight": r"moonlight|\bmoon\b|starlight",
    "sunlight": r"sunlight|\bsun\b|sunbeam",
}

MOODS = {
    "calm": r"quiet|peace|still(?:ness)?\b|calm|serene",
    "melancholy": r"sorrow|grief|melanchol|lonely|weep|tears",
    "tense": r"fear|dread|anxious|uneasy|alarm|terror",
    "joyful": r"\bjoy|laugh|merry|delight|happy",
    "solemn": r"solemn|grave\b|hush",
}

PEOPLE = r"\b(?:he|she|they|man|woman|men|women|child|children|figure|people|crowd|someone|stranger)\b"

# Words that must never reach an image prompt, whatever the describer says.
FORBIDDEN = re.compile(
    r"\b(?:blood\w*|bleed\w*|dead|death|die[ds]?|dying|corpse\w*|kill\w*|murder\w*|wound\w*|weapon\w*|gun\w*|knife|knives|"
    r"sword\w*|naked|nude|kiss\w*|embrace\w*|fight\w*|attack\w*|faces?|portrait\w*|text|letters?|words?|signs?|writing)\b",
    re.I,
)

PALETTES = {
    "sea shore": ["slate blue", "sea grey", "pale sand", "storm teal"],
    "lighthouse": ["whitewash", "lamp gold", "night blue", "iron grey"],
    "lamp room": ["brass", "lamp gold", "night blue", "iron grey"],
    "harbour": ["slate blue", "tar black", "rope ochre", "sea grey"],
    "ship deck": ["weathered oak", "sail cream", "sea grey", "slate blue"],
    "forest": ["moss green", "bark umber", "fern", "shadow olive"],
    "garden": ["sage", "rose madder", "cream", "leaf green"],
    "moor": ["heather mauve", "peat brown", "sky grey", "bracken rust"],
    "hills": ["sage", "ochre", "sky blue", "chalk"],
    "mountains": ["granite grey", "snow white", "pine green", "cold blue"],
    "river": ["willow green", "silt brown", "silver", "reed ochre"],
    "lake": ["silver", "pine green", "mist grey", "cold blue"],
    "field": ["wheat gold", "sage", "sky blue", "earth umber"],
    "village street": ["stone grey", "thatch ochre", "brick", "sky grey"],
    "city street": ["soot grey", "brick", "gaslight amber", "slate"],
    "road": ["dust ochre", "hedge green", "sky grey", "umber"],
    "ruins": ["lichen green", "stone grey", "ivy", "pale sky"],
}
INTERIOR_PALETTE = ["umber", "candle gold", "oak brown", "slate blue"]

LIGHT_BY_TIME = {"dawn": "first light, cool and pale", "morning": "soft morning light", "midday": "high clear light",
                 "afternoon": "warm afternoon light", "evening": "low golden light", "night": "dim night light"}

INTERIORS = {"lamp room", "drawing room", "library", "bedroom", "kitchen", "hall", "church", "inn", "ballroom", "cottage interior", "cabin"}


def _compile(d: dict) -> dict:
    return {k: re.compile(v, re.I) for k, v in d.items()}


C_SETTINGS = _compile(SETTINGS)
C_TIMES = _compile(TIMES)
C_WEATHER = _compile(WEATHER)
C_LIGHT = _compile(LIGHT)
C_MOODS = _compile(MOODS)
C_TIME_JUMPS = re.compile(TIME_JUMPS, re.I)
C_PEOPLE = re.compile(PEOPLE, re.I)


def strongest(compiled: dict, text: str) -> tuple[str | None, int]:
    """The value with the most matches in `text` (ties: the first listed), and its count."""
    best, n = None, 0
    for k, rx in compiled.items():
        c = len(rx.findall(text))
        if c > n:
            best, n = k, c
    return best, n


def last_mentioned(compiled: dict, text: str) -> str | None:
    """The value mentioned last in `text`: where a paragraph ends up is where the scene is."""
    best, pos = None, -1
    for k, rx in compiled.items():
        for m in rx.finditer(text):
            if m.start() > pos:
                best, pos = k, m.start()
    return best
