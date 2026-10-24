import { PAGE_SIZES, createListParams } from '@/shared/list/list-params'

export { PAGE_SIZES }

export const supplierListParams = createListParams({
  sortFields: ['legalName', 'tradeName', 'active'],
  defaultSort: 'legalName',
  filters: { name: 'text', taxId: 'text', active: 'boolean' },
})

export type SupplierListParams = typeof supplierListParams.defaults
export type SupplierSortField = SupplierListParams['sortBy']

/** Filters living inside the Filters popover (everything except name search and the status tabs). */
export function secondaryFilterCount(params: SupplierListParams): number {
  return [params.taxId].filter((value) => value !== undefined && value !== '').length
}
