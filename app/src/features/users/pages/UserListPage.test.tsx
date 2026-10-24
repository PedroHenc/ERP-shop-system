import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { userFixture, userPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function listOf(...users: ReturnType<typeof userFixture>[]) {
  server.use(http.get(`${API}/users/page`, () => HttpResponse.json(userPageFixture(users))))
}

describe('UserListPage', () => {
  it('lists users with role and last login', async () => {
    listOf(userFixture({ id: 5, name: 'Carl Cashier', email: 'carl@example.com', role: 'CASHIER', lastLoginAt: null }))
    renderRoute('/users')
    const row = (await screen.findByText('Carl Cashier')).closest('tr') as HTMLElement
    expect(within(row).getByText('carl@example.com')).toBeInTheDocument()
    expect(within(row).getByText('Cashier')).toBeInTheDocument()
    expect(within(row).getByText('Never')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New user' })).toHaveAttribute('href', '/users/new')
  })

  it('filters by role through the URL', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${API}/users/page`, ({ request }) => {
        seen(new URL(request.url).searchParams.get('role'))
        return HttpResponse.json(userPageFixture([userFixture({ id: 5, name: 'Carl Cashier' })]))
      }),
    )
    const { user, router } = renderRoute('/users')
    await screen.findByText('Carl Cashier')
    await user.click(screen.getByRole('combobox', { name: 'Role' }))
    await user.click(await screen.findByRole('option', { name: 'Cashier' }))
    await waitFor(() => expect(router.state.location.search).toContain('role=CASHIER'))
    await waitFor(() => expect(seen).toHaveBeenCalledWith('CASHIER'))
  })

  it('ignores an invalid role in the URL', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${API}/users/page`, ({ request }) => {
        seen(new URL(request.url).searchParams.get('role'))
        return HttpResponse.json(userPageFixture([userFixture({ id: 5, name: 'Carl Cashier' })]))
      }),
    )
    renderRoute('/users?role=BOSS')
    await screen.findByText('Carl Cashier')
    expect(seen).toHaveBeenCalledWith(null)
  })

  it('deactivates another user after confirmation', async () => {
    const patched = vi.fn()
    server.use(
      http.get(`${API}/users/page`, () =>
        HttpResponse.json(userPageFixture([userFixture({ id: 5, name: 'Carl Cashier', role: 'CASHIER' })])),
      ),
      http.patch(`${API}/users/5/status`, async ({ request }) => {
        patched(await request.json())
        return HttpResponse.json(userFixture({ id: 5, active: false }))
      }),
    )
    const { user } = renderRoute('/users')
    await screen.findByText('Carl Cashier')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Deactivate' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(patched).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(patched).toHaveBeenCalledWith({ active: false }))
    expect(await screen.findByText('User deactivated')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('activates an inactive user without confirmation', async () => {
    const patched = vi.fn()
    server.use(
      http.get(`${API}/users/page`, () =>
        HttpResponse.json(userPageFixture([userFixture({ id: 5, name: 'Carl Cashier', active: false })])),
      ),
      http.patch(`${API}/users/5/status`, async ({ request }) => {
        patched(await request.json())
        return HttpResponse.json(userFixture({ id: 5, active: true }))
      }),
    )
    const { user } = renderRoute('/users')
    await screen.findByText('Carl Cashier')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Activate' }))
    await waitFor(() => expect(patched).toHaveBeenCalledWith({ active: true }))
    expect(await screen.findByText('User activated')).toBeInTheDocument()
  })

  it('does not offer deactivate on the signed-in user row', async () => {
    // The session user from renderRoute is userFixture() with id 1.
    listOf(userFixture({ id: 1, name: 'Ana Admin' }), userFixture({ id: 5, name: 'Carl Cashier' }))
    const { user } = renderRoute('/users')
    const row = (await within(await screen.findByRole('table')).findByText('Ana Admin')).closest('tr') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Deactivate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Activate' })).not.toBeInTheDocument()
  })

  it('shows empty state', async () => {
    listOf()
    renderRoute('/users')
    expect(await screen.findByText('No users found')).toBeInTheDocument()
  })

  it('shows error state with retry', async () => {
    server.use(http.get(`${API}/users/page`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })))
    renderRoute('/users')
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('forbids non-admins', async () => {
    renderRoute('/users', { role: 'MANAGER' })
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument()
  })
})
