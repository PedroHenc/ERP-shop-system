import { cn } from '@/lib/utils'

const sizes = {
  sm: 'size-6 text-[10px] font-medium',
  md: 'size-8 text-xs font-medium',
  lg: 'size-10 text-sm font-medium',
  /** The design's list avatar (44px, extrabold). */
  xl: 'size-11 text-[13px] font-extrabold',
} as const

const tones = {
  soft: 'bg-primary/10 text-primary',
  neutral: 'bg-muted text-foreground',
  accent: 'bg-primary text-primary-foreground',
  danger: 'bg-destructive text-white',
} as const

export type AvatarSize = keyof typeof sizes
export type AvatarTone = keyof typeof tones

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const first = parts[0].charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : ''
  return (first + last).toUpperCase()
}

interface InitialsAvatarProps {
  initials: string
  size?: AvatarSize
  tone?: AvatarTone
}

/** Round avatar with letters. Decorative (aria-hidden): the name is always next to it. */
export function InitialsAvatar({ initials, size = 'md', tone = 'soft' }: InitialsAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full', sizes[size], tones[tone])}
    >
      {initials}
    </span>
  )
}

/** A person's avatar: first and last initials ("Ana Maria Admin" → "AA"). */
export function UserAvatar({ name, size = 'md', tone = 'soft' }: { name: string; size?: AvatarSize; tone?: AvatarTone }) {
  return <InitialsAvatar initials={initialsOf(name)} size={size} tone={tone} />
}
