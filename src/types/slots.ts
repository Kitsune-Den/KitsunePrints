// The 10 vanilla painting slots a KitsunePrints pack can replace.
// Each slot is keyed by the vanilla material name ~ that's what the
// runtime DLL looks up when it walks Resources.FindObjectsOfTypeAll<Material>()
// at World.LoadWorld postfix.

export type SlotKind = 'portrait' | 'abstract'

export interface SlotDef {
  /** Vanilla Material.m_Name in 7DTD V2.6 ~ the key in picture_pack.json. */
  materialName: string
  /** Friendly label for the UI. */
  label: string
  /** Vanilla block this slot maps to (for context, not used by the DLL). */
  vanillaBlock: string
  kind: SlotKind
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

export const SLOTS: SlotDef[] = [
  // 1×1 backer portraits ~ left 25% wood / right 75% canvas
  { materialName: 'painting_ben',        label: 'Backer Portrait 1', vanillaBlock: 'paintingBen',    kind: 'portrait' },
  { materialName: 'painting_lorien',     label: 'Backer Portrait 2', vanillaBlock: 'paintingLorien', kind: 'portrait' },
  { materialName: 'painting_derek',      label: 'Backer Portrait 3', vanillaBlock: 'paintingDerek',  kind: 'portrait' },
  { materialName: 'painting_noah',       label: 'Backer Portrait 4', vanillaBlock: 'paintingNoah',   kind: 'portrait' },
  { materialName: 'painting_duke',       label: 'Backer Portrait 5', vanillaBlock: 'paintingDuke',   kind: 'portrait' },
  { materialName: 'painting_ken',        label: 'Backer Portrait 6', vanillaBlock: 'paintingKen',    kind: 'portrait' },
  // Abstracts ~ 2×2 + 3×2 share one Material per design
  { materialName: 'paintingsAbstract01', label: 'Abstract 1 (2×2 + 3×2)', vanillaBlock: 'paintingAbstract01', kind: 'abstract' },
  { materialName: 'paintingsAbstract02', label: 'Abstract 2 (2×2 + 3×2)', vanillaBlock: 'paintingAbstract02', kind: 'abstract' },
  { materialName: 'paintingsAbstract03', label: 'Abstract 3 (2×2 + 3×2)', vanillaBlock: 'paintingAbstract03', kind: 'abstract' },
  { materialName: 'paintingsAbstract04', label: 'Abstract 4 (2×2 + 3×2)', vanillaBlock: 'paintingAbstract04', kind: 'abstract' },
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
}

export const DEFAULT_PACK_META: PackMeta = {
  name: 'My Picture Pack',
  author: '',
  description: 'A custom picture pack for 7 Days to Die V2.6',
  version: '0.1.0',
}
