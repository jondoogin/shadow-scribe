"""Hardware tiers, memory gating and the narrator's on-disk footprint."""
from __future__ import annotations

from pathlib import Path

import pytest

from lantern_narrator import cli, paths, storage
from lantern_narrator.engines import ENGINE_IDS, create_engine, memory_shortfall
from lantern_narrator.hardware import recommend, tier


@pytest.fixture
def narrator_home(tmp_path, monkeypatch):
    home = tmp_path / "narrator"
    monkeypatch.setenv("LANTERN_NARRATOR_HOME", str(home))
    monkeypatch.delenv("HF_HOME", raising=False)
    monkeypatch.delenv("TORCH_HOME", raising=False)
    return home


def hw(mem, **kw):
    r = {"memory_gb": mem, "apple_silicon": True, "tools": {"afconvert": True, "ffmpeg": False, "node": True},
         "disk_free_gb": 200, "narrator_home": "/x/.lantern-narrator", "shared_caches": {}}
    r.update(kw)
    return r


# ── tiers ───────────────────────────────────────────────────────────────────

def test_tiers_cover_the_air_and_the_pro():
    assert tier(hw(8)) == "small"
    assert tier(hw(16)) == "standard"   # M2 Air 16 GB
    assert tier(hw(48)) == "large"      # M5 Pro 48 GB


def test_qwen_large_is_gated_by_memory_only():
    assert memory_shortfall("qwen3-1.7b", 16) is not None
    assert memory_shortfall("qwen3-1.7b", 48) is None
    assert memory_shortfall("qwen3", 8) is not None
    assert memory_shortfall("qwen3", 16) is None
    assert memory_shortfall("kokoro", 8) is None
    assert memory_shortfall("qwen3-1.7b", None) is None  # unknown memory: don't block


def test_recommendations_name_the_right_engines():
    air = " ".join(recommend(hw(16)))
    pro = " ".join(recommend(hw(48)))
    assert "qwen3-1.7b is skipped" in air
    assert "default engine is qwen3-1.7b" in pro and "audition" in pro
    assert "lantern-narrate clean" in pro


def test_recommend_flags_shared_caches_and_low_disk():
    tips = " ".join(recommend(hw(48, disk_free_gb=10, shared_caches={"HF_HOME": "/Users/x/.cache/hf"})))
    assert "Less than 15 GB free" in tips
    assert "HF_HOME is set to /Users/x/.cache/hf" in tips


def test_qwen_large_engine_is_registered_without_importing_mlx():
    assert "qwen3-1.7b" in ENGINE_IDS
    e = create_engine("qwen3-1.7b")
    assert "1.7B" in e.repo and e.default_voice == "Aiden"


# ── storage ─────────────────────────────────────────────────────────────────

def test_model_caches_are_redirected_into_the_narrator_folder(narrator_home):
    env = {}
    got = paths.isolate_caches(env)
    assert Path(got["HF_HOME"]) == narrator_home / "hf-cache"
    assert Path(got["TORCH_HOME"]) == narrator_home / "torch-cache"
    env = {"HF_HOME": "/shared/hf"}
    assert paths.isolate_caches(env)["HF_HOME"] == "/shared/hf"  # the user's choice wins


def test_usage_and_clean_only_touch_the_narrator_folder(narrator_home, tmp_path, monkeypatch):
    for sub, size in (("models/kokoro/m.onnx", 1000), ("hf-cache/hub/x.bin", 3000), ("jobs/a/job.json", 10),
                      ("output/b.lantern-audio", 500), ("benchmarks/run/RESULTS.md", 20)):
        f = narrator_home / sub
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(b"x" * size)
    outside = tmp_path / "shared-hf"
    outside.mkdir()
    (outside / "keep.bin").write_bytes(b"x")
    monkeypatch.setenv("HF_HOME", str(outside))

    u = storage.usage()
    assert u["categories"]["models"]["bytes"] == 4000
    assert u["categories"]["jobs"]["bytes"] == 10
    assert u["sharedCaches"] == {"HF_HOME": str(outside)}

    storage.clean(["jobs", "benchmarks"])
    assert not (narrator_home / "jobs").exists() and not (narrator_home / "benchmarks").exists()
    assert (narrator_home / "output" / "b.lantern-audio").exists()
    storage.clean(list(storage.CATEGORIES))
    assert storage.usage()["totalBytes"] == 0
    assert (outside / "keep.bin").exists()  # a shared cache is never deleted


def test_clean_refuses_a_dangerous_home(monkeypatch):
    monkeypatch.setenv("LANTERN_NARRATOR_HOME", str(Path.home()))
    with pytest.raises(RuntimeError):
        storage.clean(["jobs"])


def test_clean_command_is_a_dry_run_without_yes(narrator_home, capsys):
    (narrator_home / "jobs" / "a").mkdir(parents=True)
    assert cli.main(["clean", "--jobs"]) == 0
    assert (narrator_home / "jobs" / "a").exists()
    assert "Add --yes" in capsys.readouterr().out
    assert cli.main(["clean", "--jobs", "--yes"]) == 0
    assert not (narrator_home / "jobs").exists()


# ── benchmark defaults ──────────────────────────────────────────────────────

def _run_bench(monkeypatch, mem):
    calls = {}
    monkeypatch.setattr(cli, "report", lambda: {"memory_gb": mem})

    def fake_run(script_path, combos, out_dir, speed, skipped=None):
        calls.update(combos=combos, skipped=skipped, out_dir=out_dir)
        return {"results": [{"ok": True}]}
    monkeypatch.setattr(cli.benchmark, "run", fake_run)
    assert cli.main(["benchmark"]) == 0
    return calls


def test_benchmark_on_a_16gb_air_skips_the_large_model(narrator_home, monkeypatch):
    calls = _run_bench(monkeypatch, 16)
    assert ("qwen3-1.7b", "Ryan") not in calls["combos"]
    assert ("qwen3", "Ryan") in calls["combos"]
    assert [s["engine"] for s in calls["skipped"]] == ["qwen3-1.7b"]
    assert calls["out_dir"].parent == narrator_home / "benchmarks"


def test_benchmark_on_a_48gb_pro_runs_everything(narrator_home, monkeypatch):
    calls = _run_bench(monkeypatch, 48)
    assert ("qwen3-1.7b", "Ryan") in calls["combos"]
    assert calls["skipped"] == []


def test_model_size_ignores_hf_symlinks(tmp_path):
    from lantern_narrator.benchmark import _dir_size_mb

    blobs = tmp_path / "blobs"
    snap = tmp_path / "snapshots" / "abc"
    blobs.mkdir()
    snap.mkdir(parents=True)
    blob = blobs / "deadbeef"
    blob.write_bytes(b"\0" * (2 * 1024 ** 2))
    (snap / "model.safetensors").symlink_to(blob)
    assert _dir_size_mb([tmp_path]) == 2.0
