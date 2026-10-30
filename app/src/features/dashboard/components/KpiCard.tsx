import { useState } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { useCountUp } from '@/hooks/use-count-up'
import { Pill } from '@/shared/components/Pill'
import { LIFT_ON_HOVER } from '@/shared/motion/presets'

export type BadgeTone = 'ok' | 'warning' | 'danger' | 'neutral'

interface KpiCardProps {
  label: string
  value: number
  format?: (value: number) => string
  /** Small pill next to the label. */
  badge?: { text: string; tone: BadgeTone }
  /** One line under the value. */
  hint?: string
  /** `accent`: filled with the accent color (the headline KPI). */
  variant?: 'default' | 'accent'
  to?: string
  onClick?: () => void
}

const cardClasses =
  'flex min-h-[170px] w-full min-w-0 flex-col gap-4 rounded-xl p-4 text-left shadow-[var(--shadow-card)] sm:p-6'
const interactiveClasses = cn(LIFT_ON_HOVER, 'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50')

export function KpiCard({ label, value, format, badge, hint, variant = 'default', to, onClick }: KpiCardProps) {
  // The count-up only plays for the value the card first mounts with (the first data load);
  // once a refetch brings a different value it is shown directly, without counting from 0.
  const [initialValue] = useState(value)
  const [animate, setAnimate] = useState(true)
  if (animate && value !== initialValue) setAnimate(false)
  const animated = useCountUp(value, { enabled: animate })
  const text = format ? format(animated) : String(Math.round(animated))
  const accent = variant === 'accent'

  const content = (
    <>
      <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <span className={cn('text-sm font-semibold', accent ? 'text-primary-foreground' : 'text-foreground/80')}>{label}</span>
        {badge ? <Pill tone={accent ? 'onAccent' : badge.tone}>{badge.text}</Pill> : null}
      </span>
      <span className="mt-auto flex min-w-0 flex-col gap-2.5">
        <span className="text-2xl leading-none font-extrabold tracking-[-0.03em] tabular-nums sm:text-3xl xl:text-[44px]">{text}</span>
        {hint ? (
          <span className={cn('text-[13px]', accent ? 'text-primary-foreground/90' : 'text-muted-foreground')}>{hint}</span>
        ) : null}
      </span>
    </>
  )

  const classes = cn(cardClasses, accent ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground')
  if (to) {
    return (
      <Link to={to} className={cn(classes, interactiveClasses)}>
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, interactiveClasses)}>
        {content}
      </button>
    )
  }
  return <div className={classes}>{content}</div>
}
