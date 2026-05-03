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
            "painting_ben":            { "image": "boss-cat.png", "title": "The Boss",   "frame": "ornate_gold" },
            "paintingsAbstract01":     { "image": "hearth.png",   "title": "Hearth" },
            "signPosterMovieLoneWolf": { "image": "movie01.png",  "title": "Cat Movie" },
            "signSnackPosterJerky":    { "image": "thick.png",    "title": "Cat Jerky" },
            "pictureCanvas_01a":       { "image": "scene.png",    "title": "Sunset" },
            "pictureFrame_01a":        { "image": "kit.png",      "title": "Kitsune", "frame": "gold_gilt" }
        }
    }

Only fill in the slots you want ~ anything left out stays vanilla. Slot keys
are stable identifiers (see SLOTS list below). Frame is one of:
wood_dark | wood_light | gold_gilt | silver | matte_black | ornate_gold.

Slot kinds:
  portrait    ~ 1×1 backer painting (left 25% wood frame, right 75% canvas).
  abstract    ~ 2×2/3×2 abstract painting (full texture, fills both sizes).
  decor       ~ standalone single-block decor (calendar, blueprints, snack
                posters, etc.). One material per slot, full texture replaced.
  moviePoster ~ tile of the shared posterMovie atlas (composer batches).
  canvasTile  ~ tile of a shared picture-frame or canvas atlas (composer
                batches per material). Picture frames also accept `frame`
                for a wood-tint multiply-blend on the atlas's top region;
                siblings in the same atlas share the tint.

`enablePickup` (default true) ships a Config/pickup.xml that adds
CanPickup="true" to ~115 vanilla decor blocks ~ press E to pick up, no tool,
no recipe. Set false to skip.

Output: <pack_folder>/<sanitized_name>.zip ~ drop into <7DTD>/Mods/.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path
from typing import Optional

try:
    from PIL import Image, ImageChops
except ImportError:
    print("Missing dependency. Run: pip install Pillow")
    sys.exit(1)


# ---- Slot definitions -----------------------------------------------------
# Tuple shape: (slot_id, label, vanilla_blocks, kind, atlas_tile_or_None, material_name)
#   - slot_id          ~ stable identifier (used as config.json key)
#   - label            ~ default human label (config can override via "title")
#   - vanilla_blocks   ~ list of vanilla block names this slot re-skins
#   - kind             ~ 'portrait' / 'abstract' / 'decor' / 'moviePoster' / 'canvasTile'
#   - atlas_tile       ~ (left, top, right, bottom) PIL pixel rect for atlas slots, None otherwise
#   - material_name    ~ vanilla material this slot's texture replaces (key into picture_pack.json)

