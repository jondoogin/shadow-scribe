from .base import Engine, EngineInfo, EngineUnavailable, Voice


def create_engine(engine_id: str, **kwargs) -> Engine:
    """Instantiate an engine by id without importing heavy dependencies early."""
    if engine_id in ("kokoro", "kokoro-onnx"):
        from .kokoro_onnx import KokoroOnnxEngine
        return KokoroOnnxEngine(**kwargs)
    if engine_id == "kokoro-int8":
        from .kokoro_onnx import KokoroOnnxEngine
        return KokoroOnnxEngine(variant="int8", **kwargs)
    if engine_id == "kokoro-mlx":
        from .mlx_engines import KokoroMlxEngine
        return KokoroMlxEngine(**kwargs)
    if engine_id == "pocket":
        from .pocket import PocketEngine
        return PocketEngine(**kwargs)
    if engine_id == "qwen3":
        from .mlx_engines import Qwen3MlxEngine
        return Qwen3MlxEngine(**kwargs)
    if engine_id == "qwen3-1.7b":
        from .mlx_engines import Qwen3LargeMlxEngine
        return Qwen3LargeMlxEngine(**kwargs)
    if engine_id == "qwen3-designed":
        from .designed import DesignedVoiceEngine
        return DesignedVoiceEngine(**kwargs)
    if engine_id == "fake":
        from .fake import FakeEngine
        return FakeEngine(**kwargs)
    raise ValueError(f"Unknown engine '{engine_id}'. Known: {', '.join(ENGINE_IDS)}")


ENGINE_IDS = ["kokoro", "kokoro-int8", "kokoro-mlx", "pocket", "qwen3", "qwen3-1.7b", "qwen3-designed", "fake"]

# Unified memory (GB) an engine needs to run a whole book comfortably, alongside
# a browser and the usual apps. Below this the benchmark skips the engine by
# default (pass --only to force it) and `doctor` warns. Kokoro and Pocket fit
# in any Apple Silicon Mac, including the 8/16 GB Airs.
ENGINE_MIN_MEMORY_GB = {"qwen3": 12, "qwen3-1.7b": 24, "qwen3-designed": 24}


def memory_shortfall(engine_id: str, memory_gb: float | None) -> str | None:
    """Reason to skip `engine_id` on a machine with `memory_gb`, or None if it should fit."""
    need = ENGINE_MIN_MEMORY_GB.get(engine_id)
    if not need or not memory_gb or memory_gb >= need:
        return None
    return f"needs about {need} GB of memory; this machine has {memory_gb:g} GB (use --only to run it anyway)"


__all__ = ["Engine", "EngineInfo", "EngineUnavailable", "Voice", "create_engine", "ENGINE_IDS",
           "ENGINE_MIN_MEMORY_GB", "memory_shortfall"]
