import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { supplierFixture, supplierPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

describe('SupplierListPage', () => {
  it('lists suppliers with trade name under legal name', async () => {
    server.use(
      http.get(`${API}/suppliers/page`, () =>
        HttpResponse.json(supplierPageFixture([supplierFixture({ legalName: 'Acme Ltda', tradeName: 'Acme' })])),
      ),
    )
    renderRoute('/suppliers')
    const row = (await screen.findByText('Acme Ltda')).closest('tr') as HTMLElement
    expect(within(row).getByText('Acme')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Suppliers' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New supplier' })).toHaveAttribute('href', '/suppliers/new')
  })

  it('shows a dash for missing optional fields', async () => {
    server.use(
      http.get(`${API}/suppliers/page`, () =>
        HttpResponse.json(
          supplierPageFixture([supplierFixture({ legalName: 'Acme Ltda', tradeName: null, taxId: null, email: null, phone: null })]),
        ),
      ),
    )
    renderRoute('/suppliers')
    const row = (await screen.findByText('Acme Ltda')).closest('tr') as HTMLElement
    expect(within(row).getAllByText('—')).toHaveLength(3)
  })

  it('updates the URL when typing name and tax ID filters', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${API}/suppliers/page`, ({ request }) => {
        const search = new URL(request.url).searchParams
        seen(search.get('name'), search.get('taxId'))
        return HttpResponse.json(supplierPageFixture([supplierFixture()]))
      }),
    )
    const { user, router } = renderRoute('/suppliers')
    await screen.findByText('Acme Ltda')
    await user.type(screen.getByRole('searchbox', { name: 'Search suppliers' }), 'ac')
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.type(screen.getByRole('textbox', { name: 'Tax ID' }), '123')
    await waitFor(() => expect(router.state.location.search).toContain('name=ac'))
    await waitFor(() => expect(router.state.location.search).toContain('taxId=123'))
    await waitFor(() => expect(seen).toHaveBeenCalledWith('ac', '123'))
  })

  it('deactivates a supplier after confirmation', async () => {
    const patched = vi.fn()
    server.use(
      http.get(`${API}/suppliers/page`, () => HttpResponse.json(supplierPageFixture([supplierFixture({ id: 3 })]))),
      http.patch(`${API}/suppliers/3/status`, async ({ request }) => {
        patched(await request.json())
        return HttpResponse.json(supplierFixture({ id: 3, active: false }))
      }),
    )
    const { user } = renderRoute('/suppliers')
    await screen.findByText('Acme Ltda')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Deactivate' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(patched).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(patched).toHaveBeenCalledWith({ active: false }))
    expect(await screen.findByText('Supplier deactivated')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('activates an inactive supplier without confirmation', async () => {
    const patched = vi.fn()
    server.use(
      http.get(`${API}/suppliers/page`, () =>
        HttpResponse.json(supplierPageFixture([supplierFixture({ id: 3, active: false })])),
      ),
      http.patch(`${API}/suppliers/3/status`, async ({ request }) => {
        patched(await request.json())
        return HttpResponse.json(supplierFixture({ id: 3, active: true }))
      }),
    )
    const { user } = renderRoute('/suppliers')
    await screen.findByText('Acme Ltda')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Activate' }))
    await waitFor(() => expect(patched).toHaveBeenCalledWith({ active: true }))
    expect(await screen.findByText('Supplier activated')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows empty state', async () => {
    server.use(http.get(`${API}/suppliers/page`, () => HttpResponse.json(supplierPageFixture([]))))
    renderRoute('/suppliers')
    expect(await screen.findByText('No suppliers yet')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'New supplier' })).toHaveLength(2)
  })

  it('hides New supplier from STOCK on the empty state', async () => {
    server.use(http.get(`${API}/suppliers/page`, () => HttpResponse.json(supplierPageFixture([]))))
    renderRoute('/suppliers', { role: 'STOCK' })
    expect(await screen.findByText('No suppliers yet')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'New supplier' })).not.toBeInTheDocument()
  })

  it('shows the no-results state with Clear filters when a filter is active', async () => {
    server.use(http.get(`${API}/suppliers/page`, () => HttpResponse.json(supplierPageFixture([]))))
    const { user, router } = renderRoute('/suppliers?taxId=999')
    expect(await screen.findByText('No results for these filters')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(router.state.location.search).not.toContain('taxId='))
  })

  it('switches tabs through the URL and shows the total on the selected tab', async () => {
    server.use(http.get(`${API}/suppliers/page`, () => HttpResponse.json(supplierPageFixture([supplierFixture()]))))
    const { user, router } = renderRoute('/suppliers')
    await screen.findByText('Acme Ltda')
    const all = screen.getByRole('tab', { name: /All/ })
    expect(all).toHaveAttribute('aria-selected', 'true')
    expect(within(all).getByText('1')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Inactive' }))
    await waitFor(() => expect(router.state.location.search).toContain('active=false'))
    expect(screen.getByRole('tab', { name: /Inactive/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('counts the tax ID filter on the Filters button', async () => {
    server.use(http.get(`${API}/suppliers/page`, () => HttpResponse.json(supplierPageFixture([supplierFixture()]))))
    const { user } = renderRoute('/suppliers')
    await screen.findByText('Acme Ltda')
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.type(screen.getByRole('textbox', { name: 'Tax ID' }), '123')
    expect(await screen.findByRole('button', { name: 'Filters (1)' })).toBeInTheDocument()
  })

  it('shows error state with retry', async () => {
    server.use(http.get(`${API}/suppliers/page`, () => HttpResponse.json({ message: 'boom' }, { status: 500 })))
    renderRoute('/suppliers')
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