SLOTS: list[tuple[str, str, list[str], str, Optional[tuple[int, int, int, int]], str]] = [
    # --- Portraits (1×1 backer paintings) ---
    ("painting_ben",        "Backer Portrait 1", ["paintingBen"],    "portrait", None, "painting_ben"),
    ("painting_lorien",     "Backer Portrait 2", ["paintingLorien"], "portrait", None, "painting_lorien"),
    ("painting_derek",      "Backer Portrait 3", ["paintingDerek"],  "portrait", None, "painting_derek"),
    ("painting_noah",       "Backer Portrait 4", ["paintingNoah"],   "portrait", None, "painting_noah"),
    ("painting_duke",       "Backer Portrait 5", ["paintingDuke"],   "portrait", None, "painting_duke"),
    ("painting_ken",        "Backer Portrait 6", ["paintingKen"],    "portrait", None, "painting_ken"),

    # --- Abstracts (2×2 + 3×2 share one Material per design) ---
    ("paintingsAbstract01", "Abstract 1 (2x2 + 3x2)",
     ["paintingAbstract01_2x2", "paintingAbstract01_3x2"], "abstract", None, "paintingsAbstract01"),
    ("paintingsAbstract02", "Abstract 2 (2x2 + 3x2)",
     ["paintingAbstract02_2x2", "paintingAbstract02_3x2"], "abstract", None, "paintingsAbstract02"),
    ("paintingsAbstract03", "Abstract 3 (2x2 + 3x2)",
     ["paintingAbstract03_2x2", "paintingAbstract03_3x2"], "abstract", None, "paintingsAbstract03"),
    ("paintingsAbstract04", "Abstract 4 (2x2 + 3x2)",
     ["paintingAbstract04_2x2", "paintingAbstract04_3x2"], "abstract", None, "paintingsAbstract04"),

    # --- Movie posters (4 tiles of shared posterMovie 1024×1024 atlas;
    #     theater variants share tiles with their non-theater siblings) ---
    ("signPosterMovieMammasJustice", "Movie Poster ~ Mama's Justice",
     ["signPosterMovieMammasJustice", "signPosterMovieTheaterMammasJustice"],
     "moviePoster", (2, 25, 349, 508), "posterMovie"),
    ("signPosterMovieSexualTension", "Movie Poster ~ Sexual Tension",
     ["signPosterMovieSexualTension", "signPosterMovieTheaterSexualTension"],
     "moviePoster", (350, 24, 696, 508), "posterMovie"),
    ("signPosterMovieLoneWolf", "Movie Poster ~ Lone Wolf",
     ["signPosterMovieLoneWolf", "signPosterMovieTheaterLoneWolf"],
     "moviePoster", (2, 517, 348, 1000), "posterMovie"),
    ("signPosterMovie2159", "Movie Poster ~ 2159",
     ["signPosterMovie2159", "signPosterMovieTheater2159"],
     "moviePoster", (351, 518, 696, 1000), "posterMovie"),

    # --- Misc decor (5 standalone slots ~ each material gets its own texture) ---
    ("posterCalendarPinupWorkingStiff", "Working Stiff Calendar",
     ["posterCalendarPinupWorkingStiff"], "decor", None, "posterCalendarPinupWorkingStiff"),
    ("gunBlueprintPistol", "Pistol Blueprint",
     ["posterBlueprintPistol"], "decor", None, "gunBlueprintPistol"),
    ("gunBlueprintRifle", "Rifle Blueprint",
     ["posterBlueprintRifle"], "decor", None, "gunBlueprintRifle"),
    ("targetPoster1", "Target Poster 1",
     ["targetPoster1"], "decor", None, "targetPosters"),
    ("targetPoster2", "Target Poster 2",
     ["targetPoster2"], "decor", None, "targetPosters2"),

    # --- Snack posters (17 standalone slots ~ each material gets its own texture) ---
    ("signSnackPosterJerky",        "Snack ~ Thick Nick's Jerky", ["signSnackPosterJerky"],        "decor", None, "snackPosterJerky"),
    ("signSnackPosterGoblinO",      "Snack ~ Goblin-O's",         ["signSnackPosterGoblinO"],      "decor", None, "snackPosterGoblinO"),
    ("signSnackPosterOops",         "Snack ~ Oops Country",       ["signSnackPosterOops"],         "decor", None, "snackPosterOops"),
    ("signSnackPosterOopsClassic",  "Snack ~ Oops Classic",       ["signSnackPosterOopsClassic"],  "decor", None, "snackPosterOopsClassic"),
    ("signSnackPosterBretzels",     "Snack ~ Bretzels",           ["signSnackPosterBretzels"],     "decor", None, "snackPosterBretzels"),
    ("signSnackPosterJailBreakers", "Snack ~ Jail Breakers",      ["signSnackPosterJailBreakers"], "decor", None, "snackPosterJailBreakers"),
    ("signSnackPosterEyeCandy",     "Snack ~ Eye Candy",          ["signSnackPosterEyeCandy"],     "decor", None, "snackPosterEyeCandy"),
    ("signSnackPosterSkullCrusher", "Snack ~ Skull Crushers",     ["signSnackPosterSkullCrusher"], "decor", None, "snackPosterSkullCrusher"),
    ("signSnackPosterNachos",       "Snack ~ Nachios Beef",       ["signSnackPosterNachos"],       "decor", None, "snackPosterNachos"),
    ("signSnackPosterNachosRanch",  "Snack ~ Nachios Ranch",      ["signSnackPosterNachosRanch"],  "decor", None, "snackPosterNachosRanch"),
    ("signSnackPosterFortBites",    "Snack ~ Fort Bites",         ["signSnackPosterFortBites"],    "decor", None, "snackPosterFortBites"),
    ("signSnackPosterHealth",       "Snack ~ Health Bar (wide)",  ["signSnackPosterHealth"],       "decor", None, "snackPosterHealth"),
    ("signSnackPosterHackers",      "Snack ~ Hackers",            ["signSnackPosterHackers"],      "decor", None, "snackPosterHackers"),
    ("signSnackPosterPrime",        "Snack ~ Prime Bars",         ["signSnackPosterPrime"],        "decor", None, "snackPosterPrime"),
    ("signSnackPosterAtom",         "Snack ~ Atom Junkies",       ["signSnackPosterAtom"],         "decor", None, "snackPosterAtom"),
    ("signSnackPosterNerd",         "Snack ~ Nerd Tats",          ["signSnackPosterNerd"],         "decor", None, "snackPosterNerd"),
    ("signSnackPosterRamen",        "Snack ~ Ramen",              ["signSnackPosterRamen"],        "decor", None, "snackPosterRamen"),

    # --- Picture canvases (10 individual tiles across 2 shared 2048×2048 atlases) ---
    ("pictureCanvas_01a", "Canvas A (atlas 1)", ["pictureCanvas_01a"], "canvasTile", (1024, 273,  2048, 863),  "pictureCanvas1"),
    ("pictureCanvas_01b", "Canvas B (atlas 1)", ["pictureCanvas_01b"], "canvasTile", (0,    863,  1024, 1456), "pictureCanvas1"),
    ("pictureCanvas_01c", "Canvas C (atlas 1)", ["pictureCanvas_01c"], "canvasTile", (1024, 863,  2048, 1456), "pictureCanvas1"),
    ("pictureCanvas_01d", "Canvas D (atlas 1)", ["pictureCanvas_01d"], "canvasTile", (0,    1456, 1024, 2048), "pictureCanvas1"),
    ("pictureCanvas_01f", "Canvas F (atlas 1)", ["pictureCanvas_01f"], "canvasTile", (1024, 1456, 2048, 2048), "pictureCanvas1"),
    ("pictureCanvas_01e", "Canvas E (atlas 2)", ["pictureCanvas_01e"], "canvasTile", (1024, 273,  2048, 863),  "pictureCanvas2"),
    ("pictureCanvas_01g", "Canvas G (atlas 2)", ["pictureCanvas_01g"], "canvasTile", (0,    863,  1024, 1456), "pictureCanvas2"),
    ("pictureCanvas_01h", "Canvas H (atlas 2)", ["pictureCanvas_01h"], "canvasTile", (1024, 863,  2048, 1456), "pictureCanvas2"),
    ("pictureCanvas_01i", "Canvas I (atlas 2)", ["pictureCanvas_01i"], "canvasTile", (0,    1456, 1024, 2048), "pictureCanvas2"),
    ("pictureCanvas_01j", "Canvas J (atlas 2)", ["pictureCanvas_01j"], "canvasTile", (1024, 1456, 2048, 2048), "pictureCanvas2"),

    # --- Picture frames (23 individual tiles across 8 shared 2048×2048 atlases).
    #     Tile rects derived from real LOD0 mesh UVs (front-face quad). Three
    #     sizes per atlas: BIG (1288,1138,2023,2036), MEDIUM (741,1361,1273,2035),
    #     SMALL (373,1533,723,2035). Atlases 3 and 4 reverse the cycle ---
    ("pictureFrame_01a", "Frame A", ["pictureFrame_01a"], "canvasTile", (1288, 1138, 2023, 2036), "pictureFramed"),
    ("pictureFrame_01b", "Frame B", ["pictureFrame_01b"], "canvasTile", (373,  1533, 723,  2035), "pictureFramed"),
    ("pictureFrame_01c", "Frame C", ["pictureFrame_01c"], "canvasTile", (741,  1361, 1273, 2035), "pictureFramed"),
    ("pictureFrame_01d", "Frame D", ["pictureFrame_01d"], "canvasTile", (1288, 1138, 2023, 2036), "pictureFramed2"),
    ("pictureFrame_01e", "Frame E", ["pictureFrame_01e"], "canvasTile", (373,  1533, 723,  2035), "pictureFramed2"),
    ("pictureFrame_01f", "Frame F", ["pictureFrame_01f"], "canvasTile", (741,  1361, 1273, 2035), "pictureFramed2"),
    ("pictureFrame_01g", "Frame G", ["pictureFrame_01g"], "canvasTile", (741,  1361, 1273, 2035), "pictureFramed3"),
    ("pictureFrame_01h", "Frame H", ["pictureFrame_01h"], "canvasTile", (373,  1533, 723,  2035), "pictureFramed3"),
    ("pictureFrame_01i", "Frame I", ["pictureFrame_01i"], "canvasTile", (1288, 1138, 2023, 2036), "pictureFramed3"),
    ("pictureFrame_01j", "Frame J", ["pictureFrame_01j"], "canvasTile", (741,  1361, 1273, 2035), "pictureFramed4"),
    ("pictureFrame_01k", "Frame K", ["pictureFrame_01k"], "canvasTile", (373,  1533, 723,  2035), "pictureFramed4"),
    ("pictureFrame_01l", "Frame L", ["pictureFrame_01l"], "canvasTile", (1288, 1138, 2023, 2036), "pictureFramed4"),
    ("pictureFrame_01m", "Frame M", ["pictureFrame_01m"], "canvasTile", (1288, 1138, 2023, 2036), "pictureFramed5"),
    ("pictureFrame_01n", "Frame N", ["pictureFrame_01n"], "canvasTile", (373,  1533, 723,  2035), "pictureFramed5"),
    ("pictureFrame_01o", "Frame O", ["pictureFrame_01o"], "canvasTile", (741,  1361, 1273, 2035), "pictureFramed5"),
    ("pictureFrame_01p", "Frame P", ["pictureFrame_01p"], "canvasTile", (1288, 1138, 2023, 2036), "pictureFramed6"),
    ("pictureFrame_01q", "Frame Q", ["pictureFrame_01q"], "canvasTile", (373,  1533, 723,  2035), "pictureFramed6"),
    ("pictureFrame_01r", "Frame R", ["pictureFrame_01r"], "canvasTile", (741,  1361, 1273, 2035), "pictureFramed6"),
    ("pictureFrame_01s", "Frame S", ["pictureFrame_01s"], "canvasTile", (1288, 1138, 2023, 2036), "pictureFramed7"),
    ("pictureFrame_01t", "Frame T", ["pictureFrame_01t"], "canvasTile", (373,  1533, 723,  2035), "pictureFramed7"),
    ("pictureFrame_01u", "Frame U", ["pictureFrame_01u"], "canvasTile", (741,  1361, 1273, 2035), "pictureFramed7"),
    ("pictureFrame_01v", "Frame V", ["pictureFrame_01v"], "canvasTile", (741,  1361, 1273, 2035), "pictureFramed8"),
    ("pictureFrame_01w", "Frame W", ["pictureFrame_01w"], "canvasTile", (373,  1533, 723,  2035), "pictureFramed8"),
]


