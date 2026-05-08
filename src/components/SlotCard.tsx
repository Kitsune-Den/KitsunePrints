import { useRef, useState } from 'react'
import type { SlotDef, SlotState } from '../types/slots'
import { DEFAULT_FRAME_PRESET_ID } from '../types/slots'
import { CropDialog } from './CropDialog'
import { FramePresetPicker } from './FramePresetPicker'

interface Props {
  slot: SlotDef
  state: SlotState
  onChange: (next: SlotState) => void
}

/**
 * Pick a thumb sizing class that matches the slot's actual aspect ratio.
 * Portrait slots get a 3:4 thumb; abstracts get 1:1; atlas-tile slots derive
 * from atlasTile dimensions and snap to one of three buckets:
 *   - aspect < 0.85   -> 3:4 portrait (w-9 h-12)
 *   - 0.85..1.2       -> 1:1 square   (w-12 h-12)
 *   - > 1.2           -> 16:9 wide    (w-16 h-9)
 */
function pickThumbClass(slot: SlotDef): string {
  if (slot.kind === 'portrait' || slot.kind === 'moviePoster') return 'w-9 h-12'
  if (slot.kind === 'decor') return 'w-10 h-12 object-contain'
  if (slot.kind === 'canvasTile' && slot.atlasTile) {
    const ratio = slot.atlasTile.w / slot.atlasTile.h
    if (ratio < 0.85) return 'w-9 h-12'
    if (ratio < 1.2) return 'w-12 h-12'
    return 'w-16 h-9'
  }
  return 'w-12 h-12'
}

/**
 * Compute the CSS aspect-ratio value for the upload drop zone. Returned
 * as a string ("w / h") for inline style use because the aspect can be
 * arbitrary ~ snack tiles are 410/512, Health Bar is 1638/512, picture
 * frame atlases vary per-letter ~ and Tailwind can only ship classes it
 * sees at build time. Inline style is the right tool for dynamic ratios.
 *
 * Mirrors what the cropper enforces below so the drop zone shape and
 * the crop frame shape stay in sync per slot.
 */
function getSlotAspectRatio(slot: SlotDef): string {
  if (slot.kind === 'portrait') return '3 / 4'
  if (slot.atlasTile) {
    return `${slot.atlasTile.w} / ${slot.atlasTile.h}`
  }
  return '1 / 1'
}

/**
 * Describe a slot's expected image dimensions in human-friendly form. Shown
 * as a tiny caption in the slot header so users know what aspect to crop /
 * what pixel size makes sense before uploading.
 *
 * Returns text like "3:4 portrait · 1024×1024" or "1:1 square · 1024×1024".
 * For atlas-tile slots, includes the actual tile pixel dimensions ~ that's
 * what the user's image will get composited into.
 */
function describeSlotDimensions(slot: SlotDef): string {
  // atlasTile is the most specific source of truth ~ it's the actual pixel
  // region the user's image will composite into (or, for decor slots that
  // share a vanilla atlas, the block aspect their image will stretch to
  // fill at runtime). Check it first regardless of kind.
  //
  // Important callout: snack-poster decor slots have atlasTile data even
  // though they're kind:'decor' ~ Health Bar (wide) is 1638×512 (~3:1),
  // most others are 410×512 (~4:5). Without this branch, all decor slots
  // showed "1:1 square · 1024×1024" which was wrong for ~all 17.
  if (slot.atlasTile) {
    const { w, h } = slot.atlasTile
    return `${aspectName(w, h)} · ${w}×${h}`
  }
  if (slot.kind === 'portrait') return '3:4 portrait · 1024×1024'
  if (slot.kind === 'abstract') return '1:1 square · 1024×1024'
  if (slot.kind === 'decor') return '1:1 square · 1024×1024'
  return ''
}

function aspectName(w: number, h: number): string {
  const r = w / h
  if (Math.abs(r - 0.75) < 0.05) return '3:4 portrait'
  if (Math.abs(r - 0.8) < 0.05) return '4:5 tall'
  if (Math.abs(r - 1) < 0.05) return '1:1 square'
  if (Math.abs(r - 4 / 3) < 0.05) return '4:3'
  if (Math.abs(r - 16 / 9) < 0.05) return '16:9 wide'
  if (r >= 2.5) return `~${Math.round(r)}:1 wide`
  return r < 1 ? `${(Math.round((1 / r) * 100) / 100)}:1 tall` : `${(Math.round(r * 100) / 100)}:1 wide`
}

