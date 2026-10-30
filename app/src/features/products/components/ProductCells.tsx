import { RiMore2Line } from '@remixicon/react'
import { useMemo, useState } from 'react'
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
import { StockMovementDialog } from '@/features/stock/components/StockMovementDialog'
import { cn } from '@/lib/utils'

/** Quantity with unit plus the low / out of stock badge, shared by the table and the cards. */
export function StockCell({ product }: { product: Product }) {
  const { t, i18n } = useTranslation('products')
  const quantity = useMemo(() => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 }), [i18n.language])
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

/** The Edit / Move stock / Delete menu; renders nothing without write access. Owns the movement dialog. */
export function ProductRowActions({ product, onDelete, className }: ProductRowActionsProps) {
  const { t } = useTranslation('products')
  const canWrite = useCan('products.write')
  const canMoveStock = useCan('stock.move')
  const [moving, setMoving] = useState(false)
  if (!canWrite) return null
  return (
    // Only keeps the menu's clicks from also opening the row; the menu trigger itself is a keyboard-accessible button.
    // biome-ignore lint/a11y/noStaticElementInteractions: see above
    // biome-ignore lint/a11y/useKeyWithClickEvents: see above
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
          {canMoveStock ? (
            <DropdownMenuItem onSelect={() => setMoving(true)}>{t('history.move', { ns: 'stock' })}</DropdownMenuItem>
          ) : null}
          <DropdownMenuItem variant="destructive" onSelect={() => onDelete(product)}>
            {t('actions.delete', { ns: 'common' })}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <StockMovementDialog product={moving ? product : null} onOpenChange={setMoving} />
    </div>
  )
}
