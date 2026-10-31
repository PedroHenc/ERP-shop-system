import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { productFixture, productPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function useBrandsHandler() {
  server.use(http.get(`${API}/brands`, () => HttpResponse.json([{ id: 1, name: 'Acme' }])))
}

describe('ProductListPage', () => {
  it('lists products from the API with formatted price', async () => {
    useBrandsHandler()
    server.use(
      http.get(`${API}/products/page`, () =>
        HttpResponse.json(productPageFixture([productFixture({ price: 10, name: 'Tea' })])),
      ),
    )
    renderRoute('/products')
    const row = (await screen.findByText('Tea')).closest('tr') as HTMLElement
    expect(within(row).getByText('$10.00')).toBeInTheDocument()
    expect(within(row).getByText('Active')).toBeInTheDocument()
  })

  it('shows Low stock badge when stockQuantity <= minimumStock', async () => {
    useBrandsHandler()
    server.use(
      http.get(`${API}/products/page`, () =>
        HttpResponse.json(
          productPageFixture([
            productFixture({ id: 1, name: 'Low one', stockQuantity: 1, minimumStock: 2 }),
            productFixture({ id: 2, name: 'Fine one', stockQuantity: 50, minimumStock: 2 }),
          ]),
        ),
      ),
    )
    renderRoute('/products')
    const low = (await screen.findByText('Low one')).closest('tr') as HTMLElement
    const fine = (await screen.findByText('Fine one')).closest('tr') as HTMLElement
    expect(within(low).getByText('Low stock')).toBeInTheDocument()
    expect(within(fine).queryByText('Low stock')).not.toBeInTheDocument()
  })

  it('shows Out of stock (destructive) at zero stock and Low stock (warning) above zero up to the minimum', async () => {
    useBrandsHandler()
    server.use(
      http.get(`${API}/products/page`, () =>
        HttpResponse.json(
          productPageFixture([
            productFixture({ id: 1, name: 'Empty one', stockQuantity: 0, minimumStock: 2 }),
            productFixture({ id: 2, name: 'Low one', stockQuantity: 2, minimumStock: 2 }),
          ]),
        ),
      ),
    )
    renderRoute('/products')
    const empty = (await screen.findByText('Empty one')).closest('tr') as HTMLElement
    const low = (await screen.findByText('Low one')).closest('tr') as HTMLElement
    expect(within(empty).getByText('Out of stock')).toHaveAttribute('data-variant', 'destructive')
    expect(within(empty).queryByText('Low stock')).not.toBeInTheDocument()
    expect(within(low).getByText('Low stock')).toHaveAttribute('data-variant', 'warning')
    expect(within(low).queryByText('Out of stock')).not.toBeInTheDocument()
  })

  it('updates the URL and refetches when searching by name', async () => {
    useBrandsHandler()
    const seen = vi.fn()
    server.use(
      http.get(`${API}/products/page`, ({ request }) => {
        seen(new URL(request.url).searchParams.get('name'))
        return HttpResponse.json(productPageFixture([productFixture()]))
      }),
    )
    const { user, router } = renderRoute('/products')
    await screen.findByText('Espresso Beans')
    await user.type(screen.getByRole('searchbox', { name: 'Search products' }), 'ab')
    await waitFor(() => expect(router.state.location.search).toContain('name=ab'))
    await waitFor(() => expect(seen).toHaveBeenCalledWith('ab'))
  })

  it('shows the first-use empty state with New product for ADMIN', async () => {
    useBrandsHandler()
    server.use(http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([]))))
    renderRoute('/products')
    expect(await screen.findByText('No products yet')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'New product' })).toHaveLength(2)
  })

  it('hides New product from CASHIER on the empty state', async () => {
    useBrandsHandler()
    server.use(http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([]))))
    renderRoute('/products', { role: 'CASHIER' })
    expect(await screen.findByText('No products yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New product' })).not.toBeInTheDocument()
  })

  it('shows the no-results state with Clear filters when a filter is active', async () => {
    useBrandsHandler()
    server.use(http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([]))))
    const { user, router } = renderRoute('/products?name=zzz')
    expect(await screen.findByText('No results for these filters')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(router.state.location.search).not.toContain('name='))
  })

  it('switches to the Inactive tab through the URL', async () => {
    useBrandsHandler()
    server.use(http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture()]))))
    const { user, router } = renderRoute('/products')
    await screen.findByText('Espresso Beans')
    await user.click(screen.getByRole('tab', { name: 'Inactive' }))
    await waitFor(() => expect(router.state.location.search).toContain('active=false'))
  })

  it('popover Clear removes only the secondary filters, keeping search and status tab', async () => {
    useBrandsHandler()
    server.use(http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture()]))))
    const { user, router } = renderRoute('/products?name=bean&active=false&sku=AB&category=Coffee&brandId=1')
    await screen.findByText('Espresso Beans')
    await user.click(screen.getByRole('button', { name: 'Filters (3)' }))
    await user.click(await screen.findByRole('button', { name: 'Clear' }))
    await waitFor(() => expect(router.state.location.search).not.toContain('sku='))
    const search = new URLSearchParams(router.state.location.search)
    expect(search.get('name')).toBe('bean')
    expect(search.get('active')).toBe('false')
    expect(search.get('category')).toBeNull()
    expect(search.get('brandId')).toBeNull()
    expect(screen.getByRole('searchbox', { name: 'Search products' })).toHaveValue('bean')
    expect(screen.getByRole('tab', { name: /Inactive/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('counts secondary filters on the Filters button', async () => {
    useBrandsHandler()
    server.use(http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture()]))))
    const { user } = renderRoute('/products')
    await screen.findByText('Espresso Beans')
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    await user.type(await screen.findByRole('textbox', { name: 'SKU' }), 'AB')
    expect(await screen.findByRole('button', { name: 'Filters (1)' })).toBeInTheDocument()
  })

  it('shows name and SKU in one Product cell and no separate SKU column', async () => {
    useBrandsHandler()
    server.use(http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture()]))))
    renderRoute('/products')
    const row = (await screen.findByText('Espresso Beans')).closest('tr') as HTMLElement
    const cell = within(row).getByText('Espresso Beans').closest('td') as HTMLElement
    expect(within(cell).getByText('SKU-001')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Product/ })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: /^SKU/ })).not.toBeInTheDocument()
  })

  it('opens the edit page when a row is clicked', async () => {
    useBrandsHandler()
    server.use(http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture()]))))
    const { user, router } = renderRoute('/products')
    const row = (await screen.findByText('Espresso Beans')).closest('tr') as HTMLElement
    await user.click(within(row).getByText('Acme'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/1/edit'))
  })

  it('shows error state with Try again', async () => {
    useBrandsHandler()
    let calls = 0
    server.use(
      http.get(`${API}/products/page`, () => {
        calls += 1
        return calls === 1
          ? HttpResponse.json({ title: 'x', detail: 'boom' }, { status: 500 })
          : HttpResponse.json(productPageFixture([productFixture()]))
      }),
    )
    const { user } = renderRoute('/products')
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Espresso Beans')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('goes back one page after deleting the last item of the last page', async () => {
    useBrandsHandler()
    const deleted = vi.fn()
    server.use(
      http.get(`${API}/products/page`, () =>
        HttpResponse.json(
          productPageFixture([productFixture({ id: 7, name: 'Last one' })], {
            page: 2,
            totalElements: 41,
            totalPages: 3,
            last: true,
          }),
        ),
      ),
      http.delete(`${API}/products/7`, () => {
        deleted()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user, router } = renderRoute('/products?page=2')
    await screen.findByText('Last one')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/Last one/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(deleted).toHaveBeenCalled())
    await waitFor(() => expect(router.state.location.search).toContain('page=1'))
  })
})

