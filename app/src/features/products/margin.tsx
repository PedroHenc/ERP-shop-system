import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

/** Below this the margin is flagged: little room for discounts, losses and fixed costs. */
export const LOW_MARGIN = 0.15

/** Profit as a share of the price ((price − cost) ÷ price), or null without a cost or a price. */
export function marginOf(price: number, cost: number | null | undefined): number | null {
  if (cost === null || cost === undefined || !(price > 0)) return null
  return (price - cost) / price
}

export function useFormatPercent() {
  const { i18n } = useTranslation()
  const format = new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 1 })
  return (value: number) => format.format(value)
}

/** A margin as a coloured badge: red when negative, amber when low, green otherwise; "—" without one. */
export function MarginBadge({ margin }: { margin: number | null }) {
  const { t } = useTranslation('products')
  const percent = useFormatPercent()
  if (margin === null) return <span className="text-muted-foreground">—</span>
  const variant = margin < 0 ? 'destructive' : margin < LOW_MARGIN ? 'warning' : 'success'
  return (
    <Badge variant={variant} className="tabular-nums" title={margin < 0 ? t('margin.negative') : margin < LOW_MARGIN ? t('margin.low') : undefined}>
      {percent(margin)}
    </Badge>
  )
}
