"""Designed voices: describe a voice in words, keep the take you like, narrate with it.

Qwen3-TTS VoiceDesign invents the voice again on every call, so a whole book
read with it would drift. Instead (Qwen's own recommendation):

1. `lantern-narrate design "warm, low British woman..." --name Margaret`
   renders a few takes of one fixed reference passage with VoiceDesign.
2. `lantern-narrate design --name Margaret --keep 2` makes take 2 the voice.
3. The `qwen3-designed` engine (Qwen3-TTS Base) clones that reference clip
   for every sentence, so the voice stays the same for the whole book.

Policy (John, Session 164): Lantern clones **only voices it designed itself**.
No command takes an arbitrary recording. Each voice folder records where its
reference came from and the reference's SHA-256, and the engine refuses a
voice whose provenance or hash doesn't check out. This guards against mistakes
(a stray recording dropped into the folder); it is not tamper-proofing.

Layout: <narrator home>/voices/<slug>/
    voice.json        name, description, origin, takes, chosen take, referenceSha256
    takes/take-N.wav  (and .m4a for listening on a phone)
    reference.wav     the kept take
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

import numpy as np

from . import audio as A
from .paths import home

ORIGIN = "lantern-voicedesign"
DESIGN_MODEL = "mlx-community/Qwen3-TTS-12Hz-1.7B-VoiceDesign-bf16"

# Written for Lantern (no copyright). About 12 seconds: varied vowels and
# consonants, a question and a pause, so the clone has enough to go on.
REFERENCE_TEXT = (
    "The lamps were already lit along the harbour when the evening drew in. "
    "She paused at the corner and listened to the rain. Would anyone, she wondered, "
    "still remember the name of the ship?"
)

# A designer renders (text, description, seed) -> (mono float32 pcm, sample rate).
Designer = Callable[[str, str, int], "tuple[np.ndarray, int]"]


class VoiceError(ValueError):
    pass


def voices_dir() -> Path:
    return home() / "voices"


def slug(name: str) -> str:
    s = "".join(c if c.isalnum() else "-" for c in name.strip()).strip("-").lower()
    while "--" in s:
        s = s.replace("--", "-")
    if not s:
        raise VoiceError("Give the voice a name made of letters or digits.")
    return s[:40]


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(suffix=".json", dir=path.parent)
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


@dataclass
class DesignedVoice:
    name: str
    folder: Path
    description: str
    reference: Path
    reference_text: str
    reference_sha256: str

    @property
    def cache_key(self) -> str:
        return f"{self.name}#{self.reference_sha256[:12]}"


def _meta_path(name: str) -> Path:
    return voices_dir() / slug(name) / "voice.json"


def read_meta(name: str) -> dict:
    p = _meta_path(name)
    if not p.exists():
        raise VoiceError(f"No designed voice called '{name}'. Create one with `lantern-narrate design`.")
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise VoiceError(f"{p} is damaged; design the voice again.") from e


def design(name: str, description: str, designer: Designer, takes: int = 3, seed: int | None = None,
           text: str = REFERENCE_TEXT, encode: bool = True) -> list[Path]:
    """Render `takes` versions of the reference passage. Returns the take files."""
    description = (description or "").strip()
    if len(description) < 8:
        raise VoiceError("Describe the voice in a few words, e.g. \"warm, low British woman in her fifties\".")
    if not 1 <= takes <= 6:
        raise VoiceError("Choose between 1 and 6 takes.")
    folder = voices_dir() / slug(name)
    tdir = folder / "takes"
    if tdir.exists():
        shutil.rmtree(tdir)  # a new design replaces earlier takes, never the kept reference
    tdir.mkdir(parents=True)
    base = seed if seed is not None else int(time.time()) % 100_000
    out, info = [], []
    for i in range(1, takes + 1):
        pcm, sr = designer(text, description, base + i)
        pcm = A.trim_silence(np.asarray(pcm, dtype=np.float32), sr)
        pcm, _gain = A.normalize(pcm, sr)
        wav = tdir / f"take-{i}.wav"
        A.write_wav_atomic(wav, pcm, sr)
        listen = A.encode_aac(wav, tdir / f"take-{i}.m4a") if encode else wav
        out.append(listen)
        info.append({"take": i, "seed": base + i, "file": f"takes/take-{i}.wav",
                     "sha256": sha256_file(wav), "seconds": round(len(pcm) / sr, 2)})
    meta = {}
    if (folder / "voice.json").exists():
        try:
            meta = read_meta(name)
        except VoiceError:
            meta = {}
    meta.update({"name": name.strip(), "origin": ORIGIN, "designModel": DESIGN_MODEL,
                 "description": description, "referenceText": text, "takes": info,
                 "designedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
    meta.setdefault("status", "draft")
    _write_json(folder / "voice.json", meta)
    return out


def keep(name: str, take: int) -> DesignedVoice:
    """Make one take the voice's reference clip."""
    meta = read_meta(name)
    folder = voices_dir() / slug(name)
    entry = next((t for t in meta.get("takes", []) if t.get("take") == take), None)
    if entry is None:
        raise VoiceError(f"'{name}' has no take {take}. Takes: {', '.join(str(t['take']) for t in meta.get('takes', []))}.")
    src = folder / entry["file"]
    if not src.exists() or sha256_file(src) != entry["sha256"]:
        raise VoiceError(f"Take {take} of '{name}' is missing or was changed outside Lantern; design it again.")
    ref = folder / "reference.wav"
    tmp = folder / "reference.partial.wav"
    shutil.copyfile(src, tmp)
    os.replace(tmp, ref)
    # The kept take's record travels with the reference, so designing new takes
    # later doesn't break a voice that books already use.
    meta.update({"status": "ready", "keptTake": take, "referenceSha256": entry["sha256"],
                 "kept": dict(entry, description=meta.get("description", ""),
                              referenceText=meta.get("referenceText") or REFERENCE_TEXT)})
    _write_json(folder / "voice.json", meta)
    return load(name)


