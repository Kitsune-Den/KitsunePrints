import JSZip from 'jszip'
import {
  SLOTS,
  DEFAULT_FRAME_PRESET_ID,
  type SlotState,
  type PackMeta,
  type SlotDef,
} from '../types/slots'
import {
  composePortrait,
  composeAbstract,
  composeAtlas,
  composeIcon,
} from './composer'
import { PICKUP_BLOCKS, HARVEST_TAG } from './pickupBlocks'

/**
 * Builds the modlet zip. Layout:
 *   <PackName>/
 *     ModInfo.xml
 *     KitsunePrints.dll                 (fetched from /reference/)
 *     Config/
 *       picture_pack.json               (vanilla material -> filename map; runtime DLL reads this)
 *       blocks.xml                      (kp_<pack>_<slot> blocks extending vanilla paintings)
 *       recipes.xml                     (workbench crafting per block)
 *       Localization.txt                ("Print: <title>" display names)
 *     Resources/
 *       Textures/                       (composed textures, one per filled slot OR per atlas)
 *     UIAtlases/
 *       ItemIconAtlas/                  (160x160 icons, named after the new block IDs)
 *
 * Searching "print" in creative will find every painting from every
 * KitsunePrints pack. Searching the per-slot title finds one specifically.
 */
export async function buildModlet(
  slots: Record<string, SlotState>,
  meta: PackMeta,
): Promise<Blob> {
  const zip = new JSZip()
  const safeFolderName = sanitizeIdentifier(meta.name) || 'KitsunePicturePack'
  const root = zip.folder(safeFolderName)
  if (!root) throw new Error('Failed to create root folder in zip')

  const packId = safeFolderName // also used as the per-pack block-name prefix

  // Fetch the shared Harmony DLL from the public reference dir
  const dllResponse = await fetch('/reference/KitsunePrints.dll')
  if (!dllResponse.ok) throw new Error('Failed to fetch KitsunePrints.dll')
  const dllBlob = await dllResponse.arrayBuffer()
  root.file('KitsunePrints.dll', dllBlob)

  root.file('ModInfo.xml', renderModInfo(meta))

  const pictureMap: Record<string, string> = {}
  const blocksRows: string[] = []
  const recipesRows: string[] = []
  const locRows: string[] = []
  const writtenTextures = new Set<string>()

  // Group movie poster slots by material so we composite the atlas once.
  const filledMoviePosters: { slot: SlotDef; state: SlotState }[] = []

  for (const slot of SLOTS) {
    const state = slots[slot.slotId]
    if (!state?.file) continue

    if (slot.kind === 'moviePoster') {
      filledMoviePosters.push({ slot, state })
    } else {
      // Per-slot texture: one PNG per slot (portraits + abstracts).
      const filename = `${slot.materialName}.png`
      if (!writtenTextures.has(filename)) {
        const composed = await composeForSlot(slot, state)
        root.file(`Resources/Textures/${filename}`, composed)
        writtenTextures.add(filename)
      }
      pictureMap[slot.materialName] = filename
    }

    const title = state.title?.trim() || slot.label
    const displayName = `Print: ${title}`
    const iconBlob = await composeIcon(state.file, slot.kind)

    // Generate a kp_* block per vanilla block this slot re-skins.
    for (const vanillaBlock of slot.vanillaBlocks) {
      const blockName = `kp_${packId}_${vanillaBlock}`
      root.file(`UIAtlases/ItemIconAtlas/${blockName}.png`, iconBlob)
      blocksRows.push(renderBlockEntry(blockName, vanillaBlock, meta.enablePickup))

      // Recipe + display label depend on slot kind / block size suffix.
      const recipeKind = pickRecipeKind(slot, vanillaBlock)
      recipesRows.push(renderRecipeEntry(blockName, recipeKind))

      // For abstract sized variants, suffix the display name; otherwise plain.
      const sizeSuffix =
        vanillaBlock.endsWith('_2x2') ? ' 2×2' :
        vanillaBlock.endsWith('_3x2') ? ' 3×2' :
        vanillaBlock.toLowerCase().includes('theater') ? ' (Theater)' : ''
      locRows.push(renderLocalizationRow(blockName, `${displayName}${sizeSuffix}`))
    }
  }

  // Movie poster atlas ~ composite once for all filled slots.
  if (filledMoviePosters.length > 0) {
    const atlasBlob = await composeAtlas(filledMoviePosters.map(p => ({
      tile: p.slot.atlasTile!,
      file: p.state.file!,
    })))
    const filename = 'posterMovie.png'
    root.file(`Resources/Textures/${filename}`, atlasBlob)
    pictureMap['posterMovie'] = filename
  }

  // Config files
  root.file('Config/picture_pack.json', JSON.stringify(pictureMap, null, 2))
  root.file('Config/blocks.xml', renderBlocksXml(blocksRows))
  root.file('Config/recipes.xml', renderRecipesXml(recipesRows))
  root.file('Config/Localization.txt', renderLocalization(locRows))

  // Optional pickup patch ~ when the pack opts in, vanilla painting/poster/canvas/safe
  // blocks become wrench-pickup-able by adding a Harvest drop returning the block as itself.
  if (meta.enablePickup) {
    root.file('Config/pickup.xml', renderPickupXml())
  }

  return zip.generateAsync({ type: 'blob' })
}

