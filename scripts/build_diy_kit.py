#!/usr/bin/env python3
"""
Build the KitsunePrints DIY Kit zip ~ the offline distribution that lets
users make their own packs without the web tool.

Output: public/KitsunePrints-DIY-Kit.zip (so the live site can serve it
as a download).

Run:
    python scripts/build_diy_kit.py
"""

from __future__ import annotations

import shutil
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "KitsunePrints-DIY-Kit.zip"

# Files the DIY kit needs at its root after extraction.
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
    # Vanilla posterMovie atlas ~ used as the base layer when compositing
    # any movie poster slot (preserves theater-strip + edge UV regions).
    ("public/vanilla/_posterMovie_atlas.png", "atlases/posterMovie.png"),
    # Example pack
    ("scripts/example_pack/config.json",      "example_pack/config.json"),
]


def main() -> None:
    missing = [src for src, _ in INCLUDES if not (ROOT / src).exists()]
    if missing:
        print("ERROR: missing source files:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as zf:
        for src, arcname in INCLUDES:
            zf.write(ROOT / src, f"KitsunePrints-DIY-Kit/{arcname}")
        # Empty images/ folder marker so example_pack runs out of the box
        zf.writestr("KitsunePrints-DIY-Kit/example_pack/images/.gitkeep", "")

    size_kb = OUT.stat().st_size / 1024
    print(f"OK Built DIY kit: {OUT.relative_to(ROOT)} ({size_kb:.1f} KB)")
    print(f"   Served at https://prints.kitsuneden.net/{OUT.name}")


if __name__ == "__main__":
    main()
