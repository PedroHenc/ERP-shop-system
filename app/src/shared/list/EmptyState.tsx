import type { ComponentType, ReactNode } from 'react'

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>
  title: string
  titleAs?: 'h1' | 'h2' | 'h3'
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, titleAs: Title = 'h2', description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-7" />
      </div>
      <Title className="text-base font-semibold">{title}</Title>
      {description ? <p className="max-w-sm text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  )
}
