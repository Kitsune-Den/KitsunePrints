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

    targets = set(PORTRAITS) | set(ABSTRACT_MATERIALS) | {"signsMisc_d"}

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

    print(f"\nDone. {written} thumbnails written to {OUT_DIR}.")


if __name__ == "__main__":
    main()
