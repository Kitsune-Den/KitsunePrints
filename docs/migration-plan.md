# §3.4 KitsunePrints — Migration Compatibility Section

> Drafted as an addendum to **Kitsune-Den Mod Compatibility & Migration Plan v1.0**
> (May 2, 2026). To be merged into the main living document under Part 3.
>
> Last updated: 2026-05-02 — KitsunePrints v0.8.2

## Current function

Web-tool-driven custom picture pack creator for 7DTD V2.6. The user uploads
images into 69 vanilla-painting / -poster / -canvas / -picture-frame slots
across 7 categories, and the tool generates a modlet zip containing:

- A shared Harmony DLL (`KitsunePrints.dll`) that runs at `World.LoadWorld`
  postfix, walks `Resources.FindObjectsOfTypeAll<Material>()`, and swaps
  `_MainTex` (and `_BaseMap` for URP) on each matched vanilla material to a
  user-supplied PNG, with UV scale/offset reset to `(1,1)/(0,0)`.
- A `Config/picture_pack.json` mapping vanilla materialName → texture filename.
  The DLL is data-driven — same DLL works for every pack.
- A `Config/blocks.xml` with `kp_<pack>_<vanillaBlock>` definitions extending
  the matching vanilla blocks, plus optional inline `<append>` patches adding
  `CanPickup="true"` to ~100 vanilla decor blocks.
- Per-block icon PNGs under `UIAtlases/ItemIconAtlas/`.
- Composed atlas textures under `Resources/Textures/` (one per filled material:
  per-slot for portraits / abstracts / decor; per-shared-atlas for movie
  posters / canvases / picture frames where multiple slots write tiles).

Currently v0.8.2 with 35 unit tests passing in CI (vitest). DIY kit at full
parity with the web tool — same SLOTS list, same atlas composer, same XML
generators.

> **⚠ Architectural note**
>
> Unlike KitsuneCompanion, KitsunePrints **does not extend any vanilla entity
> class** and does not persist any save data (per-pack state lives in browser
> localStorage; modlet state is purely XML + textures). This significantly
> reduces v3.0/v4.0 risk in the AI / serialization / multiplayer dimensions.
>
> The risk concentration is in **the runtime material swap** and in the
> **vanilla-asset extraction pipeline** (we ship vanilla atlases bundled in
> the DIY kit and pre-derived mesh-UV tile rects in `slots.ts`, both
> version-locked to V2.6).

## §3.4.1 Components at risk

| Component | What could break | Why | Severity |
|---|---|---|---|
| `Material._MainTex` swap | Property name might change under URP/HDRP migration; `SetTexture`/`SetTextureScale`/`SetTextureOffset` API surface could shift | v3.0 may bring render pipeline optimizations; v4.0 likely brings URP/HDRP migration | v3.0 **MEDIUM** / v4.0 **CRITICAL** |
| `Resources.FindObjectsOfTypeAll<Material>()` walk | Materials may move into Addressables groups not loaded at `World.LoadWorld` postfix; could miss materials that were previously in-memory | Addressables system evolution; lazy-loading behavior changes | v3.0 **HIGH** / v4.0 **HIGH** |
| `World.LoadWorld` Harmony postfix target | Method signature or class location may change | World loading pipeline refactor possible in v3.0 | v3.0 **MEDIUM** / v4.0 **HIGH** |
| Vanilla atlas extraction (`scripts/extract_vanilla_refs.py`, `scripts/read_picture_frame_uvs.py`) | Bundle paths shift; UnityPy may struggle with new bundle versions; mesh UV layouts could change between game versions | New POI content + texture re-baking happens regularly | v3.0 **HIGH** / v4.0 **HIGH** |
| Mesh-UV-derived tile rects (baked into `slots.ts` `atlasTile` fields) | If a vanilla atlas is repacked or a prefab's mesh re-exported, our hardcoded tile rects misalign — user's image lands in the wrong region | Atlas re-baking for new content, mesh re-export with different UV layout | v3.0 **HIGH** / v4.0 **HIGH** |
| Bundled vanilla atlases (`public/vanilla/_*_atlas.png`) | Atlases in DIY kit zip are version-locked to V2.6 vanilla content; user packs built on top of v3.0 vanilla atlases would composite over a stale base | Vanilla art re-bake or atlas restructuring | v3.0 **HIGH** / v4.0 **CRITICAL** |
| `<append>` patches on vanilla blocks (`Config/blocks.xml`) | XPath targets `/blocks/block[@name='X']` may not match if a block is renamed, removed, or moved into a different file | New decor categories, removed/deprecated blocks | v3.0 **MEDIUM** / v4.0 **HIGH** |
| `kp_*` block definitions extending vanilla parents | If a vanilla block is renamed or removed, every `kp_<pack>_<vanillaBlock>` extending it fails at registration | New vanilla decor naming, deprecated blocks | v3.0 **MEDIUM** / v4.0 **HIGH** |
| `picture_pack.json` schema | If we ever need new per-material metadata (per-frame tints, per-tile crops), the flat `string→string` dict won't fit | Forward feature growth | v3.0 **LOW** / v4.0 **MEDIUM** |
| 7DTD's `XmlPatcher` filename behavior | Already tripped us once: `pickup.xml` patches were silently ignored; we had to inline into `blocks.xml`. Future filename rules could shift again | XML loader tightening or restructuring | v3.0 **MEDIUM** / v4.0 **MEDIUM** |
| Tests and CI | Existing 35 vitest tests cover the pure helpers; integration-level coverage of the actual modlet zip is thin | Regressions in the build pipeline | v3.0 **LOW** / v4.0 **LOW** |

