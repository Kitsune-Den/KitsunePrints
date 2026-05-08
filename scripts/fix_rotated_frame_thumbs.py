"""
Re-rotate the picture-frame vanilla thumbs whose content was authored as
landscape and rotated 90° to fit the portrait frame block.

The thumbs in public/vanilla/pictureFrame_01{d,e,f,g,h,i,j,n,q,r}.webp
currently show their landscape content sideways inside the portrait
thumb canvas. In the slot-card header that's misleading ~ users see
"sideways art" and assume something's broken. This script un-rotates
those thumbs so the art reads correctly oriented in the UI.

The atlasTile in slots.ts is unchanged: in-game, the BLOCK is still
portrait and the texture pipeline is unchanged. This is a presentation
fix on the vanilla reference thumb only.

For each affected slot:
  - Loads the existing webp
  - Rotates 90° counter-clockwise (top edge of the rotated image goes
    to the LEFT edge ~ effectively undoing the original CW rotation
    the artist applied to fit the landscape into the portrait)
  - Saves alongside an _orig copy + a side-by-side comparison

Output goes to scripts/_audit_orientations/rotated_thumbs/. After visual
review, the *.webp files (without _orig or _compare suffix) can be
copied into public/vanilla/ to replace the originals.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
THUMB_DIR = ROOT / 'public' / 'vanilla'
OUT_DIR = ROOT / 'scripts' / '_audit_orientations' / 'rotated_thumbs'
OUT_DIR.mkdir(exist_ok=True, parents=True)

# Slots whose vanilla content needs a 90° rotation to display correctly,
# mapped to the rotation direction that makes them read upright. Direction
# was determined per-slot by visual inspection of the comparison strips
# (see prior _compare_*.png pass). Most rotated photos in this pack were
# tilted CCW to fit the portrait frame ~ so CCW un-tilt restores them.
# 01d (bear) is the lone outlier ~ tilted CW originally, needs CW un-tilt.
#
# Audit source: scripts/audit_slot_orientations.py.
ROTATIONS: dict[str, str] = {
    'pictureFrame_01d': 'cw',
    'pictureFrame_01e': 'ccw',
    'pictureFrame_01f': 'ccw',
    'pictureFrame_01g': 'ccw',
    'pictureFrame_01h': 'ccw',
    'pictureFrame_01i': 'ccw',
    'pictureFrame_01j': 'ccw',
    'pictureFrame_01n': 'ccw',
    'pictureFrame_01q': 'ccw',
    'pictureFrame_01r': 'ccw',
}


def make_compare(orig: Image.Image, fixed_ccw: Image.Image, fixed_cw: Image.Image,
                 slot_id: str) -> Image.Image:
    """Three-up: original | CCW-rotated | CW-rotated, with labels.
    Lets us pick the right rotation direction visually."""
    cell_w = 256
    label_h = 32
    cell_h = cell_w + label_h
    sep = 4
    cols = 3
    out = Image.new('RGB', (cell_w * cols + sep * (cols - 1), cell_h), (28, 28, 32))
    d = ImageDraw.Draw(out)
    try:
        font = ImageFont.truetype("arial.ttf", 14)
    except OSError:
        font = ImageFont.load_default()

    for i, (img, label) in enumerate([
        (orig, f'{slot_id} (original)'),
        (fixed_ccw, '90° counter-clockwise'),
        (fixed_cw, '90° clockwise'),
    ]):
        x = i * (cell_w + sep)
        thumb = img.convert('RGB').resize((cell_w, cell_w), Image.LANCZOS)
        out.paste(thumb, (x, 0))
        d.rectangle([x, cell_w, x + cell_w, cell_h], fill=(40, 40, 46))
        d.text((x + 6, cell_w + 8), label, fill=(220, 220, 230), font=font)
    return out


def apply_rotation(img: Image.Image, direction: str) -> Image.Image:
    """Apply the chosen rotation direction. Pillow's transpose constants:
    ROTATE_90 rotates CCW (anticlockwise), ROTATE_270 rotates CW (clockwise)."""
    if direction == 'ccw':
        return img.transpose(Image.Transpose.ROTATE_90)
    if direction == 'cw':
        return img.transpose(Image.Transpose.ROTATE_270)
    raise ValueError(f"Unknown rotation direction: {direction!r}")


def main() -> None:
    for slot_id, direction in ROTATIONS.items():
        path = THUMB_DIR / f'{slot_id}.webp'
        if not path.exists():
            print(f"  skip {slot_id}: missing")
            continue
        orig = Image.open(path)
        fixed = apply_rotation(orig, direction)
        # Final corrected thumb (this is what gets copied into public/vanilla/).
        fixed.save(OUT_DIR / f'{slot_id}.webp', 'WEBP', quality=92)
        # Side-by-side before/after for review.
        cell_w = 256
        sep = 4
        compare = Image.new('RGB', (cell_w * 2 + sep, cell_w + 32), (28, 28, 32))
        compare.paste(orig.convert('RGB').resize((cell_w, cell_w), Image.LANCZOS), (0, 0))
        compare.paste(fixed.convert('RGB').resize((cell_w, cell_w), Image.LANCZOS), (cell_w + sep, 0))
        d = ImageDraw.Draw(compare)
        try:
            font = ImageFont.truetype("arial.ttf", 14)
        except OSError:
            font = ImageFont.load_default()
        d.rectangle([0, cell_w, cell_w * 2 + sep, cell_w + 32], fill=(40, 40, 46))
        d.text((6, cell_w + 8), f'{slot_id} (before)', fill=(220, 220, 230), font=font)
        d.text((cell_w + sep + 6, cell_w + 8),
               f'{slot_id} (after, rotated {direction.upper()})', fill=(160, 220, 160), font=font)
        compare.save(OUT_DIR / f'_compare_{slot_id}.png')
        print(f"  rotated: {slot_id} ({direction.upper()})")

    print(f"\nWrote corrected thumbs + comparisons to: {OUT_DIR}")
    print("Review the _compare_*.png files. If approved, copy the *.webp files")
    print("(without _compare_ prefix) into public/vanilla/.")


if __name__ == '__main__':
    main()
