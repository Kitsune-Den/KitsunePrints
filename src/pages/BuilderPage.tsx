import { useMemo, useState } from 'react'
import { SLOTS, DEFAULT_FRAME_PRESET_ID, DEFAULT_PACK_META, type SlotDef, type SlotState, type PackMeta } from '../types/slots'
import { SlotCard } from '../components/SlotCard'
import { PackMetaForm } from '../components/PackMetaForm'
import { DownloadButton } from '../components/DownloadButton'
import { clearStoredPack } from '../utils/persistence'

interface Props {
  slots: Record<string, SlotState>
  setSlots: React.Dispatch<React.SetStateAction<Record<string, SlotState>>>
  meta: PackMeta
  setMeta: React.Dispatch<React.SetStateAction<PackMeta>>
  appVersion: string
}

type SlotTabId = 'portraits' | 'abstracts' | 'movie-posters' | 'misc-decor' | 'snack-posters' | 'picture-frames' | 'canvases'
type TabId = SlotTabId | 'pack-info'

interface SlotTabDef {
  id: SlotTabId
  label: string
  blurb: string
  filter: (s: SlotDef) => boolean
  gridCols: string
}

const SLOT_TABS: SlotTabDef[] = [
  {
    id: 'portraits',
    label: 'Portraits',
    blurb:
      "Square photo, ~768×1024 portrait subject. The composer paints the left 25% with your frame color (vanilla's 3D wooden frame mesh wraps your photo).",
    filter: (s) => s.kind === 'portrait',
    gridCols: 'grid-cols-2 md:grid-cols-3',
  },
  {
    id: 'abstracts',
    label: 'Abstracts',
    blurb:
      'Each abstract slot drives both the 2×2 (square frame) and 3×2 (wide frame) painting blocks. Wide images look best on 3×2; expect mild horizontal squish on 2×2.',
    filter: (s) => s.kind === 'abstract',
    gridCols: 'grid-cols-1 md:grid-cols-2',
  },
  {
    id: 'movie-posters',
    label: 'Movie Posters',
    blurb:
      'Each movie poster slot writes to a tile of the shared posterMovie atlas. Crops at ~3:4 portrait. Replacing one also re-skins its theater-wall variant automatically.',
    filter: (s) => s.kind === 'moviePoster',
    gridCols: 'grid-cols-2 md:grid-cols-4',
  },
  {
    id: 'misc-decor',
    label: 'Misc Decor',
    blurb:
      'Calendar, gun blueprints, target posters ~ standalone single-block decor. Each gets its own composed texture; the runtime DLL resets the material UV so your full image fills the canvas, even on slots that share an atlas in vanilla.',
    filter: (s) => s.kind === 'decor' && !s.slotId.startsWith('signSnackPoster'),
    gridCols: 'grid-cols-2 md:grid-cols-3',
  },
  {
    id: 'picture-frames',
    label: 'Picture Frames',
    blurb:
      "23 individual framed pictures (one per pictureFrame_01<letter> block) across 8 shared atlases. Each frame samples its own tile, so each can take its own image. Hidden-safe picture-frame disguises re-skin automatically since they extend their non-safe twin.",
    filter: (s) => s.kind === 'canvasTile' && s.slotId.startsWith('pictureFrame_01'),
    gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  },
  {
    id: 'canvases',
    label: 'Canvases',
    blurb:
      "10 individual canvas paintings (5 per shared atlas) ~ each block can take its own image since the composer writes per-tile into the shared 2048×2048 atlas. Aspect is ~16:9 widescreen since each tile is wider than tall.",
    filter: (s) => s.kind === 'canvasTile' && s.slotId.startsWith('pictureCanvas_01'),
    gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  },
  {
    id: 'snack-posters',
    label: 'Snack Posters',
    blurb:
      'The 17-poster snack-shop wall of fame ~ Thick Nick\'s Jerky, Goblin-O\'s, Atom Junkies, Health Bar, the lot. Each has its own material so they swap independently. The reference thumb shows the vanilla art for that slot.',
    filter: (s) => s.kind === 'decor' && s.slotId.startsWith('signSnackPoster'),
    gridCols: 'grid-cols-2 md:grid-cols-4 xl:grid-cols-5',
  },
]

