import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductForm } from '@/features/products/components/ProductForm'
import { useCreateProduct, useProduct, useUpdateProduct } from '@/features/products/queries'
import { productFormDefaults, toProductFormValues, toProductRequest } from '@/features/products/schema'
import type { ProductFormValues } from '@/features/products/schema'
import { isApiError } from '@/shared/api/http'
import { PageHeader } from '@/shared/components/PageHeader'

function useSaved() {
  const { t } = useTranslation('products')
  const navigate = useNavigate()
  return () => {
    toast.success(t('form.saved'))
    void navigate('/products')
  }
}

function CreateProduct() {
  const { t } = useTranslation('products')
  const create = useCreateProduct()
  const onSaved = useSaved()
  return (
    <>
      <PageHeader title={t('form.newTitle')} />
      <ProductForm
        defaultValues={productFormDefaults}
        submitting={create.isPending}
        onSubmit={async (values: ProductFormValues) => {
          await create.mutateAsync(toProductRequest(values, null))
        }}
        onSaved={onSaved}
      />
    </>
  )
}

function EditProduct({ id }: { id: number }) {
  const { t } = useTranslation('products')
  const { data: product, isPending, error, refetch } = useProduct(id)
  const update = useUpdateProduct(id)
  const onSaved = useSaved()
  // Bumped after a manual reload so the form remounts with the server data.
  const [reloads, setReloads] = useState(0)

  if (isPending) {
    return (
      <>
        <PageHeader title={t('form.editTitle')} />
        <div className="flex max-w-4xl flex-col gap-4" data-testid="product-form-skeleton">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </>
    )
  }

  if (error || !product) {
    const notFound = isApiError(error) && error.status === 404
    return (
      <>
        <PageHeader title={t('form.editTitle')} />
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>{notFound ? t('form.notFound') : t('list.error')}</AlertTitle>
          <AlertDescription>
            <Link to="/products" className="underline">
              {t('form.backToProducts')}
            </Link>
          </AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader title={t('form.editTitle')} />
      <ProductForm
        key={reloads}
        defaultValues={toProductFormValues(product)}
        submitting={update.isPending}
        onSubmit={async (values: ProductFormValues) => {
          await update.mutateAsync(toProductRequest(values, product.version))
        }}
        onSaved={onSaved}
        onReload={() => void refetch().then(() => setReloads((count) => count + 1))}
      />
    </>
  )
}

export function ProductFormPage() {
  const { id } = useParams()
  if (id === undefined) return <CreateProduct />
  const numericId = Number(id)
  // Non-numeric ids fall into the same "not found" state as a 404.
  return Number.isInteger(numericId) ? <EditProduct id={numericId} /> : <EditProduct id={-1} />
}
