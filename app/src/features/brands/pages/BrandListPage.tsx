import { RiAddLine, RiPriceTag3Line } from '@remixicon/react'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { useCan } from '@/app/auth/permissions'
import { Button } from '@/components/ui/button'
import { BrandCardList } from '@/features/brands/components/BrandCardList'
import { BrandDialog } from '@/features/brands/components/BrandDialog'
import { BrandTable } from '@/features/brands/components/BrandTable'
import { PAGE_SIZES, brandListParams } from '@/features/brands/list-params'
import { brandKeys, useBrandsPage, useSetBrandStatus } from '@/features/brands/queries'
import type { BrandDetail } from '@/features/brands/types'
import { useIsCompact } from '@/hooks/use-compact'
import { isApiError } from '@/shared/api/http'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'
import { SetStatusDialog } from '@/shared/components/SetStatusDialog'
import { EmptyState } from '@/shared/list/EmptyState'
import { ListCard } from '@/shared/list/ListCard'
import { ListError } from '@/shared/list/ListError'
import { SearchInput } from '@/shared/list/SearchInput'
import { StatusTabs } from '@/shared/list/StatusTabs'
import { useDebouncedText } from '@/shared/list/useDebouncedText'
import { useListSearchParams } from '@/shared/list/useListSearchParams'

/** Router state `{ newBrand: true }` (dashboard shortcut) asks for the create dialog on arrival. */
function isNewBrandState(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { newBrand?: unknown }).newBrand === true
}

export function BrandListPage() {
  const { t } = useTranslation('brands')
  const { t: tc } = useTranslation()
  const queryClient = useQueryClient()
  const compact = useIsCompact()
  const canWrite = useCan('brands.write')
  const { params, update, updateFilters, updateTextFilter, clearFilters } = useListSearchParams(brandListParams)
  const location = useLocation()
  const navigate = useNavigate()
  // The dashboard "New brand" shortcut arrives with { newBrand: true }: open the create dialog once.
  const [editing, setEditing] = useState<number | 'new' | null>(() =>
    canWrite && isNewBrandState(location.state) ? 'new' : null,
  )
  useEffect(() => {
    // Drop the flag so Back or a refresh does not reopen the dialog.
    if (isNewBrandState(location.state)) void navigate({ search: location.search }, { replace: true, state: null })
  }, [location.state, location.search, navigate])
  const [toDeactivate, setToDeactivate] = useState<BrandDetail | null>(null)
  const { data, isPending, isError, isPlaceholderData, refetch } = useBrandsPage(params)
  const { mutateAsync: setStatus } = useSetBrandStatus()
  const [search, setSearch] = useDebouncedText(params.name, (name) => updateTextFilter({ name }))

  async function changeStatus(brand: BrandDetail, active: boolean) {
    try {
      await setStatus({ id: brand.id, active })
      toast.success(active ? t('status.activated') : t('status.deactivated'))
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        toast.error(t('status.notFound'))
        await queryClient.invalidateQueries({ queryKey: brandKeys.all })
      } else if (!(isApiError(error) && error.status === 403)) {
        // A 403 already got the global permission toast.
        toast.error(tc('errors.unexpected'))
      }
    }
  }

  const newBrandButton = canWrite ? (
    <Button onClick={() => setEditing('new')}>
      <RiAddLine data-icon="inline-start" />
      {t('list.newBrand')}
    </Button>
  ) : null

  const actions = {
    onEdit: (brand: BrandDetail) => setEditing(brand.id),
    onDeactivate: setToDeactivate,
    onActivate: (brand: BrandDetail) => void changeStatus(brand, true),
  }

  let body
  if (isError) {
    body = <ListError message={t('list.error')} onRetry={() => void refetch()} />
  } else if (data && data.content.length === 0) {
    body = brandListParams.hasActiveFilters(params) ? (
      <EmptyState
        icon={RiPriceTag3Line}
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
        icon={RiPriceTag3Line}
        title={t('list.emptyTitle')}
        description={t('list.emptyDescription')}
        action={newBrandButton}
      />
    )
  } else if (compact) {
    body = <BrandCardList brands={data?.content ?? []} loading={isPending} {...actions} />
  } else {
    body = (
      <BrandTable
        brands={data?.content ?? []}
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
        <SearchInput value={search} onChange={setSearch} label={t('list.searchBrands')} />
      </div>
    </>
  )

  const showFooter = !isError && data !== undefined && data.content.length > 0

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={newBrandButton} />
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
      <BrandDialog brandId={editing} onOpenChange={(open) => !open && setEditing(null)} />
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
