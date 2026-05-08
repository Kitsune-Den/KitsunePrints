// Live preview composition for slot drop zones and frame picker swatches.
// Uses the same composer.ts code path the modlet build uses for the tinted-
// atlas layer ~ what you see in the wood is byte-identical to what ships
// in the zip's frame-zone pixels.
//
// Two products:
//   - drawSwatchInto(canvas, slot, framePresetId): renders a frame-tint
//     swatch. Branches on slot kind:
//       * portrait slots ~ paints the preset's imagePath PNG (the 256×1024
//         strip that wraps the 3D wood frame mesh in-game). Same source
//         the old <img> swatches used; rendered into a canvas for
//         consistency with the picture-frame path.
//       * canvasTile picture-frame slots ~ a fixed wood-region crop from
//         the slot's tinted atlas, so the six swatches read as "tint
//         families" rather than abstract striped patterns.
//       * anything else without a usable source ~ leaves the canvas blank.
//   - drawSlotPreviewInto(canvas, slot, framePresetId, file?): the slot's
//     canvas tile, optionally with the user's image, surrounded by a
//     simulated wood-frame border sourced from the same tinted atlas.
//     IMPORTANT: this is a *visualization* of how the block looks in-game,
//     not a 1:1 of the modlet's output texture. The modlet outputs only
//     the canvas tile region; the wood molding visible in-game comes from
//     the surrounding 3D mesh sampling other parts of the atlas. We
//     simulate that mesh contribution here so users get a "what it'll
//     look like on the wall" preview rather than a raw canvas crop.
//
// Both share a memo on (materialName, tint) so all six swatches plus the
// drop zone preview only force the atlas through composeAtlas once per
// tint variant. The cache lives for the lifetime of the page.

import {
  ATLAS_SOURCES,
  FRAME_PRESETS,
  DEFAULT_FRAME_PRESET_ID,
  type SlotDef,
  type FramePreset,
  type SlotOrientation,
} from '../types/slots'
import { composeAtlas } from './composer'

// Pixel rect inside the wood-frame zone that's reliably wood-grain across
// every pictureFramed* atlas. Sampled from the middle of the top 55% so
// edge artifacts and mitre corners aren't in shot.
const SWATCH_SAMPLE = { x: 900, y: 400, w: 240, h: 240 }

// Pixel rect for the simulated frame border. Same sampling philosophy as
// SWATCH_SAMPLE but a longer, slightly taller strip ~ we'll project this
// onto the four border sides at preview resolution.
const BORDER_SAMPLE = { x: 200, y: 350, w: 1400, h: 320 }

// Frame border thickness as a fraction of the preview's shorter dimension.
// Real-life picture frames sit around 6–10% depending on style; 9% reads
// as "ornate-ish" without crowding the canvas.
const BORDER_THICKNESS_PCT = 0.09

// Cache: tinted full atlases (NO user image) keyed by `${materialName}|${tint}`.
// Stored as Promise<HTMLCanvasElement> so concurrent first-callers all share
// the in-flight fetch ~ a fresh slot card with 6 swatches only triggers one
// atlas load, not six. Promise resolves to a canvas we can drawImage from.
const _tintedAtlasCache = new Map<string, Promise<HTMLCanvasElement>>()

// Cache: portrait frame-strip PNGs (preset.imagePath -> HTMLImageElement)
// loaded once and reused for every portrait swatch. Mirrors the pattern in
// composer.ts loadFrameTexture, kept separate to avoid coupling.
const _frameStripCache = new Map<string, Promise<HTMLImageElement>>()

/** Resolve a preset id to its preset record, falling back to default. */
function resolvePreset(framePresetId: string | undefined): FramePreset {
  return (
    FRAME_PRESETS.find(p => p.id === framePresetId) ??
    FRAME_PRESETS.find(p => p.id === DEFAULT_FRAME_PRESET_ID) ??
    FRAME_PRESETS[0]
  )
}

/** Resolve a preset id to its tint hex (or undefined for "no tint"). */
function resolveTint(framePresetId: string | undefined): string | undefined {
  return resolvePreset(framePresetId).tint
}

