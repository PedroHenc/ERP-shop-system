import { RiAlarmWarningLine, RiAddLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useCan } from '@/app/auth/permissions'
import { Button } from '@/components/ui/button'
import { useFormatQuantity } from '@/features/stock/format'
import { useReorderSuggestions } from '../queries'

const SHOWN = 4

/** Products at or below their reorder point, with a shortcut to an order that brings them back up. */
export function ReorderCard() {
  const { t } = useTranslation('purchases')
  const format = useFormatQuantity()
  const canWrite = useCan('purchases.write')
  const { data: suggestions = [] } = useReorderSuggestions()
  if (suggestions.length === 0) return null
  const rest = suggestions.length - SHOWN
  return (
    <section
      aria-label={t('reorder.title', { count: suggestions.length })}
      className="bg-warning-soft mb-4 flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex min-w-0 items-start gap-3">
        <RiAlarmWarningLine className="text-warning-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-bold">{t('reorder.title', { count: suggestions.length })}</p>
          <p className="text-muted-foreground text-sm text-pretty">
            {suggestions
              .slice(0, SHOWN)
              .map((s) => t('reorder.item', { name: s.name, value: format(s.stockQuantity, s.unitOfMeasure) }))
              .join(' · ')}
            {rest > 0 ? ` · ${t('reorder.more', { count: rest })}` : ''}
          </p>
        </div>
      </div>
      {canWrite ? (
        <Button asChild className="shrink-0 self-start sm:self-center">
          <Link to="/purchases/new?reorder=1">
            <RiAddLine data-icon="inline-start" />
            {t('reorder.create')}
          </Link>
        </Button>
      ) : null}
    </section>
  )
}
