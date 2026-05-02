import { useMemo, useState } from 'react'
import { SLOTS, type SlotDef, type SlotState, type PackMeta } from '../types/slots'
import { SlotCard } from '../components/SlotCard'
import { PackMetaForm } from '../components/PackMetaForm'
import { DownloadButton } from '../components/DownloadButton'

interface Props {
  slots: Record<string, SlotState>
  setSlots: React.Dispatch<React.SetStateAction<Record<string, SlotState>>>
  meta: PackMeta
  setMeta: React.Dispatch<React.SetStateAction<PackMeta>>
  appVersion: string
}

type SlotTabId = 'portraits' | 'abstracts'
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
    }
    for (const tab of SLOT_TABS) {
      const tabSlots = SLOTS.filter(tab.filter)
      result[tab.id] = {
        total: tabSlots.length,
        filled: tabSlots.filter((s) => slots[s.materialName]?.file).length,
      }
    }
    return result
  }, [slots])

  const totalFilled = counts.portraits.filled + counts.abstracts.filled
  const totalSlots = counts.portraits.total + counts.abstracts.total

  // Slots visible in the active tab, after the filter pill.
  const visibleSlots = useMemo(() => {
    const tab = SLOT_TABS.find((t) => t.id === activeTab)
    if (!tab) return []
    const all = SLOTS.filter(tab.filter)
    if (filterMode === 'all') return all
    return all.filter((s) => !slots[s.materialName]?.file)
  }, [activeTab, filterMode, slots])

  const activeSlotTab = SLOT_TABS.find((t) => t.id === activeTab)
  const isSlotTab = !!activeSlotTab
  const hiddenByFilter =
    isSlotTab && filterMode === 'unfilled' && counts[activeTab as SlotTabId].filled

  return (
    <>
      <div className="max-w-6xl mx-auto px-6 py-10 pb-32">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">🐱 KitsunePrints</h1>
          <p className="mt-2 text-zinc-400 max-w-2xl">
            Upload images, drop them into vanilla painting slots, download a complete modlet
            for 7 Days to Die V2.6. Every painting in every POI gets re-skinned with your art.
          </p>
          <p className="mt-1 text-xs text-zinc-600">v{appVersion}</p>
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
                    key={slot.materialName}
                    slot={slot}
                    state={slots[slot.materialName]}
                    onChange={(next) =>
                      setSlots((prev) => ({ ...prev, [slot.materialName]: next }))
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