# Atlas registry. (filename in atlases/, square size, frameTintHeightPct or None).
# frameTintHeightPct is the fraction of the atlas (top-down) where the wood-frame
# zone lives ~ tint multiply-blends only over that region for picture frames.
ATLAS_SOURCES: dict[str, tuple[str, int, Optional[float]]] = {
    "posterMovie":    ("posterMovie.png",    1024, None),
    "pictureCanvas1": ("pictureCanvas1.png", 2048, None),
    "pictureCanvas2": ("pictureCanvas2.png", 2048, None),
    "pictureFramed":  ("pictureFramed.png",  2048, 0.55),
    "pictureFramed2": ("pictureFramed2.png", 2048, 0.55),
    "pictureFramed3": ("pictureFramed3.png", 2048, 0.55),
    "pictureFramed4": ("pictureFramed4.png", 2048, 0.55),
    "pictureFramed5": ("pictureFramed5.png", 2048, 0.55),
    "pictureFramed6": ("pictureFramed6.png", 2048, 0.55),
    "pictureFramed7": ("pictureFramed7.png", 2048, 0.55),
    "pictureFramed8": ("pictureFramed8.png", 2048, 0.55),
}


# Frame presets ~ used for both portraits (image strip painted into left 25%
# UV zone) and picture frames (tint multiply-blended over top 55% of atlas).
FRAME_PRESETS: dict[str, str] = {
    "wood_dark":   "#5c3a1e",
    "wood_light":  "#c39065",
    "gold_gilt":   "#d4af37",
    "silver":      "#b0b0b0",
    "matte_black": "#2a2a2a",
    "ornate_gold": "#a37428",
}


