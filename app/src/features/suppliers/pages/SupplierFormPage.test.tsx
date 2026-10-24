import { QueryClient } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { supplierFixture, supplierPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function useListHandler() {
  server.use(http.get(`${API}/suppliers/page`, () => HttpResponse.json(supplierPageFixture([supplierFixture()]))))
}

describe('SupplierFormPage', () => {
  it('creates a supplier and navigates to /suppliers', async () => {
    useListHandler()
    const posted = vi.fn()
    server.use(
      http.post(`${API}/suppliers`, async ({ request }) => {
        posted(await request.json())
        return HttpResponse.json(supplierFixture({ id: 9 }), { status: 201 })
      }),
    )
    const { user, router } = renderRoute('/suppliers/new')
    await user.type(await screen.findByLabelText('Legal name'), 'Acme Ltda')
    await user.type(screen.getByLabelText('Tax ID'), '12.345.678/0001-90')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/suppliers'))
    expect(posted).toHaveBeenCalledWith({
      legalName: 'Acme Ltda',
      tradeName: null,
      taxId: '12.345.678/0001-90',
      email: null,
      phone: null,
      active: true,
      version: null,
    })
    expect(await screen.findByText('Supplier saved')).toBeInTheDocument()
  })

  it('shows client-side validation without calling the API', async () => {
    useListHandler()
    const posted = vi.fn()
    server.use(http.post(`${API}/suppliers`, () => posted()))
    const { user } = renderRoute('/suppliers/new')
    await user.type(await screen.findByLabelText('Email'), 'x@')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('This field is required')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
    expect(posted).not.toHaveBeenCalled()
  })

  it('shows a duplicate tax ID error on the field', async () => {
    useListHandler()
    server.use(
      http.post(`${API}/suppliers`, () =>
        HttpResponse.json(
          {
            title: 'Bad Request',
            detail: 'Validation failed',
            errors: { taxId: 'A supplier with this tax ID already exists' },
          },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/suppliers/new')
    await user.type(await screen.findByLabelText('Legal name'), 'Acme Ltda')
    await user.type(screen.getByLabelText('Tax ID'), '123')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('A supplier with this tax ID already exists')).toBeInTheDocument()
    expect(screen.getByLabelText('Tax ID')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a server error on the Active switch', async () => {
    useListHandler()
    server.use(
      http.post(`${API}/suppliers`, () =>
        HttpResponse.json(
          { title: 'Bad Request', detail: 'Validation failed', errors: { active: 'Active must not be null' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/suppliers/new')
    await user.type(await screen.findByLabelText('Legal name'), 'Acme Ltda')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Active must not be null')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Active' })).toHaveAttribute('aria-invalid', 'true')
  })

  it('disables Save while the request is pending', async () => {
    useListHandler()
    const posted = vi.fn()
    server.use(
      http.post(`${API}/suppliers`, async () => {
        posted()
        await delay(150)
        return HttpResponse.json(supplierFixture({ id: 9 }), { status: 201 })
      }),
    )
    const { user, router } = renderRoute('/suppliers/new')
    await user.type(await screen.findByLabelText('Legal name'), 'Acme Ltda')
    const save = screen.getByRole('button', { name: 'Save' })
    await user.click(save)
    await waitFor(() => expect(save).toBeDisabled())
    await waitFor(() => expect(router.state.location.pathname).toBe('/suppliers'))
    expect(posted).toHaveBeenCalledTimes(1)
  })

  it('loads fresh data and sends its version', async () => {
    useListHandler()
    const put = vi.fn()
    server.use(
      http.get(`${API}/suppliers/7`, () =>
        HttpResponse.json(supplierFixture({ id: 7, version: 2, legalName: 'Name v2' })),
      ),
      http.put(`${API}/suppliers/7`, async ({ request }) => {
        put(await request.json())
        return HttpResponse.json(supplierFixture({ id: 7, version: 3 }))
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['suppliers', 'detail', 7], supplierFixture({ id: 7, version: 1, legalName: 'Name v1' }))
    const { user, router } = renderRoute('/suppliers/7/edit', { queryClient })
    await waitFor(() => expect(screen.getByLabelText('Legal name')).toHaveValue('Name v2'))
    await user.type(screen.getByLabelText('Phone'), '1')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/suppliers'))
    expect(put).toHaveBeenCalledWith(expect.objectContaining({ legalName: 'Name v2', version: 2 }))
  })

  it('shows the conflict alert on 409 and reloads', async () => {
    useListHandler()
    const get = vi.fn()
    const put = vi.fn()
    let serverName = 'Old name'
    let serverVersion = 3
    server.use(
      http.get(`${API}/suppliers/7`, () => {
        get()
        return HttpResponse.json(supplierFixture({ id: 7, version: serverVersion, legalName: serverName }))
      }),
      http.put(`${API}/suppliers/7`, async ({ request }) => {
        const body = (await request.json()) as { version: number }
        put(body.version)
        if (body.version === 3) {
          return HttpResponse.json(
            { title: 'Conflict', detail: 'The resource was modified by another user' },
            { status: 409 },
          )
        }
        return HttpResponse.json(supplierFixture({ id: 7, version: 5 }))
      }),
    )
    const { user } = renderRoute('/suppliers/7/edit')
    const name = await screen.findByLabelText('Legal name')
    await waitFor(() => expect(name).toHaveValue('Old name'))
    await user.clear(name)
    await user.type(name, 'Mine')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('This supplier was changed by someone else')).toBeInTheDocument()

    serverName = 'Server name'
    serverVersion = 4
    await user.click(screen.getByRole('button', { name: 'Reload' }))
    await waitFor(() => expect(screen.getByLabelText('Legal name')).toHaveValue('Server name'))
    expect(get).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('This supplier was changed by someone else')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Phone'), '1')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(put).toHaveBeenLastCalledWith(4))
  })

  it('shows Supplier not found for 404', async () => {
    useListHandler()
    server.use(
      http.get(`${API}/suppliers/99`, () => HttpResponse.json({ title: 'Not Found', detail: 'nope' }, { status: 404 })),
    )
    renderRoute('/suppliers/99/edit')
    expect(await screen.findByText('Supplier not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to suppliers' })).toHaveAttribute('href', '/suppliers')
  })

  it('shows Supplier not found for a non-numeric id', async () => {
    useListHandler()
    server.use(
      http.get(`${API}/suppliers/-1`, () => HttpResponse.json({ title: 'Not Found', detail: 'nope' }, { status: 404 })),
    )
    renderRoute('/suppliers/abc/edit')
    expect(await screen.findByText('Supplier not found')).toBeInTheDocument()
  })

  it('asks for confirmation when leaving with unsaved changes', async () => {
    useListHandler()
    const { user, router } = renderRoute('/suppliers/new')
    await user.type(await screen.findByLabelText('Legal name'), 'X')
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: 'Suppliers' }),
    )
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/suppliers/new')
    await user.click(screen.getByRole('button', { name: 'Leave' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/suppliers'))
  })

  it('shows Unsaved changes after editing and keeps Active in the summary', async () => {
    useListHandler()
    const { user } = renderRoute('/suppliers/new')
    await user.type(await screen.findByLabelText('Legal name'), 'X')
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()
    expect(
      within(screen.getByRole('complementary', { name: 'Summary' })).getByRole('switch', { name: 'Active' }),
    ).toBeInTheDocument()
  })

  it('shows the form skeleton while the supplier loads', async () => {
    useListHandler()
    server.use(
      http.get(`${API}/suppliers/7`, async () => {
        await delay(100)
        return HttpResponse.json(supplierFixture({ id: 7 }))
      }),
    )
    renderRoute('/suppliers/7/edit')
    expect(await screen.findAllByTestId('form-skeleton-section')).not.toHaveLength(0)
    await waitFor(() => expect(screen.queryByTestId('form-skeleton-section')).not.toBeInTheDocument())
  })

  it('goes back to the list on Cancel through the unsaved-changes guard', async () => {
    useListHandler()
    const { user, router } = renderRoute('/suppliers/new')
    await user.type(await screen.findByLabelText('Legal name'), 'X')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Leave' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/suppliers'))
  })
})
