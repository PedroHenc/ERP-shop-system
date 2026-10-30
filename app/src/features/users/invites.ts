import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Role } from '@/app/auth/types'
import { request } from '@/shared/api/http'

/** A pending invite. The code is never listed: it exists only in the link shown when it was created. */
export interface Invite {
  id: number
  role: Role
  createdByName: string
  createdAt: string
  expiresAt: string
}

export interface CreatedInvite {
  invite: Invite
  token: string
}

export function fetchInvites(signal?: AbortSignal): Promise<Invite[]> {
  return request<Invite[]>('/invites', { signal })
}

export function createInvite(role: Role): Promise<CreatedInvite> {
  return request<CreatedInvite>('/invites', { method: 'POST', body: { role } })
}

export function revokeInvite(id: number): Promise<void> {
  return request<void>(`/invites/${id}`, { method: 'DELETE' })
}

/** The link to send: the code goes in the fragment, which browsers never send to a server. */
export function inviteLink(token: string): string {
  return `${window.location.origin}/join#${encodeURIComponent(token)}`
}

export const inviteKeys = { all: ['invites'] as const }

export function useInvites(enabled: boolean) {
  return useQuery({ queryKey: inviteKeys.all, queryFn: ({ signal }) => fetchInvites(signal), enabled })
}

export function useCreateInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inviteKeys.all }),
  })
}

export function useRevokeInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: revokeInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inviteKeys.all }),
  })
}
