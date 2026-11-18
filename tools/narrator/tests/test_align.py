"""Word alignment: verbalising, the CTC Viterbi, confidence checks and packaging (no model download)."""
from __future__ import annotations

import json
import zipfile

import numpy as np
import pytest

from lantern_narrator import align as AL
from lantern_narrator import generate as G
from lantern_narrator.engines.fake import FakeEngine
from lantern_narrator.package import build_manifest, write_package


# ── verbalize ───────────────────────────────────────────────────────────────
@pytest.mark.parametrize("word,said", [
    ("Bennet", "bennet"),
    ("I’m", "i'm"),
    ("Mr", "mister"),
    ("1813", "eighteen thirteen"),
    ("1900", "nineteen hundred"),
    ("2005", "two thousand five"),
    ("42", "forty two"),
    ("3.14", "three point one four"),
    ("21st", "twenty first"),
    ("12th", "twelfth"),
    ("10,000", "ten thousand"),
    ("Café", "cafe"),
    ("over-scrupulous", "over scrupulous"),
    ("", ""),
])
def test_verbalize(word, said):
    assert AL.verbalize(word) == said


# ── Viterbi ─────────────────────────────────────────────────────────────────
def planned_log_probs(path: list[int], vocab: int, sure: float = 0.9) -> np.ndarray:
    """Frame-by-frame probabilities that put `sure` on the planned token."""
    p = np.full((len(path), vocab), (1 - sure) / (vocab - 1))
    for t, tok in enumerate(path):
        p[t, tok] = sure
    return np.log(p)


def test_forced_align_recovers_planned_spans():
    # tokens 1 2 2 3 with blanks between, including the blank that separates the repeated 2s
    path = [0, 1, 1, 0, 2, 0, 0, 2, 2, 3, 0]
    spans = AL.forced_align(planned_log_probs(path, 5), [1, 2, 2, 3])
    assert spans.tolist() == [[1, 2], [4, 4], [7, 8], [9, 9]]


def test_forced_align_refuses_audio_shorter_than_the_letters():
    assert AL.forced_align(planned_log_probs([1, 2], 5), [1, 2, 3]) is None


# ── Aligner with a planned emitter ──────────────────────────────────────────
class PlannedEmitter:
    """Pretends to hear exactly the letters it was asked about, spread evenly, unless told to be unsure."""
    blank = 0
    frame_s = 0.02

    def __init__(self, sure: float = 0.9):
        self.sure = sure
        self.letters = {ch: i + 1 for i, ch in enumerate("abcdefghijklmnopqrstuvwxyz'")}
        self.requested: list[int] = []

    def info(self):
        return "planned/test"

    def tokens(self, letters):
        toks = [self.letters[c] for c in letters if c != " "]
        self.requested += toks
        return toks

    def emissions(self, pcm, sr):
        toks, self.requested = self.requested, []
        frames = int(len(pcm) / sr / self.frame_s)
        per = frames // (len(toks) + 1)
        path = [0] * frames
        for i, tok in enumerate(toks):
            path[(i + 1) * per] = tok
        return planned_log_probs(path, len(self.letters) + 1, self.sure)


def words_of(text):
    out, i = [], 0
    for w in text.split(" "):
        out.append({"s": i, "e": i + len(w), "sp": w.strip(".,")})
        i += len(w) + 1
    return out


def test_aligner_gives_ordered_word_times():
    words = words_of("It was a bright cold day.")
    res = AL.Aligner(PlannedEmitter()).align_segment(np.zeros(24000 * 2, np.float32), 24000, words)
    assert res.times is not None and len(res.times) == len(words)
    starts = [t[0] for t in res.times]
    assert starts == sorted(starts) and starts[0] > 0
    for t0, t1 in res.times:
        assert t1 > t0
    assert res.mean_prob > 0.8


def test_aligner_skips_unspoken_words():
    words = words_of("A note here.")
    words.insert(1, {"s": 1, "e": 5, "sp": ""})  # e.g. a footnote marker
    res = AL.Aligner(PlannedEmitter()).align_segment(np.zeros(24000, np.float32), 24000, words)
    assert res.times[1] is None and res.times[0] and res.times[2]


def test_aligner_rejects_low_confidence():
    res = AL.Aligner(PlannedEmitter(sure=0.1)).align_segment(np.zeros(24000 * 2, np.float32), 24000, words_of("It was cold."))
    assert res.times is None and "confidence" in res.reason


# ── in the generator and the package ────────────────────────────────────────
def worded_script():
    def seg(sid, block, text, kind="sentence"):
        return {"id": sid, "blockId": block, "start": 0, "end": len(text), "text": text, "spoken": text,
                "kind": kind, "pauseAfterMs": 260, "words": words_of(text)}
    return {
        "format": "lantern-narration-script", "version": 1,
        "book": {"contentId": "sha256:" + "cd" * 32, "title": "Worded", "author": "A. Writer", "language": "en",
                 "wordsVersion": 1},
        "sections": [
            {"id": "ch1", "order": 1, "title": "Chapter 1", "narrate": True,
             "segments": [seg("b0.0", "b0", "Chapter one.", "heading"), seg("b1.0", "b1", "It was a bright cold day."),
                          seg("b1.1", "b1", "The clocks were striking thirteen.")]},
        ],
    }