def load(name: str) -> DesignedVoice:
    """A ready designed voice, after checking it came from `design` and is unchanged."""
    meta = read_meta(name)
    folder = voices_dir() / slug(name)
    if meta.get("origin") != ORIGIN:
        raise VoiceError(f"'{name}' was not designed by Lantern, so it won't be cloned.")
    if meta.get("status") != "ready":
        raise VoiceError(f"'{name}' has no kept take yet. Listen to the takes, then run "
                         f"`lantern-narrate design --name \"{name}\" --keep <n>`.")
    ref = folder / "reference.wav"
    kept = meta.get("kept") or {}
    sha = kept.get("sha256") or ""
    if not ref.exists() or not sha or sha256_file(ref) != sha or meta.get("referenceSha256") != sha:
        raise VoiceError(f"The reference clip for '{name}' is missing or doesn't match the take Lantern kept; "
                         "design the voice again.")
    return DesignedVoice(meta.get("name") or name, folder, kept.get("description", ""), ref,
                         kept.get("referenceText") or REFERENCE_TEXT, sha)


def list_all() -> list[dict]:
    """Every voice folder with its status, for `design --list`."""
    rows = []
    d = voices_dir()
    if not d.exists():
        return rows
    for folder in sorted(p for p in d.iterdir() if p.is_dir()):
        meta_p = folder / "voice.json"
        if not meta_p.exists():
            continue
        try:
            meta = json.loads(meta_p.read_text(encoding="utf-8"))
            name = meta.get("name") or folder.name
        except json.JSONDecodeError:
            rows.append({"name": folder.name, "status": "damaged", "description": ""})
            continue
        try:
            load(name)
            status = "ready"
        except VoiceError as e:
            status = "draft" if meta.get("status") == "draft" else f"unusable: {e}"
        rows.append({"name": name, "status": status, "description": meta.get("description", ""),
                     "takes": len(meta.get("takes", [])), "keptTake": meta.get("keptTake")})
    return rows


def mlx_designer() -> Designer:
    """The real designer: Qwen3-TTS 1.7B VoiceDesign through mlx-audio (Apple Silicon)."""
    from .engines.mlx_engines import _collect, _require_mlx

    load_model = _require_mlx()
    model = load_model(DESIGN_MODEL)
    import mlx.core as mx  # type: ignore

    def render(text: str, description: str, seed: int):
        mx.random.seed(seed)
        pcm = _collect(model.generate_voice_design(text=text, instruct=description, language="English"))
        return pcm, int(getattr(model, "sample_rate", 24000))

    return render
