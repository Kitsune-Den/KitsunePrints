import { describe, it, expect } from 'vitest'
import {
  isDefaultPackMeta,
  DEFAULT_PACK_META,
  SLOTS,
  getSlotDefaultOrientation,
  getEffectiveOrientation,
  getCompositeRotation,
  slotSupportsOrientationFlip,
  type SlotDef,
  type SlotState,
} from './slots'

describe('isDefaultPackMeta', () => {
  it('returns true for the unmodified factory default', () => {
    expect(isDefaultPackMeta(DEFAULT_PACK_META)).toBe(true)
  })

  it('returns false once the user fills in an author', () => {
    expect(isDefaultPackMeta({ ...DEFAULT_PACK_META, author: 'Ada' })).toBe(false)
  })

  it('returns false once the user changes the pack name', () => {
    expect(isDefaultPackMeta({ ...DEFAULT_PACK_META, name: 'Cat Pack' })).toBe(false)
  })

  it('treats whitespace-only author as still empty', () => {
    expect(isDefaultPackMeta({ ...DEFAULT_PACK_META, author: '   ' })).toBe(true)
    expect(isDefaultPackMeta({ ...DEFAULT_PACK_META, author: '\t\n' })).toBe(true)
  })

  it('does not care about description / version / enablePickup', () => {
    expect(isDefaultPackMeta({
      ...DEFAULT_PACK_META,
      description: 'Anything',
      version: '99.0.0',
      enablePickup: false,
    })).toBe(true)
  })
})

const slotById = (id: string): SlotDef => {
  const s = SLOTS.find(s => s.slotId === id)
  if (!s) throw new Error(`unknown test slot: ${id}`)
  return s
}

