import { useState } from 'react'
import { SLOTS, DEFAULT_FRAME_PRESET_ID, DEFAULT_PACK_META, type SlotState, type PackMeta } from './types/slots'
import { BuilderPage } from './pages/BuilderPage'
import IntroPage from './pages/IntroPage'
import TermsPage from './pages/TermsPage'

declare const __APP_VERSION__: string

function Builder() {
  const [slots, setSlots] = useState<Record<string, SlotState>>(() => {
    const init: Record<string, SlotState> = {}
    for (const s of SLOTS) {
      init[s.materialName] = s.kind === 'portrait' ? { framePresetId: DEFAULT_FRAME_PRESET_ID } : {}
    }
    return init
  })
  const [meta, setMeta] = useState<PackMeta>(DEFAULT_PACK_META)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <BuilderPage
        slots={slots}
        setSlots={setSlots}
        meta={meta}
        setMeta={setMeta}
        appVersion={__APP_VERSION__}
      />
    </div>
  )
}

export default function App() {
  const path = typeof window !== 'undefined' ? window.location.pathname : '/'
  if (path === '/app') return <Builder />
  if (path === '/terms') return <TermsPage />
  return <IntroPage />
}
