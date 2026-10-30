import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { productFixture, stockMovementFixture, stockMovementPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function mockMovements() {
  const queries = vi.fn()
  server.use(
    http.get(`${API}/stock-movements/page`, ({ request }) => {
      queries(Object.fromEntries(new URL(request.url).searchParams))
      return HttpResponse.json(
        stockMovementPageFixture([
          stockMovementFixture({ id: 2, type: 'EXIT', reason: 'SALE', quantity: -2, balanceAfter: 13, note: 'Order 42' }),
          stockMovementFixture({ id: 1, type: 'INITIAL', reason: 'INITIAL_STOCK', quantity: 15, balanceAfter: 15, createdByName: null }),
        ]),
      )
    }),
    http.get(`${API}/products/7`, () => HttpResponse.json(productFixture({ id: 7, name: 'Granola' }))),
  )
  return queries
}

describe('StockMovementsPage', () => {
  it('lists movements newest first with reason, author, signed quantity and balance', async () => {
    mockMovements()
    renderRoute('/stock')

    expect(await screen.findByRole('heading', { level: 1, name: 'Stock' })).toBeInTheDocument()
    const rows = within(await screen.findByRole('list', { name: 'Stock movements' })).getAllByRole('listitem')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Espresso Beans')
    expect(rows[0]).toHaveTextContent('Exit · Sale · by Ana Admin')
    expect(rows[0]).toHaveTextContent('−2 unit')
    expect(rows[0]).toHaveTextContent('Balance 13 unit')
    expect(rows[0]).toHaveTextContent('Order 42')
    expect(rows[1]).toHaveTextContent('Initial stock · automatic')
    expect(rows[1]).toHaveTextContent('+15 unit')
    expect(within(rows[0]).getByRole('link', { name: 'Espresso Beans' })).toHaveAttribute('href', '/products/1/edit')
  })

  it('filters by type and period through the URL', async () => {
    const queries = mockMovements()
    const { user, router } = renderRoute('/stock')
    await screen.findByRole('list', { name: 'Stock movements' })

    await user.click(screen.getByRole('tab', { name: 'Exits' }))
    await waitFor(() => expect(router.state.location.search).toBe('?type=EXIT'))
    await waitFor(() => expect(queries).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'EXIT' })))

    await user.click(screen.getByRole('combobox', { name: 'Period' }))
    await user.click(await screen.findByRole('option', { name: 'Last 7 days' }))
    await waitFor(() => expect(router.state.location.search).toBe('?type=EXIT&period=7d'))
    await waitFor(() => expect(queries).toHaveBeenLastCalledWith(expect.objectContaining({ from: expect.any(String) })))
  })

  it('narrows to one product from its history link and clears it', async () => {
    const queries = mockMovements()
    const { user, router } = renderRoute('/stock?productId=7')

    expect(await screen.findByText('Product: Granola')).toBeInTheDocument()
    await waitFor(() => expect(queries).toHaveBeenLastCalledWith(expect.objectContaining({ productId: '7' })))
    await user.click(screen.getByRole('button', { name: 'Show every product' }))
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('is not available to a cashier', async () => {
    mockMovements()
    renderRoute('/stock', { role: 'CASHIER' })
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Stock movements' })).not.toBeInTheDocument())
    expect(screen.queryByRole('heading', { level: 1, name: 'Stock' })).not.toBeInTheDocument()
  })
})
