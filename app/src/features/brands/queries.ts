import { useQuery } from '@tanstack/react-query'
import { fetchBrands } from './api'

export const brandKeys = {
  all: ['brands'] as const,
}

export function useBrands() {
  return useQuery({
    queryKey: brandKeys.all,
    queryFn: ({ signal }) => fetchBrands(signal),
    staleTime: 5 * 60_000,
  })
}
