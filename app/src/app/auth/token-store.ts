import type { AuthUser } from './types'

// The access token lives only in memory: never in localStorage/sessionStorage.
let accessToken: string | null = null
// Incremented when the user signs out, so a refresh started before it cannot revive the session.
let sessionGeneration = 0
const expiredListeners = new Set<() => void>()
const refreshedListeners = new Set<(user: AuthUser) => void>()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function getSessionGeneration(): number {
  return sessionGeneration
}

/** Clears the token and invalidates every refresh still in flight. */
export function endSession(): void {
  sessionGeneration += 1
  accessToken = null
}

export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener)
  return () => {
    expiredListeners.delete(listener)
  }
}

export function notifySessionExpired(): void {
  for (const listener of [...expiredListeners]) listener()
}

/** Called with the user returned by every successful refresh (role or name may have changed). */
export function onSessionRefreshed(listener: (user: AuthUser) => void): () => void {
  refreshedListeners.add(listener)
  return () => {
    refreshedListeners.delete(listener)
  }
}

export function notifySessionRefreshed(user: AuthUser): void {
  for (const listener of [...refreshedListeners]) listener(user)
}
