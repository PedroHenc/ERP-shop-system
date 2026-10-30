import type { Transition, Variants } from 'motion/react'

/*
 * Motion tokens from the Modernist design (Claude Design handoff). See app/DESIGN.md, "Movimento".
 * Rule of thumb: pages and sections move like the design (expressive, ~0.6s); things that repeat all day
 * (rows, hovers, toggles) stay short.
 */

/** The design's soft ease-out: most entrances, bars and hovers. */
export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const

/** Symmetric ease for swaps (one view leaving, the next arriving) and chart morphs. */
export const EASE_SWAP = [0.45, 0, 0.25, 1] as const

/** Short, low-bounce spring used for presses, popovers and layout moves. */
export const softSpring: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 }

/** Pills that slide between options (segmented controls, active nav), with a slight overshoot. */
export const pillSpring: Transition = { type: 'spring', bounce: 0.3, duration: 0.5 }

/** Popovers, menus and the welcome avatar: quick fade, springy scale from their anchor. */
export const popSpring: Transition = { opacity: { duration: 0.2 }, default: { type: 'spring', bounce: 0.3, duration: 0.35 } }

/** Hover moves: card lift and row nudge. */
export const hoverTransition: Transition = { duration: 0.3, ease: EASE_OUT }

/** Delay between siblings in a staggered entrance (the design steps sections by 60ms). */
export const STAGGER_STEP = 0.06

/** Entrance of sections and cards: fade in while rising 18px. MotionConfig drops the movement under reduced motion. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { opacity: { duration: 0.6, ease: 'easeOut' }, y: { duration: 0.7, ease: EASE_OUT } },
  },
}

/** Lists with more rows than this skip layout animation, which is costly on large tables. */
export const LAYOUT_ANIMATION_LIMIT = 50

/** Tailwind classes for the design's card hover: a 4px lift and a deeper shadow (no lift under reduced motion). */
export const LIFT_ON_HOVER =
  'transition-[transform,box-shadow] duration-350 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-1 hover:shadow-md motion-reduce:hover:translate-y-0'

/** Tailwind classes for the design's row hover: a 4px nudge to the right (none under reduced motion). */
export const NUDGE_ON_HOVER =
  'transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:translate-x-1 motion-reduce:hover:translate-x-0'
