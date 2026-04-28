<p align="center">
  <a href="https://prints.kitsuneden.net">
    <img src="public/social-print.png" alt="KitsunePrints ~ replaces every painting" width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://prints.kitsuneden.net"><img src="https://img.shields.io/badge/Live-prints.kitsuneden.net-fb923c?style=for-the-badge" alt="Live site" /></a>
  <a href="https://prints.kitsuneden.net/app"><img src="https://img.shields.io/badge/Build_a_Pack-Web_Tool-zinc?style=for-the-badge&color=18181b" alt="Web tool" /></a>
  <a href="https://prints.kitsuneden.net/KitsunePrints-DIY-Kit.zip"><img src="https://img.shields.io/badge/DIY_Kit-Offline-zinc?style=for-the-badge&color=27272a" alt="DIY kit download" /></a>
  <a href="https://paint.kitsuneden.net"><img src="https://img.shields.io/badge/Sister_Tool-KitsunePaint-zinc?style=for-the-badge&color=27272a" alt="KitsunePaint" /></a>
</p>

# 🐱 KitsunePrints

A web-based custom picture pack creator for **7 Days to Die V2.6**. Upload your art, drop it into vanilla painting slots, download a ready-to-install modlet. Every painting in every POI now wears your art ~ no Unity, no asset bundles, no prefab hacks. A Harmony runtime swap does the heavy lifting at world load.

## What it does

1. **Upload** ~ drop one image per slot (6 1×1 backer portraits + 4 abstract designs that drive both 2×2 and 3×2 frame sizes).
2. **Crop** ~ aspect-locked crop frame matched per slot (3:4 portrait or 1:1 square). Drag, zoom, position the subject.
3. **Frame texture** ~ pick from six presets per portrait (dark/light wood, gold gilt, silver, matte black, ornate gold). The composer paints the chosen frame texture into the UV zone that wraps vanilla's 3D wooden frame mesh.
4. **Title each painting** ~ shows up as `Print: <your title>` in the creative menu, searchable under "print" or any keyword.
5. **Download** ~ a complete modlet zip with the shared `KitsunePrints.dll`, composed textures, generated `blocks.xml` / `recipes.xml` / `Localization.txt`, ItemIcons, and a `picture_pack.json` map. Drop into `<7DTD>/Mods/`, restart, done.

## How it works

The included **`KitsunePrints.dll`** is a Harmony patch that runs at `World.LoadWorld` postfix. At runtime it:

1. Reads `Config/picture_pack.json` for a vanilla-material → user-image map.
2. Walks `Resources.FindObjectsOfTypeAll<Material>()`, finds each vanilla painting Material by name (`painting_ben`, `paintingsAbstract01`, etc.), and replaces its `_MainTex` with the user's image loaded via `Texture2D.LoadImage()`.
3. Resets `_MainTex` UV scale/offset to `(1,1)/(0,0)` so abstract paintings (which sample a tile of `signsMisc_d` atlas in vanilla) display the full user image instead of a tile crop.

This is **shared infrastructure across every pack** ~ per-pack only the textures + JSON config + ModInfo + generated XMLs vary. The same DLL works for every pack created by the tool.

## DIY / offline

If you'd rather skip the web tool, grab [`KitsunePrints-DIY-Kit.zip`](https://prints.kitsuneden.net/KitsunePrints-DIY-Kit.zip) ~ Python script + DLL + frame textures + example config. `pip install Pillow`, edit a JSON, drop your images, run `python make_pack.py example_pack/`, get a modlet out. See [`scripts/README.md`](scripts/README.md).

## Coming soon

The same Harmony Material-swap pattern works on **any** vanilla material the engine loads ~ not just paintings. Planned slot expansions:

- 🪧 **Signs** ~ For Sale, Quarantine, Beware of the Dog, etc. (already share the `signsMisc_d` atlas the abstracts sample from, so the plumbing is mostly there)
- 📜 **Posters & wall art** ~ Pyro Paints, Crazy Cats, Mom Reads, Diesel Fat Cat, etc.
- 🖼️ **Hidden-safe variants** ~ the wall-safe disguises that look like paintings already inherit our swap; explicit slots would let users theme them too
- 🪪 **Trader and POI signage** ~ shop signs, gas station signs, billboards
- 🪟 **Wallpaper / floor tiles** ~ much further out, but the same Material-swap pattern works in principle

The slot list is data-driven (`src/types/slots.ts`), so adding a new slot to the web tool is mostly: identify the vanilla Material name + describe its UV layout. The DLL doesn't need to change.

If a specific block or sign you'd love to skin isn't in the slot list, [open an issue](https://github.com/Kitsune-Den/KitsunePrints/issues) with its name and we'll see if it's swap-friendly.

## Dependencies

- 7 Days to Die V2.6 (vanilla material naming and atlas layout we patch are version-specific)
- EAC must be disabled (any DLL-shipping mod requires this)
- No third-party mod dependencies ~ the Harmony patch is self-contained

## Tech stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- JSZip + react-easy-crop (client-side composition + zip generation, no server-side image processing)
- Express (serves the static build + small build-counter API)
- Harmony (C# DLL patch ~ source in the [KitsunePrints mod repo](https://github.com/Kitsune-Den/KitsunePrints))

## Project structure

```
src/
  pages/                 # IntroPage, BuilderPage, TermsPage
  components/            # SlotCard, FramePresetPicker, CropDialog, PackMetaForm, DownloadButton
  utils/                 # buildModlet.ts, composer.ts
  types/slots.ts         # SLOTS list + FRAME_PRESETS
public/
  reference/             # KitsunePrints.dll (bundled into every downloaded pack)
  frames/                # 6 frame texture presets, 256×1024 each
  screenshots/           # in-POI hero + tool screenshots
  social-print.png       # OG / Twitter card
scripts/
  make_pack.py           # standalone CLI builder (DIY kit's main script)
  build_diy_kit.py       # packages script + DLL + frames into the downloadable zip
  example_pack/          # example config for the DIY kit
  kitsuneprints.service  # systemd user unit for the VPS
.github/workflows/
  deploy.yml             # auto-deploy to prints.kitsuneden.net on push to main
```

## Local development

```sh
npm install
npm run dev              # http://localhost:5173
npm run build            # produces dist/
node server.cjs          # serve the build on http://localhost:9003
```

## Deploy

Pushes to `main` auto-deploy via GitHub Actions to the DreamHost VPS at `prints.kitsuneden.net`. See [`scripts/kitsuneprints.service`](scripts/kitsuneprints.service) and [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) for the systemd + workflow setup.

Required GitHub secrets: `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`.

## Privacy

Your images **never leave your browser.** Composition, icon generation, zip packaging ~ all client-side canvas + JSZip. The only server-side ping is an anonymous fire-and-forget `POST /api/built` after a successful download, logging only a timestamp and slot count. See [Terms & Privacy](https://prints.kitsuneden.net/terms).

## Part of the Kitsune ecosystem

- [KitsuneDen](https://kitsuneden.net) ~ home server hub
- [KitsunePaint](https://paint.kitsuneden.net) ~ custom paint pack creator
- **KitsunePrints** ~ custom picture pack creator (you are here)

---

<p align="center"><sub>Built by Ada · Powered by the Skulk</sub></p>
