// Lightweight localStorage persistence for the builder. Files (uploaded images)
// can't be JSON-serialized, but everything else ~ titles, frame preset choices,
// and pack metadata ~ survives reloads. On reload the user sees their pack
// shape but has to re-upload images. Future enhancement: IndexedDB for files.

import type { PackMeta, SlotState } from '../types/slots'

const SLOTS_KEY = 'kp_slot_config_v1'
const META_KEY = 'kp_pack_meta_v1'

/** The serializable subset of a slot's state. */
type StoredSlotState = Pick<SlotState, 'title' | 'framePresetId'>

export function loadStoredSlots(
  defaults: Record<string, SlotState>,
): Record<string, SlotState> {
  try {
    const raw = localStorage.getItem(SLOTS_KEY)
    if (!raw) return defaults
    const stored = JSON.parse(raw) as Record<string, StoredSlotState>
    const merged: Record<string, SlotState> = {}
    for (const slotId in defaults) {
      merged[slotId] = {
        ...defaults[slotId],
        ...(stored[slotId] || {}),
      }
    }
    return merged
  } catch {
    return defaults
  }
}

export function saveSlots(slots: Record<string, SlotState>): void {
  try {
    const stripped: Record<string, StoredSlotState> = {}
    for (const slotId in slots) {
      const s = slots[slotId]
      const entry: StoredSlotState = {}
      if (s.title !== undefined) entry.title = s.title
      if (s.framePresetId !== undefined) entry.framePresetId = s.framePresetId
      stripped[slotId] = entry
    }
    localStorage.setItem(SLOTS_KEY, JSON.stringify(stripped))
  } catch {
    // localStorage may be unavailable (Safari private mode, quota etc.) ~ silently skip.
  }
}

export function loadStoredMeta(defaults: PackMeta): PackMeta {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return defaults
    const stored = JSON.parse(raw) as Partial<PackMeta>
    return { ...defaults, ...stored }
  } catch {
    return defaults
  }
}

export function saveMeta(meta: PackMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    // ignore
  }
}

export function clearStoredPack(): void {
  try {
    localStorage.removeItem(SLOTS_KEY)
    localStorage.removeItem(META_KEY)
  } catch {
    // ignore
  }
}
