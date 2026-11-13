"""Default engine per machine, per-book voice memory, style instructions and auditions."""
from __future__ import annotations

import json

import pytest

from lantern_narrator import books, cli, storage
from lantern_narrator import generate as G
from lantern_narrator.engines.fake import FakeEngine
from lantern_narrator.hardware import default_engine
from lantern_narrator.package import build_manifest

from test_generate import make_script  # noqa: E402  (shared fixture data)
from test_hardware_storage import hw, narrator_home  # noqa: F401  (fixture re-export)


class StyledFake(FakeEngine):
    supports_style = True

    def __init__(self):
        super().__init__()
        self.seen_styles = []

    def synthesize(self, text, voice, speed=1.0):
        self.seen_styles.append(self.style)
        return super().synthesize(text, voice, speed)


@pytest.fixture(autouse=True)
def no_retry_sleep(monkeypatch):
    monkeypatch.setattr(G.time, "sleep", lambda s: None)


@pytest.fixture
def script_file(tmp_path):
    p = tmp_path / "book.script.json"
    p.write_text(json.dumps(make_script()), encoding="utf-8")
    return p


def test_default_engine_is_qwen_large_on_a_big_apple_silicon_mac_only():
    assert default_engine(hw(48)) == "qwen3-1.7b"
    assert default_engine(hw(16)) == "kokoro"
    assert default_engine(hw(48, apple_silicon=False)) == "kokoro"


def test_choice_is_remembered_per_book_and_flags_win(narrator_home):
    cid = "sha256:" + "cd" * 32
    first = cli.resolve_choice(cid, None, None, None, None, hw=hw(48))
    assert first["engine"] == "qwen3-1.7b" and first["voice"] == "" and not first["remembered"]
    books.remember(cid, "A Book", engine="qwen3-1.7b", voice="Aiden", style="calm", speed=0.95)
    again = cli.resolve_choice(cid, None, None, None, None, hw=hw(16))
    assert again == {"engine": "qwen3-1.7b", "voice": "Aiden", "style": "calm", "speed": 0.95, "remembered": True}
    other = cli.resolve_choice(cid, "kokoro", None, None, None, hw=hw(48))
    assert other["engine"] == "kokoro" and other["voice"] == "" and other["style"] == ""
    cleared = cli.resolve_choice(cid, None, None, "", None, hw=hw(48))
    assert cleared["style"] == ""
    assert books.get("sha256:" + "ef" * 32) == {}
    assert "Aiden" in (narrator_home / "books.json").read_text()


def test_style_changes_cache_key_and_reaches_engine(tmp_path, narrator_home):
    plain = G.Generator(make_script(), StyledFake(), "tone")
    eng = StyledFake()
    styled = G.Generator(make_script(), eng, "tone", style="warm, unhurried narration")
    assert plain.job_dir != styled.job_dir and plain.voice_key == "tone"
    state = styled.run()
    assert set(eng.seen_styles) == {"warm, unhurried narration"}
    m = build_manifest(make_script(), state, include_text=False)
    assert m["narration"]["style"] == "warm, unhurried narration" and m["narration"]["voice"] == "tone"


def test_style_is_refused_by_engines_that_cannot_take_it(narrator_home):
    with pytest.raises(ValueError, match="style"):
        G.Generator(make_script(), FakeEngine(), "tone", style="warm")


def test_generate_remembers_and_reuses_the_books_voice(script_file, narrator_home, capsys):
    assert cli.main(["generate", str(script_file), "--engine", "fake", "--voice", "tone", "--speed", "1.1"]) == 0
    saved = books.get(make_script()["book"]["contentId"])
    assert saved["engine"] == "fake" and saved["voice"] == "tone" and saved["speed"] == 1.1
    capsys.readouterr()
    assert cli.main(["generate", str(script_file)]) == 0
    out = capsys.readouterr().out
    assert "Test tone" in out and "saved choice" in out and "speed 1.1" in out


def test_audition_reads_the_opening_in_each_voice(script_file, narrator_home, tmp_path):
    out = tmp_path / "aud"
    assert cli.main(["audition", str(script_file), "--engine", "fake", "--voices", "tone,other", "-o", str(out)]) == 0
    files = sorted(p.name for p in out.iterdir())
    assert len(files) == 2 and all(f.startswith("fake-") for f in files)
    segs = cli.audition_text(make_script(), max_chars=5)
    assert [s["id"] for s in segs] == ["b0.0"]  # first narrated chapter, never front matter
    assert all(s["text"] != "All rights reserved." for s in cli.audition_text(make_script(), 10_000))


def test_clean_can_forget_saved_choices(narrator_home):
    books.remember("sha256:x", "T", engine="kokoro", voice="af_heart")
    assert (narrator_home / "books.json").exists()
    storage.clean(["choices"])
    assert not (narrator_home / "books.json").exists()
