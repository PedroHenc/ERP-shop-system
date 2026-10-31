import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { useCurrency } from '@/app/currency-provider'
import { MarginBadge, marginOf } from '@/features/products/margin'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/features/products/types'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useRowMotion } from '@/shared/list/useRowMotion'
import { ProductRowActions, StockCell } from './ProductCells'
import { placeholderKeys } from '@/shared/list/placeholder-keys'

interface ProductCardListProps {
  products: Product[]
  /** True on the first load, before any data exists. */
  loading: boolean
  onDelete: (product: Product) => void
}

const SKELETON_CARDS = 6

/** Compact (phone) rendering of the product list: one tappable card per product. */
export function ProductCardList({ products, loading, onDelete }: ProductCardListProps) {
  const cards = useRowMotion('products-cards', !loading && products.length > 0, products.length)
  const navigate = useNavigate()
  const { formatMoney } = useCurrency()

  if (loading) {
    return (
      <div className="flex flex-col divide-y" aria-hidden="true">
        {placeholderKeys(SKELETON_CARDS).map((key) => (
          <div key={key} className="flex flex-col gap-2 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y">
      {products.map((product, index) => (
        <motion.li
          {...cards.rowProps(index, String(product.id))}
          key={product.id}
          className="flex cursor-pointer flex-col gap-2 p-4 transition-colors hover:bg-muted/40"
          onClick={() => void navigate(`/products/${product.id}/edit`)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <Link
                to={`/products/${product.id}/edit`}
                className="truncate font-medium hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {product.name}
              </Link>
              <span className="text-xs text-muted-foreground">{`${product.sku} · ${product.category}`}</span>
            </div>
            <ProductRowActions product={product} onDelete={onDelete} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2">
              <span className="font-medium tabular-nums">{formatMoney(product.price)}</span>
              {product.costPrice !== null ? <MarginBadge margin={marginOf(product.price, product.costPrice)} /> : null}
            </span>
            <StockCell product={product} />
            <StatusBadge active={product.active} />
          </div>
        </motion.li>
      ))}
    </ul>
  )
}
