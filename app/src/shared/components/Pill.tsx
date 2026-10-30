import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Status pill tones. Semantic tones (ok, warning, danger) never follow the accent color, so "out of stock"
 * stays red with any accent. `onAccent` sits on accent surfaces, `ink` on the dark ink card.
 */
export type PillTone = 'ok' | 'warning' | 'danger' | 'dangerSolid' | 'neutral' | 'accent' | 'onAccent' | 'ink'

const tones: Record<PillTone, string> = {
  ok: 'bg-success-soft text-success-foreground',
  warning: 'bg-warning-soft text-warning-foreground',
  danger: 'bg-destructive/10 text-destructive',
  dangerSolid: 'bg-destructive text-white',
  neutral: 'bg-muted text-muted-foreground',
  accent: 'bg-accent text-accent-foreground',
  onAccent: 'bg-white/22 text-primary-foreground',
  ink: 'bg-background/12 text-background',
}

const sizes = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3 py-1.5 text-xs',
}

interface PillProps {
  tone: PillTone
  size?: keyof typeof sizes
  className?: string
  children: ReactNode
}

/** The design's rounded status pill (KPI deltas, stock status, health). */
export function Pill({ tone, size = 'sm', className, children }: PillProps) {
  return (
    <span className={cn('inline-flex shrink-0 items-center rounded-full font-semibold whitespace-nowrap', tones[tone], sizes[size], className)}>
      {children}
    </span>
  )
}
