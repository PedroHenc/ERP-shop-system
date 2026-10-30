import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const variants = {
  /** White (card) surface with the soft shadow: most content. */
  default: 'bg-card text-card-foreground shadow-[var(--shadow-card)]',
  /** Ink surface (text color as background): one summary per screen at most, like the design's "A receber". */
  ink: 'bg-foreground text-background',
  /** Accent fill: the single headline element of a screen. */
  accent: 'bg-primary text-primary-foreground',
} as const

interface PanelProps {
  title?: ReactNode
  description?: ReactNode
  /** Right side of the header (a count, a link, a button). */
  actions?: ReactNode
  variant?: keyof typeof variants
  /** `flush`: no side padding for the body, for lists whose rows bring their own. */
  padding?: 'normal' | 'flush'
  id?: string
  className?: string
  children?: ReactNode
}

/**
 * The design's card: 28px corners, no border, generous padding, 18px extrabold title.
 * With a title it is a labelled region (`section` + `aria-labelledby`).
 */
export function Panel({ title, description, actions, variant = 'default', padding = 'normal', id, className, children }: PanelProps) {
  const titleId = useId()
  const muted = variant === 'default' ? 'text-muted-foreground' : 'opacity-75'
  return (
    <section
      id={id}
      aria-labelledby={title ? titleId : undefined}
      className={cn('flex flex-col gap-5 rounded-xl py-6', padding === 'flush' ? 'px-3.5' : 'px-6', variants[variant], className)}
    >
      {title || actions ? (
        <div
          className={cn(
            'flex justify-between gap-3',
            description ? 'items-start' : 'items-center',
            padding === 'flush' && 'px-3 pb-1.5',
          )}
        >
          <div className="flex min-w-0 flex-col gap-1">
            {title ? (
              <h2 id={titleId} className="text-lg font-extrabold">
                {title}
              </h2>
            ) : null}
            {description ? <p className={cn('text-[13px]', muted)}>{description}</p> : null}
          </div>
          {actions ? <div className={cn('shrink-0 text-[13px]', muted)}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
