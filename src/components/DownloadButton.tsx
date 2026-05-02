import { useState } from 'react'
import { SLOTS, isDefaultPackMeta, type SlotState, type PackMeta } from '../types/slots'
import { buildModlet } from '../utils/buildModlet'

interface Props {
  slots: Record<string, SlotState>
  meta: PackMeta
  /** Called when the user clicks Download but the Pack Info still has
   *  default values ~ BuilderPage uses this to switch to the Pack Info tab
   *  so the user can fill in name/author before building. */
  onRequestPackInfo?: () => void
}

export function DownloadButton({ slots, meta, onRequestPackInfo }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsPackInfo, setNeedsPackInfo] = useState(false)

  const filledCount = SLOTS.filter(s => slots[s.slotId]?.file).length

  async function handleDownload() {
    // If the pack metadata is still at defaults, nudge the user to fill it in
    // first ~ don't auto-build a pack called "My Picture Pack" by an unnamed
    // author. Switch to the Pack Info tab and let them confirm.
    if (isDefaultPackMeta(meta)) {
      setNeedsPackInfo(true)
      onRequestPackInfo?.()
      return
    }
    setNeedsPackInfo(false)
    setBusy(true)
    setError(null)
    try {
      const blob = await buildModlet(slots, meta)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = meta.name.replace(/[^a-z0-9_-]/gi, '_')
      a.download = `${safeName}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      // Fire-and-forget anonymous build counter ping. No image data,
      // filenames, or PII ~ just the slot count for the public stats line.
      fetch('/api/built', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: filledCount }),
      }).catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build modlet')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={handleDownload}
        disabled={busy || filledCount === 0}
        className="px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed rounded font-medium transition-colors"
      >
        {busy ? 'Building...' : `Download modlet (${filledCount}/${SLOTS.length} slots filled)`}
      </button>
      {filledCount === 0 && (
        <p className="text-xs text-zinc-500">Upload at least one image to enable download.</p>
      )}
      {needsPackInfo && (
        <p className="text-xs text-orange-400">Set your pack name + author first ~ check the Pack Info tab.</p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