async function composeForSlot(slot: SlotDef, state: SlotState): Promise<Blob> {
  if (!state.file) throw new Error(`No file for slot ${slot.slotId}`)
  if (slot.kind === 'portrait') {
    return composePortrait(state.file, state.framePresetId || DEFAULT_FRAME_PRESET_ID)
  }
  if (slot.kind === 'abstract') {
    return composeAbstract(state.file)
  }
  // Movie posters are handled in batch by composeAtlas, not here.
  throw new Error(`Slot kind ${slot.kind} should be handled in atlas batch`)
}

type RecipeKind = 'portrait' | 'abstract2x2' | 'abstract3x2' | 'moviePoster' | 'hiddenSafe'

function pickRecipeKind(slot: SlotDef, vanillaBlock: string): RecipeKind {
  if (slot.kind === 'portrait') return 'portrait'
  if (slot.kind === 'moviePoster') return 'moviePoster'
  // abstract: distinguish by size suffix on the vanilla block name
  return vanillaBlock.endsWith('_2x2') ? 'abstract2x2' : 'abstract3x2'
}

/** Classify a vanilla pickup-list block into a recipe cost bucket by name. */
function classifyVanillaPickupBlock(name: string): RecipeKind {
  if (name.startsWith('hiddenSafe')) return 'hiddenSafe'
  if (name.startsWith('paintingAbstract')) {
    return name.endsWith('_3x2') ? 'abstract3x2' : 'abstract2x2'
  }
  if (name.startsWith('painting')) return 'portrait'
  // Everything else (snack posters, picture canvases, picture frames,
  // movie posters and theaters, calendars, blueprints, target, wanted/missing,
  // cats/dogs, signs) shares the moviePoster small-print recipe.
  return 'moviePoster'
}

// ---- Sanitizers ----------------------------------------------------------

