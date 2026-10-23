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
import { useAuth } from '@/app/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { USER_SORT_FIELDS } from '@/features/users/list-params'
import type { User, UserSortField } from '@/features/users/types'
import { cn } from '@/lib/utils'
import { SortableHeader, listTableFeatures, type ListTableFeatures } from '@/shared/components/SortableHeader'
import { StatusBadge } from '@/shared/components/StatusBadge'

type Features = ListTableFeatures

interface UserActions {
  onDeactivate: (user: User) => void
  onActivate: (user: User) => void
}

// Table column id for the `active` sort field.
const STATUS = 'status'

function useLastLogin() {
  const { i18n, t } = useTranslation('users')
  const language = i18n.language
  return useMemo(() => {
    const formatter = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' })
    return (value: string | null) => (value === null ? t('never') : formatter.format(new Date(value)))
  }, [language, t])
}

function useUserColumns(
  { onDeactivate, onActivate }: UserActions,
  selfId: number | undefined,
): ColumnDef<Features, User>[] {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const formatLastLogin = useLastLogin()

  return useMemo(() => {
    const header = (key: 'name' | 'email' | 'role' | 'status' | 'lastLogin') =>
      function Header(context: HeaderContext<Features, User, unknown>) {
        return <SortableHeader context={context} label={t(`columns.${key}`)} />
      }

    return [
      {
        id: 'name',
        accessorKey: 'name',
        header: header('name'),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      { id: 'email', accessorKey: 'email', header: header('email') },
      { id: 'role', accessorKey: 'role', header: header('role'), cell: ({ row }) => tc(`roles.${row.original.role}`) },
      {
        id: STATUS,
        accessorKey: 'active',
        header: header('status'),
        cell: ({ row }) => <StatusBadge active={row.original.active} />,
      },
      {
        id: 'lastLoginAt',
        accessorKey: 'lastLoginAt',
        header: header('lastLogin'),
        cell: ({ row }) => formatLastLogin(row.original.lastLoginAt),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('columns.actions')}</span>,
        enableSorting: false,
        cell: ({ row }) => {
          // You can't deactivate your own account (the API refuses it).
          const isSelf = row.original.id === selfId
          return (
            <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={t('list.rowActions')}>
                    <RiMore2Line />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/users/${row.original.id}/edit`}>{tc('actions.edit')}</Link>
                  </DropdownMenuItem>
                  {isSelf ? null : row.original.active ? (
                    <DropdownMenuItem variant="destructive" onSelect={() => onDeactivate(row.original)}>
                      {t('actions.deactivate')}
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => onActivate(row.original)}>
                      {t('actions.activate')}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ]
  }, [t, tc, formatLastLogin, onDeactivate, onActivate, selfId])
}

interface UserTableProps extends UserActions {
  users: User[]
  /** True on the first load, before any data exists. */
  loading: boolean
  /** True while refetching with the previous page still shown. */
  stale: boolean
  sortBy: UserSortField
  direction: 'ASC' | 'DESC'
  onSortChange: (sortBy: UserSortField, direction: 'ASC' | 'DESC') => void
}

const SKELETON_ROWS = 8

export function UserTable({
  users,
  loading,
  stale,
  sortBy,
  direction,
  onSortChange,
  onDeactivate,
  onActivate,
}: UserTableProps) {
  const navigate = useNavigate()
  const { user: signedIn } = useAuth()
  const columns = useUserColumns({ onDeactivate, onActivate }, signedIn?.id)
  const sorting: SortingState = [{ id: sortBy === 'active' ? STATUS : sortBy, desc: direction === 'DESC' }]

  function handleSortingChange(updater: Updater<SortingState>) {
    const next = typeof updater === 'function' ? updater(sorting) : updater
    const first = next[0]
    if (!first) return
    const field = first.id === STATUS ? 'active' : USER_SORT_FIELDS.find((f) => f === first.id)
    if (field) onSortChange(field, first.desc ? 'DESC' : 'ASC')
  }

  const table = useTable({
    features: listTableFeatures,
    data: users,
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
                  onClick={() => void navigate(`/users/${row.original.id}/edit`)}
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
