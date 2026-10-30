import { useMemo, type ReactNode } from 'react'
import { useReducedMotionConfig } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthProvider'
import { useCurrency } from '@/app/currency-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { ListError } from '@/shared/list/ListError'
import { Stagger, StaggerItem } from '@/shared/motion/Stagger'
import { placeholderKeys } from '@/shared/list/placeholder-keys'
import { KpiCard } from './components/KpiCard'
import { OverviewCard } from './components/OverviewCard'
import { RestockCard } from './components/RestockCard'
import { StockHealthCard } from './components/StockHealthCard'
import { greetingKey } from './greeting'
import { useDashboardSummary } from './queries'

function DashboardSkeleton() {
  const { t } = useTranslation()
  return (
    <div role="status" aria-busy="true" aria-label={t('loading')} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {placeholderKeys(4).map((key) => (
          <Skeleton key={key} className="h-[170px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 rounded-xl lg:col-span-2" />
        <Skeleton className="h-96 rounded-xl" />
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
  const formatMoneyWrappable = (n: number) => formatMoney(n).replace(/[  ]/g, ' ')
  const formatCount = (n: number) => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }).format(n)
  const percent = useMemo(
    () => new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 1 }),
    [i18n.language],
  )
  const firstName = user?.name.split(' ')[0] ?? ''
  const reducedMotion = useReducedMotionConfig()
  const scrollToRestock = () =>
    document.getElementById('restock')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
  const now = new Date()

  let body: ReactNode
  if (isError && !data) {
    body = (
      <div className="bg-card rounded-xl shadow-[var(--shadow-card)]">
        <ListError message={t('home.error')} onRetry={() => void refetch()} />
      </div>
    )
  } else if (!data) {
    body = <DashboardSkeleton />
  } else {
    const share = (n: number) => percent.format(data.activeProducts > 0 ? n / data.activeProducts : 0)
    const shareBadge = (n: number, tone: 'warning' | 'danger') =>
      n > 0 ? { text: t('home.kpi.shareOfCatalog', { percent: share(n) }), tone } : { text: t('home.kpi.allClear'), tone: 'ok' as const }
    body = (
      <Stagger className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StaggerItem className="flex">
            <KpiCard
              variant="accent"
              label={t('home.kpi.stockValue')}
              value={data.inventoryValue}
              format={formatMoneyWrappable}
              badge={{ text: t('home.kpi.inStockShare', { percent: share(data.activeProducts - data.outOfStock) }), tone: 'ok' }}
              hint={t('home.kpi.stockValueHint')}
            />
          </StaggerItem>
          <StaggerItem className="flex">
            <KpiCard
              label={t('home.kpi.activeProducts')}
              value={data.activeProducts}
              format={formatCount}
              badge={{ text: t('home.kpi.catalog'), tone: 'neutral' }}
              hint={t('home.kpi.activeProductsHint')}
              to="/products?active=true"
            />
          </StaggerItem>
          <StaggerItem className="flex">
            <KpiCard
              label={t('home.kpi.lowStock')}
              value={data.lowStock}
              format={formatCount}
              badge={shareBadge(data.lowStock, 'warning')}
              hint={t('home.kpi.lowStockHint')}
              onClick={scrollToRestock}
            />
          </StaggerItem>
          <StaggerItem className="flex">
            <KpiCard
              label={t('home.kpi.outOfStock')}
              value={data.outOfStock}
              format={formatCount}
              badge={shareBadge(data.outOfStock, 'danger')}
              hint={t('home.kpi.outOfStockHint')}
              onClick={scrollToRestock}
            />
          </StaggerItem>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <StaggerItem className="min-w-0 lg:col-span-2">
            <RestockCard items={data.restock} className="h-full" />
          </StaggerItem>
          <StaggerItem className="flex flex-col gap-4">
            <StockHealthCard
              activeProducts={data.activeProducts}
              lowStock={data.lowStock}
              outOfStock={data.outOfStock}
            />
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
      <div className="mb-7 flex flex-col gap-1.5">
        <p className="text-muted-foreground text-sm">
          {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full' }).format(now)}
        </p>
        <h1 className="text-[clamp(30px,4vw,40px)] leading-[1.1] font-extrabold tracking-[-0.02em]">
          {t(`home.greeting.${greetingKey(now)}`, { name: firstName })}
        </h1>
      </div>
      {body}
    </>
  )
}
