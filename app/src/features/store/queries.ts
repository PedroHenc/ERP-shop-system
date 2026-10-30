import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchStore, updateStore } from './api'

const storeKey = ['store'] as const

/** The signed-in user's store (name and logo for the header). Rarely changes. */
export function useStore() {
  return useQuery({ queryKey: storeKey, queryFn: ({ signal }) => fetchStore(signal), staleTime: 5 * 60_000 })
}

export function useUpdateStore() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateStore,
    onSuccess: (store) => queryClient.setQueryData(storeKey, store),
  })
}
