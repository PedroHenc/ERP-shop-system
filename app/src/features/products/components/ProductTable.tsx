import {
  type SortingState,
  type Updater,
  flexRender,
  useTable,
} from '@tanstack/react-table'
import { useNavigate } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Product, ProductSortField } from '@/features/products/types'
import { cn } from '@/lib/utils'
import { productTableFeatures, useProductColumns } from './ProductColumns'

interface ProductTableProps {
  products: Product[]
  /** True on the first load, before any data exists. */
  loading: boolean
  /** True while refetching with the previous page still shown. */
  stale: boolean
  sortBy: ProductSortField
  direction: 'ASC' | 'DESC'
  onSortChange: (sortBy: ProductSortField, direction: 'ASC' | 'DESC') => void
  onDelete: (product: Product) => void
}

const SKELETON_ROWS = 8

export function ProductTable({ products, loading, stale, sortBy, direction, onSortChange, onDelete }: ProductTableProps) {
  const navigate = useNavigate()
  const columns = useProductColumns(onDelete)
  const sorting: SortingState = [{ id: sortBy === 'active' ? 'status' : sortBy, desc: direction === 'DESC' }]

  function handleSortingChange(updater: Updater<SortingState>) {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    const first = next[0]
    if (!first) return
    onSortChange(first.id === 'status' ? 'active' : (first.id as ProductSortField), first.desc ? 'DESC' : 'ASC')
  }

  const table = useTable({
    features: productTableFeatures,
    data: products,
    columns,
    state: { sorting },
    onSortingChange: handleSortingChange,
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: false,
    sortDescFirst: false,
    getRowId: (row) => String(row.id),
  })

  return (
    <div className={cn('rounded-lg border', stale && 'opacity-60')}>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                return (
                  <TableHead
                    key={header.id}
                    aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <TableRow key={i}>
                  {columns.map((column, j) => (
                    <TableCell key={column.id ?? j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => void navigate(`/products/${row.original.id}/edit`)}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  )
}
