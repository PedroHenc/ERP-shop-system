import { zodResolver } from '@hookform/resolvers/zod'
import { RiLoader4Line } from '@remixicon/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router'
import { useAuth } from '@/app/auth/AuthProvider'
import { AuthLoading } from '@/app/auth/RequireAuth'
import { safeRedirect } from '@/app/auth/redirect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { isApiError } from '@/shared/api/http'
import { HeaderControls } from '@/shared/layout/HeaderControls'
import { loginFormDefaults, loginFormSchema, type LoginFormValues } from '../schema'

const VALIDATION_PREFIX = 'auth:validation.'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const { status, login } = useAuth()
  const [params] = useSearchParams()
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema), defaultValues: loginFormDefaults })
  const { errors, isSubmitting } = form.formState

  if (status === 'loading') return <AuthLoading />
  // Signing in flips the status, which sends the user to the redirect target.
  if (status === 'authenticated') return <Navigate to={safeRedirect(params.get('redirect'))} replace />

  // Client-side messages are i18n keys (see schema.ts).
  function errorText(message: string | undefined): string | undefined {
    if (message === undefined) return undefined
    if (message === `${VALIDATION_PREFIX}required`) return t('validation.required')
    if (message === `${VALIDATION_PREFIX}invalidEmail`) return t('validation.invalidEmail')
    return message
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await login(values.email, values.password)
    } catch (error) {
      setFailure(isApiError(error) && error.status === 401 ? t('login.invalidCredentials') : tc('errors.unexpected'))
    }
  })

  return (
    <div className="relative flex min-h-svh items-center justify-center p-4">
      <div className="absolute top-3 right-4">
        <HeaderControls />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
            {failure ? (
              <Alert variant="destructive">
                <AlertDescription>{failure}</AlertDescription>
              </Alert>
            ) : null}
            <Field data-invalid={errors.email ? true : undefined}>
              <FieldLabel htmlFor="login-email">{t('login.email')}</FieldLabel>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                aria-invalid={errors.email ? true : undefined}
                {...form.register('email')}
              />
              {errors.email ? <FieldError>{errorText(errors.email.message)}</FieldError> : null}
            </Field>
            <Field data-invalid={errors.password ? true : undefined}>
              <FieldLabel htmlFor="login-password">{t('login.password')}</FieldLabel>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                {...form.register('password')}
              />
              {errors.password ? <FieldError>{errorText(errors.password.message)}</FieldError> : null}
            </Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <RiLoader4Line className="animate-spin" aria-hidden="true" />
                  {t('login.submitting')}
                </>
              ) : (
                t('login.submit')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
