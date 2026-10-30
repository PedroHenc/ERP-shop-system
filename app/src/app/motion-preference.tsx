import { MotionConfig } from 'motion/react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * How much the app animates. `system` follows the OS "reduce motion" setting; `full` and `reduced`
 * override it, for people whose OS reduces motion but who want the design's transitions (or the reverse).
 */
export type MotionPreference = 'system' | 'full' | 'reduced'
export const MOTION_PREFERENCES: readonly MotionPreference[] = ['system', 'full', 'reduced']
export const MOTION_STORAGE_KEY = 'erp.motion'

const REDUCED_MOTION = { system: 'user', full: 'never', reduced: 'always' } as const

interface MotionPreferenceContextValue {
  motion: MotionPreference
  setMotion(motion: MotionPreference): void
}

const MotionPreferenceContext = createContext<MotionPreferenceContextValue | null>(null)

function isMotionPreference(value: unknown): value is MotionPreference {
  return value === 'system' || value === 'full' || value === 'reduced'
}

function readStoredMotion(): MotionPreference {
  try {
    const stored = localStorage.getItem(MOTION_STORAGE_KEY)
    return isMotionPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Applies the motion preference to Motion (MotionConfig, read by `useReducedMotionConfig`) and to CSS
 * (`data-motion` on <html>, read by the `motion-reduce` variant and the reduced-motion rules in index.css).
 */
export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [motion, setMotionState] = useState<MotionPreference>(readStoredMotion)

  useEffect(() => {
    document.documentElement.dataset.motion = motion
  }, [motion])

  const setMotion = useCallback((next: MotionPreference) => {
    setMotionState(next)
    try {
      localStorage.setItem(MOTION_STORAGE_KEY, next)
    } catch {
      // Storage unavailable (e.g. private mode): keep the choice in memory only.
    }
  }, [])

  const value = useMemo(() => ({ motion, setMotion }), [motion, setMotion])
  return (
    <MotionPreferenceContext.Provider value={value}>
      {/* With reduced motion, transforms (layoutId indicators included) jump instead of animating. */}
      <MotionConfig reducedMotion={REDUCED_MOTION[motion]}>{children}</MotionConfig>
    </MotionPreferenceContext.Provider>
  )
}

export function useMotionPreference(): MotionPreferenceContextValue {
  const context = useContext(MotionPreferenceContext)
  if (context === null) throw new Error('useMotionPreference must be used inside MotionPreferenceProvider')
  return context
}
