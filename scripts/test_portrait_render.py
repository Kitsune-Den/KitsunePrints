"""
Visual diagnostic for the BACKER PORTRAIT rendering path.

Mirrors composePortrait() in src/utils/composer.ts in Python:
  - 1024x1024 RGBA canvas
  - left 25% (x=0..256): paint the chosen frame preset's PNG (a 256x1024
    vertical strip from public/frames/), stretched to fill exactly
  - right 75% (x=256..1024): the user's print, cover-fitted

The hypothesis under test: the horizontal pinstripes baked into
wood_dark.png and wood_light.png (intended as 3D-frame-wrap seam markers)
might be visibly leaking onto the canvas in V2.6 b14 ~ either because
the mesh UV split isn't actually 25/75, or because the mesh samples
slightly past the boundary at the canvas's left edge.

Outputs the full composed texture so we can see whether the pinstripes
sit cleanly in the left 25% (= our assumption is right, bug is mesh-side)
or whether they bleed visually into the canvas area (= PNGs need cleanup).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FRAMES_DIR = ROOT / 'public' / 'frames'
OUT_DIR = ROOT / 'scripts' / '_test_portrait_render'
OUT_DIR.mkdir(exist_ok=True)

# Mirrors composer.ts constants exactly.
PORTRAIT_W = 1024
PORTRAIT_H = 1024
FRAME_PCT = 0.25  # left 25% is the frame UV zone


def make_test_print(w: int = 800, h: int = 1000) -> Image.Image:
    """Solid magenta print so any pinstripes become unmissable. Same
    fixture style as test_frame_bleed.py."""
    img = Image.new('RGB', (w, h), (220, 30, 140))
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, w - 1, h - 1], outline=(255, 255, 255), width=2)
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
    """Mirror of drawCover() in composer.ts: object-fit:cover semantics."""
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


def compose_portrait(print_img: Image.Image, frame_png_path: Path) -> Image.Image:
    """Mirror of composePortrait() in composer.ts."""
    canvas = Image.new('RGBA', (PORTRAIT_W, PORTRAIT_H), (0, 0, 0, 0))

    # Left 25%: stretch the frame PNG to fill the wood zone.
    frame_img = Image.open(frame_png_path).convert('RGBA')
    frame_w = int(PORTRAIT_W * FRAME_PCT)
    frame_resized = frame_img.resize((frame_w, PORTRAIT_H), Image.LANCZOS)
    canvas.paste(frame_resized, (0, 0))

    # Right 75%: cover-fit the user's print.
    canvas_x = frame_w
    canvas_w = PORTRAIT_W - canvas_x
    canvas_h = PORTRAIT_H
    cover_fit_paint(canvas, print_img.convert('RGBA'), canvas_x, 0, canvas_w, canvas_h)

    return canvas


def annotate(img: Image.Image, label: str) -> Image.Image:
    """Stamp a label across the bottom of an image."""
    out = img.copy().convert('RGB')
    d = ImageDraw.Draw(out)
    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except OSError:
        font = ImageFont.load_default()
    bbox = d.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad = 8
    d.rectangle([0, out.height - th - pad * 2, tw + pad * 2, out.height], fill=(0, 0, 0))
    d.text((pad, out.height - th - pad), label, fill=(255, 255, 255), font=font)
    return out


def draw_split_line(img: Image.Image) -> Image.Image:
    """Draw a vivid green vertical line at the 25/75 split so we can see
    exactly where wood-zone ends and canvas-zone begins."""
    out = img.copy().convert('RGB')
    d = ImageDraw.Draw(out)
    boundary_x = int(PORTRAIT_W * FRAME_PCT)
    d.line([(boundary_x, 0), (boundary_x, PORTRAIT_H)], fill=(0, 255, 0), width=2)
    return out


def main() -> None:
    print_img = make_test_print()

    presets = [
        ('wood_dark', 'wood_dark.png'),
        ('wood_light', 'wood_light.png'),
        ('ornate_gold', 'ornate_gold.png'),
        ('matte_black', 'matte_black.png'),
        ('silver', 'silver.png'),
        ('gold_gilt', 'gold_gilt.png'),
    ]

    for preset_id, filename in presets:
        path = FRAMES_DIR / filename
        if not path.exists():
            print(f"  skip {preset_id}: {path} missing")
            continue
        composed = compose_portrait(print_img, path)
        # Save raw composed texture.
        annotate(composed, f"PORTRAIT TEXTURE: preset={preset_id}").save(
            OUT_DIR / f"01_{preset_id}_raw.png")
        # Save with the 25/75 boundary visualized so we can see whether any
        # pinstripe pixels visually appear to the right of the green line.
        with_line = draw_split_line(composed)
        annotate(with_line, f"WITH 25/75 BOUNDARY (green): preset={preset_id}").save(
            OUT_DIR / f"02_{preset_id}_with_split.png")

    print(f"\nWrote diagnostic PNGs to: {OUT_DIR}")
    print("If pinstripes appear ONLY left of the green line (in the wood zone), the")
    print("PNGs are fine and the bug is mesh-UV-side. If pinstripes extend RIGHT")
    print("of the green line (into the magenta canvas), the PNGs themselves bleed.")


if __name__ == '__main__':
    main()
