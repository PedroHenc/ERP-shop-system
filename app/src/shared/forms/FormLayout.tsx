import type { ReactNode } from 'react'

interface FormLayoutProps {
  main: ReactNode
  aside: ReactNode
  /** Accessible name of the summary landmark. */
  asideLabel: string
}

/**
 * Two columns from `lg`: sections on the left, a sticky 320px summary on the right.
 * The summary comes first in the DOM (and so below `lg`); on `lg` grid placement moves it to the right column.
 */
export function FormLayout({ main, aside, asideLabel }: FormLayoutProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <aside aria-label={asideLabel} className="lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:self-start">
        {aside}
      </aside>
      <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-1">{main}</div>
    </div>
  )
}
