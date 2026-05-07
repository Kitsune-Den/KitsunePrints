import { useEffect, useState } from 'react'

/**
 * Pool of loading messages cycled on the building modal. One is picked at
 * random when the modal mounts, and a new (different) one is picked every
 * ~3.5s while the build is running. Keeps wait time feeling alive without
 * making any single trip through the build feel scripted.
 *
 * Sister implementation lives in KitsunePaint's BuildingModal ~ same vibe,
 * messages tuned to prints/frames/photos instead of paints/textures.
 *
 * Add freely. Keep them under ~80 chars and lowercase-first to match voice.
 */
const LOADING_MESSAGES: string[] = [
  // warm "please wait" lane
  'please be patient, we\'re making your prints',
  'developing your photographs',
  'mounting the prints in their frames',
  'the prints are almost ready',

  // in-on-the-joke technical lane
  'compositing the picture frame atlas',
  'swapping the painting material',
  'baking the wood-tint multiply blend',
  'aligning the picture frame UVs',
  'writing icon atlas entries',
  'compiling 69 slots into a modlet',
  'packaging the zip (this part is genuinely fast lol)',

  // lightly chaotic lane
  'ensuring no prints are sus',
  'nothing bad has happened (yet)',
  'adding a touch of chaos',
  'this is taking longer than a horde night',
  'whispering encouragement to the JSON',
  'asking the zombies to wait their turn',

  // kitsune-house-style lane
  'the kitsunes are working',
  'summoning the print kitsune',
  'bribing the kitsune with snacks',
  'the kitsune is almost done',
]

/**
 * Pick a random index that isn't `excludeIdx`. If the pool has only one
 * entry, returns 0. Used to avoid immediately re-displaying the same
 * message when rotating.
 */
function pickRandomIdx(poolLength: number, excludeIdx: number): number {
  if (poolLength <= 1) return 0
  let next = excludeIdx
  while (next === excludeIdx) {
    next = Math.floor(Math.random() * poolLength)
  }
  return next
}

const ROTATE_MS = 6500

/**
 * Full-screen building modal shown while DownloadButton is generating the
 * modlet zip. Replaces the previous "Building..." button-text-only state
 * which was indistinguishable from a stuck UI on slower machines.
 *
 * Build progress isn't granular (it's one async buildModlet() call), so we
 * skip the percent bar and just rotate flavor messages until the zip is
 * ready and the modal unmounts.
 */
export function BuildingModal() {
  const [msgIdx, setMsgIdx] = useState(() =>
    Math.floor(Math.random() * LOADING_MESSAGES.length),
  )
  useEffect(() => {
    const id = setInterval(() => {
      setMsgIdx(prev => pickRandomIdx(LOADING_MESSAGES.length, prev))
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])
  const flavorMessage = LOADING_MESSAGES[msgIdx]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="relative max-w-md w-full mx-4 bg-zinc-900 border border-orange-500/20 rounded-2xl p-8 shadow-2xl shadow-orange-900/20">
        <div className="text-center space-y-5">
          <h2 className="text-xl font-bold text-orange-400">
            Building your modpack...
          </h2>

          <p
            key={msgIdx}
            className="text-sm text-zinc-400 leading-relaxed min-h-[3rem] animate-in fade-in duration-500"
          >
            {flavorMessage}
          </p>

          {/* Indeterminate progress shimmer ~ no granular % since buildModlet
              is one async call, but we still want motion so users know
              something's happening. */}
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