# All vanilla blocks that get the optional press-E pickup treatment.
# Mirrors src/utils/pickupBlocks.ts.
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
    # Picture canvases A-J (pictureCanvasRandomHelper EXCLUDED ~ internal
    # helper block; CanPickup triggers POI-load NREs)
    "pictureCanvas_01a", "pictureCanvas_01b", "pictureCanvas_01c", "pictureCanvas_01d",
    "pictureCanvas_01e", "pictureCanvas_01f", "pictureCanvas_01g", "pictureCanvas_01h",
    "pictureCanvas_01i", "pictureCanvas_01j",
    # Picture frames A-W
    "pictureFrame_01a", "pictureFrame_01b", "pictureFrame_01c", "pictureFrame_01d",
    "pictureFrame_01e", "pictureFrame_01f", "pictureFrame_01g", "pictureFrame_01h",
    "pictureFrame_01i", "pictureFrame_01j", "pictureFrame_01k", "pictureFrame_01l",
    "pictureFrame_01m", "pictureFrame_01n", "pictureFrame_01o", "pictureFrame_01p",
    "pictureFrame_01q", "pictureFrame_01r", "pictureFrame_01s", "pictureFrame_01t",
    "pictureFrame_01u", "pictureFrame_01v", "pictureFrame_01w",
    # Hidden-safe variants EXCLUDED ~ they're loot-container TileEntities under
    # the hood. CanPickup conflicted with their init flow and caused POI-load
    # NREs. Visual swap still applies via Extends so users still see their art
    # on hidden-safe walls; they just can't E-pick-up the safes themselves.
]

