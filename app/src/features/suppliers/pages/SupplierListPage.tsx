import { RiAddLine, RiTruckLine } from '@remixicon/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { useCan } from '@/app/auth/permissions'
import { Button } from '@/components/ui/button'
import { SupplierCardList } from '@/features/suppliers/components/SupplierCardList'
import { SupplierFilters } from '@/features/suppliers/components/SupplierFilters'
import { SupplierTable } from '@/features/suppliers/components/SupplierTable'
import { PAGE_SIZES, secondaryFilterCount, supplierListParams } from '@/features/suppliers/list-params'
import { supplierKeys, useSetSupplierStatus, useSuppliersPage } from '@/features/suppliers/queries'
import type { Supplier } from '@/features/suppliers/types'
import { useIsCompact } from '@/hooks/use-compact'
import { isApiError } from '@/shared/api/http'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'
import { SetStatusDialog } from '@/shared/components/SetStatusDialog'
import { EmptyState } from '@/shared/list/EmptyState'
import { FiltersButton } from '@/shared/list/FiltersButton'
import { ListCard } from '@/shared/list/ListCard'
import { ListError } from '@/shared/list/ListError'
import { SearchInput } from '@/shared/list/SearchInput'
import { StatusTabs } from '@/shared/list/StatusTabs'
import { useDebouncedText } from '@/shared/list/useDebouncedText'
import { useListSearchParams } from '@/shared/list/useListSearchParams'

export function SupplierListPage() {
  const { t } = useTranslation('suppliers')
  const { t: tc } = useTranslation()
  const queryClient = useQueryClient()
  const compact = useIsCompact()
  const canWrite = useCan('suppliers.write')
  const { params, update, updateFilters, updateTextFilter, clearFilters } = useListSearchParams(supplierListParams)
  // The Filters popover clears only its own (secondary) filters: search and status tab stay.
  const clearSecondary = () => updateFilters({ taxId: undefined })
  const [toDeactivate, setToDeactivate] = useState<Supplier | null>(null)
  const { data, isPending, isError, isPlaceholderData, refetch } = useSuppliersPage(params)
  const { mutateAsync: setStatus } = useSetSupplierStatus()
  const [search, setSearch] = useDebouncedText(params.name, (name) => updateTextFilter({ name }))

  async function changeStatus(supplier: Supplier, active: boolean) {
    try {
      await setStatus({ id: supplier.id, active })
      toast.success(active ? t('status.activated') : t('status.deactivated'))
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        toast.error(t('status.notFound'))
        await queryClient.invalidateQueries({ queryKey: supplierKeys.all })
      } else if (!(isApiError(error) && error.status === 403)) {
        // A 403 already got the global permission toast.
        toast.error(tc('errors.unexpected'))
      }
    }
  }

  const newSupplierButton = canWrite ? (
    <Button asChild>
      <Link to="/suppliers/new">
        <RiAddLine data-icon="inline-start" />
        {t('list.newSupplier')}
      </Link>
    </Button>
  ) : null

  const actions = {
    onDeactivate: setToDeactivate,
    onActivate: (supplier: Supplier) => void changeStatus(supplier, true),
  }

  let body
  if (isError) {
    body = <ListError message={t('list.error')} onRetry={() => void refetch()} />
  } else if (data && data.content.length === 0) {
    body = supplierListParams.hasActiveFilters(params) ? (
      <EmptyState
        icon={RiTruckLine}
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
        icon={RiTruckLine}
        title={t('list.emptyTitle')}
        description={t('list.emptyDescription')}
        action={newSupplierButton}
      />
    )
  } else if (compact) {
    body = <SupplierCardList suppliers={data?.content ?? []} loading={isPending} {...actions} />
  } else {
    body = (
      <SupplierTable
        suppliers={data?.content ?? []}
        loading={isPending}
        sortBy={params.sortBy}
        direction={params.direction}
        onSortChange={(sortBy, direction) => update({ sortBy, direction, page: 0 })}
        {...actions}
      />
    )
  }

  const toolbar = (
    <>
      <StatusTabs
        value={params.active}
        onChange={(active) => updateFilters({ active })}
        count={isPlaceholderData ? undefined : data?.totalElements}
      />
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <SearchInput value={search} onChange={setSearch} label={t('list.searchSuppliers')} />
        <FiltersButton activeCount={secondaryFilterCount(params)} onClear={clearSecondary}>
          <SupplierFilters params={params} onTextChange={updateTextFilter} />
        </FiltersButton>
      </div>
    </>
  )

  const showFooter = !isError && data !== undefined && data.content.length > 0

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={newSupplierButton} />
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
      <SetStatusDialog
        name={toDeactivate?.legalName ?? null}
        onOpenChange={(open) => {
          if (!open) setToDeactivate(null)
        }}
        onConfirm={async () => {
          if (toDeactivate) await changeStatus(toDeactivate, false)
          setToDeactivate(null)
        }}
      />
    </>
  )
}
