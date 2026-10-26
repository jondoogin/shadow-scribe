"""Write a portable `.lantern-audio` package that Lantern can import anywhere.

The package is an uncompressed ZIP (audio is already compressed, and STORED
entries let the browser slice files straight out of the archive without
holding the whole book in memory, which matters on iPhone):

    manifest.json
    audio/001-chapter-1.m4a
    ...

The manifest ties every audio file to Lantern's content model: the book's
contentId (SHA-256 of the EPUB), section ids, block ids, and per-segment
start/end times, so the player can show where it is in the text and the
Reader can pick up from the Listen position.
"""
from __future__ import annotations

import json
import os
import zipfile
from pathlib import Path

from .generate import GENERATOR_VERSION, slug
from .script import narrated_sections

PACKAGE_FORMAT = "lantern-audiobook"
PACKAGE_VERSION = 1


def build_manifest(script: dict, state: dict, include_text: bool = True) -> dict:
    book = script["book"]
    sections = []
    for s in narrated_sections(script):
        st = state["sections"].get(s["id"])
        if not st or st.get("status") != "done":
            continue
        seg_text = {seg["id"]: seg for seg in s["segments"]}
        segs = []
        for t in st["segments"]:
            entry = dict(t)
            src = seg_text.get(t["id"], {})
            entry["start"] = src.get("start")
            entry["end"] = src.get("end")
            if include_text:
                entry["text"] = src.get("text")
            segs.append(entry)
        sections.append({
            "id": s["id"],
            "order": s.get("order"),
            "title": s.get("title"),
            "chapterNums": s.get("chapterNums", []),
            "anchors": s.get("anchors", []),
            "file": f"audio/{Path(st['file']).name}",
            "mime": st.get("mime", "audio/mp4"),
            "bytes": st.get("bytes"),
            "durationSec": st.get("durationSec"),
            "segments": segs,
        })
    engine = state.get("engine", {})
    return {
        "format": PACKAGE_FORMAT,
        "version": PACKAGE_VERSION,
        "book": {
            "contentId": book["contentId"],
            "title": book.get("title"),
            "author": book.get("author"),
            "language": book.get("language"),
            "parserVersion": book.get("parserVersion"),
            "sectionCount": len(script.get("sections", [])),
        },
        "narration": {
            "engine": engine.get("id"),
            "engineLabel": engine.get("label"),
            "model": engine.get("model"),
            "engineVersion": engine.get("version"),
            "licenseWeights": engine.get("license_weights"),
            "voice": state.get("voice"),
            "speed": state.get("speed"),
            "sampleRate": engine.get("sample_rate"),
            "generator": f"lantern-narrator {GENERATOR_VERSION}",
            "generatedAt": state.get("updatedAt"),
        },
        "complete": len(sections) == len(narrated_sections(script)),
        "totalDurationSec": round(sum(s["durationSec"] or 0 for s in sections), 3),
        "sections": sections,
    }


def write_package(script: dict, state: dict, job_dir: Path, out_path: Path | None = None,
                  include_text: bool = True) -> Path:
    manifest = build_manifest(script, state, include_text)
    if not manifest["sections"]:
        raise ValueError("No finished chapters to package yet.")
    book = script["book"]
    if out_path is None:
        out_path = Path.cwd() / f"{slug(book.get('title') or 'book')}-{slug(state.get('voice') or 'voice', 16)}.lantern-audio"
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_name(out_path.name + ".partial")
    with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as z:
        z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=1))
        for s in manifest["sections"]:
            z.write(job_dir / "audio" / Path(s["file"]).name, s["file"])
    os.replace(tmp, out_path)
    return out_path


def write_m4b(script: dict, state: dict, job_dir: Path, out_path: Path) -> Path:
    """Single-file M4B with chapter markers (for Apple Books etc.). Needs ffmpeg."""
    import shutil
    import subprocess

    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg is required for M4B export (brew install ffmpeg).")
    manifest = build_manifest(script, state, include_text=False)
    lst = job_dir / "tmp" / "concat.txt"
    meta = job_dir / "tmp" / "chapters.txt"
    lst.parent.mkdir(parents=True, exist_ok=True)
    lines, chapters, t = [], [";FFMETADATA1", f"title={manifest['book']['title'] or ''}",
                              f"artist={manifest['book']['author'] or ''}", "genre=Audiobook"], 0.0
    for s in manifest["sections"]:
        lines.append(f"file '{(job_dir / 'audio' / Path(s['file']).name).as_posix()}'")
        dur = s["durationSec"] or 0
        chapters += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={int(t * 1000)}", f"END={int((t + dur) * 1000)}",
                     f"title={(s['title'] or s['id']).replace('=', '-')}"]
        t += dur
    lst.write_text("\n".join(lines), encoding="utf-8")
    meta.write_text("\n".join(chapters), encoding="utf-8")
    tmp = out_path.with_name(out_path.name + ".partial.m4b")
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-i", str(meta), "-map_metadata", "1", "-map_chapters", "1", "-c", "copy", str(tmp)], check=True)
    os.replace(tmp, out_path)
    return out_path
