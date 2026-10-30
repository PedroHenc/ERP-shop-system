import { motion } from 'motion/react'
import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { pillSpring } from '@/shared/motion/presets'

export interface SegmentedOption<T> {
  value: T
  label: ReactNode
  /** Small count or note shown next to the label of the selected option only. */
  badge?: ReactNode
}

interface SegmentedControlProps<T> {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name of the tab list. */
  label: string
  size?: 'sm' | 'md'
  /** Equal-width options filling the container (the login tabs); otherwise each option hugs its label. */
  fullWidth?: boolean
  className?: string
}

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
}

/**
 * The design's pill switch: options on a muted track, a card-colored thumb that springs to the selected one.
 * ARIA tabs with automatic activation: arrows (wrapping), Home and End move focus and select.
 * Reduced motion: MotionConfig turns the thumb's slide into a jump.
 */
export function SegmentedControl<T>({
  options,
  value,
  onChange,
  label,
  size = 'sm',
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  // One thumb per control: a shared layoutId would slide between unrelated controls on the page.
  const thumbId = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = refs.current.indexOf(event.target as HTMLButtonElement)
    if (current === -1) return
    const last = options.length - 1
    let next: number
    if (event.key === 'ArrowRight') next = current === last ? 0 : current + 1
    else if (event.key === 'ArrowLeft') next = current === 0 ? last : current - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else return
    event.preventDefault()
    refs.current[next]?.focus()
    onChange(options[next].value)
  }

  // With no option selected (e.g. the login's password-help view), the first one keeps the list reachable by Tab.
  const anySelected = options.some((option) => Object.is(option.value, value))

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        'bg-muted max-w-full gap-1 overflow-x-auto overflow-y-hidden rounded-full p-[5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        fullWidth ? 'grid auto-cols-fr grid-flow-col' : 'inline-flex',
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = Object.is(option.value, value)
        return (
          <button
            key={String(option.value)}
            ref={(element) => {
              refs.current[index] = element
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected || (!anySelected && index === 0) ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-semibold transition-colors duration-300 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              sizes[size],
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {selected ? (
              <motion.span
                layoutId={`segmented-thumb-${thumbId}`}
                aria-hidden="true"
                className="bg-card absolute inset-0 -z-0 rounded-full shadow-[var(--shadow-card)]"
                transition={pillSpring}
              />
            ) : null}
            <span className="relative">{option.label}</span>
            {selected && option.badge !== undefined ? (
              <span className="bg-primary/10 text-primary relative rounded-full px-1.5 text-xs tabular-nums">
                {option.badge}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
