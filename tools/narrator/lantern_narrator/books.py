"""Per-book narration choices (engine, voice, style, speed).

Stored in <narrator home>/books.json, keyed by the book's contentId, so a later
`generate` or `audition` of the same EPUB reuses the choice. It holds only the
title and the settings, never book text.
"""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

from .paths import home

FIELDS = ("engine", "voice", "style", "speed")


def _path() -> Path:
    return home() / "books.json"


def load_all() -> dict:
    p = _path()
    if not p.exists():
        return {}
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def get(content_id: str) -> dict:
    return dict(load_all().get(content_id) or {})


def remember(content_id: str, title: str | None, **choice) -> dict:
    data = load_all()
    entry = dict(data.get(content_id) or {})
    for k in FIELDS:
        if k in choice and choice[k] is not None:
            entry[k] = choice[k]
    if title:
        entry["title"] = title
    data[content_id] = entry
    p = _path()
    p.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(suffix=".json", dir=p.parent)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, p)
    return entry
