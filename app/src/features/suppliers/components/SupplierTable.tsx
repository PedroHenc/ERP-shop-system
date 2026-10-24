import { RiMore2Line } from '@remixicon/react'
import {
  type ColumnDef,
  type HeaderContext,
  type SortingState,
  type Updater,
  flexRender,
  useTable,
} from '@tanstack/react-table'
import { motion } from 'motion/react'
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
import { HOVER_REVEAL_ACTIONS } from '@/shared/list/row-actions'
import { useFirstLoadAnimation } from '@/shared/list/useFirstLoadAnimation'

type Features = ListTableFeatures

const EMPTY = '—'

export interface SupplierActions {
  onDeactivate: (supplier: Supplier) => void
  onActivate: (supplier: Supplier) => void
}

interface SupplierRowActionsProps extends SupplierActions {
  supplier: Supplier
  className?: string
}

/** The Edit / Deactivate / Activate menu; renders nothing without write access. */
export function SupplierRowActions({ supplier, onDeactivate, onActivate, className }: SupplierRowActionsProps) {
  const { t } = useTranslation('suppliers')
  const { t: tc } = useTranslation()
  const canWrite = useCan('suppliers.write')
  if (!canWrite) return null
  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('list.rowActions')}
            className={cn('data-[state=open]:opacity-100', className)}
          >
            <RiMore2Line />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/suppliers/${supplier.id}/edit`}>{tc('actions.edit')}</Link>
          </DropdownMenuItem>
          {supplier.active ? (
            <DropdownMenuItem variant="destructive" onSelect={() => onDeactivate(supplier)}>
              {t('actions.deactivate')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => onActivate(supplier)}>{t('actions.activate')}</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function useSupplierColumns(
  { onDeactivate, onActivate }: SupplierActions,
  canWrite: boolean,
): ColumnDef<Features, Supplier>[] {
  const { t } = useTranslation('suppliers')

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
          <div className="flex min-w-0 flex-col">
            {canWrite ? (
              <Link
                to={`/suppliers/${row.original.id}/edit`}
                className="truncate font-medium hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {row.original.legalName}
              </Link>
            ) : (
              <span className="truncate font-medium">{row.original.legalName}</span>
            )}
            {row.original.tradeName ? (
              <span className="text-xs text-muted-foreground">{row.original.tradeName}</span>
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
          <SupplierRowActions
            supplier={row.original}
            onDeactivate={onDeactivate}
            onActivate={onActivate}
            className={HOVER_REVEAL_ACTIONS}
          />
        ),
      },
    ]
    // Without write access the rows are read-only: no actions menu and no click to edit.
    return canWrite ? columns : columns.filter((column) => column.id !== 'actions')
  }, [t, onDeactivate, onActivate, canWrite])
}

interface SupplierTableProps extends SupplierActions {
  suppliers: Supplier[]
  /** True on the first load, before any data exists. */
  loading: boolean
  sortBy: SupplierSortField
  direction: 'ASC' | 'DESC'
  onSortChange: (sortBy: SupplierSortField, direction: 'ASC' | 'DESC') => void
}

const SKELETON_ROWS = 8
const MotionRow = motion.create(TableRow)

export function SupplierTable({
  suppliers,
  loading,
  sortBy,
  direction,
  onSortChange,
  onDeactivate,
  onActivate,
}: SupplierTableProps) {
  const navigate = useNavigate()
  const canWrite = useCan('suppliers.write')
  const columns = useSupplierColumns({ onDeactivate, onActivate }, canWrite)
  const rowMotion = useFirstLoadAnimation(!loading && suppliers.length > 0)
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
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id} className="hover:bg-transparent">
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
          : table.getRowModel().rows.map((row, index) => (
              <MotionRow
                key={row.id}
                className={cn('group/row', canWrite && 'cursor-pointer')}
                {...rowMotion(index)}
                onClick={canWrite ? () => void navigate(`/suppliers/${row.original.id}/edit`) : undefined}
              >
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </MotionRow>
            ))}
      </TableBody>
    </Table>
  )
}