PORTRAIT_SIZE = 1024
ABSTRACT_SIZE = 1024
ICON_SIZE = 160
FRAME_PCT = 0.25
DEFAULT_FRAME = "wood_dark"

SCRIPT_DIR = Path(__file__).resolve().parent
# When this script runs from the extracted DIY kit, all the assets sit
# alongside it (kit_root/make_pack.py + kit_root/frames/ etc.). When it runs
# from the repo, the assets live one level up (repo/scripts/make_pack.py +
# repo/public/frames/ + repo/public/reference/KitsunePrints.dll). Auto-detect.
if (SCRIPT_DIR / "KitsunePrints.dll").exists():
    KIT_ROOT = SCRIPT_DIR
    FRAMES_DIR = KIT_ROOT / "frames"
    DLL_PATH = KIT_ROOT / "KitsunePrints.dll"
    ATLAS_DIR = KIT_ROOT / "atlases"
else:
    # Repo layout: scripts/make_pack.py + public/frames/ + public/reference/...
    KIT_ROOT = SCRIPT_DIR.parent
    FRAMES_DIR = KIT_ROOT / "public" / "frames"
    DLL_PATH = KIT_ROOT / "public" / "reference" / "KitsunePrints.dll"
    ATLAS_DIR = KIT_ROOT / "public" / "vanilla"


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


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    s = hex_str.lstrip("#")
    return int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)


