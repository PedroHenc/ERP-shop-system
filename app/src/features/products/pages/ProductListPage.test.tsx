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

  it('updates the URL and refetches when typing a name filter', async () => {
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
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'ab')
    await waitFor(() => expect(router.state.location.search).toContain('name=ab'))
    await waitFor(() => expect(seen).toHaveBeenCalledWith('ab'))
  })

  it('shows empty state', async () => {
    useBrandsHandler()
    server.use(http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([]))))
    renderRoute('/products')
    expect(await screen.findByText('No products found')).toBeInTheDocument()
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
