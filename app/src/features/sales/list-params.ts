import { PAGE_SIZES, createListParams } from '@/shared/list/list-params'
import { saleRange, toSalePeriod } from './period'
import { PAYMENT_METHODS, type PaymentMethod, type SaleQuery, type SaleStatus } from './types'

export { PAGE_SIZES }

/** Always newest first: the single sort field only satisfies the shared list helpers. */
export const saleListParams = createListParams({
  sortFields: ['createdAt'],
  defaultSort: 'createdAt',
  filters: { period: 'text', status: 'text', paymentMethod: 'text' },
})

export type SaleListParams = typeof saleListParams.defaults

export function toStatus(value: string | undefined): SaleStatus | undefined {
  return value === 'COMPLETED' || value === 'CANCELLED' ? value : undefined
}

export function toPaymentMethod(value: string | undefined): PaymentMethod | undefined {
  return (PAYMENT_METHODS as readonly string[]).includes(value ?? '') ? (value as PaymentMethod) : undefined
}

/** URL params to the API query; the period (today by default) becomes instants of the user's days. */
export function toSaleQuery(params: SaleListParams, now = new Date()): SaleQuery {
  return {
    page: params.page,
    size: params.size,
    status: toStatus(params.status),
    paymentMethod: toPaymentMethod(params.paymentMethod),
    ...saleRange(toSalePeriod(params.period), now),
  }
}
