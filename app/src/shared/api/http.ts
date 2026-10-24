const BASE_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8080'

type QueryValue = string | number | boolean | null | undefined

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
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

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, signal } = options
  const hasBody = body !== undefined

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
      body: hasBody ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError(0, 'Network error')
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}
