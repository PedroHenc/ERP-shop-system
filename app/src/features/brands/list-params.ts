import { PAGE_SIZES, createListParams } from '@/shared/list/list-params'

export { PAGE_SIZES }

export const brandListParams = createListParams({
  sortFields: ['name', 'active'],
  defaultSort: 'name',
  filters: { name: 'text', active: 'boolean' },
})

export type BrandListParams = typeof brandListParams.defaults
export type BrandSortField = BrandListParams['sortBy']
