import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { productKeys, useDeleteProduct } from '@/features/products/queries'
import type { Product } from '@/features/products/types'
import { isApiError } from '@/shared/api/http'

interface DeleteProductDialogProps {
  product: Product | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void
}

export function DeleteProductDialog({ product, onOpenChange, onDeleted }: DeleteProductDialogProps) {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const queryClient = useQueryClient()
  const { mutateAsync, isPending } = useDeleteProduct()

  async function confirm() {
    if (!product) return
    try {
      await mutateAsync(product.id)
      toast.success(t('delete.success'))
      onOpenChange(false)
      onDeleted()
    } catch (error) {
      if (isApiError(error) && error.status === 404) {
        toast.error(t('delete.notFound'))
        await queryClient.invalidateQueries({ queryKey: productKeys.all })
      } else if (!(isApiError(error) && error.status === 403)) {
        // A 403 already got the global permission toast.
        toast.error(tc('errors.unexpected'))
      }
      onOpenChange(false)
    }
  }

  return (
    <AlertDialog open={product !== null} onOpenChange={(open) => !isPending && onOpenChange(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('delete.description', { name: product?.name ?? '' })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{tc('actions.cancel')}</AlertDialogCancel>
          <Button variant="destructive" loading={isPending} onClick={() => void confirm()}>
            {tc('actions.delete')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
