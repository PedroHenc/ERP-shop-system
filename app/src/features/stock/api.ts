import { request } from '@/shared/api/http'
import type { StockMovement, StockMovementPage, StockMovementQuery, StockMovementRequest } from './types'

export function fetchStockMovements(query: StockMovementQuery, signal?: AbortSignal): Promise<StockMovementPage> {
  return request<StockMovementPage>('/stock-movements/page', { query: { ...query }, signal })
}

export function recordStockMovement(productId: number, body: StockMovementRequest): Promise<StockMovement> {
  return request<StockMovement>(`/products/${productId}/stock-movements`, { method: 'POST', body })
}
