"""`lantern-narrate` — local neural audiobook generation for Lantern."""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

from . import benchmark
from . import books
from . import audio as A
from .engines import ENGINE_IDS, EngineUnavailable, create_engine, memory_shortfall
from .generate import GenerationInterrupted, Generator, SegmentFailed, StopFlag, _spoken, assemble, slug
from .hardware import default_engine, recommend, report
from .package import write_m4b, write_package
from . import storage
from .paths import benchmarks_dir, isolate_caches, models_dir, output_dir
from .script import ScriptError, narrated_sections, script_from_source

DEFAULT_BENCH_COMBOS = [
    ("kokoro", "af_heart"), ("kokoro", "bf_emma"), ("kokoro", "am_michael"),
    ("kokoro-mlx", "af_heart"),
    ("pocket", "alba"), ("pocket", "charles"),
    ("qwen3", "Ryan"), ("qwen3", "Aiden"),
    ("qwen3-1.7b", "Ryan"),  # skipped automatically below 24 GB of memory
]


def _fmt_dur(s: float | None) -> str:
    if s is None:
        return "?"
    s = int(s)
    return f"{s // 3600}h{(s % 3600) // 60:02d}m" if s >= 3600 else f"{s // 60}m{s % 60:02d}s"


def cmd_doctor(args) -> int:
    r = report()
    print(json.dumps(r, indent=1) if args.json else "\n".join(f"{k:>18}: {v}" for k, v in r.items()))
    if not args.json:
        u = storage.usage()
        print(f"{'storage':>18}: {storage.fmt_bytes(u['totalBytes'])} in {u['home']}")
    for tip in recommend(r):
        print(f"• {tip}")
    return 0


def cmd_clean(args) -> int:
    u = storage.usage()
    print(f"Narrator folder: {u['home']}")
    for name, c in u["categories"].items():
        print(f"  {name:<11} {storage.fmt_bytes(c['bytes']):>9}  {c['about']}")
    print(f"  {'total':<11} {storage.fmt_bytes(u['totalBytes']):>9}")
    for var, path in u["sharedCaches"].items():
        print(f"  (not managed) {var}={path}: shared cache, delete it yourself if you want")
    chosen = [c for c in storage.CATEGORIES if getattr(args, c)] or (list(storage.CATEGORIES) if args.all else [])
    if not chosen:
        print("Nothing deleted. Choose what to remove, e.g. `lantern-narrate clean --jobs --yes`, "
              "or `--all --yes` for everything.")
        return 0
    if not args.yes:
        print(f"Would delete: {', '.join(chosen)}. Add --yes to do it.")
        return 0
    for d in storage.clean(chosen):
        print(f"✓ removed {d}")
    return 0


def cmd_download(args) -> int:
    if args.model != "kokoro":
        print("Only Kokoro weights are fetched by this command; Pocket TTS and MLX models download on first use.")
        return 1
    from .engines.kokoro_onnx import MODEL_FILES, RELEASE_URL, VOICES_FILE

    dest = models_dir() / "kokoro"
    dest.mkdir(parents=True, exist_ok=True)
    files = [MODEL_FILES["int8" if args.int8 else "fp32"], VOICES_FILE]
    for name in files:
        target = dest / name
        if target.exists() and target.stat().st_size > 0:
            print(f"✓ {name} already present")
            continue
        tmp = target.with_suffix(target.suffix + ".partial")
        print(f"↓ {RELEASE_URL}{name}")
        with urllib.request.urlopen(RELEASE_URL + name) as resp, open(tmp, "wb") as f:
            while chunk := resp.read(1 << 20):
                f.write(chunk)
        tmp.replace(target)
        print(f"✓ {name} ({target.stat().st_size / 1e6:.0f} MB)")
    print(f"Kokoro weights in {dest}")
    return 0


def resolve_choice(content_id: str, engine: str | None, voice: str | None, style: str | None,
                   speed: float | None, hw: dict | None = None) -> dict:
    """Flags win, then the book's remembered choice, then the machine default.
    A remembered voice or style only carries over when the engine is the same."""
    saved = books.get(content_id)
    eng = engine or saved.get("engine") or default_engine(hw if hw is not None else report())
    same = saved.get("engine") == eng
    return {
        "engine": eng,
        "voice": voice if voice else (saved.get("voice", "") if same else ""),
        "style": style if style is not None else (saved.get("style", "") if same else ""),
        "speed": speed if speed is not None else (saved.get("speed", 1.0) if same else 1.0),
        "remembered": bool(saved) and not engine and not voice,
    }


