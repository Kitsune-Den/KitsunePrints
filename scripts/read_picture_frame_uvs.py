"""
Find the actual front-face UV quad for each pictureFrame_01<letter> and
pictureCanvas_01<letter> prefab. Strategy: for each LOD0 mesh, parse the
OBJ export to get vertex positions, normals, and UVs grouped by vertex.
Filter to vertices whose normal points "outward" (the picture-facing
direction), then take the bounding box of those vertices' UVs ~ that's
the front-face tile.

Outputs Python dicts ready to paste into extract_vanilla_refs.py and slots.ts.
"""
from pathlib import Path
import UnityPy
import re

GAME_ROOT = Path('F:/SteamLibrary/steamapps/common/7 Days To Die')

PICTURE_FRAME_PREFABS = [f'pictureFrame_01{l}Prefab' for l in 'abcdefghijklmnopqrstuvw']
PICTURE_CANVAS_PREFABS = [f'pictureCanvas_01{l}Prefab' for l in 'abcdefghij']
ALL_PREFABS = PICTURE_FRAME_PREFABS + PICTURE_CANVAS_PREFABS


def walk(go, d=0, m=10):
    if d > m: return
    yield go
    comps = getattr(go, 'm_Components', None) or getattr(go, 'm_Component', None) or []
    for c in comps:
        try:
            cref = c[1] if isinstance(c, tuple) else getattr(c, 'component', None) or c
            cobj = cref.read() if hasattr(cref, 'read') else None
            if cobj is None or type(cobj).__name__ != 'Transform':
                continue
            for ch in getattr(cobj, 'm_Children', None) or []:
                try:
                    ct = ch.read()
                    cgo_ref = getattr(ct, 'm_GameObject', None)
                    if cgo_ref:
                        yield from walk(cgo_ref.read(), d + 1, m)
                except Exception: pass
            return
        except Exception: pass


def get_lod0_mesh(prefab_go):
    candidates = []
    for go in walk(prefab_go):
        name = getattr(go, 'm_Name', '') or ''
        if 'LOD0' not in name.upper():
            continue
        comps = getattr(go, 'm_Components', None) or getattr(go, 'm_Component', None) or []
        for c in comps:
            try:
                cref = c[1] if isinstance(c, tuple) else getattr(c, 'component', None) or c
                cobj = cref.read() if hasattr(cref, 'read') else None
                if cobj is None or type(cobj).__name__ != 'MeshFilter':
                    continue
                mref = getattr(cobj, 'm_Mesh', None)
                if mref:
                    candidates.append(mref.read())
            except Exception: pass
    return candidates[0] if candidates else None


def parse_obj_vertices(obj_data: str):
    """Parse `v`, `vn`, `vt`, `f` lines. OBJ uses 1-based indexing.
    Returns (verts, normals, uvs, faces) where faces is list of [(v_idx, vt_idx, vn_idx), ...]."""
    verts, normals, uvs, faces = [], [], [], []
    for line in obj_data.splitlines():
        parts = line.split()
        if not parts: continue
        if parts[0] == 'v' and len(parts) >= 4:
            verts.append((float(parts[1]), float(parts[2]), float(parts[3])))
        elif parts[0] == 'vn' and len(parts) >= 4:
            normals.append((float(parts[1]), float(parts[2]), float(parts[3])))
        elif parts[0] == 'vt' and len(parts) >= 3:
            uvs.append((float(parts[1]), float(parts[2])))
        elif parts[0] == 'f' and len(parts) >= 4:
            face = []
            for token in parts[1:]:
                # token is "v/vt/vn" or "v//vn" etc.
                pieces = token.split('/')
                vi = int(pieces[0]) - 1 if pieces[0] else -1
                ti = int(pieces[1]) - 1 if len(pieces) > 1 and pieces[1] else -1
                ni = int(pieces[2]) - 1 if len(pieces) > 2 and pieces[2] else -1
                face.append((vi, ti, ni))
            faces.append(face)
    return verts, normals, uvs, faces


