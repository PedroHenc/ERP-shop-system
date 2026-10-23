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
import { Link, useNavigate } from 'react-router'
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
import type { Supplier, SupplierSortField } from '@/features/suppliers/types'
import { cn } from '@/lib/utils'
import { SortableHeader, listTableFeatures, type ListTableFeatures } from '@/shared/components/SortableHeader'
import { StatusBadge } from '@/shared/components/StatusBadge'

type Features = ListTableFeatures

const EMPTY = '—'

interface SupplierActions {
  onDeactivate: (supplier: Supplier) => void
  onActivate: (supplier: Supplier) => void
}

function useSupplierColumns(
  { onDeactivate, onActivate }: SupplierActions,
  canWrite: boolean,
): ColumnDef<Features, Supplier>[] {
  const { t } = useTranslation('suppliers')
  const { t: tc } = useTranslation()

  return useMemo(() => {
    const header = (key: 'legalName' | 'status') =>
      function Header(context: HeaderContext<Features, Supplier, unknown>) {
        return <SortableHeader context={context} label={t(`columns.${key}`)} />
      }

    const columns: ColumnDef<Features, Supplier>[] = [
      {
        id: 'legalName',
        accessorKey: 'legalName',
        header: header('legalName'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.legalName}</span>
            {row.original.tradeName ? (
              <span className="text-muted-foreground text-sm">{row.original.tradeName}</span>
            ) : null}
          </div>
        ),
      },
      {
        id: 'taxId',
        header: () => t('columns.taxId'),
        enableSorting: false,
        cell: ({ row }) => row.original.taxId ?? EMPTY,
      },
      {
        id: 'email',
        header: () => t('columns.email'),
        enableSorting: false,
        cell: ({ row }) => row.original.email ?? EMPTY,
      },
      {
        id: 'phone',
        header: () => t('columns.phone'),
        enableSorting: false,
        cell: ({ row }) => row.original.phone ?? EMPTY,
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
                  <Link to={`/suppliers/${row.original.id}/edit`}>{tc('actions.edit')}</Link>
                </DropdownMenuItem>
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
  }, [t, tc, onDeactivate, onActivate, canWrite])
}

interface SupplierTableProps extends SupplierActions {
  suppliers: Supplier[]
  /** True on the first load, before any data exists. */
  loading: boolean
  /** True while refetching with the previous page still shown. */
  stale: boolean
  sortBy: SupplierSortField
  direction: 'ASC' | 'DESC'
  onSortChange: (sortBy: SupplierSortField, direction: 'ASC' | 'DESC') => void
}

const SKELETON_ROWS = 8

export function SupplierTable({
  suppliers,
  loading,
  stale,
  sortBy,
  direction,
  onSortChange,
  onDeactivate,
  onActivate,
}: SupplierTableProps) {
  const navigate = useNavigate()
  const canWrite = useCan('suppliers.write')
  const columns = useSupplierColumns({ onDeactivate, onActivate }, canWrite)
  const sorting: SortingState = [{ id: sortBy === 'active' ? 'status' : sortBy, desc: direction === 'DESC' }]

  function handleSortingChange(updater: Updater<SortingState>) {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    const first = next[0]
    if (!first) return
    onSortChange(first.id === 'status' ? 'active' : 'legalName', first.desc ? 'DESC' : 'ASC')
  }

  const table = useTable({
    features: listTableFeatures,
    data: suppliers,
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
                  onClick={canWrite ? () => void navigate(`/suppliers/${row.original.id}/edit`) : undefined}
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