def cmd_voices(args) -> int:
    eng = create_engine(args.engine or default_engine(report()))
    for v in eng.voices():
        print(f"{v.id:<14} {v.label:<32} {v.language:<6} {v.license or '':<28} {v.notes or ''}")
    return 0


def cmd_script(args) -> int:
    data = script_from_source(Path(args.source), Path(args.output), include_all=args.include_all)
    secs = narrated_sections(data)
    chars = sum(len(seg.get("spoken") or seg["text"]) for s in secs for seg in s["segments"])
    print(f"✓ {args.output}: {len(secs)} narrated sections of {len(data['sections'])}, {chars:,} characters "
          f"(≈ {_fmt_dur(chars / 15)} of speech at a typical narration pace)")
    return 0


def _progress_printer():
    last = {"t": 0.0}

    def on_progress(p):
        import time
        now = time.monotonic()
        if now - last["t"] < 0.5 and p.segment_index != p.segment_count:
            return
        last["t"] = now
        rtf = f"{p.realtime_factor:.1f}x realtime" if p.realtime_factor else "warming up"
        print(f"\r[{p.section_index}/{p.section_count}] {p.section_title[:38]:<38} "
              f"{p.segment_index}/{p.segment_count} · {rtf} · ETA {_fmt_dur(p.eta_seconds)}   ",
              end="", flush=True)
    return on_progress


def cmd_generate(args) -> int:
    script = script_from_source(Path(args.source), include_all=args.include_all)
    book = script["book"]
    c = resolve_choice(book["contentId"], args.engine, args.voice, args.style, args.speed)
    engine = create_engine(c["engine"])
    try:
        gen = Generator(script, engine, c["voice"], c["speed"], bitrate=args.bitrate * 1000,
                        on_progress=_progress_printer(), selection=args.sections, style=c["style"],
                        job_dir=Path(args.job_dir) if args.job_dir else None)
    except ValueError as e:
        print(f"✗ {e}")
        return 2
    books.remember(book["contentId"], book.get("title"), engine=engine.id, voice=gen.voice,
                   style=gen.style, speed=c["speed"])
    stop = gen.stop.install()
    print(f"Book: {book.get('title')} — {book.get('author')}")
    print(f"Engine: {engine.label} · voice {gen.voice} · speed {c['speed']}"
          + (f" · style \"{gen.style}\"" if gen.style else "")
          + (" (this book's saved choice)" if c["remembered"] else ""))
    print(f"Job folder: {gen.job_dir}")
    try:
        state = gen.run()
    except EngineUnavailable as e:
        print(f"\n✗ {e}")
        return 2
    except GenerationInterrupted:
        print(f"\n⏸  Stopped. Progress saved in {gen.job_dir}. Re-run the same command to resume.")
        return 130
    except SegmentFailed as e:
        print(f"\n✗ {e}\nFinished chapters are kept; re-run to retry from this sentence.")
        return 3
    finally:
        stop.uninstall()
    print()
    out = write_package(script, state, gen.job_dir, Path(args.output) if args.output else None,
                        include_text=not args.no_text)
    total = sum(s.get("durationSec", 0) for s in state["sections"].values() if s.get("status") == "done")
    print(f"✓ Package: {out}  ({out.stat().st_size / 1e6:.1f} MB, {_fmt_dur(total)} of narration)")
    print("  Import it in Lantern: open the book → Listen → Import narration.")
    if args.m4b:
        m4b = write_m4b(script, state, gen.job_dir, out.with_suffix(".m4b"))
        print(f"✓ M4B: {m4b}")
    return 0


def audition_text(script: dict, max_chars: int = 400) -> list[dict]:
    """The opening sentences of the first narrated chapter, about 25 seconds of speech."""
    picked, n = [], 0
    for sec in narrated_sections(script):
        for seg in sec["segments"]:
            picked.append(seg)
            n += len(_spoken(seg))
            if n >= max_chars:
                return picked
        if picked:
            return picked
    return picked


