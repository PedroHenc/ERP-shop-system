import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useSetUserPassword } from '@/features/users/queries'
import { setPasswordDefaults, setPasswordSchema } from '@/features/users/schema'
import type { SetPasswordValues } from '@/features/users/schema'
import { isApiError } from '@/shared/api/http'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import { useUserErrorText } from '../useUserErrorText'

interface SetPasswordDialogProps {
  userId: number
  userName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function isFormField(name: string): name is keyof SetPasswordValues {
  return Object.hasOwn(setPasswordDefaults, name)
}

function SetPasswordForm({ userId, onDone }: { userId: number; onDone: () => void }) {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const errorText = useUserErrorText()
  const [failure, setFailure] = useState<string | null>(null)
  const { mutateAsync: setPassword } = useSetUserPassword(userId)
  const form = useForm<SetPasswordValues>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: setPasswordDefaults,
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await setPassword(values.password)
    } catch (error) {
      const result = applyServerErrors(error, isFormField, (name, message) => {
        if (isFormField(name)) form.setError(name, { type: 'server', message })
      })
      if (result.type === 'unexpected') {
        // A 403 already got the global permission toast.
        if (!(isApiError(error) && error.status === 403)) toast.error(tc('errors.unexpected'))
      } else if (result.failure?.kind === 'message') setFailure(result.failure.text)
      return
    }
    toast.success(t('password.updated'))
    onDone()
  })

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      {failure ? (
        <Alert variant="destructive">
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}
      <Field data-invalid={errors.password ? true : undefined}>
        <FieldLabel htmlFor="set-password-new">{t('password.new')}</FieldLabel>
        <Input
          id="set-password-new"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          {...form.register('password')}
        />
        {errors.password ? <FieldError>{errorText(errors.password.message)}</FieldError> : null}
      </Field>
      <Field data-invalid={errors.confirmPassword ? true : undefined}>
        <FieldLabel htmlFor="set-password-confirm">{t('password.confirm')}</FieldLabel>
        <Input
          id="set-password-confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          {...form.register('confirmPassword')}
        />
        {errors.confirmPassword ? <FieldError>{errorText(errors.confirmPassword.message)}</FieldError> : null}
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onDone}>
          {tc('actions.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {t('password.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function SetPasswordDialog({ userId, userName, open, onOpenChange }: SetPasswordDialogProps) {
  const { t } = useTranslation('users')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('password.title')}</DialogTitle>
          <DialogDescription>{t('password.description', { name: userName })}</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the fields start empty every time. */}
        <SetPasswordForm userId={userId} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
