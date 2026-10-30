import { RiCheckLine } from '@remixicon/react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { Panel } from '@/shared/components/Panel'
import { Pill } from '@/shared/components/Pill'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { InitialsAvatar } from '@/shared/components/UserAvatar'
import { EmptyState } from '@/shared/list/EmptyState'
import { NUDGE_ON_HOVER } from '@/shared/motion/presets'
import type { RestockItem } from '../types'

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
    <Panel
      id="restock"
      padding="flush"
      title={t('home.restock.title')}
      actions={items.length > 0 ? t('home.restock.count', { count: items.length }) : undefined}
      className={cn('scroll-mt-20 gap-2.5 pb-3.5', className)}
    >
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
                  className={cn(
                    'hover:bg-muted/60 focus-visible:bg-muted/60 grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 rounded-lg p-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[44px_minmax(0,1.4fr)_minmax(0,1fr)_104px]',
                    NUDGE_ON_HOVER,
                  )}
                >
                  <InitialsAvatar initials={initials(item.name)} size="xl" tone={out ? 'danger' : 'neutral'} />
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
                  <Pill tone={out ? 'dangerSolid' : 'warning'} size="md" className="justify-self-end">
                    {out ? t('home.restock.out') : t('home.restock.low')}
                  </Pill>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </Panel>
  )
}
