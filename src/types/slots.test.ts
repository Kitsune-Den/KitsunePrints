import { describe, it, expect } from 'vitest'
import { isDefaultPackMeta, DEFAULT_PACK_META } from './slots'

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