## §3.4.2 Pre-migration action checklist

### P0 (do now)

- [ ] **Build `IMaterialSwap` adapter in the DLL.** Wrap the per-material `_MainTex` + `_BaseMap` swap behind an interface; default implementation matches today's behavior. Future game-version-specific implementations can be swapped without touching `OnWorldLoaded`'s sweep loop.
- [ ] **Build `IMaterialFinder` adapter in the DLL.** Wrap the `Resources.FindObjectsOfTypeAll<Material>()` call so it can be replaced if Addressables behavior changes.
- [ ] **Document `World.LoadWorld` Harmony patch as the single entry point.** This is our one Harmony patch. Keep it that way.
- [ ] **Pin mesh-UV verification scripts as a CI step.** `read_picture_frame_uvs.py` + `read_movie_poster_uvs.py` already exist; package them so re-running on a new game version is one command. Output a diff against the current `atlasTile` values in `slots.ts`.

### P1 (before v3.0 experimental drops)

- [ ] **Atlas content versioning.** Hash each bundled vanilla atlas at DIY-kit build time, embed the hash in the kit, and have `make_pack.py` warn if the atlas hash doesn't match what its tile rects were derived against.
- [ ] **Schema-version `picture_pack.json`.** Add a `"schemaVersion": 1` field so future formats (e.g., per-tile metadata) can coexist. DLL reads `schemaVersion` and routes to the appropriate parser.
- [ ] **Expand integration test coverage.** Add a vitest test that builds a synthetic modlet end-to-end (with mocked `fetch` for the DLL) and asserts the zip's structure: `ModInfo.xml`, `Config/blocks.xml` containing both kp_* defs and pickup `<append>`s, `Resources/Textures/`, etc. Closes the gap between unit tests and the full pipeline.
- [ ] **Pin the exact V2.6 game-assembly version and bundle re-extraction script** so `extract_vanilla_refs.py` runs deterministically on a fresh checkout.

### P2 (before v4.0 / Future Den Modules build)

- [ ] **Migrate `picture_pack.json` parser away from the hand-rolled tolerant string parser** in `PaintingTextureSwap.cs`. If the game ships a JSON parser in the assembly reference set we can rely on, switch to it. Otherwise, accept Newtonsoft as a soft dependency and document the upgrade path.
- [ ] **Surface a `IConfigProvider` interface** so XML-vs-JSON-vs-YAML config format swaps don't require rewriting the DLL's data layer. (Aligns with `kitsune-den/core` pattern.)
- [ ] **Ensure no per-instance `MaterialPropertyBlock` reliance.** Today the swap is at the shared-Material level (every renderer instance picks up the change). If v4.0 forces per-renderer overrides for any of the picture frame prefabs, we need a fallback path.

## §3.4.3 Testing requirements

### Build-pipeline tests (already in CI, pass before deploy)

- ✅ `npm run test` — 35 vitest tests covering: `sanitizeIdentifier`, `escapeXml`, `pickRecipeKind`, `renderBlockEntry`, `renderRecipeEntry`, `renderPickupAppendRows`, `renderBlocksXml` (with + without pickup section), `renderModInfo`, `isDefaultPackMeta`.
- ✅ `npm run build` — TypeScript compile + Vite production build.

### Pre-migration integration coverage to add

- [ ] **Synthetic modlet build test** — fake `fetch('/reference/KitsunePrints.dll')` with placeholder bytes, fake atlas image loads, run `buildModlet()` against a populated `slots` + `meta`, assert:
  - Zip contains exactly the expected file list (ModInfo, blocks.xml, recipes.xml, Localization.txt, picture_pack.json, per-material textures, per-block icons)
  - `picture_pack.json` keys match all filled slots' `materialName` exactly
  - `blocks.xml` contains both kp_* `<block>` defs AND the pickup `<append>` patches when `enablePickup=true`
  - Atlas materials are written exactly once even if multiple slots target them
- [ ] **Property-based test for `sanitizeIdentifier`** — random strings should always produce output matching `^[A-Za-z0-9_\-]*$`.
- [ ] **Round-trip test for `picture_pack.json` parsing** — write the file via `buildModlet`, parse it via the DLL's tolerant parser (port the JS test version), confirm round-trip equality.

### Manual in-game tests (per release, per game version)

