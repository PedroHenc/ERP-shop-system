import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboardKeys } from '@/features/dashboard/queries'
import {
  createSupplier,
  fetchSupplier,
  fetchSuppliersPage,
  setSupplierStatus,
  updateSupplier,
} from './api'
import type { SupplierListParams, SupplierRequest } from './types'

export const supplierKeys = {
  all: ['suppliers'] as const,
  list: (params: SupplierListParams) => [...supplierKeys.all, 'list', params] as const,
  detail: (id: number) => [...supplierKeys.all, 'detail', id] as const,
}

export function useSuppliersPage(params: SupplierListParams) {
  return useQuery({
    queryKey: supplierKeys.list(params),
    queryFn: ({ signal }) => fetchSuppliersPage(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useSupplier(id: number | undefined) {
  return useQuery({
    queryKey: supplierKeys.detail(id ?? -1),
    queryFn: ({ signal }) => fetchSupplier(id as number, signal),
    enabled: id !== undefined,
    // Always revalidate on mount: the edit form snapshots this data, so it must not start from a stale cache.
    refetchOnMount: 'always',
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SupplierRequest) => createSupplier(body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
  })
}

export function useUpdateSupplier(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SupplierRequest) => updateSupplier(id, body),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
  })
}

export function useSetSupplierStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setSupplierStatus(id, active),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: supplierKeys.all }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      ]),
  })
}
