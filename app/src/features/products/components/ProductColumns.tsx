import type { ColumnDef, HeaderContext } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCan } from '@/app/auth/permissions'
import { useCurrency } from '@/app/currency-provider'
import type { Product } from '@/features/products/types'
import { SortableHeader, listTableFeatures, type ListTableFeatures } from '@/shared/components/SortableHeader'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { HOVER_REVEAL_ACTIONS } from '@/shared/list/row-actions'
import { ProductRowActions, StockCell } from './ProductCells'

export const productTableFeatures = listTableFeatures
type Features = ListTableFeatures

/** Numeric columns are right-aligned (header and cells). */
export const RIGHT_ALIGNED_COLUMNS: ReadonlySet<string> = new Set(['price', 'stock'])

export function useProductColumns(onDelete: (product: Product) => void): ColumnDef<Features, Product>[] {
  const { t } = useTranslation('products')
  const { formatMoney } = useCurrency()
  const canWrite = useCan('products.write')

  return useMemo(() => {
    const header = (key: 'product' | 'category' | 'price' | 'status', align: 'left' | 'right' = 'left') =>
      function Header(context: HeaderContext<Features, Product, unknown>) {
        const sortable = <SortableHeader context={context} label={t(`columns.${key}`)} />
        return align === 'right' ? <div className="-mr-2.5 flex justify-end">{sortable}</div> : sortable
      }

    const columns: ColumnDef<Features, Product>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: header('product'),
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <Link
              to={`/products/${row.original.id}/edit`}
              className="truncate font-medium hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.name}
            </Link>
            <span className="text-xs text-muted-foreground">{row.original.sku}</span>
          </div>
        ),
      },
      { id: 'category', accessorKey: 'category', header: header('category') },
      {
        id: 'brand',
        header: t('columns.brand'),
        enableSorting: false,
        cell: ({ row }) => row.original.brandName ?? '—',
      },
      {
        id: 'price',
        accessorKey: 'price',
        header: header('price', 'right'),
        cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.price)}</span>,
      },
      {
        id: 'stock',
        header: () => <div className="text-right">{t('columns.stock')}</div>,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <StockCell product={row.original} />
          </div>
        ),
      },
      {
        id: 'status',
        accessorKey: 'active',
        header: header('status'),
        cell: ({ row }) => <StatusBadge active={row.original.active} />,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('columns.actions')}</span>,
        enableSorting: false,
        cell: ({ row }) => (
          <ProductRowActions
            product={row.original}
            onDelete={onDelete}
            className={HOVER_REVEAL_ACTIONS}
          />
        ),
      },
    ]
    // Without write access the row has no Edit/Delete menu; the row and the name still open the form.
    return canWrite ? columns : columns.filter((column) => column.id !== 'actions')
  }, [t, formatMoney, onDelete, canWrite])
}
