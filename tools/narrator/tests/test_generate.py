"""Generator behaviour with the deterministic fake engine (no model download)."""
from __future__ import annotations

import copy
import json
import zipfile

import numpy as np
import pytest

from lantern_narrator import audio as A
from lantern_narrator import generate as G
from lantern_narrator.engines.fake import FakeEngine
from lantern_narrator.package import build_manifest, write_package
from lantern_narrator.script import ScriptError, narrated_sections, validate


def make_script() -> dict:
    def seg(sid, block, text, kind="sentence"):
        return {"id": sid, "blockId": block, "start": 0, "end": len(text), "text": text, "spoken": text,
                "kind": kind, "pauseAfterMs": 260}
    return {
        "format": "lantern-narration-script",
        "version": 1,
        "book": {"contentId": "sha256:" + "ab" * 32, "title": "Test Book", "author": "A. Writer", "language": "en"},
        "sections": [
            {"id": "front", "order": 0, "title": "Copyright", "narrate": False, "segments": [seg("b0.0", "b0", "All rights reserved.")]},
            {"id": "ch1", "order": 1, "title": "Chapter 1", "narrate": True,
             "segments": [seg("b0.0", "b0", "Chapter 1.", "heading"), seg("b1.0", "b1", "It was a bright cold day."),
                          seg("b1.1", "b1", "The clocks were striking.")]},
            {"id": "ch2", "order": 2, "title": "Chapter 2", "narrate": True,
             "segments": [seg("b0.0", "b0", "Chapter 2.", "heading"), seg("b1.0", "b1", "Nothing happened next.")]},
        ],
    }


@pytest.fixture(autouse=True)
def no_retry_sleep(monkeypatch):
    monkeypatch.setattr(G.time, "sleep", lambda s: None)


def gen(tmp_path, engine=None, script=None, **kw):
    return G.Generator(script or make_script(), engine or FakeEngine(), "tone", job_dir=tmp_path / "job", **kw)


def test_generates_every_narrated_section_and_skips_front_matter(tmp_path):
    state = gen(tmp_path).run()
    assert set(state["sections"]) == {"ch1", "ch2"}
    for sid in ("ch1", "ch2"):
        st = state["sections"][sid]
        assert st["status"] == "done"
        assert (tmp_path / "job" / st["file"]).exists()
        assert st["durationSec"] > 1
    assert not (tmp_path / "job" / "seg" / "ch1").exists()  # segment cache cleaned per finished chapter


def test_timings_are_ordered_and_inside_the_chapter(tmp_path):
    st = gen(tmp_path).run()["sections"]["ch1"]
    times = st["segments"]
    assert [t["id"] for t in times] == ["b0.0", "b1.0", "b1.1"]
    assert times[0]["t0"] == pytest.approx(G.SECTION_LEAD_IN_MS / 1000, abs=1e-3)
    for a, b in zip(times, times[1:]):
        assert a["t0"] < a["t1"] <= b["t0"]
    assert times[-1]["t1"] < st["durationSec"]


def test_interrupt_then_resume_does_not_redo_finished_work(tmp_path):
    engine = FakeEngine()
    stop = G.StopFlag()
    seen = []

    def on_progress(p):
        seen.append((p.section_index, p.segment_index))
        if p.section_index == 2 and p.segment_index == 1:
            stop.set()

    with pytest.raises(G.GenerationInterrupted):
        gen(tmp_path, engine, on_progress=on_progress, stop=stop).run()
    state = json.loads((tmp_path / "job" / "job.json").read_text())
    assert state["sections"]["ch1"]["status"] == "done"
    assert state["sections"]["ch2"]["status"] == "partial"
    calls_before = engine.calls  # 3 for ch1 + 1 for ch2

    engine2 = FakeEngine()
    state = gen(tmp_path, engine2).run()
    assert state["sections"]["ch2"]["status"] == "done"
    assert calls_before == 4
    assert engine2.calls == 1  # ch1 reused, ch2's first segment came from the cache


def test_rerun_of_finished_job_does_no_synthesis(tmp_path):
    gen(tmp_path).run()
    engine = FakeEngine()
    gen(tmp_path, engine).run()
    assert engine.calls == 0


def test_changed_text_regenerates_only_that_chapter(tmp_path):
    gen(tmp_path).run()
    script = make_script()
    script["sections"][2]["segments"][1]["spoken"] = "Something happened after all."
    engine = FakeEngine()
    state = gen(tmp_path, engine, script=script).run()
    assert engine.calls == 2  # all of ch2, nothing from ch1
    assert state["sections"]["ch2"]["status"] == "done"


