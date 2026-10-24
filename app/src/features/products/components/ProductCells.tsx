import { RiMore2Line } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCan } from '@/app/auth/permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Product } from '@/features/products/types'
import { cn } from '@/lib/utils'

/** Quantity with unit plus the low / out of stock badge, shared by the table and the cards. */
export function StockCell({ product }: { product: Product }) {
  const { t, i18n } = useTranslation('products')
  const quantity = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 })
  return (
    <div className="flex items-center gap-2">
      <span className="tabular-nums">
        {quantity.format(product.stockQuantity)} {t(`units.${product.unitOfMeasure}`)}
      </span>
      {product.stockQuantity <= 0 ? (
        <Badge variant="destructive">{t('list.outOfStock')}</Badge>
      ) : product.stockQuantity <= product.minimumStock ? (
        <Badge variant="warning">{t('list.lowStock')}</Badge>
      ) : null}
    </div>
  )
}

interface ProductRowActionsProps {
  product: Product
  onDelete: (product: Product) => void
  className?: string
}

/** The Edit / Delete menu; renders nothing without write access. */
export function ProductRowActions({ product, onDelete, className }: ProductRowActionsProps) {
  const { t } = useTranslation('products')
  const canWrite = useCan('products.write')
  if (!canWrite) return null
  return (
    <div className="flex justify-end" onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('list.rowActions')}
            className={cn('data-[state=open]:opacity-100', className)}
          >
            <RiMore2Line />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to={`/products/${product.id}/edit`}>{t('actions.edit', { ns: 'common' })}</Link>
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(product)}>
            {t('actions.delete', { ns: 'common' })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
