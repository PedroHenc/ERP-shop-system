import { MotionConfig } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Animations always play in full (product decision), whatever the OS "reduce motion" setting says:
 * `useReducedMotionConfig()` is then false everywhere. The CSS side is the `motion-reduce` variant in index.css.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="never">{children}</MotionConfig>
}
