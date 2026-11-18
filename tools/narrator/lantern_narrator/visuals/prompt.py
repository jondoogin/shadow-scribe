"""Prompt builder: style profile + descriptor + fixed tail, by template (§4.4).

FLUX.2 klein ignores negative prompts, so exclusions are written as positive
phrases ("empty foreground", "no lettering anywhere"). The final prompt is
stored in the manifest so every image can be audited.
"""
from __future__ import annotations

from . import lexicon as L

TAIL = ("no lettering anywhere, no signs, no text, no faces, empty foreground, "
        "painterly, muted warm palette, gentle contrast, quiet atmosphere")


def build_prompt(profile: dict, d: dict) -> str:
    parts = []
    where = d.get("setting") or "an open landscape"
    if not where.lower().startswith(("a ", "an ", "the ")):
        where = ("an " if where[0].lower() in "aeiou" else "a ") + where
    if d.get("era"):
        where += f", {d['era']}"
    parts.append(f"A {profile['medium']} of {where}")
    when = ", ".join(x for x in (d.get("timeOfDay"), d.get("weather")) if x)
    if when:
        parts.append(when)
    if d.get("light"):
        parts.append(d["light"])
    if d.get("elements"):
        parts.append("with " + ", ".join(d["elements"]))
    people = d.get("people")
    if people == "distant":
        parts.append("one or two tiny distant figures far away, featureless")
    elif people == "silhouette":
        parts.append("a single dark silhouette seen from behind, featureless, small in the frame")
    else:
        parts.append("no people")
    if d.get("mood"):
        parts.append(f"a {d['mood']} mood")
    if d.get("framing"):
        parts.append(d["framing"])
    parts.append("palette of " + ", ".join((d.get("palette") or profile.get("palette") or [])[:5]))
    parts.append(profile["texture"])
    parts.append(TAIL)
    prompt = "; ".join(p for p in parts if p)
    # Belt and braces: nothing forbidden survives, whatever the descriptor held.
    # (The tail's own "no text, no faces" phrasing is kept by checking only the descriptor part.)
    head, _, tail = prompt.rpartition("; " + TAIL)
    return L.FORBIDDEN.sub("", head).replace("  ", " ") + "; " + TAIL
