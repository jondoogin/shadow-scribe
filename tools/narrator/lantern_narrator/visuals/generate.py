"""Generate a book's paintings and write a `.lantern-visuals` package.

Job folder: <narrator home>/visuals/<book>/ (resumable; Ctrl-C stops after the
current image and a rerun skips finished ones). Packages go to
<narrator home>/output/ unless -o says otherwise. Nothing is written outside
the narrator folder by default, because the main Mac is a work machine.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from ..generate import slug
from ..paths import home, output_dir
from . import plan as P
from .describe import create_describer
from .painters import SIZE, create_painter
from .prompt import build_prompt
from .style import build_profile
from .validate import check

VISUALS_FORMAT = "lantern-visuals"
VISUALS_VERSION = 1
GENERATOR_VERSION = "1.0.0"
THUMB = (320, 200)
WEBP_QUALITY = 80
MAX_ATTEMPTS = 3


def visuals_dir() -> Path:
    return home() / "visuals"


def job_dir_for(content_id: str, title: str | None) -> Path:
    return visuals_dir() / f"{slug(title or 'book', 32)}-{content_id.replace('sha256:', '')[:10]}"


def image_key(descriptor: dict, profile: dict, painter_id: str, seed: int, size=SIZE) -> str:
    h = hashlib.sha256(json.dumps({"d": descriptor, "style": profile["id"], "palette": profile["palette"],
                                   "painter": painter_id, "seed": seed, "size": list(size)}, sort_keys=True).encode())
    return h.hexdigest()[:20]


def plan_book(script: dict, preset: str = "gouache", describer: str = "keywords", selection: str | None = None,
              seed: int | None = None) -> dict:
    """Scenes, windows, descriptors and prompts. No image model needed."""
    profile = build_profile(script, preset, seed)
    scenes = P.plan(script, selection)
    d = create_describer(describer)
    previous = None
    out = []
    for sc in scenes:
        desc = d.describe(sc.window_text, previous, profile, sc.context)
        previous = desc
        out.append({"scene": sc, "descriptor": desc, "prompt": build_prompt(profile, desc)})
    if hasattr(d, "unload"):
        d.unload()   # free memory before the image model loads (the Air can't hold both)
    return {"profile": profile, "scenes": out, "describer": getattr(d, "id", describer)}


def plan_summary(planned: dict) -> list[dict]:
    rows = []
    for i, item in enumerate(planned["scenes"]):
        sc = item["scene"]
        rows.append({"id": sc.id, "startsAt": f"{sc.start.section_id}:{sc.start.block_id}", "at": round(sc.start.start_sec),
                     "reason": sc.reason, "visibleAfter": sc.visible_after, "windowWords": P.words(sc.window_text),
                     "setting": item["descriptor"].get("setting"), "prompt": item["prompt"]})
    return rows


def generate(script: dict, painter: str = "fixture", preset: str = "gouache", describer: str = "keywords",
             selection: str | None = None, out_path: Path | None = None, job_dir: Path | None = None,
             seed: int | None = None, log=print, painter_kw: dict | None = None) -> dict:
    book = script["book"]
    job = Path(job_dir or job_dir_for(book["contentId"], book.get("title")))
    for sub in ("images", "strokes", "thumbs"):
        (job / sub).mkdir(parents=True, exist_ok=True)
    planned = plan_book(script, preset, describer, selection, seed)
    profile = planned["profile"]
    (job / "plan.json").write_text(json.dumps(plan_summary(planned), ensure_ascii=False, indent=1), encoding="utf-8")
    eng = create_painter(painter, **(painter_kw or {}))
    images, rejected = [], []
    t_start = time.time()
    interrupted = False
    try:
        for n, item in enumerate(planned["scenes"], start=1):
            sc, desc, prompt = item["scene"], item["descriptor"], item["prompt"]
            base_seed = (profile["seed"] + sc.index * 7919 + sc.alternate * 104729) % (2 ** 31)
            kept = None
            for attempt in range(MAX_ATTEMPTS):
                s = base_seed + attempt
                key = image_key(desc, profile, eng.id, s)
                names = {k: job / k / f"{key}.webp" for k in ("images", "strokes", "thumbs")}
                checks_file = job / "images" / f"{key}.json"
                if all(p.exists() for p in names.values()) and checks_file.exists():
                    kept = (key, json.loads(checks_file.read_text()))
                    break
                t0 = time.time()
                img, strokes = eng.paint(prompt, desc, s)
                res = check(img)
                if not res["ok"]:
                    rejected.append({"scene": sc.id, "seed": s, "faces": res["faces"], "text": res["text"]})
                    log(f"  ↺ {sc.id}: rejected ({'face' if res['faces'] else 'text'}), trying the next seed")
                    continue
                _save_webp(img.resize(SIZE, Image.LANCZOS) if img.size != SIZE else img, names["images"])
                _save_webp(strokes.convert("L"), names["strokes"], lossless=False)
                _save_webp(img.resize(THUMB, Image.LANCZOS), names["thumbs"])
                info = {"checks": res, "seconds": round(time.time() - t0, 2)}
                checks_file.write_text(json.dumps(info))
                kept = (key, info)
                break
            if not kept:
                log(f"  ✗ {sc.id}: no clean image after {MAX_ATTEMPTS} tries; the previous painting stays up")
                continue
            key, info = kept
            va = sc.visible_after
            images.append({
                "id": f"img-{len(images) + 1:04d}",
                "sceneId": sc.id,
                "alternate": sc.alternate,
                "sectionId": va["sectionId"],
                "start": {"sectionId": sc.start.section_id, "blockId": sc.start.block_id, "segmentId": sc.start.segments[0]["id"]},
                "sourceWindow": sc.manifest_window(),
                "visibleAfter": va,
                "file": f"images/{key}.webp", "strokes": f"strokes/{key}.webp", "thumb": f"thumbs/{key}.webp",
                "width": SIZE[0], "height": SIZE[1],
                "focus": desc.get("focus"),
                "descriptor": {k: desc.get(k) for k in ("setting", "era", "timeOfDay", "weather", "light", "mood", "people")},
                "prompt": prompt,
                "reason": sc.reason,
                "checks": info["checks"],
                "seconds": info.get("seconds"),
            })
            log(f"  ✓ {n}/{len(planned['scenes'])} {sc.id} · {desc.get('setting')} · {sc.reason}")
    except KeyboardInterrupt:
        interrupted = True
        log("Stopped. Run the same command again to carry on where it left off.")
    if rejected:
        with (job / "rejected.log").open("a", encoding="utf-8") as f:
            for r in rejected:
                f.write(json.dumps(r) + "\n")
    if not images:
        raise RuntimeError("No paintings were made.")
    manifest = {
        "format": VISUALS_FORMAT,
        "version": VISUALS_VERSION,
        "complete": not interrupted and len(images) == len(planned["scenes"]) and not selection,
        "book": {k: book.get(k) for k in ("contentId", "title", "author", "parserVersion", "segmenterVersion")},
        "generator": {"tool": "lantern-narrate visuals", "version": GENERATOR_VERSION, "model": eng.id, "modelLabel": eng.label,
                      "modelLicense": eng.license, "describer": planned["describer"], "codeDrawn": eng.id == "fixture",
                      "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds")},
        "style": profile,
        "images": images,
    }
    path = write_package(manifest, job, out_path)
    return {"path": path, "manifest": manifest, "seconds": round(time.time() - t_start, 1), "rejected": len(rejected)}


def _save_webp(img: Image.Image, path: Path, lossless: bool = False) -> None:
    tmp = path.with_suffix(".partial.webp")
    img.save(tmp, "WEBP", quality=WEBP_QUALITY, method=4, lossless=lossless)
    os.replace(tmp, path)


def write_package(manifest: dict, job: Path, out_path: Path | None = None) -> Path:
    book = manifest["book"]
    if out_path is None:
        out_path = output_dir() / f"{slug(book.get('title') or 'book')}-{manifest['style']['preset']}.lantern-visuals"
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp = out_path.with_name(out_path.name + ".partial")
    files = sorted({p for img in manifest["images"] for p in (img["file"], img["strokes"], img["thumb"])})
    with zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_STORED, allowZip64=True) as z:
        for img in manifest["images"]:
            img["bytes"] = (job / img["file"]).stat().st_size
        z.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False, indent=1))
        for f in files:
            z.write(job / f, f)
    os.replace(tmp, out_path)
    return out_path
