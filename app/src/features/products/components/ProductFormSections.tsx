import { RiBarcodeLine } from '@remixicon/react'
import type { ParseKeys } from 'i18next'
import { useState, type ReactNode } from 'react'
import { Controller, useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useCurrency } from '@/app/currency-provider'
import type { ProductFormValues } from '@/features/products/schema'
import { UNITS_OF_MEASURE } from '@/features/products/types'
import type { UnitOfMeasure } from '@/features/products/types'
import { CameraScanDialog } from '@/features/scan/components/CameraScanDialog'
import { canUseCamera } from '@/features/scan/detector'
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
  prefix,
  suffix,
  action,
}: {
  form: Form
  name: TextName
  required?: boolean
  decimal?: boolean
  /** Adornment shown before the value (currency symbol). */
  prefix?: string
  /** Adornment shown after the value (unit). */
  suffix?: string
  /** A button at the end of the field (e.g. reading the barcode with the camera). */
  action?: ReactNode
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
      {prefix || suffix || action ? (
        <InputGroup>
          {prefix ? (
            <InputGroupAddon>
              <InputGroupText>{prefix}</InputGroupText>
            </InputGroupAddon>
          ) : null}
          <InputGroupInput
            id={`product-${name}`}
            inputMode={decimal ? 'decimal' : undefined}
            aria-invalid={error ? true : undefined}
            {...form.register(name)}
          />
          {suffix ? (
            <InputGroupAddon align="inline-end">
              <InputGroupText>{suffix}</InputGroupText>
            </InputGroupAddon>
          ) : null}
          {action ? <InputGroupAddon align="inline-end">{action}</InputGroupAddon> : null}
        </InputGroup>
      ) : (
        <Input
          id={`product-${name}`}
          inputMode={decimal ? 'decimal' : undefined}
          aria-invalid={error ? true : undefined}
          {...form.register(name)}
        />
      )}
      {message ? <FieldError>{message}</FieldError> : null}
    </Field>
  )
}

export function SwitchField({ form, name }: { form: Form; name: 'allowNegativeStock' | 'active' }) {
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

/** The barcode, with a button to read it with this device's camera where there is one. */
function BarcodeField({ form }: { form: Form }) {
  const { t } = useTranslation('scan')
  const [scanning, setScanning] = useState(false)
  const action = canUseCamera() ? (
    <InputGroupButton size="icon-xs" aria-label={t('camera.fieldButton')} title={t('camera.fieldButton')} onClick={() => setScanning(true)}>
      <RiBarcodeLine />
    </InputGroupButton>
  ) : undefined
  return (
    <>
      <TextField form={form} name="barcode" action={action} />
      <CameraScanDialog
        open={scanning}
        onOpenChange={setScanning}
        onDetected={(code) => form.setValue('barcode', code, { shouldDirty: true, shouldValidate: true })}
      />
    </>
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
        <CardDescription>{t('form.help.identification')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <TextField form={form} name="sku" required />
        <BarcodeField form={form} />
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

export function ClassificationSection({ form, brandFallbackLabel }: { form: Form; brandFallbackLabel?: string }) {
  const { t } = useTranslation('products')
  const errorText = useErrorText()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sections.classification')}</CardTitle>
        <CardDescription>{t('form.help.classification')}</CardDescription>
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
                fallbackLabel={brandFallbackLabel}
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

function useCurrencySymbol() {
  const { i18n } = useTranslation()
  const { currency } = useCurrency()
  return (
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency })
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency
  )
}

/** `initialStock`: the stock field is only for new products; afterwards stock moves through stock movements. */
export function PricingSection({ form, initialStock = true }: { form: Form; initialStock?: boolean }) {
  const { t } = useTranslation('products')
  const symbol = useCurrencySymbol()
  const unit = useWatch({ control: form.control, name: 'unitOfMeasure' })
  const unitLabel = t(`units.${unit}`)
  const errorText = useErrorText()
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('form.sections.pricing')}</CardTitle>
        <CardDescription>{t('form.help.pricing')}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <TextField form={form} name="price" required decimal prefix={symbol} />
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
                <SelectContent position="popper">
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
        {initialStock ? <TextField form={form} name="stockQuantity" required decimal suffix={unitLabel} /> : null}
        <TextField form={form} name="minimumStock" required decimal suffix={unitLabel} />
        <TextField form={form} name="reorderPoint" required decimal suffix={unitLabel} />
        <div className="flex flex-col gap-3 md:col-span-3">
          <SwitchField form={form} name="allowNegativeStock" />
        </div>
      </CardContent>
    </Card>
  )
}
