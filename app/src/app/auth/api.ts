import { refreshOnce, request } from '@/shared/api/http'
import type { AuthResponse, AuthUser, InviteAcceptBody, InvitePreview, StoreSignupBody } from './types'

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } })
}

export function refreshSession(): Promise<AuthResponse> {
  return refreshOnce()
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

/** Creates a new store with the caller as its ADMIN and signs them in (sets the refresh cookie). */
export function signUpStore(body: StoreSignupBody): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/signup', { method: 'POST', body })
}

/** The invite code goes in the body so it stays out of server logs. */
export function previewInvite(token: string, signal?: AbortSignal): Promise<InvitePreview> {
  return request<InvitePreview>('/auth/invite/preview', { method: 'POST', body: { token }, signal })
}

/** Joins the invite's store with the invite's role and signs in (sets the refresh cookie). */
export function acceptInvite(body: InviteAcceptBody): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/invite/accept', { method: 'POST', body })
}
