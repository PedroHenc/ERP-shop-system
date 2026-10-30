import { RiCheckLine } from '@remixicon/react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/shared/list/EmptyState'
import type { RestockItem } from '../types'

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const

/** Two-letter avatar from the product name ("Granola Crunch" → "GC", "Granola" → "GR"). */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.trim().slice(0, 2)
  return letters.toUpperCase()
}

export function RestockCard({ items, className }: { items: RestockItem[]; className?: string }) {
  const { t, i18n } = useTranslation()
  const quantity = useMemo(() => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 }), [i18n.language])
  const reducedMotion = useReducedMotion()
  return (
    <section
      id="restock"
      aria-labelledby="restock-title"
      className={cn(
        'bg-card flex scroll-mt-20 flex-col gap-2.5 rounded-xl px-3.5 pt-6 pb-3.5 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-3 pb-1.5">
        <h2 id="restock-title" className="text-lg font-extrabold">
          {t('home.restock.title')}
        </h2>
        {items.length > 0 ? (
          <span className="text-muted-foreground text-[13px]">{t('home.restock.count', { count: items.length })}</span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <EmptyState
          icon={RiCheckLine}
          titleAs="h3"
          title={t('home.restock.emptyTitle')}
          description={t('home.restock.emptyDescription')}
        />
      ) : (
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const out = item.stockQuantity <= 0
            const ratio = item.minimumStock > 0 ? Math.min(Math.max(item.stockQuantity / item.minimumStock, 0), 1) : 0
            return (
              <li key={item.id}>
                <Link
                  to={`/products/${item.id}/edit`}
                  className="hover:bg-muted/60 focus-visible:bg-muted/60 grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 rounded-lg p-3 transition-[background-color,transform] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] outline-none hover:translate-x-1 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:translate-x-0 sm:grid-cols-[44px_minmax(0,1.4fr)_minmax(0,1fr)_104px]"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-11 items-center justify-center rounded-full text-[13px] font-extrabold',
                      out ? 'bg-destructive text-white' : 'bg-muted text-foreground',
                    )}
                  >
                    {initials(item.name)}
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-semibold">{item.name}</span>
                    <span className="text-muted-foreground truncate text-[13px]">{item.sku}</span>
                  </span>
                  <span className="col-span-2 col-start-2 row-start-2 flex flex-col gap-1.5 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                    <span className="text-muted-foreground flex justify-between gap-2 text-xs">
                      <span>{t('home.restock.stock')}</span>
                      <span className="text-foreground font-semibold tabular-nums">
                        {quantity.format(item.stockQuantity)} / {quantity.format(item.minimumStock)}
                      </span>
                    </span>
                    <span aria-hidden="true" className="bg-muted block h-2 overflow-hidden rounded-full">
                      <motion.span
                        className={cn('block h-full rounded-full', out ? 'bg-destructive' : 'bg-foreground')}
                        // Reduced motion: drawn at the final width, no sweep from zero.
                        initial={reducedMotion ? false : { width: 0 }}
                        animate={{ width: `${ratio * 100}%` }}
                        transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.45 }}
                      />
                    </span>
                  </span>
                  <span
                    className={cn(
                      'justify-self-end rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap',
                      out ? 'bg-destructive text-white' : 'bg-warning-soft text-warning-foreground',
                    )}
                  >
                    {out ? t('home.restock.out') : t('home.restock.low')}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
