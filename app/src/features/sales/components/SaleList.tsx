import { RiReceiptLine } from '@remixicon/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/app/currency-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Pill } from '@/shared/components/Pill'
import { placeholderKeys } from '@/shared/list/placeholder-keys'
import { NUDGE_ON_HOVER } from '@/shared/motion/presets'
import type { SaleSummary } from '../types'

interface SaleListProps {
  sales: SaleSummary[]
  loading: boolean
  onOpen: (sale: SaleSummary) => void
}

/** Sales as list rows: number and time, who closed it, payment, status and total. Each row opens the sale. */
export function SaleList({ sales, loading, onOpen }: SaleListProps) {
  const { t, i18n } = useTranslation('sales')
  const { formatMoney } = useCurrency()
  const date = useMemo(() => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }), [i18n.language])

  if (loading) {
    return (
      <ul className="flex flex-col gap-1" aria-hidden="true">
        {placeholderKeys(6).map((key) => (
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
    <ul className="flex flex-col gap-1" aria-label={t('history.label')}>
      {sales.map((sale) => {
        const cancelled = sale.status === 'CANCELLED'
        return (
          <li key={sale.id}>
            <button
              type="button"
              aria-label={t('history.open', { number: sale.number })}
              onClick={() => onOpen(sale)}
              className={cn(
                'hover:bg-muted/60 focus-visible:bg-muted/60 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl px-3 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
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
                <RiReceiptLine className="size-5" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn('font-bold', cancelled && 'text-muted-foreground line-through')}>
                    {t('history.number', { number: sale.number })}
                  </span>
                  {cancelled ? <Pill tone="danger">{t('history.status.CANCELLED')}</Pill> : null}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-[13px] sm:line-clamp-1">
                  <time dateTime={sale.createdAt}>{date.format(new Date(sale.createdAt))}</time>
                  {' · '}
                  {t('history.items', { count: sale.itemCount })} · {t(`payment.${sale.paymentMethod}`)}
                  {sale.createdByName ? ` · ${t('history.by', { name: sale.createdByName })}` : ''}
                </span>
              </span>
              <span className={cn('font-extrabold whitespace-nowrap tabular-nums', cancelled && 'text-muted-foreground line-through')}>
                {formatMoney(sale.total)}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
