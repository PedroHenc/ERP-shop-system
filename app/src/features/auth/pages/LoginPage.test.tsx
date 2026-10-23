import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { userFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function mockLogin(onBody?: (body: unknown) => void) {
  server.use(
    http.post(`${API}/auth/login`, async ({ request }) => {
      onBody?.(await request.json())
      return HttpResponse.json({ accessToken: 'tok', expiresIn: 900, user: userFixture() })
    }),
  )
}

async function fillAndSubmit(user: ReturnType<typeof renderRoute>['user']) {
  await user.type(screen.getByLabelText('Email'), 'ana@example.com')
  await user.type(screen.getByLabelText('Password'), 'secret-pass')
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('LoginPage', () => {
  it('signs in and goes to the redirect target', async () => {
    const body = vi.fn()
    mockLogin(body)
    server.use(http.get(`${API}/brands/page`, () => HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true })))
    const { user, router } = renderRoute('/login?redirect=/brands', { role: null })

    await fillAndSubmit(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/brands'))
    expect(body).toHaveBeenCalledWith({ email: 'ana@example.com', password: 'secret-pass' })
  })

  it('shows the error on 401', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ title: 'Unauthorized', detail: 'bad credentials' }, { status: 401 }),
      ),
    )
    const { user, router } = renderRoute('/login', { role: null })

    await fillAndSubmit(user)

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('validates the fields before calling the API', async () => {
    const { user } = renderRoute('/login', { role: null })

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findAllByText('This field is required')).toHaveLength(2)
  })

  it.each(['//evil.com', 'https://evil.com'])('ignores external redirect %s', async (target) => {
    mockLogin()
    const { user, router } = renderRoute(`/login?redirect=${encodeURIComponent(target)}`, { role: null })

    await fillAndSubmit(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(router.state.location.search).toBe('')
  })

  it('sends signed-in users away from /login', async () => {
    const { router } = renderRoute('/login')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })

  it('redirects anonymous users to /login with the current path', async () => {
    const { router } = renderRoute('/suppliers?page=2', { role: null })
    await waitFor(() =>
      expect(router.state.location.pathname + router.state.location.search).toBe(
        '/login?redirect=%2Fsuppliers%3Fpage%3D2',
      ),
    )
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })
})
