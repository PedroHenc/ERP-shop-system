import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { userFixture, userPageFixture } from '@/test/fixtures'
import { API, server } from '@/test/server'
import { createUser, fetchUsersPage, setUserPassword, updateUser } from './api'
import { userListParams } from './list-params'

describe('users api', () => {
  it('fetches the users page with filters', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${API}/users/page`, ({ request }) => {
        seen(new URL(request.url).search)
        return HttpResponse.json(userPageFixture([userFixture()]))
      }),
    )
    const page = await fetchUsersPage({ ...userListParams.defaults, search: 'ana', role: 'CASHIER' })
    expect(page.content).toHaveLength(1)
    expect(seen).toHaveBeenCalledWith('?page=0&size=20&sortBy=name&direction=ASC&search=ana&role=CASHIER')
  })

  it('sets a user password', async () => {
    const body = vi.fn()
    server.use(
      http.post(`${API}/users/3/password`, async ({ request }) => {
        body(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await setUserPassword(3, 'new-secret-1')
    expect(body).toHaveBeenCalledWith({ password: 'new-secret-1' })
  })

  it('sends the password only when creating and the version only when updating', async () => {
    const created = vi.fn()
    const updated = vi.fn()
    server.use(
      http.post(`${API}/users`, async ({ request }) => {
        created(await request.json())
        return HttpResponse.json(userFixture({ id: 9 }), { status: 201 })
      }),
      http.put(`${API}/users/9`, async ({ request }) => {
        updated(await request.json())
        return HttpResponse.json(userFixture({ id: 9 }))
      }),
    )
    const base = { name: 'Bob', email: 'bob@example.com', role: 'CASHIER' as const, active: true }
    await createUser({ ...base, version: null, password: 'secret-123' })
    await updateUser(9, { ...base, version: 4, password: 'ignored' })
    expect(created).toHaveBeenCalledWith({ ...base, password: 'secret-123' })
    expect(updated).toHaveBeenCalledWith({ ...base, version: 4 })
  })
})
