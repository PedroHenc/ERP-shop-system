import { cn } from '@/lib/utils'

const sizes = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
} as const

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase()
}

export function UserAvatar({ name, size = 'md' }: { name: string; size?: keyof typeof sizes }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-primary/10 text-primary inline-flex shrink-0 items-center justify-center rounded-full font-medium',
        sizes[size],
      )}
    >
      {initialsOf(name)}
    </span>
  )
}
