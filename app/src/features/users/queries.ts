import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createUser, fetchUser, fetchUsersPage, setUserPassword, setUserStatus, updateUser } from './api'
import type { UserListParams, UserRequest } from './types'

export const userKeys = {
  all: ['users'] as const,
  list: (params: UserListParams) => [...userKeys.all, 'list', params] as const,
  detail: (id: number) => [...userKeys.all, 'detail', id] as const,
}

export function useUsersPage(params: UserListParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => fetchUsersPage(params, signal),
    placeholderData: keepPreviousData,
  })
}

export function useUser(id: number | undefined) {
  return useQuery({
    queryKey: userKeys.detail(id ?? -1),
    queryFn: ({ signal }) => fetchUser(id as number, signal),
    enabled: id !== undefined,
    // Always revalidate on mount: the edit form snapshots this data, so it must not start from a stale cache.
    refetchOnMount: 'always',
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UserRequest) => createUser(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useUpdateUser(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: UserRequest) => updateUser(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useSetUserStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => setUserStatus(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useSetUserPassword(id: number) {
  return useMutation({ mutationFn: (password: string) => setUserPassword(id, password) })
}
