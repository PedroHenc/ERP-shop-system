import type { ParseKeys } from 'i18next'
import { Controller, useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ROLES } from '@/app/auth/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { UserFormValues } from '@/features/users/schema'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { RecordMeta } from '@/shared/forms/RecordMeta'
import { Button } from '@/components/ui/button'

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

export function AccountSection({ form, withPassword }: { form: Form; withPassword: boolean }) {
  const { t } = useTranslation('users')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sections.account')}</CardTitle>
        <CardDescription>{t('form.help.account')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <TextField form={form} name="name" required />
        <TextField form={form} name="email" type="email" required />
        {withPassword ? <TextField form={form} name="password" type="password" required /> : null}
      </CardContent>
    </Card>
  )
}

export function AccessSection({ form, locked }: { form: Form; locked: boolean }) {
  const { t } = useTranslation('users')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sections.access')}</CardTitle>
        <CardDescription>{t('form.help.access')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <RoleField form={form} locked={locked} />
      </CardContent>
    </Card>
  )
}

interface UserSummaryProps {
  form: Form
  /** Editing your own account: the status can't be changed. */
  selfLocked: boolean
  createdDate?: string
  lastModifiedDate?: string
  /** Shown as a button when set (other users' accounts only). */
  onSetPassword?: () => void
}

export function UserSummary({ form, selfLocked, createdDate, lastModifiedDate, onSetPassword }: UserSummaryProps) {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const [name, role] = useWatch({ control: form.control, name: ['name', 'role'] })
  const displayName = name.trim() || t('form.newTitle')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tc('form.summary')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <UserAvatar name={name} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-medium">{displayName}</p>
            <p className="text-sm text-muted-foreground">{role ? tc(`roles.${role}`) : null}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <ActiveSwitch form={form} locked={selfLocked} />
          {selfLocked ? <FieldDescription>{t('form.selfLocked')}</FieldDescription> : null}
        </div>
        <RecordMeta createdDate={createdDate} lastModifiedDate={lastModifiedDate} />
        {onSetPassword ? (
          <Button type="button" variant="outline" onClick={onSetPassword}>
            {t('password.title')}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
