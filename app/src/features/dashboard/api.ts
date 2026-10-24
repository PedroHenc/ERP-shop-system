import { request } from '@/shared/api/http'
import type { DashboardSummary } from './types'

export function fetchDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  return request<DashboardSummary>('/dashboard/summary', { signal })
}
