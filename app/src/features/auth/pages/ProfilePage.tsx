import { zodResolver } from '@hookform/resolvers/zod'
import { RiLoader4Line } from '@remixicon/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useAuth } from '@/app/auth/AuthProvider'
import { changePassword } from '@/app/auth/api'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/shared/components/PageHeader'
import { isApiError } from '@/shared/api/http'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import { changePasswordDefaults, changePasswordSchema, type ChangePasswordValues } from '../schema'

const VALIDATION_PREFIX = 'auth:validation.'

function isFormField(name: string): name is keyof ChangePasswordValues {
  return Object.hasOwn(changePasswordDefaults, name)
}

export function ProfilePage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const { user } = useAuth()
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: changePasswordDefaults,
  })
  const { errors, isSubmitting } = form.formState

  // Client-side messages are i18n keys (see schema.ts); server messages are shown as they are.
  function errorText(message: string | undefined): string | undefined {
    if (message === `${VALIDATION_PREFIX}required`) return t('validation.required')
    if (message === `${VALIDATION_PREFIX}passwordMin`) return t('validation.passwordMin')
    if (message === `${VALIDATION_PREFIX}passwordMax`) return t('validation.passwordMax')
    if (message === `${VALIDATION_PREFIX}passwordMismatch`) return t('validation.passwordMismatch')
    return message
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await changePassword(values.currentPassword, values.newPassword)
    } catch (error) {
      const result = applyServerErrors(error, isFormField, (name, message) => {
        if (isFormField(name)) form.setError(name, { type: 'server', message })
      })
      if (result.type === 'unexpected') {
        if (!(isApiError(error) && error.status === 403)) toast.error(tc('errors.unexpected'))
      } else if (result.failure?.kind === 'message') setFailure(result.failure.text)
      return
    }
    toast.success(t('profile.passwordChanged'))
    form.reset(changePasswordDefaults)
  })

  return (
    <div>
      <PageHeader title={t('profile.title')} />
      <div className="flex max-w-xl flex-col gap-6">
        {user ? (
          <Card>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                <dt className="text-muted-foreground">{t('profile.name')}</dt>
                <dd>{user.name}</dd>
                <dt className="text-muted-foreground">{t('profile.email')}</dt>
                <dd>{user.email}</dd>
                <dt className="text-muted-foreground">{t('profile.role')}</dt>
                <dd>{tc(`roles.${user.role}`)}</dd>
              </dl>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.changePassword')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
              {failure ? (
                <Alert variant="destructive">
                  <AlertDescription>{failure}</AlertDescription>
                </Alert>
              ) : null}
              <Field data-invalid={errors.currentPassword ? true : undefined}>
                <FieldLabel htmlFor="profile-current-password">{t('profile.currentPassword')}</FieldLabel>
                <Input
                  id="profile-current-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={errors.currentPassword ? true : undefined}
                  {...form.register('currentPassword')}
                />
                {errors.currentPassword ? <FieldError>{errorText(errors.currentPassword.message)}</FieldError> : null}
              </Field>
              <Field data-invalid={errors.newPassword ? true : undefined}>
                <FieldLabel htmlFor="profile-new-password">{t('profile.newPassword')}</FieldLabel>
                <Input
                  id="profile-new-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.newPassword ? true : undefined}
                  {...form.register('newPassword')}
                />
                {errors.newPassword ? <FieldError>{errorText(errors.newPassword.message)}</FieldError> : null}
              </Field>
              <Field data-invalid={errors.confirmPassword ? true : undefined}>
                <FieldLabel htmlFor="profile-confirm-password">{t('profile.confirmPassword')}</FieldLabel>
                <Input
                  id="profile-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.confirmPassword ? true : undefined}
                  {...form.register('confirmPassword')}
                />
                {errors.confirmPassword ? <FieldError>{errorText(errors.confirmPassword.message)}</FieldError> : null}
              </Field>
              <div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <RiLoader4Line className="animate-spin" aria-hidden="true" />
                      {tc('actions.saving')}
                    </>
                  ) : (
                    t('profile.changePassword')
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
