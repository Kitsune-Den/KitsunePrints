// Client-side image composition using HTMLCanvas. No server round-trip needed ~
// everything happens in the user's browser before zip generation.
//
// Two composition modes mirror what the runtime DLL expects:
//
//  - portrait (1×1 backers): vanilla UV slices the texture into left 25% wood
//    (wraps the 3D frame mesh) and right 75% canvas. Composer draws the
//    chosen frame preset (a 256×1024 vertical strip from public/frames/) into
//    the left zone, and pastes the user image fitted into the right 768×1024
//    canvas zone.
//
//  - abstract (2×2 / 3×2 shared material): runtime DLL resets the material's
//    UV scale/offset to (1,1)/(0,0), so the entire texture fills the canvas.
//    Composer just normalizes the user image to a square 1024×1024.
//
// All output is RGBA PNG.

import {
  FRAME_PRESETS,
  DEFAULT_FRAME_PRESET_ID,
  ATLAS_SOURCES,
  type AtlasTile,
} from '../types/slots'

const PORTRAIT_W = 1024
const PORTRAIT_H = 1024
const FRAME_PCT = 0.25 // left 25% is the frame UV zone
const ABSTRACT_SIZE = 1024
const ICON_SIZE = 160

export async function composePortrait(file: File, framePresetId: string): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = PORTRAIT_W
  canvas.height = PORTRAIT_H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')

  // Left 25% ~ frame texture from the chosen preset (or default).
  const frameImg = await loadFrameTexture(framePresetId)
  const frameW = Math.floor(PORTRAIT_W * FRAME_PCT)
  // Stretch the preset to fill the frame zone exactly.
  ctx.drawImage(frameImg, 0, 0, frameImg.width, frameImg.height, 0, 0, frameW, PORTRAIT_H)

  // Right 75% ~ user image scaled to cover the canvas zone.
  const canvasX = frameW
  const canvasW = PORTRAIT_W - canvasX
  const canvasH = PORTRAIT_H
  drawCover(ctx, img, canvasX, 0, canvasW, canvasH)

  return canvasToBlob(canvas)
}

const _frameTextureCache = new Map<string, HTMLImageElement>()

async function loadFrameTexture(framePresetId: string): Promise<HTMLImageElement> {
  const preset = FRAME_PRESETS.find(p => p.id === framePresetId)
    ?? FRAME_PRESETS.find(p => p.id === DEFAULT_FRAME_PRESET_ID)
    ?? FRAME_PRESETS[0]

  const cached = _frameTextureCache.get(preset.id)
  if (cached) return cached

  const img = await loadImageFromUrl(preset.imagePath)
  _frameTextureCache.set(preset.id, img)
  return img
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
    img.src = url
  })
}

export async function composeAbstract(file: File): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = ABSTRACT_SIZE
  canvas.height = ABSTRACT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')

  drawCover(ctx, img, 0, 0, ABSTRACT_SIZE, ABSTRACT_SIZE)
  return canvasToBlob(canvas)
}

/**
 * Compose any shared-material atlas. Loads the vanilla atlas (looked up by
 * materialName) as the base layer (preserves regions referenced by mesh UVs
 * we don't write to) and pastes each filled slot's user image into its tile.
 *
 * Used by movie posters (posterMovie atlas) and picture canvases
 * (pictureCanvas1, pictureCanvas2 atlases).
 */
export async function composeAtlas(
  materialName: string,
  entries: { tile: AtlasTile; file: File }[],
): Promise<Blob> {
  const source = ATLAS_SOURCES[materialName]
  if (!source) {
    throw new Error(`No atlas source registered for material "${materialName}"`)
  }
  const atlas = await loadImageFromUrl(source.vanillaPath)
  const canvas = document.createElement('canvas')
  canvas.width = source.size
  canvas.height = source.size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')

  // Draw vanilla atlas as the base.
  ctx.drawImage(atlas, 0, 0, source.size, source.size)

  // Paint each user image into its assigned tile, cover-fitted.
  for (const { tile, file } of entries) {
    const img = await loadImage(file)
    drawCover(ctx, img, tile.x, tile.y, tile.w, tile.h)
  }

  return canvasToBlob(canvas)
}

export async function composeIcon(
  file: File,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _kind: 'portrait' | 'abstract' | 'moviePoster' | 'decor' | 'canvasTile',
): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = ICON_SIZE
  canvas.height = ICON_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')

  // Same cover-fit for every kind ~ the icon is just the source image
  // cropped to a square. Frames/atlases don't apply at icon scale.
  drawCover(ctx, img, 0, 0, ICON_SIZE, ICON_SIZE)
  return canvasToBlob(canvas)
}

// Object-fit: cover semantics. Scales the source image to entirely fill the
// destination rect, cropping from center on the over-extending axis.
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const srcRatio = img.width / img.height
  const dstRatio = dw / dh
  let sx = 0, sy = 0, sw = img.width, sh = img.height
  if (srcRatio > dstRatio) {
    // src wider ~ crop sides
    sw = img.height * dstRatio
    sx = (img.width - sw) / 2
  } else if (srcRatio < dstRatio) {
    // src taller ~ crop top/bottom
    sh = img.width / dstRatio
    sy = (img.height - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas toBlob returned null'))
    }, 'image/png')
  })
}
