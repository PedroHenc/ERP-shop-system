import { RiMore2Line } from '@remixicon/react'
import {
  type ColumnDef,
  type HeaderContext,
  type SortingState,
  type Updater,
  flexRender,
  useTable,
} from '@tanstack/react-table'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useCan } from '@/app/auth/permissions'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { BrandDetail, BrandSortField } from '@/features/brands/types'
import { cn } from '@/lib/utils'
import { SortableHeader, listTableFeatures, type ListTableFeatures } from '@/shared/components/SortableHeader'
import { StatusBadge } from '@/shared/components/StatusBadge'

type Features = ListTableFeatures

interface BrandActions {
  onEdit: (brand: BrandDetail) => void
  onDeactivate: (brand: BrandDetail) => void
  onActivate: (brand: BrandDetail) => void
}

function useBrandColumns(
  { onEdit, onDeactivate, onActivate }: BrandActions,
  canWrite: boolean,
): ColumnDef<Features, BrandDetail>[] {
  const { t } = useTranslation('brands')
  const { t: tc } = useTranslation()

  return useMemo(() => {
    const header = (key: 'name' | 'status') =>
      function Header(context: HeaderContext<Features, BrandDetail, unknown>) {
        return <SortableHeader context={context} label={t(`columns.${key}`)} />
      }

    const columns: ColumnDef<Features, BrandDetail>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: header('name'),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
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
                <DropdownMenuItem onSelect={() => onEdit(row.original)}>{tc('actions.edit')}</DropdownMenuItem>
                {row.original.active ? (
                  <DropdownMenuItem variant="destructive" onSelect={() => onDeactivate(row.original)}>
                    {t('actions.deactivate')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onSelect={() => onActivate(row.original)}>{t('actions.activate')}</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ]
    // Without write access the rows are read-only: no actions menu and no click to edit.
    return canWrite ? columns : columns.filter((column) => column.id !== 'actions')
  }, [t, tc, onEdit, onDeactivate, onActivate, canWrite])
}

interface BrandTableProps extends BrandActions {
  brands: BrandDetail[]
  /** True on the first load, before any data exists. */
  loading: boolean
  /** True while refetching with the previous page still shown. */
  stale: boolean
  sortBy: BrandSortField
  direction: 'ASC' | 'DESC'
  onSortChange: (sortBy: BrandSortField, direction: 'ASC' | 'DESC') => void
}

const SKELETON_ROWS = 8

export function BrandTable({
  brands,
  loading,
  stale,
  sortBy,
  direction,
  onSortChange,
  onEdit,
  onDeactivate,
  onActivate,
}: BrandTableProps) {
  const canWrite = useCan('brands.write')
  const columns = useBrandColumns({ onEdit, onDeactivate, onActivate }, canWrite)
  const sorting: SortingState = [{ id: sortBy === 'active' ? 'status' : sortBy, desc: direction === 'DESC' }]

  function handleSortingChange(updater: Updater<SortingState>) {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    const first = next[0]
    if (!first) return
    onSortChange(first.id === 'status' ? 'active' : 'name', first.desc ? 'DESC' : 'ASC')
  }

  const table = useTable({
    features: listTableFeatures,
    data: brands,
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
                  className={canWrite ? 'cursor-pointer' : undefined}
                  onClick={canWrite ? () => onEdit(row.original) : undefined}
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
