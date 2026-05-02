"""
Extract vanilla painting reference thumbnails from 7DTD V2.6 bundles.

Walks all bundle files under <7DTD>/Data/Addressables and <7DTD>/Data/Bundles,
finds Texture2D assets matching the vanilla painting names, downscales them
to 256x256 thumbnails and writes them into public/vanilla/.

For abstract paintings the source is the signsMisc_d atlas; the abstract
material samples a tile of it via UV scale (0.30, 0.32). We compute the
correct tile by reading each material's UV scale + offset and crop the
atlas accordingly.

Usage:
    pip install UnityPy Pillow
    python scripts/extract_vanilla_refs.py "F:/SteamLibrary/steamapps/common/7 Days To Die"
"""
import os
import sys
from pathlib import Path

import UnityPy
from PIL import Image

PORTRAITS = [
    "painting_ben", "painting_lorien", "painting_derek",
    "painting_noah", "painting_duke", "painting_ken",
]
ABSTRACT_MATERIALS = [
    "paintingsAbstract01", "paintingsAbstract02",
    "paintingsAbstract03", "paintingsAbstract04",
]
# Misc decor slots ~ (slot_id -> (source_texture_name, crop_side_or_None)).
# `crop_side` is one of None/'top'/'bottom'/'left'/'right' for atlases that
# pack two posters into one texture. Each slot's material samples its half
# via UV offset; the DLL resets UV on swap so the user's full image fills.
MISC_DECOR_TEXTURES = {
    "posterCalendarPinupWorkingStiff": ("posterCalendarPinupWorkingStiff", None),
    "gunBlueprintPistol": ("gunBlueprints_d", "top"),
    "gunBlueprintRifle": ("gunBlueprints_d", "bottom"),
    "targetPoster1":     ("targetPosters_d", "left"),
    "targetPoster2":     ("targetPosters_d", "right"),
}

# Picture frame slots ~ each material drives 3-5 vanilla blocks
# (picture frame letter triplets plus their hidden-safe twins). Reference
# thumbs come from the standalone _d textures (no atlas dance).
PICTURE_FRAME_TEXTURES = {
    "pictureFramed":  "pictureFramed_d",
    "pictureFramed2": "PictureFramed2_d",
    "pictureFramed3": "PictureFramed3_d",
    "pictureFramed4": "PictureFramed4_d",
    "pictureFramed5": "PictureFramed5_d",
    "pictureFramed6": "PictureFramed6_d",
    "pictureFramed7": "PictureFramed7_d",
    "pictureFramed8": "PictureFramed8_d",
}

# Picture canvas atlases ~ each is a 2048×2048 texture with 6 distinct canvas
# paintings in a 2-col × 3-row grid. Each pictureCanvas_01<letter> prefab
# samples one tile via mesh UVs. Ship the full atlas + per-tile thumbs so we
# can offer per-canvas swap granularity (10 slots, 5 per material).
CANVAS_ATLAS_SOURCES = {
    "pictureCanvas1": "pictureCanvas_d",
    "pictureCanvas2": "pictureCanvas2_d",
}
# Visual 2×3 layout on 2048×2048: top ~273px is wood frame border, then
# 3 rows of canvas paintings. TL position is empty/border (no painting), so
# only 5 active tiles per atlas (matches the 5 prefabs per material).
# Tile rects: each ~1024×590, starting at y=273.
CANVAS_TILE = {
    # canvas 1 letters (a, b, c, d, f) -> TR, ML, MR, BL, BR
    "pictureCanvas_01a": ("pictureCanvas1", (1024, 273,  2048, 863)),   # TR
    "pictureCanvas_01b": ("pictureCanvas1", (0,    863,  1024, 1456)),  # ML
    "pictureCanvas_01c": ("pictureCanvas1", (1024, 863,  2048, 1456)),  # MR
    "pictureCanvas_01d": ("pictureCanvas1", (0,    1456, 1024, 2048)),  # BL
    "pictureCanvas_01f": ("pictureCanvas1", (1024, 1456, 2048, 2048)),  # BR
    # canvas 2 letters (e, g, h, i, j) -> TR, ML, MR, BL, BR
    "pictureCanvas_01e": ("pictureCanvas2", (1024, 273,  2048, 863)),   # TR
    "pictureCanvas_01g": ("pictureCanvas2", (0,    863,  1024, 1456)),  # ML
    "pictureCanvas_01h": ("pictureCanvas2", (1024, 863,  2048, 1456)),  # MR
    "pictureCanvas_01i": ("pictureCanvas2", (0,    1456, 1024, 2048)),  # BL
    "pictureCanvas_01j": ("pictureCanvas2", (1024, 1456, 2048, 2048)),  # BR
}


