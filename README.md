# 🐱 KitsunePrints

> **Custom picture pack creator for 7 Days to Die V2.6.**
> [prints.kitsuneden.net](https://prints.kitsuneden.net)

Sister to [KitsunePaint](https://paint.kitsuneden.net). Lets users upload their
own images, drop them into vanilla painting slots (6 backer portraits + 4
abstract scenes), and download a complete modlet zip ready to drop into
`<7DTD>/Mods/`.

## Status

**This repo is a scaffold ~ actual web-tool implementation pending.** The
underlying mod (KitsunePrints, the cat-paintings mod that proved the
architecture) ships at [github.com/Kitsune-Den/KitsunePrints](#) and is
deployed/working in V2.6. The picture-pack architecture below is validated.

## Architecture

The mod side ships a single Harmony DLL (`KitsunePrints.dll`) that runs at
`World.LoadWorld` postfix. It:

1. Reads `Config/picture_pack.json` for a vanilla-material → user-image
   filename map (falls back to bundled defaults if missing).
2. Walks `Resources.FindObjectsOfTypeAll<Material>()`, finds each vanilla
   painting Material by name, and replaces its `_MainTex` with the user's
   image loaded via `Texture2D.LoadImage()`.
3. Resets `_MainTex` UV scale/offset to `(1,1)/(0,0)` so abstract paintings
   (which sample a tile of `signsMisc_d` atlas in vanilla) display the full
   user image instead of a tile crop.

That DLL is **shared infrastructure across every pack.** Per-pack only the
textures + JSON config + ModInfo + blocks/recipes/Localization vary. So this
web tool's job is just to compose the per-pack content.

## V2.6 painting slots the web tool exposes

**1×1 backer portraits** (each their own 512×512 texture; UV layout: left 25% wraps the 3D wood frame mesh, right 75% is the visible canvas, ~3:4 portrait):

| Vanilla Material | Default cat |
|---|---|
| `painting_ben` | boss-cat |
| `painting_lorien` | orange |
| `painting_derek` | tabby-bed |
| `painting_noah` | pounce |
| `painting_duke` | nose |
| `painting_ken` | shark |

**Abstracts** (2×2 + 3×2 sizes share one Material per design; vanilla samples a 30%×32% tile of `signsMisc_d` atlas ~ the DLL's UV reset means user textures fill the canvas in full):

| Vanilla Material | Default cat |
|---|---|
| `paintingsAbstract01` | hearth |
| `paintingsAbstract02` | blood-moon |
| `paintingsAbstract03` | loads-of-loafs |
| `paintingsAbstract04` | butterfly |

## Web tool flow (to build)

1. **Upload** ~ drag and drop one image per slot, OR pick a slot and upload.
2. **Compose** ~ server-side:
   - 1×1 portrait slots: paste user image into right 75% of a 1024×1024
     canvas, fill left 256 px with user-picked wood/frame color.
   - Abstract slots: resize/center user image to 1024×1024 square (or any
     reasonable aspect ~ DLL's UV reset means the engine fills the canvas
     face whatever happens).
3. **Preview** ~ show what the painting will look like in-frame, using
     [`vanilla_painting_ben.png`](#) as a reference for portrait UV.
4. **Pack metadata** ~ name, author, description, version.
5. **Download** ~ zip with this layout:
   ```
   <PackName>/
     ModInfo.xml
     KitsunePrints.dll              (shared, bundled in tool's static assets)
     Config/
       picture_pack.json            (vanilla-material → user-image map)
       blocks.xml                   (additive paintingCat* blocks if pack opts in)
       recipes.xml
       Localization.txt
     Resources/
       Textures/                    (user-uploaded + composed images)
     UIAtlases/
       ItemIconAtlas/               (auto-generated 160×160 icons cropped from canvas zone)
   ```

## Stack (mirrors KitsunePaint)

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- JSZip (modlet packaging)
- Express + multer for any backend file handling

## Reference assets needed

(See `public/reference/` once populated)
- `vanilla_painting_ben.png` ~ UV layout reference for 1×1 composer
- `vanilla_signsMisc_d_atlas.png` ~ for abstract aspect reference
- `KitsunePrints.dll` ~ shared runtime bundle (current build at
  `C:\Users\darab\IdeaProjects\KitsunePrints\KitsunePrints\KitsunePrints.dll`)

## Canonical knowledge

All deep technical findings live in the obsidian vault:
`<obsidian>/7d2d-modding/bundle-building.md`. Read that before debugging
asset bundle issues ~ there are several confirmed dead ends documented (UnityPy
prefab cloning, path_id remap), and one confirmed-working pattern (the
Harmony swap this tool builds on).
