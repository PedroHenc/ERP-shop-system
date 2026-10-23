import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { brandFixture, brandPageFixture, userFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'
import { getAccessToken } from './token-store'

describe('AuthProvider', () => {
  it('restores the session with refresh on start', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.post(`${API}/auth/refresh`, async () => {
        await gate
        return HttpResponse.json({ accessToken: 'tok', expiresIn: 900, user: userFixture() })
      }),
    )

    renderRoute('/', { restoreSession: true })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText('Welcome to ERP Shop')).not.toBeInTheDocument()
    release()
    expect(await screen.findByText('Welcome to ERP Shop')).toBeInTheDocument()
    expect(getAccessToken()).toBe('tok')
  })

  it('stays anonymous when the start refresh fails', async () => {
    server.use(http.post(`${API}/auth/refresh`, () => HttpResponse.json({}, { status: 401 })))

    const { router } = renderRoute('/', { restoreSession: true })

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('signs out', async () => {
    const logout = vi.fn()
    server.use(
      http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([brandFixture()]))),
      http.post(`${API}/auth/logout`, () => {
        logout()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user, router, queryClient } = renderRoute('/brands')
    await screen.findByText('Acme')
    expect(queryClient.getQueryCache().getAll().length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'User menu' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Sign out' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('')
    expect(logout).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(getAccessToken()).toBeNull()
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('goes to /login when a later refresh fails', async () => {
    server.use(
      http.get(`${API}/brands/page`, () => HttpResponse.json({}, { status: 401 })),
      http.post(`${API}/auth/refresh`, () => HttpResponse.json({}, { status: 401 })),
    )

    const { router } = renderRoute('/brands')

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.search).toBe('?redirect=%2Fbrands')
  })
})
