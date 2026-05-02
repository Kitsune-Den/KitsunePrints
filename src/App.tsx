import { useEffect, useState } from 'react'
import { SLOTS, DEFAULT_FRAME_PRESET_ID, DEFAULT_PACK_META, type SlotState, type PackMeta } from './types/slots'
import { BuilderPage } from './pages/BuilderPage'
import IntroPage from './pages/IntroPage'
import TermsPage from './pages/TermsPage'
import { loadStoredMeta, loadStoredSlots, saveMeta, saveSlots } from './utils/persistence'

declare const __APP_VERSION__: string

function Builder() {
  const [slots, setSlots] = useState<Record<string, SlotState>>(() => {
    const init: Record<string, SlotState> = {}
    for (const s of SLOTS) {
      // Portraits + picture-frame canvas tiles both default to a wood frame.
      const wantsFramePreset =
        s.kind === 'portrait' ||
        (s.kind === 'canvasTile' && s.slotId.startsWith('pictureFrame_01'))
      init[s.slotId] = wantsFramePreset ? { framePresetId: DEFAULT_FRAME_PRESET_ID } : {}
    }
    return loadStoredSlots(init)
  })
  const [meta, setMeta] = useState<PackMeta>(() => loadStoredMeta(DEFAULT_PACK_META))

  // Auto-persist slot titles + frame choices, and pack metadata, on every change.
  // Files aren't serializable so users still re-upload images on reload, but their
  // slot titles, frame preset picks, and pack info survive.
  useEffect(() => { saveSlots(slots) }, [slots])
  useEffect(() => { saveMeta(meta) }, [meta])

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
