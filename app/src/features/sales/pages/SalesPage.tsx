import { RiReceiptLine } from '@remixicon/react'
import { type ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCurrency } from '@/app/currency-provider'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { KpiCard } from '@/features/dashboard/components/KpiCard'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { EmptyState } from '@/shared/list/EmptyState'
import { ListCard } from '@/shared/list/ListCard'
import { ListError } from '@/shared/list/ListError'
import { useListSearchParams } from '@/shared/list/useListSearchParams'
import { SaleDetailDialog } from '../components/SaleDetailDialog'
import { SaleList } from '../components/SaleList'
import { ExportSalesButton } from '../export'
import { PAGE_SIZES, saleListParams, toPaymentMethod, toSaleQuery, toStatus } from '../list-params'
import { SALE_PERIODS, toSalePeriod } from '../period'
import { useSalesPage, useSalesSummary } from '../queries'
import { PAYMENT_METHODS, type SaleStatus } from '../types'

const STATUS_FILTERS = ['all', 'COMPLETED', 'CANCELLED'] as const

/** The sales history: the period's totals, filters in the URL, and each sale's detail (and cancellation). */
export function SalesPage() {
  const { t, i18n } = useTranslation('sales')
  const { t: tc } = useTranslation()
  const { formatMoney } = useCurrency()
  const { params, update, updateFilters, clearFilters } = useListSearchParams(saleListParams)
  // Recomputed with the params only, so "today" stays stable while the user pages.
  const query = useMemo(() => toSaleQuery(params), [params])
  const range = useMemo(() => ({ from: query.from as string, to: query.to as string }), [query])
  const { data, isPending, isError, isPlaceholderData, refetch } = useSalesPage(query)
  const { data: totals } = useSalesSummary(range)
  const [openSale, setOpenSale] = useState<number | null>(null)
  const count = useMemo(() => new Intl.NumberFormat(i18n.language), [i18n.language])
  const status = toStatus(params.status)
  const payment = toPaymentMethod(params.paymentMethod)
  const period = toSalePeriod(params.period)
  const filtered = status !== undefined || payment !== undefined

  let body: ReactNode
  if (isError) {
    body = <ListError message={t('history.error')} onRetry={() => void refetch()} />
  } else if (data && data.content.length === 0) {
    body = filtered ? (
      <EmptyState
        icon={RiReceiptLine}
        title={tc('empty.noResultsTitle')}
        description={tc('empty.noResultsDescription')}
        action={
          <Button variant="outline" onClick={clearFilters}>
            {tc('actions.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={RiReceiptLine}
        title={t('history.emptyTitle')}
        description={t('history.emptyDescription')}
        action={
          <Button asChild>
            <Link to="/pos">{t('history.openPos')}</Link>
          </Button>
        }
      />
    )
  } else {
    body = (
      <div className="px-2 py-2 sm:px-3">
        <SaleList sales={data?.content ?? []} loading={isPending} onOpen={(sale) => setOpenSale(sale.id)} />
      </div>
    )
  }

  const toolbar = (
    <>
      <SegmentedControl<SaleStatus | 'all'>
        label={t('history.statusLabel')}
        value={status ?? 'all'}
        onChange={(next) => updateFilters({ status: next === 'all' ? undefined : next })}
        options={STATUS_FILTERS.map((value) => ({
          value,
          label: t(`history.${value}`),
          badge: isPlaceholderData ? undefined : data?.totalElements,
        }))}
      />
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <Select value={payment ?? 'any'} onValueChange={(next) => updateFilters({ paymentMethod: next === 'any' ? undefined : next })}>
          <SelectTrigger className="w-full rounded-full sm:w-44" aria-label={t('history.paymentLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            <SelectItem value="any">{t('history.anyPayment')}</SelectItem>
            {PAYMENT_METHODS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`payment.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(next) => updateFilters({ period: next === 'today' ? undefined : next })}>
          <SelectTrigger className="w-full rounded-full sm:w-44" aria-label={t('history.periodLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="end">
            {SALE_PERIODS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`history.period.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  )

  const showFooter = !isError && data !== undefined && data.content.length > 0

  return (
    <>
      <PageHeader title={t('history.title')} description={t('history.description')} actions={<ExportSalesButton query={query} />} />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KpiCard
          variant="accent"
          label={t('history.revenue')}
          value={totals?.revenue ?? 0}
          format={formatMoney}
          hint={t('history.revenueHint', { count: totals?.sales ?? 0 })}
        />
        <KpiCard label={t('history.ticket')} value={totals?.averageTicket ?? 0} format={formatMoney} hint={t('history.ticketHint')} />
        <KpiCard
          label={t('history.cancelled')}
          value={totals?.cancelled ?? 0}
          format={(value) => count.format(Math.round(value))}
          hint={t('history.cancelledHint')}
        />
      </div>
      <ListCard
        toolbar={toolbar}
        refreshing={isPlaceholderData}
        footer={
          showFooter ? (
            <DataTablePagination
              page={params.page}
              size={params.size}
              sizes={PAGE_SIZES}
              totalElements={data.totalElements}
              totalPages={data.totalPages}
              onPageChange={(page) => update({ page })}
              onSizeChange={(size) => update({ size, page: 0 })}
            />
          ) : undefined
        }
      >
        {body}
      </ListCard>
      <SaleDetailDialog saleId={openSale} onOpenChange={(open) => !open && setOpenSale(null)} />
    </>
  )
}
