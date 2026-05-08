import { useEffect, useRef, useState } from 'react'
import type { SlotDef, SlotState, SlotOrientation } from '../types/slots'
import {
  ATLAS_SOURCES,
  DEFAULT_FRAME_PRESET_ID,
  getEffectiveOrientation,
  getSlotDefaultOrientation,
  slotSupportsOrientationFlip,
} from '../types/slots'
import { CropDialog } from './CropDialog'
import { FramePresetPicker } from './FramePresetPicker'
import { drawSlotPreviewInto } from '../utils/livePreview'
import { useInViewport } from '../utils/useInViewport'

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
/**
 * Compute the slot's "visible" aspect ratio + pixel dimensions ~ what the
 * user actually sees in-game.
 *
 * For decor slots with a meshUvBbox, the mesh samples only a sub-region of
 * the output texture (e.g. Bretzels samples UV 0,0->0.5,1, so visible is
 * 1021x2048 not the 410x512 atlasTile). For those slots the bbox is the
 * source of truth ~ atlasTile is just where the vanilla art lived in the
 * shared atlas, which has nothing to do with the in-game block aspect.
 *
 * For everything else, fall back to atlasTile dimensions, or kind-based
 * defaults for portrait/abstract.
 */
const UV_BBOX_OUTPUT_SIZE = 2048

function getVisibleDims(slot: SlotDef): { w: number; h: number } | null {
  if (slot.meshUvBbox) {
    const { l, t, r, b } = slot.meshUvBbox
    const w = Math.round((r - l) * UV_BBOX_OUTPUT_SIZE)
    const h = Math.round((b - t) * UV_BBOX_OUTPUT_SIZE)
    return { w, h }
  }
  if (slot.atlasTile) return { w: slot.atlasTile.w, h: slot.atlasTile.h }
  if (slot.kind === 'portrait') return { w: 3, h: 4 } // ratio only
  return null // abstract / standalone decor: square fallback
}

/**
 * Visible dims for the slot at the user's CHOSEN orientation. For slots
 * that support flip, this swaps w/h when the user's effective orientation
 * differs from the atlasTile's native aspect. Used to drive the cropper
 * frame, drop-zone aspect, and live-preview backing-store dimensions ~
 * everything that visualizes the user's image at their picked orientation.
 */
