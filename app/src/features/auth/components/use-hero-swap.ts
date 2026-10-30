import { useAnimate, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { SPIRAL_LAYERS } from './HeroSpiral'

const EASE = [0.45, 0, 0.25, 1] as const
const LAYERS = SPIRAL_LAYERS.map((_, i) => `[data-layer="${i}"]`)
const CONTENT = '[data-hero-content]'

/**
 * Switches the login hero between views: the spiral bands sweep in while the hero content spins
 * away, the content swaps, then the bands sweep out while the new content spins in. `shown` is the
 * view on screen and lags behind `view` until the hero is covered. A change made mid-swap runs next.
 * Attach `scope` to the hero element (it must contain <HeroSpiral> and the `data-hero-content` node).
 */
export function useHeroSwap<View extends string>(view: View) {
  const [shown, setShown] = useState(view)
  const [leaving, setLeaving] = useState(false)
  const [tick, setTick] = useState(0)
  const busy = useRef(false)
  const alive = useRef(true)
  const [scope, animate] = useAnimate<HTMLElement>()
  const reducedMotion = useReducedMotion()

  // Set on (re)mount too: StrictMode runs this cleanup once before the real mount.
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  // biome-ignore lint/correctness/useExhaustiveDependencies: `tick` re-runs the check after a swap ends
  useEffect(() => {
    if (view === shown || busy.current) return
    if (reducedMotion || !scope.current?.querySelector('[data-layer]')) {
      setShown(view)
      return
    }
    busy.current = true
    const target = view
    void (async () => {
      setLeaving(true)
      await Promise.all([
        animate(
          CONTENT,
          { rotate: 200, scale: 0.15, opacity: 0, filter: 'blur(3px)' },
          { duration: 0.5, ease: EASE, opacity: { duration: 0.4, delay: 0.1 }, filter: { duration: 0.5 } },
        ),
        ...LAYERS.map((layer, i) => animate(layer, { strokeDashoffset: 0 }, { duration: 0.42, ease: EASE, delay: i * 0.05 })),
      ])
      if (!alive.current) return
      setShown(target)
      setLeaving(false)
      await animate(CONTENT, { rotate: -200 }, { duration: 0 })
      await Promise.all([
        animate(
          CONTENT,
          { rotate: 0, scale: 1, opacity: 1, filter: 'blur(0px)' },
          {
            duration: 0.5,
            ease: EASE,
            delay: 0.03,
            opacity: { duration: 0.35, delay: 0.03 },
            filter: { duration: 0.45, delay: 0.03 },
          },
        ),
        ...LAYERS.map((layer, i) =>
          animate(layer, { strokeDashoffset: -1 }, { duration: 0.42, ease: EASE, delay: (LAYERS.length - 1 - i) * 0.05 }),
        ),
      ])
      if (!alive.current) return
      for (const layer of LAYERS) animate(layer, { strokeDashoffset: 1 }, { duration: 0 })
      busy.current = false
      setTick((t) => t + 1)
    })()
  }, [view, shown, tick, animate, scope, reducedMotion])

  return { shown, leaving, scope }
}
