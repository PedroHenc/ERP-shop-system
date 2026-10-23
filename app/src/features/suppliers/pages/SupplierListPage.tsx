import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useCan } from '@/app/auth/permissions'
import { Button } from '@/components/ui/button'
import { SupplierFilters } from '@/features/suppliers/components/SupplierFilters'
import { SupplierTable } from '@/features/suppliers/components/SupplierTable'
import { PAGE_SIZES, supplierListParams } from '@/features/suppliers/list-params'
import { supplierKeys, useSetSupplierStatus, useSuppliersPage } from '@/features/suppliers/queries'
import type { Supplier } from '@/features/suppliers/types'
import { isApiError } from '@/shared/api/http'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'
import { SetStatusDialog } from '@/shared/components/SetStatusDialog'
import { useListSearchParams } from '@/shared/list/useListSearchParams'

export function SupplierListPage() {
  const { t } = useTranslation('suppliers')
  const { t: tc } = useTranslation()
  const queryClient = useQueryClient()
  const canWrite = useCan('suppliers.write')
  const { params, update, updateFilters, updateTextFilter, clearFilters } = useListSearchParams(supplierListParams)
  const [toDeactivate, setToDeactivate] = useState<Supplier | null>(null)
  const { data, isPending, isError, isPlaceholderData, refetch } = useSuppliersPage(params)
  const { mutateAsync: setStatus } = useSetSupplierStatus()

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

  let body
  if (isError) {
    body = (
      <Alert variant="destructive">
        <AlertTitle>{t('list.error')}</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {tc('actions.tryAgain')}
          </Button>
        </AlertDescription>
      </Alert>
    )
  } else if (data && data.content.length === 0) {
    body = (
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border py-12 text-sm">
        <p>{t('list.empty')}</p>
        {supplierListParams.hasActiveFilters(params) ? (
          <Button variant="link" onClick={clearFilters}>
            {tc('actions.clearFilters')}
          </Button>
        ) : null}
      </div>
    )
  } else {
    body = (
      <>
        <SupplierTable
          suppliers={data?.content ?? []}
          loading={isPending}
          stale={isPlaceholderData}
          sortBy={params.sortBy}
          direction={params.direction}
          onSortChange={(sortBy, direction) => update({ sortBy, direction, page: 0 })}
          onDeactivate={setToDeactivate}
          onActivate={(supplier) => void changeStatus(supplier, true)}
        />
        {data ? (
          <DataTablePagination
            page={params.page}
            size={params.size}
            sizes={PAGE_SIZES}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            onPageChange={(page) => update({ page })}
            onSizeChange={(size) => update({ size, page: 0 })}
          />
        ) : null}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          canWrite ? (
            <Button asChild>
              <Link to="/suppliers/new">{t('list.newSupplier')}</Link>
            </Button>
          ) : null
        }
      />
      <SupplierFilters params={params} onChange={updateFilters} onTextChange={updateTextFilter} onClear={clearFilters} />
      {body}
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
