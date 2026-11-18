"""Load and validate a Lantern narration script.

The script is produced by Lantern's own JavaScript content model
(`scripts/narration-script.mjs` or the in-app "Export narration script"), so
block ids, segment ids and text offsets match what the web app stores. Python
never re-segments text; it only voices the segments it is given.
"""
from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

SCRIPT_FORMAT = "lantern-narration-script"
SCRIPT_VERSION = 1
REPO_ROOT = Path(__file__).resolve().parents[3]
NODE_SCRIPT = REPO_ROOT / "scripts" / "narration-script.mjs"


class ScriptError(ValueError):
    pass


def load_script(path: Path) -> dict:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    validate(data)
    return data


def validate(data: dict) -> None:
    if data.get("format") != SCRIPT_FORMAT:
        raise ScriptError("Not a Lantern narration script (format field missing or wrong).")
    if int(data.get("version", 0)) > SCRIPT_VERSION:
        raise ScriptError(f"Script version {data.get('version')} is newer than this narrator supports ({SCRIPT_VERSION}).")
    book = data.get("book") or {}
    if not book.get("contentId"):
        raise ScriptError("Script has no book.contentId.")
    seen = set()
    for s in data.get("sections", []):
        if not s.get("id"):
            raise ScriptError("Section without id.")
        if s["id"] in seen:
            raise ScriptError(f"Duplicate section id {s['id']}.")
        seen.add(s["id"])
        seg_ids = set()
        for seg in s.get("segments", []):
            if seg.get("id") in seg_ids:
                raise ScriptError(f"Duplicate segment id {seg.get('id')} in {s['id']}.")
            seg_ids.add(seg.get("id"))
            if not (seg.get("spoken") or seg.get("text") or "").strip():
                raise ScriptError(f"Empty segment {seg.get('id')} in {s['id']}.")


def script_from_source(source: Path, out: Path | None = None, include_all: bool = False) -> dict:
    """Accept a .json script directly, or run the Node extractor on .epub/.txt."""
    source = Path(source)
    if source.suffix.lower() == ".json":
        return load_script(source)
    if not shutil.which("node"):
        raise ScriptError("Node.js is required to read EPUB/TXT files. Install Node 20+ and run `npm install` in the repo.")
    cmd = ["node", str(NODE_SCRIPT), str(source)]
    if include_all:
        cmd.append("--include-all")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise ScriptError(proc.stderr.strip() or "narration-script.mjs failed")
    data = json.loads(proc.stdout)
    validate(data)
    if out:
        Path(out).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    return data


def narrated_sections(script: dict, selection: str | None = None) -> list[dict]:
    """Sections to voice, in reading order. `selection` is like '1-3,7' (1-based among narrated)."""
    secs = [s for s in sorted(script["sections"], key=lambda s: s.get("order", 0))
            if s.get("narrate", True) and s.get("segments")]
    if not selection:
        return secs
    wanted: set[int] = set()
    for part in selection.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, b = part.split("-", 1)
            wanted.update(range(int(a), int(b) + 1))
        else:
            wanted.add(int(part))
    return [s for i, s in enumerate(secs, start=1) if i in wanted]


def segment_key(engine_fingerprint: str, voice: str, speed: float, spoken: str) -> str:
    h = hashlib.sha1()
    h.update(f"{engine_fingerprint}\x00{voice}\x00{speed:.3f}\x00{spoken}".encode("utf-8"))
    return h.hexdigest()[:20]
