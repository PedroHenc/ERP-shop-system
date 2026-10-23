import { zodResolver } from '@hookform/resolvers/zod'
import { RiLoader4Line } from '@remixicon/react'
import type { ParseKeys } from 'i18next'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useBrand, useCreateBrand, useUpdateBrand } from '@/features/brands/queries'
import { brandFormDefaults, brandFormSchema, toBrandFormValues, toBrandRequest } from '@/features/brands/schema'
import type { BrandFormValues } from '@/features/brands/schema'
import { isApiError } from '@/shared/api/http'
import { UnsavedChangesDialog } from '@/shared/components/UnsavedChangesDialog'
import { applyServerErrors } from '@/shared/forms/applyServerErrors'
import type { FormFailure } from '@/shared/forms/applyServerErrors'

const VALIDATION_PREFIX = 'brands:validation.'

export interface BrandDialogProps {
  /** `'new'` creates, a number edits that brand, `null` keeps the dialog closed. */
  brandId: number | 'new' | null
  onOpenChange: (open: boolean) => void
}

interface CloseGuard {
  dirty: boolean
  saving: boolean
}

interface BrandFormProps {
  defaultValues: BrandFormValues
  /** Persists the values. Reject with an ApiError to show it in the form. */
  save: (values: BrandFormValues) => Promise<void>
  onSaved: () => void
  onCancel: () => void
  onGuardChange: (guard: CloseGuard) => void
  onReload?: () => void
}

function isFormField(name: string): name is keyof BrandFormValues {
  return Object.hasOwn(brandFormDefaults, name)
}

