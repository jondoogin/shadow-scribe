"""Light-touch audio assembly: trim, join, normalise, encode.

Deliberately conservative. No compression, EQ or denoising; only edge
silence trimming, 5 ms fades against clicks, deterministic pauses between
sentences/paragraphs, one loudness gain per chapter and a peak ceiling.
"""
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np

TARGET_LUFS = -18.0       # integrated loudness (ITU-R BS.1770); comfortable on phones, leaves room for ambience
PEAK_CEILING = 0.841      # -1.5 dBFS sample peak: headroom for AAC encoder overshoot


def db_to_amp(db: float) -> float:
    return float(10 ** (db / 20))


def amp_to_db(a: float) -> float:
    return float(20 * np.log10(max(a, 1e-12)))


def frame_rms(x: np.ndarray, sr: int, frame_ms: int = 10) -> np.ndarray:
    n = max(1, int(sr * frame_ms / 1000))
    frames = len(x) // n
    if frames == 0:
        return np.array([np.sqrt(np.mean(x ** 2))]) if len(x) else np.zeros(0)
    trimmed = x[: frames * n].reshape(frames, n)
    return np.sqrt(np.mean(trimmed ** 2, axis=1))


def trim_silence(x: np.ndarray, sr: int, threshold_db: float = -48.0, pad_ms: int = 40) -> np.ndarray:
    """Remove leading/trailing near-silence, keeping a short pad so word tails survive."""
    if len(x) == 0:
        return x
    frame = max(1, int(sr * 0.01))
    rms = frame_rms(x, sr, 10)
    loud = np.where(rms > db_to_amp(threshold_db))[0]
    if len(loud) == 0:
        return x[:0]
    pad = int(sr * pad_ms / 1000)
    start = max(0, loud[0] * frame - pad)
    end = min(len(x), (loud[-1] + 1) * frame + pad)
    return x[start:end]


def apply_fades(x: np.ndarray, sr: int, ms: float = 5.0) -> np.ndarray:
    n = min(len(x) // 2, int(sr * ms / 1000))
    if n <= 0:
        return x
    y = x.copy()
    ramp = np.linspace(0.0, 1.0, n, dtype=np.float32)
    y[:n] *= ramp
    y[-n:] *= ramp[::-1]
    return y


def silence(sr: int, ms: float) -> np.ndarray:
    return np.zeros(int(sr * ms / 1000), dtype=np.float32)


def _biquad_power(b, a, w):
    z = np.exp(-1j * w)
    num = b[0] + b[1] * z + b[2] * z ** 2
    den = a[0] + a[1] * z + a[2] * z ** 2
    return np.abs(num / den) ** 2


def _k_weighting_power(sr: int, n_fft: int) -> np.ndarray:
    """|H(f)|^2 of the BS.1770 K-weighting filter (pre-filter shelf + RLB high-pass) at rfft bins."""
    w = 2 * np.pi * np.fft.rfftfreq(n_fft, 1 / sr) / sr
    # High shelf (coefficients derived for any sample rate, as in pyloudnorm)
    G, Q, fc = 3.99984385397, 0.7071752369554193, 1681.9744509555319
    K = np.tan(np.pi * fc / sr)
    Vh, Vb = 10 ** (G / 20), (10 ** (G / 20)) ** 0.499666774155
    a0 = 1 + K / Q + K * K
    shelf_b = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0]
    shelf_a = [1.0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0]
    # High-pass
    Q2, fc2 = 0.5003270373253953, 38.13547087613982
    K2 = np.tan(np.pi * fc2 / sr)
    a02 = 1 + K2 / Q2 + K2 * K2
    hp_b = [1.0, -2.0, 1.0]
    hp_a = [1.0, 2 * (K2 * K2 - 1) / a02, (1 - K2 / Q2 + K2 * K2) / a02]
    return _biquad_power(shelf_b, shelf_a, w) * _biquad_power(hp_b, hp_a, w)


def integrated_loudness(x: np.ndarray, sr: int) -> float:
    """Gated integrated loudness in LUFS (mono), computed per 400 ms block in the frequency domain."""
    block, hop = int(0.4 * sr), int(0.1 * sr)
    if len(x) < block:
        x = np.pad(x, (0, block - len(x)))
    n = 1 + (len(x) - block) // hop
    idx = np.arange(block)[None, :] + hop * np.arange(n)[:, None]
    weights = _k_weighting_power(sr, block)
    powers = []
    for start in range(0, n, 512):  # bounded memory for hour-long chapters
        frames = x[idx[start:start + 512]]
        spec = np.abs(np.fft.rfft(frames, axis=1)) ** 2
        spec[:, 1:-1] *= 2  # one-sided spectrum
        powers.append((spec * weights).sum(axis=1) / (block * block))
    z = np.concatenate(powers)
    lufs = -0.691 + 10 * np.log10(np.maximum(z, 1e-12))
    gated = z[lufs > -70]
    if len(gated) == 0:
        return -120.0
    rel = -0.691 + 10 * np.log10(gated.mean()) - 10
    gated = z[(lufs > -70) & (lufs > rel)]
    return float(-0.691 + 10 * np.log10(gated.mean())) if len(gated) else -120.0


