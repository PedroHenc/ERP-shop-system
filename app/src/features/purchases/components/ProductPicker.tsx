import { RiSearchLine } from '@remixicon/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/app/currency-provider'
import { Input } from '@/components/ui/input'
import type { Product } from '@/features/products/types'
import { searchProducts } from '@/features/sales/api'
import { useFormatQuantity } from '@/features/stock/format'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 200

/**
 * Adds products to an order: results while typing (name, SKU or exact barcode), Enter takes the best
 * match, so a barcode reader works too. Each result shows the stock and the current cost.
 */
export function ProductPicker({ onPick, exclude }: { onPick: (product: Product) => void; exclude: ReadonlySet<number> }) {
  const { t } = useTranslation('purchases')
  const { formatMoney } = useCurrency()
  const format = useFormatQuantity()
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term])
  const { data } = useQuery({
    queryKey: ['products', 'pos-search', debounced],
    queryFn: ({ signal }) => searchProducts(debounced, signal),
    enabled: debounced.length > 0,
    staleTime: 15_000,
  })
  const results = debounced.length > 0 && term.trim().length > 0 ? (data?.content ?? []) : []

  function pick(product: Product) {
    onPick(product)
    setTerm('')
    setDebounced('')
  }

  async function pickBest() {
    const current = term.trim()
    if (!current) return
    const page = await queryClient.fetchQuery({
      queryKey: ['products', 'pos-search', current],
      queryFn: ({ signal }) => searchProducts(current, signal),
      staleTime: 15_000,
    })
    const exact = page.content.find((p) => p.barcode === current || p.sku.toLowerCase() === current.toLowerCase())
    const best = exact ?? page.content[0]
    if (best) pick(best)
  }

  return (
    <div className="relative">
      <RiSearchLine className="text-muted-foreground pointer-events-none absolute inset-y-0 left-4 my-auto size-4" aria-hidden="true" />
      <Input
        type="search"
        autoComplete="off"
        aria-label={t('form.addProduct')}
        placeholder={t('form.addProduct')}
        className="h-11 rounded-full pl-10"
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
      {results.length > 0 ? (
        <ul
          aria-label={t('form.results')}
          className="bg-popover absolute inset-x-0 top-full z-20 mt-2 flex max-h-80 flex-col gap-0.5 overflow-y-auto rounded-2xl p-1.5 shadow-lg ring-1 ring-foreground/10"
        >
          {results.map((product) => {
            const added = exclude.has(product.id)
            return (
              <li key={product.id}>
                <button
                  type="button"
                  disabled={added}
                  aria-label={t('form.add', { name: product.name })}
                  onClick={() => pick(product)}
                  className={cn(
                    'hover:bg-muted focus-visible:bg-muted grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 text-left outline-none disabled:opacity-50',
                  )}
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-semibold">{product.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {product.sku} · {t('form.inStock', { value: format(product.stockQuantity, product.unitOfMeasure) })}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                    {added ? t('form.alreadyAdded') : product.costPrice === null ? t('form.noCost') : t('form.cost', { value: formatMoney(product.costPrice) })}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
