import { useEffect, useRef, useState } from 'react'
import { FRAME_PRESETS, type SlotDef } from '../types/slots'
import { drawSwatchInto } from '../utils/livePreview'

interface Props {
  slot: SlotDef
  selectedId: string
  onChange: (id: string) => void
}

/**
 * Frame tint picker. Each swatch shows a fixed wood-region crop from the
 * current slot's vanilla atlas, multiply-tinted with that preset's hex.
 * What you see in the swatch is the same wood grain that ships in the
 * modlet ~ just at picker resolution.
 *
 * Slot-aware so cross-atlas wood pattern variation is honest (Frame A's
 * pictureFramed atlas has different grain than Frame P's pictureFramed6).
 * Slot-tile-agnostic so the six swatches in any one picker share an atlas
 * and read as a tint-family comparison.
 */
export function FramePresetPicker({ slot, selectedId, onChange }: Props) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-2">Frame</div>
      <div className="grid grid-cols-3 gap-2">
        {FRAME_PRESETS.map(preset => (
          <SwatchButton
            key={preset.id}
            slot={slot}
            presetId={preset.id}
            label={preset.label}
            selected={preset.id === selectedId}
            onClick={() => onChange(preset.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface SwatchButtonProps {
  slot: SlotDef
  presetId: string
  label: string
  selected: boolean
  onClick: () => void
}

// Render-resolution for the swatch canvas backing store. CSS sizes the
// element to fill the grid cell; this is the bitmap resolution it draws at.
const SWATCH_PX = 160

function SwatchButton({ slot, presetId, label, selected, onClick }: SwatchButtonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // While drawSwatchInto is in flight, show a small spinner overlaid on
  // the swatch. Mostly visible the very first time any picture-frame
  // swatch in the session renders, since subsequent swatches share the
  // tinted-atlas cache in livePreview.ts.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    setLoading(true)
    drawSwatchInto(canvas, slot, presetId).catch(() => {
      // Swallow ~ a failed swatch draw shows a blank canvas, which is a
      // mild degradation, not a crash. The preset still functions on click.
    }).finally(() => {
      if (cancelled) return
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [slot, presetId])

  // Selected ring uses a stronger border color + outline (zero layout cost),
  // not a thicker border. Keeps swatches from jumping when selection changes.
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`relative rounded overflow-hidden border transition-colors outline-none ${
        selected
          ? 'border-orange-500 outline outline-2 outline-orange-500/60 outline-offset-[-2px]'
          : 'border-zinc-800 hover:border-zinc-600'
      }`}
    >
      <canvas
        ref={canvasRef}
        width={SWATCH_PX}
        height={SWATCH_PX}
        className="block w-full h-12 object-cover"
        aria-label={label}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 pointer-events-none">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-700 border-t-zinc-300 animate-spin" />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[10px] text-zinc-300 px-1 py-0.5 truncate">
        {label}
      </div>
    </button>
  )
}
