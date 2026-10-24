import { useState, type ComponentType } from 'react'
import { Link } from 'react-router'
import { cn } from 'cn'
import { useCountUp } from '@/hooks/use-count-up'

type Tone = 'primary' | 'warning' | 'destructive' | 'success'

const toneClasses: Record<Tone, string> = {
  primary: 'bg-primary/10 text-primary',
  warning: 'bg-warning-soft text-warning-foreground',
  destructive: 'bg-destructive/10 text-destructive',
  success: 'bg-success-soft text-success-foreground',
}

interface KpiCardProps {
  icon: ComponentType<{ className?: string }>
  tone: Tone
  label: string
  value: number
  format?: (value: number) => string
  to?: string
  onClick?: () => void
}

const cardClasses =
  'flex w-full min-w-0 flex-col gap-3 rounded-xl bg-card p-4 text-left ring-1 ring-foreground/10 shadow-[var(--shadow-card)]'
const interactiveClasses =
  'group transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md hover:ring-foreground/20 motion-reduce:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export function KpiCard({ icon: Icon, tone, label, value, format, to, onClick }: KpiCardProps) {
  // The count-up only plays for the value the card first mounts with (the first data load);
  // once a refetch brings a different value it is shown directly, without counting from 0.
  const [initialValue] = useState(value)
  const [animate, setAnimate] = useState(true)
  if (animate && value !== initialValue) setAnimate(false)
  const animated = useCountUp(value, { enabled: animate })
  const text = format ? format(animated) : String(Math.round(animated))

  const content = (
    <>
      <span className={cn('flex size-9 items-center justify-center rounded-lg transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:group-hover:scale-100', toneClasses[tone])}>
        <Icon className="size-5" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold tabular-nums sm:text-2xl">{text}</span>
      </span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={cn(cardClasses, interactiveClasses)}>
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cardClasses, interactiveClasses)}>
        {content}
      </button>
    )
  }
  return <div className={cardClasses}>{content}</div>
}