export function SlotCard({ slot, state, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  // When non-null, we're showing the crop dialog for this URL.
  const [pendingCropUrl, setPendingCropUrl] = useState<string | null>(null)

  // Aspect for the crop frame:
  //   - portraits: 3:4 canvas zone
  //   - any slot with atlasTile (moviePoster, canvasTile, AND decor with
  //     a shared atlas like snack posters): derived from the tile size.
  //     Snack posters are decor + atlasTile, mostly 410×512 (4:5) with
  //     Health Bar an outlier at 1638×512 (~3:1 wide).
  //   - everything else (abstracts, standalone decor): square. The DLL
  //     resets UV scale to fill the canvas so square-cropped works.
  const aspect =
    slot.kind === 'portrait' ? 3 / 4
    : slot.atlasTile ? slot.atlasTile.w / slot.atlasTile.h
    : 1

  function handleFile(file: File) {
    // Stash the original as an object URL and open the cropper.
    const url = URL.createObjectURL(file)
    setPendingCropUrl(url)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleFile(file)
    }
  }

  function handleCropDone(blob: Blob) {
    // Replace the slot's file with the cropped blob.
    const file = new File([blob], 'cropped.png', { type: 'image/png' })
    const previewUrl = URL.createObjectURL(blob)
    onChange({ ...state, file, preview: previewUrl })
    if (pendingCropUrl) URL.revokeObjectURL(pendingCropUrl)
    setPendingCropUrl(null)
  }

  function handleCropCancel() {
    if (pendingCropUrl) URL.revokeObjectURL(pendingCropUrl)
    setPendingCropUrl(null)
  }

  function reCrop() {
    if (state.file) {
      const url = URL.createObjectURL(state.file)
      setPendingCropUrl(url)
    }
  }

  function replaceImage(e: React.MouseEvent) {
    e.stopPropagation()
    fileRef.current?.click()
  }

  function clearImage(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(slot.kind === 'portrait' ? { framePresetId: state.framePresetId } : {})
  }

  return (
    <>
      <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/40">
        <div className="flex items-center gap-3 mb-3">
          <img
            src={`/vanilla/${slot.slotId}.webp`}
            alt={`Vanilla ${slot.label}`}
            loading="lazy"
            className={`${pickThumbClass(slot)} object-cover rounded border border-zinc-700/60 flex-shrink-0 bg-zinc-950/60`}
            title={`You'll be replacing this in-game (${slot.slotId})`}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{slot.label}</h3>
            <div className="text-xs text-zinc-500 truncate">
              replacing <code className="text-zinc-400">{slot.slotId}</code>
            </div>
            <div className="text-[11px] text-zinc-600 mt-0.5 truncate">
              {describeSlotDimensions(slot)}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-xs text-zinc-500 mb-1">
            Title <span className="text-zinc-700">(searchable in creative menu as &quot;Print: <em>your title</em>&quot;)</span>
          </label>
          <input
            type="text"
            value={state.title || ''}
            onChange={(e) => onChange({ ...state, title: e.target.value })}
            placeholder={slot.label}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-100 focus:border-zinc-600 outline-none"
          />
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="bg-zinc-950 border-2 border-dashed border-zinc-700 rounded cursor-pointer flex items-center justify-center overflow-hidden hover:border-zinc-500 transition-colors"
          style={{ aspectRatio: getSlotAspectRatio(slot) }}
        >
          {state.preview ? (
            <img src={state.preview} alt={slot.label} className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-zinc-600 px-4">
              <div className="text-3xl mb-2">+</div>
              <div className="text-xs">drop image or click</div>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            // reset so the same file can be re-selected later
            e.target.value = ''
          }}
        />

        {slot.kind === 'portrait' && (
          <div className="mt-3">
            <FramePresetPicker
              selectedId={state.framePresetId || DEFAULT_FRAME_PRESET_ID}
              onChange={(id) => onChange({ ...state, framePresetId: id })}
            />
          </div>
        )}

        {slot.kind === 'canvasTile' && slot.slotId.startsWith('pictureFrame_01') && (
          <div className="mt-3">
            <FramePresetPicker
              selectedId={state.framePresetId || DEFAULT_FRAME_PRESET_ID}
              onChange={(id) => onChange({ ...state, framePresetId: id })}
            />
            <p className="mt-1 text-[10px] text-zinc-600 leading-tight">
              Wood frame tint ~ shared with sibling frames in this style group
              (vanilla atlas means letters in the same atlas all share the
              wood region).
            </p>
          </div>
        )}

        {state.preview && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={replaceImage}
              className="flex items-center justify-center gap-1.5 h-9 px-2 text-xs font-medium text-zinc-200 bg-zinc-800/60 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded transition-colors"
              title="Pick a different image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Replace
            </button>
            <button
              type="button"
              onClick={reCrop}
              className="flex items-center justify-center gap-1.5 h-9 px-2 text-xs font-medium text-zinc-200 bg-zinc-800/60 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded transition-colors"
              title="Re-crop the same image"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                <path d="M18 22V8a2 2 0 0 0-2-2H2" />
              </svg>
              Re-crop
            </button>
            <button
              type="button"
              onClick={clearImage}
              className="flex items-center justify-center gap-1.5 h-9 px-2 text-xs font-medium text-zinc-400 hover:text-rose-300 bg-zinc-800/60 hover:bg-rose-950/40 border border-zinc-700 hover:border-rose-900 rounded transition-colors"
              title="Remove this image (keeps your title and frame choice)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              </svg>
              Clear
            </button>
          </div>
        )}
      </div>

      {pendingCropUrl && (
        <CropDialog
          imageUrl={pendingCropUrl}
          aspect={aspect}
          onDone={handleCropDone}
          onCancel={handleCropCancel}
        />
      )}
    </>
  )
}