def test_persistent_failure_is_reported_and_progress_is_kept(tmp_path):
    engine = FakeEngine(fail_on="Nothing happened")
    with pytest.raises(G.SegmentFailed) as e:
        gen(tmp_path, engine).run()
    assert "b1.0" in str(e.value) and "ch2" in str(e.value)
    assert engine.calls == 3 + 1 + G.MAX_ATTEMPTS
    state = json.loads((tmp_path / "job" / "job.json").read_text())
    assert state["sections"]["ch1"]["status"] == "done"

    fixed = FakeEngine()
    gen(tmp_path, fixed).run()
    assert fixed.calls == 1  # only the failed segment


def test_transient_failure_is_retried(tmp_path):
    class Flaky(FakeEngine):
        def synthesize(self, text, voice, speed=1.0):
            if self.calls == 0:
                self.calls += 1
                raise RuntimeError("blip")
            return super().synthesize(text, voice, speed)

    state = gen(tmp_path, Flaky()).run()
    assert state["sections"]["ch1"]["status"] == "done"


def test_section_selection(tmp_path):
    state = gen(tmp_path, selection="2").run()
    assert set(state["sections"]) == {"ch2"}
    assert [s["id"] for s in narrated_sections(make_script(), "1-2")] == ["ch1", "ch2"]


def test_package_is_stored_zip_with_matching_manifest(tmp_path):
    script = make_script()
    state = gen(tmp_path).run()
    out = write_package(script, state, tmp_path / "job", tmp_path / "book.lantern-audio")
    with zipfile.ZipFile(out) as z:
        names = z.namelist()
        assert names[0] == "manifest.json"
        assert all(i.compress_type == zipfile.ZIP_STORED for i in z.infolist())
        m = json.loads(z.read("manifest.json"))
    assert m["format"] == "lantern-audiobook" and m["complete"] is True
    assert m["book"]["contentId"] == script["book"]["contentId"]
    assert [s["id"] for s in m["sections"]] == ["ch1", "ch2"]
    for s in m["sections"]:
        assert s["file"] in names
    assert m["sections"][0]["segments"][1]["text"] == "It was a bright cold day."
    assert not (tmp_path / "book.lantern-audio.partial").exists()


def test_partial_book_is_marked_incomplete_and_text_can_be_omitted(tmp_path):
    script = make_script()
    state = gen(tmp_path, selection="1").run()
    m = build_manifest(script, state, include_text=False)
    assert m["complete"] is False
    assert "text" not in m["sections"][0]["segments"][0]


def test_script_validation_rejects_wrong_format():
    bad = copy.deepcopy(make_script())
    bad["format"] = "something-else"
    with pytest.raises(ScriptError):
        validate(bad)


# ── loudness ────────────────────────────────────────────────────────────────

def _tone(db, sr=24000, seconds=4.0):
    t = np.arange(int(sr * seconds)) / sr
    return (A.db_to_amp(db) * np.sin(2 * np.pi * 997 * t)).astype(np.float32)


@pytest.mark.parametrize("level", [-24.0, -16.0, -6.0])
def test_normalize_hits_target_loudness(level):
    sr = 24000
    y, _ = A.normalize(_tone(level, sr), sr)
    assert A.integrated_loudness(y, sr) == pytest.approx(A.TARGET_LUFS, abs=0.6)
    assert np.abs(y).max() <= A.PEAK_CEILING + 1e-4


def test_gain_is_capped_for_near_silent_input():
    sr = 24000
    _, gain = A.normalize(_tone(-70.0, sr), sr)
    assert gain <= 12.0 + 1e-6


def test_limiter_keeps_peaks_under_ceiling_without_touching_quiet_parts():
    sr = 24000
    x = _tone(-20.0, sr)
    x[sr: sr + 200] = 1.5  # a click
    y = A.peak_limit(x, sr)
    assert np.abs(y).max() <= A.PEAK_CEILING + 1e-4
    assert np.allclose(y[3 * sr:], x[3 * sr:], atol=1e-6)


def test_trim_silence_removes_padding():
    sr = 24000
    pcm = FakeEngine(sr).synthesize("hello there", "tone")
    trimmed = A.trim_silence(pcm, sr)
    assert len(trimmed) < len(pcm)
    assert len(trimmed) > len(pcm) - int(0.2 * sr)
