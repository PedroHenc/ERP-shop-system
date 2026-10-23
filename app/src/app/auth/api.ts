import { request } from '@/shared/api/http'
import type { AuthResponse, AuthUser } from './types'

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } })
}

export function refreshSession(): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/refresh', { method: 'POST' })
}

export function logoutSession(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' })
}

export function fetchMe(signal?: AbortSignal): Promise<AuthUser> {
  return request<AuthUser>('/auth/me', { signal })
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return request<void>('/auth/me/password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
  })
}
