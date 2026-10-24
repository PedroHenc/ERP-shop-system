import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useLocation, useOutlet } from 'react-router'

/** Keeps the outlet element it was mounted with, so an exiting page renders its own content. */
function FrozenOutlet({ children }: { children: ReactNode }) {
  const [frozen] = useState(children)
  return frozen
}

export function AnimatedOutlet() {
  const outlet = useOutlet()
  const location = useLocation()
  const reduced = useReducedMotion()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
      >
        <FrozenOutlet>{outlet}</FrozenOutlet>
      </motion.div>
    </AnimatePresence>
  )
}
