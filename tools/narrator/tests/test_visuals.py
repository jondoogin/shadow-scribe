"""Visual journey: scene planning, spoiler rules and the package (no model download)."""
from __future__ import annotations

import json
import re
import zipfile

import pytest

from lantern_narrator.visuals import lexicon as L
from lantern_narrator.visuals import plan as P
from lantern_narrator.visuals.describe import KeywordDescriber, sanitize
from lantern_narrator.visuals.generate import generate, plan_book
from lantern_narrator.visuals.prompt import build_prompt
from lantern_narrator.visuals.style import PROFILE_WORDS, build_profile, opening_text

FILLER = ("The hours went by and nothing much was said, and the light moved slowly across the floor "
          "while the clock ticked on the shelf and the kettle sang on the hob. ")


def make_script(chapters: list[list[str]]) -> dict:
    """A narration script with one segment per sentence, as Lantern's segmenter would give."""
    sections = []
    for ci, paras in enumerate(chapters):
        segs = [{"id": "b0.0", "blockId": "b0", "text": f"Chapter {ci + 1}", "spoken": f"Chapter {ci + 1}.",
                 "kind": "heading", "pauseAfterMs": 1000}]
        for bi, para in enumerate(paras, start=1):
            sentences = [s for s in re.split(r"(?<=[.!?])\s+", para.strip()) if s]
            for si, sent in enumerate(sentences):
                last = si == len(sentences) - 1
                segs.append({"id": f"b{bi}.{si}", "blockId": f"b{bi}", "text": sent, "spoken": sent,
                             "kind": "paragraph" if last else "sentence", "pauseAfterMs": 650 if last else 260})
        sections.append({"id": f"ch{ci + 1}", "order": ci + 1, "title": f"Chapter {ci + 1}", "narrate": True, "segments": segs})
    return {"format": "lantern-narration-script", "version": 1,
            "book": {"contentId": "sha256:" + "cd" * 32, "title": "Test Story", "author": "Test", "parserVersion": 1,
                     "segmenterVersion": 1},
            "sections": sections}


def story() -> dict:
    harbour = [f"The evening light lay on the harbour and the quay, and the boats rocked at the quay wall. {FILLER * 2}" for _ in range(4)]
    storm = [f"That night the storm broke over the harbour; rain lashed the quay and thunder rolled. {FILLER * 2}" for _ in range(4)]
    forest = [f"Weeks later the snow lay deep in the forest, and the woods were silent under it. {FILLER * 2}" for _ in range(4)]
    return make_script([harbour, storm, forest])


def text_until(script: dict, va: dict) -> str:
    out = []
    for p in P.paragraphs(script):
        for s in p.segments:
            out.append(s["text"])
            if s["sectionId"] == va["sectionId"] and s["id"] == va["segmentId"]:
                return " ".join(out)
    raise AssertionError("visibleAfter not found in the script")


def test_visible_after_is_the_last_segment_of_the_window():
    for sc in P.plan(story()):
        assert sc.window, sc.id
        assert sc.visible_after["segmentId"] == sc.window[-1]["id"]
        assert sc.manifest_window()["to"] == sc.visible_after["segmentId"]


def test_scenes_follow_context_not_time():
    scenes = P.plan(story())
    settings = [sc.context["setting"] for sc in scenes]
    assert settings[0] == "harbour"
    assert "forest" in settings
    assert any(sc.context["weather"] == "storm" for sc in scenes)
    # A long unchanging stretch makes no extra scenes (no timer).
    same = make_script([[f"The harbour was quiet and the quay was empty. {FILLER * 3}" for _ in range(20)]])
    assert len(P.plan(same, alternate_after_sec=10 ** 9)) == 1


def test_pacing_guard_keeps_scenes_at_least_90_seconds_apart():
    jumpy = make_script([[f"They went to the {place}. The {place} was quiet." for place in
                          ("harbour", "forest", "moor", "garden", "church", "library", "sea", "river")]])
    scenes = [s for s in P.plan(jumpy) if not s.alternate]
    starts = [s.start.start_sec for s in scenes]
    assert all(b - a >= P.MIN_SCENE_SEC for a, b in zip(starts, starts[1:]))


def test_no_painting_uses_words_from_after_it_is_shown():
    script = story()
    planned = plan_book(script)
    for item in planned["scenes"]:
        sc, d = item["scene"], item["descriptor"]
        seen = text_until(script, sc.visible_after)
        for field, compiled in (("setting", L.C_SETTINGS), ("weather", L.C_WEATHER), ("timeOfDay", L.C_TIMES)):
            v = d.get(field)
            if v in compiled:
                assert compiled[v].search(seen), f"{sc.id}: {field}={v} is not in the text read so far"
        later = P.later_text(script, sc)
        if sc.index == 0:   # the first painting must not know about the storm or the forest
            assert "storm" not in item["prompt"] and "forest" not in item["prompt"] and "snow" not in item["prompt"]
            assert "forest" in later


