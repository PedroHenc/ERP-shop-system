import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { SupplierForm } from '@/features/suppliers/components/SupplierForm'
import { useCreateSupplier, useSupplier, useUpdateSupplier } from '@/features/suppliers/queries'
import { supplierFormDefaults, toSupplierFormValues, toSupplierRequest } from '@/features/suppliers/schema'
import type { SupplierFormValues } from '@/features/suppliers/schema'
import type { Supplier } from '@/features/suppliers/types'
import { isApiError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'

function useSaved() {
  const { t } = useTranslation('suppliers')
  const navigate = useNavigate()
  return () => {
    toast.success(t('form.saved'))
    void navigate('/suppliers')
  }
}

function CreateSupplier() {
  const { t } = useTranslation('suppliers')
  const create = useCreateSupplier()
  const onSaved = useSaved()
  return (
    <>
      <PageHeader title={t('form.newTitle')} />
      <SupplierForm
        defaultValues={supplierFormDefaults}
        submitting={create.isPending}
        onSubmit={async (values: SupplierFormValues) => {
          await create.mutateAsync(toSupplierRequest(values, null))
        }}
        onSaved={onSaved}
      />
    </>
  )
}

function EditSupplier({ id }: { id: number }) {
  const { t } = useTranslation('suppliers')
  const { data: supplier, isPending, isFetching, error, refetch } = useSupplier(id)
  // Bumped after a manual reload so the form remounts with the server data.
  const [reloads, setReloads] = useState(0)

  // Until this mount's first fetch completes, cached data may be stale; the form snapshots whatever it first sees.
  const [ready, setReady] = useState(false)
  if (!ready && supplier && !isFetching) setReady(true)

  if (isPending || (!ready && isFetching && !error)) {
    return (
      <>
        <PageHeader title={t('form.editTitle')} />
        <div className="flex max-w-4xl flex-col gap-4" data-testid="supplier-form-skeleton">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </>
    )
  }

  if (error || !supplier) {
    const notFound = isApiError(error) && error.status === 404
    return (
      <>
        <PageHeader title={t('form.editTitle')} />
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>{notFound ? t('form.notFound') : t('list.error')}</AlertTitle>
          <AlertDescription>
            <Link to="/suppliers" className="underline">
              {t('form.backToSuppliers')}
            </Link>
          </AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t('form.editTitle')} />
      <EditForm
        key={reloads}
        supplier={supplier}
        id={id}
        onReload={() => void refetch().then(() => setReloads((count) => count + 1))}
      />
    </>
  )
}

/** Freezes the field values and their version together at mount, so a background refetch can't pair old values with a newer version. */
function EditForm({ supplier, id, onReload }: { supplier: Supplier; id: number; onReload: () => void }) {
  const update = useUpdateSupplier(id)
  const onSaved = useSaved()
  const [snapshot] = useState(() => ({ values: toSupplierFormValues(supplier), version: supplier.version }))
  return (
    <SupplierForm
      defaultValues={snapshot.values}
      submitting={update.isPending}
      onSubmit={async (values: SupplierFormValues) => {
        await update.mutateAsync(toSupplierRequest(values, snapshot.version))
      }}
      onSaved={onSaved}
      onReload={onReload}
    />
  )
}

export function SupplierFormPage() {
  const { id } = useParams()
  if (id === undefined) return <CreateSupplier />
  const numericId = Number(id)
  // Non-numeric ids fall into the same "not found" state as a 404.
  return Number.isInteger(numericId) ? <EditSupplier id={numericId} /> : <EditSupplier id={-1} />
}
