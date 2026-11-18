"""Word timings for the follow-along transcript (docs/TRANSCRIPT.md §4).

After a chapter is synthesised we know exactly what each sentence says, so
word times come from *forced alignment*: a small speech model scores every
audio frame against every letter, and a Viterbi pass finds the best path
through the known words. Nothing here guesses. A sentence whose alignment
looks wrong is dropped, and Lantern shows that sentence at sentence level.

Pieces:

- ``verbalize`` turns a word as the engine was asked to say it ("1813",
  "Mr", "over-scrupulous") into the letters the model hears.
- ``forced_align`` is a plain numpy CTC Viterbi (no torchaudio, whose aligner
  is deprecated, and no MMS weights, which are CC-BY-NC).
- ``Wav2Vec2Emitter`` produces per-frame letter probabilities with
  ``facebook/wav2vec2-base-960h`` (Apache-2.0, ~360 MB, English). It loads
  lazily and downloads into the narrator folder's ``hf-cache``.
- ``Aligner`` ties them together and applies the confidence checks.

The sidecar a chapter gets (``timings/<section>.words.json``) holds offsets
into the book's own text and milliseconds, never text.
"""
from __future__ import annotations

import json
import os
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import numpy as np

SIDECAR_FORMAT = "lantern-word-timings"
SIDECAR_VERSION = 1
MODEL_SR = 16000

# A sentence is kept only if the model was reasonably sure of the letters it
# placed, and no word came out impossibly short or long.
MIN_MEAN_PROB = 0.35
MIN_WORD_S = 0.03
MAX_WORD_S = 2.5


# ── words → letters ─────────────────────────────────────────────────────────
ABBREVIATIONS = {
    "mr": "mister", "mrs": "missus", "ms": "miz", "dr": "doctor", "st": "saint", "mt": "mount",
    "jr": "junior", "sr": "senior", "vs": "versus", "etc": "et cetera", "no": "no", "esq": "esquire",
    "capt": "captain", "col": "colonel", "gen": "general", "lt": "lieutenant", "rev": "reverend",
    "sgt": "sergeant", "prof": "professor",
}
ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
ORDINAL = {"one": "first", "two": "second", "three": "third", "five": "fifth", "eight": "eighth", "nine": "ninth", "twelve": "twelfth"}