def compose_portrait(image_path: Path, frame_id: str) -> Image.Image:
    """Left 25% wood frame texture, right 75% user image."""
    canvas = Image.new("RGBA", (PORTRAIT_SIZE, PORTRAIT_SIZE), (0, 0, 0, 255))
    frame_w = int(PORTRAIT_SIZE * FRAME_PCT)

    frame_path = FRAMES_DIR / f"{frame_id}.png"
    if not frame_path.exists():
        print(f"    WARN frame '{frame_id}' missing at {frame_path} ~ falling back to {DEFAULT_FRAME}")
        frame_path = FRAMES_DIR / f"{DEFAULT_FRAME}.png"
    frame = Image.open(frame_path).convert("RGBA")
    frame = frame.resize((frame_w, PORTRAIT_SIZE), Image.LANCZOS)
    canvas.paste(frame, (0, 0))

    user_img = Image.open(image_path).convert("RGBA")
    canvas_zone_w = PORTRAIT_SIZE - frame_w
    user_fitted = cover_crop(user_img, canvas_zone_w, PORTRAIT_SIZE)
    canvas.paste(user_fitted, (frame_w, 0))
    return canvas


def compose_full_texture(image_path: Path, size: int = ABSTRACT_SIZE) -> Image.Image:
    """Cover-fit the user image to a square. Used for abstract + decor slots
    where the DLL resets material UV scale/offset to (1,1)/(0,0) at runtime,
    so the user's full image fills each block's canvas."""
    img = Image.open(image_path).convert("RGBA")
    return cover_crop(img, size, size)


def _resolve_atlas_path(filename: str) -> Path:
    """Find an atlas under either kit naming (atlases/<name>.png) or repo
    naming (public/vanilla/_<name>_atlas.png). Returns whichever exists."""
    kit_path = ATLAS_DIR / filename
    if kit_path.exists():
        return kit_path
    base = filename[:-4] if filename.endswith(".png") else filename
    return ATLAS_DIR / f"_{base}_atlas.png"


def compose_atlas(
    material_name: str,
    entries: list[tuple[tuple[int, int, int, int], Path]],
    frame_tint_hex: Optional[str] = None,
) -> Image.Image:
    """Generic atlas composer. Loads vanilla atlas as the base layer, optionally
    multiply-blends a tint color over the top wood-frame zone (for picture
    frames), then pastes user images into their tile rects.

    `entries` is [((left, top, right, bottom), image_path), ...].
    """
    if material_name not in ATLAS_SOURCES:
        raise ValueError(f"No atlas registered for material '{material_name}'")
    filename, size, frame_tint_pct = ATLAS_SOURCES[material_name]
    atlas_path = _resolve_atlas_path(filename)
    if not atlas_path.exists():
        raise FileNotFoundError(
            f"Missing vanilla atlas for {material_name} (looked in {atlas_path}). "
            f"The DIY kit zip should ship it under atlases/."
        )
    atlas = Image.open(atlas_path).convert("RGBA")
    if atlas.size != (size, size):
        atlas = atlas.resize((size, size), Image.LANCZOS)

    # Tint the wood-frame zone (top region) for picture-frame atlases.
    if frame_tint_pct is not None and frame_tint_hex:
        tint_h = round(size * frame_tint_pct)
        tint_rgb = hex_to_rgb(frame_tint_hex)
        tint_layer = Image.new("RGB", (size, tint_h), tint_rgb)
        atlas_top_rgb = atlas.crop((0, 0, size, tint_h)).convert("RGB")
        multiplied = ImageChops.multiply(atlas_top_rgb, tint_layer).convert("RGBA")
        atlas.paste(multiplied, (0, 0))

    # Paste each user image into its assigned tile, cover-fitted.
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


