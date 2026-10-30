import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useCurrency } from '@/app/currency-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { KpiCard } from '@/features/dashboard/components/KpiCard'
import { PageHeader } from '@/shared/components/PageHeader'
import { Panel } from '@/shared/components/Panel'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { ExportCsvButton } from '@/shared/export/ExportCsvButton'
import { ListError } from '@/shared/list/ListError'
import { Stagger, StaggerItem } from '@/shared/motion/Stagger'
import { FlowChart } from '../components/FlowChart'
import { CategoryShares, ProductRanking } from '../components/ReportRows'
import { DEFAULT_PERIOD, REPORT_PERIODS, type ReportPeriod, reportQuery, toFlowPoints, toReportPeriod } from '../period'
import { useStockReport } from '../queries'
import type { ProductAmount, StockReport } from '../types'

function useProductColumns() {
  const { t } = useTranslation('reports')
  const { t: tp } = useTranslation('products')
  return [
    { header: tp('form.fields.sku'), value: (row: ProductAmount) => row.sku },
    { header: tp('columns.product'), value: (row: ProductAmount) => row.name },
    { header: t('columns.quantity'), value: (row: ProductAmount) => row.quantity },
    { header: tp('form.fields.unitOfMeasure'), value: (row: ProductAmount) => tp(`units.${row.unitOfMeasure}`) },
    { header: t('columns.value'), value: (row: ProductAmount) => row.value },
  ]
}

