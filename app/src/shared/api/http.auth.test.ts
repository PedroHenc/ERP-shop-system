import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { API, server } from '@/test/server'
import {
  endSession,
  getAccessToken,
  onSessionExpired,
  onSessionRefreshed,
  setAccessToken,
} from '@/app/auth/token-store'
import { changePassword, login, refreshSession } from '@/app/auth/api'
import type { AuthResponse, AuthUser } from '@/app/auth/types'
import { ApiError, request } from './http'

const user: AuthUser = {
  id: 1,
  version: 0,
  name: 'Ana',
  email: 'ana@example.com',
  role: 'ADMIN',
  active: true,
  lastLoginAt: null,
  createdDate: '2026-01-01T00:00:00Z',
  lastModifiedDate: '2026-01-01T00:00:00Z',
}

function authBody(accessToken: string): AuthResponse {
  return { accessToken, expiresIn: 900, user }
}

beforeEach(() => setAccessToken(null))
afterEach(() => setAccessToken(null))

describe('request authentication', () => {
  it('sends the bearer token', async () => {
    let authorization: string | null = null
    server.use(
      http.get(`${API}/brands`, ({ request: req }) => {
        authorization = req.headers.get('authorization')
        return HttpResponse.json([])
      }),
    )
    setAccessToken('t1')

    await request('/brands')

    expect(authorization).toBe('Bearer t1')
  })

  it('sends credentials and X-Requested-With on /auth calls', async () => {
    let requestedWith: string | null = null
    server.use(
      http.post(`${API}/auth/refresh`, ({ request: req }) => {
        requestedWith = req.headers.get('x-requested-with')
        return HttpResponse.json(authBody('t2'))
      }),
      http.get(`${API}/brands`, () => HttpResponse.json([])),
    )
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    let calls: Parameters<typeof fetch>[] = []
    try {
      await refreshSession()
      await request('/brands')
      calls = [...fetchSpy.mock.calls]
    } finally {
      fetchSpy.mockRestore()
    }

    expect(requestedWith).toBe('XMLHttpRequest')
    expect(calls[0]?.[1]?.credentials).toBe('include')
    expect(calls[1]?.[1]?.credentials).toBeUndefined()
  })

  it('does not send Authorization on login, refresh and logout even when a token is stored', async () => {
    const seen: Record<string, string | null> = {}
    server.use(
      http.post(`${API}/auth/login`, ({ request: req }) => {
        seen.login = req.headers.get('authorization')
        return HttpResponse.json(authBody('t2'))
      }),
      http.post(`${API}/auth/refresh`, ({ request: req }) => {
        seen.refresh = req.headers.get('authorization')
        return HttpResponse.json(authBody('t3'))
      }),
      http.post(`${API}/auth/logout`, ({ request: req }) => {
        seen.logout = req.headers.get('authorization')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    setAccessToken('expired')

    await login('ana@example.com', 'secret')
    setAccessToken('expired')
    await refreshSession()
    setAccessToken('expired')
    await request('/auth/logout', { method: 'POST' })

    expect(seen).toEqual({ login: null, refresh: null, logout: null })
  })

  it('sends Authorization on /auth/me', async () => {
    let authorization: string | null = null
    server.use(
      http.get(`${API}/auth/me`, ({ request: req }) => {
        authorization = req.headers.get('authorization')
        return HttpResponse.json(user)
      }),
    )
    setAccessToken('t1')

    await request('/auth/me')

    expect(authorization).toBe('Bearer t1')
  })

  it('refreshes once and retries after a 401', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.post(`${API}/products/page`, async ({ request: req }) => {
        seen.push(req.headers.get('authorization'))
        if (seen.length === 1) return new HttpResponse(null, { status: 401 })
        return HttpResponse.json({ echoed: await req.json(), url: req.url })
      }),
      http.post(`${API}/auth/refresh`, () => HttpResponse.json(authBody('t2'))),
    )
    setAccessToken('t1')

    const result = await request<{ echoed: unknown; url: string }>('/products/page', {
      method: 'POST',
      query: { page: 2 },
      body: { a: 1 },
    })

    expect(seen).toEqual(['Bearer t1', 'Bearer t2'])
    expect(result.echoed).toEqual({ a: 1 })
    expect(result.url).toBe(`${API}/products/page?page=2`)
    expect(getAccessToken()).toBe('t2')
  })

  it('retries at most once', async () => {
    let calls = 0
    let refreshes = 0
    server.use(
      http.get(`${API}/brands`, () => {
        calls += 1
        return new HttpResponse(null, { status: 401 })
      }),
      http.post(`${API}/auth/refresh`, () => {
        refreshes += 1
        return HttpResponse.json(authBody('t2'))
      }),
    )
    setAccessToken('t1')

    const error = await request('/brands').catch((e: unknown) => e)

    expect((error as ApiError).status).toBe(401)
    expect(calls).toBe(2)
    expect(refreshes).toBe(1)
  })

  it('shares one refresh between concurrent 401s', async () => {
    let refreshes = 0
    server.use(
      http.get(`${API}/brands`, ({ request: req }) =>
        req.headers.get('authorization') === 'Bearer t2'
          ? HttpResponse.json(['ok'])
          : new HttpResponse(null, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, async () => {
        refreshes += 1
        await new Promise((resolve) => setTimeout(resolve, 20))
        return HttpResponse.json(authBody('t2'))
      }),
    )
    setAccessToken('t1')

    const results = await Promise.all([
      request('/brands'),
      request('/brands'),
      request('/brands'),
    ])

    expect(refreshes).toBe(1)
    expect(results).toEqual([['ok'], ['ok'], ['ok']])
  })

  it('expires the session when refresh fails', async () => {
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)
    server.use(
      http.get(`${API}/brands`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    )
    setAccessToken('t1')

    const error = await request('/brands').catch((e: unknown) => e)
    unsubscribe()

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(401)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
  })

  it('refreshes and retries a 401 from PUT /auth/me/password', async () => {
    const seen: (string | null)[] = []
    server.use(
      http.put(`${API}/auth/me/password`, ({ request: req }) => {
        seen.push(req.headers.get('authorization'))
        return seen.length === 1
          ? new HttpResponse(null, { status: 401 })
          : new HttpResponse(null, { status: 204 })
      }),
      http.post(`${API}/auth/refresh`, () => HttpResponse.json(authBody('t2'))),
    )
    setAccessToken('t1')

    await changePassword('old', 'new-password')

    expect(seen).toEqual(['Bearer t1', 'Bearer t2'])
  })

  it('does not expire the session when refresh fails with 503', async () => {
    const listener = vi.fn()
    const unsubscribe = onSessionExpired(listener)
    server.use(
      http.get(`${API}/brands`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 503 })),
    )
    setAccessToken('t1')

    const error = await request('/brands').catch((e: unknown) => e)
    unsubscribe()

    expect((error as ApiError).status).toBe(401)
    expect(listener).not.toHaveBeenCalled()
    expect(getAccessToken()).toBe('t1')
  })

  it('stops notifying a listener after it unsubscribes', async () => {
    const listener = vi.fn()
    onSessionExpired(listener)()
    server.use(
      http.get(`${API}/brands`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => new HttpResponse(null, { status: 401 })),
    )

    await request('/brands').catch(() => undefined)

    expect(listener).not.toHaveBeenCalled()
  })

  it('does not try to refresh on 401 from /auth/login', async () => {
    let refreshes = 0
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 }),
      ),
      http.post(`${API}/auth/refresh`, () => {
        refreshes += 1
        return HttpResponse.json(authBody('t2'))
      }),
    )

    const error = await login('a@b.c', 'bad').catch((e: unknown) => e)

    expect((error as ApiError).status).toBe(401)
    expect((error as ApiError).detail).toBe('Invalid email or password')
    expect(refreshes).toBe(0)
  })

  it('never writes the token to web storage', async () => {
    server.use(
      http.post(`${API}/auth/login`, () => HttpResponse.json(authBody('t1'))),
      http.post(`${API}/auth/refresh`, () => HttpResponse.json(authBody('t2'))),
    )

    const first = await login('a@b.c', 'pw')
    setAccessToken(first.accessToken)
    await refreshSession()

    // Other keys (e.g. the i18n language) may exist; no stored value may hold a token.
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i += 1) {
        const value = store.getItem(store.key(i) ?? '') ?? ''
        expect(value).not.toMatch(/t1|t2/)
      }
    }
    expect(sessionStorage.length).toBe(0)
  })
})

describe('session refresh notifications', () => {
  it('publishes the refreshed user', async () => {
    server.use(http.post(`${API}/auth/refresh`, () => HttpResponse.json(authBody('t9'))))
    const listener = vi.fn()
    const unsubscribe = onSessionRefreshed(listener)
    try {
      await refreshSession()
    } finally {
      unsubscribe()
    }
    expect(listener).toHaveBeenCalledWith(user)
    expect(getAccessToken()).toBe('t9')
  })

  it('discards a refresh that completes after the session ended', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post(`${API}/auth/refresh`, async () => {
        await gate
        return HttpResponse.json(authBody('t-late'))
      }),
    )
    const listener = vi.fn()
    const unsubscribe = onSessionRefreshed(listener)
    try {
      const pending = refreshSession()
      endSession()
      release()
      await expect(pending).rejects.toMatchObject({ status: 401 })
    } finally {
      unsubscribe()
    }
    expect(getAccessToken()).toBeNull()
    expect(listener).not.toHaveBeenCalled()
  })
})