def peak_limit(x: np.ndarray, sr: int, ceiling: float = PEAK_CEILING,
               attack_ms: float = 1.5, release_ms: float = 60.0) -> np.ndarray:
    """Transparent peak limiter that only touches the few samples above the ceiling.

    Builds a gain envelope around each over-ceiling cluster (short linear attack
    before it, smooth release after) instead of processing the whole signal, so
    a one-hour chapter costs milliseconds and normal speech is left untouched.
    """
    a = np.abs(x)
    over = np.where(a > ceiling)[0]
    if len(over) == 0:
        return x
    env = np.ones(len(x), dtype=np.float32)
    att, rel = max(1, int(sr * attack_ms / 1000)), max(1, int(sr * release_ms / 1000))
    # cluster indices that are close together
    breaks = np.where(np.diff(over) > att + rel)[0]
    starts = np.concatenate([[over[0]], over[breaks + 1]])
    ends = np.concatenate([over[breaks], [over[-1]]])
    for s0, e0 in zip(starts, ends):
        g = float(ceiling / a[s0:e0 + 1].max())
        lo, hi = max(0, s0 - att), min(len(x), e0 + rel + 1)
        shape = np.ones(hi - lo, dtype=np.float32) * g
        k = s0 - lo
        shape[:k] = np.linspace(1.0, g, k, endpoint=False) if k else shape[:k]
        tail = hi - (e0 + 1)
        if tail > 0:
            shape[-tail:] = g + (1 - g) * (1 - np.exp(-5 * np.arange(1, tail + 1) / tail))
        env[lo:hi] = np.minimum(env[lo:hi], shape)
    return (x * env).astype(np.float32)


def normalize(x: np.ndarray, sr: int, target_lufs: float = TARGET_LUFS, max_gain_db: float = 12.0) -> tuple[np.ndarray, float]:
    """One static gain to the target loudness, then a peak limiter at -1 dBFS.

    Per chapter, never per sentence, so there is no pumping between lines.
    """
    if len(x) == 0:
        return x, 0.0
    current = integrated_loudness(x, sr)
    if current <= -119:
        return x, 0.0
    gain_db = min(max_gain_db, target_lufs - current)
    y = peak_limit(x * db_to_amp(gain_db), sr)
    return np.clip(y, -1.0, 1.0).astype(np.float32), gain_db


def write_wav_atomic(path: Path, x: np.ndarray, sr: int) -> None:
    import soundfile as sf

    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(suffix=".wav", dir=path.parent)
    os.close(fd)
    try:
        sf.write(tmp, np.clip(x, -1, 1), sr, subtype="PCM_16")
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def encoder_available() -> str | None:
    if shutil.which("afconvert"):
        return "afconvert"
    if shutil.which("ffmpeg"):
        return "ffmpeg"
    return None


def encode_aac(wav: Path, out: Path, bitrate: int = 64000) -> Path:
    """Encode to AAC-LC in an .m4a container (plays on Safari/iOS, Chrome, Firefox).

    Writes to a temp file then renames, so an interrupted encode never leaves
    a truncated chapter behind. Falls back to keeping the WAV if no encoder.
    """
    enc = encoder_available()
    out.parent.mkdir(parents=True, exist_ok=True)
    if enc is None:
        target = out.with_suffix(".wav")
        shutil.copyfile(wav, target)
        return target
    tmp = out.with_name(out.stem + ".partial.m4a")
    if enc == "afconvert":
        cmd = ["afconvert", "-f", "m4af", "-d", "aac", "-b", str(bitrate), str(wav), str(tmp)]
    else:
        cmd = ["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(wav),
               "-c:a", "aac", "-b:a", str(bitrate), "-movflags", "+faststart", str(tmp)]
    subprocess.run(cmd, check=True)
    os.replace(tmp, out)
    return out


def mime_for(path: Path) -> str:
    return {".m4a": "audio/mp4", ".wav": "audio/wav", ".mp3": "audio/mpeg"}.get(path.suffix, "application/octet-stream")
