import { useState } from 'react'
import { SLOTS, type SlotState, type PackMeta } from '../types/slots'
import { buildModlet } from '../utils/buildModlet'

interface Props {
  slots: Record<string, SlotState>
  meta: PackMeta
}

export function DownloadButton({ slots, meta }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filledCount = SLOTS.filter(s => slots[s.slotId]?.file).length

  async function handleDownload() {
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
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
