"""
One-off scanner: walk every bundle in a 7DTD V2.6 install and list any
Material whose name looks like wall art (posters, signs, hidden-safe
variants, misc decals). Prints the material name, its bundle, its main
texture, and any UV scale/offset so we can tell at a glance which
materials sample atlases vs. dedicated textures.

Usage:
    python scripts/scan_vanilla_wall_art.py "F:/SteamLibrary/steamapps/common/7 Days To Die"
"""
import sys
from pathlib import Path
import UnityPy

# Heuristics for wall-art material names. Wide net on purpose ~ we're hunting.
INTEREST_PATTERNS = [
    "poster",
    "painting",       # already known but include for completeness
    "sign",           # signs, signsMisc, signMisc, store signs, etc.
    "decal",
    "graffiti",
    "wallpaper",
    "billboard",
    "framedphoto",
    "hiddensafe",
    "wallSafe",
    "oldPhoto",
    "wallPhoto",
    "moviePoster",
    "magazine",
    "newspaper",
]


def matches(name: str) -> bool:
    n = name.lower()
    return any(p.lower() in n for p in INTEREST_PATTERNS)


def main():
    if len(sys.argv) < 2:
        print("Usage: python scan_vanilla_wall_art.py <7DTD install root>")
        sys.exit(1)

    game_root = Path(sys.argv[1])
    if not game_root.exists():
        print(f"Game root not found: {game_root}")
        sys.exit(1)

    seen = {}  # name -> (bundle_name, tex_name, scale, offset)

    for sub in ("Data/Addressables", "Data/Bundles"):
        root = game_root / sub
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            try:
                env = UnityPy.load(str(path))
            except Exception:
                continue

            for obj in env.objects:
                try:
                    if obj.type.name != "Material":
                        continue
                    data = obj.read()
                    name = getattr(data, "m_Name", None) or getattr(data, "name", "")
                    if not name or not matches(name):
                        continue
                    if name in seen:
                        continue

                    # Walk SavedProperties.m_TexEnvs for _MainTex.
                    saved = getattr(data, "m_SavedProperties", None)
                    tex_name = ""
                    scale = (1.0, 1.0)
                    offset = (0.0, 0.0)
                    if saved is not None:
                        for entry in getattr(saved, "m_TexEnvs", None) or []:
                            try:
                                key = entry[0] if isinstance(entry, tuple) else entry.first
                                val = entry[1] if isinstance(entry, tuple) else entry.second
                            except Exception:
                                continue
                            if str(key) != "_MainTex":
                                continue
                            tex_ref = getattr(val, "m_Texture", None)
                            if tex_ref is not None:
                                try:
                                    tex_obj = tex_ref.read()
                                    tex_name = (
                                        getattr(tex_obj, "m_Name", "")
                                        or getattr(tex_obj, "name", "")
                                    )
                                except Exception:
                                    pass
                            s = getattr(val, "m_Scale", None)
                            o = getattr(val, "m_Offset", None)
                            scale = (
                                getattr(s, "x", 1.0) if s else 1.0,
                                getattr(s, "y", 1.0) if s else 1.0,
                            )
                            offset = (
                                getattr(o, "x", 0.0) if o else 0.0,
                                getattr(o, "y", 0.0) if o else 0.0,
                            )
                            break

                    seen[name] = (path.name, tex_name, scale, offset)
                except Exception:
                    continue

    if not seen:
        print("(nothing matched)")
        return

    # Sort by name for deterministic output, group by category prefix.
    for name in sorted(seen.keys()):
        bundle, tex, scale, offset = seen[name]
        atlas_hint = ""
        if (round(scale[0], 2), round(scale[1], 2)) != (1.0, 1.0) or (
            round(offset[0], 2),
            round(offset[1], 2),
        ) != (0.0, 0.0):
            atlas_hint = f"  [ATLAS scale=({scale[0]:.2f},{scale[1]:.2f}) offset=({offset[0]:.2f},{offset[1]:.2f})]"
        print(f"  {name:38}  tex={tex:30}  bundle={bundle}{atlas_hint}")

    print(f"\nTotal: {len(seen)} matching materials")


if __name__ == "__main__":
    main()
