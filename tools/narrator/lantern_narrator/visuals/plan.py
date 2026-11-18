"""Scene planning: cut a book into scenes where the context shifts.

John's rule (2026-11-16): pictures change when the story moves somewhere new,
not because a timer ran out. Two passes (docs/VISUAL_JOURNEY.md §4.1):

1. Candidates, no model: every narrated section start and every scene break is
   a hard boundary; every paragraph start is a soft candidate.
2. Context shifts: a running context (setting, time of day, weather, light)
   is updated paragraph by paragraph. At each soft candidate the tracker looks
   only at the text up to and including that paragraph, so a shift can never
   be detected by looking ahead.

Pacing guards: a shift less than MIN_SCENE_SEC of narration after the last
scene waits, and the newest context wins. There is no maximum; a long scene
only gets an *alternate* (same place, newly lit) when the light or mood turns
after ALTERNATE_AFTER_SEC.

Each scene gets a source window (the first WINDOW_MIN..WINDOW_MAX words from
its start, cut at a segment boundary, never past the next scene), and its
`visibleAfter` is the window's last segment. Positions use Lantern's own
segment ids from the narration script; nothing is re-segmented here.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from ..script import narrated_sections
from . import lexicon as L

WORDS_PER_SEC = 2.6          # narration pace (~155 wpm), an estimate
MIN_SCENE_SEC = 90.0
ALTERNATE_AFTER_SEC = 15 * 60.0
WINDOW_MIN = 150
WINDOW_MAX = 300
SCENE_BREAK_MS = 1400        # the segmenter's sceneBreak pause marks an explicit break


def words(text: str) -> int:
    return len(re.findall(r"[\w’']+", text or ""))


@dataclass
class Paragraph:
    index: int
    section_id: str
    block_id: str
    segments: list[dict]
    hard: bool                      # section start or after a scene break
    heading: bool
    text: str = ""
    words: int = 0
    seconds: float = 0.0
    start_sec: float = 0.0          # narration time at the start of this paragraph


@dataclass
class Context:
    setting: str | None = None
    time: str | None = None
    weather: str | None = None
    light: str | None = None
    mood: str | None = None

    def as_dict(self) -> dict:
        return {"setting": self.setting, "timeOfDay": self.time, "weather": self.weather, "light": self.light, "mood": self.mood}


@dataclass
class Scene:
    index: int
    alternate: int
    start: Paragraph
    reason: str
    context: dict
    window: list[dict] = field(default_factory=list)      # segments, each with sectionId
    end_par: int = 0                                        # first paragraph index of the next scene

    @property
    def id(self) -> str:
        return f"s{self.index + 1}" + (f"a{self.alternate}" if self.alternate else "")

    @property
    def visible_after(self) -> dict:
        last = self.window[-1]
        return {"sectionId": last["sectionId"], "blockId": last["blockId"], "segmentId": last["id"]}

    @property
    def window_text(self) -> str:
        """The window's prose, without headings (a chapter title can itself be a spoiler)."""
        return " ".join(s["text"] for s in self.window if s.get("kind") != "heading")

    def manifest_window(self) -> dict:
        return {"fromSection": self.window[0]["sectionId"], "from": self.window[0]["id"], "to": self.window[-1]["id"]}


def paragraphs(script: dict, selection: str | None = None) -> list[Paragraph]:
    out: list[Paragraph] = []
    t = 0.0
    for sec in narrated_sections(script, selection):
        first = True
        after_break = False
        cur: Paragraph | None = None
        for seg in sec["segments"]:
            seg = {**seg, "sectionId": sec["id"]}
            if cur is None or seg["blockId"] != cur.block_id:
                cur = Paragraph(len(out), sec["id"], seg["blockId"], [], hard=first or after_break, heading=seg.get("kind") == "heading")
                out.append(cur)
                first = after_break = False
            cur.segments.append(seg)
            if (seg.get("pauseAfterMs") or 0) >= SCENE_BREAK_MS:
                after_break = True
    for p in out:
        p.text = " ".join(s.get("text") or s.get("spoken") or "" for s in p.segments)
        p.words = words(p.text)
        p.seconds = p.words / WORDS_PER_SEC + sum((s.get("pauseAfterMs") or 0) for s in p.segments) / 1000
        p.start_sec = t
        t += p.seconds
    return out