function getOrientedDims(slot: SlotDef, state: SlotState): { w: number; h: number } | null {
  const dims = getVisibleDims(slot)
  if (!dims) return null
  if (!slotSupportsOrientationFlip(slot)) return dims
  const orient = getEffectiveOrientation(slot, state)
  const dimsArePortrait = dims.h > dims.w
  const userPortrait = orient === 'portrait'
  if (dimsArePortrait === userPortrait) return dims
  return { w: dims.h, h: dims.w }
}

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
function getSlotAspectRatio(slot: SlotDef, state: SlotState): string {
  // Drop zone uses the actually-visible aspect, swapped when the user has
  // toggled orientation on a flippable slot. Portrait slots are fixed 3:4
  // ~ no flip available there.
  if (slot.kind === 'portrait') return '3 / 4'
  const dims = getOrientedDims(slot, state)
  if (dims) return `${dims.w} / ${dims.h}`
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
  // Visible region is the source of truth for what to crop to. For snack
  // posters and other meshUvBbox slots, that's the bbox-derived dimensions;
  // for everything else, atlasTile or kind-based defaults.
  const dims = getVisibleDims(slot)
  if (dims) {
    // Portrait kind uses ratio-only dims (3:4) ~ format with the canonical
    // 1024×1024 source size since that's what the composer outputs for portraits.
    if (slot.kind === 'portrait') return '3:4 portrait · 1024×1024'
    return `${aspectName(dims.w, dims.h)} · ${dims.w}×${dims.h}`
  }
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

/**
 * True if this slot should render the live atlas-composited preview in its
 * drop zone. Picture frames (and any other shared-atlas tile slot with a
 * frame tint zone) qualify ~ for those, the user picks a tint and we can
 * show what the wood will actually look like. Other slots fall back to the
 * straight image preview.
 *
 * The check needs ATLAS_SOURCES + atlasTile so the live preview helper has
 * something to crop, AND a frame tint capability so picking presets means
 * something here. Slots without frameTintHeightPct (e.g. movie posters,
 * picture canvases) just show the image.
 */
function slotHasLiveFramePreview(slot: SlotDef): boolean {
  if (!slot.atlasTile) return false
  const source = ATLAS_SOURCES[slot.materialName]
  return Boolean(source?.frameTintHeightPct)
}

/**
 * Frame-tint slots that show the picker. Currently the pictureFrame_01<letter>
 * family ~ those samples on a wood-frame atlas with a real tint zone. Kept
 * as a function so the rule can grow without re-touching the JSX.
 */
function slotShowsFramePicker(slot: SlotDef): boolean {
  if (slot.kind === 'portrait') return true
  if (slot.kind === 'canvasTile' && slot.slotId.startsWith('pictureFrame_01')) return true
  return false
}

export function SlotCard({ slot, state, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  // When non-null, we're showing the crop dialog for this URL.
  const [pendingCropUrl, setPendingCropUrl] = useState<string | null>(null)

  // Lazy-render the expensive bits (LiveSlotPreview + FramePresetPicker
  // swatches both compose 2048×2048 atlases) until the card is near the
  // viewport. Cards above the fold render immediately ~ cards below
  // render as the user scrolls. Big win on the picture-frames tab where
  // we have 23 cards mounting at once.
  const [cardRef, isVisible] = useInViewport('300px')

  // Aspect for the crop frame:
  //   - portraits: 3:4 canvas zone (no flip available here)
  //   - any slot with atlasTile (moviePoster, canvasTile, decor with a
  //     shared atlas): derived from the tile size, swapped when the
  //     user's effective orientation differs from the atlasTile's
  //     native aspect (only happens on flippable slots).
  //   - everything else (abstracts, standalone decor): square.
  // Crop aspect tracks the drop-zone aspect 1:1 so the cropping frame
  // shape matches what the user just dropped onto.
  const aspect = (() => {
    if (slot.kind === 'portrait') return 3 / 4
    const dims = getOrientedDims(slot, state)
    if (dims) return dims.w / dims.h
    return 1
  })()

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
    // Preserve the user's framePresetId + orientation across a clear so a
    // re-upload remembers the picker state they had set up.
    const preserved: SlotState = {}
    if (state.framePresetId) preserved.framePresetId = state.framePresetId
    if (state.orientation) preserved.orientation = state.orientation
    onChange(preserved)
  }

  function setOrientation(next: SlotOrientation) {
    // Persist explicit choice even when it matches the slot's default ~
    // signals "user picked this, don't auto-flip if defaults change."
    onChange({ ...state, orientation: next })
  }

  return (
    <>
      <div ref={cardRef} className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/40">
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

        {slotSupportsOrientationFlip(slot) && (
          <OrientationToggle
            slot={slot}
            state={state}
            onChange={setOrientation}
          />
        )}

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="bg-zinc-950 border-2 border-dashed border-zinc-700 rounded cursor-pointer flex items-center justify-center overflow-hidden hover:border-zinc-500 transition-colors"
          style={{ aspectRatio: getSlotAspectRatio(slot, state) }}
        >
          {slotHasLiveFramePreview(slot) ? (
            isVisible ? (
              <LiveSlotPreview
                slot={slot}
                state={state}
                framePresetId={state.framePresetId || DEFAULT_FRAME_PRESET_ID}
                hasImage={Boolean(state.preview)}
              />
            ) : (
              // Pre-visibility placeholder. Same drop-zone shape; quiet
              // "loading textures…" so the card doesn't read as broken
              // while the user scrolls into view.
              <SwatchSkeleton label="Loading textures…" />
            )
          ) : state.preview ? (
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

        {slotShowsFramePicker(slot) && (
          <div className="mt-3">
            {isVisible ? (
              <FramePresetPicker
                slot={slot}
                selectedId={state.framePresetId || DEFAULT_FRAME_PRESET_ID}
                onChange={(id) => onChange({ ...state, framePresetId: id })}
              />
            ) : (
              // Six greybox swatches matching the picker's grid layout.
              // Visible long enough that the user senses "swatches coming"
              // rather than "swatches missing." Replaced with the real
              // picker as soon as the card scrolls into view.
              <FramePickerSkeleton />
            )}
            {slot.kind === 'canvasTile' && (
              <p className="mt-1 text-[10px] text-zinc-600 leading-tight">
                Wood frame tint ~ shared with sibling frames in this style group
                (vanilla atlas means letters in the same atlas all share the
                wood region).
              </p>
            )}
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

interface LiveSlotPreviewProps {
  slot: SlotDef
  state: SlotState
  framePresetId: string
  hasImage: boolean
}

// Backing-store resolution. Tile is up to 735×898 in atlas pixels; we render
// at native tile resolution for crispness, and CSS scales it to fit the
// drop zone. Backing dimensions follow the user's effective orientation so
// the wood-frame border draws at the same aspect the drop zone displays.
function previewBackingSize(slot: SlotDef, state: SlotState): { w: number; h: number } {
  const dims = getOrientedDims(slot, state)
  if (dims) {
    if (slot.atlasTile) return dims  // already pixel-sized from atlasTile
    return { w: 512, h: 512 }
  }
  if (slot.atlasTile) return { w: slot.atlasTile.w, h: slot.atlasTile.h }
  return { w: 512, h: 512 }
}

/**
 * Live atlas-composited preview rendered into a canvas. Re-runs whenever
 * the file or frame tint changes. While re-rendering or when no image has
 * been uploaded yet, shows the empty-state hint over the canvas.
 *
 * Calls drawSlotPreviewInto, which routes through composeAtlas ~ the same
 * function the modlet build uses. So this preview is byte-identical to
 * what ships in the zip, just shrunk to drop-zone size.
 *
 * Loading state: while drawSlotPreviewInto is in flight (most expensive
 * the first time per atlas/tint combo when the 1.5 MB vanilla webp must
 * fetch + composite), shows "Loading textures…" instead of the empty-
 * state hint. Repeat tints in the same session hit livePreview's
 * in-memory cache and finish quickly enough that the indicator barely
 * flashes ~ that's the desired UX.
 */
function LiveSlotPreview({ slot, state, framePresetId, hasImage }: LiveSlotPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { w, h } = previewBackingSize(slot, state)
  const file = state.file
  const orientation = getEffectiveOrientation(slot, state)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    setLoading(true)
    // Pass the chosen orientation so drawSlotPreviewInto knows how to
    // shape the wood-border + image fit. The user's file is already
    // cropped to the chosen aspect by CropDialog, so no rotation is
    // applied IN the preview ~ the modlet build path applies rotation
    // separately when painting into the (still portrait) atlasTile.
    drawSlotPreviewInto(canvas, slot, framePresetId, file, orientation).catch(() => {
      // A failed preview shouldn't break the upload affordance ~ the canvas
      // just stays blank and the empty-state hint above takes over visually.
    }).finally(() => {
      if (cancelled) return
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [slot, framePresetId, file, orientation])

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={w}
        height={h}
        className="w-full h-full block"
      />
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 backdrop-blur-[1px] pointer-events-none">
          <div className="text-center text-zinc-300 px-4 bg-black/50 rounded py-2 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-600 border-t-zinc-300 animate-spin" />
            <span className="text-xs">Loading textures…</span>
          </div>
        </div>
      ) : !hasImage ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-zinc-300 px-4 bg-black/40 rounded py-2">
            <div className="text-3xl mb-1 leading-none">+</div>
            <div className="text-xs">drop image or click</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Pre-visibility placeholder for a slot whose live preview hasn't been
 * mounted yet (lazy-render via IntersectionObserver). Same dimensions as
 * the drop zone so the card doesn't reflow when the real preview swaps in.
 */
function SwatchSkeleton({ label }: { label: string }) {
  return (
    <div className="relative w-full h-full bg-zinc-950 flex items-center justify-center">
      <div className="text-center text-zinc-500 px-4 flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin" />
        <span className="text-xs">{label}</span>
      </div>
    </div>
  )
}

/**
 * Two-state Vertical/Horizontal toggle for slots that support orientation
 * flip. Default highlight follows the slot's vanillaContentRotation
 * (rotated-landscape vanilla → defaults to Horizontal; everything else →
 * defaults to Vertical or whichever matches the atlasTile aspect). User's
 * explicit choice persists in state.orientation and overrides the default.
 */
interface OrientationToggleProps {
  slot: SlotDef
  state: SlotState
  onChange: (next: SlotOrientation) => void
}

function OrientationToggle({ slot, state, onChange }: OrientationToggleProps) {
  const current = getEffectiveOrientation(slot, state)
  const def = getSlotDefaultOrientation(slot)
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Orientation</span>
        <div className="inline-flex rounded border border-zinc-700 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => onChange('portrait')}
            className={`px-2.5 py-1 transition-colors ${
              current === 'portrait'
                ? 'bg-amber-600/30 text-amber-200'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
            title={def === 'portrait' ? 'Vertical (matches vanilla)' : 'Vertical'}
          >
            ▯ Vertical
          </button>
          <button
            type="button"
            onClick={() => onChange('landscape')}
            className={`px-2.5 py-1 transition-colors border-l border-zinc-700 ${
              current === 'landscape'
                ? 'bg-amber-600/30 text-amber-200'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
            }`}
            title={def === 'landscape' ? 'Horizontal (matches vanilla)' : 'Horizontal'}
          >
            ▭ Horizontal
          </button>
        </div>
        {state.orientation && state.orientation !== def && (
          <span className="text-[10px] text-zinc-600 italic">
            (vanilla is {def})
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Pre-visibility placeholder for the 6-swatch frame picker. Mirrors the
 * picker's 3-column grid so the card doesn't change height when the real
 * picker mounts in.
 */
function FramePickerSkeleton() {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-2">Frame</div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded border border-zinc-800 bg-zinc-900/40 h-12 animate-pulse"
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}
