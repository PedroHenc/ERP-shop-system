import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { API, server } from '@/test/server'
import { changePassword, fetchMe, login, logoutSession, refreshSession } from './api'
import { setAccessToken } from './token-store'
import type { AuthResponse, AuthUser } from './types'

const user: AuthUser = {
  id: 1,
  version: 0,
  name: 'Ana',
  email: 'ana@example.com',
  role: 'MANAGER',
  active: true,
  lastLoginAt: null,
  createdDate: '2026-01-01T00:00:00Z',
  lastModifiedDate: '2026-01-01T00:00:00Z',
}
const auth: AuthResponse = { accessToken: 'tok', expiresIn: 900, user }

beforeEach(() => setAccessToken(null))
afterEach(() => setAccessToken(null))

describe('auth api', () => {
  it('login posts credentials and returns the auth response', async () => {
    let body: unknown
    server.use(
      http.post(`${API}/auth/login`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(auth)
      }),
    )

    const result = await login('ana@example.com', 'secret')

    expect(body).toEqual({ email: 'ana@example.com', password: 'secret' })
    expect(result).toEqual(auth)
  })

  it('refreshSession returns the auth response', async () => {
    server.use(http.post(`${API}/auth/refresh`, () => HttpResponse.json(auth)))
    expect(await refreshSession()).toEqual(auth)
  })

  it('logoutSession resolves on 204', async () => {
    server.use(
      http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
    )
    await expect(logoutSession()).resolves.toBeUndefined()
  })

  it('fetchMe returns the user with the bearer token', async () => {
    let authorization: string | null = null
    server.use(
      http.get(`${API}/auth/me`, ({ request }) => {
        authorization = request.headers.get('authorization')
        return HttpResponse.json(user)
      }),
    )
    setAccessToken('tok')

    expect(await fetchMe()).toEqual(user)
    expect(authorization).toBe('Bearer tok')
  })

  it('changePassword puts both passwords', async () => {
    let body: unknown
    server.use(
      http.put(`${API}/auth/me/password`, async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    setAccessToken('tok')

    await changePassword('old', 'new-password')

    expect(body).toEqual({ currentPassword: 'old', newPassword: 'new-password' })
  })
})
