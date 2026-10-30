import { RiArrowDownLine, RiArrowUpLine, RiEqualizerLine, RiInboxArchiveLine } from '@remixicon/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { placeholderKeys } from '@/shared/list/placeholder-keys'
import { NUDGE_ON_HOVER } from '@/shared/motion/presets'
import { useFormatQuantity } from '../format'
import type { StockMovement, StockMovementType } from '../types'

const ICONS: Record<StockMovementType, { icon: typeof RiArrowDownLine; className: string }> = {
  INITIAL: { icon: RiInboxArchiveLine, className: 'bg-muted text-foreground' },
  ENTRY: { icon: RiArrowDownLine, className: 'bg-success-soft text-success-foreground' },
  EXIT: { icon: RiArrowUpLine, className: 'bg-destructive/10 text-destructive' },
  ADJUSTMENT: { icon: RiEqualizerLine, className: 'bg-warning-soft text-warning-foreground' },
}

interface MovementListProps {
  movements: StockMovement[]
  /** True on the first load, before any data exists. */
  loading: boolean
  /** Show and link the product of each row (the store-wide list); off inside a product's own history. */
  showProduct?: boolean
  skeletonRows?: number
}

/** Stock movements as the design's list rows: type icon, what and why, signed quantity and balance. */
export function MovementList({ movements, loading, showProduct = true, skeletonRows = 6 }: MovementListProps) {
  const { t, i18n } = useTranslation('stock')
  const format = useFormatQuantity()
  const date = useMemo(
    () => new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }),
    [i18n.language],
  )

  if (loading) {
    return (
      <ul className="flex flex-col gap-1" aria-hidden="true">
        {placeholderKeys(skeletonRows).map((key) => (
          <li key={key} className="grid grid-cols-[auto_1fr_auto] items-center gap-3.5 px-3 py-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16" />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="flex flex-col gap-1" aria-label={t('list.label')}>
      {movements.map((movement) => {
        const { icon: Icon, className } = ICONS[movement.type]
        const author = movement.createdByName ? t('list.by', { name: movement.createdByName }) : t('list.automatic')
        return (
          <li
            key={movement.id}
            className={cn('hover:bg-muted/60 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl px-3 py-3', NUDGE_ON_HOVER)}
          >
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', className)} aria-hidden="true">
              <Icon className="size-5" />
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-bold">
                {showProduct ? (
                  <Link to={`/products/${movement.productId}/edit`} className="hover:underline">
                    {movement.productName}
                  </Link>
                ) : (
                  t(`types.${movement.type}`)
                )}
                {showProduct ? <span className="text-muted-foreground ml-2 text-xs font-medium">{movement.productSku}</span> : null}
              </span>
              <span className="text-muted-foreground line-clamp-2 text-[13px] sm:line-clamp-1">
                {[
                  showProduct ? t(`types.${movement.type}`) : null,
                  // The initial movement's only reason repeats its type.
                  movement.type === 'INITIAL' ? null : t(`reasons.${movement.reason}`),
                  author,
                ]
                  .filter(Boolean)
                  .join(' · ')}{' '}
                · <time dateTime={movement.createdAt}>{date.format(new Date(movement.createdAt))}</time>
              </span>
              {movement.note ? <span className="text-muted-foreground truncate text-xs italic">{movement.note}</span> : null}
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              <span
                className={cn(
                  'font-extrabold whitespace-nowrap tabular-nums',
                  movement.quantity > 0 ? 'text-success-foreground' : movement.quantity < 0 ? 'text-destructive' : '',
                )}
              >
                {format(movement.quantity, movement.unitOfMeasure, { signed: true })}
              </span>
              <span className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
                {t('list.balance', { value: format(movement.balanceAfter, movement.unitOfMeasure) })}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