def render_blocks_xml(rows: list[str], pickup_append_rows: str = "") -> str:
    """Render Config/blocks.xml. Inlines the pickup <append> patches when
    provided so 7DTD's XmlPatcher reliably picks them up (patches in a file
    named after the master they target get applied most consistently)."""
    pickup_section = ""
    if pickup_append_rows:
        pickup_section = (
            "\n\n"
            "    <!-- Optional pickup patch ~ adds CanPickup=\"true\" to every covered\n"
            "         vanilla decor block. Single E press to grab, no tool, no recipe. -->\n\n"
            + pickup_append_rows
            + "\n"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8" ?>\n'
        "<configs>\n\n"
        "    <append xpath=\"/blocks\">\n\n"
        + "\n\n".join(rows)
        + "\n\n    </append>"
        + pickup_section
        + "\n</configs>\n"
    )


def render_block_entry(block_name: str, vanilla_block: str, pickupable: bool) -> str:
    pickup_lines = ""
    if pickupable:
        # Single E press to pick up. Wrench harvest + workbench recipes were
        # tried earlier but conflicted with hidden-safe loot init on POI load.
        pickup_lines = '\n            <property name="CanPickup" value="true"/>'
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
    else:  # moviePoster / decor / canvasTile catch-all small print
        ingredients = (
            '            <ingredient name="resourcePaper" count="6"/>\n'
            '            <ingredient name="resourceWood" count="3"/>'
        )
    return (
        f'        <recipe name="{escape_xml(block_name)}" count="1" craft_area="workbench" tags="workbenchCrafting">\n'
        f"{ingredients}\n"
        "        </recipe>"
    )


