import type { Supplier } from '@/features/suppliers/types'
import { request } from '@/shared/api/http'
import type {
  PurchaseOrder,
  PurchaseOrderPage,
  PurchaseOrderQuery,
  PurchaseOrderRequest,
  ReceiveRequest,
  ReorderSuggestion,
} from './types'

export function fetchPurchaseOrders(query: PurchaseOrderQuery, signal?: AbortSignal): Promise<PurchaseOrderPage> {
  return request<PurchaseOrderPage>('/purchase-orders/page', { query: { ...query }, signal })
}

export function fetchPurchaseOrder(id: number, signal?: AbortSignal): Promise<PurchaseOrder> {
  return request<PurchaseOrder>(`/purchase-orders/${id}`, { signal })
}

export function fetchReorderSuggestions(signal?: AbortSignal): Promise<ReorderSuggestion[]> {
  return request<ReorderSuggestion[]>('/purchase-orders/suggestions', { signal })
}

export function createPurchaseOrder(body: PurchaseOrderRequest): Promise<PurchaseOrder> {
  return request<PurchaseOrder>('/purchase-orders', { method: 'POST', body })
}

export function updatePurchaseOrder(id: number, body: PurchaseOrderRequest): Promise<PurchaseOrder> {
  return request<PurchaseOrder>(`/purchase-orders/${id}`, { method: 'PUT', body })
}

export function sendPurchaseOrder(id: number): Promise<PurchaseOrder> {
  return request<PurchaseOrder>(`/purchase-orders/${id}/send`, { method: 'POST' })
}

export function cancelPurchaseOrder(id: number): Promise<PurchaseOrder> {
  return request<PurchaseOrder>(`/purchase-orders/${id}/cancel`, { method: 'POST' })
}

export function receivePurchaseOrder(id: number, body: ReceiveRequest): Promise<PurchaseOrder> {
  return request<PurchaseOrder>(`/purchase-orders/${id}/receive`, { method: 'POST', body })
}

/** Active suppliers to order from, by name. */
export function fetchActiveSuppliers(signal?: AbortSignal): Promise<{ content: Supplier[] }> {
  return request<{ content: Supplier[] }>('/suppliers/page', {
    query: { active: true, page: 0, size: 100, sortBy: 'legalName', direction: 'ASC' },
    signal,
  })
}
