import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'
import { EASE_OUT } from '@/shared/motion/presets'

const tones = {
  primary: 'bg-primary',
  foreground: 'bg-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
} as const

interface ProgressBarProps {
  /** 0 to 1; values outside are clamped. */
  value: number
  tone?: keyof typeof tones
  /** Seconds before the fill starts (e.g. after the section's entrance). */
  delay?: number
  /** Gives the bar the `progressbar` role with this name; without it the bar is decorative (aria-hidden). */
  label?: string
  className?: string
}

/**
 * The design's rounded bar that fills from zero on mount and glides to new values.
 * Reduced motion: drawn at its final width, no sweep (MotionConfig alone does not stop width animations).
 */
export function ProgressBar({ value, tone = 'primary', delay = 0, label, className }: ProgressBarProps) {
  const reducedMotion = useReducedMotion()
  const clamped = Math.min(Math.max(value, 0), 1)
  const width = `${clamped * 100}%`
  const a11y = label
    ? { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(clamped * 100) }
    : { 'aria-hidden': true }
  return (
    <span {...a11y} className={cn('bg-muted block h-2 overflow-hidden rounded-full', className)}>
      <motion.span
        data-slot="progress-fill"
        className={cn('block h-full rounded-full', tones[tone])}
        initial={reducedMotion ? false : { width: 0 }}
        animate={{ width }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay }}
      />
    </span>
  )
}
