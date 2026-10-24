import { RiCheckLine } from '@remixicon/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/shared/list/EmptyState'
import type { RestockItem } from '../types'

export function RestockCard({ items, className }: { items: RestockItem[]; className?: string }) {
  const { t, i18n } = useTranslation()
  const quantity = useMemo(() => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 }), [i18n.language])
  return (
    <section
      id="restock"
      aria-labelledby="restock-title"
      className={`scroll-mt-20 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 shadow-[var(--shadow-card)] ${className ?? ''}`}
    >
      <h2 id="restock-title" className="px-4 pt-4 text-base font-semibold">
        {t('home.restock.title')}
      </h2>
      {items.length === 0 ? (
        <EmptyState
          icon={RiCheckLine}
          titleAs="h3"
          title={t('home.restock.emptyTitle')}
          description={t('home.restock.emptyDescription')}
        />
      ) : (
        <ul className="mt-2 divide-y">
          {items.map((item) => {
            const out = item.stockQuantity <= 0
            const ratio = item.minimumStock > 0 ? Math.min(Math.max(item.stockQuantity / item.minimumStock, 0), 1) : 0
            return (
              <li key={item.id}>
                <Link
                  to={`/products/${item.id}/edit`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium">{item.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{item.sku}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-muted sm:block"
                  >
                    <span
                      className={`block h-full rounded-full ${out ? 'bg-destructive' : 'bg-warning'}`}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums">
                    {quantity.format(item.stockQuantity)} / {quantity.format(item.minimumStock)}
                  </span>
                  <Badge variant={out ? 'destructive' : 'warning'}>
                    {out ? t('home.restock.out') : t('home.restock.low')}
                  </Badge>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
