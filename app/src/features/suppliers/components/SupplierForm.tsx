import { zodResolver } from '@hookform/resolvers/zod'
import { useRef, useState, type BaseSyntheticEvent } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useBlocker, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { supplierFormDefaults, supplierFormSchema } from '@/features/suppliers/schema'
import type { SupplierFormValues } from '@/features/suppliers/schema'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import { isApiError } from '@/shared/api/http'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import { FormActionBar } from '@/shared/forms/FormActionBar'
import { FormLayout } from '@/shared/forms/FormLayout'
import type { FormFailure } from '@/shared/forms/applyServerErrors'
import { ContactSection, IdentificationSection, SupplierSummary } from './SupplierFormSections'

export interface SupplierFormProps {
  defaultValues: SupplierFormValues
  /** Persists the values. Reject with an ApiError to show it in the form. */
  onSubmit: (values: SupplierFormValues) => Promise<void>
  submitting: boolean
  /** Called after a successful submit (the unsaved-changes guard is already released). */
  onSaved?: () => void
  /** Called when the user asks to reload after an edit conflict (409). */
  onReload?: () => void
  /** ISO dates shown in the summary (edit only). */
  createdDate?: string
  lastModifiedDate?: string
}

function isFormField(name: string): name is keyof SupplierFormValues {
  return Object.hasOwn(supplierFormDefaults, name)
}

export function SupplierForm({
  defaultValues,
  onSubmit,
  submitting,
  onSaved,
  onReload,
  createdDate,
  lastModifiedDate,
}: SupplierFormProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('suppliers')
  const { t: tc } = useTranslation()
  const [failure, setFailure] = useState<FormFailure | null>(null)
  const saved = useRef(false)
  const form = useForm<SupplierFormValues>({ resolver: zodResolver(supplierFormSchema), defaultValues })
  const { isDirty } = form.formState

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => isDirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
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

  // handleSubmit runs on submit, not during render, so the handler may touch refs (saved).
  const submit = (event?: BaseSyntheticEvent) =>
    form.handleSubmit(async (values) => {
      setFailure(null)
      try {
        await onSubmit(values)
      } catch (error) {
        handleError(error)
        return
      }
      saved.current = true
      onSaved?.()
    })(event)

  const busy = submitting || form.formState.isSubmitting

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
      <FormLayout
        asideLabel={tc('form.summary')}
        main={
          <>
            <IdentificationSection form={form} />
            <ContactSection form={form} />
          </>
        }
        aside={<SupplierSummary form={form} createdDate={createdDate} lastModifiedDate={lastModifiedDate} />}
      />
      <FormActionBar dirty={isDirty} submitting={busy} onCancel={() => void navigate('/suppliers')} />
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
