import type { ParseKeys } from 'i18next'
import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ROLES } from '@/app/auth/types'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { UserFormValues } from '@/features/users/schema'

type Form = UseFormReturn<UserFormValues>
type TextName = 'name' | 'email' | 'password'

const REQUIRED = "after:ml-0.5 after:text-destructive after:content-['*']"
const VALIDATION_PREFIX = 'users:validation.'

/** Client-side messages are i18n keys (see schema.ts); server messages are already text. */
export function useUserErrorText() {
  const { t } = useTranslation('users')
  return (message: string | undefined) =>
    message?.startsWith(VALIDATION_PREFIX) ? t(message.slice('users:'.length) as ParseKeys<'users'>) : message
}

function TextField({ form, name, type, required = false }: { form: Form; name: TextName; type?: string; required?: boolean }) {
  const { t } = useTranslation('users')
  const errorText = useUserErrorText()
  const error = form.formState.errors[name]
  const message = errorText(error?.message)
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={`user-${name}`} className={required ? REQUIRED : undefined}>
        {t(`form.fields.${name}`)}
      </FieldLabel>
      <Input
        id={`user-${name}`}
        type={type}
        autoComplete={name === 'password' ? 'new-password' : undefined}
        aria-invalid={error ? true : undefined}
        {...form.register(name)}
      />
      {message ? <FieldError>{message}</FieldError> : null}
    </Field>
  )
}

function RoleField({ form, locked }: { form: Form; locked: boolean }) {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const errorText = useUserErrorText()
  return (
    <Controller
      control={form.control}
      name="role"
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.error ? true : undefined}>
          <FieldLabel htmlFor="user-role">{t('form.fields.role')}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange} disabled={locked}>
            <SelectTrigger id="user-role" aria-invalid={fieldState.error ? true : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {tc(`roles.${role}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error?.message ? <FieldError>{errorText(fieldState.error.message)}</FieldError> : null}
        </Field>
      )}
    />
  )
}

function ActiveSwitch({ form, locked }: { form: Form; locked: boolean }) {
  const { t } = useTranslation('users')
  const errorText = useUserErrorText()
  return (
    <Controller
      control={form.control}
      name="active"
      render={({ field, fieldState }) => (
        <Field orientation="horizontal" data-invalid={fieldState.error ? true : undefined}>
          <Switch
            id="user-active"
            checked={field.value}
            disabled={locked}
            onCheckedChange={field.onChange}
            aria-invalid={fieldState.error ? true : undefined}
          />
          <FieldLabel htmlFor="user-active">{t('form.fields.active')}</FieldLabel>
          {fieldState.error?.message ? <FieldError>{errorText(fieldState.error.message)}</FieldError> : null}
        </Field>
      )}
    />
  )
}

interface UserFormFieldsProps {
  form: Form
  /** The password is only asked for when creating a user. */
  withPassword: boolean
  /** Editing your own account: role and status can't be changed. */
  selfLocked: boolean
}

export function UserFormFields({ form, withPassword, selfLocked }: UserFormFieldsProps) {
  const { t } = useTranslation('users')
  return (
    <Card>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <TextField form={form} name="name" required />
        <TextField form={form} name="email" type="email" required />
        <RoleField form={form} locked={selfLocked} />
        {withPassword ? <TextField form={form} name="password" type="password" required /> : null}
        <div className="flex flex-col gap-2 md:col-span-2">
          <ActiveSwitch form={form} locked={selfLocked} />
          {selfLocked ? <FieldDescription>{t('form.selfLocked')}</FieldDescription> : null}
        </div>
      </CardContent>
    </Card>
  )
}
