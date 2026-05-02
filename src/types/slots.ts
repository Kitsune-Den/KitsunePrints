// The vanilla painting + poster slots a KitsunePrints pack can replace.
// Each slot is keyed by `slotId` (unique per slot card in the UI).
//
// `materialName` is what the runtime DLL looks up when it walks
// Resources.FindObjectsOfTypeAll<Material>() at World.LoadWorld postfix.
// For atlas slots (movie posters), multiple slot defs share one materialName
// since each slot writes to a different tile of the same atlas.

export type SlotKind = 'portrait' | 'abstract' | 'moviePoster' | 'decor'

/** Pixel rectangle inside an atlas texture. (x,y) is top-left in PIL coords. */
export interface AtlasTile {
  x: number
  y: number
  w: number
  h: number
}

export interface SlotDef {
  /** Unique slot identifier ~ used as the React key and the state Record key. */
  slotId: string
  /** Friendly UI label. */
  label: string
  /**
   * Vanilla Material.m_Name in 7DTD V2.6 ~ the key in picture_pack.json.
   * Multiple slots may share one materialName (atlas case): all of them
   * composite into a single output texture for that material.
   */
  materialName: string
  /** Vanilla block names re-skinned by this slot. Used to extend in blocks.xml. */
  vanillaBlocks: string[]
  kind: SlotKind
  /**
   * For atlas slots only. The pixel rectangle inside the shared atlas
   * (1024×1024 for posterMovie) that this slot writes to. Composer copies
   * the vanilla atlas as the base and paints this slot's image into the tile.
   */
  atlasTile?: AtlasTile
  /**
   * For 'portrait' slots, the texture has a baked-in UV layout: left 25% wraps
   * the 3D wood frame mesh, right 75% is the canvas. Composer paints the
   * left zone with a wood color and the right zone with the user's image.
   *
   * For 'abstract' slots, the runtime DLL resets the material's UV scale/offset
   * to (1,1)/(0,0), so the user's image fills the whole canvas. Composer
   * just normalizes the image to a square ~1024×1024.
   */
}

/** Pixel layout of the vanilla `posterMovie` 1024×1024 atlas, derived from
 *  reading each prefab's mesh UVs (see scripts/read_movie_poster_uvs.py). */
export const POSTER_MOVIE_ATLAS_SIZE = 1024
export const POSTER_MOVIE_ATLAS_PATH = '/vanilla/_posterMovie_atlas.png'

export const SLOTS: SlotDef[] = [
  // 1×1 backer portraits ~ left 25% wood / right 75% canvas
  { slotId: 'painting_ben',        materialName: 'painting_ben',        label: 'Backer Portrait 1', vanillaBlocks: ['paintingBen'],    kind: 'portrait' },
  { slotId: 'painting_lorien',     materialName: 'painting_lorien',     label: 'Backer Portrait 2', vanillaBlocks: ['paintingLorien'], kind: 'portrait' },
  { slotId: 'painting_derek',      materialName: 'painting_derek',      label: 'Backer Portrait 3', vanillaBlocks: ['paintingDerek'],  kind: 'portrait' },
  { slotId: 'painting_noah',       materialName: 'painting_noah',       label: 'Backer Portrait 4', vanillaBlocks: ['paintingNoah'],   kind: 'portrait' },
  { slotId: 'painting_duke',       materialName: 'painting_duke',       label: 'Backer Portrait 5', vanillaBlocks: ['paintingDuke'],   kind: 'portrait' },
  { slotId: 'painting_ken',        materialName: 'painting_ken',        label: 'Backer Portrait 6', vanillaBlocks: ['paintingKen'],    kind: 'portrait' },

  // Abstracts ~ shared Material drives both the 2×2 and 3×2 vanilla blocks per design.
  { slotId: 'paintingsAbstract01', materialName: 'paintingsAbstract01', label: 'Abstract 1 (2×2 + 3×2)', vanillaBlocks: ['paintingAbstract01_2x2', 'paintingAbstract01_3x2'], kind: 'abstract' },
  { slotId: 'paintingsAbstract02', materialName: 'paintingsAbstract02', label: 'Abstract 2 (2×2 + 3×2)', vanillaBlocks: ['paintingAbstract02_2x2', 'paintingAbstract02_3x2'], kind: 'abstract' },
  { slotId: 'paintingsAbstract03', materialName: 'paintingsAbstract03', label: 'Abstract 3 (2×2 + 3×2)', vanillaBlocks: ['paintingAbstract03_2x2', 'paintingAbstract03_3x2'], kind: 'abstract' },
  { slotId: 'paintingsAbstract04', materialName: 'paintingsAbstract04', label: 'Abstract 4 (2×2 + 3×2)', vanillaBlocks: ['paintingAbstract04_2x2', 'paintingAbstract04_3x2'], kind: 'abstract' },

  // Movie posters ~ all 4 share the `posterMovie` 1024×1024 atlas. Each slot
  // writes to its own tile. The matching theater variant block samples the
  // same tile via its mesh UVs, so the user's image appears on both blocks
  // automatically.
  {
    slotId: 'signPosterMovieMammasJustice',
    materialName: 'posterMovie',
    label: "Movie Poster ~ Mama's Justice",
    vanillaBlocks: ['signPosterMovieMammasJustice', 'signPosterMovieTheaterMammasJustice'],
    kind: 'moviePoster',
    atlasTile: { x: 2, y: 25, w: 347, h: 483 },
  },
  {
    slotId: 'signPosterMovieSexualTension',
    materialName: 'posterMovie',
    label: 'Movie Poster ~ Sexual Tension',
    vanillaBlocks: ['signPosterMovieSexualTension', 'signPosterMovieTheaterSexualTension'],
    kind: 'moviePoster',
    atlasTile: { x: 350, y: 24, w: 346, h: 484 },
  },
  {
    slotId: 'signPosterMovieLoneWolf',
    materialName: 'posterMovie',
    label: 'Movie Poster ~ Lone Wolf',
    vanillaBlocks: ['signPosterMovieLoneWolf', 'signPosterMovieTheaterLoneWolf'],
    kind: 'moviePoster',
    atlasTile: { x: 2, y: 517, w: 346, h: 483 },
  },
  {
    slotId: 'signPosterMovie2159',
    materialName: 'posterMovie',
    label: 'Movie Poster ~ 2159',
    vanillaBlocks: ['signPosterMovie2159', 'signPosterMovieTheater2159'],
    kind: 'moviePoster',
    atlasTile: { x: 351, y: 518, w: 345, h: 482 },
  },

  // Misc decor ~ standalone or material-pair atlas slots (DLL resets UV
  // scale/offset so each material renders the user's full image regardless
  // of the original atlas-half offset).
  {
    slotId: 'posterCalendarPinupWorkingStiff',
    materialName: 'posterCalendarPinupWorkingStiff',
    label: 'Working Stiff Calendar',
    vanillaBlocks: ['posterCalendarPinupWorkingStiff'],
    kind: 'decor',
  },
  {
    slotId: 'gunBlueprintPistol',
    materialName: 'gunBlueprintPistol',
    label: 'Pistol Blueprint',
    vanillaBlocks: ['posterBlueprintPistol'],
    kind: 'decor',
  },
  {
    slotId: 'gunBlueprintRifle',
    materialName: 'gunBlueprintRifle',
    label: 'Rifle Blueprint',
    vanillaBlocks: ['posterBlueprintRifle'],
    kind: 'decor',
  },
  {
    slotId: 'targetPoster1',
    materialName: 'targetPosters',
    label: 'Target Poster 1',
    vanillaBlocks: ['targetPoster1'],
    kind: 'decor',
  },
  {
    slotId: 'targetPoster2',
    materialName: 'targetPosters2',
    label: 'Target Poster 2',
    vanillaBlocks: ['targetPoster2'],
    kind: 'decor',
  },
]

