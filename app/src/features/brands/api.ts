import { request } from '@/shared/api/http'
import type { Brand, BrandDetail, BrandListParams, BrandPage, BrandRequest } from './types'

export function fetchBrands(signal?: AbortSignal): Promise<Brand[]> {
  return request<Brand[]>('/brands', { signal })
}

export function fetchBrandsPage(params: BrandListParams, signal?: AbortSignal): Promise<BrandPage> {
  return request<BrandPage>('/brands/page', { query: { ...params }, signal })
}

export function fetchBrand(id: number, signal?: AbortSignal): Promise<BrandDetail> {
  return request<BrandDetail>(`/brands/${id}`, { signal })
}

export function createBrand(body: BrandRequest): Promise<BrandDetail> {
  return request<BrandDetail>('/brands', { method: 'POST', body })
}

export function updateBrand(id: number, body: BrandRequest): Promise<BrandDetail> {
  return request<BrandDetail>(`/brands/${id}`, { method: 'PUT', body })
}

export function setBrandStatus(id: number, active: boolean): Promise<BrandDetail> {
  return request<BrandDetail>(`/brands/${id}/status`, { method: 'PATCH', body: { active } })
}
