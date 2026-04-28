# KitsunePrints DIY Pack Builder

The web tool at [prints.kitsuneden.net](https://prints.kitsuneden.net) is the
easiest way to build a picture pack. This script is for people who'd rather
work locally ~ no browser, no upload, just a folder of images and a JSON config.

## Setup (once)

```sh
pip install Pillow
```

Make sure the kit folder structure is intact (this script lives next to a
`KitsunePrints.dll` and a `frames/` folder with the six frame texture
presets ~ if you downloaded the DIY kit zip, those are already in place).

## Make a pack

```sh
python make_pack.py example_pack/
```

The script:

1. Reads `example_pack/config.json`
2. For each filled slot, composes the texture (left-25%-frame for portraits,
   1024×1024 for abstracts) using your image from `example_pack/images/`
3. Generates `picture_pack.json`, `blocks.xml`, `recipes.xml`,
   `Localization.txt`, and 160×160 ItemIcons
4. Bundles everything plus the shared `KitsunePrints.dll` into
   `example_pack/<sanitized_name>.zip`

Drop the zip's contents into `<7DTD>/Mods/`, restart 7DTD, and search
"print" in the creative menu.

## Pack folder layout

```
your_pack/
  config.json
  images/
    boss-cat.png
    orange.png
    ... (any names you want, just reference them in config.json)
```

## config.json

```jsonc
{
  "name": "My Picture Pack",          // shown in mod menu (any text)
  "author": "Your Name",
  "version": "0.1.0",
  "description": "...",

  "slots": {
    // Each key is a vanilla painting Material name.
    // Skip any slot you don't want to override ~ vanilla stays vanilla.
    "painting_ben":        { "image": "boss-cat.png",  "title": "The Boss", "frame": "ornate_gold" },
    "painting_lorien":     { "image": "orange.png",    "title": "Sunbeam" },
    "paintingsAbstract01": { "image": "hearth.png",    "title": "Hearth" }
  }
}
```

### Slot keys (vanilla material names)

**1×1 backer portraits** ~ each gets its own 512×512 painting. UV layout
slices the texture into left 25% wraparound (handled by the picked frame
preset) and right 75% canvas (your image):

- `painting_ben`, `painting_lorien`, `painting_derek`, `painting_noah`,
  `painting_duke`, `painting_ken`

**Abstract paintings** ~ each Material drives both 2×2 and 3×2 frame sizes.
Wide images look great on 3×2, get a mild horizontal squish on 2×2:

- `paintingsAbstract01`, `paintingsAbstract02`, `paintingsAbstract03`,
  `paintingsAbstract04`

### Frame options (portraits only)

`wood_dark` (default), `wood_light`, `gold_gilt`, `silver`, `matte_black`,
`ornate_gold`. The web tool's frame picker maps to these same IDs.