describe('orientation helpers', () => {
  describe('getSlotDefaultOrientation', () => {
    it('returns portrait for an upright picture frame (atlasTile portrait, no rotation)', () => {
      // pictureFrame_01a is upright ~ atlasTile is portrait, no vanillaContentRotation.
      expect(getSlotDefaultOrientation(slotById('pictureFrame_01a'))).toBe('portrait')
    })

    it('returns landscape for a rotated picture frame (atlasTile portrait, CCW vanilla)', () => {
      // pictureFrame_01e was rotated CCW to fit a portrait frame; vanilla art
      // is landscape, so user default is landscape.
      expect(getSlotDefaultOrientation(slotById('pictureFrame_01e'))).toBe('landscape')
    })

    it('returns landscape for the bear frame (pictureFrame_01d)', () => {
      // v1.0.3 originally classified 01d as the CW outlier; v1.0.6 corrected
      // that to CCW after a user-reported upside-down render in-game (Frame
      // D was the only one visibly affected, confirming D's vanilla rotation
      // matches the other rotated slots, not the opposite). The default
      // orientation is still landscape ~ direction never affected which
      // orientation the user starts from, only the eventual composite rotation.
      expect(getSlotDefaultOrientation(slotById('pictureFrame_01d'))).toBe('landscape')
    })

    it('returns landscape for picture canvases (atlasTile already landscape)', () => {
      // Picture canvases have landscape atlasTiles ~ no flip needed in vanilla.
      expect(getSlotDefaultOrientation(slotById('pictureCanvas_01a'))).toBe('landscape')
    })

    it('returns portrait for movie posters (atlasTile portrait, no rotation)', () => {
      expect(getSlotDefaultOrientation(slotById('signPosterMovieMammasJustice'))).toBe('portrait')
    })
  })

  describe('getEffectiveOrientation', () => {
    it('returns the slot default when the user has not made an explicit choice', () => {
      const s = slotById('pictureFrame_01e')
      const state: SlotState = {}
      expect(getEffectiveOrientation(s, state)).toBe('landscape')
    })

    it('honors the user choice on flippable slots even when it matches the default', () => {
      const s = slotById('pictureFrame_01e')
      const state: SlotState = { orientation: 'landscape' }
      expect(getEffectiveOrientation(s, state)).toBe('landscape')
    })

    it('honors the user choice when it overrides the default', () => {
      const s = slotById('pictureFrame_01e') // default landscape
      const state: SlotState = { orientation: 'portrait' }
      expect(getEffectiveOrientation(s, state)).toBe('portrait')
    })

    it('ignores user choice on non-flippable kinds (portrait slots)', () => {
      const s = slotById('painting_ben') // kind: portrait, no flip
      const state: SlotState = { orientation: 'landscape' }
      expect(getEffectiveOrientation(s, state)).toBe('portrait')
    })
  })

  describe('getCompositeRotation', () => {
    it('returns undefined when user orientation matches the atlasTile aspect', () => {
      // Upright picture frame ~ tile is portrait, default is portrait, no rotation.
      const s = slotById('pictureFrame_01a')
      expect(getCompositeRotation(s, {})).toBeUndefined()
    })

    it('returns the slot vanillaContentRotation when user picks the opposite-of-tile orientation (CCW case)', () => {
      // pictureFrame_01e: tile portrait, default landscape. User on default
      // means we paint a landscape upload into a portrait tile ~ rotate CCW
      // to match the vanilla style.
      const s = slotById('pictureFrame_01e')
      expect(getCompositeRotation(s, {})).toBe('ccw')
    })

    it('returns CCW for the bear frame (pictureFrame_01d) ~ same as the other 9 rotated slots post-v1.0.6', () => {
      const s = slotById('pictureFrame_01d')
      expect(getCompositeRotation(s, {})).toBe('ccw')
    })

    it('returns undefined when user toggles back to portrait on a rotated-default slot', () => {
      const s = slotById('pictureFrame_01e') // tile portrait, default landscape
      const state: SlotState = { orientation: 'portrait' } // user wants upright
      expect(getCompositeRotation(s, state)).toBeUndefined()
    })

    it("falls back to CCW when an upright slot is toggled to landscape (no recorded vanilla rotation)", () => {
      const s = slotById('pictureFrame_01a') // upright; vanillaContentRotation is undefined
      const state: SlotState = { orientation: 'landscape' }
      expect(getCompositeRotation(s, state)).toBe('ccw')
    })
  })

  describe('slotSupportsOrientationFlip', () => {
    it('is true for canvasTile slots (picture frames + canvases)', () => {
      expect(slotSupportsOrientationFlip(slotById('pictureFrame_01a'))).toBe(true)
      expect(slotSupportsOrientationFlip(slotById('pictureCanvas_01a'))).toBe(true)
    })

    it('is true for moviePoster slots', () => {
      expect(slotSupportsOrientationFlip(slotById('signPosterMovieMammasJustice'))).toBe(true)
    })

    it('is false for portrait slots (composer rotation would clobber the wood-zone UV split)', () => {
      expect(slotSupportsOrientationFlip(slotById('painting_ben'))).toBe(false)
    })

    it('is false for abstract slots', () => {
      expect(slotSupportsOrientationFlip(slotById('paintingsAbstract01'))).toBe(false)
    })

    it('is false for decor slots (snack posters use meshUvBbox semantics that fight rotation)', () => {
      expect(slotSupportsOrientationFlip(slotById('signSnackPosterJerky'))).toBe(false)
    })
  })

  describe('vanillaContentRotation classification (smoke check)', () => {
    it('marks all 10 known-rotated picture frames as CCW', () => {
      // v1.0.3 originally split D off as a CW outlier based on a thumb-fix
      // direction that turned out to mean something different than the
      // composite rotation direction. v1.0.6 brought D in line with the
      // other 9 after user-confirmed in-game upside-down render on D only.
      const rotated = ['d', 'e', 'f', 'g', 'h', 'i', 'j', 'n', 'q', 'r']
      for (const letter of rotated) {
        const slotId = `pictureFrame_01${letter}`
        expect(slotById(slotId).vanillaContentRotation,
          `expected ${slotId} to be ccw`).toBe('ccw')
      }
    })

    it('leaves the 13 upright picture frames without a rotation marker', () => {
      const upright = ['a', 'b', 'c', 'k', 'l', 'm', 'o', 'p', 's', 't', 'u', 'v', 'w']
      for (const letter of upright) {
        const slotId = `pictureFrame_01${letter}`
        expect(slotById(slotId).vanillaContentRotation,
          `expected ${slotId} to be undefined`).toBeUndefined()
      }
    })
  })
})
