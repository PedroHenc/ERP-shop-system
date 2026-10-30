import { request } from '@/shared/api/http'
import type { Product } from '@/features/products/types'
import type { Sale, SalePage, SaleQuery, SaleRequest, SalesTotals } from './types'

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

export function fetchSalesPage(query: SaleQuery, signal?: AbortSignal): Promise<SalePage> {
  return request<SalePage>('/sales/page', { query: { ...query }, signal })
}

export function fetchSale(id: number, signal?: AbortSignal): Promise<Sale> {
  return request<Sale>(`/sales/${id}`, { signal })
}

export function cancelSale(id: number, reason: string): Promise<Sale> {
  return request<Sale>(`/sales/${id}/cancel`, { method: 'POST', body: { reason } })
}

export function fetchSalesSummary(range: { from: string; to: string }, signal?: AbortSignal): Promise<SalesTotals> {
  return request<SalesTotals>('/sales/summary', { query: { ...range }, signal })
}