def number_words(n: int) -> str:
    if n < 20:
        return ONES[n]
    if n < 100:
        return TENS[n // 10] + ("" if n % 10 == 0 else " " + ONES[n % 10])
    if n < 1000:
        return ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + number_words(n % 100))
    for size, name in ((10**9, "billion"), (10**6, "million"), (1000, "thousand")):
        if n >= size:
            rest = n % size
            return number_words(n // size) + " " + name + ("" if rest == 0 else " " + number_words(rest))
    return str(n)


def year_words(n: int) -> str:
    """1813 → eighteen thirteen; 1900 → nineteen hundred; 2005 → two thousand five."""
    hi, lo = divmod(n, 100)
    if 2000 <= n < 2010:
        return number_words(n)
    if lo == 0:
        return number_words(hi) + " hundred"
    return number_words(hi) + " " + ("oh " + ONES[lo] if lo < 10 else number_words(lo))


def ordinal_words(n: int) -> str:
    w = number_words(n).split()
    last = w[-1]
    if last in ORDINAL:
        w[-1] = ORDINAL[last]
    elif last.endswith("y"):
        w[-1] = last[:-1] + "ieth"
    else:
        w[-1] = last + "th"
    return " ".join(w)


def verbalize(word: str) -> str:
    """What a narrator says for ``word``, as lowercase letters, apostrophes and spaces."""
    w = unicodedata.normalize("NFKD", word.replace("’", "'")).encode("ascii", "ignore").decode().lower()
    if w.strip(".") in ABBREVIATIONS:
        return ABBREVIATIONS[w.strip(".")]
    m = re.fullmatch(r"(\d+)(st|nd|rd|th)", w)
    if m:
        return ordinal_words(int(m.group(1)))
    if re.fullmatch(r"\d{1,3}(,\d{3})+", w):
        w = w.replace(",", "")
    if re.fullmatch(r"\d+\.\d+", w):
        whole, frac = w.split(".")
        return number_words(int(whole)) + " point " + " ".join(ONES[int(d)] for d in frac)
    if re.fullmatch(r"\d+", w):
        n = int(w)
        if len(w) == 4 and 1100 <= n <= 2099 and n % 1000 >= 10:
            return year_words(n)
        return number_words(n) if n < 10**12 else " ".join(ONES[int(d)] for d in w)
    # letters and digits mixed (e.g. "B2"): spell digits, keep letters
    w = re.sub(r"\d", lambda d: " " + ONES[int(d.group())] + " ", w)
    w = re.sub(r"[^a-z' ]+", " ", w)
    return re.sub(r"\s+", " ", w).strip()


# ── CTC forced alignment ────────────────────────────────────────────────────
def forced_align(log_probs: np.ndarray, targets: list[int], blank: int = 0) -> np.ndarray | None:
    """Viterbi through the CTC trellis.

    Returns, for each target token, the frame where it is first emitted and the
    last frame it covers: an array of shape (len(targets), 2). ``None`` when the
    audio is too short for the letters.
    """
    T, _ = log_probs.shape
    L = len(targets)
    if L == 0 or T < L:
        return None
    S = 2 * L + 1
    ext = np.full(S, blank, dtype=np.int64)
    ext[1::2] = targets
    NEG = -1e30
    score = np.full(S, NEG)
    back = np.zeros((T, S), dtype=np.int8)  # 0 stay, 1 from s-1, 2 from s-2
    score[0] = log_probs[0, blank]
    score[1] = log_probs[0, ext[1]]
    can_skip = np.zeros(S, dtype=bool)
    can_skip[3::2] = ext[3::2] != ext[1:-2:2]
    for t in range(1, T):
        prev1 = np.concatenate(([NEG], score[:-1]))
        prev2 = np.concatenate(([NEG, NEG], score[:-2]))
        prev2 = np.where(can_skip, prev2, NEG)
        stacked = np.stack([score, prev1, prev2])
        choice = stacked.argmax(axis=0)
        score = stacked[choice, np.arange(S)] + log_probs[t, ext]
        back[t] = choice
    s = S - 1 if score[S - 1] >= score[S - 2] else S - 2
    if score[s] <= NEG / 2:
        return None
    states = np.empty(T, dtype=np.int64)
    for t in range(T - 1, -1, -1):
        states[t] = s
        s -= int(back[t, s])  # back is int8; NumPy 2 would keep int8 and overflow on long sentences
    spans = np.full((L, 2), -1, dtype=np.int64)
    for t, st in enumerate(states):
        if st % 2 == 1:
            k = st // 2
            if spans[k, 0] < 0:
                spans[k, 0] = t
            spans[k, 1] = t
    if (spans < 0).any():
        return None
    return spans


# ── model ───────────────────────────────────────────────────────────────────
class Wav2Vec2Emitter:
    """Letter probabilities per 20 ms frame from wav2vec2 (English)."""

    id = "wav2vec2-ctc"
    model = "facebook/wav2vec2-base-960h"
    license = "Apache-2.0"

    def __init__(self, device: str | None = None):
        self.device = device
        self._model = None

    @staticmethod
    def available() -> bool:
        try:
            import torch  # noqa: F401
            import transformers  # noqa: F401
            return True
        except ImportError:
            return False

    def load(self):
        if self._model is not None:
            return
        from .paths import isolate_caches
        isolate_caches()
        import torch
        from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor
        self._torch = torch
        self._proc = Wav2Vec2Processor.from_pretrained(self.model)
        self._model = Wav2Vec2ForCTC.from_pretrained(self.model).eval()
        dev = self.device or ("mps" if torch.backends.mps.is_available() else "cpu")
        self._model.to(dev)
        self._dev = dev
        vocab = self._proc.tokenizer.get_vocab()
        self.blank = vocab.get("<pad>", 0)
        self.space = vocab.get("|")
        self.vocab = {k.lower(): v for k, v in vocab.items() if len(k) == 1}
        self.frame_s = 320 / MODEL_SR

    def emissions(self, pcm: np.ndarray, sr: int) -> np.ndarray:
        self.load()
        x = resample(pcm, sr, MODEL_SR)
        torch = self._torch
        with torch.inference_mode():
            inp = self._proc(x, sampling_rate=MODEL_SR, return_tensors="pt").input_values.to(self._dev)
            logits = self._model(inp).logits[0].float().cpu().numpy()
        return log_softmax(logits)

    def tokens(self, letters: str) -> list[int] | None:
        self.load()  # the vocabulary comes with the model
        out = []
        for ch in letters:
            if ch == " ":
                continue
            if ch not in self.vocab:
                return None
            out.append(self.vocab[ch])
        return out

    def info(self) -> str:
        return f"{self.id}/{self.model.split('/')[-1]}"


def resample(x: np.ndarray, sr: int, target: int) -> np.ndarray:
    if sr == target:
        return x.astype(np.float32)
    n = int(round(len(x) * target / sr))
    t = np.linspace(0, len(x) - 1, n)
    return np.interp(t, np.arange(len(x)), x).astype(np.float32)


def log_softmax(z: np.ndarray) -> np.ndarray:
    z = z - z.max(axis=-1, keepdims=True)
    return z - np.log(np.exp(z).sum(axis=-1, keepdims=True))


# ── sentence → word times ───────────────────────────────────────────────────
@dataclass
class SegmentResult:
    times: list[tuple[float, float] | None] | None  # per word, seconds within the clip
    reason: str = ""
    mean_prob: float = 0.0


class Aligner:
    """Align a sentence's words to its audio clip, or say why not."""

    def __init__(self, emitter):
        self.emitter = emitter

    def info(self) -> str:
        return self.emitter.info()

    def align_segment(self, pcm: np.ndarray, sr: int, words: list[dict]) -> SegmentResult:
        spoken = [(k, verbalize(w.get("sp") or "")) for k, w in enumerate(words)]
        spoken = [(k, v) for k, v in spoken if v]
        if not spoken:
            return SegmentResult(None, "nothing spoken")
        targets, owner = [], []
        for k, v in spoken:
            toks = self.emitter.tokens(v)
            if not toks:
                return SegmentResult(None, f"no letters for {v!r}")
            targets += toks
            owner += [k] * len(toks)
        lp = self.emitter.emissions(pcm, sr)
        spans = forced_align(lp, targets, self.emitter.blank)
        if spans is None:
            return SegmentResult(None, "audio too short for the words")
        frame_s = self.emitter.frame_s
        probs = np.exp([lp[spans[i, 0], targets[i]] for i in range(len(targets))])
        mean_prob = float(probs.mean())
        times: list[tuple[float, float] | None] = [None] * len(words)
        firsts, lasts = {}, {}
        for i, k in enumerate(owner):
            firsts.setdefault(k, spans[i, 0])
            lasts[k] = spans[i, 1]
        ks = [k for k, _ in spoken]
        for n, k in enumerate(ks):
            t0 = firsts[k] * frame_s
            # A word lasts until the next one starts (CTC marks letters as short spikes),
            # but not across a pause longer than a breath.
            t_last = (lasts[k] + 1) * frame_s
            t_next = firsts[ks[n + 1]] * frame_s if n + 1 < len(ks) else t_last
            t1 = t_next if t_next - t_last < 0.25 else t_last + 0.08
            times[k] = (round(t0, 3), round(max(t1, t0 + MIN_WORD_S), 3))
        durations = [t[1] - t[0] for t in times if t]
        if mean_prob < MIN_MEAN_PROB:
            return SegmentResult(None, f"low confidence ({mean_prob:.2f})", mean_prob)
        if max(durations) > MAX_WORD_S:
            return SegmentResult(None, "a word ran implausibly long", mean_prob)
        return SegmentResult(times, "", mean_prob)


# ── sidecars ────────────────────────────────────────────────────────────────
def sidecar_name(section_id: str) -> str:
    return f"timings/{re.sub(r'[^A-Za-z0-9._-]+', '-', section_id)}.words.json"


def align_section(aligner: Aligner, pcm: np.ndarray, sr: int, segments: list[dict], timings: list[dict],
                  words_version: int | None = None) -> tuple[dict, dict]:
    """Word timings for a whole chapter. ``timings`` are the generator's per-segment t0/t1.

    Returns (sidecar, summary). Times in the sidecar are milliseconds from the
    start of the chapter file; each word is ``[start, end, t0ms, t1ms]`` with
    start/end as offsets into its block's text.
    """
    by_id = {t["id"]: t for t in timings}
    out, total, aligned, misses = {}, 0, 0, []
    for seg in segments:
        words = seg.get("words") or []
        t = by_id.get(seg["id"])
        if not words or not t:
            continue
        total += 1
        a, b = int(t["t0"] * sr), int(t["t1"] * sr)
        res = aligner.align_segment(pcm[a:b], sr, words)
        if res.times is None:
            misses.append({"id": seg["id"], "reason": res.reason})
            continue
        aligned += 1
        base = t["t0"]
        out[seg["id"]] = [[w["s"], w["e"], round((base + tt[0]) * 1000), round((base + tt[1]) * 1000)]
                          for w, tt in zip(words, res.times) if tt]
    sidecar = {
        "format": SIDECAR_FORMAT,
        "version": SIDECAR_VERSION,
        "wordsVersion": words_version,
        "aligner": aligner.info(),
        "segments": out,
    }
    return sidecar, {"aligned": aligned, "total": total, "misses": misses[:20]}


def write_sidecar(path: Path, sidecar: dict) -> None:
    """Compact JSON (phones read these), written via a temp file so a crash leaves no half file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".partial")
    tmp.write_text(json.dumps(sidecar, separators=(",", ":")), encoding="utf-8")
    os.replace(tmp, path)


def script_has_words(script: dict) -> bool:
    return any(seg.get("words") for s in script.get("sections", []) for seg in s.get("segments", []))