describe('ProductListPage margin', () => {
  it('shows each product margin to those who manage the catalog, not to cashiers', async () => {
    server.use(
      http.get(`${API}/brands`, () => HttpResponse.json([])),
      http.get(`${API}/products/page`, () =>
        HttpResponse.json(
          productPageFixture([
            productFixture({ id: 1, name: 'Tea', price: 10, costPrice: 6 }),
            productFixture({ id: 2, name: 'Loss', price: 10, costPrice: 12 }),
            productFixture({ id: 3, name: 'Unknown', price: 10, costPrice: null }),
          ]),
        ),
      ),
    )
    renderRoute('/products')
    const tea = (await screen.findByText('Tea')).closest('tr') as HTMLElement
    expect(within(tea).getByText('40%')).toBeInTheDocument()
    expect(within(screen.getByText('Loss').closest('tr') as HTMLElement).getByText('-20%')).toBeInTheDocument()
    expect(within(screen.getByText('Unknown').closest('tr') as HTMLElement).getByText('—')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Margin' })).toBeInTheDocument()
  })

  it('has no margin column for a cashier', async () => {
    server.use(
      http.get(`${API}/brands`, () => HttpResponse.json([])),
      http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture({ name: 'Tea' })]))),
    )
    renderRoute('/products', { role: 'CASHIER' })
    await screen.findByText('Tea')
    expect(screen.queryByRole('columnheader', { name: 'Margin' })).not.toBeInTheDocument()
  })
})