def observe(p: Paragraph) -> dict:
    """What one paragraph says about place, time, weather, light and mood (this paragraph only)."""
    text = p.text
    setting, n_set = L.strongest(L.C_SETTINGS, text)
    last = L.last_mentioned(L.C_SETTINGS, text)
    weather, n_w = L.strongest(L.C_WEATHER, text)
    light, n_l = L.strongest(L.C_LIGHT, text)
    mood, n_m = L.strongest(L.C_MOODS, text)
    return {
        "setting": last if n_set else None,
        "setting_strength": n_set,
        "setting_strongest": setting,
        "time": L.last_mentioned(L.C_TIMES, text),
        "jump": bool(L.C_TIME_JUMPS.search(text)),
        "weather": weather, "weather_n": n_w,
        "light": light, "light_n": n_l,
        "mood": mood, "mood_n": n_m,
        "short": p.words <= 60,
    }


def shift_reason(ctx: Context, o: dict) -> str | None:
    """Why this paragraph starts a new context, or None. Conservative on purpose:
    a place mentioned in passing ("he thought of the sea") is not a move."""
    new_place = o["setting_strongest"]
    if new_place and new_place != ctx.setting and (o["setting_strength"] >= 2 or (o["short"] and o["setting"] == new_place)):
        return f"setting: {new_place}"
    if o["jump"]:
        return "time jump"
    if o["time"] and ctx.time and o["time"] != ctx.time:
        return f"time: {o['time']}"
    if o["weather"] and o["weather"] != ctx.weather and o["weather"] != "wind" and o["weather_n"] >= 2:
        return f"weather: {o['weather']}"
    if o["light"] and o["light"] != ctx.light and o["light_n"] >= 2:
        return f"light: {o['light']}"
    return None


def absorb(ctx: Context, o: dict, reset: bool) -> Context:
    """Update the running context. On a new scene, stale weather and light are dropped."""
    c = Context(**vars(ctx))
    if reset:
        c.weather = c.light = c.mood = None
    # The place only changes with a new scene (or when none is known yet), so
    # passing mentions don't make the context flicker between two places.
    if (reset or not c.setting) and (o["setting_strongest"] or o["setting"]):
        c.setting = o["setting_strongest"] or o["setting"]
    if o["time"]:
        c.time = o["time"]
    if o["weather"] and o["weather_n"]:
        c.weather = o["weather"]
    if o["light"] and o["light_n"]:
        c.light = o["light"]
    if o["mood"] and o["mood_n"] >= 2:
        c.mood = o["mood"]
    return c


