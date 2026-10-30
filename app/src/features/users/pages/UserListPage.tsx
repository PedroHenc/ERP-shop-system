import { RiAddLine, RiGroupLine, RiUserAddLine } from '@remixicon/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { ADD_ICON_MOTION, Button } from '@/components/ui/button'
import { InviteDialog } from '@/features/users/components/InviteDialog'
import { UserCardList } from '@/features/users/components/UserCardList'
import { UserFilters } from '@/features/users/components/UserFilters'
import { UserTable } from '@/features/users/components/UserTable'
import { PAGE_SIZES, secondaryFilterCount, userListParams } from '@/features/users/list-params'
import { userKeys, useSetUserStatus, useUsersPage } from '@/features/users/queries'
import type { User } from '@/features/users/types'
import { useIsCompact } from '@/hooks/use-compact'
import { isApiError } from '@/shared/api/http'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { ExportUsersButton } from '@/features/users/export'
import { PageHeader } from '@/shared/components/PageHeader'
import { SetStatusDialog } from '@/shared/components/SetStatusDialog'
import { EmptyState } from '@/shared/list/EmptyState'
import { FiltersButton } from '@/shared/list/FiltersButton'
import { ListCard } from '@/shared/list/ListCard'
import { ListError } from '@/shared/list/ListError'
import { SearchInput } from '@/shared/list/SearchInput'
import { StatusTabs } from '@/shared/list/StatusTabs'
import { useDebouncedText } from '@/shared/list/useDebouncedText'
import { useListSearchParams } from '@/shared/list/useListSearchParams'

export function UserListPage() {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const queryClient = useQueryClient()
  const compact = useIsCompact()
  const { params, update, updateFilters, updateTextFilter, clearFilters } = useListSearchParams(userListParams)
  // The Filters popover clears only its own (secondary) filters: search and status tab stay.
  const clearSecondary = () => updateFilters({ role: undefined })
  const [toDeactivate, setToDeactivate] = useState<User | null>(null)
  const [inviting, setInviting] = useState(false)
  const { data, isPending, isError, isPlaceholderData, refetch } = useUsersPage(params)
  const { mutateAsync: setStatus } = useSetUserStatus()
  const [search, setSearch] = useDebouncedText(params.search, (next) => updateTextFilter({ search: next }))

  async function changeStatus(user: User, active: boolean) {
    try {
      await setStatus({ id: user.id, active })
      toast.success(active ? t('status.activated') : t('status.deactivated'))
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        toast.error(t('status.notFound'))
        await queryClient.invalidateQueries({ queryKey: userKeys.all })
      } else if (isApiError(error) && error.status === 400 && error.errors) {
        // e.g. "There must be at least one active admin".
        toast.error(Object.values(error.errors).join(' '))
      } else if (!(isApiError(error) && error.status === 403)) {
        // A 403 already got the global permission toast.
        toast.error(tc('errors.unexpected'))
      }
    }
  }

  const newUserButton = (
    <Button asChild>
      <Link to="/users/new">
        <RiAddLine data-icon="inline-start" className={ADD_ICON_MOTION} />
        {t('list.newUser')}
      </Link>
    </Button>
  )

  const actions = {
    onDeactivate: setToDeactivate,
    onActivate: (user: User) => void changeStatus(user, true),
  }

  let body: ReactNode
  if (isError) {
    body = <ListError message={t('list.error')} onRetry={() => void refetch()} />
  } else if (data && data.content.length === 0) {
    body = userListParams.hasActiveFilters(params) ? (
      <EmptyState
        icon={RiGroupLine}
        title={tc('empty.noResultsTitle')}
        description={tc('empty.noResultsDescription')}
        action={
          <Button variant="outline" onClick={clearFilters}>
            {tc('actions.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={RiGroupLine}
        title={t('list.emptyTitle')}
        description={t('list.emptyDescription')}
        action={newUserButton}
      />
    )
  } else if (compact) {
    body = <UserCardList users={data?.content ?? []} loading={isPending} {...actions} />
  } else {
    body = (
      <UserTable
        users={data?.content ?? []}
        loading={isPending}
        sortBy={params.sortBy}
        direction={params.direction}
        onSortChange={(sortBy, direction) => update({ sortBy, direction, page: 0 })}
        {...actions}
      />
    )
  }

  const toolbar = (
    <>
      <StatusTabs
        value={params.active}
        onChange={(active) => updateFilters({ active })}
        count={isPlaceholderData ? undefined : data?.totalElements}
      />
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <SearchInput value={search} onChange={setSearch} label={t('list.searchUsers')} />
        <FiltersButton activeCount={secondaryFilterCount(params)} onClear={clearSecondary}>
          <UserFilters params={params} onChange={updateFilters} />
        </FiltersButton>
      </div>
    </>
  )

  const showFooter = !isError && data !== undefined && data.content.length > 0

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <>
            <ExportUsersButton params={params} />
            <Button variant="outline" onClick={() => setInviting(true)}>
              <RiUserAddLine data-icon="inline-start" aria-hidden="true" />
              {t('list.invite')}
            </Button>
            {newUserButton}
          </>
        }
      />
      <ListCard
        toolbar={toolbar}
        refreshing={isPlaceholderData}
        footer={
          showFooter ? (
            <DataTablePagination
              page={params.page}
              size={params.size}
              sizes={PAGE_SIZES}
              totalElements={data.totalElements}
              totalPages={data.totalPages}
              onPageChange={(page) => update({ page })}
              onSizeChange={(size) => update({ size, page: 0 })}
            />
          ) : undefined
        }
      >
        {body}
      </ListCard>
      <InviteDialog open={inviting} onOpenChange={setInviting} />
      <SetStatusDialog
        name={toDeactivate?.name ?? null}
        onOpenChange={(open) => {
          if (!open) setToDeactivate(null)
        }}
        onConfirm={async () => {
          if (toDeactivate) await changeStatus(toDeactivate, false)
          setToDeactivate(null)
        }}
      />
    </>
  )
}
