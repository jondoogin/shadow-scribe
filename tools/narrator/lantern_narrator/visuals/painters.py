"""Image engines.

`fixture`        deterministic painter in numpy + Pillow. Draws a simple scene
                 from the descriptor with layered brush strokes and records
                 the stroke order. No model, no download: it lets the whole
                 pipeline (and Lantern's import and display) be tested on any
                 machine. Its images are labelled as drawn by code.
`flux2-klein-4b` FLUX.2 [klein] 4B (Apache-2.0) through mflux on Apple
                 Silicon (`mflux-generate-flux2`, mflux 0.16+). Not run in
                 the cloud test environment; measured on the Mac only.
"""
from __future__ import annotations

import hashlib
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from ..paths import isolate_caches
from .strokes import MAP_SIZE, stroke_map

SIZE = (1600, 1000)

COLOURS = {
    "slate blue": (86, 104, 128), "sea grey": (128, 138, 140), "pale sand": (214, 198, 166), "storm teal": (58, 92, 98),
    "tar black": (44, 42, 40), "rope ochre": (176, 140, 84), "weathered oak": (122, 98, 72), "sail cream": (226, 216, 192),
    "moss green": (92, 112, 70), "bark umber": (92, 70, 52), "fern": (110, 136, 84), "shadow olive": (70, 76, 54),
    "sage": (150, 162, 128), "rose madder": (178, 104, 104), "cream": (232, 224, 204), "leaf green": (112, 144, 92),
    "heather mauve": (142, 112, 138), "peat brown": (96, 74, 58), "sky grey": (170, 176, 180), "bracken rust": (160, 96, 60),
    "ochre": (190, 150, 88), "sky blue": (150, 180, 206), "chalk": (230, 228, 218), "granite grey": (120, 122, 124),
    "snow white": (236, 238, 238), "pine green": (58, 84, 66), "cold blue": (110, 140, 170), "willow green": (136, 156, 104),
    "silt brown": (130, 112, 86), "silver": (196, 200, 202), "reed ochre": (182, 160, 104), "mist grey": (186, 190, 190),
    "wheat gold": (210, 182, 112), "earth umber": (110, 86, 62), "stone grey": (150, 148, 140), "thatch ochre": (180, 150, 96),
    "brick": (150, 84, 64), "soot grey": (80, 80, 82), "gaslight amber": (222, 168, 92), "slate": (96, 102, 108),
    "dust ochre": (196, 170, 120), "hedge green": (88, 112, 72), "umber": (104, 80, 58), "lichen green": (150, 160, 120),
    "ivy": (70, 98, 66), "pale sky": (200, 214, 222), "candle gold": (230, 180, 96), "oak brown": (120, 90, 62),
}
SKY = {"dawn": ((236, 200, 186), (150, 170, 200)), "morning": ((214, 226, 232), (150, 182, 210)),
       "midday": ((200, 220, 236), (120, 160, 206)), "afternoon": ((236, 214, 170), (160, 180, 200)),
       "evening": ((236, 170, 110), (120, 100, 140)), "night": ((60, 70, 100), (22, 28, 50))}
OPEN = {"sea shore", "harbour", "ship deck", "moor", "hills", "field", "lake", "river", "road", "mountains", "ruins"}


def colour(name: str, seed: int = 0) -> tuple[int, int, int]:
    if name in COLOURS:
        return COLOURS[name]
    h = hashlib.sha1(f"{name}{seed}".encode()).digest()
    return (90 + h[0] % 120, 90 + h[1] % 110, 80 + h[2] % 110)


