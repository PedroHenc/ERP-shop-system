import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/app/currency-provider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductFormValues } from '@/features/products/schema'
import { RecordMeta } from '@/shared/forms/RecordMeta'
import { SwitchField } from './ProductFormSections'

function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

interface ProductSummaryProps {
  form: UseFormReturn<ProductFormValues>
  createdDate?: string
  lastModifiedDate?: string
}

export function ProductSummary({ form, createdDate, lastModifiedDate }: ProductSummaryProps) {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const { formatMoney } = useCurrency()
  const [price, stockText, minimumText, reorderText, unit] = useWatch({
    control: form.control,
    name: ['price', 'stockQuantity', 'minimumStock', 'reorderPoint', 'unitOfMeasure'],
  })
  const stock = toNumber(stockText)
  const minimum = toNumber(minimumText)
  const level = Math.max(minimum, toNumber(reorderText))
  const out = stock <= 0
  const low = !out && stock <= minimum
  const percent = level > 0 ? Math.min(100, Math.max(0, (stock / level) * 100)) : out ? 0 : 100
  const barColor = out ? 'bg-destructive' : low ? 'bg-warning' : 'bg-success'
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
          <span className="text-lg font-semibold tabular-nums">{formatMoney(toNumber(price))}</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">{t('form.summary.stock')}</span>
            <span className="flex items-center gap-2 text-sm font-medium tabular-nums">
              {out ? <Badge variant="destructive">{t('list.outOfStock')}</Badge> : null}
              {low ? <Badge variant="warning">{t('list.lowStock')}</Badge> : null}
              {stock} {unitLabel}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label={t('form.summary.stock')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percent)}
            className="h-2 overflow-hidden rounded-full bg-muted"
          >
            <div className={`h-full rounded-full transition-[width] ${barColor}`} style={{ width: `${percent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{t('form.summary.of', { level, unit: unitLabel })}</p>
        </div>
        <RecordMeta createdDate={createdDate} lastModifiedDate={lastModifiedDate} />
      </CardContent>
    </Card>
  )
}
