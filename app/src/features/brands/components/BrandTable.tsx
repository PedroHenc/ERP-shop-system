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
import { HOVER_REVEAL_ACTIONS } from '@/shared/list/row-actions'
import { ROW_MOTION_CLASSES, useRowMotion } from '@/shared/list/useRowMotion'

type Features = ListTableFeatures

export interface BrandActions {
  onEdit: (brand: BrandDetail) => void
  onDeactivate: (brand: BrandDetail) => void
  onActivate: (brand: BrandDetail) => void
}

interface BrandRowActionsProps extends BrandActions {
  brand: BrandDetail
  className?: string
}

/** The Edit / Deactivate / Activate menu; renders nothing without write access. */
export function BrandRowActions({ brand, onEdit, onDeactivate, onActivate, className }: BrandRowActionsProps) {
  const { t } = useTranslation('brands')
  const { t: tc } = useTranslation()
  const canWrite = useCan('brands.write')
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
          <DropdownMenuItem onSelect={() => onEdit(brand)}>{tc('actions.edit')}</DropdownMenuItem>
          {brand.active ? (
            <DropdownMenuItem variant="destructive" onSelect={() => onDeactivate(brand)}>
              {t('actions.deactivate')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => onActivate(brand)}>{t('actions.activate')}</DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** The brand name: a button that opens the edit dialog (the keyboard route) with write access, plain text otherwise. */
export function BrandNameButton({ brand, onEdit }: { brand: BrandDetail; onEdit: (brand: BrandDetail) => void }) {
  const canWrite = useCan('brands.write')
  if (!canWrite) return <span className="truncate font-medium">{brand.name}</span>
  return (
    <button
      type="button"
      className="truncate text-left font-medium hover:underline focus-visible:underline focus-visible:outline-none"
      onClick={(event) => {
        event.stopPropagation()
        onEdit(brand)
      }}
    >
      {brand.name}
    </button>
  )
}

function useBrandColumns(
  { onEdit, onDeactivate, onActivate }: BrandActions,
  canWrite: boolean,
): ColumnDef<Features, BrandDetail>[] {
  const { t } = useTranslation('brands')

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
        cell: ({ row }) => <BrandNameButton brand={row.original} onEdit={onEdit} />,
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
          <BrandRowActions
            brand={row.original}
            onEdit={onEdit}
            onDeactivate={onDeactivate}
            onActivate={onActivate}
            className={HOVER_REVEAL_ACTIONS}
          />
        ),
      },
    ]
    // Without write access the rows are read-only: no actions menu and no click to edit.
    return canWrite ? columns : columns.filter((column) => column.id !== 'actions')
  }, [t, onEdit, onDeactivate, onActivate, canWrite])
}

interface BrandTableProps extends BrandActions {
  brands: BrandDetail[]
  /** True on the first load, before any data exists. */
  loading: boolean
  sortBy: BrandSortField
  direction: 'ASC' | 'DESC'
  onSortChange: (sortBy: BrandSortField, direction: 'ASC' | 'DESC') => void
}

const SKELETON_ROWS = 8
const MotionRow = motion.create(TableRow)

export function BrandTable({
  brands,
  loading,
  sortBy,
  direction,
  onSortChange,
  onEdit,
  onDeactivate,
  onActivate,
}: BrandTableProps) {
  const canWrite = useCan('brands.write')
  const columns = useBrandColumns({ onEdit, onDeactivate, onActivate }, canWrite)
  const rows = useRowMotion('brands', !loading && brands.length > 0, brands.length)
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
    <Table className="isolate">
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
      <TableBody {...rows.bodyProps}>
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
                className={cn('group/row', ROW_MOTION_CLASSES, canWrite && 'cursor-pointer')}
                {...rows.rowProps(index, row.id)}
                onClick={canWrite ? () => onEdit(row.original) : undefined}
              >
                {row.getAllCells().map((cell, cellIndex) => (
                  <TableCell key={cell.id}>
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
