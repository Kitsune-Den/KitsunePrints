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

export function SlotCard({ slot, state, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  // When non-null, we're showing the crop dialog for this URL.
  const [pendingCropUrl, setPendingCropUrl] = useState<string | null>(null)

  // Aspect for the crop frame: portraits go on a 3:4 canvas zone, abstracts square.
  const aspect = slot.kind === 'portrait' ? 3 / 4 : 1

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

  return (
    <>
      <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/40">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="font-medium">{slot.label}</h3>
          <code className="text-xs text-zinc-500">{slot.materialName}</code>
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
          className="aspect-square bg-zinc-950 border-2 border-dashed border-zinc-700 rounded cursor-pointer flex items-center justify-center overflow-hidden hover:border-zinc-500 transition-colors"
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

        {state.preview && (
          <div className="mt-3 flex gap-3">
            <button
              onClick={reCrop}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              re-crop
            </button>
            <button
              onClick={() => onChange(slot.kind === 'portrait' ? { framePresetId: state.framePresetId } : {})}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              clear
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
