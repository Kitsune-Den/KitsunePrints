# Handoff for the next Claude Code session

This repo is **only scaffolded** ~ README + reference assets staged, no
package.json, no app code yet. Pick up in a fresh Claude session here for the
actual web-tool build (the prior session was deep in 7D2D mod debugging and
shipped the underlying KitsunePrints mod).

## What's done

- Mod side: `KitsunePrints.dll` ships and works in V2.6 (replaces vanilla
  painting Materials' `_MainTex` at runtime with user textures, UV reset for
  abstracts).
- Mod side: DLL is **config-driven** ~ reads `Config/picture_pack.json` for
  the texture map, falls back to defaults if missing. Same DLL serves every
  pack a user creates with this web tool.
- Reference assets staged at [`public/reference/`](public/reference/):
  - `vanilla_painting_ben.png` ~ UV layout reference (1×1 portraits use
    left-25%-wood / right-75%-canvas split ~ see `GUIDE_uv_zones_painting_1x1.png`).
  - `vanilla_signsMisc_d_atlas.png` ~ vanilla atlas for abstract paintings
    (DLL's UV reset means user textures don't need to match this layout).
  - `KitsunePrints.dll` ~ current build, gets bundled into every downloaded
    pack zip.

## Next session, suggested first moves

1. `cd C:\Users\darab\WebstormProjects\KitsunePrints`
2. Bootstrap the Vite + React 19 + TS + Tailwind 4 project (mirror
   KitsunePaint's `package.json` and `vite.config.ts`).
3. Copy KitsunePaint's `App.tsx` shell + `pages/LandingPage.tsx` as a starting
   skeleton ~ same hero pattern, just retargeted.
4. Build the slot-based upload UI (10 slots: 6 portraits + 4 abstracts).
5. Server-side composer for portrait UV layout (Express + multer + sharp/jimp
   for the wood-zone composition).
6. Modlet zip generation (JSZip) ~ mirrors KitsunePaint's `buildModlet.ts`
   pattern but adds the DLL static asset and `picture_pack.json`.

## Mod-side state for reference

- Working source: `C:\Users\darab\IdeaProjects\KitsunePrints\KitsunePrints\`
- Test deploys: `F:\7D2D\Custom\TestingDen\Mods\KitsunePrints\` (client),
  `\\wsl.localhost\Ubuntu\home\ada\7d2d-server\Mods\KitsunePrints\` (server)
- All 10 cat textures composed properly, all 14 blocks render correctly,
  all 14 recipes work, all 10 creative-menu icons appear.

## Open polish item from prior session

- 2×2 abstract paintings show wide cat textures with horizontal squish
  (shared Material with 3×2). To fix per-instance variety, add
  MaterialPropertyBlock per block instance ~ not blocking, scoped as v2.

## Screenshot placeholders for the UI

User asked for SS placeholders. Suggested approach for the new session: drop
some `.png` placeholders into `public/screenshots/` with simple labels like
`screenshot-upload-flow.png`, `screenshot-preview.png`, etc. (gray rectangles
with text). Real screenshots get swapped in once the tool is functional.

## Canonical knowledge

The obsidian vault file
`C:\Users\darab\iCloudDrive\skulk-shared\obsidian-vault\7d2d-modding\bundle-building.md`
has the full architecture write-up ~ UV layouts, atlas tile sampling, the
working Harmony pattern, and the confirmed dead ends (UnityPy prefab cloning,
path_id remap). Read that before any deep debugging in the new session.
