import { useQuery } from '@tanstack/react-query'
import { fetchDashboardSummary } from './api'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: ['dashboard', 'summary'] as const,
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary,
    queryFn: ({ signal }) => fetchDashboardSummary(signal),
    staleTime: 30_000,
  })
}
