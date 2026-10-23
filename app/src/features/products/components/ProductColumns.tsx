import { RiMore2Line } from '@remixicon/react'
import type { ColumnDef, HeaderContext } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCan } from '@/app/auth/permissions'
import { useCurrency } from '@/app/currency-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Product } from '@/features/products/types'
import { SortableHeader, listTableFeatures, type ListTableFeatures } from '@/shared/components/SortableHeader'
import { StatusBadge } from '@/shared/components/StatusBadge'

export const productTableFeatures = listTableFeatures
type Features = ListTableFeatures

export function useProductColumns(onDelete: (product: Product) => void): ColumnDef<Features, Product>[] {
  const { t, i18n } = useTranslation('products')
  const { formatMoney } = useCurrency()
  const canWrite = useCan('products.write')

  return useMemo(() => {
    const quantity = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 })
    const header = (key: 'sku' | 'name' | 'category' | 'price' | 'status') =>
      function Header(context: HeaderContext<Features, Product, unknown>) {
        return <SortableHeader context={context} label={t(`columns.${key}`)} />
      }

    const columns: ColumnDef<Features, Product>[] = [
      { id: 'sku', accessorKey: 'sku', header: header('sku') },
      {
        id: 'name',
        accessorKey: 'name',
        header: header('name'),
        cell: ({ row }) => (
          <Link
            to={`/products/${row.original.id}/edit`}
            className="font-medium hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.name}
          </Link>
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
        header: header('price'),
        cell: ({ row }) => formatMoney(row.original.price),
      },
      {
        id: 'stock',
        header: t('columns.stock'),
        enableSorting: false,
        cell: ({ row }) => {
          const p = row.original
          return (
            <div className="flex items-center gap-2">
              <span>
                {quantity.format(p.stockQuantity)} {t(`units.${p.unitOfMeasure}`)}
              </span>
              {p.stockQuantity <= p.minimumStock ? <Badge variant="destructive">{t('list.lowStock')}</Badge> : null}
            </div>
          )
        },
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
          <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={t('list.rowActions')}>
                  <RiMore2Line />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/products/${row.original.id}/edit`}>{t('actions.edit', { ns: 'common' })}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row.original)}>
                  {t('actions.delete', { ns: 'common' })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ]
    // Without write access the row has no Edit/Delete menu; the row and the name still open the form.
    return canWrite ? columns : columns.filter((column) => column.id !== 'actions')
  }, [t, i18n.language, formatMoney, onDelete, canWrite])
}
