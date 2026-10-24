import { RiAddLine, RiBox3Line } from '@remixicon/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCan } from '@/app/auth/permissions'
import { Button } from '@/components/ui/button'
import { DeleteProductDialog } from '@/features/products/components/DeleteProductDialog'
import { ProductCardList } from '@/features/products/components/ProductCardList'
import { ProductFilters } from '@/features/products/components/ProductFilters'
import { ProductTable } from '@/features/products/components/ProductTable'
import { PAGE_SIZES, hasActiveFilters, productList, secondaryFilterCount } from '@/features/products/list-params'
import { useProductsPage } from '@/features/products/queries'
import type { Product } from '@/features/products/types'
import { useIsCompact } from '@/hooks/use-compact'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'
import { EmptyState } from '@/shared/list/EmptyState'
import { FiltersButton } from '@/shared/list/FiltersButton'
import { ListCard } from '@/shared/list/ListCard'
import { ListError } from '@/shared/list/ListError'
import { SearchInput } from '@/shared/list/SearchInput'
import { StatusTabs } from '@/shared/list/StatusTabs'
import { useDebouncedText } from '@/shared/list/useDebouncedText'
import { useListSearchParams } from '@/shared/list/useListSearchParams'

export function ProductListPage() {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const compact = useIsCompact()
  const { params, update, updateFilters, updateTextFilter, clearFilters } = useListSearchParams(productList)
  // The Filters popover clears only its own (secondary) filters: search and status tab stay.
  const clearSecondary = () => updateFilters({ sku: undefined, category: undefined, brandId: undefined })
  const canWrite = useCan('products.write')
  const [toDelete, setToDelete] = useState<Product | null>(null)
  const { data, isPending, isError, isPlaceholderData, refetch } = useProductsPage(params)
  const [search, setSearch] = useDebouncedText(params.name, (name) => updateTextFilter({ name }))

  function handleDeleted() {
    if (data && data.content.length === 1 && params.page > 0) update({ page: params.page - 1 })
  }

  const newProductButton = canWrite ? (
    <Button asChild>
      <Link to="/products/new">
        <RiAddLine data-icon="inline-start" />
        {t('list.newProduct')}
      </Link>
    </Button>
  ) : null

  let body
  if (isError) {
    body = <ListError message={t('list.error')} onRetry={() => void refetch()} />
  } else if (data && data.content.length === 0) {
    body = hasActiveFilters(params) ? (
      <EmptyState
        icon={RiBox3Line}
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
        icon={RiBox3Line}
        title={t('list.emptyTitle')}
        description={t('list.emptyDescription')}
        action={newProductButton}
      />
    )
  } else if (compact) {
    body = <ProductCardList products={data?.content ?? []} loading={isPending} onDelete={setToDelete} />
  } else {
    body = (
      <ProductTable
        products={data?.content ?? []}
        loading={isPending}
        sortBy={params.sortBy}
        direction={params.direction}
        onSortChange={(sortBy, direction) => update({ sortBy, direction, page: 0 })}
        onDelete={setToDelete}
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
        <SearchInput value={search} onChange={setSearch} label={t('list.searchProducts')} />
        <FiltersButton activeCount={secondaryFilterCount(params)} onClear={clearSecondary}>
          <ProductFilters params={params} onChange={updateFilters} onTextChange={updateTextFilter} />
        </FiltersButton>
      </div>
    </>
  )

  const showFooter = !isError && data !== undefined && data.content.length > 0

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} actions={newProductButton} />
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
      <DeleteProductDialog
        product={toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        onDeleted={handleDeleted}
      />
    </>
  )
}
