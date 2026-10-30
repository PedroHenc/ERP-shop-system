import { motion } from 'motion/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { RiEyeLine, RiEyeOffLine, RiStore2Line } from '@remixicon/react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useSearchParams } from 'react-router'
import { useAuth } from '@/app/auth/AuthProvider'
import { AuthLoading } from '@/app/auth/RequireAuth'
import { safeRedirect } from '@/app/auth/redirect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { isApiError } from '@/shared/api/http'
import { PreferencesMenu } from '@/shared/layout/PreferencesMenu'
import { loginFormDefaults, loginFormSchema, type LoginFormValues } from '../schema'

const VALIDATION_PREFIX = 'auth:validation.'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const { status, login } = useAuth()
  const [params] = useSearchParams()
  const [failure, setFailure] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
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

  function loginFailureText(error: unknown): string {
    if (isApiError(error) && error.status === 401) return t('login.invalidCredentials')
    if (isApiError(error) && error.status === 403) return t('login.storeSuspended')
    return tc('errors.unexpected')
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await login(values.email, values.password)
    } catch (error) {
      setFailure(loginFailureText(error))
    }
  })

  return (
    <div className="relative grid min-h-svh md:grid-cols-2">
      <div className="absolute top-3 right-4 z-10">
        <PreferencesMenu />
      </div>
      <aside className="bg-primary text-primary-foreground relative hidden flex-col justify-between overflow-hidden p-10 md:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(currentColor 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <span className="bg-primary-foreground/15 flex size-9 items-center justify-center rounded-lg">
            <RiStore2Line className="size-5" aria-hidden="true" />
          </span>
          {tc('appName')}
        </div>
        <motion.p
          className="relative max-w-sm text-3xl leading-tight font-semibold tracking-tight"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
        >
          {t('login.tagline')}
        </motion.p>
      </aside>
      <main className="flex flex-col items-center justify-center gap-8 p-6">
        <div className="flex items-center gap-2 text-lg font-semibold md:hidden">
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <RiStore2Line className="size-5" aria-hidden="true" />
          </span>
          {tc('appName')}
        </div>
        <motion.div
          className="flex w-full max-w-[380px] flex-col gap-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}
        >
          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">{t('login.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('login.description')}</p>
          </div>
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
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-10"
                  aria-invalid={errors.password ? true : undefined}
                  {...form.register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <RiEyeOffLine aria-hidden="true" /> : <RiEyeLine aria-hidden="true" />}
                </Button>
              </div>
              {errors.password ? <FieldError>{errorText(errors.password.message)}</FieldError> : null}
            </Field>
            <Button type="submit" size="lg" loading={isSubmitting}>
              {isSubmitting ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
