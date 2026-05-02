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
        "enablePickup": true,
        "slots": {
            "painting_ben":                 { "image": "boss-cat.png",  "title": "The Boss",       "frame": "ornate_gold" },
            "painting_lorien":              { "image": "orange.png",    "title": "Orange Sunbeam", "frame": "wood_dark" },
            "painting_derek":               { "image": "tabby.png",     "title": "Tabby" },
            "paintingsAbstract01":          { "image": "hearth.png",    "title": "Hearth" },
            "signPosterMovieLoneWolf":      { "image": "movie01.png",   "title": "The Cat Movie" }
        }
    }

Only fill in the slots you want — anything left out stays vanilla. Slot
keys are stable identifiers (see SLOTS list below). Frame is one of:
wood_dark | wood_light | gold_gilt | silver | matte_black | ornate_gold.

`enablePickup` (default true) ships a Config/pickup.xml that adds CanPickup,
wrench harvest, and workbench recipes to ~115 vanilla decor blocks (paintings,
posters, canvases, picture frames, hidden-safe disguises). Set false to skip.

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
# Tuple shape: (slot_id, label, vanilla_blocks, kind, atlas_tile_or_none)
#   atlas_tile is (left, top, right, bottom) PIL pixel rect inside a shared atlas
SLOTS = [
    # 1×1 backer portraits — left 25% wood, right 75% canvas
    ("painting_ben",        "Backer Portrait 1",        ["paintingBen"],    "portrait", None),
    ("painting_lorien",     "Backer Portrait 2",        ["paintingLorien"], "portrait", None),
    ("painting_derek",      "Backer Portrait 3",        ["paintingDerek"],  "portrait", None),
    ("painting_noah",       "Backer Portrait 4",        ["paintingNoah"],   "portrait", None),
    ("painting_duke",       "Backer Portrait 5",        ["paintingDuke"],   "portrait", None),
    ("painting_ken",        "Backer Portrait 6",        ["paintingKen"],    "portrait", None),
    # Abstracts (2×2 + 3×2 share one Material per design)
    ("paintingsAbstract01", "Abstract 1 (2x2 + 3x2)",
     ["paintingAbstract01_2x2", "paintingAbstract01_3x2"], "abstract", None),
    ("paintingsAbstract02", "Abstract 2 (2x2 + 3x2)",
     ["paintingAbstract02_2x2", "paintingAbstract02_3x2"], "abstract", None),
    ("paintingsAbstract03", "Abstract 3 (2x2 + 3x2)",
     ["paintingAbstract03_2x2", "paintingAbstract03_3x2"], "abstract", None),
    ("paintingsAbstract04", "Abstract 4 (2x2 + 3x2)",
     ["paintingAbstract04_2x2", "paintingAbstract04_3x2"], "abstract", None),
    # Movie posters — all 4 share the posterMovie 1024x1024 atlas. Each
    # prefab's mesh UVs sample one tile. Theater variants share tiles with
    # their non-theater siblings, so replacing one re-skins both blocks.
    ("signPosterMovieMammasJustice", "Movie Poster ~ Mama's Justice",
     ["signPosterMovieMammasJustice", "signPosterMovieTheaterMammasJustice"],
     "moviePoster", (2, 25, 349, 508)),
    ("signPosterMovieSexualTension", "Movie Poster ~ Sexual Tension",
     ["signPosterMovieSexualTension", "signPosterMovieTheaterSexualTension"],
     "moviePoster", (350, 24, 696, 508)),
    ("signPosterMovieLoneWolf", "Movie Poster ~ Lone Wolf",
     ["signPosterMovieLoneWolf", "signPosterMovieTheaterLoneWolf"],
     "moviePoster", (2, 517, 348, 1000)),
    ("signPosterMovie2159", "Movie Poster ~ 2159",
     ["signPosterMovie2159", "signPosterMovieTheater2159"],
     "moviePoster", (351, 518, 696, 1000)),
]

# Movie posters all share this material, written once if any movie poster slot is filled.
MOVIE_POSTER_MATERIAL = "posterMovie"
MOVIE_POSTER_ATLAS_SIZE = 1024

