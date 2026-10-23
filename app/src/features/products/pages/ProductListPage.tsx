import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { DeleteProductDialog } from '@/features/products/components/DeleteProductDialog'
import { ProductFilters } from '@/features/products/components/ProductFilters'
import { ProductTable } from '@/features/products/components/ProductTable'
import { PAGE_SIZES, hasActiveFilters, parseListParams, toSearchParams } from '@/features/products/list-params'
import { useProductsPage } from '@/features/products/queries'
import type { Product, ProductListParams } from '@/features/products/types'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'

export function ProductListPage() {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => parseListParams(searchParams), [searchParams])
  const [toDelete, setToDelete] = useState<Product | null>(null)
  const { data, isPending, isError, isPlaceholderData, refetch } = useProductsPage(params)

  const update = useCallback(
    (changes: Partial<ProductListParams>, replace = false) =>
      setSearchParams(toSearchParams({ ...params, ...changes }), { replace }),
    [params, setSearchParams],
  )
  // Any filter change goes back to the first page.
  const updateFilters = (changes: Partial<ProductListParams>) => update({ ...changes, page: 0 })
  // Typed text commits replace the entry so Back doesn't step through every typed prefix.
  const updateTextFilter = (changes: Partial<ProductListParams>) => update({ ...changes, page: 0 }, true)
  const clearFilters = () =>
    setSearchParams(toSearchParams({ page: 0, size: params.size, sortBy: params.sortBy, direction: params.direction }))

  function handleDeleted() {
    if (data && data.content.length === 1 && params.page > 0) update({ page: params.page - 1 })
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
        {hasActiveFilters(params) ? (
          <Button variant="link" onClick={clearFilters}>
            {tc('actions.clearFilters')}
          </Button>
        ) : null}
      </div>
    )
  } else {
    body = (
      <>
        <ProductTable
          products={data?.content ?? []}
          loading={isPending}
          stale={isPlaceholderData}
          sortBy={params.sortBy}
          direction={params.direction}
          onSortChange={(sortBy, direction) => update({ sortBy, direction, page: 0 })}
          onDelete={setToDelete}
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
          <Button asChild>
            <Link to="/products/new">{t('list.newProduct')}</Link>
          </Button>
        }
      />
      <ProductFilters params={params} onChange={updateFilters} onTextChange={updateTextFilter} onClear={clearFilters} />
      {body}
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
