import { request } from '@/shared/api/http'
import type { Store, StoreRequest } from './types'

export function fetchStore(signal?: AbortSignal): Promise<Store> {
  return request<Store>('/store', { signal })
}

export function updateStore(body: StoreRequest): Promise<Store> {
  return request<Store>('/store', { method: 'PUT', body })
}
