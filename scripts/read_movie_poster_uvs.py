"""
Walk the 4 movie poster prefabs (and their theater siblings) in commercial.bundle,
find the MeshFilter on each, read the mesh UV coords, and report the bounding
box of UV channel 0 for each prefab.

The bounding box gives us exactly which tile of posterMovie.png each prefab samples.
"""
from pathlib import Path
import UnityPy

BUNDLE = Path('F:/SteamLibrary/steamapps/common/7 Days To Die/Data/Addressables/Standalone/automatic_assets_entities/commercial.bundle')

TARGETS = [
    'posterMovieLoneWolfPrefab',
    'posterMovieMammasJusticePrefab',
    'posterMovieSexualTensionPrefab',
    'posterMovie2159Prefab',
    'posterMovieTheaterLoneWolfPrefab',
    'posterMovieTheaterMammasJusticePrefab',
    'posterMovieTheaterSexualTensionPrefab',
    'posterMovieTheater2159Prefab',
]


def walk_children(go, env, depth=0, max_depth=8):
    """Yield every descendent GameObject under `go` via Transform tree."""
    if depth > max_depth:
        return
    yield go
    # Find Transform component on this GameObject
    comps = getattr(go, 'm_Components', None) or getattr(go, 'm_Component', None) or []
    for c in comps:
        try:
            cref = c[1] if isinstance(c, tuple) else getattr(c, 'component', None) or c
            cobj = cref.read() if hasattr(cref, 'read') else None
            if cobj is None:
                continue
            if type(cobj).__name__ != 'Transform':
                continue
            children = getattr(cobj, 'm_Children', None) or []
            for child_ref in children:
                try:
                    child_t = child_ref.read()
                    child_go_ref = getattr(child_t, 'm_GameObject', None)
                    if child_go_ref is None:
                        continue
                    child_go = child_go_ref.read()
                    yield from walk_children(child_go, env, depth + 1, max_depth)
                except Exception:
                    pass
            return
        except Exception:
            pass


def find_mesh_in_prefab(root_go, env):
    """Walk descendants and return (mesh, gameobject_name) for the first MeshFilter found."""
    for go in walk_children(root_go, env):
        comps = getattr(go, 'm_Components', None) or getattr(go, 'm_Component', None) or []
        for c in comps:
            try:
                cref = c[1] if isinstance(c, tuple) else getattr(c, 'component', None) or c
                cobj = cref.read() if hasattr(cref, 'read') else None
                if cobj is None:
                    continue
                if type(cobj).__name__ != 'MeshFilter':
                    continue
                mesh_ref = getattr(cobj, 'm_Mesh', None)
                if mesh_ref is None:
                    continue
                mesh = mesh_ref.read()
                go_name = getattr(go, 'm_Name', '') or ''
                yield mesh, go_name
            except Exception:
                pass


def uv_bbox_from_mesh(mesh):
    """Try multiple ways to extract UVs from a mesh and return (u_min, v_min, u_max, v_max)."""
    # UnityPy Mesh exposes m_UV0 / m_UV1 / etc. on parsed meshes
    for attr in ('m_UV', 'm_UV0', 'm_UV1'):
        uvs = getattr(mesh, attr, None)
        if uvs:
            u = [p[0] for p in uvs]
            v = [p[1] for p in uvs]
            return min(u), min(v), max(u), max(v)

    # Fallback: parse via export (OBJ) and grep "vt" lines
    try:
        obj_data = mesh.export()
        if isinstance(obj_data, bytes):
            obj_data = obj_data.decode('utf-8', errors='ignore')
        u = []
        v = []
        for line in obj_data.splitlines():
            if line.startswith('vt '):
                parts = line.split()
                if len(parts) >= 3:
                    try:
                        u.append(float(parts[1]))
                        v.append(float(parts[2]))
                    except ValueError:
                        pass
        if u and v:
            return min(u), min(v), max(u), max(v)
    except Exception as e:
        print(f'    export error: {e}')

    return None


def main():
    env = UnityPy.load(str(BUNDLE))

    # Index GameObjects by name
    by_name = {}
    for obj in env.objects:
        try:
            if obj.type.name != 'GameObject':
                continue
            data = obj.read()
            name = getattr(data, 'm_Name', '') or ''
            if name in TARGETS:
                by_name[name] = data
        except Exception:
            pass

    print(f'Found {len(by_name)}/{len(TARGETS)} target prefabs')

    for prefab_name in TARGETS:
        go = by_name.get(prefab_name)
        if go is None:
            print(f'\n{prefab_name}: NOT FOUND')
            continue
        print(f'\n{prefab_name}:')
        any_mesh = False
        for mesh, child_name in find_mesh_in_prefab(go, env):
            any_mesh = True
            mesh_name = getattr(mesh, 'm_Name', '') or '?'
            bbox = uv_bbox_from_mesh(mesh)
            print(f'  child={child_name:30}  mesh={mesh_name:30}  uv_bbox={bbox}')
        if not any_mesh:
            print('  (no MeshFilter found)')


if __name__ == '__main__':
    main()
