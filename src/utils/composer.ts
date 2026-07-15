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
  type MeshUvBbox,
} from '../types/slots'

/** Rotate an HTMLImageElement-or-canvas-source 90° in the named direction.
 *  Returns a fresh HTMLCanvasElement (drop-in for drawImage). */
function rotate90(
  source: HTMLImageElement | HTMLCanvasElement,
  direction: 'cw' | 'ccw',
): HTMLCanvasElement {
  const sw = (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width
  const sh = (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height
  const out = document.createElement('canvas')
  // Rotation swaps width and height ~ portrait becomes landscape and vice versa.
  out.width = sh
  out.height = sw
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')
  // Translate to the new center, rotate, then draw the source centered.
  ctx.save()
  ctx.translate(out.width / 2, out.height / 2)
  ctx.rotate(direction === 'cw' ? Math.PI / 2 : -Math.PI / 2)
  ctx.drawImage(source as CanvasImageSource, -sw / 2, -sh / 2, sw, sh)
  ctx.restore()
  return out
}

/** Vertically flip an HTMLImageElement-or-canvas-source (mirror top<->bottom).
 *  Returns a fresh HTMLCanvasElement (drop-in for drawImage). Used to
 *  pre-compensate atlases whose in-game meshes sample with inverted V. */
function flipVertical(
  source: HTMLImageElement | HTMLCanvasElement,
): HTMLCanvasElement {
  const sw = (source as HTMLImageElement).naturalWidth || (source as HTMLCanvasElement).width
  const sh = (source as HTMLImageElement).naturalHeight || (source as HTMLCanvasElement).height
  const out = document.createElement('canvas')
  out.width = sw
  out.height = sh
  const ctx = out.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')
  // Scale Y by -1 about the vertical center to mirror top<->bottom.
  ctx.translate(0, sh)
  ctx.scale(1, -1)
  ctx.drawImage(source as CanvasImageSource, 0, 0, sw, sh)
  return out
}

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

// Output texture size for UV-bbox-fitted decor textures. 2048 matches the
// original snackPosters_d atlas dimensions ~ keeps the user's image at full
// resolution within whatever sub-region the mesh actually samples.
const UV_BBOX_OUTPUT_SIZE = 2048

// Bleed for shared-atlas tile paints (composeAtlas). Same idea as
// BBOX_BLEED_PX below: extend the painted rect a few pixels past its
// bounds in every direction, so when the in-game mesh's UV samples
// rounding-overshoot the tile boundary by 1-N pixels they pick up the
// extended user image instead of vanilla atlas content from the wood-zone
// above each tile (which under a multiply tint reads as gray strips).
//
// Set to 8 px after diagnosing HakurouHayate's V2.6 b14 frame strip
// report ~ the visible strips were ~3-5 px wide; 8 gives generous margin
// without straying into other tiles. Bleed pixels land in atlas dead-zones
// the mesh doesn't sample for OTHER tiles, so no visual leak. See
// scripts/test_frame_bleed.py for the mechanism diagnostic.
const TILE_BLEED_PX = 8

/**
 * Compose a decor texture where the in-game mesh samples only a sub-region
 * of the texture's UV space. Paints the user's image cover-fitted into
 * exactly that bbox region (plus a small bleed margin) of an otherwise-
 * transparent UV_BBOX_OUTPUT_SIZE square so the mesh sees their full image
 * undistorted, with no edge clipping from sub-pixel rounding.
 *
 * Why this exists: snack posters (and likely a handful of other decor
 * blocks) have meshes whose front-face UVs were authored against the
 * vanilla shared atlas. e.g. a Bretzels block's mesh samples UV (0,0)-(0.5,1)
 * because in vanilla that was where the Bretzels artwork lived in the
 * 2048x2048 snackPosters_d atlas. When we swap in a fresh user texture
 * AND the runtime DLL resets the material's UV scale/offset to identity,
 * the mesh STILL asks for (0,0)-(0.5,1) of the new texture ~ which means
 * the user only sees the left half of their image on the wall.
 *
 * Fix: pre-distort. Render a 2048x2048 texture where the user's image
 * occupies the bbox region (plus BLEED_PX of overflow on each side) and
 * the rest is transparent. Mesh samples its bbox -> sees full image. The
 * bleed compensates for fractional UV bboxes (e.g. Bretzels is 0.4985, not
 * exactly 0.5) so no edge content is lost to round-down. Bleed pixels
 * extend INTO unsampled territory, so they're cosmetically invisible.
 * Other materials sharing the shader don't sample the transparent regions,
 * so no visual leak.
 */
// Bleed: how many pixels to extend the destination rect OUTSIDE the bbox.
// Compensates for fractional UV bboxes (e.g. Bretzels 0.4985, not 0.5)
// rounding down. Bleed pixels land in unsampled territory, invisible.
const BBOX_BLEED_PX = 4

// Inset: how many pixels of transparent margin to leave INSIDE the bbox
// before the user's image starts. Compensates for the in-game mesh's edge
// sampling (mesh samples ~ 5px in from the bbox edge in practice, depending
// on texture filtering + mipmap selection). Inset pushes user content
// safely away from that boundary so edge text isn't clipped.
//
// Tradeoff: thin transparent border around the image in-game. At 12 px on
// a 2048 output, that's ~0.6% of texture per side ~ visually it just looks
// like a bit of vanilla material framing the print. Bump up if you still
// see edge clipping; bump down if the framing feels too pronounced.
const BBOX_INSET_PX = 12
export async function composeUvBboxFitted(file: File, bbox: MeshUvBbox): Promise<Blob> {
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = UV_BBOX_OUTPUT_SIZE
  canvas.height = UV_BBOX_OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d context unavailable')

  // Convert normalized UV bbox to pixel rect on the output texture.
  const px = Math.round(bbox.l * UV_BBOX_OUTPUT_SIZE)
  const py = Math.round(bbox.t * UV_BBOX_OUTPUT_SIZE)
  const pw = Math.round((bbox.r - bbox.l) * UV_BBOX_OUTPUT_SIZE)
  const ph = Math.round((bbox.b - bbox.t) * UV_BBOX_OUTPUT_SIZE)

  // Step 1: bleed OUT past the bbox edges to absorb fractional-UV rounding.
  // Clamped to [0, OUTPUT_SIZE] so a bbox already at the texture edge
  // doesn't try to draw outside the canvas.
  const bx = Math.max(0, px - BBOX_BLEED_PX)
  const by = Math.max(0, py - BBOX_BLEED_PX)
  const br = Math.min(UV_BBOX_OUTPUT_SIZE, px + pw + BBOX_BLEED_PX)
  const bb = Math.min(UV_BBOX_OUTPUT_SIZE, py + ph + BBOX_BLEED_PX)

  // Step 2: inset BACK IN past the inner edge so the user's image sits
  // inside the safety margin. The inset fights mesh-edge sampling which
  // tends to nibble a few pixels off rendered content at the bbox boundary.
  // The annular gap between bled rect and inset rect stays transparent ~
  // visible as a thin border in-game.
  const ix = bx + BBOX_INSET_PX
  const iy = by + BBOX_INSET_PX
  const iw = Math.max(0, (br - bx) - BBOX_INSET_PX * 2)
  const ih = Math.max(0, (bb - by) - BBOX_INSET_PX * 2)

  // Cover-fit into the inset rect. Same drawCover semantics as everywhere
  // else in this file ~ aspect-correct, center-cropped.
  drawCover(ctx, img, ix, iy, iw, ih)

  return canvasToBlob(canvas)
}

/**
 * Compose any shared-material atlas. Loads the vanilla atlas (looked up by
 * materialName) as the base layer (preserves regions referenced by mesh UVs
 * we don't write to) and pastes each filled slot's user image into its tile.
 *
 * For picture-frame atlases (those with frameTintHeightPct set in
 * ATLAS_SOURCES), an optional tint color is multiply-blended over the top
 * wood-frame zone so users can recolor the vanilla wood pattern without
 * losing its grain detail. Tint applies AFTER the base draw and BEFORE
 * picture tiles are painted (so picture tiles are untinted).
 *
 * Used by movie posters, picture canvases, and picture frames.
 */
export async function composeAtlas(
  materialName: string,
  entries: { tile: AtlasTile; file: File; rotation?: 'cw' | 'ccw' }[],
  frameTint?: string,
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

  // 1. Draw vanilla atlas as the base.
  ctx.drawImage(atlas, 0, 0, source.size, source.size)

  // 2. If this atlas has a wood-frame zone and a tint was picked, multiply-
  //    blend the tint color over that zone (preserves wood grain).
  if (source.frameTintHeightPct && frameTint) {
    const tintHeight = Math.round(source.size * source.frameTintHeightPct)
    ctx.save()
    ctx.globalCompositeOperation = 'multiply'
    ctx.fillStyle = frameTint
    ctx.fillRect(0, 0, source.size, tintHeight)
    ctx.restore()
  }

  // 3. Paint each user image into its assigned tile, cover-fitted, with a
  //    TILE_BLEED_PX margin extending past the rect on every side. The
  //    bleed absorbs in-game mesh UV overshoot at the tile boundary so the
  //    mesh never samples vanilla wood-zone content (which otherwise shows
  //    as gray strips at the print's edges).
  //
  //    If the entry has a rotation directive, we rotate the user's image
  //    90° (in the indicated direction) BEFORE the cover-fit. That's how
  //    a user-uploaded landscape image gets tilted to fit a portrait
  //    atlasTile (or vice versa) when the slot's effective orientation
  //    differs from the atlasTile's native aspect.
  for (const { tile, file, rotation } of entries) {
    const img = await loadImage(file)
    let sourceForPaint: HTMLImageElement | HTMLCanvasElement =
      rotation ? rotate90(img, rotation) : img
    // Pre-flip for atlases whose meshes sample with inverted V (e.g.
    // pictureCanvas1), so upright user content renders upright in-game
    // instead of upside down. Applied after any rotation.
    if (source.flipTilesV) sourceForPaint = flipVertical(sourceForPaint)
    const bx = Math.max(0, tile.x - TILE_BLEED_PX)
    const by = Math.max(0, tile.y - TILE_BLEED_PX)
    const br = Math.min(source.size, tile.x + tile.w + TILE_BLEED_PX)
    const bb = Math.min(source.size, tile.y + tile.h + TILE_BLEED_PX)
    drawCover(ctx, sourceForPaint, bx, by, br - bx, bb - by)
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
// destination rect, cropping from center on the over-extending axis. Accepts
// HTMLImageElement OR HTMLCanvasElement (both expose width/height + are
// drawImage-compatible) so callers can hand us a rotated canvas without
// having to round-trip through an intermediate image element.
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const srcW = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width
  const srcH = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height
  const srcRatio = srcW / srcH
  const dstRatio = dw / dh
  let sx = 0, sy = 0, sw = srcW, sh = srcH
  if (srcRatio > dstRatio) {
    // src wider ~ crop sides
    sw = srcH * dstRatio
    sx = (srcW - sw) / 2
  } else if (srcRatio < dstRatio) {
    // src taller ~ crop top/bottom
    sh = srcW / dstRatio
    sy = (srcH - sh) / 2
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
