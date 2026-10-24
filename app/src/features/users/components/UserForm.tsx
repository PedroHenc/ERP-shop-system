import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useBlocker, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { createUserSchema, editUserSchema, userFormDefaults } from '@/features/users/schema'
import type { UserFormValues } from '@/features/users/schema'
import { isApiError } from '@/shared/api/http'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import { FormActionBar } from '@/shared/forms/FormActionBar'
import { FormLayout } from '@/shared/forms/FormLayout'
import type { FormFailure } from '@/shared/forms/applyServerErrors'
import { AccessSection, AccountSection, UserSummary } from './UserFormFields'

export interface UserFormProps {
  /** `create` also asks for the initial password. */
  mode: 'create' | 'edit'
  defaultValues: UserFormValues
  /** Persists the values. Reject with an ApiError to show it in the form. */
  onSubmit: (values: UserFormValues) => Promise<void>
  submitting: boolean
  /** Editing the signed-in user's own account: role and status are locked. */
  selfLocked?: boolean
  /** Called after a successful submit (the unsaved-changes guard is already released). */
  onSaved?: () => void
  /** Called when the user asks to reload after an edit conflict (409). */
  onReload?: () => void
  /** ISO dates shown in the summary (edit only). */
  createdDate?: string
  lastModifiedDate?: string
  /** Shows the Set password button in the summary (other users' accounts only). */
  onSetPassword?: () => void
}

function isFormField(name: string): name is keyof UserFormValues {
  return Object.hasOwn(userFormDefaults, name)
}

export function UserForm({
  mode,
  defaultValues,
  onSubmit,
  submitting,
  selfLocked = false,
  onSaved,
  onReload,
  createdDate,
  lastModifiedDate,
  onSetPassword,
}: UserFormProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const [failure, setFailure] = useState<FormFailure | null>(null)
  const saved = useRef(false)
  const form = useForm<UserFormValues>({
    resolver: zodResolver(mode === 'create' ? createUserSchema : editUserSchema),
    defaultValues,
  })
  const { isDirty } = form.formState

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  )

  function handleError(error: unknown) {
    const result = applyServerErrors(error, isFormField, (name, message) => {
      if (isFormField(name)) form.setError(name, { type: 'server', message })
    })
    if (result.type === 'unexpected') {
      // A 403 already got the global permission toast.
      if (!(isApiError(error) && error.status === 403)) toast.error(tc('errors.unexpected'))
    } else if (result.failure) setFailure(result.failure)
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await onSubmit(values)
    } catch (error) {
      handleError(error)
      return
    }
    saved.current = true
    onSaved?.()
  })

  const busy = submitting || form.formState.isSubmitting

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
      {failure?.kind === 'message' ? (
        <Alert variant="destructive">
          <AlertTitle>{t('form.saveError')}</AlertTitle>
          <AlertDescription>{failure.text}</AlertDescription>
        </Alert>
      ) : null}
      {failure?.kind === 'conflict' ? (
        <Alert variant="destructive">
          <AlertTitle>{t('form.conflictTitle')}</AlertTitle>
          <AlertDescription>
            <p>{t('form.conflictDescription')}</p>
            {onReload ? (
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onReload}>
                {t('form.reload')}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <FormLayout
        asideLabel={tc('form.summary')}
        main={
          <>
            <AccountSection form={form} withPassword={mode === 'create'} />
            <AccessSection form={form} locked={selfLocked} />
          </>
        }
        aside={
          <UserSummary
            form={form}
            selfLocked={selfLocked}
            createdDate={createdDate}
            lastModifiedDate={lastModifiedDate}
            onSetPassword={onSetPassword}
          />
        }
      />
      <FormActionBar dirty={isDirty} submitting={busy} onCancel={() => void navigate('/users')} />
      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onStay={() => {
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onLeave={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </form>
  )
}
