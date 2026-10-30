import { RiShoppingCart2Line } from '@remixicon/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCurrency } from '@/app/currency-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { saleRange } from '../period'
import { useSalesSummary } from '../queries'

/** The dashboard's line for whoever sells: today's revenue, sales and ticket, and the way to the register. */
export function TodaySales() {
  const { t } = useTranslation('sales')
  const { formatMoney } = useCurrency()
  // Today, fixed at mount: the dashboard is not kept open across midnight long enough to matter.
  const range = useMemo(() => saleRange('today'), [])
  const { data, isPending } = useSalesSummary(range)

  return (
    <section
      aria-labelledby="today-sales-title"
      className="bg-card flex flex-wrap items-center justify-between gap-x-6 gap-y-4 rounded-xl px-6 py-5 shadow-[var(--shadow-card)]"
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-full" aria-hidden="true">
          <RiShoppingCart2Line className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="today-sales-title" className="text-muted-foreground text-sm font-semibold">
            {t('today.title')}
          </h2>
          {isPending || !data ? (
            <Skeleton className="h-8 w-40" />
          ) : (
            <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-[28px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">{formatMoney(data.revenue)}</span>
              <span className="text-muted-foreground text-sm">
                {data.sales === 0
                  ? t('today.none')
                  : `${t('today.sales', { count: data.sales })} · ${t('today.ticket', { value: formatMoney(data.averageTicket) })}`}
              </span>
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/sales">{t('today.history')}</Link>
        </Button>
        <Button asChild>
          <Link to="/pos">{t('today.openPos')}</Link>
        </Button>
      </div>
    </section>
  )
}