# All vanilla blocks that get the optional pickup + craft treatment.
# Mirror src/utils/pickupBlocks.ts.
PICKUP_BLOCKS = [
    # Backer portraits
    "paintingBen", "paintingLorien", "paintingDerek", "paintingNoah", "paintingDuke", "paintingKen",
    # Abstract paintings
    "paintingAbstract01_2x2", "paintingAbstract01_3x2",
    "paintingAbstract02_2x2", "paintingAbstract02_3x2",
    "paintingAbstract03_2x2", "paintingAbstract03_3x2",
    "paintingAbstract04_2x2", "paintingAbstract04_3x2",
    # Misc decor posters
    "posterCalendarPinupWorkingStiff", "posterBlueprintPistol", "posterBlueprintRifle",
    "posterCat", "posterCats", "posterSparky", "targetPoster1", "targetPoster2",
    "signPosterWantedMissing01", "signPosterWantedMissing02", "signPosterWantedMissing03",
    # Snack posters
    "signSnackPosterAtom", "signSnackPosterBretzels", "signSnackPosterEyeCandy",
    "signSnackPosterFortBites", "signSnackPosterGoblinO", "signSnackPosterHackers",
    "signSnackPosterHealth", "signSnackPosterJailBreakers", "signSnackPosterJerky",
    "signSnackPosterNachos", "signSnackPosterNachosRanch", "signSnackPosterNerd",
    "signSnackPosterOops", "signSnackPosterOopsClassic", "signSnackPosterPrime",
    "signSnackPosterRamen", "signSnackPosterSkullCrusher",
    # Movie posters + theaters
    "signPosterMovie2159", "signPosterMovieLoneWolf", "signPosterMovieMammasJustice",
    "signPosterMovieSexualTension", "signPosterMovieTheater2159",
    "signPosterMovieTheaterLoneWolf", "signPosterMovieTheaterMammasJustice",
    "signPosterMovieTheaterSexualTension",
    # Picture canvases A-J + helper
    "pictureCanvas_01a", "pictureCanvas_01b", "pictureCanvas_01c", "pictureCanvas_01d",
    "pictureCanvas_01e", "pictureCanvas_01f", "pictureCanvas_01g", "pictureCanvas_01h",
    "pictureCanvas_01i", "pictureCanvas_01j", "pictureCanvasRandomHelper",
    # Picture frames A-W
    "pictureFrame_01a", "pictureFrame_01b", "pictureFrame_01c", "pictureFrame_01d",
    "pictureFrame_01e", "pictureFrame_01f", "pictureFrame_01g", "pictureFrame_01h",
    "pictureFrame_01i", "pictureFrame_01j", "pictureFrame_01k", "pictureFrame_01l",
    "pictureFrame_01m", "pictureFrame_01n", "pictureFrame_01o", "pictureFrame_01p",
    "pictureFrame_01q", "pictureFrame_01r", "pictureFrame_01s", "pictureFrame_01t",
    "pictureFrame_01u", "pictureFrame_01v", "pictureFrame_01w",
    # Hidden-safe variants
    "hiddenSafePictureFrame_01a", "hiddenSafePictureFrame_01c", "hiddenSafePictureFrame_01d",
    "hiddenSafePictureFrame_01e", "hiddenSafePictureFrame_01f", "hiddenSafePictureFrame_01h",
    "hiddenSafePictureFrame_01j", "hiddenSafePictureFrame_01l", "hiddenSafePictureFrame_01m",
    "hiddenSafePictureFrame_01o", "hiddenSafePictureFrame_01p", "hiddenSafePictureFrame_01q",
    "hiddenSafePictureFrame_01r", "hiddenSafePictureFrame_01s", "hiddenSafePictureFrame_01t",
    "hiddenSafePictureFrame_01u",
]
HARVEST_TAG = "oreWoodHarvest"

PORTRAIT_SIZE = 1024
ABSTRACT_SIZE = 1024
ICON_SIZE = 160
FRAME_PCT = 0.25
DEFAULT_FRAME = "wood_dark"

SCRIPT_DIR = Path(__file__).resolve().parent
KIT_ROOT = SCRIPT_DIR.parent  # repo root or kit root after extraction
FRAMES_DIR = KIT_ROOT / "frames"
DLL_PATH = KIT_ROOT / "KitsunePrints.dll"
ATLAS_DIR = KIT_ROOT / "atlases"
POSTER_MOVIE_ATLAS = ATLAS_DIR / "posterMovie.png"


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
        print(f"    WARN frame '{frame_id}' missing at {frame_path} - falling back to {DEFAULT_FRAME}")
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