class FixturePainter:
    id = "fixture"
    label = "Code-drawn fixture painter (no model)"
    license = "n/a (drawn by code)"
    makes_strokes = True

    def paint(self, prompt: str, descriptor: dict, seed: int, size=SIZE) -> tuple[Image.Image, Image.Image]:
        rng = np.random.default_rng(seed)
        target = self._composition(descriptor, rng, size)
        return self._brush(target, descriptor, rng, size)

    def _composition(self, d: dict, rng, size) -> np.ndarray:
        w, h = 160, 100
        setting = d.get("setting") or ""
        time = d.get("timeOfDay") or "afternoon"
        top, bottom = SKY.get(time, SKY["afternoon"])
        pal = [colour(p) for p in (d.get("palette") or ["umber", "sage"])] + [colour("umber"), colour("sage")]
        yy = np.linspace(0, 1, h)[:, None, None]
        img = np.array(top, float) * (1 - yy) + np.array(bottom, float) * yy
        img = np.repeat(img, w, axis=1)
        interior = setting not in OPEN and setting not in ("forest", "garden", "village street", "city street")
        if interior:
            wall = np.array(pal[0], float) * 0.7 + 40
            img[:] = wall
            wx0, wx1 = int(w * (0.55 + rng.random() * 0.15)), int(w * 0.88)
            img[int(h * 0.18):int(h * 0.62), wx0:wx1] = np.array(top) * 0.85 + 30          # a window
            img[int(h * 0.72):, :] = np.array(pal[1], float) * 0.8                          # floor
            if d.get("light") in ("candlelight", "firelight", "lamplight"):
                cy, cx = int(h * 0.62), int(w * 0.3)
                Y, X = np.mgrid[0:h, 0:w]
                glow = np.exp(-(((X - cx) / 26) ** 2 + ((Y - cy) / 18) ** 2))[..., None]
                img = img * (1 - glow * 0.6) + np.array(colour("candle gold"), float) * glow * 0.6
        else:
            horizon = 0.5 if setting == "mountains" else 0.58
            hy = int(h * horizon)
            ground = np.array(pal[0] if setting not in ("sea shore", "lake", "harbour") else colour("sea grey"), float)
            for y in range(hy, h):
                t = (y - hy) / max(1, h - hy)
                img[y] = ground * (1 - t * 0.35) + np.array(pal[1], float) * t * 0.35
            if setting in ("sea shore", "lake", "harbour"):
                sand = int(h * 0.82)
                img[sand:] = np.array(colour("pale sand"), float) * 0.9
            if setting in ("mountains", "hills", "moor"):
                xs = np.arange(w)
                ridge = hy - (np.sin(xs / w * math.pi * (2 + rng.random() * 2) + rng.random() * 6) * 0.5 + 0.5) * h * (0.28 if setting == "mountains" else 0.1)
                for x in xs:
                    img[int(ridge[x]):hy, x] = np.array(pal[2], float) * 0.85
            if setting == "forest":
                for _ in range(14):
                    x = int(rng.random() * w)
                    img[:, max(0, x - 2):x + 2] = np.array(colour("bark umber"), float)
        weather = d.get("weather")
        if weather in ("rain", "fog", "storm"):
            grey = img.mean(axis=2, keepdims=True)
            img = img * 0.55 + grey * 0.45
            img = img * 0.85 + 30 if weather == "fog" else img * 0.9
        if weather == "snow":
            img[int(h * 0.6):] = img[int(h * 0.6):] * 0.3 + 170
        if time == "night":
            img = img * 0.55
        small = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB").filter(ImageFilter.GaussianBlur(1.5))
        return np.asarray(small.resize(size, Image.BICUBIC), dtype=np.float64)

    def _brush(self, target: np.ndarray, d: dict, rng, size) -> tuple[Image.Image, Image.Image]:
        w, h = size
        canvas = Image.new("RGB", size, tuple(int(c) for c in target.mean(axis=(0, 1))))
        order = Image.new("L", size, 0)
        dc, do = ImageDraw.Draw(canvas), ImageDraw.Draw(order)
        fx, fy = (d.get("focus") or {}).get("x", 0.5) * w, (d.get("focus") or {}).get("y", 0.45) * h
        layers = [(56, 0.0), (30, 0.3), (16, 0.55), (8, 0.8)]
        for li, (r, t0) in enumerate(layers):
            step = int(r * 1.1)
            pts = [(x + rng.uniform(-step / 2, step / 2), y + rng.uniform(-step / 2, step / 2))
                   for y in range(0, h + step, step) for x in range(0, w + step, step)]
            if li == len(layers) - 1:   # finest strokes only where there is detail
                gy, gx = np.gradient(target.mean(axis=2))
                mag = np.hypot(gx, gy)
                pts = [p for p in pts if mag[min(h - 1, int(p[1])), min(w - 1, int(p[0]))] > 1.2 or rng.random() < 0.15]
            pts.sort(key=lambda p: -math.hypot(p[0] - fx, p[1] - fy))     # far first, focus last
            span = (layers[li + 1][1] if li + 1 < len(layers) else 1.0) - t0
            for k, (x, y) in enumerate(pts):
                cx, cy = min(w - 1, max(0, int(x))), min(h - 1, int(max(0, y)))
                c = target[cy, cx] + rng.normal(0, 7, 3)
                ang = rng.normal(0.0, 0.35)
                poly = _ellipse(x, y, r * rng.uniform(0.9, 1.4), r * rng.uniform(0.35, 0.6), ang)
                dc.polygon(poly, fill=tuple(int(v) for v in np.clip(c, 0, 255)))
                do.polygon(poly, fill=int(255 * (t0 + span * k / max(1, len(pts)))))
        canvas = canvas.filter(ImageFilter.GaussianBlur(0.6))
        strokes = order.resize(MAP_SIZE, Image.BILINEAR).filter(ImageFilter.GaussianBlur(1.2))
        return canvas, strokes


