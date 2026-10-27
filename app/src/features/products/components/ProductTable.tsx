import {
  type SortingState,
  type Updater,
  flexRender,
  useTable,
} from '@tanstack/react-table'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Product, ProductSortField } from '@/features/products/types'
import { ROW_MOTION_CLASSES, useRowMotion } from '@/shared/list/useRowMotion'
import { RIGHT_ALIGNED_COLUMNS, productTableFeatures, useProductColumns } from './ProductColumns'
import { placeholderKeys } from '@/shared/list/placeholder-keys'

interface ProductTableProps {
  products: Product[]
  /** True on the first load, before any data exists. */
  loading: boolean
  sortBy: ProductSortField
  direction: 'ASC' | 'DESC'
  onSortChange: (sortBy: ProductSortField, direction: 'ASC' | 'DESC') => void
  onDelete: (product: Product) => void
}

const SKELETON_ROWS = 8
const MotionRow = motion.create(TableRow)

export function ProductTable({ products, loading, sortBy, direction, onSortChange, onDelete }: ProductTableProps) {
  const navigate = useNavigate()
  const columns = useProductColumns(onDelete)
  const rows = useRowMotion('products', !loading && products.length > 0, products.length)
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

  const alignment = (columnId: string) => (RIGHT_ALIGNED_COLUMNS.has(columnId) ? 'text-right' : undefined)

  return (
    <Table className="isolate">
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="hover:bg-transparent">
            {group.headers.map((header) => {
              const sorted = header.column.getIsSorted()
              return (
                <TableHead
                  key={header.id}
                  className={alignment(header.column.id)}
                  aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              )
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody {...rows.bodyProps}>
        {loading
          ? placeholderKeys(SKELETON_ROWS).map((key) => (
              <TableRow key={key}>
                {columns.map((column, j) => (
                  <TableCell key={column.id ?? j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          : table.getRowModel().rows.map((row, index) => (
              <MotionRow
                key={row.id}
                className={`group/row cursor-pointer ${ROW_MOTION_CLASSES}`}
                {...rows.rowProps(index, row.id)}
                onClick={() => void navigate(`/products/${row.original.id}/edit`)}
              >
                {row.getAllCells().map((cell, cellIndex) => (
                  <TableCell key={cell.id} className={alignment(cell.column.id)}>
                    {cellIndex === 0 ? rows.highlight(row.id) : null}
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </MotionRow>
            ))}
      </TableBody>
    </Table>
  )
}