def render_pickup_append_rows() -> str:
    """Render the per-block pickup <append> patches. Inlined into
    Config/blocks.xml by render_blocks_xml() so 7DTD's XmlPatcher reliably
    applies them."""
    rows = []
    for name in PICKUP_BLOCKS:
        rows.append(
            f'    <append xpath="/blocks/block[@name=\'{escape_xml(name)}\']">\n'
            f'        <property name="CanPickup" value="true"/>\n'
            f'    </append>'
        )
    return "\n\n".join(rows)


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
        print("  pickup patch: ON  (~115 vanilla blocks become press-E pickup-able)")
    else:
        print("  pickup patch: OFF")

    # ModInfo + DLL
    (out_dir / "ModInfo.xml").write_text(render_modinfo(config, sanitized), encoding="utf-8")
    shutil.copy(DLL_PATH, out_dir / "KitsunePrints.dll")

    # Per-slot composition
    pic_map: dict[str, str] = {}
    block_rows: list[str] = []
    recipe_rows: list[str] = []
    loc_rows: list[str] = []

    # Atlas slots (moviePoster + canvasTile) are batched per material.
    # entries: list of (atlas_tile, image_path, slot_spec_dict)
    atlas_groups: dict[str, list[tuple[tuple[int, int, int, int], Path, dict]]] = {}

    slot_specs = config.get("slots", {})
    written_textures: set[str] = set()

    for slot_id, slot_label, vanilla_blocks, kind, atlas_tile, material_name in SLOTS:
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
            tex_filename = f"{material_name}.png"
            if tex_filename not in written_textures:
                tex_dir = out_dir / "Resources" / "Textures"
                tex_dir.mkdir(parents=True, exist_ok=True)
                tex.save(tex_dir / tex_filename, "PNG")
                written_textures.add(tex_filename)
            pic_map[material_name] = tex_filename
        elif kind in ("abstract", "decor"):
            tex = compose_full_texture(image_path)
            tex_filename = f"{material_name}.png"
            if tex_filename not in written_textures:
                tex_dir = out_dir / "Resources" / "Textures"
                tex_dir.mkdir(parents=True, exist_ok=True)
                tex.save(tex_dir / tex_filename, "PNG")
                written_textures.add(tex_filename)
            pic_map[material_name] = tex_filename
        elif kind in ("moviePoster", "canvasTile"):
            # Defer atlas write; collect entry for batched compositing.
            assert atlas_tile is not None, f"{slot_id}: atlas_tile required for {kind}"
            atlas_groups.setdefault(material_name, []).append((atlas_tile, image_path, slot))

        # Icon
        icon = compose_icon(image_path)
        icon_dir = out_dir / "UIAtlases" / "ItemIconAtlas"
        icon_dir.mkdir(parents=True, exist_ok=True)

        # Generate blocks/recipes/loc per vanilla block this slot re-skins.
        for vanilla_block in vanilla_blocks:
            block_name = f"kp_{sanitized}_{vanilla_block}"
            icon.save(icon_dir / f"{block_name}.png", "PNG")
            # Also override the VANILLA block's icon so when a player presses
            # E to pick up a vanilla painting in a POI, the inventory icon
            # shows the user's art instead of the vanilla bird/etc. 7DTD
            # merges modlet icons over vanilla by filename. Closes issue #2.
            icon.save(icon_dir / f"{vanilla_block}.png", "PNG")
            block_rows.append(render_block_entry(block_name, vanilla_block, enable_pickup))

            if kind == "portrait":
                recipe_kind = "portrait"
            elif kind == "abstract":
                recipe_kind = "abstract2x2" if vanilla_block.endswith("_2x2") else "abstract3x2"
            else:  # moviePoster, decor, canvasTile
                recipe_kind = "moviePoster"
            recipe_rows.append(render_recipe_entry(block_name, recipe_kind))

            size_suffix = ""
            if vanilla_block.endswith("_2x2"):
                size_suffix = " 2x2"
            elif vanilla_block.endswith("_3x2"):
                size_suffix = " 3x2"
            elif "Theater" in vanilla_block:
                size_suffix = " (Theater)"
            loc_rows.append(render_loc_row(block_name, f"{display_name}{size_suffix}"))

    # Composite each atlas exactly once, with optional frame tint for picture frames.
    for material, entries in atlas_groups.items():
        # For picture-frame atlases (those with frameTintHeightPct set), look
        # up the frame tint from any filled slot's "frame" config field.
        # First filled slot wins; siblings in the same atlas share the tint.
        frame_tint_hex = None
        if ATLAS_SOURCES.get(material, (None, None, None))[2] is not None:
            for (_tile, _img, spec) in entries:
                frame_id = spec.get("frame", DEFAULT_FRAME)
                if frame_id in FRAME_PRESETS:
                    frame_tint_hex = FRAME_PRESETS[frame_id]
                    break
            if frame_tint_hex is None:
                frame_tint_hex = FRAME_PRESETS[DEFAULT_FRAME]

        atlas_entries = [(tile, image_path) for (tile, image_path, _spec) in entries]
        atlas = compose_atlas(material, atlas_entries, frame_tint_hex=frame_tint_hex)
        tex_filename = f"{material}.png"
        tex_dir = out_dir / "Resources" / "Textures"
        tex_dir.mkdir(parents=True, exist_ok=True)
        atlas.save(tex_dir / tex_filename, "PNG")
        pic_map[material] = tex_filename
        tint_note = f" tint={frame_tint_hex}" if frame_tint_hex else ""
        print(f"  composited {len(entries)} tile(s) into atlas '{material}.png'{tint_note}")

    # Config files
    config_out = out_dir / "Config"
    config_out.mkdir(parents=True, exist_ok=True)
    (config_out / "picture_pack.json").write_text(
        json.dumps(pic_map, indent=2), encoding="utf-8"
    )
    pickup_rows = render_pickup_append_rows() if enable_pickup else ""
    (config_out / "blocks.xml").write_text(
        render_blocks_xml(block_rows, pickup_rows), encoding="utf-8"
    )
    (config_out / "recipes.xml").write_text(render_recipes_xml(recipe_rows), encoding="utf-8")
    (config_out / "Localization.txt").write_text(render_localization(loc_rows), encoding="utf-8")

    # Zip
    zip_path = pack_dir / f"{sanitized}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in out_dir.rglob("*"):
            if f.is_file():
                zf.write(f, f.relative_to(pack_dir))

    n_filled = sum(1 for slot_id, *_ in SLOTS if slot_specs.get(slot_id, {}).get("image"))
    print(f"\nOK Built {len(pic_map)} texture(s) for {n_filled} slot(s) -> {zip_path}")
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