def _ellipse(x, y, rx, ry, ang, n=14):
    ca, sa = math.cos(ang), math.sin(ang)
    return [(x + rx * math.cos(t) * ca - ry * math.sin(t) * sa, y + rx * math.cos(t) * sa + ry * math.sin(t) * ca)
            for t in (2 * math.pi * i / n for i in range(n))]


class FluxKleinPainter:
    """FLUX.2 [klein] 4B via mflux's command line. Apple Silicon only."""
    id = "flux2-klein-4b"
    label = "FLUX.2 [klein] 4B (mflux)"
    license = "Apache-2.0"
    makes_strokes = False
    repo = "black-forest-labs/FLUX.2-klein-4B"
    steps = 4

    def __init__(self, quantize: int | None = 8, repo: str | None = None):
        self.quantize = quantize
        if repo:
            self.repo = repo
        isolate_caches()   # model downloads stay inside the narrator folder
        self.cmd = shutil.which("mflux-generate-flux2")
        if not self.cmd:
            raise RuntimeError("FLUX.2 klein needs mflux 0.16 or later: pip install -e '.[visuals]' (Apple Silicon only).")

    def paint(self, prompt: str, descriptor: dict, seed: int, size=SIZE) -> tuple[Image.Image, Image.Image]:  # pragma: no cover - Mac only
        with tempfile.TemporaryDirectory(dir=str(_tmp_root())) as td:
            out = Path(td) / "out.png"
            cmd = [self.cmd, "--model", self.repo, "--prompt", prompt, "--width", str(size[0]), "--height", str(size[1]),
                   "--steps", str(self.steps), "--seed", str(seed), "--output", str(out)]
            if self.quantize:
                cmd += ["--quantize", str(self.quantize)]
            proc = subprocess.run(cmd, capture_output=True, text=True)
            if proc.returncode != 0 or not out.exists():
                raise RuntimeError((proc.stderr or proc.stdout or "mflux failed").strip()[-400:])
            img = Image.open(out).convert("RGB")
            img.load()
        return img, stroke_map(img, descriptor.get("focus"), seed)


def _tmp_root() -> Path:
    from ..paths import home
    p = home() / "tmp"
    p.mkdir(parents=True, exist_ok=True)
    return p


PAINTERS = {"fixture": FixturePainter, "flux2-klein-4b": FluxKleinPainter}
# Memory needed to run each painter comfortably (GB of unified memory).
PAINTER_MIN_MEMORY_GB = {"fixture": 0, "flux2-klein-4b": 12}


def create_painter(kind: str, **kw):
    if kind not in PAINTERS:
        raise ValueError(f"Unknown image model {kind!r}. Choose one of: {', '.join(PAINTERS)}.")
    return PAINTERS[kind](**kw) if kind != "fixture" else FixturePainter()
