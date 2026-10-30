import { PAGE_SIZES, createListParams } from '@/shared/list/list-params'
import { MANUAL_MOVEMENT_TYPES, type ManualMovementType, type StockMovementQuery } from './types'

export { PAGE_SIZES }

export const PERIODS = ['all', 'today', '7d', '30d', '90d'] as const
export type Period = (typeof PERIODS)[number]

/** Always newest first: the single sort field only satisfies the shared list helpers. */
export const stockListParams = createListParams({
  sortFields: ['createdAt'],
  defaultSort: 'createdAt',
  filters: { type: 'text', period: 'text', productId: 'id' },
})

export type StockListParams = typeof stockListParams.defaults

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** "Last 7 days" counts today: from the local midnight 6 days ago, open-ended. */
export function periodStart(period: Period, now = new Date()): Date | undefined {
  const today = startOfDay(now)
  const back = { all: null, today: 0, '7d': 6, '30d': 29, '90d': 89 }[period]
  if (back === null) return undefined
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - back)
}

export function toPeriod(value: string | undefined): Period {
  return (PERIODS as readonly string[]).includes(value ?? '') ? (value as Period) : 'all'
}

export function toManualType(value: string | undefined): ManualMovementType | undefined {
  return (MANUAL_MOVEMENT_TYPES as readonly string[]).includes(value ?? '') ? (value as ManualMovementType) : undefined
}

/** URL params to the API query: the period becomes a `from` instant in the user's time zone. */
export function toStockQuery(params: StockListParams, now = new Date()): StockMovementQuery {
  const from = periodStart(toPeriod(params.period), now)
  return {
    page: params.page,
    size: params.size,
    productId: params.productId,
    type: toManualType(params.type),
    from: from?.toISOString(),
  }
}
