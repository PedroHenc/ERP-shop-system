import { zodResolver } from '@hookform/resolvers/zod'
import { RiLoader4Line } from '@remixicon/react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { productFormDefaults, productFormSchema } from '@/features/products/schema'
import type { ProductFormValues } from '@/features/products/schema'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import type { FormFailure } from '@/shared/forms/applyServerErrors'
import { ClassificationSection, IdentificationSection, PricingSection } from './ProductFormSections'

export interface ProductFormProps {
  defaultValues: ProductFormValues
  /** Persists the values. Reject with an ApiError to show it in the form. */
  onSubmit: (values: ProductFormValues) => Promise<void>
  submitting: boolean
  /** Called after a successful submit (the unsaved-changes guard is already released). */
  onSaved?: () => void
  /** Called when the user asks to reload after an edit conflict (409). */
  onReload?: () => void
  /** Name shown for the selected brand when it is not among the active brands (edit of an inactive brand). */
  brandFallbackLabel?: string
}

function isFormField(name: string): name is keyof ProductFormValues {
  return Object.hasOwn(productFormDefaults, name)
}

export function ProductForm({
  defaultValues,
  onSubmit,
  submitting,
  onSaved,
  onReload,
  brandFallbackLabel,
}: ProductFormProps) {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const [failure, setFailure] = useState<FormFailure | null>(null)
  const saved = useRef(false)
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues })
  const { isDirty } = form.formState

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  )

  function handleError(error: unknown) {
    const result = applyServerErrors(error, isFormField, (name, message) => {
      if (isFormField(name)) form.setError(name, { type: 'server', message })
    })
    if (result.type === 'unexpected') toast.error(tc('errors.unexpected'))
    else if (result.failure) setFailure(result.failure)
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await onSubmit(values)
    } catch (error) {
      handleError(error)
      return
    }
    saved.current = true
    onSaved?.()
  })

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex max-w-4xl flex-col gap-6">
      {failure?.kind === 'message' ? (
        <Alert variant="destructive">
          <AlertTitle>{t('form.saveError')}</AlertTitle>
          <AlertDescription>{failure.text}</AlertDescription>
        </Alert>
      ) : null}
      {failure?.kind === 'conflict' ? (
        <Alert variant="destructive">
          <AlertTitle>{t('form.conflictTitle')}</AlertTitle>
          <AlertDescription>
            <p>{t('form.conflictDescription')}</p>
            {onReload ? (
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onReload}>
                {t('form.reload')}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <IdentificationSection form={form} />
      <ClassificationSection form={form} brandFallbackLabel={brandFallbackLabel} />
      <PricingSection form={form} />
      <div>
        <Button type="submit" disabled={submitting || form.formState.isSubmitting}>
          {submitting || form.formState.isSubmitting ? (
            <>
              <RiLoader4Line className="animate-spin" aria-hidden="true" />
              {tc('actions.saving')}
            </>
          ) : (
            tc('actions.save')
          )}
        </Button>
      </div>
      <UnsavedChangesDialog
        open={blocker.state === 'blocked'}
        onStay={() => {
          if (blocker.state === 'blocked') blocker.reset()
        }}
        onLeave={() => {
          if (blocker.state === 'blocked') blocker.proceed()
        }}
      />
    </form>
  )
}
