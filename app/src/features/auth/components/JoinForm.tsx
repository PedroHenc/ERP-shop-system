import { zodResolver } from '@hookform/resolvers/zod'
import { RiErrorWarningLine, RiStore2Line } from '@remixicon/react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthProvider'
import { previewInvite } from '@/app/auth/api'
import type { InvitePreview } from '@/app/auth/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError } from '@/shared/api/http'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import { joinFormDefaults, joinFormSchema, type JoinFormValues } from '../schema'
import { AuthSubmitButton, PasswordInput, StrengthMeter, authInputClasses, useAuthErrorText } from './auth-fields'
import { EMAIL_TAKEN } from './SignupForm'

type PreviewState = { kind: 'loading' } | { kind: 'ready'; invite: InvitePreview } | { kind: 'invalid' } | { kind: 'error' }

const isInvalidInvite = (error: unknown) => isApiError(error) && error.status === 404

interface JoinFormProps {
  /** The invite code from the link, or null when the link has none. */
  token: string | null
  onPendingChange: (pending: boolean) => void
  onGoToLogin: () => void
}

/** Creates an account through an invite link: the invite fixes the store and the role. */
export function JoinForm({ token, onPendingChange, onGoToLogin }: JoinFormProps) {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const { acceptInvite } = useAuth()
  const errorText = useAuthErrorText()
  const [preview, setPreview] = useState<PreviewState>(token ? { kind: 'loading' } : { kind: 'invalid' })
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<JoinFormValues>({ resolver: zodResolver(joinFormSchema), defaultValues: joinFormDefaults })
  const { errors, isSubmitting } = form.formState
  const password = form.watch('password')

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    previewInvite(token, controller.signal).then(
      (invite) => setPreview({ kind: 'ready', invite }),
      (error: unknown) => {
        if (controller.signal.aborted) return
        setPreview(isInvalidInvite(error) ? { kind: 'invalid' } : { kind: 'error' })
      },
    )
    return () => controller.abort()
  }, [token])

  const submit = form.handleSubmit(async (values) => {
    if (!token) return
    setFailure(null)
    onPendingChange(true)
    try {
      await acceptInvite({ token, ...values })
    } catch (error) {
      onPendingChange(false)
      if (isInvalidInvite(error)) {
        setPreview({ kind: 'invalid' })
        return
      }
      const result = applyServerErrors(
        error,
        (name) => name in joinFormDefaults,
        (name, message) =>
          form.setError(name as keyof JoinFormValues, { message: message === EMAIL_TAKEN ? t('signup.emailTaken') : message }),
      )
      setFailure(result.type === 'unexpected' ? tc('errors.unexpected') : result.failure?.kind === 'message' ? result.failure.text : null)
    }
  })

  if (preview.kind === 'loading') {
    return (
      <div role="status" aria-busy="true" aria-label={tc('loading')} className="flex flex-col gap-4">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-13 rounded-full" />
        <Skeleton className="h-13 rounded-full" />
      </div>
    )
  }

  if (preview.kind === 'invalid' || preview.kind === 'error') {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive" className="rounded-2xl">
          <RiErrorWarningLine aria-hidden="true" />
          <AlertDescription>{preview.kind === 'invalid' ? t('join.invalid') : tc('errors.unexpected')}</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" className="h-12 self-start rounded-full px-6" onClick={onGoToLogin}>
          {t('join.goToLogin')}
        </Button>
      </div>
    )
  }

  const invalid = (name: keyof JoinFormValues) => (errors[name] ? true : undefined)
  const { invite } = preview

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      <div className="bg-accent text-accent-foreground flex items-center gap-3.5 rounded-3xl px-5 py-4">
        <span className="bg-primary flex size-11 shrink-0 items-center justify-center rounded-full text-white">
          <RiStore2Line className="size-5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 text-sm">
          <span className="truncate text-base font-extrabold">{invite.storeName}</span>
          <span>{t('join.asRole', { role: tc(`roles.${invite.role}`) })}</span>
        </span>
      </div>
      {failure ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}
      <Field data-invalid={invalid('name')}>
        <FieldLabel htmlFor="join-name" className="text-[13px] font-semibold">
          {t('signup.name')}
        </FieldLabel>
        <Input id="join-name" autoComplete="name" className={authInputClasses} aria-invalid={invalid('name')} {...form.register('name')} />
        {errors.name ? <FieldError>{errorText(errors.name.message)}</FieldError> : null}
      </Field>
      <Field data-invalid={invalid('email')}>
        <FieldLabel htmlFor="join-email" className="text-[13px] font-semibold">
          {t('login.email')}
        </FieldLabel>
        <Input
          id="join-email"
          type="email"
          autoComplete="email"
          placeholder={t('login.emailPlaceholder')}
          className={authInputClasses}
          aria-invalid={invalid('email')}
          {...form.register('email')}
        />
        {errors.email ? <FieldError>{errorText(errors.email.message)}</FieldError> : null}
      </Field>
      <Field data-invalid={invalid('password')}>
        <FieldLabel htmlFor="join-password" className="text-[13px] font-semibold">
          {t('login.password')}
        </FieldLabel>
        <PasswordInput
          id="join-password"
          autoComplete="new-password"
          placeholder={t('signup.passwordPlaceholder')}
          aria-invalid={invalid('password')}
          aria-describedby="join-password-strength"
          {...form.register('password')}
        />
        <StrengthMeter id="join-password-strength" password={password} />
        {errors.password ? <FieldError>{errorText(errors.password.message)}</FieldError> : null}
      </Field>
      <AuthSubmitButton busy={isSubmitting} label={t('join.submit')} busyLabel={t('join.submitting')} />
    </form>
  )
}
