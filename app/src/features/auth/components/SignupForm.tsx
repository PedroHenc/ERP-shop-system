import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth/AuthProvider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { isApiError } from '@/shared/api/http'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import { signupFormDefaults, signupFormSchema, type SignupFormValues } from '../schema'
import { AuthSubmitButton, PasswordInput, StrengthMeter, authInputClasses, useAuthErrorText } from './auth-fields'

/** The API's message for an e-mail that is already registered (in any store). */
export const EMAIL_TAKEN = 'A user with this email already exists'

interface SignupFormProps {
  /** Called right before the request, and again with `false` if it fails. */
  onPendingChange: (pending: boolean) => void
}

/** "Create account": a new store and its first user, who becomes the store's admin. */
export function SignupForm({ onPendingChange }: SignupFormProps) {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const { signUp } = useAuth()
  const errorText = useAuthErrorText()
  const [failure, setFailure] = useState<string | null>(null)
  const form = useForm<SignupFormValues>({ resolver: zodResolver(signupFormSchema), defaultValues: signupFormDefaults })
  const { errors, isSubmitting } = form.formState
  const password = form.watch('password')

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    onPendingChange(true)
    try {
      await signUp(values)
    } catch (error) {
      onPendingChange(false)
      if (isApiError(error) && error.status === 403) {
        setFailure(t('signup.disabled'))
        return
      }
      const result = applyServerErrors(
        error,
        (name) => name in signupFormDefaults,
        (name, message) =>
          form.setError(name as keyof SignupFormValues, { message: message === EMAIL_TAKEN ? t('signup.emailTaken') : message }),
      )
      setFailure(result.type === 'unexpected' ? tc('errors.unexpected') : result.failure?.kind === 'message' ? result.failure.text : null)
    }
  })

  const invalid = (name: keyof SignupFormValues) => (errors[name] ? true : undefined)

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      {failure ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}
      <Field data-invalid={invalid('storeName')}>
        <FieldLabel htmlFor="signup-store" className="text-[13px] font-semibold">
          {t('signup.storeName')}
        </FieldLabel>
        <Input
          id="signup-store"
          autoComplete="organization"
          placeholder={t('signup.storeNamePlaceholder')}
          className={authInputClasses}
          aria-invalid={invalid('storeName')}
          {...form.register('storeName')}
        />
        {errors.storeName ? <FieldError>{errorText(errors.storeName.message)}</FieldError> : null}
      </Field>
      <Field data-invalid={invalid('name')}>
        <FieldLabel htmlFor="signup-name" className="text-[13px] font-semibold">
          {t('signup.name')}
        </FieldLabel>
        <Input
          id="signup-name"
          autoComplete="name"
          className={authInputClasses}
          aria-invalid={invalid('name')}
          {...form.register('name')}
        />
        {errors.name ? <FieldError>{errorText(errors.name.message)}</FieldError> : null}
      </Field>
      <Field data-invalid={invalid('email')}>
        <FieldLabel htmlFor="signup-email" className="text-[13px] font-semibold">
          {t('login.email')}
        </FieldLabel>
        <Input
          id="signup-email"
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
        <FieldLabel htmlFor="signup-password" className="text-[13px] font-semibold">
          {t('login.password')}
        </FieldLabel>
        <PasswordInput
          id="signup-password"
          autoComplete="new-password"
          placeholder={t('signup.passwordPlaceholder')}
          aria-invalid={invalid('password')}
          aria-describedby="signup-password-strength"
          {...form.register('password')}
        />
        <StrengthMeter id="signup-password-strength" password={password} />
        {errors.password ? <FieldError>{errorText(errors.password.message)}</FieldError> : null}
      </Field>
      <p className="text-muted-foreground text-[13px] text-pretty">{t('signup.adminNote')}</p>
      <AuthSubmitButton busy={isSubmitting} label={t('signup.submit')} busyLabel={t('signup.submitting')} />
    </form>
  )
}
