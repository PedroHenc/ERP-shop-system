import type { ReactNode } from 'react'

/** Two columns from `lg`: sections on the left, a sticky 320px summary on the right. Below `lg` the summary comes first. */
export function FormLayout({ main, aside }: { main: ReactNode; aside: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <div className="order-first lg:sticky lg:top-20 lg:order-none lg:self-start">{aside}</div>
    </div>
  )
}
