import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth/AuthProvider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SetPasswordDialog } from '@/features/users/components/SetPasswordDialog'
import { UserForm } from '@/features/users/components/UserForm'
import { useCreateUser, useUpdateUser, useUser } from '@/features/users/queries'
import { toUserFormValues, toUserRequest, userFormDefaults } from '@/features/users/schema'
import type { UserFormValues } from '@/features/users/schema'
import type { User } from '@/features/users/types'
import { isApiError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'
import { FormSkeleton } from '@/shared/forms/FormSkeleton'

function useSaved() {
  const { t } = useTranslation('users')
  const navigate = useNavigate()
  return () => {
    toast.success(t('form.saved'))
    void navigate('/users')
  }
}

function CreateUser() {
  const { t } = useTranslation('users')
  const create = useCreateUser()
  const onSaved = useSaved()
  return (
    <>
      <PageHeader title={t('form.newTitle')} />
      <UserForm
        mode="create"
        defaultValues={userFormDefaults}
        submitting={create.isPending}
        onSubmit={async (values: UserFormValues) => {
          await create.mutateAsync(toUserRequest(values, null))
        }}
        onSaved={onSaved}
      />
    </>
  )
}

function EditUser({ id }: { id: number }) {
  const { t } = useTranslation('users')
  const { data: user, isPending, isFetching, error, refetch } = useUser(id)
  // Bumped after a manual reload so the form remounts with the server data.
  const [reloads, setReloads] = useState(0)

  // Until this mount's first fetch completes, cached data may be stale; the form snapshots whatever it first sees.
  const [ready, setReady] = useState(false)
  if (!ready && user && !isFetching) setReady(true)

  if (isPending || (!ready && isFetching && !error)) {
    return (
      <>
        <PageHeader title={t('form.editTitle')} />
        <FormSkeleton sections={2} />
      </>
    )
  }

  if (error || !user) {
    const notFound = isApiError(error) && error.status === 404
    return (
      <>
        <PageHeader title={t('form.editTitle')} />
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>{notFound ? t('form.notFound') : t('list.error')}</AlertTitle>
          <AlertDescription>
            <Link to="/users" className="underline">
              {t('form.backToUsers')}
            </Link>
          </AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <EditForm
      key={reloads}
      user={user}
      id={id}
      onReload={() => void refetch().then(() => setReloads((count) => count + 1))}
    />
  )
}

/** Freezes the field values and their version together at mount, so a background refetch can't pair old values with a newer version. */
function EditForm({ user, id, onReload }: { user: User; id: number; onReload: () => void }) {
  const { t } = useTranslation('users')
  const { user: signedIn } = useAuth()
  const update = useUpdateUser(id)
  const onSaved = useSaved()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [snapshot] = useState(() => ({ values: toUserFormValues(user), version: user.version }))
  // Setting a password revokes every session of the user, which would sign the admin out:
  // their own password is changed from My profile instead.
  const isSelf = signedIn?.id === id
  return (
    <>
      <PageHeader title={t('form.editTitle')} />
      {isSelf ? (
        <p className="text-muted-foreground mb-4 text-sm">
          {t('password.selfHint')}{' '}
          <Link to="/profile" className="text-foreground underline underline-offset-4">
            {t('password.selfHintLink')}
          </Link>
          .
        </p>
      ) : null}
      <UserForm
        mode="edit"
        defaultValues={snapshot.values}
        submitting={update.isPending}
        selfLocked={isSelf}
        onSubmit={async (values: UserFormValues) => {
          await update.mutateAsync(toUserRequest(values, snapshot.version))
        }}
        onSaved={onSaved}
        onReload={onReload}
        createdDate={user.createdDate}
        lastModifiedDate={user.lastModifiedDate}
        onSetPassword={isSelf ? undefined : () => setPasswordOpen(true)}
      />
      {isSelf ? null : (
        <SetPasswordDialog userId={id} userName={user.name} open={passwordOpen} onOpenChange={setPasswordOpen} />
      )}
    </>
  )
}

export function UserFormPage() {
  const { id } = useParams()
  if (id === undefined) return <CreateUser />
  const numericId = Number(id)
  // Non-numeric ids fall into the same "not found" state as a 404.
  return <EditUser id={Number.isInteger(numericId) ? numericId : -1} />
}
