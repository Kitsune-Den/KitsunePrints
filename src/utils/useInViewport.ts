import { useEffect, useRef, useState } from 'react'

/**
 * One-shot in-viewport observer: returns a ref + boolean indicating whether
 * the ref'd element has scrolled into view at least once. Once true, stays
 * true ~ the goal here is "render heavy content the first time it's needed,"
 * not "unrender when scrolled away" (that would thrash the in-memory atlas
 * cache and fight users who scroll back up).
 *
 * `rootMargin` expands the observation rect so rendering starts BEFORE the
 * element is visible. With ~300px lead time the heavy compositions
 * (composeAtlas, drawSwatchInto) typically finish before the card is in
 * view, so it appears already loaded.
 *
 * Used by SlotCard to defer LiveSlotPreview + FramePresetPicker swatch
 * compositions until the card matters. On the picture-frames tab (23 cards
 * × 6 swatches × 8 atlases), this cuts initial work by ~80% on a typical
 * viewport. Cards above the fold render immediately; cards below render as
 * the user scrolls.
 */
export function useInViewport(rootMargin: string = '300px'): [
  React.RefObject<HTMLDivElement | null>,
  boolean,
] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [inViewport, setInViewport] = useState(false)

  useEffect(() => {
    // Already in view ~ disconnect early, never re-arm.
    if (inViewport) return
    const el = ref.current
    if (!el) return

    // Defensive: SSR / test envs without IntersectionObserver fall back to
    // "render now." Better to do all the work eagerly than to never render.
    if (typeof IntersectionObserver === 'undefined') {
      setInViewport(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [inViewport, rootMargin])

  return [ref, inViewport]
}
