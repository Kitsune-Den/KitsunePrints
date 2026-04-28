import { SLOTS, type SlotState, type PackMeta } from '../types/slots'
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

export function BuilderPage({ slots, setSlots, meta, setMeta, appVersion }: Props) {
  const portraits = SLOTS.filter(s => s.kind === 'portrait')
  const abstracts = SLOTS.filter(s => s.kind === 'abstract')

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">
          🐱 KitsunePrints
        </h1>
        <p className="mt-2 text-zinc-400 max-w-2xl">
          Upload images, drop them into vanilla painting slots, download a complete modlet
          for 7 Days to Die V2.6. Every painting in every POI gets re-skinned with your art.
        </p>
        <p className="mt-1 text-xs text-zinc-600">v{appVersion}</p>
      </header>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-1">Backer portraits (1×1)</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Square photo, ~768×1024 portrait subject.
          The composer paints the left 25% with your frame color (vanilla&apos;s 3D wooden
          frame mesh wraps your photo).
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {portraits.map(slot => (
            <SlotCard
              key={slot.materialName}
              slot={slot}
              state={slots[slot.materialName]}
              onChange={(next) => setSlots(prev => ({ ...prev, [slot.materialName]: next }))}
            />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-1">Abstract scenes (2×2 + 3×2)</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Each abstract slot drives both the 2×2 (square frame) and 3×2 (wide frame)
          painting blocks. Wide images look best on 3×2; expect mild horizontal squish on 2×2.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {abstracts.map(slot => (
            <SlotCard
              key={slot.materialName}
              slot={slot}
              state={slots[slot.materialName]}
              onChange={(next) => setSlots(prev => ({ ...prev, [slot.materialName]: next }))}
            />
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Pack info</h2>
        <PackMetaForm meta={meta} setMeta={setMeta} />
      </section>

      <section className="mb-20">
        <DownloadButton slots={slots} meta={meta} />
      </section>

      <footer className="border-t border-zinc-800 pt-6 text-xs text-zinc-600 flex flex-wrap items-center justify-between gap-2">
        <p>
          Sister tool to <a className="underline hover:text-orange-400" href="https://paint.kitsuneden.net">paint.kitsuneden.net</a>.
          Modlet uses the shared <code className="font-mono">KitsunePrints.dll</code> Harmony patch.
          Requires 7DTD V2.6 with EAC disabled.
        </p>
        <a href="/terms" className="hover:text-orange-400 transition-colors">Terms &amp; Privacy</a>
      </footer>
    </div>
  )
}
