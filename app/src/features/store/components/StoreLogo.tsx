import { RiStore2Line } from '@remixicon/react'
import { cn } from '@/lib/utils'

/** The store's logo in a circle, or the default store icon on the accent color. */
export function StoreLogo({ logo, className }: { logo: string | null | undefined; className?: string }) {
  return logo ? (
    <img src={logo} alt="" className={cn('size-[38px] shrink-0 rounded-full object-cover', className)} />
  ) : (
    <span
      className={cn('bg-primary text-primary-foreground flex size-[38px] shrink-0 items-center justify-center rounded-full', className)}
    >
      <RiStore2Line className="size-[52%]" aria-hidden="true" />
    </span>
  )
}
