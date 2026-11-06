import { RiAddLine, RiInboxArchiveLine } from '@remixicon/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCan } from '@/app/auth/permissions'
import { ADD_ICON_MOTION, Button } from '@/components/ui/button'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { EmptyState } from '@/shared/list/EmptyState'
import { ListCard } from '@/shared/list/ListCard'
import { ListError } from '@/shared/list/ListError'
import { useListSearchParams } from '@/shared/list/useListSearchParams'
import { PurchaseOrderList } from '../components/PurchaseOrderList'
import { ReorderCard } from '../components/ReorderCard'
import { PAGE_SIZES, purchaseListParams, toPurchaseQuery, toPurchaseStatus } from '../list-params'
import { usePurchaseOrders } from '../queries'
import { PURCHASE_STATUSES, type PurchaseStatus } from '../types'

/** Purchase orders, newest first, with the products to reorder above them. */
export function PurchaseOrdersPage() {
  const { t } = useTranslation('purchases')
  const { t: tc } = useTranslation()
  const canWrite = useCan('purchases.write')
  const canSeeSuppliers = useCan('suppliers.read')
  const { params, update, updateFilters, clearFilters } = useListSearchParams(purchaseListParams)
  const query = toPurchaseQuery(params)
  const status = toPurchaseStatus(params.status)
  const { data, isPending, isError, isPlaceholderData, refetch } = usePurchaseOrders(query)

  const newButton = canWrite ? (
    <Button asChild>
      <Link to="/purchases/new">
        <RiAddLine data-icon="inline-start" className={ADD_ICON_MOTION} />
        {t('list.new')}
      </Link>
    </Button>
  ) : null

  let body: ReactNode
  if (isError) {
    body = <ListError message={t('list.error')} onRetry={() => void refetch()} />
  } else if (data && data.content.length === 0) {
    body =
      status !== undefined ? (
        <EmptyState
          icon={RiInboxArchiveLine}
          title={tc('empty.noResultsTitle')}
          description={tc('empty.noResultsDescription')}
          action={
            <Button variant="outline" onClick={clearFilters}>
              {tc('actions.clearFilters')}
            </Button>
          }
        />
      ) : (
        <EmptyState icon={RiInboxArchiveLine} title={t('list.emptyTitle')} description={t('list.emptyDescription')} action={newButton} />
      )
  } else {
    body = (
      <div className="px-2 py-2 sm:px-3">
        <PurchaseOrderList orders={data?.content ?? []} loading={isPending} />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            {canSeeSuppliers ? (
              <Button asChild variant="outline">
                <Link to="/suppliers">
                  <span aria-hidden="true">🚚</span>
                  {t('list.suppliers')}
                </Link>
              </Button>
            ) : null}
            {newButton}
          </>
        }
      />
      <ReorderCard />
      <ListCard
        toolbar={
          <SegmentedControl<PurchaseStatus | 'all'>
            label={t('list.statusLabel')}
            value={status ?? 'all'}
            onChange={(next) => updateFilters({ status: next === 'all' ? undefined : next })}
            options={(['all', ...PURCHASE_STATUSES] as const).map((value) => ({
              value,
              label: value === 'all' ? t('list.all') : t(`list.statusTab.${value}`),
            }))}
          />
        }
        refreshing={isPlaceholderData}
        footer={
          !isError && data !== undefined && data.content.length > 0 ? (
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