def plan(script: dict, selection: str | None = None, min_scene_sec: float = MIN_SCENE_SEC,
         alternate_after_sec: float = ALTERNATE_AFTER_SEC) -> list[Scene]:
    pars = paragraphs(script, selection)
    if not pars:
        return []
    scenes: list[Scene] = []
    ctx = Context()
    pending: tuple[str, Paragraph] | None = None   # a shift waiting out the guard; the newest wins
    scene_start_sec = 0.0
    alt_count = 0

    def start_scene(par: Paragraph, why: str, alternate: int = 0) -> None:
        nonlocal scene_start_sec
        base = len({s.index for s in scenes}) if not alternate else scenes[-1].index
        scenes.append(Scene(base, alternate, par, why, ctx.as_dict()))
        scene_start_sec = par.start_sec

    for p in pars:
        o = observe(p)
        if not scenes:
            if p.heading:
                ctx = absorb(ctx, o, reset=False)
                continue
            ctx = absorb(ctx, o, reset=True)
            start_scene(p, "opening")
            continue
        reason = "scene break" if p.hard else shift_reason(ctx, o)
        if reason:
            # The context changes now, whether or not a painting can follow yet.
            ctx = absorb(ctx, o, reset=True)
            alt_count = 0
            if p.heading:
                pending = (reason, None)          # start on the first real paragraph after it
            elif p.start_sec - scene_start_sec >= min_scene_sec:
                start_scene(p, reason)
                pending = None
            else:
                pending = (reason, p)
            continue
        ctx_before = (ctx.light, ctx.mood, ctx.time)
        ctx = absorb(ctx, o, reset=False)
        if pending:
            why, at = pending
            if at is None and not p.heading:
                pending = (why, p)
                at = p
            if at is not None and p.start_sec - scene_start_sec >= min_scene_sec:
                start_scene(at, why)
                pending = None
            continue
        # Same context. A long-held place may get an alternate when its light or mood turns.
        elapsed = p.start_sec - scene_start_sec
        since_last = p.start_sec - (scenes[-1].start.start_sec if scenes[-1].alternate else scene_start_sec)
        if not p.heading and elapsed >= alternate_after_sec and (since_last >= alternate_after_sec / 2 or not scenes[-1].alternate) \
                and ctx_before != (ctx.light, ctx.mood, ctx.time):
            alt_count += 1
            start_scene_sec = scene_start_sec
            start_scene(p, "same place, newly lit", alternate=alt_count)
            scene_start_sec = start_scene_sec        # an alternate doesn't reset the scene clock
    if pending and pending[1] is not None and pars[-1].start_sec - scene_start_sec >= min_scene_sec / 2:
        start_scene(pending[1], pending[0])
    # Windows: from each scene start, never past the next scene start.
    for i, sc in enumerate(scenes):
        sc.end_par = scenes[i + 1].start.index if i + 1 < len(scenes) else len(pars)
        sc.window = _window(pars[sc.start.index:sc.end_par])
    scenes = [s for s in scenes if s.window]
    # The context handed to the describer may only come from text the reader
    # has passed when the painting appears: the previous scene's context (made
    # the same way, from earlier text) plus this scene's own window. The
    # running context above can be ahead of the window, so it is not used.
    prev = Context()
    for sc in scenes:
        win = Paragraph(-1, sc.window[0]["sectionId"], sc.window[0]["blockId"], sc.window, False, False,
                        text=sc.window_text, words=words(sc.window_text))
        c = absorb(prev, observe(win), reset=not sc.alternate)
        sc.context = c.as_dict()
        prev = c
    return scenes


def _window(pars: list[Paragraph]) -> list[dict]:
    """First WINDOW_MIN..WINDOW_MAX words from the scene start, cut at a segment boundary.

    The window always leaves at least one segment of its scene unread, so the
    painting can appear while the reader is still in that scene (the gate is
    strictly past `visibleAfter`; a window ending on the book's last segment
    would never be shown).
    """
    segs = [seg for p in pars for seg in p.segments]
    out: list[dict] = []
    n = 0
    for seg in segs:
        w = words(seg.get("text") or "") if seg.get("kind") != "heading" else 0
        if out and (n >= WINDOW_MIN or n + w > WINDOW_MAX):
            break
        out.append(seg)
        n += w
    while out and len(out) >= len(segs):
        out.pop()
    while out and out[-1].get("kind") == "heading":
        out.pop()
    return out


def later_text(script: dict, scene: Scene, selection: str | None = None) -> str:
    """All narrated text after the scene's visibleAfter (for spoiler tests)."""
    pars = paragraphs(script, selection)
    va = scene.visible_after
    seen = False
    out = []
    for p in pars:
        for s in p.segments:
            if seen:
                out.append(s.get("text") or "")
            elif s["sectionId"] == va["sectionId"] and s["id"] == va["segmentId"]:
                seen = True
    return " ".join(out)
