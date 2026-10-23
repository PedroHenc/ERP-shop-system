import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { UserFilters } from '@/features/users/components/UserFilters'
import { UserTable } from '@/features/users/components/UserTable'
import { PAGE_SIZES, userListParams } from '@/features/users/list-params'
import { userKeys, useSetUserStatus, useUsersPage } from '@/features/users/queries'
import type { User } from '@/features/users/types'
import { isApiError } from '@/shared/api/http'
import { DataTablePagination } from '@/shared/components/DataTablePagination'
import { PageHeader } from '@/shared/components/PageHeader'
import { SetStatusDialog } from '@/shared/components/SetStatusDialog'
import { useListSearchParams } from '@/shared/list/useListSearchParams'

export function UserListPage() {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const queryClient = useQueryClient()
  const { params, update, updateFilters, updateTextFilter, clearFilters } = useListSearchParams(userListParams)
  const [toDeactivate, setToDeactivate] = useState<User | null>(null)
  const { data, isPending, isError, isPlaceholderData, refetch } = useUsersPage(params)
  const { mutateAsync: setStatus } = useSetUserStatus()

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

  let body
  if (isError) {
    body = (
      <Alert variant="destructive">
        <AlertTitle>{t('list.error')}</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            {tc('actions.tryAgain')}
          </Button>
        </AlertDescription>
      </Alert>
    )
  } else if (data && data.content.length === 0) {
    body = (
      <div className="text-muted-foreground flex flex-col items-center gap-3 rounded-lg border py-12 text-sm">
        <p>{t('list.empty')}</p>
        {userListParams.hasActiveFilters(params) ? (
          <Button variant="link" onClick={clearFilters}>
            {tc('actions.clearFilters')}
          </Button>
        ) : null}
      </div>
    )
  } else {
    body = (
      <>
        <UserTable
          users={data?.content ?? []}
          loading={isPending}
          stale={isPlaceholderData}
          sortBy={params.sortBy}
          direction={params.direction}
          onSortChange={(sortBy, direction) => update({ sortBy, direction, page: 0 })}
          onDeactivate={setToDeactivate}
          onActivate={(user) => void changeStatus(user, true)}
        />
        {data ? (
          <DataTablePagination
            page={params.page}
            size={params.size}
            sizes={PAGE_SIZES}
            totalElements={data.totalElements}
            totalPages={data.totalPages}
            onPageChange={(page) => update({ page })}
            onSizeChange={(size) => update({ size, page: 0 })}
          />
        ) : null}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <Button asChild>
            <Link to="/users/new">{t('list.newUser')}</Link>
          </Button>
        }
      />
      <UserFilters params={params} onChange={updateFilters} onTextChange={updateTextFilter} onClear={clearFilters} />
      {body}
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
