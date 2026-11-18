"""Image checks before a painting is kept (docs/VISUAL_JOURNEY.md §4.5).

Apple Vision (through pyobjc, built into macOS, no download) looks for faces
and legible text. Anything found is rejected and the scene is repainted with
the next seed. Where Vision isn't available (Linux, tests) the check reports
`checked: False` rather than pretending to have passed.
"""
from __future__ import annotations

import io


def vision_available() -> bool:
    try:
        import Vision  # noqa: F401
        import Quartz  # noqa: F401
        return True
    except Exception:
        return False


def check(img) -> dict:
    if not vision_available():
        return {"checked": False, "faces": None, "text": None, "ok": True}
    return _vision_check(img)  # pragma: no cover - macOS only


def _vision_check(img) -> dict:  # pragma: no cover - macOS only
    import Quartz
    import Vision
    from Foundation import NSData

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    data = NSData.dataWithBytes_length_(buf.getvalue(), len(buf.getvalue()))
    src = Quartz.CGImageSourceCreateWithData(data, None)
    cg = Quartz.CGImageSourceCreateImageAtIndex(src, 0, None)
    handler = Vision.VNImageRequestHandler.alloc().initWithCGImage_options_(cg, None)
    faces = Vision.VNDetectFaceRectanglesRequest.alloc().init()
    text = Vision.VNRecognizeTextRequest.alloc().init()
    text.setRecognitionLevel_(Vision.VNRequestTextRecognitionLevelAccurate)
    handler.performRequests_error_([faces, text], None)
    n_faces = len(faces.results() or [])
    words = [r.topCandidates_(1)[0].string() for r in (text.results() or []) if r.topCandidates_(1)]
    words = [w for w in words if sum(ch.isalpha() for ch in w) >= 3]
    return {"checked": True, "faces": n_faces, "text": words[:5], "ok": n_faces == 0 and not words}
