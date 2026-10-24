import { motion, useReducedMotion } from 'motion/react'
import type { ComponentProps } from 'react'
import { STAGGER_STEP, fadeUp } from './presets'

type DivProps = Omit<ComponentProps<typeof motion.div>, 'variants' | 'initial' | 'animate'>

/** Container whose `StaggerItem` children fade up one after another on mount. */
export function Stagger({ children, ...props }: DivProps) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: reducedMotion ? 0 : STAGGER_STEP } } }}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/** A child of `Stagger`; renders a div with the shared fade-up entrance. */
export function StaggerItem({ children, ...props }: DivProps) {
  const reducedMotion = useReducedMotion()
  return (
    <motion.div
      variants={reducedMotion ? { hidden: { opacity: 0 }, visible: { opacity: 1 } } : fadeUp}
      {...props}
    >
      {children}
    </motion.div>
  )
}
