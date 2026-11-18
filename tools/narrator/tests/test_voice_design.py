"""Designed voices: takes, keeping one, provenance checks, and narrating with it."""
from __future__ import annotations

import json

import numpy as np
import pytest

from lantern_narrator import cli, storage
from lantern_narrator import generate as G
from lantern_narrator import voice_design as VD
from lantern_narrator.engines import create_engine
from lantern_narrator.engines.base import EngineUnavailable
from lantern_narrator.engines.designed import DesignedVoiceEngine
from lantern_narrator.package import build_manifest

from test_generate import make_script
from test_hardware_storage import narrator_home  # noqa: F401


def fake_designer(text, description, seed):
    sr = 24000
    t = np.arange(int(sr * 1.5), dtype=np.float32) / sr
    return (0.2 * np.sin(2 * np.pi * (150 + seed % 50) * t)).astype(np.float32), sr


def fake_backend(calls):
    def backend(text, ref_path, ref_text):
        calls.append((text, ref_path, ref_text))
        return np.full(int(24000 * max(0.2, len(text) / 15)), 0.1, dtype=np.float32)
    return backend


@pytest.fixture(autouse=True)
def no_retry_sleep(monkeypatch):
    monkeypatch.setattr(G.time, "sleep", lambda s: None)


def make_voice(name="Margaret", keep=2):
    VD.design(name, "warm, low British woman in her fifties", fake_designer, takes=3, seed=10, encode=False)
    return VD.keep(name, keep) if keep else None


def test_design_writes_takes_and_keep_makes_a_ready_voice(narrator_home):
    takes = VD.design("Margaret", "warm, low British woman in her fifties", fake_designer, takes=3, seed=1, encode=False)
    assert [p.name for p in takes] == ["take-1.wav", "take-2.wav", "take-3.wav"]
    with pytest.raises(VD.VoiceError, match="no kept take"):
        VD.load("Margaret")
    v = VD.keep("Margaret", 2)
    meta = json.loads((narrator_home / "voices" / "margaret" / "voice.json").read_text())
    assert meta["origin"] == VD.ORIGIN and meta["keptTake"] == 2 and meta["referenceSha256"] == v.reference_sha256
    assert VD.list_all()[0]["status"] == "ready"


def test_redesign_replaces_takes_but_keeps_the_voice_usable(narrator_home):
    v1 = make_voice()
    VD.design("Margaret", "warm, low British woman, a little brighter", fake_designer, takes=2, seed=99, encode=False)
    # Books keep using the kept reference (and its original description) until a new take is kept.
    still = VD.load("Margaret")
    assert still.reference_sha256 == v1.reference_sha256 and still.description == v1.description
    v2 = VD.keep("Margaret", 1)
    assert v2.reference_sha256 != v1.reference_sha256 and "brighter" in v2.description


def test_a_swapped_reference_or_foreign_voice_is_refused(narrator_home):
    make_voice()
    folder = narrator_home / "voices" / "margaret"
    (folder / "reference.wav").write_bytes(b"RIFF not ours")
    with pytest.raises(VD.VoiceError, match="doesn't match"):
        VD.load("Margaret")
    meta = json.loads((folder / "voice.json").read_text())
    meta["origin"] = "somewhere-else"
    (folder / "voice.json").write_text(json.dumps(meta))
    with pytest.raises(VD.VoiceError, match="not designed by Lantern"):
        VD.load("Margaret")


def test_bad_inputs_are_rejected(narrator_home):
    with pytest.raises(VD.VoiceError):
        VD.design("!!!", "warm, low British woman", fake_designer)
    with pytest.raises(VD.VoiceError, match="Describe"):
        VD.design("Ann", "warm", fake_designer)
    make_voice(keep=None)
    with pytest.raises(VD.VoiceError, match="no take 7"):
        VD.keep("Margaret", 7)


def test_engine_lists_ready_voices_and_clones_the_kept_reference(narrator_home):
    v = make_voice()
    calls = []
    eng = DesignedVoiceEngine(backend=fake_backend(calls))
    assert [x.id for x in eng.voices()] == ["Margaret"] and eng.default_voice == "Margaret"
    state = G.Generator(make_script(), eng, "Margaret").run()
    assert calls and all(c[1] == str(v.reference) and c[2] == VD.REFERENCE_TEXT for c in calls)
    m = build_manifest(make_script(), state, include_text=False)
    assert m["narration"]["voice"] == "Margaret"
    assert m["narration"]["voiceInfo"]["designed"] is True
    assert m["narration"]["voiceInfo"]["referenceSha256"] == v.reference_sha256


def test_keeping_another_take_invalidates_the_cache(narrator_home):
    make_voice(keep=1)
    eng = DesignedVoiceEngine(backend=fake_backend([]))
    first = G.Generator(make_script(), eng, "Margaret")
    VD.keep("Margaret", 3)
    second = G.Generator(make_script(), DesignedVoiceEngine(backend=fake_backend([])), "Margaret")
    assert first.voice_key != second.voice_key and first.job_dir != second.job_dir


def test_engine_refuses_unknown_or_missing_voice(narrator_home):
    eng = DesignedVoiceEngine(backend=fake_backend([]))
    with pytest.raises(EngineUnavailable, match="No designed voice"):
        G.Generator(make_script(), eng, "")
    with pytest.raises(EngineUnavailable, match="No designed voice called"):
        G.Generator(make_script(), eng, "Nobody")


def test_cli_design_list_keep_and_clean(narrator_home, capsys):
    make_voice(keep=None)
    assert cli.main(["design", "--list"]) == 0
    assert "Margaret" in capsys.readouterr().out
    assert cli.main(["design", "--name", "Margaret", "--keep", "1"]) == 0
    assert "--engine qwen3-designed" in capsys.readouterr().out
    assert create_engine("qwen3-designed").id == "qwen3-designed"
    storage.clean(["voices"])
    assert not (narrator_home / "voices").exists()