def compute_front_face_tile(mesh, atlas_w: int, atlas_h: int):
    """Find the largest face whose normal points outward (front-facing) and
    return the bounding box of its UVs in PIL pixel coords."""
    obj_data = mesh.export()
    if isinstance(obj_data, bytes):
        obj_data = obj_data.decode('utf-8', errors='ignore')
    verts, normals, uvs, faces = parse_obj_vertices(obj_data)

    if not faces or not uvs:
        return None

    # For each face, gather UVs and the average normal direction. We want
    # the dominant outward direction (most picture-frame prefabs face along
    # one specific axis, typically +Z or -Z in Unity's coordinate system,
    # but the prefab might be rotated). Strategy: find the axis with the
    # most "extreme" normal magnitude across all faces, then pick faces
    # pointing that way.
    face_data = []  # (avg_normal, area_proxy, [uv_indices])
    for face in faces:
        uv_indices = [t for v, t, n in face if t >= 0 and t < len(uvs)]
        normal_indices = [n for v, t, n in face if n >= 0 and n < len(normals)]
        if not uv_indices:
            continue
        # Average normal of the face
        if normal_indices:
            ax = sum(normals[n][0] for n in normal_indices) / len(normal_indices)
            ay = sum(normals[n][1] for n in normal_indices) / len(normal_indices)
            az = sum(normals[n][2] for n in normal_indices) / len(normal_indices)
        else:
            ax = ay = az = 0
        # UV bbox area as proxy for face size in texture space
        face_uvs = [uvs[t] for t in uv_indices]
        umin = min(u for u, v in face_uvs)
        umax = max(u for u, v in face_uvs)
        vmin = min(v for u, v in face_uvs)
        vmax = max(v for u, v in face_uvs)
        area = max(0, umax - umin) * max(0, vmax - vmin)
        face_data.append(((ax, ay, az), area, face_uvs, (umin, vmin, umax, vmax)))

    if not face_data:
        return None

    # Find dominant outward-facing normal axis
    # Sum signed normal contributions to find the majority direction
    sum_x = sum(n[0] for n, _, _, _ in face_data)
    sum_y = sum(n[1] for n, _, _, _ in face_data)
    sum_z = sum(n[2] for n, _, _, _ in face_data)
    axis_idx = max(range(3), key=lambda i: abs((sum_x, sum_y, sum_z)[i]))
    axis_sign = 1 if (sum_x, sum_y, sum_z)[axis_idx] > 0 else -1

    # Pick faces aligned with the dominant outward direction (dot product > 0.7)
    front_faces = []
    for (n, area, face_uvs, bbox) in face_data:
        dot = n[axis_idx] * axis_sign
        if dot > 0.7:
            front_faces.append((area, bbox, face_uvs))

    if not front_faces:
        return None

    # Among front-facing faces, find the one with biggest UV bbox area
    # (the picture region is the largest contiguous front-facing surface)
    front_faces.sort(key=lambda x: x[0], reverse=True)
    _, bbox, _ = front_faces[0]
    umin, vmin, umax, vmax = bbox

    # Convert UV (bottom-up) to PIL pixel coords (top-down)
    L = round(umin * atlas_w)
    R = round(umax * atlas_w)
    T = round((1 - vmax) * atlas_h)
    B = round((1 - vmin) * atlas_h)
    return (L, T, R, B)


# Index prefabs
prefabs = {}
for sub in ('Data/Addressables', 'Data/Bundles'):
    root = GAME_ROOT / sub
    if not root.exists(): continue
    for path in root.rglob('*'):
        if not path.is_file(): continue
        try:
            env = UnityPy.load(str(path))
        except Exception: continue
        for obj in env.objects:
            try:
                if obj.type.name != 'GameObject': continue
                d = obj.read()
                n = getattr(d, 'm_Name', '') or ''
                if n in ALL_PREFABS and n not in prefabs:
                    prefabs[n] = (d, path.name)
            except Exception: pass

print(f'Found {len(prefabs)}/{len(ALL_PREFABS)} prefabs')

# Atlases are all 2048x2048
W = H = 2048

# Output for picture frames
print('\n--- PICTURE_FRAME_TILE (paste into slots.ts atlasTile fields) ---')
for letter in 'abcdefghijklmnopqrstuvw':
    pn = f'pictureFrame_01{letter}Prefab'
    if pn not in prefabs:
        print(f'  {letter}: missing')
        continue
    go, _ = prefabs[pn]
    mesh = get_lod0_mesh(go)
    if not mesh:
        print(f'  {letter}: no mesh')
        continue
    rect = compute_front_face_tile(mesh, W, H)
    if not rect:
        print(f'  {letter}: no front face')
        continue
    L, T, R, B = rect
    print(f"  pictureFrame_01{letter}: rect=(L={L}, T={T}, R={R}, B={B})  size={R-L}x{B-T}")

print('\n--- CANVAS_TILE (paste into slots.ts atlasTile fields) ---')
for letter in 'abcdefghij':
    pn = f'pictureCanvas_01{letter}Prefab'
    if pn not in prefabs:
        print(f'  {letter}: missing')
        continue
    go, _ = prefabs[pn]
    mesh = get_lod0_mesh(go)
    if not mesh:
        print(f'  {letter}: no mesh')
        continue
    rect = compute_front_face_tile(mesh, W, H)
    if not rect:
        print(f'  {letter}: no front face')
        continue
    L, T, R, B = rect
    print(f"  pictureCanvas_01{letter}: rect=(L={L}, T={T}, R={R}, B={B})  size={R-L}x{B-T}")
