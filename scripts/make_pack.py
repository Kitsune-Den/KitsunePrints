#!/usr/bin/env python3
"""
KitsunePrints DIY Pack Builder
==============================
Run this script to turn a folder of images into a 7 Days to Die V2.6
picture pack modlet. No web tool needed.

Usage:
    pip install Pillow
    python make_pack.py <pack_folder>

A pack_folder looks like this:
    my_pack/
        config.json
        images/
            boss-cat.png
            ...

config.json shape:
    {
        "name": "My Picture Pack",
        "author": "Ada",
        "version": "0.1.0",
        "description": "...",
        "slots": {
            "painting_ben":        { "image": "boss-cat.png",  "title": "The Boss",       "frame": "ornate_gold" },
            "painting_lorien":     { "image": "orange.png",     "title": "Orange Sunbeam", "frame": "wood_dark" },
            "painting_derek":      { "image": "tabby.png",      "title": "Tabby" },
            "paintingsAbstract01": { "image": "hearth.png",     "title": "Hearth" }
        }
    }

Only fill in the slots you want — anything left out stays vanilla. Slot
keys are vanilla material names (see slot list below). Frame is one of:
wood_dark | wood_light | gold_gilt | silver | matte_black | ornate_gold.

Output: <pack_folder>/<sanitized_name>.zip — drop into <7DTD>/Mods/.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Missing dependency. Run: pip install Pillow")
    sys.exit(1)


# Same canonical slot list the web tool ships. If you want to override
# (rename, hide), do it via your config.json — don't edit this.
SLOTS = [
    # 1×1 backer portraits — left 25% wood, right 75% canvas
    ("painting_ben",        "Backer Portrait 1",      "paintingBen",          "portrait"),
    ("painting_lorien",     "Backer Portrait 2",      "paintingLorien",       "portrait"),
    ("painting_derek",      "Backer Portrait 3",      "paintingDerek",        "portrait"),
    ("painting_noah",       "Backer Portrait 4",      "paintingNoah",         "portrait"),
    ("painting_duke",       "Backer Portrait 5",      "paintingDuke",         "portrait"),
    ("painting_ken",        "Backer Portrait 6",      "paintingKen",          "portrait"),
    # Abstracts (2×2 + 3×2 share one Material per design)
    ("paintingsAbstract01", "Abstract 1 (2x2 + 3x2)", "paintingAbstract01",   "abstract"),
    ("paintingsAbstract02", "Abstract 2 (2x2 + 3x2)", "paintingAbstract02",   "abstract"),
    ("paintingsAbstract03", "Abstract 3 (2x2 + 3x2)", "paintingAbstract03",   "abstract"),
    ("paintingsAbstract04", "Abstract 4 (2x2 + 3x2)", "paintingAbstract04",   "abstract"),
]

PORTRAIT_SIZE = 1024
ABSTRACT_SIZE = 1024
ICON_SIZE = 160
FRAME_PCT = 0.25
DEFAULT_FRAME = "wood_dark"

SCRIPT_DIR = Path(__file__).resolve().parent
KIT_ROOT = SCRIPT_DIR.parent  # repo root or kit root after extraction
FRAMES_DIR = KIT_ROOT / "frames"
DLL_PATH = KIT_ROOT / "KitsunePrints.dll"


# ---- Image composition ----------------------------------------------------

def cover_crop(img: Image.Image, dst_w: int, dst_h: int) -> Image.Image:
    """object-fit: cover. Crop center on the over-extending axis."""
    src_ratio = img.width / img.height
    dst_ratio = dst_w / dst_h
    if src_ratio > dst_ratio:
        new_w = int(img.height * dst_ratio)
        left = (img.width - new_w) // 2
        img = img.crop((left, 0, left + new_w, img.height))
    elif src_ratio < dst_ratio:
        new_h = int(img.width / dst_ratio)
        top = (img.height - new_h) // 2
        img = img.crop((0, top, img.width, top + new_h))
    return img.resize((dst_w, dst_h), Image.LANCZOS)


def compose_portrait(image_path: Path, frame_id: str) -> Image.Image:
    """Left 25% wood frame texture, right 75% user image."""
    canvas = Image.new("RGBA", (PORTRAIT_SIZE, PORTRAIT_SIZE), (0, 0, 0, 255))
    frame_w = int(PORTRAIT_SIZE * FRAME_PCT)

    frame_path = FRAMES_DIR / f"{frame_id}.png"
    if not frame_path.exists():
        print(f"    WARN frame '{frame_id}' missing at {frame_path} — falling back to {DEFAULT_FRAME}")
        frame_path = FRAMES_DIR / f"{DEFAULT_FRAME}.png"
    frame = Image.open(frame_path).convert("RGBA")
    frame = frame.resize((frame_w, PORTRAIT_SIZE), Image.LANCZOS)
    canvas.paste(frame, (0, 0))

    user_img = Image.open(image_path).convert("RGBA")
    canvas_zone_w = PORTRAIT_SIZE - frame_w
    user_fitted = cover_crop(user_img, canvas_zone_w, PORTRAIT_SIZE)
    canvas.paste(user_fitted, (frame_w, 0))
    return canvas


def compose_abstract(image_path: Path) -> Image.Image:
    img = Image.open(image_path).convert("RGBA")
    return cover_crop(img, ABSTRACT_SIZE, ABSTRACT_SIZE)


def compose_icon(image_path: Path) -> Image.Image:
    img = Image.open(image_path).convert("RGBA")
    return cover_crop(img, ICON_SIZE, ICON_SIZE)


# ---- XML / config rendering -----------------------------------------------

def sanitize_id(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9_\-]", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s or "KitsunePicturePack"


def escape_xml(s: str) -> str:
    return (
        s.replace("&", "&amp;")
         .replace("<", "&lt;")
         .replace(">", "&gt;")
         .replace('"', "&quot;")
         .replace("'", "&apos;")
    )


def render_modinfo(meta: dict, sanitized_name: str) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<xml>\n"
        f'    <Name value="{escape_xml(sanitized_name)}" />\n'
        f'    <DisplayName value="{escape_xml(meta.get("name", "My Picture Pack"))}" />\n'
        f'    <Version value="{escape_xml(meta.get("version", "0.1.0"))}" />\n'
        f'    <Description value="{escape_xml(meta.get("description", ""))}" />\n'
        f'    <Author value="{escape_xml(meta.get("author", ""))}" />\n'
        "</xml>\n"
    )


def render_blocks_xml(rows: list[str]) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" ?>\n'
        "<configs>\n\n"
        "    <append xpath=\"/blocks\">\n\n"
        + "\n\n".join(rows)
        + "\n\n    </append>\n\n</configs>\n"
    )


def render_block_entry(block_name: str, vanilla_block: str) -> str:
    return (
        f'        <block name="{escape_xml(block_name)}">\n'
        f'            <property name="Extends" value="{escape_xml(vanilla_block)}"/>\n'
        f'            <property name="CustomIcon" value="{escape_xml(block_name)}"/>\n'
        f'        </block>'
    )


def render_recipes_xml(rows: list[str]) -> str:
    return (
        '<?xml version="1.0" encoding="UTF-8" ?>\n'
        "<configs>\n\n"
        "    <append xpath=\"/recipes\">\n\n"
        + "\n\n".join(rows)
        + "\n\n    </append>\n\n</configs>\n"
    )


def render_recipe_entry(block_name: str, kind: str) -> str:
    if kind == "portrait":
        ingredients = (
            '            <ingredient name="resourcePaper" count="2"/>\n'
            '            <ingredient name="resourceWood" count="6"/>\n'
            '            <ingredient name="resourceForgedIron" count="1"/>'
        )
    elif kind == "abstract2x2":
        ingredients = (
            '            <ingredient name="resourcePaper" count="8"/>\n'
            '            <ingredient name="resourceWood" count="4"/>\n'
            '            <ingredient name="resourceForgedIron" count="1"/>'
        )
    else:  # abstract3x2
        ingredients = (
            '            <ingredient name="resourcePaper" count="12"/>\n'
            '            <ingredient name="resourceWood" count="6"/>\n'
            '            <ingredient name="resourceForgedIron" count="2"/>'
        )
    return (
        f'        <recipe name="{escape_xml(block_name)}" count="1" craft_area="workbench" tags="workbenchCrafting">\n'
        f"{ingredients}\n"
        "        </recipe>"
    )


def render_localization(rows: list[str]) -> str:
    header = (
        "Key,File,Type,UsedInMainMenu,NoTranslate,english,Context / Alternate Text,"
        "german,spanish,french,italian,japanese,koreana,polish,brazilian,russian,"
        "turkish,schinese,tchinese"
    )
    return header + "\n" + "\n".join(rows) + "\n"


def render_loc_row(block_name: str, display_name: str) -> str:
    safe = f'"{display_name.replace(chr(34), chr(34)*2)}"' if "," in display_name else display_name
    return f"{block_name},blocks,Block,,,{safe},,,,,,,,,,,,,"


# ---- Main builder ---------------------------------------------------------

def build_pack(pack_dir: Path) -> Path:
    config_path = pack_dir / "config.json"
    if not config_path.exists():
        print(f"ERROR: {config_path} not found")
        sys.exit(1)
    config = json.loads(config_path.read_text(encoding="utf-8"))

    images_dir = pack_dir / "images"
    if not images_dir.exists():
        print(f"ERROR: {images_dir} not found (put your source images here)")
        sys.exit(1)

    if not DLL_PATH.exists():
        print(f"ERROR: KitsunePrints.dll missing at {DLL_PATH}")
        print("       The DIY kit zip should ship the DLL alongside this script.")
        sys.exit(1)

    pack_name = config.get("name", "My Picture Pack")
    sanitized = sanitize_id(pack_name)
    out_dir = pack_dir / sanitized
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    print(f"Building '{pack_name}' -> {out_dir}/")

    # ModInfo + DLL
    (out_dir / "ModInfo.xml").write_text(render_modinfo(config, sanitized), encoding="utf-8")
    shutil.copy(DLL_PATH, out_dir / "KitsunePrints.dll")

    # Per-slot composition
    pic_map: dict[str, str] = {}
    block_rows: list[str] = []
    recipe_rows: list[str] = []
    loc_rows: list[str] = []

    slot_specs = config.get("slots", {})
    for material_name, slot_label, vanilla_block, kind in SLOTS:
        slot = slot_specs.get(material_name)
        if not slot or not slot.get("image"):
            continue

        image_path = images_dir / slot["image"]
        if not image_path.exists():
            print(f"  WARN slot {material_name}: image '{slot['image']}' not found, skipping")
            continue

        print(f"  {material_name:25s} <- {slot['image']}  ({kind})")

        # Composed texture
        if kind == "portrait":
            frame_id = slot.get("frame", DEFAULT_FRAME)
            tex = compose_portrait(image_path, frame_id)
        else:
            tex = compose_abstract(image_path)
        tex_dir = out_dir / "Resources" / "Textures"
        tex_dir.mkdir(parents=True, exist_ok=True)
        tex_filename = f"{material_name}.png"
        tex.save(tex_dir / tex_filename, "PNG")
        pic_map[material_name] = tex_filename

        # Block + recipe + loc + icon ~ portraits get one block extending the
        # vanilla portrait; abstracts get TWO blocks (one per frame size,
        # 2x2 + 3x2) because there is no plain paintingAbstractNN block in
        # vanilla, only the sized variants. Extending a non-existent block
        # cascade-breaks every other vanilla XML loader.
        title = (slot.get("title") or slot_label).strip() or slot_label
        display_name = f"Print: {title}"

        icon = compose_icon(image_path)
        icon_dir = out_dir / "UIAtlases" / "ItemIconAtlas"
        icon_dir.mkdir(parents=True, exist_ok=True)

        if kind == "portrait":
            block_name = f"kp_{sanitized}_{material_name}"
            icon.save(icon_dir / f"{block_name}.png", "PNG")
            block_rows.append(render_block_entry(block_name, vanilla_block))
            recipe_rows.append(render_recipe_entry(block_name, "portrait"))
            loc_rows.append(render_loc_row(block_name, display_name))
        else:
            for size in ("2x2", "3x2"):
                block_name = f"kp_{sanitized}_{material_name}_{size}"
                icon.save(icon_dir / f"{block_name}.png", "PNG")
                block_rows.append(render_block_entry(block_name, f"{vanilla_block}_{size}"))
                recipe_kind = "abstract2x2" if size == "2x2" else "abstract3x2"
                recipe_rows.append(render_recipe_entry(block_name, recipe_kind))
                loc_rows.append(render_loc_row(block_name, f"{display_name} {size}"))

    # Config files
    config_out = out_dir / "Config"
    config_out.mkdir(parents=True, exist_ok=True)
    (config_out / "picture_pack.json").write_text(
        json.dumps(pic_map, indent=2), encoding="utf-8"
    )
    (config_out / "blocks.xml").write_text(render_blocks_xml(block_rows), encoding="utf-8")
    (config_out / "recipes.xml").write_text(render_recipes_xml(recipe_rows), encoding="utf-8")
    (config_out / "Localization.txt").write_text(render_localization(loc_rows), encoding="utf-8")

    # Zip
    zip_path = pack_dir / f"{sanitized}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in out_dir.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(pack_dir))

    print(f"\n✅ Built {len(pic_map)} slot(s) -> {zip_path}")
    print("   Drop the zip's contents into <7DTD>/Mods/ and restart the game.")
    return zip_path


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a KitsunePrints picture pack from a folder of images.")
    parser.add_argument("pack_folder", type=Path, help="Folder containing config.json + images/")
    args = parser.parse_args()
    if not args.pack_folder.is_dir():
        print(f"ERROR: {args.pack_folder} is not a directory")
        sys.exit(1)
    build_pack(args.pack_folder)


if __name__ == "__main__":
    main()
