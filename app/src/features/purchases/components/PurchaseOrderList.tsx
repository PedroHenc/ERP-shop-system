import { RiInboxArchiveLine } from '@remixicon/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCurrency } from '@/app/currency-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { placeholderKeys } from '@/shared/list/placeholder-keys'
import { NUDGE_ON_HOVER } from '@/shared/motion/presets'
import type { PurchaseOrderSummary } from '../types'
import { PurchaseStatusPill } from './PurchaseStatusPill'

/** Orders as list rows: number and status, supplier, date and items, and the total (what arrived, once received). */
export function PurchaseOrderList({ orders, loading }: { orders: PurchaseOrderSummary[]; loading: boolean }) {
  const { t, i18n } = useTranslation('purchases')
  const { formatMoney } = useCurrency()
  const date = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short' }), [i18n.language])

  if (loading) {
    return (
      <ul className="flex flex-col gap-1" aria-hidden="true">
        {placeholderKeys(5).map((key) => (
          <li key={key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3.5 px-3 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-20" />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="flex flex-col gap-1" aria-label={t('list.label')}>
      {orders.map((order) => {
        const cancelled = order.status === 'CANCELLED'
        return (
          <li key={order.id}>
            <Link
              to={`/purchases/${order.id}`}
              className={cn(
                'hover:bg-muted/60 focus-visible:bg-muted/60 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl px-3 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                NUDGE_ON_HOVER,
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-10 shrink-0 items-center justify-center rounded-full',
                  cancelled ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
                )}
              >
                <RiInboxArchiveLine className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn('font-bold', cancelled && 'text-muted-foreground line-through')}>
                    {t('number', { number: order.number })}
                  </span>
                  <PurchaseStatusPill status={order.status} />
                </span>
                <span className="text-muted-foreground line-clamp-2 text-[13px] sm:line-clamp-1">
                  {order.supplierName} · <time dateTime={order.createdAt}>{date.format(new Date(order.createdAt))}</time> ·{' '}
                  {t('list.items', { count: order.items })}
                </span>
              </span>
              <span className={cn('font-extrabold whitespace-nowrap tabular-nums', cancelled && 'text-muted-foreground line-through')}>
                {formatMoney(order.receivedTotal ?? order.total)}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