type FilterMode = 'all' | 'unfilled'

export function BuilderPage({ slots, setSlots, meta, setMeta, appVersion }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('portraits')
  const [filterMode, setFilterMode] = useState<FilterMode>('all')

  // Memoized counts per slot tab so the badges update live.
  const counts = useMemo(() => {
    const result: Record<SlotTabId, { filled: number; total: number }> = {
      portraits: { filled: 0, total: 0 },
      abstracts: { filled: 0, total: 0 },
      'movie-posters': { filled: 0, total: 0 },
      'misc-decor': { filled: 0, total: 0 },
      'snack-posters': { filled: 0, total: 0 },
      'picture-frames': { filled: 0, total: 0 },
      canvases: { filled: 0, total: 0 },
    }
    for (const tab of SLOT_TABS) {
      const tabSlots = SLOTS.filter(tab.filter)
      result[tab.id] = {
        total: tabSlots.length,
        filled: tabSlots.filter((s) => slots[s.slotId]?.file).length,
      }
    }
    return result
  }, [slots])

  const totalFilled =
    counts.portraits.filled +
    counts.abstracts.filled +
    counts['movie-posters'].filled +
    counts['misc-decor'].filled +
    counts['snack-posters'].filled +
    counts['picture-frames'].filled +
    counts.canvases.filled
  const totalSlots =
    counts.portraits.total +
    counts.abstracts.total +
    counts['movie-posters'].total +
    counts['misc-decor'].total +
    counts['snack-posters'].total +
    counts['picture-frames'].total +
    counts.canvases.total

  // Slots visible in the active tab, after the filter pill.
  const visibleSlots = useMemo(() => {
    const tab = SLOT_TABS.find((t) => t.id === activeTab)
    if (!tab) return []
    const all = SLOTS.filter(tab.filter)
    if (filterMode === 'all') return all
    return all.filter((s) => !slots[s.slotId]?.file)
  }, [activeTab, filterMode, slots])

  const activeSlotTab = SLOT_TABS.find((t) => t.id === activeTab)
  const isSlotTab = !!activeSlotTab
  const hiddenByFilter =
    isSlotTab && filterMode === 'unfilled' && counts[activeTab as SlotTabId].filled

  function resetPack() {
    if (!confirm('Reset every slot title, frame choice, and pack info field back to defaults?\n\nUploaded images stay where they are (they\'re only in this browser session anyway).')) return
    clearStoredPack()
    const fresh: Record<string, SlotState> = {}
    for (const s of SLOTS) {
      fresh[s.slotId] = s.kind === 'portrait' ? { framePresetId: DEFAULT_FRAME_PRESET_ID } : {}
    }
    setSlots(fresh)
    setMeta(DEFAULT_PACK_META)
  }

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 py-10 pb-32">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">🐱 KitsunePrints</h1>
            <p className="mt-2 text-zinc-400 max-w-2xl">
              Upload images, drop them into vanilla painting slots, download a complete modlet
              for 7 Days to Die V2.6. Every painting in every POI gets re-skinned with your art.
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              v{appVersion}
              <span className="ml-3 inline-flex items-center gap-1 text-zinc-700">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                titles, frames &amp; pack info auto-saved in this browser
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={resetPack}
            className="text-xs text-zinc-500 hover:text-rose-300 border border-zinc-800 hover:border-rose-900 rounded px-3 py-1.5 transition-colors"
            title="Clear saved titles, frame choices, and pack info ~ images are session-only and stay until you reload."
          >
            Reset pack
          </button>
        </header>

        {/* Tab bar */}
        <div className="flex flex-wrap items-end gap-1 border-b border-zinc-800 mb-6">
          {SLOT_TABS.map((tab) => {
            const c = counts[tab.id]
            const complete = c.total > 0 && c.filled === c.total
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 ${
                  active
                    ? 'text-zinc-100 border-orange-400'
                    : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums ${
                    complete
                      ? 'bg-orange-500/20 text-orange-300'
                      : active
                      ? 'bg-zinc-800 text-zinc-200'
                      : 'bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {c.filled}/{c.total}
                </span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setActiveTab('pack-info')}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2 ${
              activeTab === 'pack-info'
                ? 'text-zinc-100 border-orange-400'
                : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            Pack info
          </button>
        </div>

        {/* Active tab content */}
        {isSlotTab && activeSlotTab ? (
          <section>
            <div className="flex items-start justify-between gap-4 mb-4">
              <p className="text-sm text-zinc-500 max-w-3xl">{activeSlotTab.blurb}</p>
              {/* Filter pill */}
              <div className="inline-flex shrink-0 rounded-full p-0.5 bg-zinc-900 border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    filterMode === 'all'
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('unfilled')}
                  className={`px-3 py-1 rounded-full transition-colors ${
                    filterMode === 'unfilled'
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Unfilled
                </button>
              </div>
            </div>

            {visibleSlots.length === 0 ? (
              <div className="border border-dashed border-zinc-800 rounded-lg p-8 text-center text-sm text-zinc-500">
                {filterMode === 'unfilled'
                  ? `Nice ~ every ${activeSlotTab.label.toLowerCase()} slot in this tab is filled. Switch to "All" to revisit one.`
                  : 'No slots in this category yet.'}
              </div>
            ) : (
              <div className={`grid gap-4 ${activeSlotTab.gridCols}`}>
                {visibleSlots.map((slot) => (
                  <SlotCard
                    key={slot.slotId}
                    slot={slot}
                    state={slots[slot.slotId]}
                    onChange={(next) =>
                      setSlots((prev) => ({ ...prev, [slot.slotId]: next }))
                    }
                  />
                ))}
              </div>
            )}

            {hiddenByFilter ? (
              <p className="mt-4 text-xs text-zinc-600">
                {hiddenByFilter} filled slot{hiddenByFilter === 1 ? '' : 's'} hidden by filter.
              </p>
            ) : null}
          </section>
        ) : (
          <section>
            <p className="text-sm text-zinc-500 mb-4 max-w-3xl">
              Name your pack, add an author credit, and pick a version number. These show up in
              the in-game mods list.
            </p>
            <PackMetaForm meta={meta} setMeta={setMeta} />
          </section>
        )}

        <footer className="mt-16 border-t border-zinc-800 pt-6 text-xs text-zinc-600 flex flex-wrap items-center justify-between gap-2">
          <p>
            Sister tool to{' '}
            <a className="underline hover:text-orange-400" href="https://paint.kitsuneden.net">
              paint.kitsuneden.net
            </a>
            . Modlet uses the shared <code className="font-mono">KitsunePrints.dll</code> Harmony
            patch. Requires 7DTD V2.6 with EAC disabled.
          </p>
          <a href="/terms" className="hover:text-orange-400 transition-colors">
            Terms &amp; Privacy
          </a>
        </footer>
      </div>

      {/* Sticky bottom bar ~ progress + download, always visible */}
      <div className="fixed bottom-0 inset-x-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800 z-40">
        <div className="max-w-6xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:block w-32 h-2 rounded-full bg-zinc-900 overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${totalSlots ? (totalFilled / totalSlots) * 100 : 0}%` }}
              />
            </div>
            <p className="text-sm text-zinc-400 whitespace-nowrap">
              <span className="text-zinc-100 font-medium tabular-nums">{totalFilled}</span>
              <span className="text-zinc-600"> / {totalSlots}</span> slots filled
            </p>
          </div>
          <DownloadButton slots={slots} meta={meta} />
        </div>
      </div>
    </>
  )
}
