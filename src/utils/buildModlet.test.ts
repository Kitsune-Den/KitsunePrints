import { describe, it, expect } from 'vitest'
import {
  sanitizeIdentifier,
  escapeXml,
  pickRecipeKind,
  renderBlockEntry,
  renderRecipeEntry,
  renderPickupXml,
  renderPickupAppendRows,
  renderBlocksXml,
  renderModInfo,
  type RecipeKind,
} from './buildModlet'
import type { SlotDef, PackMeta } from '../types/slots'

const META: PackMeta = {
  name: 'My Cat Pack',
  author: 'Ada',
  version: '0.2.0',
  description: 'Cats everywhere',
  enablePickup: true,
  enableExtendedDecorPickup: false,
}

const PORTRAIT_SLOT: SlotDef = {
  slotId: 'painting_ben',
  materialName: 'painting_ben',
  label: 'Backer Portrait 1',
  vanillaBlocks: ['paintingBen'],
  kind: 'portrait',
}

const ABSTRACT_SLOT: SlotDef = {
  slotId: 'paintingsAbstract01',
  materialName: 'paintingsAbstract01',
  label: 'Abstract 1',
  vanillaBlocks: ['paintingAbstract01_2x2', 'paintingAbstract01_3x2'],
  kind: 'abstract',
}

const MOVIE_POSTER_SLOT: SlotDef = {
  slotId: 'signPosterMovieLoneWolf',
  materialName: 'posterMovie',
  label: 'Movie Poster ~ Lone Wolf',
  vanillaBlocks: ['signPosterMovieLoneWolf', 'signPosterMovieTheaterLoneWolf'],
  kind: 'moviePoster',
  atlasTile: { x: 2, y: 517, w: 346, h: 483 },
}

const DECOR_SLOT: SlotDef = {
  slotId: 'gunBlueprintPistol',
  materialName: 'gunBlueprintPistol',
  label: 'Pistol Blueprint',
  vanillaBlocks: ['posterBlueprintPistol'],
  kind: 'decor',
}

const CANVAS_TILE_SLOT: SlotDef = {
  slotId: 'pictureFrame_01a',
  materialName: 'pictureFramed',
  label: 'Frame A',
  vanillaBlocks: ['pictureFrame_01a'],
  kind: 'canvasTile',
  atlasTile: { x: 1288, y: 1138, w: 735, h: 898 },
}

// ---- sanitizeIdentifier --------------------------------------------------

describe('sanitizeIdentifier', () => {
  it('preserves clean identifiers', () => {
    expect(sanitizeIdentifier('CatPack-v1')).toBe('CatPack-v1')
    expect(sanitizeIdentifier('my_pack_42')).toBe('my_pack_42')
  })

  it('replaces spaces with underscores and collapses runs', () => {
    expect(sanitizeIdentifier('My Cat Pack')).toBe('My_Cat_Pack')
    expect(sanitizeIdentifier('My  Cat   Pack')).toBe('My_Cat_Pack')
  })

  it('strips emoji and unicode', () => {
    expect(sanitizeIdentifier('🐱 Cats!')).toBe('Cats')
    expect(sanitizeIdentifier('Köln Cats')).toBe('K_ln_Cats')
  })

  it('strips leading/trailing underscores', () => {
    expect(sanitizeIdentifier('___pack___')).toBe('pack')
    expect(sanitizeIdentifier('!!!Pack!!!')).toBe('Pack')
  })

  it('returns empty string for fully invalid input', () => {
    expect(sanitizeIdentifier('!!!')).toBe('')
    expect(sanitizeIdentifier('')).toBe('')
  })
})

// ---- escapeXml -----------------------------------------------------------

