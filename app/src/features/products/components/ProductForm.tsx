import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useBlocker, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { productFormDefaults, productFormSchema } from '@/features/products/schema'
import type { ProductFormValues } from '@/features/products/schema'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import { isApiError } from '@/shared/api/http'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import type { FormFailure } from '@/shared/forms/applyServerErrors'
import { FormActionBar } from '@/shared/forms/FormActionBar'
import { FormLayout } from '@/shared/forms/FormLayout'
import { ClassificationSection, IdentificationSection, PricingSection } from './ProductFormSections'
import { ProductSummary } from './ProductSummary'

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
  /** Disables every field and hides Save (users without products.write). */
  readOnly?: boolean
  /** ISO dates shown in the summary (edit only). */
  createdDate?: string
  lastModifiedDate?: string
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
  readOnly = false,
  createdDate,
  lastModifiedDate,
}: ProductFormProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const [failure, setFailure] = useState<FormFailure | null>(null)
  const saved = useRef(false)
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues })
  const { isDirty } = form.formState

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => !readOnly && isDirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  )

  function handleError(error: unknown) {
    const result = applyServerErrors(error, isFormField, (name, message) => {
      if (isFormField(name)) form.setError(name, { type: 'server', message })
    })
    if (result.type === 'unexpected') {
      // A 403 already got the global permission toast.
      if (!(isApiError(error) && error.status === 403)) toast.error(tc('errors.unexpected'))
    } else if (result.failure) setFailure(result.failure)
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
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6">
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
      <fieldset disabled={readOnly} className="contents">
        <FormLayout
          asideLabel={tc('form.summary')}
          main={
            <>
              <IdentificationSection form={form} />
              <ClassificationSection form={form} brandFallbackLabel={brandFallbackLabel} />
              <PricingSection form={form} />
            </>
          }
          aside={<ProductSummary form={form} createdDate={createdDate} lastModifiedDate={lastModifiedDate} />}
        />
      </fieldset>
      {readOnly ? null : (
        <FormActionBar
          dirty={isDirty}
          submitting={submitting || form.formState.isSubmitting}
          onCancel={() => void navigate('/products')}
        />
      )}
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
