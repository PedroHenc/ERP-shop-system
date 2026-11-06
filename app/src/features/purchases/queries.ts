import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from '@/features/dashboard/queries'
import { productKeys } from '@/features/products/queries'
import { stockKeys } from '@/features/stock/queries'
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  fetchActiveSuppliers,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
  fetchReorderSuggestions,
  receivePurchaseOrder,
  sendPurchaseOrder,
  updatePurchaseOrder,
} from './api'
import type { PurchaseOrder, PurchaseOrderQuery, PurchaseOrderRequest, ReceiveRequest } from './types'

export const purchaseKeys = {
  all: ['purchase-orders'] as const,
  list: (query: PurchaseOrderQuery) => [...purchaseKeys.all, 'list', query] as const,
  detail: (id: number) => [...purchaseKeys.all, 'detail', id] as const,
  suggestions: () => [...purchaseKeys.all, 'suggestions'] as const,
}

export function usePurchaseOrders(query: PurchaseOrderQuery) {
  return useQuery({
    queryKey: purchaseKeys.list(query),
    queryFn: ({ signal }) => fetchPurchaseOrders(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function usePurchaseOrder(id: number | null) {
  return useQuery({
    queryKey: purchaseKeys.detail(id ?? 0),
    queryFn: ({ signal }) => fetchPurchaseOrder(id as number, signal),
    enabled: id !== null,
  })
}

export function useReorderSuggestions() {
  return useQuery({ queryKey: purchaseKeys.suggestions(), queryFn: ({ signal }) => fetchReorderSuggestions(signal) })
}

export function useActiveSuppliers() {
  return useQuery({
    queryKey: ['suppliers', 'active-options'],
    queryFn: ({ signal }) => fetchActiveSuppliers(signal),
    select: (page) => page.content,
    staleTime: 60_000,
  })
}

/** Every change refreshes the orders; receiving also refreshes products (stock, cost) and the dashboard. */
function useOrderMutation<T>(fn: (variables: T) => Promise<PurchaseOrder>, touchesStock = false) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (order) => {
      queryClient.setQueryData(purchaseKeys.detail(order.id), order)
      const refreshes = [queryClient.invalidateQueries({ queryKey: purchaseKeys.all })]
      if (touchesStock) {
        refreshes.push(
          queryClient.invalidateQueries({ queryKey: productKeys.all }),
          queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
          queryClient.invalidateQueries({ queryKey: stockKeys.all }),
        )
      }
      return Promise.all(refreshes)
    },
  })
}

export function useSavePurchaseOrder(id: number | null) {
  return useOrderMutation((body: PurchaseOrderRequest) => (id === null ? createPurchaseOrder(body) : updatePurchaseOrder(id, body)))
}

export function useSendPurchaseOrder() {
  return useOrderMutation((id: number) => sendPurchaseOrder(id))
}

export function useCancelPurchaseOrder() {
  return useOrderMutation((id: number) => cancelPurchaseOrder(id))
}

export function useReceivePurchaseOrder(id: number) {
  return useOrderMutation((body: ReceiveRequest) => receivePurchaseOrder(id, body), true)
}