describe('escapeXml', () => {
  it('escapes the five XML metacharacters', () => {
    expect(escapeXml('<')).toBe('&lt;')
    expect(escapeXml('>')).toBe('&gt;')
    expect(escapeXml('&')).toBe('&amp;')
    expect(escapeXml('"')).toBe('&quot;')
    expect(escapeXml("'")).toBe('&apos;')
  })

  it('handles ampersands first to avoid double-escape', () => {
    expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    expect(escapeXml('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;')
  })

  it('leaves regular text untouched', () => {
    expect(escapeXml('plain text 123')).toBe('plain text 123')
  })
})

// ---- pickRecipeKind ------------------------------------------------------

describe('pickRecipeKind', () => {
  it('returns portrait for portrait slots', () => {
    expect(pickRecipeKind(PORTRAIT_SLOT, 'paintingBen')).toBe('portrait')
  })

  it('returns moviePoster for moviePoster slots', () => {
    expect(pickRecipeKind(MOVIE_POSTER_SLOT, 'signPosterMovieLoneWolf')).toBe('moviePoster')
  })

  it('returns moviePoster for decor and canvasTile (small print cost)', () => {
    expect(pickRecipeKind(DECOR_SLOT, 'posterBlueprintPistol')).toBe('moviePoster')
    expect(pickRecipeKind(CANVAS_TILE_SLOT, 'pictureFrame_01a')).toBe('moviePoster')
  })

  it('distinguishes abstract sizes by vanilla block suffix', () => {
    expect(pickRecipeKind(ABSTRACT_SLOT, 'paintingAbstract01_2x2')).toBe('abstract2x2')
    expect(pickRecipeKind(ABSTRACT_SLOT, 'paintingAbstract01_3x2')).toBe('abstract3x2')
  })
})

// ---- renderBlockEntry ----------------------------------------------------

describe('renderBlockEntry', () => {
  it('emits Extends + CustomIcon (no pickup) when pickup disabled', () => {
    const xml = renderBlockEntry('kp_pack_paintingBen', 'paintingBen', false)
    expect(xml).toContain('<property name="Extends" value="paintingBen"/>')
    expect(xml).toContain('<property name="CustomIcon" value="kp_pack_paintingBen"/>')
    expect(xml).not.toContain('CanPickup')
  })

  it('adds CanPickup="true" when pickup enabled', () => {
    const xml = renderBlockEntry('kp_pack_paintingBen', 'paintingBen', true)
    expect(xml).toContain('<property name="CanPickup" value="true"/>')
  })

  it('escapes special chars in block names', () => {
    const xml = renderBlockEntry('kp_pack_<bad>', 'paintingBen', false)
    expect(xml).toContain('kp_pack_&lt;bad&gt;')
    expect(xml).not.toContain('<bad>')
  })
})

// ---- renderRecipeEntry ---------------------------------------------------

describe('renderRecipeEntry', () => {
  it.each<[RecipeKind, string]>([
    ['portrait',    'resourcePaper" count="2"'],
    ['abstract2x2', 'resourcePaper" count="8"'],
    ['abstract3x2', 'resourcePaper" count="12"'],
    ['moviePoster', 'resourcePaper" count="6"'],
  ])('%s recipe contains expected paper cost', (kind, expectedCost) => {
    const xml = renderRecipeEntry('kp_pack_x', kind)
    expect(xml).toContain(expectedCost)
  })

  it('always emits a workbench-tagged recipe', () => {
    const xml = renderRecipeEntry('kp_pack_x', 'portrait')
    expect(xml).toContain('craft_area="workbench"')
    expect(xml).toContain('tags="workbenchCrafting"')
  })

  it('includes iron only for portrait + abstract recipes', () => {
    expect(renderRecipeEntry('a', 'portrait')).toContain('resourceForgedIron')
    expect(renderRecipeEntry('a', 'abstract2x2')).toContain('resourceForgedIron')
    expect(renderRecipeEntry('a', 'abstract3x2')).toContain('resourceForgedIron')
    expect(renderRecipeEntry('a', 'moviePoster')).not.toContain('resourceForgedIron')
  })
})

// ---- renderPickupAppendRows ----------------------------------------------

describe('renderPickupAppendRows', () => {
  const rows = renderPickupAppendRows()
  const extendedRows = renderPickupAppendRows({ extendedDecor: true })

  it('only adds CanPickup=true (no Harvest drop, no recipe)', () => {
    expect(rows).toContain('<property name="CanPickup" value="true"/>')
    expect(rows).not.toContain('Harvest')
    expect(rows).not.toContain('<recipe ')
  })

  it('patches all known categories of vanilla blocks', () => {
    expect(rows).toContain("@name='paintingBen'")
    expect(rows).toContain("@name='paintingAbstract01_2x2'")
    expect(rows).toContain("@name='signSnackPosterAtom'")
    expect(rows).toContain("@name='signPosterMovieTheaterLoneWolf'")
    expect(rows).toContain("@name='pictureFrame_01a'")
    expect(rows).toContain("@name='pictureCanvas_01j'")
  })

  it('does NOT patch hidden-safe variants (they break POI load)', () => {
    expect(rows).not.toContain('hiddenSafe')
    expect(extendedRows).not.toContain('hiddenSafe')
  })

  it('does NOT patch pictureCanvasRandomHelper (internal placeholder)', () => {
    expect(rows).not.toContain('pictureCanvasRandomHelper')
    expect(extendedRows).not.toContain('pictureCanvasRandomHelper')
  })

  it('produces ~83 append patches in core mode', () => {
    const patchCount = (rows.match(/<append /g) || []).length
    expect(patchCount).toBeGreaterThanOrEqual(80)
    expect(patchCount).toBeLessThanOrEqual(95)
  })

  // ---- Extended decor pickup (issue #3) -----------------------------------

  it('extended mode adds the new flag/sign/decor entries', () => {
    expect(extendedRows).toContain("@name='flagWallHungUSA'")
    expect(extendedRows).toContain("@name='flagWallHungGadsdenYellow'")
    expect(extendedRows).toContain("@name='signOpenWallMountChain'")
    expect(extendedRows).toContain("@name='signRoadStop'")
    expect(extendedRows).toContain("@name='signShopGas'")
    expect(extendedRows).toContain("@name='wallClock'")
    expect(extendedRows).toContain("@name='wallMirror'")
    expect(extendedRows).toContain("@name='signBulletinBoard01'")
    expect(extendedRows).toContain("@name='signBathroomSignUnisexWallMount'")
  })

  it('extended mode keeps the picture core intact', () => {
    expect(extendedRows).toContain("@name='paintingBen'")
    expect(extendedRows).toContain("@name='pictureFrame_01a'")
  })

  it("extended mode never includes trader signage (don't steal from traders)", () => {
    expect(extendedRows).not.toContain("@name='signTrader")
    expect(extendedRows).not.toContain("@name='flagPoleTrader")
    expect(extendedRows).not.toContain("@name='signNoticeTrader")
  })

  it('extended mode never includes lit / electrical signs', () => {
    // Spot-check the categories the audit flagged risky.
    expect(extendedRows).not.toContain("@name='signShopGasLit")
    expect(extendedRows).not.toContain("@name='signNeonColdBeer")
    expect(extendedRows).not.toContain("@name='signExitLight")
    expect(extendedRows).not.toContain("@name='signTrafficLight")
    expect(extendedRows).not.toContain("@name='lightSconce")
    expect(extendedRows).not.toContain("@name='dartTrap")
  })

  it('extended mode produces ~300+ append patches total', () => {
    const patchCount = (extendedRows.match(/<append /g) || []).length
    expect(patchCount).toBeGreaterThanOrEqual(290)
    expect(patchCount).toBeLessThanOrEqual(330)
  })

  it('extended mode is strictly a superset of core mode', () => {
    const corePatches = (rows.match(/@name='[^']+'/g) || [])
    const extPatches = new Set(extendedRows.match(/@name='[^']+'/g) || [])
    for (const p of corePatches) {
      expect(extPatches.has(p)).toBe(true)
    }
  })
})

// ---- renderPickupXml (legacy wrapper) ------------------------------------

describe('renderPickupXml (legacy wrapper)', () => {
  it('wraps the append rows in a full configs document', () => {
    const xml = renderPickupXml()
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8" ?>')).toBe(true)
    expect(xml).toContain('<configs>')
    expect(xml.trimEnd().endsWith('</configs>')).toBe(true)
    expect(xml).toContain('<property name="CanPickup" value="true"/>')
  })
})

// ---- renderBlocksXml ------------------------------------------------------

describe('renderBlocksXml', () => {
  const KP_ROW = '        <block name="kp_pack_paintingBen"></block>'

  it('emits an append /blocks wrapper around the kp_* rows', () => {
    const xml = renderBlocksXml([KP_ROW])
    expect(xml).toContain('<append xpath="/blocks">')
    expect(xml).toContain(KP_ROW)
    expect(xml).not.toContain("xpath=\"/blocks/block[@name='paintingBen']\"")
  })

  it('inlines pickup append patches when pickupAppendRows is provided', () => {
    const xml = renderBlocksXml([KP_ROW], renderPickupAppendRows())
    // kp_* block should still be present
    expect(xml).toContain(KP_ROW)
    // Plus per-vanilla-block <append> patches with CanPickup
    expect(xml).toContain("xpath=\"/blocks/block[@name='paintingBen']\"")
    expect(xml).toContain('<property name="CanPickup" value="true"/>')
  })
})

// ---- renderModInfo -------------------------------------------------------

describe('renderModInfo', () => {
  it('uses sanitized name as <Name> but raw name as <DisplayName>', () => {
    const xml = renderModInfo({ ...META, name: 'My Cat Pack!' })
    expect(xml).toContain('<Name value="My_Cat_Pack" />')
    expect(xml).toContain('<DisplayName value="My Cat Pack!" />')
  })

  it('falls back to KitsunePicturePack when name sanitizes to empty', () => {
    const xml = renderModInfo({ ...META, name: '!!!' })
    expect(xml).toContain('<Name value="KitsunePicturePack" />')
  })

  it('escapes special chars in display name + author + description', () => {
    const xml = renderModInfo({
      ...META,
      name: 'Pack',
      author: 'Ada & Cats',
      description: 'Cats <3 everywhere',
    })
    expect(xml).toContain('<Author value="Ada &amp; Cats" />')
    expect(xml).toContain('Cats &lt;3 everywhere')
  })
})
