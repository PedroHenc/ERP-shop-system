import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'

interface ListCardProps {
  toolbar: ReactNode
  refreshing: boolean
  footer?: ReactNode
  children: ReactNode
}

/** The single card of a list page: toolbar on top, content, then footer. */
export function ListCard({ toolbar, refreshing, footer, children }: ListCardProps) {
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  return (
    <section className="relative overflow-hidden rounded-xl bg-card text-card-foreground shadow-[var(--shadow-card)] ring-1 ring-foreground/10">
      {refreshing ? (
        <div role="progressbar" aria-label={t('loading')} className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden">
          {reducedMotion ? (
            <span className="block h-full w-1/3 bg-primary" />
          ) : (
            <motion.span
              className="block h-full w-1/3 bg-primary"
              initial={{ x: '-100%' }}
              animate={{ x: '300%' }}
              transition={{ duration: 1.2, ease: 'easeInOut', repeat: Infinity }}
            />
          )}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">{toolbar}</div>
      <div aria-busy={refreshing} className={cn('transition-opacity', refreshing && 'opacity-60')}>
        {children}
      </div>
      {footer ? <div className="border-t">{footer}</div> : null}
    </section>
  )
}
