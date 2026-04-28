import JSZip from 'jszip'
import { SLOTS, DEFAULT_FRAME_PRESET_ID, type SlotState, type PackMeta, type SlotDef } from '../types/slots'
import { composePortrait, composeAbstract, composeIcon } from './composer'

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
 *       Textures/                       (composed textures, one per filled slot)
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

  // For each filled slot we generate:
  //  - composed texture in Resources/Textures/<materialName>.png
  //  - icon in UIAtlases/ItemIconAtlas/<blockName>.png
  //  - blocks.xml entry
  //  - recipes.xml entry
  //  - Localization.txt row
  //  - picture_pack.json entry
  const pictureMap: Record<string, string> = {}
  const blocksRows: string[] = []
  const recipesRows: string[] = []
  const locRows: string[] = []

  for (const slot of SLOTS) {
    const state = slots[slot.materialName]
    if (!state?.file) continue

    const filename = `${slot.materialName}.png`
    const composed = await composeForSlot(slot, state)
    root.file(`Resources/Textures/${filename}`, composed)
    pictureMap[slot.materialName] = filename

    const title = (state.title?.trim() || slot.label)
    const displayName = `Print: ${title}`
    const iconBlob = await composeIcon(state.file, slot.kind)

    if (slot.kind === 'portrait') {
      // 1×1 backer portraits: vanilla ships a single block (e.g. paintingBen)
      // ~ one new block extending it.
      const blockName = `kp_${packId}_${slot.materialName}`
      root.file(`UIAtlases/ItemIconAtlas/${blockName}.png`, iconBlob)
      blocksRows.push(renderBlockEntry(blockName, slot.vanillaBlock))
      recipesRows.push(renderRecipeEntry(blockName, 'portrait'))
      locRows.push(renderLocalizationRow(blockName, displayName))
    } else {
      // Abstract paintings: vanilla ships TWO sizes per design
      // (paintingAbstract01_2x2 + paintingAbstract01_3x2). There is NO plain
      // paintingAbstract01 block ~ extending it would fail and cascade-break
      // every other vanilla XML loader. Generate one extending block per size.
      for (const size of ['2x2', '3x2'] as const) {
        const vanillaSized = `${slot.vanillaBlock}_${size}`
        const blockName = `kp_${packId}_${slot.materialName}_${size}`
        root.file(`UIAtlases/ItemIconAtlas/${blockName}.png`, iconBlob)
        blocksRows.push(renderBlockEntry(blockName, vanillaSized))
        recipesRows.push(renderRecipeEntry(blockName, size === '2x2' ? 'abstract2x2' : 'abstract3x2'))
        locRows.push(renderLocalizationRow(blockName, `${displayName} ${size}`))
      }
    }
  }

  // Config files
  root.file('Config/picture_pack.json', JSON.stringify(pictureMap, null, 2))
  root.file('Config/blocks.xml', renderBlocksXml(blocksRows))
  root.file('Config/recipes.xml', renderRecipesXml(recipesRows))
  root.file('Config/Localization.txt', renderLocalization(locRows))

  return zip.generateAsync({ type: 'blob' })
}

async function composeForSlot(slot: SlotDef, state: SlotState): Promise<Blob> {
  if (!state.file) throw new Error(`No file for slot ${slot.materialName}`)
  if (slot.kind === 'portrait') {
    return composePortrait(state.file, state.framePresetId || DEFAULT_FRAME_PRESET_ID)
  }
  return composeAbstract(state.file)
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

function renderBlockEntry(blockName: string, vanillaBlock: string): string {
  return `        <block name="${escapeXml(blockName)}">
            <property name="Extends" value="${escapeXml(vanillaBlock)}"/>
            <property name="CustomIcon" value="${escapeXml(blockName)}"/>
        </block>`
}

function renderBlocksXml(rows: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<configs>

    <!-- Auto-generated by KitsunePrints web tool. Each block extends a
         vanilla painting whose Material gets re-skinned at runtime by
         KitsunePrints.dll. The new blocks are searchable in creative menu
         under "Print" or the per-slot title. -->

    <append xpath="/blocks">

${rows.join('\n\n')}

    </append>

</configs>
`
}

type RecipeKind = 'portrait' | 'abstract2x2' | 'abstract3x2'

function renderRecipeEntry(blockName: string, kind: RecipeKind): string {
  // Costs follow vanilla destroy-drops + multi-block area:
  //  - portrait (1×1): paper 2 + wood 6 + iron 1
  //  - abstract 2×2:   paper 8 + wood 4 + iron 1
  //  - abstract 3×2:   paper 12 + wood 6 + iron 2 (1.5× the 2×2 cost)
  const ingredients = kind === 'portrait'
    ? '<ingredient name="resourcePaper" count="2"/>\n            <ingredient name="resourceWood" count="6"/>\n            <ingredient name="resourceForgedIron" count="1"/>'
    : kind === 'abstract2x2'
      ? '<ingredient name="resourcePaper" count="8"/>\n            <ingredient name="resourceWood" count="4"/>\n            <ingredient name="resourceForgedIron" count="1"/>'
      : '<ingredient name="resourcePaper" count="12"/>\n            <ingredient name="resourceWood" count="6"/>\n            <ingredient name="resourceForgedIron" count="2"/>'
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
