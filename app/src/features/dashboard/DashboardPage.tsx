import type { ReactNode } from 'react'
import { RiAlertLine, RiBox3Line, RiForbidLine, RiMoneyDollarCircleLine } from '@remixicon/react'
import { useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthProvider'
import { useCurrency } from '@/app/currency-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/shared/components/PageHeader'
import { ListError } from '@/shared/list/ListError'
import { Stagger, StaggerItem } from '@/shared/motion/Stagger'
import { KpiCard } from './components/KpiCard'
import { OverviewCard } from './components/OverviewCard'
import { RestockCard } from './components/RestockCard'
import { greetingKey } from './greeting'
import { useDashboardSummary } from './queries'
import { placeholderKeys } from '@/shared/list/placeholder-keys'

function DashboardSkeleton() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" aria-label={t('loading')} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {placeholderKeys(4).map((key) => (
          <Skeleton key={key} className="h-28 rounded-xl" />
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
  const { formatMoney } = useCurrency()
  const { data, isError, refetch } = useDashboardSummary()
  // Intl puts a non-breaking space between symbol and amount; swap it so the KPI can wrap there only.
  const formatMoneyWrappable = (n: number) => formatMoney(n).replace(/[\u00a0\u202f]/g, ' ')
  const formatCount = (n: number) => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }).format(n)
  const firstName = user?.name.split(' ')[0] ?? ''
  const reducedMotion = useReducedMotion()
  const scrollToRestock = () =>
    document.getElementById('restock')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
  const now = new Date()

  let body: ReactNode
  if (isError && !data) {
    body = (
      <div className="rounded-xl bg-card ring-1 ring-foreground/10 shadow-[var(--shadow-card)]">
        <ListError message={t('home.error')} onRetry={() => void refetch()} />
      </div>
    )
  } else if (!data) {
    body = <DashboardSkeleton />
  } else {
    body = (
      <Stagger className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StaggerItem className="flex">
            <KpiCard
              icon={RiBox3Line}
              tone="primary"
              label={t('home.kpi.activeProducts')}
              value={data.activeProducts}
              format={formatCount}
              to="/products?active=true"
            />
          </StaggerItem>
          <StaggerItem className="flex">
            <KpiCard
              icon={RiAlertLine}
              tone="warning"
              label={t('home.kpi.lowStock')}
              value={data.lowStock}
              format={formatCount}
              onClick={scrollToRestock}
            />
          </StaggerItem>
          <StaggerItem className="flex">
            <KpiCard
              icon={RiForbidLine}
              tone="destructive"
              label={t('home.kpi.outOfStock')}
              value={data.outOfStock}
              format={formatCount}
              onClick={scrollToRestock}
            />
          </StaggerItem>
          <StaggerItem className="flex">
            <KpiCard
              icon={RiMoneyDollarCircleLine}
              tone="success"
              label={t('home.kpi.stockValue')}
              value={data.inventoryValue}
              format={formatMoneyWrappable}
            />
          </StaggerItem>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <StaggerItem className="lg:col-span-2">
            <RestockCard items={data.restock} className="h-full" />
          </StaggerItem>
          <StaggerItem>
            <OverviewCard
              activeBrands={data.activeBrands}
              activeSuppliers={data.activeSuppliers}
              formatCount={formatCount}
            />
          </StaggerItem>
        </div>
      </Stagger>
    )
  }

  return (
    <>
      <PageHeader
        title={t(`home.greeting.${greetingKey(now)}`, { name: firstName })}
        description={new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }).format(now)}
      />
      {body}
    </>
  )
}