function sanitizeIdentifier(s: string): string {
  // 7DTD's mod loader requires <Name> + block names to match ^[0-9a-zA-Z_\-]+$.
  return s.replace(/[^A-Za-z0-9_\-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '')
}

// ---- Renderers -----------------------------------------------------------

function renderModInfo(meta: PackMeta): string {
  // <Name> must be a sanitized identifier; <DisplayName> can keep spaces.
  const sanitizedName = sanitizeIdentifier(meta.name) || 'KitsunePicturePack'
  return `<?xml version="1.0" encoding="UTF-8"?>
<xml>
    <Name value="${escapeXml(sanitizedName)}" />
    <DisplayName value="${escapeXml(meta.name)}" />
    <Version value="${escapeXml(meta.version)}" />
    <Description value="${escapeXml(meta.description)}" />
    <Author value="${escapeXml(meta.author)}" />
</xml>
`
}

function renderBlockEntry(
  blockName: string,
  vanillaBlock: string,
  pickupable: boolean,
): string {
  // When pickup is enabled, add CanPickup="true" (hold-E pickup, no tool)
  // AND a Harvest drop returning the kp_* block as itself (wrench pickup).
  // Both mechanisms return the user's custom block (not a vanilla copy).
  const pickupLines = pickupable
    ? `\n            <property name="CanPickup" value="true"/>` +
      `\n            <drop event="Harvest" name="${escapeXml(blockName)}" count="1" tag="${HARVEST_TAG}"/>`
    : ''
  return `        <block name="${escapeXml(blockName)}">
            <property name="Extends" value="${escapeXml(vanillaBlock)}"/>
            <property name="CustomIcon" value="${escapeXml(blockName)}"/>${pickupLines}
        </block>`
}

function renderPickupXml(): string {
  // One <append> per vanilla block for the block patches since each Harvest
  // drop's `name` attribute must be the block's own name. Both CanPickup
  // (hold-E, no tool) AND Harvest (wrench) so users have a choice ~ press E
  // for quick decor flow, wrench for the tool-based feel.
  const blockRows = PICKUP_BLOCKS.map(name =>
    `    <append xpath="/blocks/block[@name='${escapeXml(name)}']">
        <property name="CanPickup" value="true"/>
        <drop event="Harvest" name="${escapeXml(name)}" count="1" tag="${HARVEST_TAG}"/>
    </append>`
  ).join('\n\n')

  // One big <append xpath="/recipes"> for the workbench recipes ~ adding all
  // 115 recipes inside a single append node keeps the patch file leaner.
  const recipeRows = PICKUP_BLOCKS.map(name => {
    const kind = classifyVanillaPickupBlock(name)
    return renderRecipeEntry(name, kind)
  }).join('\n\n')

  return `<?xml version="1.0" encoding="UTF-8" ?>
<configs>

    <!-- KitsunePrints optional pickup patch.
         Adds two pickup mechanisms to every vanilla picture/poster/canvas/safe block:
           1. CanPickup="true" ~ hold-E to pick up bare-handed (vanilla pattern,
              same as frameShapes etc).
           2. Harvest drop returning the block as itself, tag="${HARVEST_TAG}"
              ~ wrench harvests it back to inventory.
         Plus workbench recipes for all of them so they're craftable too.
         Either one places the block in your inventory; place it back from
         there. Only emitted when the pack opts in via the Pack Info checkbox. -->

${blockRows}

    <!-- Workbench recipes for every pickup-able block. Costs scale by block
         size: tiny prints (paper 6 + wood 3), 1×1 framed paintings
         (paper 2 + wood 6 + iron 1), abstract 2×2/3×2 (paper 8/12 + wood 4/6 + iron 1/2),
         hidden-safe disguises (paper 2 + wood 6 + iron 8 ~ they're real safes). -->

    <append xpath="/recipes">

${recipeRows}

    </append>

</configs>
`
}

function renderBlocksXml(rows: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<configs>

    <!-- Auto-generated by KitsunePrints web tool. Each block extends a
         vanilla painting/poster whose Material gets re-skinned at runtime by
         KitsunePrints.dll. The new blocks are searchable in creative menu
         under "Print" or the per-slot title. -->

    <append xpath="/blocks">

${rows.join('\n\n')}

    </append>

</configs>
`
}

function renderRecipeEntry(blockName: string, kind: RecipeKind): string {
  // Costs follow vanilla destroy-drops + multi-block area:
  //  - portrait (1×1):  paper 2 + wood 6 + iron 1
  //  - abstract 2×2:    paper 8 + wood 4 + iron 1
  //  - abstract 3×2:    paper 12 + wood 6 + iron 2 (1.5× the 2×2 cost)
  //  - movie poster:    paper 6 + wood 3 (no frame ~ it's a print)
  //  - hidden safe:     paper 2 + wood 6 + iron 8 (it's a wall safe, after all)
  const ingredients =
    kind === 'portrait'
      ? '<ingredient name="resourcePaper" count="2"/>\n            <ingredient name="resourceWood" count="6"/>\n            <ingredient name="resourceForgedIron" count="1"/>'
      : kind === 'abstract2x2'
        ? '<ingredient name="resourcePaper" count="8"/>\n            <ingredient name="resourceWood" count="4"/>\n            <ingredient name="resourceForgedIron" count="1"/>'
        : kind === 'abstract3x2'
          ? '<ingredient name="resourcePaper" count="12"/>\n            <ingredient name="resourceWood" count="6"/>\n            <ingredient name="resourceForgedIron" count="2"/>'
          : kind === 'hiddenSafe'
            ? '<ingredient name="resourcePaper" count="2"/>\n            <ingredient name="resourceWood" count="6"/>\n            <ingredient name="resourceForgedIron" count="8"/>'
            : '<ingredient name="resourcePaper" count="6"/>\n            <ingredient name="resourceWood" count="3"/>'
  return `        <recipe name="${escapeXml(blockName)}" count="1" craft_area="workbench" tags="workbenchCrafting">
            ${ingredients}
        </recipe>`
}

function renderRecipesXml(rows: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<configs>

    <append xpath="/recipes">

${rows.join('\n\n')}

    </append>

</configs>
`
}

function renderLocalizationRow(blockName: string, displayName: string): string {
  // V2.6 columns: Key,File,Type,UsedInMainMenu,NoTranslate,english,Context,
  //               german,spanish,french,italian,japanese,koreana,polish,
  //               brazilian,russian,turkish,schinese,tchinese
  // 13 trailing commas after english + Context (we leave Context empty too).
  const safe = displayName.includes(',') ? `"${displayName.replace(/"/g, '""')}"` : displayName
  return `${blockName},blocks,Block,,,${safe},,,,,,,,,,,,,`
}

function renderLocalization(rows: string[]): string {
  const header = 'Key,File,Type,UsedInMainMenu,NoTranslate,english,Context / Alternate Text,german,spanish,french,italian,japanese,koreana,polish,brazilian,russian,turkish,schinese,tchinese'
  return `${header}\n${rows.join('\n')}\n`
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
