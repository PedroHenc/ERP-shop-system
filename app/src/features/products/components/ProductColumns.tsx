import { RiArrowDownLine, RiArrowUpDownLine, RiArrowUpLine, RiMore2Line } from '@remixicon/react'
import { type ColumnDef, type HeaderContext, rowPaginationFeature, rowSortingFeature, tableFeatures } from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
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

export const productTableFeatures = tableFeatures({ rowPaginationFeature, rowSortingFeature })
type Features = typeof productTableFeatures

function SortableHeader({ context, label }: { context: HeaderContext<Features, Product, unknown>; label: string }) {
  const sorted = context.column.getIsSorted()
  const Icon = sorted === 'asc' ? RiArrowUpLine : sorted === 'desc' ? RiArrowDownLine : RiArrowUpDownLine
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2.5"
      onClick={(event) => {
        event.stopPropagation()
        context.column.toggleSorting()
      }}
    >
      {label}
      <Icon className={sorted ? undefined : 'text-muted-foreground'} />
    </Button>
  )
}

export function useProductColumns(onDelete: (product: Product) => void): ColumnDef<Features, Product>[] {
  const { t, i18n } = useTranslation('products')
  const { formatMoney } = useCurrency()

  return useMemo(() => {
    const quantity = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 })
    const header = (key: 'sku' | 'name' | 'category' | 'price' | 'status') =>
      function Header(context: HeaderContext<Features, Product, unknown>) {
        return <SortableHeader context={context} label={t(`columns.${key}`)} />
      }

    return [
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
        cell: ({ row }) =>
          row.original.active ? (
            <Badge>{t('status.active')}</Badge>
          ) : (
            <Badge variant="secondary">{t('status.inactive')}</Badge>
          ),
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
  }, [t, i18n.language, formatMoney, onDelete])
}
