import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { BrandFilters } from '@/features/brands/components/BrandFilters'
import { BrandTable } from '@/features/brands/components/BrandTable'
import { PAGE_SIZES, brandListParams } from '@/features/brands/list-params'
import { brandKeys, useBrandsPage, useSetBrandStatus } from '@/features/brands/queries'
import type { BrandDetail } from '@/features/brands/types'
import { isApiError } from '@/shared/api/http'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'
import { SetStatusDialog } from '@/shared/components/SetStatusDialog'
import { useListSearchParams } from '@/shared/list/useListSearchParams'

export function BrandListPage() {
  const { t } = useTranslation('brands')
  const { t: tc } = useTranslation()
  const queryClient = useQueryClient()
  const { params, update, updateFilters, updateTextFilter, clearFilters } = useListSearchParams(brandListParams)
  // The create/edit dialog (added in the next task) is driven by this state.
  const [, setEditing] = useState<number | 'new' | null>(null)
  const [toDeactivate, setToDeactivate] = useState<BrandDetail | null>(null)
  const { data, isPending, isError, isPlaceholderData, refetch } = useBrandsPage(params)
  const { mutateAsync: setStatus } = useSetBrandStatus()

  async function changeStatus(brand: BrandDetail, active: boolean) {
    try {
      await setStatus({ id: brand.id, active })
      toast.success(active ? t('status.activated') : t('status.deactivated'))
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        toast.error(t('status.notFound'))
        await queryClient.invalidateQueries({ queryKey: brandKeys.all })
      } else {
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
        {brandListParams.hasActiveFilters(params) ? (
          <Button variant="link" onClick={clearFilters}>
            {tc('actions.clearFilters')}
          </Button>
        ) : null}
      </div>
    )
  } else {
    body = (
      <>
        <BrandTable
          brands={data?.content ?? []}
          loading={isPending}
          stale={isPlaceholderData}
          sortBy={params.sortBy}
          direction={params.direction}
          onSortChange={(sortBy, direction) => update({ sortBy, direction, page: 0 })}
          onEdit={(brand) => setEditing(brand.id)}
          onDeactivate={setToDeactivate}
          onActivate={(brand) => void changeStatus(brand, true)}
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
      <PageHeader title={t('title')} actions={<Button onClick={() => setEditing('new')}>{t('list.newBrand')}</Button>} />
      <BrandFilters params={params} onChange={updateFilters} onTextChange={updateTextFilter} onClear={clearFilters} />
      {body}
      <SetStatusDialog
        name={toDeactivate?.name ?? null}
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