def compose_movie_poster_atlas(entries: list[tuple[tuple[int, int, int, int], Path]]) -> Image.Image:
    """Load the vanilla posterMovie atlas as base, paste each user image into its tile.
    `entries` is [((left, top, right, bottom), image_path), ...].
    Preserves theater-strip / edge regions sampled by mesh UVs we don't write to."""
    if not POSTER_MOVIE_ATLAS.exists():
        raise FileNotFoundError(
            f"Missing vanilla posterMovie atlas at {POSTER_MOVIE_ATLAS}. "
            "The DIY kit zip should ship it under atlases/."
        )
    atlas = Image.open(POSTER_MOVIE_ATLAS).convert("RGBA")
    if atlas.size != (MOVIE_POSTER_ATLAS_SIZE, MOVIE_POSTER_ATLAS_SIZE):
        atlas = atlas.resize((MOVIE_POSTER_ATLAS_SIZE, MOVIE_POSTER_ATLAS_SIZE), Image.LANCZOS)
    for (rect, image_path) in entries:
        left, top, right, bottom = rect
        tile_w, tile_h = right - left, bottom - top
        user_img = Image.open(image_path).convert("RGBA")
        fitted = cover_crop(user_img, tile_w, tile_h)
        atlas.paste(fitted, (left, top))
    return atlas


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


