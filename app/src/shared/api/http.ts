import {
  getAccessToken,
  getSessionGeneration,
  notifySessionExpired,
  notifySessionRefreshed,
  setAccessToken,
} from '@/app/auth/token-store'
import type { AuthResponse } from '@/app/auth/types'

const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
}

export class ApiError extends Error {
  status: number
  title?: string
  detail?: string
  errors?: Record<string, string>

  constructor(
    status: number,
    message: string,
    problem: { title?: string; detail?: string; errors?: Record<string, string> } = {},
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.title = problem.title
    this.detail = problem.detail
    this.errors = problem.errors
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === null || value === undefined || value === '') continue
    params.set(key, String(value))
  }
  const search = params.toString()
  return `${BASE_URL}${path}${search ? `?${search}` : ''}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined
  const result: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') result[key] = entry
  }
  return result
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: unknown
  try {
    problem = await response.json()
  } catch {
    problem = undefined
  }
  const body = isRecord(problem) ? problem : {}
  const title = typeof body.title === 'string' ? body.title : undefined
  const detail = typeof body.detail === 'string' ? body.detail : undefined
  return new ApiError(
    response.status,
    detail ?? title ?? `Request failed with status ${response.status}`,
    { title, detail, errors: toStringRecord(body.errors) },
  )
}

function isAuthPath(path: string): boolean {
  return path.startsWith('/auth/')
}

// The resource server rejects an expired bearer with 401 before these permitAll
// controllers run, so the token must not be attached to them.
const NO_BEARER_PATHS = new Set([
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/signup',
  '/auth/invite/preview',
  '/auth/invite/accept',
])

async function perform<T>(path: string, options: RequestOptions): Promise<T> {
  const { method = 'GET', query, body, signal } = options
  const hasBody = body !== undefined
  const authCall = isAuthPath(path)

  const headers: Record<string, string> = {}
  if (hasBody) headers['Content-Type'] = 'application/json'
  if (authCall) headers['X-Requested-With'] = 'XMLHttpRequest'
  const token = getAccessToken()
  if (token !== null && !NO_BEARER_PATHS.has(path)) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal,
      credentials: authCall ? 'include' : undefined,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(0, 'Network error')
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

let refreshing: Promise<AuthResponse> | null = null

/** The refresh currently in flight, if any. */
export function pendingRefresh(): Promise<AuthResponse> | null {
  return refreshing
}

/**
 * Renews the session through the refresh cookie. Concurrent callers share one call.
 * A refresh that completes after the user signed out is discarded (rejected with 401).
 */
export function refreshOnce(): Promise<AuthResponse> {
  if (refreshing === null) {
    const generation = getSessionGeneration()
    refreshing = perform<AuthResponse>('/auth/refresh', { method: 'POST' })
      .then((auth) => {
        if (getSessionGeneration() !== generation) throw new ApiError(401, 'Session ended')
        setAccessToken(auth.accessToken)
        notifySessionRefreshed(auth.user)
        return auth
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const tokenUsed = getAccessToken()
  try {
    return await perform<T>(path, options)
  } catch (error) {
    if (!isApiError(error) || error.status !== 401 || NO_BEARER_PATHS.has(path)) throw error

    // Another request may already have renewed the token since this one was sent.
    if (getAccessToken() === tokenUsed) {
      try {
        await refreshOnce()
      } catch (refreshError) {
        // Only a rejected refresh (401/403) ends the session; network failures and
        // 5xx (e.g. during a deploy) do not. Concurrent callers share the failure;
        // only the first one notifies.
        if (
          isApiError(refreshError) &&
          (refreshError.status === 401 || refreshError.status === 403) &&
          getAccessToken() !== null
        ) {
          setAccessToken(null)
          notifySessionExpired()
        }
        throw error
      }
    }
    return perform<T>(path, options)
  }
}