def test_style_profile_never_reads_past_the_opening():
    early = " ".join(["The sea was grey and the waves came in."] * 300)       # 2,700 words
    late = " ".join(["The forest was dark and the woods were deep."] * 300)
    a = make_script([[early], [late]])
    b = make_script([[early]])
    assert len(opening_text(a).split()) == PROFILE_WORDS
    assert "forest" not in opening_text(a)
    assert build_profile(a) == build_profile(b)


def test_descriptor_rules_are_enforced_in_code():
    d = sanitize({"setting": "Netherfield drawing room", "mood": "murderous dread", "elements": ["a bloody knife", "tall windows"],
                  "people": "crowd", "focus": {"x": 3, "y": -1}},
                 window_text="She walked up to Netherfield. The rain came on.")
    assert "Netherfield" not in d["setting"]
    assert "murder" not in (d["mood"] or "")
    assert d["elements"] == ["a", "tall windows"] or "knife" not in " ".join(d["elements"])
    assert d["people"] == "none"
    assert d["focus"] == {"x": 1.0, "y": 0.0}
    prompt = build_prompt(build_profile(story()), d)
    assert "Netherfield" not in prompt and "knife" not in prompt


def test_keyword_describer_needs_no_model_and_names_no_one():
    d = KeywordDescriber().describe("Nell Arden walked along the shore at dawn while the waves broke.", None,
                                    build_profile(story()), None)
    assert d["setting"] == "sea shore" and d["timeOfDay"] == "dawn"
    assert "Nell" not in json.dumps(d)


def test_fixture_package_round_trip(tmp_path, monkeypatch):
    monkeypatch.setenv("LANTERN_NARRATOR_HOME", str(tmp_path / "home"))
    res = generate(story(), painter="fixture", out_path=tmp_path / "out.lantern-visuals", job_dir=tmp_path / "job", log=lambda *a: None)
    with zipfile.ZipFile(res["path"]) as z:
        assert all(i.compress_type == zipfile.ZIP_STORED for i in z.infolist())
        m = json.loads(z.read("manifest.json"))
        names = set(z.namelist())
    assert m["format"] == "lantern-visuals" and m["version"] == 1
    assert m["generator"]["codeDrawn"] is True
    assert m["images"]
    for img in m["images"]:
        assert {img["file"], img["strokes"], img["thumb"]} <= names
        assert img["sourceWindow"]["to"] == img["visibleAfter"]["segmentId"]
        assert img["file"].startswith("images/") and ".." not in img["file"]
        assert "no faces" in img["prompt"]
    # Resumable: a second run reuses every image.
    again = generate(story(), painter="fixture", out_path=tmp_path / "out2.lantern-visuals", job_dir=tmp_path / "job", log=lambda *a: None)
    assert [i["file"] for i in again["manifest"]["images"]] == [i["file"] for i in m["images"]]


def test_unknown_preset_is_refused():
    with pytest.raises(ValueError):
        build_profile(story(), "neon")


def test_clean_knows_about_visuals(tmp_path, monkeypatch):
    monkeypatch.setenv("LANTERN_NARRATOR_HOME", str(tmp_path))
    from lantern_narrator import storage
    assert "visuals" in storage.CATEGORIES
    (tmp_path / "visuals" / "book").mkdir(parents=True)
    (tmp_path / "visuals" / "book" / "x.webp").write_bytes(b"x" * 10)
    assert storage.usage()["categories"]["visuals"]["bytes"] == 10


def test_every_painting_can_appear_before_its_scene_ends():
    script = story()
    pars = P.paragraphs(script)
    last = pars[-1].segments[-1]
    for sc in P.plan(script):
        scene_segs = [s for p in pars[sc.start.index:sc.end_par] for s in p.segments]
        assert sc.window[-1] is not scene_segs[-1], sc.id
        assert sc.visible_after["segmentId"] != last["id"] or sc.visible_after["sectionId"] != last["sectionId"]


def test_mflux_is_found_beside_the_venv_python(tmp_path, monkeypatch):
    from lantern_narrator.visuals import painters
    exe = tmp_path / "bin" / "python"
    exe.parent.mkdir()
    exe.write_text("")
    cmd = exe.parent / painters.MFLUX_CMD
    cmd.write_text("#!/bin/sh\n")
    cmd.chmod(0o755)
    monkeypatch.setenv("PATH", "/nonexistent")
    monkeypatch.setattr(painters.sys, "executable", str(exe))
    assert painters.find_mflux() == str(cmd)
