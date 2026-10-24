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
import { isApiError } from '@/shared/api/http'
import { ClassificationSection, IdentificationSection, PricingSection } from './ProductFormSections'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'

export interface ProductFormProps {
  defaultValues: ProductFormValues
  /** Persists the values. Reject with an ApiError to show it in the form. */
  onSubmit: (values: ProductFormValues) => Promise<void>
  submitting: boolean
  /** Called after a successful submit (the unsaved-changes guard is already released). */
  onSaved?: () => void
  /** Called when the user asks to reload after an edit conflict (409). */
  onReload?: () => void
}

type Failure = { kind: 'message'; text: string } | { kind: 'conflict' }

function isFormField(name: string): name is keyof ProductFormValues {
  return Object.hasOwn(productFormDefaults, name)
}

export function ProductForm({ defaultValues, onSubmit, submitting, onSaved, onReload }: ProductFormProps) {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const [failure, setFailure] = useState<Failure | null>(null)
  const saved = useRef(false)
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues })
  const { isDirty } = form.formState

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
  )

  function handleError(error: unknown) {
    if (isApiError(error) && error.status === 409) {
      setFailure({ kind: 'conflict' })
      return
    }
    if (isApiError(error) && error.status === 404 && error.detail) {
      setFailure({ kind: 'message', text: error.detail })
      return
    }
    if (isApiError(error) && error.status === 400) {
      const unmatched: string[] = []
      for (const [name, message] of Object.entries(error.errors ?? {})) {
        if (isFormField(name)) form.setError(name, { type: 'server', message })
        else unmatched.push(message)
      }
      const text = unmatched.length > 0 ? unmatched.join(' ') : error.errors ? undefined : error.detail
      if (text) setFailure({ kind: 'message', text })
      return
    }
    toast.error(tc('errors.unexpected'))
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
      <ClassificationSection form={form} />
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
      <UnsavedChangesDialog blocker={blocker} />
    </form>
  )
}
