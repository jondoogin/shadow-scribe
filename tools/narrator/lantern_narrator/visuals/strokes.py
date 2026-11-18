"""Stroke-order maps (docs/VISUAL_JOURNEY.md §7.2).

A small greyscale image that says WHEN each part of the painting is painted
during the paint-in: 0 (black) first, 1 (white) last. Broad flat areas come
first, edges and fine detail later, and the focal point last, the way a
painter blocks in washes before details. Lantern reads the red channel.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageFilter

MAP_SIZE = (400, 250)


def _rank01(a: np.ndarray) -> np.ndarray:
    """Histogram-equalise to 0..1 so the reveal spreads evenly over time."""
    flat = a.ravel()
    order = np.argsort(flat, kind="stable")
    ranks = np.empty_like(order, dtype=np.float64)
    ranks[order] = np.linspace(0.0, 1.0, flat.size)
    return ranks.reshape(a.shape)


def stroke_map(img: Image.Image, focus: dict | None = None, seed: int = 0) -> Image.Image:
    """Stroke map for any image (used for model-made paintings)."""
    w, h = MAP_SIZE
    small = img.convert("L").resize((w, h), Image.LANCZOS)
    g = np.asarray(small, dtype=np.float64) / 255.0
    gy, gx = np.gradient(g)
    detail = np.hypot(gx, gy)
    detail = np.asarray(Image.fromarray((detail / (detail.max() or 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6)), dtype=np.float64) / 255
    fx, fy = (focus or {}).get("x", 0.5), (focus or {}).get("y", 0.45)
    yy, xx = np.mgrid[0:h, 0:w]
    dist = np.hypot(xx / w - fx, (yy / h - fy) * 0.7)
    near_focus = 1 - dist / (dist.max() or 1)
    rng = np.random.default_rng(seed)
    noise = np.asarray(Image.fromarray((rng.random((h // 8, w // 8)) * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR), dtype=np.float64) / 255
    order = 0.55 * detail + 0.3 * near_focus + 0.15 * noise
    # Quantise into patches of ~8 px so the reveal reads as strokes, not a gradient.
    order = np.asarray(Image.fromarray((_rank01(order) * 255).astype(np.uint8)).resize((w // 6, h // 6), Image.BILINEAR).resize((w, h), Image.NEAREST)
                       .filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float64) / 255
    return Image.fromarray((_rank01(order) * 255).astype(np.uint8), "L")