def cmd_audition(args) -> int:
    script = script_from_source(Path(args.source), include_all=args.include_all)
    book = script["book"]
    c = resolve_choice(book["contentId"], args.engine, None, args.style, args.speed)
    engine = create_engine(c["engine"])
    style = (c["style"] or "").strip()
    if style and not engine.supports_style:
        print(f"✗ {engine.label} does not take a style instruction; use qwen3-1.7b or drop --style.")
        return 2
    engine.style = style
    wanted = [v.strip() for v in args.voices.split(",")] if args.voices else [v.id for v in engine.voices()]
    segments = audition_text(script, args.chars)
    if not segments:
        print("✗ No narrated text found in this book.")
        return 2
    out = Path(args.output) if args.output else output_dir() / "auditions" / slug(book.get("title") or "book")
    out.mkdir(parents=True, exist_ok=True)
    print(f"Book: {book.get('title')} — {book.get('author')}")
    print(f"Engine: {engine.label}" + (f" · style \"{style}\"" if style else ""))
    print(f"Reading the opening ({sum(len(_spoken(s)) for s in segments)} characters) in {len(wanted)} voices…")
    try:
        engine.load()
    except EngineUnavailable as e:
        print(f"✗ {e}")
        return 2
    sr = engine.info().sample_rate
    made = []
    for v in wanted:
        t = time.perf_counter()
        try:
            pieces = [engine.synthesize(_spoken(seg), v, c["speed"]) for seg in segments]
        except Exception as e:  # one bad voice should not stop the rest
            print(f"  ✗ {v}: {e}")
            continue
        _timings, pcm = assemble(segments, pieces, sr)
        pcm, _gain = A.normalize(pcm, sr)
        stem = f"{engine.id}-{v}" + ("-styled" if style else "")
        wav = out / f"{stem}.wav"
        A.write_wav_atomic(wav, pcm, sr)
        f = A.encode_aac(wav, out / f"{stem}.m4a")
        if f != wav:
            wav.unlink(missing_ok=True)
        made.append(f)
        print(f"  ✓ {v:<10} {f.name}  ({len(pcm) / sr:.0f} s of audio in {time.perf_counter() - t:.0f} s)")
    if not made:
        return 1
    print(f"Samples in {out}")
    print(f"Pick one: lantern-narrate generate {args.source} --engine {engine.id} --voice <name>"
          + (f" --style \"{style}\"" if style else "") + "  (remembered for this book)")
    return 0


def cmd_benchmark(args) -> int:
    skipped = []
    if args.only:
        combos = [tuple(c.split(":", 1)) for c in args.only.split(",")]
    else:
        mem = report().get("memory_gb")
        combos = []
        for engine_id, voice in DEFAULT_BENCH_COMBOS:
            reason = memory_shortfall(engine_id, mem)
            if reason:
                skipped.append({"engine": engine_id, "voice": voice, "ok": False, "error": reason})
            else:
                combos.append((engine_id, voice))
    if not args.output:
        args.output = str(benchmarks_dir() / time.strftime("%Y%m%d-%H%M%S"))
    script_path = Path(args.script)
    if script_path.suffix != ".json":
        data = script_from_source(script_path, include_all=True)
        script_path = Path(args.output) / "passage.script.json"
        script_path.parent.mkdir(parents=True, exist_ok=True)
        script_path.write_text(json.dumps(data, indent=1), encoding="utf-8")
    rep = benchmark.run(script_path.resolve(), combos, Path(args.output), args.speed, skipped=skipped)
    print(f"✓ {Path(args.output) / 'RESULTS.md'}")
    return 0 if any(r.get("ok") for r in rep["results"]) else 1


