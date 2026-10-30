import { RiBarcodeLine, RiSearchLine } from '@remixicon/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { type Ref, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/app/currency-provider'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { Product } from '@/features/products/types'
import { useFormatQuantity } from '@/features/stock/format'
import { cn } from '@/lib/utils'
import { NUDGE_ON_HOVER } from '@/shared/motion/presets'
import { searchProducts } from '../api'

const DEBOUNCE_MS = 200

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value])
  return debounced
}

/** A scanned barcode or a typed SKU should win over name matches. */
function bestMatch(products: Product[], term: string): Product | undefined {
  const exact = products.find((p) => p.barcode === term || p.sku.toLowerCase() === term.toLowerCase())
  return exact ?? products[0]
}

interface ProductSearchProps {
  onPick: (product: Product) => void
  /** The search box, so the page can put the focus back after each sale. */
  inputRef?: Ref<HTMLInputElement>
}

/**
 * The point of sale's search: results while typing, and Enter adds the best match right away, which is
 * also how a barcode reader (a keyboard that types the code and presses Enter) adds products.
 */
export function ProductSearch({ onPick, inputRef }: ProductSearchProps) {
  const { t } = useTranslation('sales')
  const { formatMoney } = useCurrency()
  const format = useFormatQuantity()
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')
  const debounced = useDebounced(term.trim())
  const { data, isFetching, isError } = useQuery({
    queryKey: ['products', 'pos-search', debounced],
    queryFn: ({ signal }) => searchProducts(debounced, signal),
    enabled: debounced.length > 0,
    staleTime: 15_000,
  })
  const results = debounced.length > 0 ? (data?.content ?? []) : []

  function pick(product: Product) {
    onPick(product)
    setTerm('')
  }

  async function pickBest() {
    const current = term.trim()
    if (!current) return
    // Scanners press Enter before the debounce fires: search the exact text now.
    const page = await queryClient.fetchQuery({
      queryKey: ['products', 'pos-search', current],
      queryFn: ({ signal }) => searchProducts(current, signal),
      staleTime: 15_000,
    })
    const product = bestMatch(page.content, current)
    if (product) pick(product)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <RiSearchLine className="text-muted-foreground pointer-events-none absolute inset-y-0 left-5 my-auto size-5" aria-hidden="true" />
        <Input
          ref={inputRef}
          type="search"
          autoFocus
          autoComplete="off"
          aria-label={t('pos.search')}
          aria-describedby="pos-search-hint"
          placeholder={t('pos.search')}
          className="bg-card h-14 rounded-full border-2 pr-14 pl-13 text-base shadow-[var(--shadow-card)]"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void pickBest()
            } else if (event.key === 'Escape') {
              setTerm('')
            }
          }}
        />
        <RiBarcodeLine className="text-muted-foreground pointer-events-none absolute inset-y-0 right-5 my-auto size-5" aria-hidden="true" />
      </div>
      <p id="pos-search-hint" className="text-muted-foreground -mt-2 px-5 text-xs">
        {t('pos.searchHint')}
      </p>

      {debounced.length === 0 ? (
        <p className="text-muted-foreground px-5 py-6 text-sm">{t('pos.start')}</p>
      ) : isError ? (
        <p role="alert" className="text-destructive px-5 py-6 text-sm">
          {t('pos.searchError')}
        </p>
      ) : isFetching && results.length === 0 ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-muted-foreground px-5 py-6 text-sm">{t('pos.noResults', { term: debounced })}</p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label={t('pos.search')}>
          {results.map((product) => {
            const out = product.stockQuantity <= 0 && !product.allowNegativeStock
            return (
              <li key={product.id}>
                <button
                  type="button"
                  aria-label={t('pos.add', { name: product.name })}
                  onClick={() => pick(product)}
                  className={cn(
                    'hover:bg-card focus-visible:bg-card grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    NUDGE_ON_HOVER,
                    out && 'opacity-55',
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-bold">{product.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {product.sku}
                      {product.barcode ? ` · ${product.barcode}` : ''} ·{' '}
                      <span className={cn(out && 'text-destructive font-semibold')}>
                        {t('pos.inStock', { value: format(product.stockQuantity, product.unitOfMeasure) })}
                      </span>
                    </span>
                  </span>
                  <span className="font-extrabold tabular-nums">{formatMoney(product.price)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
