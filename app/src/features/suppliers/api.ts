import { request } from '@/shared/api/http'
import type { Supplier, SupplierListParams, SupplierPage, SupplierRequest } from './types'

export function fetchSuppliersPage(params: SupplierListParams, signal?: AbortSignal): Promise<SupplierPage> {
  return request<SupplierPage>('/suppliers/page', { query: { ...params }, signal })
}

export function fetchSupplier(id: number, signal?: AbortSignal): Promise<Supplier> {
  return request<Supplier>(`/suppliers/${id}`, { signal })
}

export function createSupplier(body: SupplierRequest): Promise<Supplier> {
  return request<Supplier>('/suppliers', { method: 'POST', body })
}

export function updateSupplier(id: number, body: SupplierRequest): Promise<Supplier> {
  return request<Supplier>(`/suppliers/${id}`, { method: 'PUT', body })
}

export function setSupplierStatus(id: number, active: boolean): Promise<Supplier> {
  return request<Supplier>(`/suppliers/${id}/status`, { method: 'PATCH', body: { active } })
}
