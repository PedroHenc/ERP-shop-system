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

// Signing in plays a short welcome wipe before redirecting.
const REDIRECT = { timeout: 3000 }

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

    expect(await screen.findByText('Hi, Ana')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/brands'), REDIRECT)
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

  it('shows the suspended-store message on 403', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ title: 'Forbidden', detail: 'This store is suspended' }, { status: 403 }),
      ),
    )
    const { user, router } = renderRoute('/login', { role: null })

    await fillAndSubmit(user)

    expect(await screen.findByText('This store is suspended. Contact support.')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('toggles password visibility', async () => {
    const { user } = renderRoute('/login', { role: null })

    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')
    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
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

    await waitFor(() => expect(router.state.location.pathname).toBe('/'), REDIRECT)
    expect(router.state.location.search).toBe('')
  })

  it('explains that the store administrator resets passwords, and goes back to sign in', async () => {
    const { user } = renderRoute('/login', { role: null })

    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    expect(await screen.findByRole('heading', { name: 'Reset password' })).toBeInTheDocument()
    expect(screen.getByText(/passwords are reset by your store administrator/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to sign in' }))
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeVisible())
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

  describe('create account', () => {
    async function fillSignup(user: ReturnType<typeof renderRoute>['user']) {
      await user.click(screen.getByRole('tab', { name: 'Create account' }))
      await user.type(await screen.findByLabelText('Store name'), 'Acme Market')
      await user.type(screen.getByLabelText('Your name'), 'Ana Admin')
      await user.type(screen.getByLabelText('Email', { selector: '#signup-email' }), 'ana@example.com')
      await user.type(screen.getByLabelText('Password', { selector: '#signup-password' }), 'Strong#Pass1')
      await user.click(screen.getByRole('button', { name: 'Create store' }))
    }

    it('creates the store with its admin and opens the app', async () => {
      const body = vi.fn()
      server.use(
        http.post(`${API}/auth/signup`, async ({ request }) => {
          body(await request.json())
          return HttpResponse.json({ accessToken: 'tok', expiresIn: 900, user: userFixture() })
        }),
      )
      const { user, router } = renderRoute('/login', { role: null })

      await fillSignup(user)

      expect(await screen.findByText('Hi, Ana')).toBeInTheDocument()
      await waitFor(() => expect(router.state.location.pathname).toBe('/'), REDIRECT)
      expect(body).toHaveBeenCalledWith({
        storeName: 'Acme Market',
        name: 'Ana Admin',
        email: 'ana@example.com',
        password: 'Strong#Pass1',
      })
    })

    it('rates the password while typing', async () => {
      const { user } = renderRoute('/login', { role: null })
      await user.click(screen.getByRole('tab', { name: 'Create account' }))
      const password = await screen.findByLabelText('Password', { selector: '#signup-password' })
      await user.type(password, 'abc')
      expect(screen.getByText('Weak password')).toBeInTheDocument()
      await user.type(password, 'DEF#12345')
      expect(screen.getByText('Strong password')).toBeInTheDocument()
    })

    it('shows a taken e-mail on the e-mail field', async () => {
      server.use(
        http.post(`${API}/auth/signup`, () =>
          HttpResponse.json(
            { title: 'Bad Request', detail: 'Validation failed', errors: { email: 'A user with this email already exists' } },
            { status: 400 },
          ),
        ),
      )
      const { user, router } = renderRoute('/login', { role: null })

      await fillSignup(user)

      expect(await screen.findByText('An account with this email already exists')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/login')
    })

    it('explains when creating stores is turned off', async () => {
      server.use(
        http.post(`${API}/auth/signup`, () =>
          HttpResponse.json({ title: 'Forbidden', detail: 'Creating new stores is disabled', code: 'signup-disabled' }, { status: 403 }),
        ),
      )
      const { user } = renderRoute('/login', { role: null })

      await fillSignup(user)

      expect(await screen.findByText(/Creating new stores is turned off/)).toBeInTheDocument()
    })
  })

  describe('invite link', () => {
    function mockPreview(onToken?: (token: unknown) => void) {
      server.use(
        http.post(`${API}/auth/invite/preview`, async ({ request }) => {
          onToken?.(((await request.json()) as { token: unknown }).token)
          return HttpResponse.json({ storeName: 'Acme Market', role: 'MANAGER', expiresAt: '2026-11-06T12:00:00Z' })
        }),
      )
    }

    it('shows the store and role, then joins with the code from the link', async () => {
      const previewToken = vi.fn()
      const body = vi.fn()
      mockPreview(previewToken)
      server.use(
        http.post(`${API}/auth/invite/accept`, async ({ request }) => {
          body(await request.json())
          return HttpResponse.json({ accessToken: 'tok', expiresIn: 900, user: userFixture({ name: 'Bia Lima', role: 'MANAGER' }) })
        }),
      )
      const { user, router } = renderRoute('/join#code-123', { role: null })

      expect(await screen.findByText('Acme Market')).toBeInTheDocument()
      expect(screen.getByText('You will join as Manager')).toBeInTheDocument()
      expect(previewToken).toHaveBeenCalledWith('code-123')

      await user.type(screen.getByLabelText('Your name'), 'Bia Lima')
      await user.type(screen.getByLabelText('Email', { selector: '#join-email' }), 'bia@example.com')
      await user.type(screen.getByLabelText('Password', { selector: '#join-password' }), 'Strong#Pass1')
      await user.click(screen.getByRole('button', { name: 'Create account and sign in' }))

      expect(await screen.findByText('Hi, Bia')).toBeInTheDocument()
      await waitFor(() => expect(router.state.location.pathname).toBe('/'), REDIRECT)
      expect(body).toHaveBeenCalledWith({ token: 'code-123', name: 'Bia Lima', email: 'bia@example.com', password: 'Strong#Pass1' })
    })

    it('says when the invite is invalid or expired', async () => {
      server.use(
        http.post(`${API}/auth/invite/preview`, () =>
          HttpResponse.json({ title: 'Not Found', detail: 'This invite is invalid or has expired', code: 'invite-invalid' }, { status: 404 }),
        ),
      )
      renderRoute('/join#used-code', { role: null })

      expect(await screen.findByText(/This invite is invalid or has expired/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go to sign in' })).toBeInTheDocument()
    })

    it('treats a link without a code as invalid, without calling the API', async () => {
      const previewToken = vi.fn()
      mockPreview(previewToken)
      renderRoute('/join', { role: null })

      expect(await screen.findByText(/This invite is invalid or has expired/)).toBeInTheDocument()
      expect(previewToken).not.toHaveBeenCalled()
    })

    it('asks a signed-in user to sign out instead of redirecting', async () => {
      renderRoute('/join#code-123')

      expect(await screen.findByRole('heading', { name: 'You are already signed in' })).toBeInTheDocument()
      expect(screen.getByText(/You are signed in as Ana Admin/)).toBeInTheDocument()
    })
  })
})
