#!/usr/bin/env python3
"""
Build the KitsunePrints DIY Kit zip ~ the offline distribution that lets
users make their own packs without the web tool.

Output: public/KitsunePrints-DIY-Kit.zip (so the live site can serve it
as a download).

Run:
    python scripts/build_diy_kit.py

Dependencies:
    pip install Pillow  (only used to convert atlas .webp → .png on the fly
                         so the kit ships PNG regardless of what format
                         public/vanilla/ currently holds)
"""

from __future__ import annotations

import io
import sys
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "KitsunePrints-DIY-Kit.zip"

# Plain copy-as-is files. (source-relative-to-repo-root, arcname-in-zip)
INCLUDES = [
    ("scripts/make_pack.py",                  "make_pack.py"),
    ("scripts/README.md",                     "README.md"),
    ("public/reference/KitsunePrints.dll",    "KitsunePrints.dll"),
    # Frame textures, all six
    ("public/frames/wood_dark.png",           "frames/wood_dark.png"),
    ("public/frames/wood_light.png",          "frames/wood_light.png"),
    ("public/frames/gold_gilt.png",           "frames/gold_gilt.png"),
    ("public/frames/silver.png",              "frames/silver.png"),
    ("public/frames/matte_black.png",         "frames/matte_black.png"),
    ("public/frames/ornate_gold.png",         "frames/ornate_gold.png"),
    # Example pack
    ("scripts/example_pack/config.json",      "example_pack/config.json"),
]

# Vanilla atlas base layers for movie-poster / canvas / picture-frame slot
# compositing. The web side may store them as .png or .webp (after the
# perf pass). Either source is loaded via Pillow and shipped as .png in
# the kit, so make_pack.py can find them at consistent paths regardless
# of how the web side evolves.
ATLAS_INCLUDES = [
    ("_posterMovie_atlas",    "atlases/posterMovie.png"),
    ("_pictureCanvas1_atlas", "atlases/pictureCanvas1.png"),
    ("_pictureCanvas2_atlas", "atlases/pictureCanvas2.png"),
    ("_pictureFramed_atlas",  "atlases/pictureFramed.png"),
    ("_pictureFramed2_atlas", "atlases/pictureFramed2.png"),
    ("_pictureFramed3_atlas", "atlases/pictureFramed3.png"),
    ("_pictureFramed4_atlas", "atlases/pictureFramed4.png"),
    ("_pictureFramed5_atlas", "atlases/pictureFramed5.png"),
    ("_pictureFramed6_atlas", "atlases/pictureFramed6.png"),
    ("_pictureFramed7_atlas", "atlases/pictureFramed7.png"),
    ("_pictureFramed8_atlas", "atlases/pictureFramed8.png"),
]

VANILLA_DIR = ROOT / "public" / "vanilla"


def find_atlas_source(stem: str) -> Path:
    """Locate an atlas source by stem, preferring .webp then .png. The web
    side may have either format depending on whether the perf optimization
    PR has merged. We accept either and normalize to PNG inside the kit."""
    for ext in (".webp", ".png"):
        candidate = VANILLA_DIR / f"{stem}{ext}"
        if candidate.exists():
            return candidate
    raise FileNotFoundError(
        f"No atlas source found for stem '{stem}' in {VANILLA_DIR} "
        f"(tried .webp and .png)"
    )


def load_atlas_as_png_bytes(src: Path) -> bytes:
    """Load an atlas (any Pillow-readable format) and return PNG bytes."""
    buf = io.BytesIO()
    with Image.open(src) as img:
        # Preserve alpha if present.
        if img.mode not in ("RGBA", "RGB"):
            img = img.convert("RGBA" if "A" in img.mode else "RGB")
        img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def main() -> None:
    missing = [src for src, _ in INCLUDES if not (ROOT / src).exists()]
    if missing:
        print("ERROR: missing source files:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)

    # Resolve atlas sources up-front so we fail loudly before zipping.
    atlas_sources: list[tuple[Path, str]] = []
    for stem, arcname in ATLAS_INCLUDES:
        try:
            src = find_atlas_source(stem)
        except FileNotFoundError as e:
            print(f"ERROR: {e}")
            sys.exit(1)
        atlas_sources.append((src, arcname))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        # Plain copies
        for src, arcname in INCLUDES:
            zf.write(ROOT / src, f"KitsunePrints-DIY-Kit/{arcname}")

        # Atlases: load via Pillow (handles .webp + .png), write PNG bytes
        for src, arcname in atlas_sources:
            png_bytes = load_atlas_as_png_bytes(src)
            zf.writestr(f"KitsunePrints-DIY-Kit/{arcname}", png_bytes)

        # Empty images/ folder marker so example_pack runs out of the box
        zf.writestr("KitsunePrints-DIY-Kit/example_pack/images/.gitkeep", "")

    size_mb = OUT.stat().st_size / 1024 / 1024
    print(f"OK Built DIY kit: {OUT.relative_to(ROOT)} ({size_mb:.1f} MB)")
    print(f"   Served at https://prints.kitsuneden.net/{OUT.name}")


if __name__ == "__main__":
    main()
