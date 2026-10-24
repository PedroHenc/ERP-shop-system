import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

/**
 * Fade-in props for list rows, for the first batch of data only: later pages and refetches swap in place.
 * Pass whether rows are currently rendered (not loading, at least one row); spread `rowMotion(index)` on a
 * motion row. Rows stagger by 20ms up to 200ms, without stagger under reduced motion.
 */
export function useFirstLoadAnimation(hasRows: boolean) {
  const reducedMotion = useReducedMotion()
  const animated = useRef(false)
  useEffect(() => {
    if (hasRows) animated.current = true
  }, [hasRows])
  const animateRows = !animated.current

  return (index: number) => ({
    initial: animateRows ? { opacity: 0 } : (false as const),
    animate: { opacity: 1 },
    transition: { duration: 0.18, delay: reducedMotion ? 0 : Math.min(index * 0.02, 0.2) },
  })
}
