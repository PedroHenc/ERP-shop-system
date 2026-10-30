import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from '@/features/dashboard/queries'
import { productKeys } from '@/features/products/queries'
import { reportKeys } from '@/features/reports/queries'
import { stockKeys } from '@/features/stock/queries'
import { cancelSale, createSale, fetchSale, fetchSalesPage, fetchSalesSummary } from './api'
import type { SaleQuery, SaleRequest } from './types'

export const saleKeys = {
  all: ['sales'] as const,
  list: (query: SaleQuery) => [...saleKeys.all, 'list', query] as const,
  detail: (id: number) => [...saleKeys.all, 'detail', id] as const,
  summary: (range: { from: string; to: string }) => [...saleKeys.all, 'summary', range] as const,
}

export function useSalesPage(query: SaleQuery) {
  return useQuery({
    queryKey: saleKeys.list(query),
    queryFn: ({ signal }) => fetchSalesPage(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function useSale(id: number | null) {
  return useQuery({
    queryKey: saleKeys.detail(id ?? -1),
    queryFn: ({ signal }) => fetchSale(id as number, signal),
    enabled: id !== null,
  })
}

export function useSalesSummary(range: { from: string; to: string }, enabled = true) {
  return useQuery({
    queryKey: saleKeys.summary(range),
    queryFn: ({ signal }) => fetchSalesSummary(range, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/** A sale takes stock out: refresh everything that shows stock. */
export function useCreateSale() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaleRequest) => createSale(body),
    onSuccess: () =>
      Promise.all(
        [saleKeys.all, productKeys.all, stockKeys.all, dashboardKeys.all, reportKeys.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  })
}

/** Cancelling returns the sale's stock: the same refresh as a sale. */
export function useCancelSale(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => cancelSale(id, reason),
    onSuccess: () =>
      Promise.all(
        [saleKeys.all, productKeys.all, stockKeys.all, dashboardKeys.all, reportKeys.all].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  })
}
