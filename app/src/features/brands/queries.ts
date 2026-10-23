import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createBrand, fetchBrand, fetchBrands, fetchBrandsPage, setBrandStatus, updateBrand } from './api'
import type { BrandListParams, BrandRequest } from './types'

export const brandKeys = {
  all: ['brands'] as const,
  active: ['brands', 'active'] as const,
  list: (params: BrandListParams) => [...brandKeys.all, 'list', params] as const,
  detail: (id: number) => [...brandKeys.all, 'detail', id] as const,
}

/** Active brands for pickers. */
export function useBrands() {
  return useQuery({
    queryKey: brandKeys.active,
    queryFn: ({ signal }) => fetchBrands(signal),
    staleTime: 5 * 60_000,
  })
}

export function useBrandsPage(params: BrandListParams) {
  return useQuery({
    queryKey: brandKeys.list(params),
    queryFn: ({ signal }) => fetchBrandsPage(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useBrand(id: number | null) {
  return useQuery({
    queryKey: brandKeys.detail(id ?? -1),
    queryFn: ({ signal }) => fetchBrand(id as number, signal),
    enabled: id !== null,
    // Always revalidate on mount: the edit form snapshots this data, so it must not start from a stale cache.
    refetchOnMount: 'always',
  })
}

export function useCreateBrand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BrandRequest) => createBrand(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  })
}

export function useUpdateBrand(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BrandRequest) => updateBrand(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  })
}

export function useSetBrandStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setBrandStatus(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: brandKeys.all }),
  })
}
