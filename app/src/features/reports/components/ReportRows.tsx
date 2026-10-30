import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCurrency } from '@/app/currency-provider'
import { useFormatQuantity } from '@/features/stock/format'
import { ProgressBar } from '@/shared/components/ProgressBar'
import type { ProductAmount } from '../types'

/** Ranked products: name and SKU, the quantity moved, and the value with a bar against the largest. */
export function ProductRanking({ rows, empty }: { rows: ProductAmount[]; empty: string }) {
  const { formatMoney } = useCurrency()
  const format = useFormatQuantity()
  if (rows.length === 0) return <p className="text-muted-foreground px-3 pb-2 text-sm">{empty}</p>
  const top = Math.max(...rows.map((row) => row.value), 0)
  return (
    <ol className="flex flex-col gap-1">
      {rows.map((row, index) => (
        <li key={row.productId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-2xl px-3 py-2.5">
          <span className="text-muted-foreground text-[13px] font-semibold tabular-nums">{index + 1}</span>
          <span className="flex min-w-0 flex-col">
            <Link to={`/products/${row.productId}/edit`} className="truncate font-bold hover:underline">
              {row.name}
            </Link>
            <span className="text-muted-foreground text-xs">
              {row.sku} · {format(row.quantity, row.unitOfMeasure)}
            </span>
          </span>
          <span className="font-extrabold tabular-nums">{formatMoney(row.value)}</span>
          <ProgressBar value={top > 0 ? row.value / top : 0} tone="foreground" className="col-start-2 col-end-4 h-1.5" />
        </li>
      ))}
    </ol>
  )
}

/** Today's stock value per category, each with its share of the total. */
export function CategoryShares({ rows, empty }: { rows: { category: string; products: number; value: number }[]; empty: string }) {
  const { i18n } = useTranslation()
  const { formatMoney } = useCurrency()
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">{empty}</p>
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  const percent = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 1 })
  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row) => (
        <li key={row.category} className="flex flex-col gap-2">
          <span className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-semibold">{row.category}</span>
            <span className="flex items-baseline gap-2 tabular-nums">
              <span className="text-muted-foreground text-xs">{total > 0 ? percent.format(row.value / total) : '—'}</span>
              <span className="font-extrabold">{formatMoney(row.value)}</span>
            </span>
          </span>
          <ProgressBar value={total > 0 ? row.value / total : 0} tone="primary" />
        </li>
      ))}
    </ul>
  )
}
