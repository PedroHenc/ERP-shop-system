import { RiAlertLine, RiBox3Line, RiForbidLine, RiMoneyDollarCircleLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthProvider'
import { useCurrency } from '@/app/currency-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/shared/components/PageHeader'
import { ListError } from '@/shared/list/ListError'
import { KpiCard } from './components/KpiCard'
import { OverviewCard } from './components/OverviewCard'
import { RestockCard } from './components/RestockCard'
import { greetingKey } from './greeting'
import { useDashboardSummary } from './queries'

function scrollToRestock() {
  document.getElementById('restock')?.scrollIntoView({ behavior: 'smooth' })
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { currency } = useCurrency()
  const { data, isPending, isError, refetch } = useDashboardSummary()
  const formatCount = (n: number) => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }).format(n)
  // The KPI uses the currency's own precision (whole yen for JPY), unlike formatMoney, which keeps stored cents.
  const formatStockValue = (n: number) => new Intl.NumberFormat(i18n.language, { style: 'currency', currency }).format(n)
  const firstName = user?.name.split(' ')[0] ?? ''

  let body
  if (isError) {
    body = (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 shadow-[var(--shadow-card)]">
        <ListError message={t('home.error')} onRetry={() => void refetch()} />
      </div>
    )
  } else if (isPending) {
    body = <DashboardSkeleton />
  } else {
    body = (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={RiBox3Line}
            tone="primary"
            label={t('home.kpi.activeProducts')}
            value={data.activeProducts}
            format={formatCount}
            to="/products?active=true"
          />
          <KpiCard
            icon={RiAlertLine}
            tone="warning"
            label={t('home.kpi.lowStock')}
            value={data.lowStock}
            format={formatCount}
            onClick={scrollToRestock}
          />
          <KpiCard
            icon={RiForbidLine}
            tone="destructive"
            label={t('home.kpi.outOfStock')}
            value={data.outOfStock}
            format={formatCount}
            onClick={scrollToRestock}
          />
          <KpiCard
            icon={RiMoneyDollarCircleLine}
            tone="success"
            label={t('home.kpi.stockValue')}
            value={data.inventoryValue}
            format={formatStockValue}
          />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <RestockCard items={data.restock} className="lg:col-span-2" />
          <OverviewCard
            activeBrands={data.activeBrands}
            activeSuppliers={data.activeSuppliers}
            formatCount={formatCount}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={t(`home.greeting.${greetingKey(new Date())}`, { name: firstName })}
        description={t('home.description')}
      />
      {body}
    </>
  )
}
