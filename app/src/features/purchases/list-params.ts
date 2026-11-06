import { PAGE_SIZES, createListParams } from '@/shared/list/list-params'
import { PURCHASE_STATUSES, type PurchaseOrderQuery, type PurchaseStatus } from './types'

export { PAGE_SIZES }

/** Always newest first: the single sort field only satisfies the shared list helpers. */
export const purchaseListParams = createListParams({
  sortFields: ['createdAt'],
  defaultSort: 'createdAt',
  filters: { status: 'text' },
})

export type PurchaseListParams = typeof purchaseListParams.defaults

export function toPurchaseStatus(value: string | undefined): PurchaseStatus | undefined {
  return (PURCHASE_STATUSES as readonly string[]).includes(value ?? '') ? (value as PurchaseStatus) : undefined
}

export function toPurchaseQuery(params: PurchaseListParams): PurchaseOrderQuery {
  return { page: params.page, size: params.size, status: toPurchaseStatus(params.status) }
}
