import { zodResolver } from '@hookform/resolvers/zod'
import type { ParseKeys } from 'i18next'
import { useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Product } from '@/features/products/types'
import { isApiError } from '@/shared/api/http'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import type { FormFailure } from '@/shared/forms/applyServerErrors'
import { cn } from '@/lib/utils'
import { useFormatQuantity } from '../format'
import { useRecordStockMovement } from '../queries'
import { balanceAfter, movementFormDefaults, movementFormSchema, toMovementRequest } from '../schema'
import type { MovementFormValues } from '../schema'
import { MANUAL_MOVEMENT_TYPES, REASONS_BY_TYPE } from '../types'

/** What the dialog needs to know about the product. */
export type StockProduct = Pick<Product, 'id' | 'name' | 'unitOfMeasure' | 'stockQuantity' | 'allowNegativeStock'>

const VALIDATION_PREFIX = 'stock:validation.'
const FIELDS = ['type', 'reason', 'quantity', 'note'] as const

function isFormField(name: string): name is keyof MovementFormValues {
  return (FIELDS as readonly string[]).includes(name)
}

function MovementForm({ product, onDone }: { product: StockProduct; onDone: () => void }) {
  const { t } = useTranslation('stock')
  const { t: tc } = useTranslation()
  const format = useFormatQuantity()
  const record = useRecordStockMovement(product.id)
  const [failure, setFailure] = useState<FormFailure | null>(null)
  const form = useForm<MovementFormValues>({ resolver: zodResolver(movementFormSchema), defaultValues: movementFormDefaults() })
  const { errors, isSubmitting } = form.formState
  const [type, quantity] = useWatch({ control: form.control, name: ['type', 'quantity'] })
  const after = balanceAfter(product.stockQuantity, type, quantity)
  const goesNegative = after !== null && after < 0 && !product.allowNegativeStock

  // Client-side messages are i18n keys (see schema.ts); server messages are already text.
  const errorText = (message: string | undefined) =>
    message?.startsWith(VALIDATION_PREFIX) ? t(message.slice('stock:'.length) as ParseKeys<'stock'>) : message

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await record.mutateAsync(toMovementRequest(values))
    } catch (error) {
      const result = applyServerErrors(error, isFormField, (name, message) => {
        if (isFormField(name)) form.setError(name, { type: 'server', message })
      })
      if (result.type === 'unexpected') {
        // A 403 already got the global permission toast.
        if (!(isApiError(error) && error.status === 403)) toast.error(tc('errors.unexpected'))
      } else if (result.failure) setFailure(result.failure)
      return
    }
    toast.success(t('dialog.saved'))
    onDone()
  })

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      {failure?.kind === 'message' ? (
        <Alert variant="destructive">
          <AlertTitle>{t('dialog.error')}</AlertTitle>
          <AlertDescription>{failure.text}</AlertDescription>
        </Alert>
      ) : null}
      <Controller
        control={form.control}
        name="type"
        render={({ field }) => (
          <SegmentedControl
            label={t('dialog.type')}
            fullWidth
            value={field.value}
            onChange={(next) => {
              field.onChange(next)
              // Each type has its own reasons; keep the quantity, its meaning is shown by the label.
              form.setValue('reason', REASONS_BY_TYPE[next][0])
              form.clearErrors()
            }}
            options={MANUAL_MOVEMENT_TYPES.map((value) => ({ value, label: t(`types.${value}`) }))}
          />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="reason"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.error ? true : undefined}>
              <FieldLabel htmlFor="movement-reason">{t('dialog.reason')}</FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="movement-reason" className="w-full" aria-invalid={fieldState.error ? true : undefined}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS_BY_TYPE[type].map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {t(`reasons.${reason}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.error ? <FieldError>{errorText(fieldState.error.message)}</FieldError> : null}
            </Field>
          )}
        />
        <Field data-invalid={errors.quantity ? true : undefined}>
          <FieldLabel htmlFor="movement-quantity">{t(`dialog.quantity.${type}`)}</FieldLabel>
          <Input
            id="movement-quantity"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            aria-invalid={errors.quantity ? true : undefined}
            aria-describedby="movement-after"
            {...form.register('quantity')}
          />
          {errors.quantity ? <FieldError>{errorText(errors.quantity.message)}</FieldError> : null}
        </Field>
      </div>
      {type === 'ADJUSTMENT' ? <p className="text-muted-foreground -mt-2 text-xs">{t('dialog.adjustmentHint')}</p> : null}
      <Field data-invalid={errors.note ? true : undefined}>
        <FieldLabel htmlFor="movement-note">{t('dialog.note')}</FieldLabel>
        <Textarea
          id="movement-note"
          rows={2}
          placeholder={t('dialog.notePlaceholder')}
          aria-invalid={errors.note ? true : undefined}
          {...form.register('note')}
        />
        {errors.note ? <FieldError>{errorText(errors.note.message)}</FieldError> : null}
      </Field>
      <div
        id="movement-after"
        aria-live="polite"
        className={cn(
          'flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm',
          goesNegative ? 'bg-destructive/10 text-destructive' : 'bg-muted',
        )}
      >
        <span>{t('dialog.after')}</span>
        <span className="font-extrabold tabular-nums">
          {after === null ? '—' : format(after, product.unitOfMeasure)}
        </span>
      </div>
      {goesNegative ? <FieldDescription className="text-destructive -mt-2">{t('dialog.negative')}</FieldDescription> : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          {tc('actions.cancel')}
        </Button>
        <Button type="submit" loading={isSubmitting} disabled={goesNegative}>
          {isSubmitting ? t('dialog.saving') : t('dialog.submit')}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface StockMovementDialogProps {
  /** The product to move; `null` keeps the dialog closed. */
  product: StockProduct | null
  onOpenChange: (open: boolean) => void
}

/** Records an entry, exit or adjustment for one product, previewing the resulting stock. */
export function StockMovementDialog({ product, onOpenChange }: StockMovementDialogProps) {
  const { t } = useTranslation('stock')
  const format = useFormatQuantity()
  return (
    <Dialog open={product !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('dialog.title')}</DialogTitle>
          <DialogDescription>
            {product
              ? t('dialog.description', { name: product.name, stock: format(product.stockQuantity, product.unitOfMeasure) })
              : null}
          </DialogDescription>
        </DialogHeader>
        {product ? <MovementForm key={product.id} product={product} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  )
}
