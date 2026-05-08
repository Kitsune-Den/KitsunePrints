"""
Audit each slot's vanilla thumb to classify content orientation.

For v1.0.3: we want to default the drop-zone orientation per slot based on
what the vanilla art LOOKS like in the thumb. Some slots have art rotated
90° to fit a portrait frame block; users should see a horizontal drop zone
for those, not a vertical one.

Output: a single composite PNG with every relevant slot thumb labeled by
slotId, grouped by atlas family. Open it once, classify each as
'upright' (vanilla art reads correctly oriented) or 'rotated' (vanilla
art was authored landscape and rotated 90° to fit a portrait frame),
then pipe results into slots.ts as a per-slot field.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
THUMB_DIR = ROOT / 'public' / 'vanilla'
OUT_DIR = ROOT / 'scripts' / '_audit_orientations'
OUT_DIR.mkdir(exist_ok=True)


# Slot families we care about for the orientation audit.
# We're not auditing decor / abstract / standalone slots ~ those have either
# obvious orientation or use meshUvBbox in ways that make "flip" not apply.
PICTURE_FRAME_LETTERS = list('abcdefghijklmnopqrstuvw')  # 23 slots
PICTURE_CANVAS_LETTERS = list('abcdefghij')  # 10 slots
PORTRAIT_SLOTS = ['painting_ben', 'painting_lorien', 'painting_derek',
                  'painting_noah', 'painting_duke', 'painting_ken']
MOVIE_POSTER_SLOTS = ['signPosterMovieMammasJustice',
                      'signPosterMovieSexualTension',
                      'signPosterMovieLoneWolf',
                      'signPosterMovie2159']


def make_grid(title: str, slot_ids: list[str], cols: int = 6) -> Image.Image:
    """Render a grid of labeled slot thumbs. Each cell is the thumb plus
    a slotId label below it on a dark band."""
    cell_w = 200
    label_h = 40
    cell_h = cell_w + label_h
    rows = (len(slot_ids) + cols - 1) // cols
    title_h = 40
    pad = 10
    grid_w = cell_w * cols + pad * (cols + 1)
    grid_h = title_h + cell_h * rows + pad * (rows + 1)

    out = Image.new('RGB', (grid_w, grid_h), (24, 24, 28))
    d = ImageDraw.Draw(out)
    try:
        title_font = ImageFont.truetype("arialbd.ttf", 20)
        cell_font = ImageFont.truetype("arial.ttf", 13)
    except OSError:
        title_font = ImageFont.load_default()
        cell_font = ImageFont.load_default()

    d.text((pad, 8), title, fill=(240, 200, 100), font=title_font)

    for i, slot_id in enumerate(slot_ids):
        col = i % cols
        row = i // cols
        x = pad + col * (cell_w + pad)
        y = title_h + pad + row * (cell_h + pad)

        path = THUMB_DIR / f'{slot_id}.webp'
        if path.exists():
            try:
                thumb = Image.open(path).convert('RGB').resize((cell_w, cell_w), Image.LANCZOS)
                out.paste(thumb, (x, y))
            except Exception:
                d.rectangle([x, y, x + cell_w, y + cell_w], fill=(60, 30, 30))
                d.text((x + 8, y + 8), 'load fail', fill=(220, 100, 100), font=cell_font)
        else:
            d.rectangle([x, y, x + cell_w, y + cell_w], fill=(40, 40, 40))
            d.text((x + 8, y + 8), 'missing', fill=(180, 180, 180), font=cell_font)

        # Label band
        d.rectangle([x, y + cell_w, x + cell_w, y + cell_h], fill=(38, 38, 44))
        d.text((x + 6, y + cell_w + 6), slot_id, fill=(200, 200, 210), font=cell_font)

    return out


def main() -> None:
    grids = [
        ('frames',   'PICTURE FRAMES (23)',   [f'pictureFrame_01{l}' for l in PICTURE_FRAME_LETTERS]),
        ('canvases', 'PICTURE CANVASES (10)', [f'pictureCanvas_01{l}' for l in PICTURE_CANVAS_LETTERS]),
        ('backers',  'BACKER PORTRAITS (6)',  PORTRAIT_SLOTS),
        ('movies',   'MOVIE POSTERS (4)',     MOVIE_POSTER_SLOTS),
    ]
    for slug, title, slots in grids:
        img = make_grid(title, slots)
        path = OUT_DIR / f'{slug}.png'
        img.save(path)
        print(f"  wrote {path.name}  ({len(slots)} slots)")
    print(f"\nWrote audit grids to {OUT_DIR}")


if __name__ == '__main__':
    main()
