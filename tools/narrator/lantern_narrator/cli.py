"""`lantern-narrate` — local neural audiobook generation for Lantern."""
from __future__ import annotations

import argparse
import json
import sys
import urllib.request
from pathlib import Path

from . import benchmark
from .engines import ENGINE_IDS, EngineUnavailable, create_engine
from .generate import GenerationInterrupted, Generator, SegmentFailed, StopFlag
from .hardware import recommend, report
from .package import write_m4b, write_package
from .paths import models_dir
from .script import ScriptError, narrated_sections, script_from_source

DEFAULT_BENCH_COMBOS = [
    ("kokoro", "af_heart"), ("kokoro", "bf_emma"), ("kokoro", "am_michael"),
    ("kokoro-mlx", "af_heart"),
    ("pocket", "alba"), ("pocket", "charles"),
    ("qwen3", "Ryan"), ("qwen3", "Aiden"),
]


def _fmt_dur(s: float | None) -> str:
    if s is None:
        return "?"
    s = int(s)
    return f"{s // 3600}h{(s % 3600) // 60:02d}m" if s >= 3600 else f"{s // 60}m{s % 60:02d}s"


def cmd_doctor(args) -> int:
    r = report()
    print(json.dumps(r, indent=1) if args.json else "\n".join(f"{k:>18}: {v}" for k, v in r.items()))
    for tip in recommend(r):
        print(f"• {tip}")
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


def cmd_voices(args) -> int:
    eng = create_engine(args.engine)
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
    engine = create_engine(args.engine)
    stop = StopFlag().install()
    gen = Generator(script, engine, args.voice, args.speed, bitrate=args.bitrate * 1000,
                    on_progress=_progress_printer(), stop=stop, selection=args.sections,
                    job_dir=Path(args.job_dir) if args.job_dir else None)
    print(f"Book: {script['book'].get('title')} — {script['book'].get('author')}")
    print(f"Engine: {engine.label} · voice {gen.voice} · speed {args.speed}")
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


def cmd_benchmark(args) -> int:
    combos = DEFAULT_BENCH_COMBOS
    if args.only:
        combos = [tuple(c.split(":", 1)) for c in args.only.split(",")]
    script_path = Path(args.script)
    if script_path.suffix != ".json":
        data = script_from_source(script_path, include_all=True)
        script_path = Path(args.output) / "passage.script.json"
        script_path.parent.mkdir(parents=True, exist_ok=True)
        script_path.write_text(json.dumps(data, indent=1), encoding="utf-8")
    rep = benchmark.run(script_path.resolve(), combos, Path(args.output), args.speed)
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
    s.add_argument("--engine", default="kokoro", choices=ENGINE_IDS)
    s.set_defaults(fn=cmd_voices)

    s = sub.add_parser("script", help="EPUB/TXT → narration script JSON (uses Lantern's own parser)")
    s.add_argument("source")
    s.add_argument("-o", "--output", required=True)
    s.add_argument("--include-all", action="store_true", help="also narrate front/back matter")
    s.set_defaults(fn=cmd_script)

    s = sub.add_parser("generate", help="generate chapter audio and a .lantern-audio package")
    s.add_argument("source", help=".epub, .txt or narration script .json")
    s.add_argument("--engine", default="kokoro", choices=ENGINE_IDS)
    s.add_argument("--voice", default="")
    s.add_argument("--speed", type=float, default=1.0)
    s.add_argument("--sections", help="narrated sections to generate, e.g. 1-3,7 (default: all)")
    s.add_argument("--bitrate", type=int, default=64, help="AAC kbps (default 64)")
    s.add_argument("-o", "--output", help="package path (default ./<title>-<voice>.lantern-audio)")
    s.add_argument("--job-dir", help="override job/cache folder")
    s.add_argument("--include-all", action="store_true")
    s.add_argument("--no-text", action="store_true", help="omit caption text from the package")
    s.add_argument("--m4b", action="store_true", help="also write a single .m4b with chapters (ffmpeg)")
    s.set_defaults(fn=cmd_generate)

    s = sub.add_parser("benchmark", help="compare engines on the same passage")
    s.add_argument("--script", default=str(Path(__file__).resolve().parents[1] / "benchmark" / "passage.script.json"))
    s.add_argument("--only", help="engine:voice list, e.g. kokoro:af_heart,pocket:alba")
    s.add_argument("--speed", type=float, default=1.0)
    s.add_argument("-o", "--output", default="narration-benchmark")
    s.set_defaults(fn=cmd_benchmark)

    s = sub.add_parser("_bench-one", help=argparse.SUPPRESS)
    s.add_argument("script")
    s.add_argument("--engine", required=True)
    s.add_argument("--voice", required=True)
    s.add_argument("--speed", type=float, default=1.0)
    s.add_argument("-o", "--output", required=True)
    s.set_defaults(fn=cmd_bench_one)

    args = p.parse_args(argv)
    try:
        return args.fn(args)
    except ScriptError as e:
        print(f"✗ {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
