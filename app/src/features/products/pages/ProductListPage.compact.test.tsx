import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { productFixture, productPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

vi.mock('@/hooks/use-compact', () => ({ useIsCompact: () => true }))

function useHandlers(products = [productFixture()]) {
  server.use(
    http.get(`${API}/brands`, () => HttpResponse.json([{ id: 1, name: 'Acme' }])),
    http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture(products))),
  )
}

describe('ProductListPage (compact)', () => {
  it('renders one list item per product instead of a table, and opens the product on click', async () => {
    useHandlers([productFixture({ id: 1, name: 'Tea' }), productFixture({ id: 2, name: 'Coffee' })])
    const { user, router } = renderRoute('/products')
    const list = (await screen.findByText('Tea')).closest('ul') as HTMLElement
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    await user.click(within(list).getByText('Coffee'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/2/edit'))
  })

  it('keeps the row actions on the cards', async () => {
    useHandlers()
    const { user } = renderRoute('/products')
    await screen.findByText('Espresso Beans')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows the no-results state with Clear filters, without a skeleton', async () => {
    useHandlers([])
    renderRoute('/products?sku=nope')
    expect(await screen.findByText('No results for these filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull()
  })
})