@pytest.fixture(autouse=True)
def no_retry_sleep(monkeypatch):
    monkeypatch.setattr(G.time, "sleep", lambda s: None)


def test_generator_writes_sidecars_and_the_package_carries_them(tmp_path):
    script = worded_script()
    g = G.Generator(script, FakeEngine(), "tone", job_dir=tmp_path / "job", aligner=AL.Aligner(PlannedEmitter()))
    state = g.run()
    w = state["sections"]["ch1"]["words"]
    assert w["aligned"] == w["total"] == 3 and w["aligner"] == "planned/test"
    side = json.loads((tmp_path / "job" / w["file"]).read_text())
    assert side["format"] == AL.SIDECAR_FORMAT and side["sectionId"] == "ch1"
    seg_times = {t["id"]: t for t in state["sections"]["ch1"]["segments"]}
    for sid, ws in side["segments"].items():
        assert all(isinstance(v, int) for row in ws for v in row)
        assert seg_times[sid]["t0"] * 1000 <= ws[0][2] and ws[-1][3] <= seg_times[sid]["t1"] * 1000 + 300
    assert "It was" not in json.dumps(side)  # offsets and milliseconds only, never text

    manifest = build_manifest(script, state)
    assert manifest["timings"] == {"words": True, "wordsVersion": 1, "aligner": "planned/test", "coverage": 1.0}
    assert manifest["sections"][0]["wordTimings"] == w["file"]
    pkg = write_package(script, state, tmp_path / "job", tmp_path / "out.lantern-audio")
    with zipfile.ZipFile(pkg) as z:
        assert w["file"] in z.namelist()
        assert z.getinfo(w["file"]).compress_type == zipfile.ZIP_STORED


def test_a_failed_sentence_is_left_out_not_guessed(tmp_path):
    class Picky(AL.Aligner):
        def align_segment(self, pcm, sr, words):
            if words[0]["sp"] == "The":
                return AL.SegmentResult(None, "low confidence (0.10)")
            return super().align_segment(pcm, sr, words)
    state = G.Generator(worded_script(), FakeEngine(), "tone", job_dir=tmp_path / "job",
                        aligner=Picky(PlannedEmitter())).run()
    w = state["sections"]["ch1"]["words"]
    assert (w["aligned"], w["total"]) == (2, 3) and w["misses"][0]["id"] == "b1.1"
    side = json.loads((tmp_path / "job" / w["file"]).read_text())
    assert "b1.1" not in side["segments"]
    assert build_manifest(worded_script(), state)["timings"]["coverage"] == round(2 / 3, 3)


def test_chapters_made_earlier_get_word_timings_without_regenerating(tmp_path):
    engine = FakeEngine()
    G.Generator(worded_script(), engine, "tone", job_dir=tmp_path / "job").run()
    calls = engine.calls
    state = G.Generator(worded_script(), engine, "tone", job_dir=tmp_path / "job",
                        aligner=AL.Aligner(PlannedEmitter())).run()
    assert engine.calls == calls  # nothing re-synthesised
    assert state["sections"]["ch1"]["words"]["aligned"] == 3
    again = G.Generator(worded_script(), engine, "tone", job_dir=tmp_path / "job", aligner=AL.Aligner(PlannedEmitter()))
    assert not again.needs_words(worded_script()["sections"][0])


def test_scripts_without_words_are_left_alone(tmp_path):
    script = worded_script()
    for seg in script["sections"][0]["segments"]:
        del seg["words"]
    state = G.Generator(script, FakeEngine(), "tone", job_dir=tmp_path / "job", aligner=AL.Aligner(PlannedEmitter())).run()
    assert "words" not in state["sections"]["ch1"]
    assert "timings" not in build_manifest(script, state)


# ── regressions found on the first real run (M5 Pro, 2026-11-18) ────────────
def test_forced_align_handles_sentences_longer_than_int8():
    # 150 letters: backtrace state indices go past 127 (NumPy 2 kept them int8 and overflowed)
    targets = [(i % 4) + 1 for i in range(150)]
    path = [0]
    for tok in targets:
        path += [tok, 0]
    spans = AL.forced_align(planned_log_probs(path, 6), targets)
    assert spans is not None and spans.shape == (150, 2)
    assert spans[:, 0].tolist() == list(range(1, 2 * 150, 2))


def test_real_emitter_loads_its_vocabulary_before_tokenising():
    class Lazy(AL.Wav2Vec2Emitter):
        loads = 0

        def load(self):
            if self._model is None:
                Lazy.loads += 1
                self._model = object()
                self.vocab = {"a": 7, "'": 27}
                self.blank = 0

    e = Lazy()
    assert e.tokens("a a'") == [7, 7, 27]  # called before emissions(), as Aligner does
    assert Lazy.loads == 1


def test_words_off_leaves_timings_out_of_the_package(tmp_path):
    script = worded_script()
    state = G.Generator(script, FakeEngine(), "tone", job_dir=tmp_path / "job", aligner=AL.Aligner(PlannedEmitter())).run()
    m = build_manifest(script, state, include_words=False)
    assert "timings" not in m and "wordTimings" not in m["sections"][0]
    pkg = write_package(script, state, tmp_path / "job", tmp_path / "plain.lantern-audio", include_words=False)
    with zipfile.ZipFile(pkg) as z:
        assert not [n for n in z.namelist() if n.startswith("timings/")]
