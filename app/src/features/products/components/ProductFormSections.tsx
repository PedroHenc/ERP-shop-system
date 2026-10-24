import type { ParseKeys } from 'i18next'
import { Controller } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import type { ProductFormValues } from '@/features/products/schema'
import { UNITS_OF_MEASURE } from '@/features/products/types'
import type { UnitOfMeasure } from '@/features/products/types'
import { BrandCombobox } from './BrandCombobox'

type Form = UseFormReturn<ProductFormValues>
type TextName = 'sku' | 'barcode' | 'name' | 'category' | 'subcategory' | 'price' | 'stockQuantity' | 'minimumStock' | 'reorderPoint'

const REQUIRED = "after:ml-0.5 after:text-destructive after:content-['*']"
const VALIDATION_PREFIX = 'products:validation.'

function useErrorText() {
  const { t } = useTranslation('products')
  // Client-side messages are i18n keys (see schema.ts); server messages are already text.
  return (message: string | undefined) =>
    message?.startsWith(VALIDATION_PREFIX)
      ? t(message.slice('products:'.length) as ParseKeys<'products'>)
      : message
}

function TextField({
  form,
  name,
  required = false,
  decimal = false,
}: {
  form: Form
  name: TextName
  required?: boolean
  decimal?: boolean
}) {
  const { t } = useTranslation('products')
  const errorText = useErrorText()
  const error = form.formState.errors[name]
  const message = errorText(error?.message)
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={`product-${name}`} className={required ? REQUIRED : undefined}>
        {t(`form.fields.${name}`)}
      </FieldLabel>
      <Input
        id={`product-${name}`}
        inputMode={decimal ? 'decimal' : undefined}
        aria-invalid={error ? true : undefined}
        {...form.register(name)}
      />
      {message ? <FieldError>{message}</FieldError> : null}
    </Field>
  )
}

function SwitchField({ form, name }: { form: Form; name: 'allowNegativeStock' | 'active' }) {
  const { t } = useTranslation('products')
  const errorText = useErrorText()
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <Field orientation="horizontal" data-invalid={fieldState.error ? true : undefined}>
          <Switch
            id={`product-${name}`}
            checked={field.value}
            onCheckedChange={field.onChange}
            aria-invalid={fieldState.error ? true : undefined}
          />
          <FieldLabel htmlFor={`product-${name}`}>{t(`form.fields.${name}`)}</FieldLabel>
          {fieldState.error?.message ? <FieldError>{errorText(fieldState.error.message)}</FieldError> : null}
        </Field>
      )}
    />
  )
}

export function IdentificationSection({ form }: { form: Form }) {
  const { t } = useTranslation('products')
  const errorText = useErrorText()
  const descriptionError = errorText(form.formState.errors.description?.message)
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sections.identification')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <TextField form={form} name="sku" required />
        <TextField form={form} name="barcode" />
        <div className="md:col-span-2">
          <TextField form={form} name="name" required />
        </div>
        <Field className="md:col-span-2" data-invalid={descriptionError ? true : undefined}>
          <FieldLabel htmlFor="product-description">{t('form.fields.description')}</FieldLabel>
          <Textarea
            id="product-description"
            aria-invalid={descriptionError ? true : undefined}
            {...form.register('description')}
          />
          {descriptionError ? <FieldError>{descriptionError}</FieldError> : null}
        </Field>
      </CardContent>
    </Card>
  )
}

export function ClassificationSection({ form }: { form: Form }) {
  const { t } = useTranslation('products')
  const errorText = useErrorText()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sections.classification')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <TextField form={form} name="category" required />
        <TextField form={form} name="subcategory" />
        <Controller
          control={form.control}
          name="brandId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.error ? true : undefined}>
              <FieldLabel htmlFor="product-brandId">{t('form.fields.brand')}</FieldLabel>
              <BrandCombobox
                id="product-brandId"
                value={field.value}
                onChange={field.onChange}
                allowNone
                aria-invalid={fieldState.error ? true : undefined}
              />
              {fieldState.error?.message ? <FieldError>{errorText(fieldState.error.message)}</FieldError> : null}
            </Field>
          )}
        />
      </CardContent>
    </Card>
  )
}

export function PricingSection({ form }: { form: Form }) {
  const { t } = useTranslation('products')
  const errorText = useErrorText()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sections.pricing')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <TextField form={form} name="price" required decimal />
        <Controller
          control={form.control}
          name="unitOfMeasure"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.error ? true : undefined}>
              <FieldLabel htmlFor="product-unitOfMeasure" className={REQUIRED}>
                {t('form.fields.unitOfMeasure')}
              </FieldLabel>
              <Select value={field.value} onValueChange={(value) => field.onChange(value as UnitOfMeasure)}>
                <SelectTrigger
                  id="product-unitOfMeasure"
                  className="w-full"
                  aria-invalid={fieldState.error ? true : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS_OF_MEASURE.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {t(`units.${unit}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error?.message ? <FieldError>{errorText(fieldState.error.message)}</FieldError> : null}
            </Field>
          )}
        />
        <TextField form={form} name="stockQuantity" required decimal />
        <TextField form={form} name="minimumStock" required decimal />
        <TextField form={form} name="reorderPoint" required decimal />
        <div className="flex flex-col gap-3 md:col-span-3">
          <SwitchField form={form} name="allowNegativeStock" />
          <SwitchField form={form} name="active" />
        </div>
      </CardContent>
    </Card>
  )
}
