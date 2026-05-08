"""
Visual diagnostic for the picture-frame gray-strip bug and the proposed
bleed fix.

Bug (HakurouHayate, 7D2D V2.6 b14): picture-frame blocks show gray strips
at the canvas edges in-game where the user's print should reach the wood
border. Hypothesis: the in-game mesh's UV samples extend a few pixels past
the atlasTile rect we paint into, picking up vanilla atlas content from
the wood-zone above/around each tile.

Fix: bleed the user's image ~4px past the tile rect on every side when
painting into the atlas. Bleed pixels land in atlas territory the mesh
doesn't sample for OTHER tiles, so no visual leak; mesh overshoot picks
up bleed pixels (= edge of user's image extended) instead of vanilla
wood-zone gray.

This script renders a high-contrast test image into the BIG tile rect of
_pictureFramed_atlas.webp two ways (no bleed vs with bleed) and crops to
the rect plus 6px of "what the mesh might see if it overshoots." The
no-bleed crop shows vanilla content peeking through (the bug); the
with-bleed crop shows clean print extending past the rect (the fix).

Outputs to scripts/_test_frame_bleed/.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
ATLAS = ROOT / 'public' / 'vanilla' / '_pictureFramed_atlas.webp'
OUT_DIR = ROOT / 'scripts' / '_test_frame_bleed'
OUT_DIR.mkdir(exist_ok=True)

# BIG tile rect from slots.ts (Frame A / D / I / L / M / P / S etc.)
TILE = dict(x=1288, y=1138, w=735, h=898)
ATLAS_SIZE = 2048

# How many pixels past the rect we simulate the mesh sampling. The actual
# overshoot in-game is probably 1-3 px from rounding; 6 px makes the bug
# cosmetically obvious in the diagnostic crop.
MESH_OVERSHOOT_PX = 6

# Bleed amount the proposed fix uses ~ matches BBOX_BLEED_PX in composeUvBboxFitted.
BLEED_PX = 4


def make_test_print(w: int = 800, h: int = 1000) -> Image.Image:
    """Portrait-ish test print: vivid magenta with a 2-px white border and
    a center label. The border lets us see exactly where the print's edge
    lands relative to the painted/sampled rect ~ if we see ANY non-magenta
    pixel inside the mesh-view crop, the bug is reproduced."""
    img = Image.new('RGB', (w, h), (220, 30, 140))
    d = ImageDraw.Draw(img)
    # 2-px white border, drawn as a stroked rect
    d.rectangle([0, 0, w - 1, h - 1], outline=(255, 255, 255), width=2)
    # Diagonal stripes near each edge so we can spot scaling/positioning issues
    for i in range(0, 60, 8):
        d.line([(i, 0), (0, i)], fill=(255, 255, 255), width=1)  # TL corner
        d.line([(w - i, 0), (w, i)], fill=(255, 255, 255), width=1)  # TR corner
        d.line([(i, h), (0, h - i)], fill=(255, 255, 255), width=1)  # BL corner
        d.line([(w - i, h), (w, h - i)], fill=(255, 255, 255), width=1)  # BR corner
    # Big readable label
    try:
        font = ImageFont.truetype("arial.ttf", 80)
    except OSError:
        font = ImageFont.load_default()
    label = "PRINT"
    bbox = d.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((w - tw) // 2, (h - th) // 2), label, fill=(255, 255, 255), font=font)
    return img


def cover_fit_paint(canvas: Image.Image, img: Image.Image, x: int, y: int, w: int, h: int) -> None:
    """Object-fit:cover semantics, identical to drawCover in composer.ts.
    Scales the source to entirely fill (x,y,w,h), center-cropping the
    over-extending axis. No padding inside the rect."""
    src_w, src_h = img.size
    src_ratio = src_w / src_h
    dst_ratio = w / h
    if src_ratio > dst_ratio:
        sw = int(src_h * dst_ratio)
        sh = src_h
        sx = (src_w - sw) // 2
        sy = 0
    else:
        sw = src_w
        sh = int(src_w / dst_ratio)
        sx = 0
        sy = (src_h - sh) // 2
    crop = img.crop((sx, sy, sx + sw, sy + sh)).resize((w, h), Image.LANCZOS)
    canvas.paste(crop, (x, y))


def crop_with_overshoot(canvas: Image.Image, tile: dict, overshoot: int) -> Image.Image:
    """Crop what an in-game mesh sample would see if its UVs overshoot the
    rect by `overshoot` px on every side."""
    x = max(0, tile['x'] - overshoot)
    y = max(0, tile['y'] - overshoot)
    r = min(ATLAS_SIZE, tile['x'] + tile['w'] + overshoot)
    b = min(ATLAS_SIZE, tile['y'] + tile['h'] + overshoot)
    return canvas.crop((x, y, r, b))


def annotate(img: Image.Image, label: str) -> Image.Image:
    """Stamp a label across the bottom of an image so the comparison is
    self-describing when viewed standalone."""
    out = img.copy()
    d = ImageDraw.Draw(out)
    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except OSError:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = 8
    d.rectangle(
        [0, out.height - th - pad * 2, tw + pad * 2, out.height],
        fill=(0, 0, 0, 200),
    )
    d.text((pad, out.height - th - pad), label, fill=(255, 255, 255), font=font)
    return out


def main() -> None:
    print(f"Loading vanilla atlas: {ATLAS}")
    atlas_orig = Image.open(ATLAS).convert('RGB')
    print_img = make_test_print()

    # Variant 1: CURRENT behavior ~ paint exact rect, no bleed.
    a1 = atlas_orig.copy()
    cover_fit_paint(a1, print_img, TILE['x'], TILE['y'], TILE['w'], TILE['h'])

    # Variant 2: PROPOSED FIX ~ paint with 4px bleed past the rect on every side.
    a2 = atlas_orig.copy()
    bx = max(0, TILE['x'] - BLEED_PX)
    by = max(0, TILE['y'] - BLEED_PX)
    br = min(ATLAS_SIZE, TILE['x'] + TILE['w'] + BLEED_PX)
    bb = min(ATLAS_SIZE, TILE['y'] + TILE['h'] + BLEED_PX)
    cover_fit_paint(a2, print_img, bx, by, br - bx, bb - by)

    # The painted texture region itself (what the modlet outputs) ~ no overshoot.
    crop1_tex = crop_with_overshoot(a1, TILE, 0)
    crop2_tex = crop_with_overshoot(a2, TILE, 0)
    annotate(crop1_tex, "CURRENT: modlet output (exact rect)").save(OUT_DIR / '01_output_current.png')
    annotate(crop2_tex, "WITH FIX: modlet output (rect + 4px bleed)").save(OUT_DIR / '02_output_fixed.png')

    # What the in-game mesh "sees" if its UV samples overshoot the rect.
    # This simulates the actual bug ~ the strips visible in HakurouHayate's screenshot.
    mesh1 = crop_with_overshoot(a1, TILE, MESH_OVERSHOOT_PX)
    mesh2 = crop_with_overshoot(a2, TILE, MESH_OVERSHOOT_PX)
    annotate(mesh1, f"BUG: in-game view (mesh overshoots rect by {MESH_OVERSHOOT_PX}px)").save(OUT_DIR / '03_mesh_view_current.png')
    annotate(mesh2, f"FIX: in-game view (mesh overshoots, but bleed covers it)").save(OUT_DIR / '04_mesh_view_fixed.png')

    print(f"\nWrote 4 diagnostic PNGs to: {OUT_DIR}")
    print("  01_output_current.png    ~ what the modlet currently writes for this tile")
    print("  02_output_fixed.png      ~ what the modlet WOULD write with the bleed fix")
    print("  03_mesh_view_current.png ~ what the in-game mesh sees TODAY (gray/wood strips visible)")
    print("  04_mesh_view_fixed.png   ~ what the in-game mesh would see with the fix (clean edges)")


if __name__ == '__main__':
    main()
