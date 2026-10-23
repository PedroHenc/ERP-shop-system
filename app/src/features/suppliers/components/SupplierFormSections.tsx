import type { ParseKeys } from 'i18next'
import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { SupplierFormValues } from '@/features/suppliers/schema'

type Form = UseFormReturn<SupplierFormValues>
type TextName = 'legalName' | 'tradeName' | 'taxId' | 'email' | 'phone'

const REQUIRED = "after:ml-0.5 after:text-destructive after:content-['*']"
const VALIDATION_PREFIX = 'suppliers:validation.'

function useErrorText() {
  const { t } = useTranslation('suppliers')
  // Client-side messages are i18n keys (see schema.ts); server messages are already text.
  return (message: string | undefined) =>
    message?.startsWith(VALIDATION_PREFIX) ? t(message.slice('suppliers:'.length) as ParseKeys<'suppliers'>) : message
}

function TextField({ form, name, required = false }: { form: Form; name: TextName; required?: boolean }) {
  const { t } = useTranslation('suppliers')
  const errorText = useErrorText()
  const error = form.formState.errors[name]
  const message = errorText(error?.message)
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={`supplier-${name}`} className={required ? REQUIRED : undefined}>
        {t(`form.fields.${name}`)}
      </FieldLabel>
      <Input
        id={`supplier-${name}`}
        type={name === 'email' ? 'email' : undefined}
        aria-invalid={error ? true : undefined}
        {...form.register(name)}
      />
      {message ? <FieldError>{message}</FieldError> : null}
    </Field>
  )
}

export function ActiveSwitch({ form }: { form: Form }) {
  const { t } = useTranslation('suppliers')
  const errorText = useErrorText()
  return (
    <Controller
      control={form.control}
      name="active"
      render={({ field, fieldState }) => (
        <Field orientation="horizontal" data-invalid={fieldState.error ? true : undefined}>
          <Switch
            id="supplier-active"
            checked={field.value}
            onCheckedChange={field.onChange}
            aria-invalid={fieldState.error ? true : undefined}
          />
          <FieldLabel htmlFor="supplier-active">{t('form.fields.active')}</FieldLabel>
          {fieldState.error?.message ? <FieldError>{errorText(fieldState.error.message)}</FieldError> : null}
        </Field>
      )}
    />
  )
}

export function IdentificationSection({ form }: { form: Form }) {
  const { t } = useTranslation('suppliers')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sections.identification')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <TextField form={form} name="legalName" required />
        </div>
        <TextField form={form} name="tradeName" />
        <TextField form={form} name="taxId" />
      </CardContent>
    </Card>
  )
}

export function ContactSection({ form }: { form: Form }) {
  const { t } = useTranslation('suppliers')
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sections.contact')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <TextField form={form} name="email" />
        <TextField form={form} name="phone" />
      </CardContent>
    </Card>
  )
}