def crop_half(img: Image.Image, side: str | None) -> Image.Image:
    """Crop an atlas half so the reference thumb shows only the slot's region."""
    if side is None:
        return img
    w, h = img.size
    if side == "top":    return img.crop((0, 0, w, h // 2))
    if side == "bottom": return img.crop((0, h // 2, w, h))
    if side == "left":   return img.crop((0, 0, w // 2, h))
    if side == "right":  return img.crop((w // 2, 0, w, h))
    return img


# Snack poster atlas (snackPosters_d, 2048×2048) tile rects. Hand-mapped from
# the visual layout: 5×4 grid except row 3, which has a small Fort Bites tile
# + a wide Health Bar tile. PIL pixel rects (left, top, right, bottom).
SNACK_POSTER_TILES = {
    # Row 1 ~ vertical posters
    "signSnackPosterJerky":        (0,    0,    410,  512),  # Thick Nick's Jerky
    "signSnackPosterGoblinO":      (410,  0,    820,  512),
    "signSnackPosterOops":         (820,  0,    1230, 512),  # Mostly Air OOPS Country
    "signSnackPosterOopsClassic":  (1230, 0,    1640, 512),  # Mostly Air OOPS Classic
    "signSnackPosterBretzels":     (1640, 0,    2048, 512),
    # Row 2
    "signSnackPosterJailBreakers": (0,    512,  410,  1024),
    "signSnackPosterEyeCandy":     (410,  512,  820,  1024),
    "signSnackPosterSkullCrusher": (820,  512,  1230, 1024),
    "signSnackPosterNachos":       (1230, 512,  1640, 1024),
    "signSnackPosterNachosRanch":  (1640, 512,  2048, 1024),
    # Row 3 ~ wide row
    "signSnackPosterFortBites":    (0,    1024, 410,  1536),
    "signSnackPosterHealth":       (410,  1024, 2048, 1536),
    # Row 4
    "signSnackPosterHackers":      (0,    1536, 410,  2048),
    "signSnackPosterPrime":        (410,  1536, 820,  2048),
    "signSnackPosterAtom":         (820,  1536, 1230, 2048),
    "signSnackPosterNerd":         (1230, 1536, 1640, 2048),
    "signSnackPosterRamen":        (1640, 1536, 2048, 2048),
}
# Movie poster atlas tiles ~ the posterMovie material is a 1024x1024 atlas with
# 4 distinct posters laid out across the left ~70% of the image. Each prefab's
# mesh UVs sample one of these tiles. Coordinates derived from reading mesh
# UVs in commercial.bundle (see read_movie_poster_uvs.py).
MOVIE_POSTER_TILES = {
    # slot_id -> (PIL_left, PIL_top, PIL_right, PIL_bottom)
    "signPosterMovieMammasJustice": (2, 25, 349, 508),    # top-left
    "signPosterMovieSexualTension": (350, 24, 696, 508),  # top-middle
    "signPosterMovieLoneWolf":      (2, 517, 348, 1000),  # bottom-left
    "signPosterMovie2159":          (351, 518, 696, 1000),# bottom-middle
}

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "vanilla"
THUMB_SIZE = 256


def iter_bundles(game_root: Path):
    for sub in ("Data/Addressables", "Data/Bundles"):
        root = game_root / sub
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if path.is_file() and path.suffix in (".bundle", ""):
                # Some addressable bundles have no extension; UnityPy will
                # ignore non-bundles silently if it can't parse them.
                yield path


def collect_textures_and_materials(game_root: Path):
    """Single pass: collect all Texture2D and Material objects we care about."""
    textures = {}   # name -> PIL.Image (RGBA)
    materials = {}  # name -> dict with main_texture_name, scale, offset

    targets = (
        set(PORTRAITS)
        | set(ABSTRACT_MATERIALS)
        | {"signsMisc_d", "posterMovie", "snackPosters_d"}
        | {tex for (tex, _side) in MISC_DECOR_TEXTURES.values()}
        | set(PICTURE_FRAME_TEXTURES.values())
        | set(CANVAS_ATLAS_SOURCES.values())
    )

    for bundle_path in iter_bundles(game_root):
        try:
            env = UnityPy.load(str(bundle_path))
        except Exception:
            continue

        for obj in env.objects:
            try:
                if obj.type.name == "Texture2D":
                    data = obj.read()
                    name = getattr(data, "m_Name", None) or getattr(data, "name", "")
                    if not name:
                        continue
                    # We want all painting_* textures + signsMisc_d.
                    if name in targets or name.startswith("painting_"):
                        if name in textures:
                            continue
                        try:
                            img = data.image
                        except Exception:
                            continue
                        if img is None:
                            continue
                        textures[name] = img.convert("RGBA")
                        print(f"  + texture  {name:32}  ({img.width}x{img.height})  from {bundle_path.name}")

                elif obj.type.name == "Material":
                    data = obj.read()
                    name = getattr(data, "m_Name", None) or getattr(data, "name", "")
                    if name not in (set(PORTRAITS) | set(ABSTRACT_MATERIALS)):
                        continue
                    if name in materials:
                        continue
                    # Walk SavedProperties.m_TexEnvs for _MainTex.
                    saved = getattr(data, "m_SavedProperties", None)
                    if saved is None:
                        continue
                    tex_envs = getattr(saved, "m_TexEnvs", None) or []
                    main = None
                    for entry in tex_envs:
                        # entry is (key, value) tuple-ish
                        try:
                            key = entry[0] if isinstance(entry, tuple) else entry.first
                            val = entry[1] if isinstance(entry, tuple) else entry.second
                        except Exception:
                            continue
                        if str(key) == "_MainTex":
                            main = val
                            break
                    if main is None:
                        continue
                    tex_ref = getattr(main, "m_Texture", None)
                    tex_name = ""
                    if tex_ref is not None:
                        try:
                            tex_obj = tex_ref.read()
                            tex_name = getattr(tex_obj, "m_Name", "") or getattr(tex_obj, "name", "")
                        except Exception:
                            pass
                    scale = getattr(main, "m_Scale", None)
                    offset = getattr(main, "m_Offset", None)
                    materials[name] = {
                        "tex_name": tex_name,
                        "scale": (getattr(scale, "x", 1.0), getattr(scale, "y", 1.0)) if scale else (1.0, 1.0),
                        "offset": (getattr(offset, "x", 0.0), getattr(offset, "y", 0.0)) if offset else (0.0, 0.0),
                    }
                    print(f"  + material {name:32}  -> {tex_name}  scale={materials[name]['scale']}  offset={materials[name]['offset']}")
            except Exception:
                continue

    return textures, materials


def extract_canvas_only(img: Image.Image) -> Image.Image:
    """For portrait textures, vanilla layout is left 25% wood / right 75% canvas.
    Crop to just the canvas zone so the reference shows the actual art, not the wood frame."""
    w, h = img.size
    canvas_x = int(w * 0.25)
    return img.crop((canvas_x, 0, w, h))


def crop_atlas_tile(atlas: Image.Image, scale, offset) -> Image.Image:
    """Apply UV scale/offset to crop a tile from an atlas.
    Unity UVs are bottom-up; PIL is top-down."""
    aw, ah = atlas.size
    sx, sy = scale
    ox, oy = offset
    x0 = int(round(ox * aw))
    y0_uv = int(round(oy * ah))
    w = int(round(sx * aw))
    h = int(round(sy * ah))
    # Convert UV-bottom-up to PIL-top-down
    top = ah - (y0_uv + h)
    return atlas.crop((x0, top, x0 + w, top + h))


def make_thumb(img: Image.Image, size: int = THUMB_SIZE) -> Image.Image:
    img = img.copy()
    img.thumbnail((size, size), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (24, 24, 27, 0))
    paste_x = (size - img.width) // 2
    paste_y = (size - img.height) // 2
    canvas.paste(img, (paste_x, paste_y), img if img.mode == "RGBA" else None)
    return canvas


def main():
    if len(sys.argv) < 2:
        print("Usage: python extract_vanilla_refs.py <7DTD install root>")
        sys.exit(1)

    game_root = Path(sys.argv[1])
    if not game_root.exists():
        print(f"Game root not found: {game_root}")
        sys.exit(1)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Scanning bundles under {game_root}...")
    textures, materials = collect_textures_and_materials(game_root)

    print(f"\nFound {len(textures)} relevant textures, {len(materials)} relevant materials.\n")

    written = 0

    # Portraits: write the canvas-only crop of each painting_<name> texture.
    for name in PORTRAITS:
        tex = textures.get(name)
        if tex is None:
            print(f"  ! missing texture for {name}")
            continue
        canvas = extract_canvas_only(tex)
        thumb = make_thumb(canvas)
        out = OUT_DIR / f"{name}.jpg"
        thumb.convert("RGB").save(out, quality=88)
        print(f"  -> wrote {out.relative_to(OUT_DIR.parent.parent)}")
        written += 1

    # Abstracts: read each material's UV scale/offset, crop signsMisc_d.
    atlas = textures.get("signsMisc_d")
    if atlas is None:
        print("  ! signsMisc_d atlas not found ~ skipping abstracts")
    else:
        for name in ABSTRACT_MATERIALS:
            mat = materials.get(name)
            if mat is None:
                print(f"  ! missing material for {name}")
                continue
            tile = crop_atlas_tile(atlas, mat["scale"], mat["offset"])
            thumb = make_thumb(tile)
            out = OUT_DIR / f"{name}.jpg"
            thumb.convert("RGB").save(out, quality=88)
            print(f"  -> wrote {out.relative_to(OUT_DIR.parent.parent)}  (uv scale={mat['scale']}, offset={mat['offset']})")
            written += 1

    # Movie poster atlas tiles ~ crop the posterMovie atlas at hardcoded pixel
    # rects derived from each prefab's mesh UVs. Also ship the full atlas so
    # the web composer can use it as the base layer when baking user images.
    poster_atlas = textures.get("posterMovie")
    if poster_atlas is None:
        print("  ! posterMovie atlas not found ~ skipping movie posters")
    else:
        # Ship the full vanilla atlas for the browser composer to load.
        atlas_out = OUT_DIR / "_posterMovie_atlas.png"
        poster_atlas.convert("RGBA").save(atlas_out)
        print(f"  -> wrote {atlas_out.relative_to(OUT_DIR.parent.parent)}  (full atlas, 1024x1024)")
        written += 1
        # Per-slot reference tiles.
        for slot_id, rect in MOVIE_POSTER_TILES.items():
            tile = poster_atlas.crop(rect)
            thumb = make_thumb(tile)
            out = OUT_DIR / f"{slot_id}.jpg"
            thumb.convert("RGB").save(out, quality=88)
            print(f"  -> wrote {out.relative_to(OUT_DIR.parent.parent)}  (atlas tile {rect})")
            written += 1

    # Misc decor: per-slot thumbs, atlas pairs cropped to the half each
    # slot's material samples in vanilla.
    for slot_id, (tex_name, side) in MISC_DECOR_TEXTURES.items():
        tex = textures.get(tex_name)
        if tex is None:
            print(f"  ! missing texture {tex_name} for {slot_id}")
            continue
        cropped = crop_half(tex, side)
        thumb = make_thumb(cropped)
        out = OUT_DIR / f"{slot_id}.jpg"
        thumb.convert("RGB").save(out, quality=88)
        side_note = f" [{side} half]" if side else ""
        print(f"  -> wrote {out.relative_to(OUT_DIR.parent.parent)}  (from {tex_name}{side_note})")
        written += 1

    # Snack posters: crop each tile from snackPosters_d.
    snack_atlas = textures.get("snackPosters_d")
    if snack_atlas is None:
        print("  ! snackPosters_d atlas not found ~ skipping snack posters")
    else:
        for slot_id, rect in SNACK_POSTER_TILES.items():
            tile = snack_atlas.crop(rect)
            thumb = make_thumb(tile)
            out = OUT_DIR / f"{slot_id}.jpg"
            thumb.convert("RGB").save(out, quality=88)
            print(f"  -> wrote {out.relative_to(OUT_DIR.parent.parent)}  (snackPosters_d tile {rect})")
            written += 1

    # Picture frames: standalone textures (each one drives 2-3 vanilla blocks).
    # Top half of each atlas is wood frame border; bottom half has the actual
    # 3-4 picture sub-tiles. Crop to bottom half so the thumb shows what users
    # are actually replacing instead of mostly-wood-texture.
    for slot_id, tex_name in PICTURE_FRAME_TEXTURES.items():
        tex = textures.get(tex_name)
        if tex is None:
            print(f"  ! missing texture {tex_name} for {slot_id}")
            continue
        w, h = tex.size
        # Bottom 45% ~ skips the wood frame/border row at top of each atlas
        # (some atlases have a wider wood-frame row that bleeds into the
        # bottom half).
        cropped = tex.crop((0, int(h * 0.55), w, h))
        thumb = make_thumb(cropped)
        out = OUT_DIR / f"{slot_id}.jpg"
        thumb.convert("RGB").save(out, quality=88)
        print(f"  -> wrote {out.relative_to(OUT_DIR.parent.parent)}  (bottom half of {tex_name})")
        written += 1

    # Picture canvas atlases: ship full atlas + per-tile thumbs so each canvas
    # block becomes its own slot.
    canvas_atlas_imgs = {}
    for material_name, tex_name in CANVAS_ATLAS_SOURCES.items():
        tex = textures.get(tex_name)
        if tex is None:
            print(f"  ! missing canvas atlas {tex_name}")
            continue
        canvas_atlas_imgs[material_name] = tex
        atlas_out = OUT_DIR / f"_{material_name}_atlas.png"
        tex.convert("RGBA").save(atlas_out)
        print(f"  -> wrote {atlas_out.relative_to(OUT_DIR.parent.parent)}  (full atlas, {tex.width}x{tex.height})")
        written += 1
    for slot_id, (material_name, rect) in CANVAS_TILE.items():
        atlas = canvas_atlas_imgs.get(material_name)
        if atlas is None:
            print(f"  ! no atlas for {slot_id}")
            continue
        tile = atlas.crop(rect)
        thumb = make_thumb(tile)
        out = OUT_DIR / f"{slot_id}.jpg"
        thumb.convert("RGB").save(out, quality=88)
        print(f"  -> wrote {out.relative_to(OUT_DIR.parent.parent)}  ({material_name} tile {rect})")
        written += 1

    print(f"\nDone. {written} thumbnails written to {OUT_DIR}.")


if __name__ == "__main__":
    main()
