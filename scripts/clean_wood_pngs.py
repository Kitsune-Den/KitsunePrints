"""
Remove horizontal pinstripe seam markers from public/frames/*.png.

These PNGs were authored with horizontal cream/light bands intended as
3D-frame-mesh wrap seam markers. In V2.6 b14 the backer-portrait mesh
appears to sample part of the wood-zone into the visible canvas, making
those pinstripes leak across the print as grayish horizontal strips
(bug report: HakurouHayate, 7D2D V2.6 b14).

Strategy: vertical-axis blur. Wood texture has strong horizontal
repetition (similar pixels along a row, vertical grain), so Y-axis blur
PRESERVES the wood look. Pinstripes are horizontal artifacts (rows that
differ from their neighbors), so Y-axis blur smooths them OUT.

We use a 9-row Gaussian-equivalent box blur applied only on axis 0.
Channels including alpha are blurred independently so transparency
patterns (in matte_black.png etc.) carry through unchanged.

Outputs to scripts/_cleaned_wood_pngs/ for review. After approval, copy
into public/frames/.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / 'public' / 'frames'
OUT_DIR = ROOT / 'scripts' / '_cleaned_wood_pngs'
OUT_DIR.mkdir(exist_ok=True)

# 9-row vertical box blur. Pinstripes are 1-3 rows wide; a 9-row average
# spreads them into ~7 rows of surrounding wood, making them imperceptible
# without losing vertical grain definition.
KERNEL_SIZE = 21


def vertical_box_blur(img: Image.Image, kernel_size: int = KERNEL_SIZE) -> Image.Image:
    """Apply a 1D box blur along the Y axis only, per channel.

    Uses a cumulative-sum trick: for each column independently, the moving
    average over a kernel-sized window is (cumsum[k:] - cumsum[:-k]) / k.
    Edges are handled via 'reflect' padding so a pinstripe that happens to
    sit near the top/bottom edge gets averaged with non-pinstripe rows
    from inside the image rather than with replicated copies of itself.
    """
    arr = np.array(img.convert('RGBA')).astype(np.float32)
    h, w, c = arr.shape
    half = kernel_size // 2
    out = np.empty_like(arr)
    for ci in range(c):
        padded = np.pad(arr[:, :, ci], ((half, half), (0, 0)), mode='reflect')
        cumsum = np.cumsum(padded, axis=0)
        # cumsum has shape (h + 2*half + 1?). With cumsum, sum of rows
        # [start:end] = cumsum[end] - cumsum[start]. We want windows of
        # size kernel_size, so window_sum[y] = cumsum[y+k] - cumsum[y].
        # Pre-pad: index 0 = sum of zero rows; we need cumsum starting from 0.
        cumsum = np.concatenate([np.zeros((1, w), dtype=cumsum.dtype), cumsum], axis=0)
        window_sum = cumsum[kernel_size:] - cumsum[:-kernel_size]
        out[:, :, ci] = window_sum / kernel_size
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def make_comparison(orig: Image.Image, cleaned: Image.Image, label: str) -> Image.Image:
    """Side-by-side comparison: original on left, cleaned on right, with
    a thin separator line."""
    w, h = orig.size
    sep = 4
    out = Image.new('RGB', (w * 2 + sep, h), (40, 40, 40))
    out.paste(orig.convert('RGB'), (0, 0))
    out.paste(cleaned.convert('RGB'), (w + sep, 0))
    return out


def main() -> None:
    pngs = sorted(SRC_DIR.glob('*.png'))
    if not pngs:
        print(f"No PNGs found in {SRC_DIR}")
        return
    for path in pngs:
        orig = Image.open(path)
        cleaned = vertical_box_blur(orig)
        # Save cleaned standalone (this is the file we'd ship).
        cleaned.save(OUT_DIR / path.name)
        # Save side-by-side comparison for visual review.
        comp = make_comparison(orig, cleaned, path.stem)
        comp.save(OUT_DIR / f"_compare_{path.stem}.png")
        print(f"  cleaned: {path.name}  ({orig.size[0]}x{orig.size[1]})")
    print(f"\nWrote cleaned PNGs + comparisons to: {OUT_DIR}")
    print("Review the _compare_*.png files. If approved, the cleaned files")
    print("(without _compare_ prefix) can be copied into public/frames/.")


if __name__ == '__main__':
    main()
