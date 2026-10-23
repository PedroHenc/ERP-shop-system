import { PAGE_SIZES, createListParams } from '@/shared/list/list-params'
import type { ProductListParams, ProductSortField } from './types'

export { PAGE_SIZES }

const SORT_FIELDS: readonly ProductSortField[] = ['name', 'sku', 'price', 'category', 'active']

export const productList = createListParams({
  sortFields: SORT_FIELDS,
  defaultSort: 'name',
  filters: { name: 'text', sku: 'text', category: 'text', brandId: 'id', active: 'boolean' },
})

// The annotations below double as a compile-time check that the generic params type matches ProductListParams.
export const DEFAULT_LIST_PARAMS: ProductListParams = productList.defaults
export const parseListParams: (search: URLSearchParams) => ProductListParams = productList.parse
export const toSearchParams: (params: ProductListParams) => URLSearchParams = productList.toSearchParams
export const hasActiveFilters: (params: ProductListParams) => boolean = productList.hasActiveFilters
