import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createProduct, deleteProduct, fetchProduct, fetchProductsPage, updateProduct } from './api'
import type { ProductListParams, ProductRequest } from './types'

export const productKeys = {
  all: ['products'] as const,
  list: (params: ProductListParams) => [...productKeys.all, 'list', params] as const,
  detail: (id: number) => [...productKeys.all, 'detail', id] as const,
}

export function useProductsPage(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: ({ signal }) => fetchProductsPage(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useProduct(id: number | undefined) {
  return useQuery({
    queryKey: productKeys.detail(id ?? -1),
    queryFn: ({ signal }) => fetchProduct(id as number, signal),
    enabled: id !== undefined,
    // Always revalidate on mount: the edit form snapshots this data, so it must not start from a stale cache.
    refetchOnMount: 'always',
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ProductRequest) => createProduct(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useUpdateProduct(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ProductRequest) => updateProduct(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  })
}
