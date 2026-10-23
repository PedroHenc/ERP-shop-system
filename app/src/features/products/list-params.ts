import type { ProductListParams, ProductSortField } from './types'

export const PAGE_SIZES = [10, 20, 50, 100] as const
const SORT_FIELDS: readonly ProductSortField[] = ['name', 'sku', 'price', 'category', 'active']

export const DEFAULT_LIST_PARAMS: ProductListParams = {
  page: 0,
  size: 20,
  sortBy: 'name',
  direction: 'ASC',
}

const MAX_PAGE = 2147483647 // the API binds page as a Java Integer

function parseNonNegativeInt(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined
  return Number(value)
}

function nonEmpty(value: string | null): string | undefined {
  return value === null || value === '' ? undefined : value
}

export function parseListParams(search: URLSearchParams): ProductListParams {
  const rawPage = parseNonNegativeInt(search.get('page'))
  const page = rawPage !== undefined && rawPage <= MAX_PAGE ? rawPage : DEFAULT_LIST_PARAMS.page
  const rawSize = parseNonNegativeInt(search.get('size'))
  const size = PAGE_SIZES.find((s) => s === rawSize) ?? DEFAULT_LIST_PARAMS.size
  const rawSort = search.get('sortBy')
  const sortBy = SORT_FIELDS.find((f) => f === rawSort) ?? DEFAULT_LIST_PARAMS.sortBy
  const rawDirection = search.get('direction')
  const direction = rawDirection === 'ASC' || rawDirection === 'DESC' ? rawDirection : DEFAULT_LIST_PARAMS.direction
  const rawActive = search.get('active')
  const active = rawActive === 'true' ? true : rawActive === 'false' ? false : undefined
  const rawBrandId = parseNonNegativeInt(search.get('brandId'))
  const brandId = rawBrandId !== undefined && Number.isSafeInteger(rawBrandId) && rawBrandId >= 1 ? rawBrandId : undefined

  const params: ProductListParams = { page, size, sortBy, direction }
  const name = nonEmpty(search.get('name'))
  const sku = nonEmpty(search.get('sku'))
  const category = nonEmpty(search.get('category'))
  if (name !== undefined) params.name = name
  if (sku !== undefined) params.sku = sku
  if (category !== undefined) params.category = category
  if (brandId !== undefined) params.brandId = brandId
  if (active !== undefined) params.active = active
  return params
}

export function toSearchParams(params: ProductListParams): URLSearchParams {
  const search = new URLSearchParams()
  if (params.page !== DEFAULT_LIST_PARAMS.page) search.set('page', String(params.page))
  if (params.size !== DEFAULT_LIST_PARAMS.size) search.set('size', String(params.size))
  if (params.sortBy !== DEFAULT_LIST_PARAMS.sortBy) search.set('sortBy', params.sortBy)
  if (params.direction !== DEFAULT_LIST_PARAMS.direction) search.set('direction', params.direction)
  if (params.name) search.set('name', params.name)
  if (params.sku) search.set('sku', params.sku)
  if (params.category) search.set('category', params.category)
  if (params.brandId !== undefined) search.set('brandId', String(params.brandId))
  if (params.active !== undefined) search.set('active', String(params.active))
  return search
}

export function hasActiveFilters(params: ProductListParams): boolean {
  return Boolean(
    params.name || params.sku || params.category || params.brandId !== undefined || params.active !== undefined,
  )
}