def render_block_entry(block_name: str, vanilla_block: str, pickupable: bool) -> str:
    pickup_lines = ""
    if pickupable:
        pickup_lines = (
            f'\n            <property name="CanPickup" value="true"/>'
            f'\n            <drop event="Harvest" name="{escape_xml(block_name)}" count="1" tag="{HARVEST_TAG}"/>'
        )
    return (
        f'        <block name="{escape_xml(block_name)}">\n'
        f'            <property name="Extends" value="{escape_xml(vanilla_block)}"/>\n'
        f'            <property name="CustomIcon" value="{escape_xml(block_name)}"/>'
        f'{pickup_lines}\n'
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
    elif kind == "abstract3x2":
        ingredients = (
            '            <ingredient name="resourcePaper" count="12"/>\n'
            '            <ingredient name="resourceWood" count="6"/>\n'
            '            <ingredient name="resourceForgedIron" count="2"/>'
        )
    elif kind == "hiddenSafe":
        ingredients = (
            '            <ingredient name="resourcePaper" count="2"/>\n'
            '            <ingredient name="resourceWood" count="6"/>\n'
            '            <ingredient name="resourceForgedIron" count="8"/>'
        )
    else:  # moviePoster / catch-all small print
        ingredients = (
            '            <ingredient name="resourcePaper" count="6"/>\n'
            '            <ingredient name="resourceWood" count="3"/>'
        )
    return (
        f'        <recipe name="{escape_xml(block_name)}" count="1" craft_area="workbench" tags="workbenchCrafting">\n'
        f"{ingredients}\n"
        "        </recipe>"
    )


def classify_vanilla_pickup_block(name: str) -> str:
    """Classify a vanilla pickup-list block into a recipe cost bucket by name."""
    if name.startswith("hiddenSafe"):
        return "hiddenSafe"
    if name.startswith("paintingAbstract"):
        return "abstract3x2" if name.endswith("_3x2") else "abstract2x2"
    if name.startswith("painting"):
        return "portrait"
    return "moviePoster"


def render_pickup_xml() -> str:
    block_rows = []
    for name in PICKUP_BLOCKS:
        block_rows.append(
            f'    <append xpath="/blocks/block[@name=\'{escape_xml(name)}\']">\n'
            f'        <property name="CanPickup" value="true"/>\n'
            f'        <drop event="Harvest" name="{escape_xml(name)}" count="1" tag="{HARVEST_TAG}"/>\n'
            f'    </append>'
        )
    recipe_rows = []
    for name in PICKUP_BLOCKS:
        kind = classify_vanilla_pickup_block(name)
        recipe_rows.append(render_recipe_entry(name, kind))
    return (
        '<?xml version="1.0" encoding="UTF-8" ?>\n'
        '<configs>\n\n'
        '    <!-- KitsunePrints optional pickup patch.\n'
        '         Adds CanPickup=true (hold-E), wrench Harvest, and a workbench\n'
        '         recipe to every covered vanilla block. Set enablePickup=false\n'
        '         in config.json to skip this file. -->\n\n'
        + "\n\n".join(block_rows)
        + '\n\n    <!-- Workbench recipes for every pickup-able block. -->\n\n'
        + '    <append xpath="/recipes">\n\n'
        + "\n\n".join(recipe_rows)
        + '\n\n    </append>\n\n</configs>\n'
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
    enable_pickup = bool(config.get("enablePickup", True))
    out_dir = pack_dir / sanitized
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)

    print(f"Building '{pack_name}' -> {out_dir}/")
    if enable_pickup:
        print("  pickup + craft patch: ON  (~115 vanilla blocks become hold-E pickup-able + workbench-craftable)")
    else:
        print("  pickup + craft patch: OFF")

    # ModInfo + DLL
    (out_dir / "ModInfo.xml").write_text(render_modinfo(config, sanitized), encoding="utf-8")
    shutil.copy(DLL_PATH, out_dir / "KitsunePrints.dll")

    # Per-slot composition
    pic_map: dict[str, str] = {}
    block_rows: list[str] = []
    recipe_rows: list[str] = []
    loc_rows: list[str] = []

    # Movie poster slots are batched ~ collect them, composite atlas once at the end.
    movie_poster_atlas_entries: list[tuple[tuple[int, int, int, int], Path]] = []

    slot_specs = config.get("slots", {})
    for slot_id, slot_label, vanilla_blocks, kind, atlas_tile in SLOTS:
        slot = slot_specs.get(slot_id)
        if not slot or not slot.get("image"):
            continue

        image_path = images_dir / slot["image"]
        if not image_path.exists():
            print(f"  WARN slot {slot_id}: image '{slot['image']}' not found, skipping")
            continue

        print(f"  {slot_id:42s} <- {slot['image']}  ({kind})")

        title = (slot.get("title") or slot_label).strip() or slot_label
        display_name = f"Print: {title}"

        # Texture handling depends on kind.
        if kind == "portrait":
            frame_id = slot.get("frame", DEFAULT_FRAME)
            tex = compose_portrait(image_path, frame_id)
            tex_filename = f"{slot_id}.png"
            tex_dir = out_dir / "Resources" / "Textures"
            tex_dir.mkdir(parents=True, exist_ok=True)
            tex.save(tex_dir / tex_filename, "PNG")
            pic_map[slot_id] = tex_filename
        elif kind == "abstract":
            tex = compose_abstract(image_path)
            tex_filename = f"{slot_id}.png"
            tex_dir = out_dir / "Resources" / "Textures"
            tex_dir.mkdir(parents=True, exist_ok=True)
            tex.save(tex_dir / tex_filename, "PNG")
            pic_map[slot_id] = tex_filename
        elif kind == "moviePoster":
            # Defer atlas write; collect entry for batched compositing.
            movie_poster_atlas_entries.append((atlas_tile, image_path))

        # Icon
        icon = compose_icon(image_path)
        icon_dir = out_dir / "UIAtlases" / "ItemIconAtlas"
        icon_dir.mkdir(parents=True, exist_ok=True)

        # Generate blocks/recipes/loc per vanilla block this slot re-skins.
        for vanilla_block in vanilla_blocks:
            block_name = f"kp_{sanitized}_{vanilla_block}"
            icon.save(icon_dir / f"{block_name}.png", "PNG")
            block_rows.append(render_block_entry(block_name, vanilla_block, enable_pickup))

            if kind == "portrait":
                recipe_kind = "portrait"
            elif kind == "moviePoster":
                recipe_kind = "moviePoster"
            else:  # abstract
                recipe_kind = "abstract2x2" if vanilla_block.endswith("_2x2") else "abstract3x2"
            recipe_rows.append(render_recipe_entry(block_name, recipe_kind))

            size_suffix = ""
            if vanilla_block.endswith("_2x2"):
                size_suffix = " 2x2"
            elif vanilla_block.endswith("_3x2"):
                size_suffix = " 3x2"
            elif "Theater" in vanilla_block:
                size_suffix = " (Theater)"
            loc_rows.append(render_loc_row(block_name, f"{display_name}{size_suffix}"))

    # If any movie poster slot was filled, composite the atlas once.
    if movie_poster_atlas_entries:
        atlas = compose_movie_poster_atlas(movie_poster_atlas_entries)
        tex_filename = f"{MOVIE_POSTER_MATERIAL}.png"
        tex_dir = out_dir / "Resources" / "Textures"
        tex_dir.mkdir(parents=True, exist_ok=True)
        atlas.save(tex_dir / tex_filename, "PNG")
        pic_map[MOVIE_POSTER_MATERIAL] = tex_filename
        print(f"  composited {len(movie_poster_atlas_entries)} movie poster tile(s) -> Resources/Textures/{tex_filename}")

    # Config files
    config_out = out_dir / "Config"
    config_out.mkdir(parents=True, exist_ok=True)
    (config_out / "picture_pack.json").write_text(
        json.dumps(pic_map, indent=2), encoding="utf-8"
    )
    (config_out / "blocks.xml").write_text(render_blocks_xml(block_rows), encoding="utf-8")
    (config_out / "recipes.xml").write_text(render_recipes_xml(recipe_rows), encoding="utf-8")
    (config_out / "Localization.txt").write_text(render_localization(loc_rows), encoding="utf-8")
    if enable_pickup:
        (config_out / "pickup.xml").write_text(render_pickup_xml(), encoding="utf-8")

    # Zip
    zip_path = pack_dir / f"{sanitized}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in out_dir.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(pack_dir))

    print(f"\nOK Built {len(pic_map)} texture(s) for {len(slot_specs)} slot(s) -> {zip_path}")
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
