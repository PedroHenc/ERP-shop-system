import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from '@/features/dashboard/queries'
import { productKeys } from '@/features/products/queries'
import { fetchStockMovements, recordStockMovement } from './api'
import type { StockMovementQuery, StockMovementRequest } from './types'

export const stockKeys = {
  all: ['stock-movements'] as const,
  list: (query: StockMovementQuery) => [...stockKeys.all, 'list', query] as const,
}

export function useStockMovements(query: StockMovementQuery, enabled = true) {
  return useQuery({
    queryKey: stockKeys.list(query),
    queryFn: ({ signal }) => fetchStockMovements(query, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** A movement changes the product's stock: refresh the history, the products and the dashboard. */
export function useRecordStockMovement(productId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: StockMovementRequest) => recordStockMovement(productId, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: stockKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
  })
}
