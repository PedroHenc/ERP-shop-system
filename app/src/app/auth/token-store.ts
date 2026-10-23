// The access token lives only in memory: never in localStorage/sessionStorage.
let accessToken: string | null = null
const listeners = new Set<() => void>()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
}

export function onSessionExpired(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifySessionExpired(): void {
  for (const listener of [...listeners]) listener()
}
