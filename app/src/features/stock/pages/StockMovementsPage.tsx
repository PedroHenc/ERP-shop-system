import { RiArrowLeftRightLine, RiCloseLine } from '@remixicon/react'
import { type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useProduct } from '@/features/products/queries'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { EmptyState } from '@/shared/list/EmptyState'
import { ListCard } from '@/shared/list/ListCard'
import { ListError } from '@/shared/list/ListError'
import { useListSearchParams } from '@/shared/list/useListSearchParams'
import { MovementList } from '../components/MovementList'
import { PAGE_SIZES, PERIODS, stockListParams, toManualType, toPeriod, toStockQuery } from '../list-params'
import { useStockMovements } from '../queries'
import { MANUAL_MOVEMENT_TYPES, type ManualMovementType } from '../types'

const TYPE_FILTERS = ['all', ...MANUAL_MOVEMENT_TYPES] as const

/** The store's stock history, newest first, filtered by type, period and (from a product) product. */
export function StockMovementsPage() {
  const { t } = useTranslation('stock')
  const { t: tc } = useTranslation()
  const { params, update, updateFilters, clearFilters } = useListSearchParams(stockListParams)
  // Recomputed with the params only, so "today" stays stable while the user pages.
  const query = useMemo(() => toStockQuery(params), [params])
  const { data, isPending, isError, isPlaceholderData, refetch } = useStockMovements(query)
  const { data: product } = useProduct(params.productId)
  const type = toManualType(params.type)
  const period = toPeriod(params.period)

  let body: ReactNode
  if (isError) {
    body = <ListError message={t('list.error')} onRetry={() => void refetch()} />
  } else if (data && data.content.length === 0) {
    body = stockListParams.hasActiveFilters(params) ? (
      <EmptyState
        icon={RiArrowLeftRightLine}
        title={tc('empty.noResultsTitle')}
        description={tc('empty.noResultsDescription')}
        action={
          <Button variant="outline" onClick={clearFilters}>
            {tc('actions.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState icon={RiArrowLeftRightLine} title={t('list.emptyTitle')} description={t('list.emptyDescription')} />
    )
  } else {
    body = (
      <div className="px-2 py-2 sm:px-3">
        <MovementList movements={data?.content ?? []} loading={isPending} />
      </div>
    )
  }

  const toolbar = (
    <>
      <SegmentedControl<ManualMovementType | 'all'>
        label={t('filters.typeLabel')}
        value={type ?? 'all'}
        onChange={(next) => updateFilters({ type: next === 'all' ? undefined : next })}
        options={TYPE_FILTERS.map((value) => ({
          value,
          label: t(`filters.${value}`),
          badge: isPlaceholderData ? undefined : data?.totalElements,
        }))}
      />
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        {params.productId !== undefined ? (
          <span className="bg-primary/10 text-primary inline-flex h-8 max-w-full items-center gap-1 rounded-full pr-1 pl-3 text-sm font-semibold">
            <span className="truncate">{t('filters.product', { name: product?.name ?? '…' })}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="hover:bg-primary/15 text-primary rounded-full"
              aria-label={t('filters.clearProduct')}
              onClick={() => updateFilters({ productId: undefined })}
            >
              <RiCloseLine />
            </Button>
          </span>
        ) : null}
        <Select value={period} onValueChange={(next) => updateFilters({ period: next === 'all' ? undefined : next })}>
          <SelectTrigger className="w-full rounded-full sm:w-44" aria-label={t('filters.periodLabel')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {PERIODS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`filters.period.${value}`)}
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
      <PageHeader title={t('title')} description={t('description')} />
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
    </>
  )
}