def cmd_bench_one(args) -> int:
    r = benchmark.bench_one(Path(args.script), args.engine, args.voice, Path(args.output), args.speed)
    print(json.dumps(r))
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="lantern-narrate", description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("doctor", help="show hardware, installed engines and tools")
    s.add_argument("--json", action="store_true")
    s.set_defaults(fn=cmd_doctor)

    s = sub.add_parser("download", help="download model weights")
    s.add_argument("model", choices=["kokoro"])
    s.add_argument("--int8", action="store_true", help="~88 MB quantised model (plus ~27 MB voices) instead of ~310 MB fp32")
    s.set_defaults(fn=cmd_download)

    s = sub.add_parser("voices", help="list voices for an engine")
    s.add_argument("--engine", choices=ENGINE_IDS, help="default: this machine's default engine")
    s.set_defaults(fn=cmd_voices)

    s = sub.add_parser("script", help="EPUB/TXT → narration script JSON (uses Lantern's own parser)")
    s.add_argument("source")
    s.add_argument("-o", "--output", required=True)
    s.add_argument("--include-all", action="store_true", help="also narrate front/back matter")
    s.set_defaults(fn=cmd_script)

    s = sub.add_parser("generate", help="generate chapter audio and a .lantern-audio package")
    s.add_argument("source", help=".epub, .txt or narration script .json")
    s.add_argument("--engine", choices=ENGINE_IDS,
                   help="default: this book's saved choice, else qwen3-1.7b on Apple Silicon with 24 GB+, else kokoro")
    s.add_argument("--voice", default="", help="default: this book's saved voice, else the engine's default")
    s.add_argument("--style", default=None,
                   help='qwen3-1.7b only: delivery instruction, e.g. "warm, unhurried audiobook narration" ("" clears)')
    s.add_argument("--speed", type=float, default=None)
    s.add_argument("--sections", help="narrated sections to generate, e.g. 1-3,7 (default: all)")
    s.add_argument("--bitrate", type=int, default=64, help="AAC kbps (default 64)")
    s.add_argument("-o", "--output", help=f"package path (default {output_dir()}/<title>-<voice>.lantern-audio)")
    s.add_argument("--job-dir", help="override job/cache folder")
    s.add_argument("--include-all", action="store_true")
    s.add_argument("--no-text", action="store_true", help="omit caption text from the package")
    s.add_argument("--m4b", action="store_true", help="also write a single .m4b with chapters (ffmpeg)")
    s.set_defaults(fn=cmd_generate)

    s = sub.add_parser("audition", help="read a book's opening in every voice, to choose one for that book")
    s.add_argument("source", help=".epub, .txt or narration script .json")
    s.add_argument("--engine", choices=ENGINE_IDS, help="default: as for generate")
    s.add_argument("--voices", help="comma-separated voices (default: all for the engine)")
    s.add_argument("--style", default=None, help="qwen3-1.7b only: delivery instruction to try")
    s.add_argument("--speed", type=float, default=None)
    s.add_argument("--chars", type=int, default=400, help="how much of the opening to read (default 400 characters)")
    s.add_argument("-o", "--output", help=f"folder (default {output_dir()}/auditions/<title>/)")
    s.add_argument("--include-all", action="store_true")
    s.set_defaults(fn=cmd_audition)

    s = sub.add_parser("benchmark", help="compare engines on the same passage")
    s.add_argument("--script", default=str(Path(__file__).resolve().parents[1] / "benchmark" / "passage.script.json"))
    s.add_argument("--only", help="engine:voice list, e.g. kokoro:af_heart,pocket:alba")
    s.add_argument("--speed", type=float, default=1.0)
    s.add_argument("-o", "--output", help=f"results folder (default {benchmarks_dir()}/<timestamp>)")
    s.set_defaults(fn=cmd_benchmark)

    s = sub.add_parser("clean", help="show what the narrator stores and remove it")
    for c, about in storage.CATEGORIES.items():
        s.add_argument(f"--{c}", action="store_true", help=f"remove {about}")
    s.add_argument("--all", action="store_true", help="remove everything in the narrator folder")
    s.add_argument("--yes", action="store_true", help="actually delete (otherwise only shows what would go)")
    s.set_defaults(fn=cmd_clean)

    s = sub.add_parser("_bench-one", help=argparse.SUPPRESS)
    s.add_argument("script")
    s.add_argument("--engine", required=True)
    s.add_argument("--voice", required=True)
    s.add_argument("--speed", type=float, default=1.0)
    s.add_argument("-o", "--output", required=True)
    s.set_defaults(fn=cmd_bench_one)

    args = p.parse_args(argv)
    isolate_caches()  # before any engine import, so model downloads stay in the narrator folder
    try:
        return args.fn(args)
    except ScriptError as e:
        print(f"✗ {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
