"""
Walk the 17 snack poster prefabs, find each LOD0 MeshFilter, read mesh UVs,
report the front-face bounding box. Same pattern as read_movie_poster_uvs.py,
just 17 prefabs instead of 8.

The snackPosters_d atlas is the shared texture. Each prefab samples its own
tile via mesh UVs. Bounding box of the in-[0,1] UVs gives the tile rect.
"""
from pathlib import Path
import UnityPy

GAME_ROOT = Path('F:/SteamLibrary/steamapps/common/7 Days To Die')

PREFAB_NAMES = [
    'snackPosterAtomPrefab',
    'snackPosterBretzelsPrefab',
    'snackPosterEyeCandyPrefab',
    'snackPosterFortBitesPrefab',
    'snackPosterGoblinOPrefab',
    'snackPosterHackersPrefab',
    'snackPosterHealthPrefab',
    'snackPosterJailBreakersPrefab',
    'snackPosterJerkyPrefab',
    'snackPosterNachosPrefab',
    'snackPosterNachosRanchPrefab',
    'snackPosterNerdPrefab',
    'snackPosterOopsPrefab',
    'snackPosterOopsClassicPrefab',
    'snackPosterPrimePrefab',
    'snackPosterRamenPrefab',
    'snackPosterSkullCrusherPrefab',
]


def walk(go, d=0, m=8):
    if d > m: return
    yield go
    comps = getattr(go, 'm_Components', None) or getattr(go, 'm_Component', None) or []
    for c in comps:
        try:
            cref = c[1] if isinstance(c, tuple) else getattr(c, 'component', None) or c
            cobj = cref.read() if hasattr(cref, 'read') else None
            if cobj is None or type(cobj).__name__ != 'Transform': continue
            for ch in getattr(cobj, 'm_Children', None) or []:
                try:
                    ct = ch.read()
                    cgo_ref = getattr(ct, 'm_GameObject', None)
                    if cgo_ref:
                        yield from walk(cgo_ref.read(), d+1, m)
                except Exception: pass
            return
        except Exception: pass


def get_lod0_mesh(prefab_go):
    """Find the highest-LOD MeshFilter. Match either bare 'LOD0' or any name
    containing 'LOD0' (e.g. 'gunBlueprints_LOD0' for snack/sign posters that
    reuse blueprint meshes)."""
    candidates = []
    for go in walk(prefab_go):
        name = (getattr(go, 'm_Name', '') or '')
        if 'LOD0' not in name.upper():
            continue
        comps = getattr(go, 'm_Components', None) or getattr(go, 'm_Component', None) or []
        for c in comps:
            try:
                cref = c[1] if isinstance(c, tuple) else getattr(c, 'component', None) or c
                cobj = cref.read() if hasattr(cref, 'read') else None
                if cobj is None or type(cobj).__name__ != 'MeshFilter': continue
                mref = getattr(cobj, 'm_Mesh', None)
                if mref:
                    candidates.append(mref.read())
            except Exception: pass
    return candidates[0] if candidates else None


def front_face_bbox(mesh):
    obj_data = mesh.export()
    if isinstance(obj_data, bytes):
        obj_data = obj_data.decode('utf-8', errors='ignore')
    in_range = []
    for line in obj_data.splitlines():
        if line.startswith('vt '):
            parts = line.split()
            try:
                u = round(float(parts[1]), 4)
                v = round(float(parts[2]), 4)
                if 0 <= u <= 1 and 0 <= v <= 1:
                    in_range.append((u, v))
            except (ValueError, IndexError): pass
    if not in_range:
        return None
    unique = sorted(set(in_range))
    u_vals = sorted(set(p[0] for p in unique))
    v_vals = sorted(set(p[1] for p in unique))
    if len(u_vals) < 2 or len(v_vals) < 2:
        return None
    # Take outer bounds of in-range UVs as the bbox.
    return (u_vals[0], v_vals[0], u_vals[-1], v_vals[-1])


def find_atlas_size(env):
    """Locate the snackPosters_d Texture2D and return (w, h)."""
    for obj in env.objects:
        try:
            if obj.type.name != 'Texture2D':
                continue
            d = obj.read()
            n = getattr(d, 'm_Name', '') or ''
            if n == 'snackPosters_d':
                return getattr(d, 'm_Width', 0), getattr(d, 'm_Height', 0)
        except Exception:
            pass
    return None


# Find prefabs by scanning all bundles
prefabs = {}
atlas_size = None
print('Scanning bundles...')
for sub in ('Data/Addressables', 'Data/Bundles'):
    root = GAME_ROOT / sub
    if not root.exists():
        continue
    for path in root.rglob('*'):
        if not path.is_file(): continue
        try:
            env = UnityPy.load(str(path))
        except Exception:
            continue
        # Check for atlas in this bundle
        if atlas_size is None:
            sz = find_atlas_size(env)
            if sz:
                atlas_size = sz
                print(f'snackPosters_d atlas: {sz[0]}x{sz[1]}  (bundle={path.name})')
        # Look for prefabs
        for obj in env.objects:
            try:
                if obj.type.name != 'GameObject': continue
                d = obj.read()
                n = getattr(d, 'm_Name', '') or ''
                if n in PREFAB_NAMES and n not in prefabs:
                    prefabs[n] = (d, path.name)
            except Exception: pass

print(f'\nFound {len(prefabs)}/{len(PREFAB_NAMES)} prefabs')
print(f'\n{"prefab":40} {"u_min":>7} {"v_min":>7} {"u_max":>7} {"v_max":>7}  PIL(L,T,R,B)         size')

ATLAS_W, ATLAS_H = atlas_size if atlas_size else (1024, 1024)
results = []
for name in PREFAB_NAMES:
    if name not in prefabs:
        print(f'{name}: missing')
        continue
    go, _ = prefabs[name]
    mesh = get_lod0_mesh(go)
    if not mesh:
        print(f'{name}: no LOD0 mesh')
        continue
    bbox = front_face_bbox(mesh)
    if not bbox:
        print(f'{name}: no in-range UVs')
        continue
    u_min, v_min, u_max, v_max = bbox
    L = round(u_min * ATLAS_W)
    R = round(u_max * ATLAS_W)
    T = round((1 - v_max) * ATLAS_H)
    B = round((1 - v_min) * ATLAS_H)
    print(f'{name:40} {u_min:7.4f} {v_min:7.4f} {u_max:7.4f} {v_max:7.4f}  ({L},{T},{R},{B})  {R-L}x{B-T}')
    # slot_id is the block name (signSnackPoster*) which is the prefab name minus 'Prefab' + sign prefix
    short = name.replace('Prefab', '')
    slot_id = 'sign' + short[0].upper() + short[1:]  # snackPosterAtom -> SnackPosterAtom -> signSnackPosterAtom
    results.append((slot_id, (L, T, R, B)))

print(f'\n# Atlas size: {ATLAS_W}x{ATLAS_H}')
print('# Tile rects (slot_id, (L, T, R, B)):')
for slot_id, rect in results:
    print(f'  {slot_id!r}: {rect},')