- [ ] Build a pack with at least one slot from each of the 7 categories. Install in a fresh world. Walk through a POI containing all categories. Verify each block renders the user's art.
- [ ] Press E on each vanilla block in PICKUP_BLOCKS while in a fresh POI. Confirm pickup, inventory icon (note: vanilla icons until issue #2 fixed), placeability.
- [ ] Reload the world. Confirm placed blocks persist. (Tests block registration + save round-trip with the Harmony swap active.)
- [ ] Multiplayer parity: install the same pack on dedicated server + 2 clients. Verify all clients see the same custom textures on all paintings/posters.
- [ ] Performance: monitor entity tick / frame time during a 30-minute play session. Material swap is one-shot at world load, so steady-state cost should be zero — confirm.
- [ ] Edge case: install two KitsunePrints packs simultaneously with overlapping slots. Verify last-loaded pack wins on shared materials (documented behavior, but worth a sanity check).

## §3.4.4 Migration scenarios — likely outcomes

| Scenario | Likelihood | Response |
|---|---|---|
| `Material._MainTex` API stable, mesh UVs unchanged, atlases unchanged | LOW (15%) | Best case. Rebuild DIY kit against new game version, ship. |
| Vanilla atlases re-baked (new tiles or shifted layouts) | MEDIUM (40%) | Re-run `extract_vanilla_refs.py` + `read_picture_frame_uvs.py` against new bundles. Update `slots.ts` `atlasTile` fields. Rebuild DIY kit. ~1 day of work. |
| `Resources.FindObjectsOfTypeAll<Material>` no longer surfaces lazy-loaded atlas materials | MEDIUM (30%) | Move to addressable-aware enumeration via `IMaterialFinder`. Possibly defer the swap to a later world-load event. ~3 days. |
| URP/HDRP migration ~ `_MainTex` becomes `_BaseMap`-only or new shader properties | MEDIUM (25%, mostly v4.0) | New `IMaterialSwap` implementation. Already partially defended by today's fallback to `_BaseMap`. ~2 days. |
| Painting prefabs replaced or restructured (e.g., new mesh, new UV layout) | LOW (15%) | Re-derive tile rects from new meshes. Slot definitions may need reordering. ~3-5 days. |
| `World.LoadWorld` deprecated / replaced | LOW (10%) | New Harmony target. Re-test world-load timing for material availability. ~1 day. |

## §3.4.5 Architecture decisions that already align with the doc's guidance

The following recommendations from Part 8 of the main migration plan are
**already in place** for KitsunePrints, listed for cross-reference:

- **Single, minimal Harmony patch** (one `World.LoadWorld` postfix). No transpilers, no broad surface area.
- **JSON-only on the modlet side.** `picture_pack.json` is the only structured data file. No `BinaryFormatter` usage anywhere.
- **Weatherless / quest-less / trader-less / perk-less.** We don't touch any of those subsystems. Zero references in source.
- **Atlas registry pattern** (`ATLAS_SOURCES` in `slots.ts`) — effectively an `IAssetProvider`-shaped dispatch table for shared-atlas materials. Adding a new atlas is one entry.
- **Schema-versioned slot defs** — `slots.ts` is the single source of truth; `make_pack.py` mirrors it; the canonical `materialName` ↔ `vanillaBlocks` mapping is defined exactly once.
- **No per-pack DLL recompile.** Same DLL serves every pack via runtime `picture_pack.json` lookup. The DLL is the migration unit; packs are content.
- **Empirically derived tile coords** — picture frame and movie poster `atlasTile` rects come from `read_picture_frame_uvs.py` / `read_movie_poster_uvs.py` parsing real LOD0 mesh UVs. Re-derivation against a new game version is a one-command operation.
- **CI gates deploys on test pass** (`.github/workflows/deploy.yml` runs `npm run test` before `npm run build`).

## §3.4.6 Hotfix priority (within the suite)

When KitsunePrints breaks alongside other Kitsune-Den mods after a game
update, fix order suggestion:

1. **KitsunePaint Unlocked** — simplest, fastest win, biggest user base.
2. **KitsunePrints** — moderately complex but the failure modes are bounded
   (worst case: vanilla art renders, no custom textures appear ~ no data loss,
   no save corruption). Pack rebuilds are server-side, not client-side, so
   users don't lose anything until they re-download.
3. **KitsuneCompanion** — most complex, highest user attachment, biggest data-
   loss risk.
4. **Future Den Modules** — newest, smallest user base.

## §3.4.7 Quick-reference action map (KitsunePrints-specific)

| # | Action | Priority | Effort |
|---|---|---|---|
| 1 | Build `IMaterialSwap` + `IMaterialFinder` adapters in the DLL | **P0** | 1 day |
| 2 | Pin mesh-UV verification scripts as a CI / docs entry | **P0** | 0.5 day |
| 3 | Hash + version-check bundled vanilla atlases | **P1** | 1 day |
| 4 | Schema-version `picture_pack.json` (additive, backward-compatible) | **P1** | 0.5 day |
| 5 | Synthetic-modlet integration test in vitest | **P1** | 1 day |
| 6 | Replace tolerant JSON parser in DLL with a vetted parser | **P2** | 0.5 day |
| 7 | `IConfigProvider` interface in DLL for future XML/JSON/YAML pivot | **P2** | 1 day |

---

*End of §3.4 KitsunePrints addendum. To be merged into the main living
migration document upon next review cycle.*