/** Stock activity of the period (values at current sale prices) and today's stock by category. */
export function ReportsPage() {
  const { t } = useTranslation('reports')
  const [searchParams, setSearchParams] = useSearchParams()
  const period = toReportPeriod(searchParams.get('period'))
  // Recomputed with the period only, so the query key stays stable while the page is open.
  const query = useMemo(() => reportQuery(period), [period])
  const { data, isPending, isError, isPlaceholderData, refetch } = useStockReport(query)
  function changePeriod(next: ReportPeriod) {
    setSearchParams(next === DEFAULT_PERIOD ? {} : { period: next }, { replace: true })
  }

  const header = (
    <PageHeader
      title={t('title')}
      description={t('description')}
      actions={
        <SegmentedControl
          label={t('period.label')}
          value={period}
          onChange={changePeriod}
          options={REPORT_PERIODS.map((value) => ({ value, label: t(`period.${value}`) }))}
        />
      }
    />
  )

  if (isError) {
    return (
      <>
        {header}
        <Panel>
          <ListError message={t('error')} onRetry={() => void refetch()} />
        </Panel>
      </>
    )
  }
  if (isPending || !data) {
    return (
      <>
        {header}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-hidden="true">
          {['in', 'out', 'moves', 'stock'].map((key) => (
            <Skeleton key={key} className="h-[170px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="mt-4 h-80 rounded-xl" aria-hidden="true" />
      </>
    )
  }

  return (
    <>
      {header}
      <Report data={data} refreshing={isPlaceholderData} />
    </>
  )
}

function Report({ data, refreshing }: { data: StockReport; refreshing: boolean }) {
  const { t } = useTranslation('reports')
  const { t: ts } = useTranslation('stock')
  const { i18n } = useTranslation()
  const { formatMoney, currency } = useCurrency()
  const productColumns = useProductColumns()
  // Six-figure amounts don't fit a KPI tile in full: from 100k they go compact ("R$ 173,7 mil").
  const kpiMoney = useMemo(() => {
    const compact = new Intl.NumberFormat(i18n.language, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 })
    return (value: number) => (Math.abs(value) >= 100_000 ? compact.format(value) : formatMoney(value))
  }, [i18n.language, currency, formatMoney])
  const count = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language])
  const { totals } = data
  const stockValue = data.stockByCategory.reduce((sum, row) => sum + row.value, 0)
  const points = toFlowPoints(data.daily)
  return (
    <Stagger className={cn('flex flex-col gap-4 transition-opacity duration-300', refreshing && 'opacity-60')}>
      <StaggerItem className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label={t('kpi.in')}
          value={totals.valueIn}
          format={kpiMoney}
          title={formatMoney(totals.valueIn)}
          hint={t('kpi.inHint', { count: totals.entries })}
        />
        <KpiCard
          label={t('kpi.out')}
          value={totals.valueOut}
          format={kpiMoney}
          title={formatMoney(totals.valueOut)}
          hint={t('kpi.outHint', { count: totals.exits })}
        />
        <KpiCard
          label={t('kpi.movements')}
          value={totals.movements}
          format={(value) => count.format(Math.round(value))}
          hint={t('kpi.movementsHint', {
            entries: count.format(totals.entries),
            exits: count.format(totals.exits),
            adjustments: count.format(totals.adjustments),
          })}
          to="/stock"
        />
        <KpiCard
          label={t('kpi.stock')}
          value={stockValue}
          format={kpiMoney}
          title={formatMoney(stockValue)}
          hint={t('kpi.stockHint')}
          variant="accent"
        />
      </StaggerItem>

      <StaggerItem>
        <Panel
          title={t('flow.title')}
          description={t('flow.description')}
          actions={
            <ExportCsvButton
              filename={t('export.flow')}
              rows={points}
              columns={[
                { header: t('chart.dayColumn'), value: (p) => (p.start === p.end ? p.start : `${p.start} – ${p.end}`) },
                { header: t('chart.in'), value: (p) => p.valueIn },
                { header: t('chart.out'), value: (p) => p.valueOut },
              ]}
            />
          }
        >
          <FlowChart points={points} />
        </Panel>
      </StaggerItem>

      <StaggerItem className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={t('topExits.title')}
          description={t('topExits.description')}
          padding="flush"
          actions={<ExportCsvButton filename={t('export.topExits')} rows={data.topExits} columns={productColumns} />}
        >
          <ProductRanking rows={data.topExits} empty={t('topExits.empty')} />
        </Panel>
        <Panel
          title={t('losses.title')}
          description={t('losses.description')}
          padding="flush"
          actions={<ExportCsvButton filename={t('export.losses')} rows={data.losses} columns={productColumns} />}
        >
          <ProductRanking rows={data.losses} empty={t('losses.empty')} />
        </Panel>
      </StaggerItem>

      <StaggerItem className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={t('categories.title')}
          description={t('categories.description')}
          actions={
            <ExportCsvButton
              filename={t('export.categories')}
              rows={data.stockByCategory}
              columns={[
                { header: t('columns.category'), value: (row) => row.category },
                { header: t('columns.products'), value: (row) => row.products },
                { header: t('columns.value'), value: (row) => row.value },
              ]}
            />
          }
        >
          <CategoryShares rows={data.stockByCategory} empty={t('categories.empty')} />
        </Panel>
        <Panel
          title={t('reasons.title')}
          description={t('reasons.description')}
          actions={
            <ExportCsvButton
              filename={t('export.reasons')}
              rows={data.byReason}
              columns={[
                { header: ts('dialog.type'), value: (row) => ts(`types.${row.type}`) },
                { header: ts('dialog.reason'), value: (row) => ts(`reasons.${row.reason}`) },
                { header: t('columns.movements'), value: (row) => row.movements },
                { header: t('columns.value'), value: (row) => row.value },
              ]}
            />
          }
        >
          {data.byReason.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('reasons.empty')}</p>
          ) : (
            <table className="w-full text-sm tabular-nums">
              <thead>
                <tr className="text-muted-foreground text-left text-xs">
                  <th className="pb-2 font-medium">{ts('dialog.reason')}</th>
                  <th className="pb-2 pl-3 text-right font-medium">{t('columns.movements')}</th>
                  <th className="pb-2 pl-3 text-right font-medium">{t('columns.value')}</th>
                </tr>
              </thead>
              <tbody>
                {data.byReason.map((row) => (
                  <tr key={`${row.type}-${row.reason}`} className="border-t">
                    <td className="py-2.5">
                      <span className="font-semibold">{ts(`reasons.${row.reason}`)}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{ts(`types.${row.type}`)}</span>
                    </td>
                    <td className="py-2.5 pl-3 text-right">{row.movements}</td>
                    <td className="py-2.5 pl-3 text-right font-semibold whitespace-nowrap">{formatMoney(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </StaggerItem>
      <p className="text-muted-foreground text-xs">{t('valuesNote')}</p>
    </Stagger>
  )
}
