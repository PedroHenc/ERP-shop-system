import { request } from '@/shared/http'
import type { Brand } from './types'

export function fetchBrands(signal?: AbortSignal): Promise<Brand[]> {
  return request<Brand[]>('/brands', { signal })
}
