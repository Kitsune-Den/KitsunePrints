"""
Regenerate the six frame-preset strips in public/frames/ (256x1024 RGBA).

Why regenerate: the original strips were authored with horizontal seam-marker
bands, and the in-game backer-portrait mesh samples part of the wood zone into
the visible canvas, leaking those bands across prints as gray horizontal
strips (bug report: HakurouHayate, V2.6 b14). clean_wood_pngs.py blurred the
1-3 px pinstripes away, but the WIDE horizontal bands survived the blur and
still ship in wood_dark/wood_light, and ornate_gold is built almost entirely
from horizontal ridges.

Fix class, not instance: every texture here varies only along the X axis.
Each row of the strip is identical except for low-amplitude per-pixel grain
noise, so no matter which rows the frame mesh wrap samples (or leaks), the
result is seamless ~ there is nothing horizontal left to leak.

Deterministic (fixed seed). Writes straight into public/frames/.
"""
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / 'public' / 'frames'

W, H = 256, 1024
RNG_SEED = 70042


def _smooth_noise_1d(rng: np.random.Generator, n: int, octaves: list[tuple[int, float]]) -> np.ndarray:
    """Sum of smooth value-noise octaves along one axis, normalized to [-1, 1].

    octaves: list of (control_points, amplitude). Each octave draws random
    control values and cosine-interpolates them across n samples.
    """
    out = np.zeros(n, dtype=np.float64)
    for points, amp in octaves:
        ctrl = rng.uniform(-1, 1, points + 1)
        xs = np.linspace(0, points, n, endpoint=False)
        i0 = xs.astype(int)
        frac = xs - i0
        # Cosine interpolation ~ smoother than linear, no library deps.
        t = (1 - np.cos(frac * np.pi)) / 2
        out += amp * (ctrl[i0] * (1 - t) + ctrl[i0 + 1] * t)
    m = np.max(np.abs(out))
    return out / m if m > 0 else out


def _column_profile_to_rgba(profile_rgb: np.ndarray, grain: float, rng: np.random.Generator) -> np.ndarray:
    """Tile a (W, 3) column profile down H rows and add fine per-pixel grain.

    grain is the +/- amplitude (in 0-255 units) of uniform noise ~ high
    frequency and low amplitude, so it reads as surface texture, never as
    horizontal structure.
    """
    img = np.tile(profile_rgb[None, :, :], (H, 1, 1)).astype(np.float64)
    if grain > 0:
        img += rng.uniform(-grain, grain, img.shape)
    rgba = np.empty((H, W, 4), dtype=np.uint8)
    rgba[:, :, :3] = np.clip(img, 0, 255).astype(np.uint8)
    rgba[:, :, 3] = 255
    return rgba


def _lerp(a: np.ndarray, b: np.ndarray, t: np.ndarray) -> np.ndarray:
    return a[None, :] * (1 - t[:, None]) + b[None, :] * t[:, None]


def make_wood(rng: np.random.Generator, dark: tuple, light: tuple) -> np.ndarray:
    """Vertical wood grain: broad planks of tonal variation + fine streaks."""
    dark_c = np.array(dark, dtype=np.float64)
    light_c = np.array(light, dtype=np.float64)
    broad = _smooth_noise_1d(rng, W, [(6, 1.0), (14, 0.5)])
    fine = _smooth_noise_1d(rng, W, [(48, 1.0), (90, 0.6)])
    t = np.clip(0.5 + 0.32 * broad + 0.18 * fine, 0, 1)
    profile = _lerp(dark_c, light_c, t)
    # Occasional darker grain lines ~ narrow dips in brightness.
    lines = _smooth_noise_1d(rng, W, [(120, 1.0)])
    line_mask = np.clip((lines - 0.55) * 4, 0, 1)  # sparse peaks become lines
    profile *= (1 - 0.35 * line_mask)[:, None]
    return _column_profile_to_rgba(profile, grain=3.5, rng=rng)


def make_metal(rng: np.random.Generator, base: tuple, lo: float, hi: float, grain: float) -> np.ndarray:
    """Brushed metal: dense fine vertical streaks over a soft sheen."""
    base_c = np.array(base, dtype=np.float64)
    sheen = _smooth_noise_1d(rng, W, [(4, 1.0)])
    streaks = _smooth_noise_1d(rng, W, [(64, 0.7), (128, 1.0)])
    factor = 1 + lo * sheen + hi * streaks
    profile = np.clip(base_c[None, :] * factor[:, None], 0, 255)
    return _column_profile_to_rgba(profile, grain=grain, rng=rng)


def make_ornate_gold(rng: np.random.Generator) -> np.ndarray:
    """Ornate gold: repeating vertical bead-and-reel columns ~ highlight /
    shadow pairs that read as carved ridges running along the frame."""
    base = np.array((163, 116, 40), dtype=np.float64)   # matches preset tint #a37428
    hi = np.array((232, 196, 110), dtype=np.float64)
    lo = np.array((92, 62, 18), dtype=np.float64)
    x = np.arange(W)
    period = 32
    phase = (x % period) / period
    # Asymmetric ridge: sharp highlight on one flank, soft shadow on the other.
    ridge = np.sin(phase * 2 * np.pi)
    ridge_hi = np.clip(ridge, 0, 1) ** 2
    ridge_lo = np.clip(-ridge, 0, 1) ** 1.5
    wobble = _smooth_noise_1d(rng, W, [(10, 1.0)]) * 0.12
    profile = base[None, :] * (1 + wobble[:, None])
    profile = profile + ridge_hi[:, None] * (hi - base)[None, :] * 0.75
    profile = profile + ridge_lo[:, None] * (lo - base)[None, :] * 0.65
    return _column_profile_to_rgba(np.clip(profile, 0, 255), grain=2.5, rng=rng)


def make_matte_black(rng: np.random.Generator) -> np.ndarray:
    """Matte black: near-flat charcoal with the faintest vertical tonal drift."""
    base = np.array((34, 34, 36), dtype=np.float64)     # near preset tint #2a2a2a
    drift = _smooth_noise_1d(rng, W, [(8, 1.0)]) * 0.08
    profile = np.clip(base[None, :] * (1 + drift[:, None]), 0, 255)
    return _column_profile_to_rgba(profile, grain=2.0, rng=rng)


def main() -> None:
    rng = np.random.default_rng(RNG_SEED)
    textures = {
        # Palette anchors sit near each preset's tint in src/types/slots.ts.
        'wood_dark.png': make_wood(rng, dark=(50, 30, 14), light=(110, 72, 38)),
        'wood_light.png': make_wood(rng, dark=(140, 95, 56), light=(205, 158, 110)),
        'gold_gilt.png': make_metal(rng, base=(212, 175, 55), lo=0.10, hi=0.07, grain=2.0),
        'silver.png': make_metal(rng, base=(176, 176, 180), lo=0.09, hi=0.08, grain=2.5),
        'matte_black.png': make_matte_black(rng),
        'ornate_gold.png': make_ornate_gold(rng),
    }
    for name, rgba in textures.items():
        # Guard the invariant this whole script exists for: rows must be
        # identical up to grain noise. Compare two distant rows' smoothed
        # values ~ any surviving horizontal structure fails loudly.
        a = rgba[100, :, :3].astype(int)
        b = rgba[900, :, :3].astype(int)
        assert np.abs(a - b).max() <= 16, f"{name}: rows differ beyond grain noise"
        Image.fromarray(rgba).save(OUT_DIR / name)
        print(f"  wrote {name}  ({W}x{H})")
    print(f"\nRegenerated {len(textures)} frame strips into {OUT_DIR}")


if __name__ == '__main__':
    main()