export interface SlotState {
  /** User-uploaded image as a data URL or object URL for preview. */
  preview?: string
  /** The actual file (kept around for the upload payload). */
  file?: File
  /**
   * For portrait slots: id of the picked frame preset. The composer paints
   * that preset's image into the left 25% of the texture (the UV zone that
   * wraps the 3D wooden frame mesh).
   */
  framePresetId?: string
  /**
   * User-picked display title for this painting. Defaults to the slot label.
   * Final creative-menu display name is "Print: <title>" so "print" + this
   * title are both searchable in the in-game creative search.
   */
  title?: string
}

export interface FramePreset {
  id: string
  label: string
  /** Path under public/frames/ ~ used both for the picker thumbnail and the composer. */
  imagePath: string
}

/**
 * Frame texture presets. Each is a 256×1024 vertical strip that fills the
 * left 25% of a 1024×1024 portrait texture. The vanilla painting prefab's
 * UV layout maps that strip to wrap the 3D wooden frame mesh, so picking a
 * preset effectively re-skins the frame.
 *
 * Tier 1 (current): just swaps the visual color/pattern. Vanilla's _Normal
 * map still adds wood-grain carved relief regardless of which preset is
 * picked ~ fine stylization, but "metal" is faux-metal until Tier 2 ships
 * matching normal maps.
 */
export const FRAME_PRESETS: FramePreset[] = [
  { id: 'wood_dark',   label: 'Dark Wood',   imagePath: '/frames/wood_dark.png' },
  { id: 'wood_light',  label: 'Light Wood',  imagePath: '/frames/wood_light.png' },
  { id: 'gold_gilt',   label: 'Gold Gilt',   imagePath: '/frames/gold_gilt.png' },
  { id: 'silver',      label: 'Silver',      imagePath: '/frames/silver.png' },
  { id: 'matte_black', label: 'Matte Black', imagePath: '/frames/matte_black.png' },
  { id: 'ornate_gold', label: 'Ornate Gold', imagePath: '/frames/ornate_gold.png' },
]

export const DEFAULT_FRAME_PRESET_ID = 'wood_dark'

export interface PackMeta {
  name: string
  author: string
  description: string
  version: string
  /**
   * When true, the modlet ships a Config/pickup.xml patch that adds CanPickup
   * + a Harvest drop to every vanilla picture/poster/canvas/safe block (and
   * to every generated kp_* block in this pack), making them hold-E-pickup-able,
   * wrench-harvestable, and placeable from inventory in survival mode.
   * Defaults ON ~ this is one of the headline features of the mod.
   */
  enablePickup: boolean
}

export const DEFAULT_PACK_META: PackMeta = {
  name: 'My Picture Pack',
  author: '',
  description: 'A custom picture pack for 7 Days to Die V2.6',
  version: '0.1.0',
  enablePickup: true,
}
