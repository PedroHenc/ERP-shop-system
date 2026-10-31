import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useCan } from '@/app/auth/permissions'
import { useCurrency } from '@/app/currency-provider'
import { RiArrowLeftRightLine } from '@remixicon/react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductFormValues } from '@/features/products/schema'
import { ProgressBar } from '@/shared/components/ProgressBar'
import { RecordMeta } from '@/shared/forms/RecordMeta'
import { MarginBadge, marginOf } from '../margin'
import { SwitchField } from './ProductFormSections'

function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

interface ProductSummaryProps {
  form: UseFormReturn<ProductFormValues>
  createdDate?: string
  lastModifiedDate?: string
  /** Edit only: the stock from the server, which replaces the form's initial-stock field. */
  currentStock?: number
  onMoveStock?: () => void
}

export function ProductSummary({ form, createdDate, lastModifiedDate, currentStock, onMoveStock }: ProductSummaryProps) {
  const { t, i18n } = useTranslation('products')
  const { t: tc } = useTranslation()
  const { formatMoney } = useCurrency()
  const quantity = useMemo(() => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 }), [i18n.language])
  const [price, costText, stockText, minimumText, reorderText, unit] = useWatch({
    control: form.control,
    name: ['price', 'costPrice', 'stockQuantity', 'minimumStock', 'reorderPoint', 'unitOfMeasure'],
  })
  const canSeeCost = useCan('products.write')
  const cost = costText.trim() === '' ? null : toNumber(costText)
  const stock = currentStock ?? toNumber(stockText)
  const minimum = toNumber(minimumText)
  const level = Math.max(minimum, toNumber(reorderText))
  const out = stock <= 0
  const low = !out && stock <= minimum
  const fill = level > 0 ? stock / level : out ? 0 : 1
  const tone = out ? 'destructive' : low ? 'warning' : 'success'
  const unitLabel = t(`units.${unit}`)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tc('form.summary')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <SwitchField form={form} name="active" />
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">{t('form.summary.price')}</span>
          <span className="text-xl font-extrabold tracking-[-0.01em] tabular-nums">{formatMoney(toNumber(price))}</span>
        </div>
        {canSeeCost && cost !== null ? (
          <div className="-mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {t('form.summary.cost')} {formatMoney(cost)}
            </span>
            <span className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{t('form.summary.margin')}</span>
              <MarginBadge margin={marginOf(toNumber(price), cost)} />
            </span>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t('form.summary.stock')}</span>
            <span className="flex items-center gap-2 text-sm font-medium tabular-nums">
              {out ? <Badge variant="destructive">{t('list.outOfStock')}</Badge> : null}
              {low ? <Badge variant="warning">{t('list.lowStock')}</Badge> : null}
              {quantity.format(stock)} {unitLabel}
            </span>
          </div>
          <ProgressBar value={fill} tone={tone} label={t('form.summary.stock')} />
          <p className="text-xs text-muted-foreground">{t('form.summary.of', { level: quantity.format(level), unit: unitLabel })}</p>
          {onMoveStock ? (
            // type="button": this sits inside the product form and must not submit it.
            <Button type="button" variant="outline" size="sm" className="mt-1 self-start" onClick={onMoveStock}>
              <RiArrowLeftRightLine data-icon="inline-start" />
              {t('history.move', { ns: 'stock' })}
            </Button>
          ) : null}
        </div>
        <RecordMeta createdDate={createdDate} lastModifiedDate={lastModifiedDate} />
      </CardContent>
    </Card>
  )
}
