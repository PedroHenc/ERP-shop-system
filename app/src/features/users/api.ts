import { request } from '@/shared/api/http'
import type { User, UserListParams, UserPage, UserRequest } from './types'

export function fetchUsersPage(params: UserListParams, signal?: AbortSignal): Promise<UserPage> {
  return request<UserPage>('/users/page', { query: { ...params }, signal })
}

export function fetchUser(id: number, signal?: AbortSignal): Promise<User> {
  return request<User>(`/users/${id}`, { signal })
}

export function createUser({ name, email, role, active, password }: UserRequest): Promise<User> {
  return request<User>('/users', { method: 'POST', body: { name, email, role, active, password } })
}

export function updateUser(id: number, { name, email, role, active, version }: UserRequest): Promise<User> {
  return request<User>(`/users/${id}`, { method: 'PUT', body: { name, email, role, active, version } })
}

export function setUserStatus(id: number, active: boolean): Promise<User> {
  return request<User>(`/users/${id}/status`, { method: 'PATCH', body: { active } })
}

export function setUserPassword(id: number, password: string): Promise<void> {
  return request<void>(`/users/${id}/password`, { method: 'POST', body: { password } })
}