function BrandForm({ defaultValues, save, onSaved, onCancel, onGuardChange, onReload }: BrandFormProps) {
  const { t } = useTranslation('brands')
  const { t: tc } = useTranslation()
  const [failure, setFailure] = useState<FormFailure | null>(null)
  const form = useForm<BrandFormValues>({ resolver: zodResolver(brandFormSchema), defaultValues })
  const { isDirty, isSubmitting, errors } = form.formState

  useEffect(() => {
    onGuardChange({ dirty: isDirty, saving: isSubmitting })
  }, [isDirty, isSubmitting, onGuardChange])

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    try {
      await save(values)
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
    onSaved()
  })

  // Client-side messages are i18n keys (see schema.ts); server messages are already text.
  const rawMessage = errors.name?.message
  const nameError = rawMessage?.startsWith(VALIDATION_PREFIX)
    ? t(rawMessage.slice('brands:'.length) as ParseKeys<'brands'>)
    : rawMessage

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
      {failure?.kind === 'message' ? (
        <Alert variant="destructive">
          <AlertTitle>{t('dialog.saveError')}</AlertTitle>
          <AlertDescription>{failure.text}</AlertDescription>
        </Alert>
      ) : null}
      {failure?.kind === 'conflict' ? (
        <Alert variant="destructive">
          <AlertTitle>{t('dialog.conflictTitle')}</AlertTitle>
          <AlertDescription>
            <p>{t('dialog.conflictDescription')}</p>
            {onReload ? (
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onReload}>
                {t('dialog.reload')}
              </Button>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}
      <Field data-invalid={errors.name ? true : undefined}>
        <FieldLabel htmlFor="brand-name" className="after:text-destructive after:ml-0.5 after:content-['*']">
          {t('dialog.fields.name')}
        </FieldLabel>
        <Input id="brand-name" autoFocus aria-invalid={errors.name ? true : undefined} {...form.register('name')} />
        {nameError ? <FieldError>{nameError}</FieldError> : null}
      </Field>
      <Controller
        control={form.control}
        name="active"
        render={({ field }) => (
          <Field orientation="horizontal">
            <Switch id="brand-active" checked={field.value} onCheckedChange={field.onChange} />
            <FieldLabel htmlFor="brand-active">{t('dialog.fields.active')}</FieldLabel>
          </Field>
        )}
      />
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {tc('actions.cancel')}
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <RiLoader4Line className="animate-spin" aria-hidden="true" />
              {tc('actions.saving')}
            </>
          ) : (
            tc('actions.save')
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

function CreateBrandForm(props: Pick<BrandFormProps, 'onSaved' | 'onCancel' | 'onGuardChange'>) {
  const create = useCreateBrand()
  return (
    <BrandForm
      {...props}
      defaultValues={brandFormDefaults}
      save={async (values) => {
        await create.mutateAsync(toBrandRequest(values, null))
      }}
    />
  )
}

/** Freezes the field values and their version together at mount, so a background refetch can't pair old values with a newer version. */
function EditBrandForm({
  brand,
  id,
  ...props
}: Pick<BrandFormProps, 'onSaved' | 'onCancel' | 'onGuardChange' | 'onReload'> & {
  brand: Parameters<typeof toBrandFormValues>[0]
  id: number
}) {
  const update = useUpdateBrand(id)
  const [snapshot] = useState(() => ({ values: toBrandFormValues(brand), version: brand.version }))
  return (
    <BrandForm
      {...props}
      defaultValues={snapshot.values}
      save={async (values) => {
        await update.mutateAsync(toBrandRequest(values, snapshot.version))
      }}
    />
  )
}

function EditBrandBody({
  id,
  ...props
}: Pick<BrandFormProps, 'onSaved' | 'onCancel' | 'onGuardChange'> & { id: number }) {
  const { t } = useTranslation('brands')
  const { data: brand, isPending, isFetching, error, refetch } = useBrand(id)
  // Bumped after a manual reload so the form remounts with the server data.
  const [reloads, setReloads] = useState(0)

  // Until this opening's first fetch completes, cached data may be stale; the form snapshots whatever it first sees.
  const [ready, setReady] = useState(false)
  if (!ready && brand && !isFetching) setReady(true)

  if (isPending || (!ready && isFetching && !error)) {
    return (
      <div className="flex flex-col gap-4" data-testid="brand-dialog-skeleton">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-6 w-1/2" />
      </div>
    )
  }

  if (error || !brand) {
    const notFound = isApiError(error) && error.status === 404
    return (
      <Alert variant="destructive">
        <AlertTitle>{notFound ? t('dialog.notFound') : t('list.error')}</AlertTitle>
      </Alert>
    )
  }

  return (
    <EditBrandForm
      key={reloads}
      brand={brand}
      id={id}
      {...props}
      onReload={() => void refetch().then(() => setReloads((count) => count + 1))}
    />
  )
}

export function BrandDialog({ brandId, onOpenChange }: BrandDialogProps) {
  const { t } = useTranslation('brands')
  const open = brandId !== null
  const guard = useRef<CloseGuard>({ dirty: false, saving: false })
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  function close() {
    guard.current = { dirty: false, saving: false }
    setConfirmingDiscard(false)
    onOpenChange(false)
  }

  function requestClose() {
    if (guard.current.saving) return
    if (guard.current.dirty) setConfirmingDiscard(true)
    else close()
  }

  function onSaved() {
    toast.success(t('dialog.saved'))
    close()
  }

  function onGuardChange(next: CloseGuard) {
    guard.current = next
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose()
      }}
    >
      <DialogContent onInteractOutside={(event) => guard.current.saving && event.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{brandId === 'new' ? t('dialog.newTitle') : t('dialog.editTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('dialog.description')}</DialogDescription>
        </DialogHeader>
        {brandId === 'new' ? (
          <CreateBrandForm key="new" onSaved={onSaved} onCancel={requestClose} onGuardChange={onGuardChange} />
        ) : brandId !== null ? (
          <EditBrandBody
            key={brandId}
            id={brandId}
            onSaved={onSaved}
            onCancel={requestClose}
            onGuardChange={onGuardChange}
          />
        ) : null}
      </DialogContent>
      <UnsavedChangesDialog open={confirmingDiscard} onStay={() => setConfirmingDiscard(false)} onLeave={close} />
    </Dialog>
  )
}