/**
 * Run composeAtlas with no entries to get the vanilla atlas + tint applied,
 * with the result captured as a canvas. Memoized per (materialName, tint).
 *
 * We use composeAtlas directly so the tint blend mode + zone height stay in
 * lockstep with whatever the modlet build does. Empty entries means no
 * user image is painted; this is intentional ~ the slot-with-image path
 * composites the image client-side at preview resolution rather than
 * paying for a full 2048×2048 atlas re-bake on every tint flip.
 */
async function getTintedAtlas(
  materialName: string,
  tint: string | undefined,
): Promise<HTMLCanvasElement> {
  const key = `${materialName}|${tint ?? ''}`
  let inflight = _tintedAtlasCache.get(key)
  if (inflight) return inflight

  inflight = (async () => {
    const blob = await composeAtlas(materialName, [], tint)
    const url = URL.createObjectURL(blob)
    try {
      const img = await loadImageFromUrl(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas 2d context unavailable')
      ctx.drawImage(img, 0, 0)
      return canvas
    } finally {
      URL.revokeObjectURL(url)
    }
  })()

  _tintedAtlasCache.set(key, inflight)
  return inflight
}

async function getFrameStrip(imagePath: string): Promise<HTMLImageElement> {
  let inflight = _frameStripCache.get(imagePath)
  if (inflight) return inflight
  inflight = loadImageFromUrl(imagePath)
  _frameStripCache.set(imagePath, inflight)
  return inflight
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

/**
 * Render the swatch for a frame picker entry. Branches on slot kind so
 * portrait slots get their PNG strip and picture-frame slots get their
 * tinted atlas wood region.
 */
export async function drawSwatchInto(
  canvas: HTMLCanvasElement,
  slot: SlotDef,
  framePresetId: string,
): Promise<HTMLCanvasElement> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  // Portrait swatches: render the preset's vertical strip image. Strip
  // dimensions are 256×1024; the swatch is wider-than-tall (~3:1) so we
  // crop a horizontal slice from the strip's vertical middle.
  if (slot.kind === 'portrait') {
    const preset = resolvePreset(framePresetId)
    try {
      const img = await getFrameStrip(preset.imagePath)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Crop a centered slice that's the same aspect as the canvas so the
      // wood pattern reads as a flat fragment, not a stretched strip.
      const dstRatio = canvas.width / canvas.height
      let sw = img.width
      let sh = sw / dstRatio
      if (sh > img.height) {
        sh = img.height
        sw = sh * dstRatio
      }
      const sx = (img.width - sw) / 2
      const sy = (img.height - sh) / 2
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    } catch {
      // Failed strip load ~ leave blank rather than crash.
    }
    return canvas
  }

  // Picture-frame swatches: tinted atlas wood region.
  const source = ATLAS_SOURCES[slot.materialName]
  if (!source) return canvas

  const tint = resolveTint(framePresetId)
  const atlas = await getTintedAtlas(slot.materialName, tint)

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(
    atlas,
    SWATCH_SAMPLE.x, SWATCH_SAMPLE.y, SWATCH_SAMPLE.w, SWATCH_SAMPLE.h,
    0, 0, canvas.width, canvas.height,
  )
  return canvas
}

/**
 * Render the live drop-zone preview for a slot: the canvas tile (with the
 * user's image, if uploaded) wrapped in a simulated wood-frame border
 * sourced from the tinted atlas. The result is a "what it'll look like in
 * the world" visualization, not a raw modlet-output crop.
 */
export async function drawSlotPreviewInto(
  canvas: HTMLCanvasElement,
  slot: SlotDef,
  framePresetId: string | undefined,
  file: File | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _orientation?: SlotOrientation,
): Promise<HTMLCanvasElement> {
  // The orientation argument is currently informational ~ the canvas's
  // backing-store dimensions are sized by the caller (see SlotCard's
  // previewBackingSize), so the wood-frame border + cover-fit math here
  // already shape themselves to whatever aspect the canvas has. We accept
  // the param so the caller can drive useEffect dependencies cleanly,
  // and so future preview-side rotation tricks have a place to land.
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const W = canvas.width
  const H = canvas.height
  const source = ATLAS_SOURCES[slot.materialName]

  // Slots without a shared atlas (portraits, standalone decor) ~ honest
  // fallback to current behavior, just draw the raw image.
  if (!source || !slot.atlasTile) {
    ctx.clearRect(0, 0, W, H)
    if (file) {
      const img = await loadImageFromFile(file)
      drawCover(ctx, img, 0, 0, W, H)
    }
    return canvas
  }

  ctx.clearRect(0, 0, W, H)

  // Inner canvas zone (image-bearing area).
  const t = Math.round(Math.min(W, H) * BORDER_THICKNESS_PCT)
  const ix = t, iy = t, iw = W - t * 2, ih = H - t * 2

  // 1. Inner canvas region: vanilla canvas-zone color + user image.
  // Vanilla canvas zones in the atlas are typically a near-white linen,
  // so a light off-white base is honest if the user hasn't uploaded yet.
  ctx.fillStyle = '#d4d2cc'
  ctx.fillRect(ix, iy, iw, ih)
  if (file) {
    const img = await loadImageFromFile(file)
    drawCover(ctx, img, ix, iy, iw, ih)
  }

  // 2. Wood-frame borders. Pull a horizontal strip from the tinted atlas
  // and project it onto each of the four sides. Mitre clips at the corners.
  const tint = resolveTint(framePresetId)
  const atlas = await getTintedAtlas(slot.materialName, tint)
  drawFrameBorder(ctx, atlas, W, H, t)

  // 3. Inner shadow on the canvas opening ~ sells "the canvas sits inside
  // the frame" by darkening the inner edge.
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(ix + 0.75, iy + 0.75, iw - 1.5, ih - 1.5)
  ctx.restore()

  return canvas
}

/**
 * Paint the four wood-frame strips around the canvas zone, with 45° mitres
 * at the corners. Each strip is the BORDER_SAMPLE rect of the atlas,
 * scaled to the strip's size; vertical strips are rotated so the grain
 * runs along the strip's long axis.
 */
function drawFrameBorder(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLCanvasElement,
  W: number, H: number, t: number,
) {
  const sx = BORDER_SAMPLE.x, sy = BORDER_SAMPLE.y
  const sw = BORDER_SAMPLE.w, sh = BORDER_SAMPLE.h

  // Top strip
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(W, 0)
  ctx.lineTo(W - t, t)
  ctx.lineTo(t, t)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(atlas, sx, sy, sw, sh, 0, 0, W, t)
  ctx.restore()

  // Bottom strip
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(t, H - t)
  ctx.lineTo(W - t, H - t)
  ctx.lineTo(W, H)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(atlas, sx, sy, sw, sh, 0, H - t, W, t)
  ctx.restore()

  // Left strip ~ rotate 90° so grain runs vertically.
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(t, t)
  ctx.lineTo(t, H - t)
  ctx.lineTo(0, H)
  ctx.closePath()
  ctx.clip()
  ctx.translate(0, H)
  ctx.rotate(-Math.PI / 2)
  ctx.drawImage(atlas, sx, sy, sw, sh, 0, 0, H, t)
  ctx.restore()

  // Right strip
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(W - t, t)
  ctx.lineTo(W, 0)
  ctx.lineTo(W, H)
  ctx.lineTo(W - t, H - t)
  ctx.closePath()
  ctx.clip()
  ctx.translate(W, 0)
  ctx.rotate(Math.PI / 2)
  ctx.drawImage(atlas, sx, sy, sw, sh, 0, 0, H, t)
  ctx.restore()

  // Mitre seams ~ thin diagonals from outer to inner corner so the joins
  // read as actual cuts rather than blended texture continuations.
  ctx.save()
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, 0);     ctx.lineTo(t, t)
  ctx.moveTo(W, 0);     ctx.lineTo(W - t, t)
  ctx.moveTo(0, H);     ctx.lineTo(t, H - t)
  ctx.moveTo(W, H);     ctx.lineTo(W - t, H - t)
  ctx.stroke()
  ctx.restore()
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}

// Mirrors composer.ts drawCover ~ duplicated to avoid exporting an internal
// helper, kept tiny.
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number, dy: number, dw: number, dh: number,
) {
  const srcRatio = img.width / img.height
  const dstRatio = dw / dh
  let sx = 0, sy = 0, sw = img.width, sh = img.height
  if (srcRatio > dstRatio) { sw = img.height * dstRatio; sx = (img.width - sw) / 2 }
  else if (srcRatio < dstRatio) { sh = img.width / dstRatio; sy = (img.height - sh) / 2 }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}
