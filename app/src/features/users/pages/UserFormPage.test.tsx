import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { userFixture, userPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function useListHandler() {
  server.use(http.get(`${API}/users/page`, () => HttpResponse.json(userPageFixture([userFixture({ id: 5 })]))))
}

describe('UserFormPage', () => {
  it('creates a user with an initial password', async () => {
    useListHandler()
    const posted = vi.fn()
    server.use(
      http.post(`${API}/users`, async ({ request }) => {
        posted(await request.json())
        return HttpResponse.json(userFixture({ id: 9 }), { status: 201 })
      }),
    )
    const { user, router } = renderRoute('/users/new')
    await user.type(await screen.findByLabelText('Name'), 'Bob Manager')
    await user.type(screen.getByLabelText('Email'), 'bob@example.com')
    await user.click(screen.getByRole('combobox', { name: 'Role' }))
    await user.click(await screen.findByRole('option', { name: 'Manager' }))
    await user.type(screen.getByLabelText('Password'), 'secret-123')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/users'))
    expect(posted).toHaveBeenCalledWith({
      name: 'Bob Manager',
      email: 'bob@example.com',
      role: 'MANAGER',
      active: true,
      password: 'secret-123',
    })
    expect(await screen.findByText('User saved')).toBeInTheDocument()
  })

  it('shows client-side validation without calling the API', async () => {
    useListHandler()
    const posted = vi.fn()
    server.use(http.post(`${API}/users`, () => posted()))
    const { user } = renderRoute('/users/new')
    await user.type(await screen.findByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Use at least 8 characters')).toBeInTheDocument()
    expect(screen.getAllByText('This field is required').length).toBeGreaterThan(0)
    expect(posted).not.toHaveBeenCalled()
  })

  it('shows a duplicate email error on the field', async () => {
    useListHandler()
    server.use(
      http.post(`${API}/users`, () =>
        HttpResponse.json(
          {
            title: 'Bad Request',
            detail: 'Validation failed',
            errors: { email: 'A user with this email already exists' },
          },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/users/new')
    await user.type(await screen.findByLabelText('Name'), 'Bob')
    await user.type(screen.getByLabelText('Email'), 'bob@example.com')
    await user.type(screen.getByLabelText('Password'), 'secret-123')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('A user with this email already exists')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('edits a user and sends the loaded version', async () => {
    useListHandler()
    const put = vi.fn()
    server.use(
      http.get(`${API}/users/7`, () =>
        HttpResponse.json(userFixture({ id: 7, version: 2, name: 'Carl', email: 'carl@example.com', role: 'STOCK' })),
      ),
      http.put(`${API}/users/7`, async ({ request }) => {
        put(await request.json())
        return HttpResponse.json(userFixture({ id: 7, version: 3 }))
      }),
    )
    const { user, router } = renderRoute('/users/7/edit')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Carl'))
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Role' })).toHaveTextContent('Stock')
    await user.type(screen.getByLabelText('Name'), 'y')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/users'))
    expect(put).toHaveBeenCalledWith({
      name: 'Carly',
      email: 'carl@example.com',
      role: 'STOCK',
      active: true,
      version: 2,
    })
  })

  it('shows the conflict alert on 409', async () => {
    useListHandler()
    server.use(
      http.get(`${API}/users/7`, () => HttpResponse.json(userFixture({ id: 7, name: 'Carl' }))),
      http.put(`${API}/users/7`, () => HttpResponse.json({ title: 'Conflict', detail: 'modified' }, { status: 409 })),
    )
    const { user } = renderRoute('/users/7/edit')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Carl'))
    await user.type(screen.getByLabelText('Name'), 'y')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('This user was changed by someone else')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('locks role and active for the signed-in user', async () => {
    useListHandler()
    server.use(http.get(`${API}/users/1`, () => HttpResponse.json(userFixture({ id: 1 }))))
    renderRoute('/users/1/edit')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Ana Admin'))
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Active' })).toBeDisabled()
    expect(screen.getByText("You can't change the status or role of your own account")).toBeInTheDocument()
  })

  it('does not lock role and active for other users', async () => {
    useListHandler()
    server.use(http.get(`${API}/users/7`, () => HttpResponse.json(userFixture({ id: 7 }))))
    renderRoute('/users/7/edit')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Ana Admin'))
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeEnabled()
    expect(screen.getByRole('switch', { name: 'Active' })).toBeEnabled()
  })

  it('sets a new password from the dialog', async () => {
    useListHandler()
    const posted = vi.fn()
    server.use(
      http.get(`${API}/users/7`, () => HttpResponse.json(userFixture({ id: 7 }))),
      http.post(`${API}/users/7/password`, async ({ request }) => {
        posted(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderRoute('/users/7/edit')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Ana Admin'))
    await user.click(screen.getByRole('button', { name: 'Set password' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('New password'), 'brand-new-1')
    await user.type(within(dialog).getByLabelText('Confirm password'), 'brand-new-1')
    await user.click(within(dialog).getByRole('button', { name: 'Set password' }))
    await waitFor(() => expect(posted).toHaveBeenCalledWith({ password: 'brand-new-1' }))
    expect(await screen.findByText('Password updated')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows a mismatch error and a server password error in the dialog', async () => {
    useListHandler()
    server.use(
      http.get(`${API}/users/7`, () => HttpResponse.json(userFixture({ id: 7 }))),
      http.post(`${API}/users/7/password`, () =>
        HttpResponse.json(
          { title: 'Bad Request', detail: 'Validation failed', errors: { password: 'Password is too weak' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/users/7/edit')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Ana Admin'))
    await user.click(screen.getByRole('button', { name: 'Set password' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('New password'), 'brand-new-1')
    await user.type(within(dialog).getByLabelText('Confirm password'), 'different-1')
    await user.click(within(dialog).getByRole('button', { name: 'Set password' }))
    expect(await within(dialog).findByText("Passwords don't match")).toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText('Confirm password'))
    await user.type(within(dialog).getByLabelText('Confirm password'), 'brand-new-1')
    await user.click(within(dialog).getByRole('button', { name: 'Set password' }))
    expect(await within(dialog).findByText('Password is too weak')).toBeInTheDocument()
  })

  it('shows User not found for 404', async () => {
    useListHandler()
    server.use(
      http.get(`${API}/users/99`, () => HttpResponse.json({ title: 'Not Found', detail: 'nope' }, { status: 404 })),
    )
    renderRoute('/users/99/edit')
    expect(await screen.findByText('User not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to users' })).toHaveAttribute('href', '/users')
  })

  it('asks for confirmation when leaving with unsaved changes', async () => {
    useListHandler()
    const { user, router } = renderRoute('/users/new')
    await user.type(await screen.findByLabelText('Name'), 'X')
    await user.click(screen.getByRole('link', { name: 'Users' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/users/new')
    await user.click(screen.getByRole('button', { name: 'Leave' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/users'))
  })

  it('forbids non-admins', async () => {
    renderRoute('/users/new', { role: 'MANAGER' })
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument()
  })
})
