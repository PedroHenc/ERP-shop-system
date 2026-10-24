import type { Transition, Variants } from 'motion/react'

/** Short, low-bounce spring used for presses, popovers and layout moves. */
export const softSpring: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }

/** Delay between siblings in a staggered entrance. */
export const STAGGER_STEP = 0.04

/** Entrance used by cards and sections: fade in while rising 8px. MotionConfig drops the movement under reduced motion. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
}

/** Lists with more rows than this skip layout animation, which is costly on large tables. */
export const LAYOUT_ANIMATION_LIMIT = 50
