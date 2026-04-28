import { useState, useCallback } from 'react'
import Cropper, { type Area } from 'react-easy-crop'

interface Props {
  /** The original image to crop. */
  imageUrl: string
  /** Aspect ratio for the crop frame: 3/4 for portraits, 1 for abstracts. */
  aspect: number
  /** Called with the cropped Blob when user clicks Done. */
  onDone: (croppedBlob: Blob) => void
  /** Called when user cancels (keeps original / closes dialog). */
  onCancel: () => void
}

export function CropDialog({ imageUrl, aspect, onDone, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleDone() {
    if (!croppedAreaPixels) return
    setBusy(true)
    try {
      const blob = await getCroppedBlob(imageUrl, croppedAreaPixels)
      onDone(blob)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="px-5 py-3 border-b border-zinc-800 flex items-baseline justify-between">
          <h3 className="font-medium">Crop image</h3>
          <span className="text-xs text-zinc-500">
            {aspect === 1 ? 'square' : `${Math.round(aspect * 4)}:4 portrait`}
          </span>
        </div>

        <div className="relative w-full" style={{ height: '60vh' }}>
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        <div className="px-5 py-4 border-t border-zinc-800 flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-zinc-400 flex-1">
            zoom
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-orange-500"
            />
            <span className="font-mono w-10 text-right">{zoom.toFixed(2)}x</span>
          </label>

          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={handleDone}
            disabled={busy || !croppedAreaPixels}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded text-sm font-medium"
          >
            {busy ? 'Cropping...' : 'Use crop'}
          </button>
        </div>
      </div>
    </div>
  )
}

async function getCroppedBlob(imageUrl: string, area: Area): Promise<Blob> {
  const img = await loadImage(imageUrl)
  const canvas = document.createElement('canvas')
  canvas.width = area.width
  canvas.height = area.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')

  ctx.drawImage(
    img,
    area.x, area.y, area.width, area.height,
    0, 0, area.width, area.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      'image/png',
    )
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}
