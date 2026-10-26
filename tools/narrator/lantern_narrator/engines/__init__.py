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
    if engine_id == "fake":
        from .fake import FakeEngine
        return FakeEngine(**kwargs)
    raise ValueError(f"Unknown engine '{engine_id}'. Known: {', '.join(ENGINE_IDS)}")


ENGINE_IDS = ["kokoro", "kokoro-int8", "kokoro-mlx", "pocket", "qwen3", "fake"]

__all__ = ["Engine", "EngineInfo", "EngineUnavailable", "Voice", "create_engine", "ENGINE_IDS"]
