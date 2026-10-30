import { request } from '@/shared/api/http'
import type { Product } from '@/features/products/types'
import type { Sale, SaleRequest } from './types'

export function createSale(body: SaleRequest): Promise<Sale> {
  return request<Sale>('/sales', { method: 'POST', body })
}

export interface ProductSearchPage {
  content: Product[]
  totalElements: number
}

/** Active products whose name or SKU contains the term, or whose barcode is exactly it. */
export function searchProducts(term: string, signal?: AbortSignal): Promise<ProductSearchPage> {
  return request<ProductSearchPage>('/products/page', {
    query: { search: term, active: true, page: 0, size: 8, sortBy: 'name', direction: 'ASC' },
    signal,
  })
}
