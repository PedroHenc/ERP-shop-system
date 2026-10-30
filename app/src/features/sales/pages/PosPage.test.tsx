import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { productFixture, productPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'
import type { Sale } from '../types'

const coffee = productFixture({ id: 1, sku: 'C-1', barcode: '7891234567895', name: 'Coffee', price: 19.9, stockQuantity: 10 })
const granola = productFixture({ id: 2, sku: 'G-1', barcode: null, name: 'Granola', price: 30, unitOfMeasure: 'KILOGRAM', stockQuantity: 2 })

function mockCatalog() {
  const searches: string[] = []
  server.use(
    http.get(`${API}/products/page`, ({ request }) => {
      const term = (new URL(request.url).searchParams.get('search') ?? '').toLowerCase()
      searches.push(term)
      const matches = [coffee, granola].filter((p) => p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.barcode === term)
      return HttpResponse.json(productPageFixture(matches))
    }),
  )
  return searches
}

function sale(overrides: Partial<Sale> = {}): Sale {
  return {
    id: 9, number: 12, status: 'COMPLETED', subtotal: 39.8, itemsDiscount: 0, discount: 0, total: 39.8, paymentMethod: 'CASH',
    amountPaid: 50, change: 10.2, note: null, createdByName: 'Ana Admin', createdAt: '2026-10-30T15:00:00Z', cancelledAt: null,
    cancelledByName: null, cancelReason: null, items: [], ...overrides,
  }
}

describe('PosPage', () => {
  it('adds a scanned barcode with Enter, takes cash and shows the change', async () => {
    mockCatalog()
    const posted = vi.fn()
    server.use(
      http.post(`${API}/sales`, async ({ request }) => {
        posted(await request.json())
        return HttpResponse.json(sale(), { status: 201 })
      }),
    )
    const { user } = renderRoute('/pos', { role: 'CASHIER' })

    const search = await screen.findByRole('searchbox', { name: 'Search by name, SKU or barcode' })
    expect(search).toHaveFocus()
    // A reader types the code and presses Enter, twice: one line of 2.
    await user.type(search, '7891234567895{Enter}')
    await user.type(search, '7891234567895{Enter}')
    const cart = await screen.findByRole('list', { name: 'Sale' })
    await waitFor(() => expect(within(cart).getByLabelText('Quantity of Coffee')).toHaveValue('2'))
    expect(screen.getByRole('button', { name: /Close sale · \$39\.80/ })).toBeInTheDocument()

    const close = screen.getByRole('button', { name: /Close sale/ })
    expect(close).toBeDisabled()
    await user.type(screen.getByLabelText('Amount received'), '50')
    expect(screen.getByText('$10.20')).toBeInTheDocument()
    await user.click(close)

    expect(await screen.findByRole('dialog', { name: 'Sale #12 closed' })).toBeInTheDocument()
    expect(posted).toHaveBeenCalledWith({ items: [{ productId: 1, quantity: 2 }], paymentMethod: 'CASH', amountPaid: 50 })
    await user.click(screen.getByRole('button', { name: 'New sale' }))
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Sale' })).not.toBeInTheDocument())
    expect(screen.getByText('The cart is empty.')).toBeInTheDocument()
  })

  it('searches while typing, applies a discount and pays by Pix', async () => {
    mockCatalog()
    const posted = vi.fn()
    server.use(
      http.post(`${API}/sales`, async ({ request }) => {
        posted(await request.json())
        return HttpResponse.json(sale({ paymentMethod: 'PIX' }), { status: 201 })
      }),
    )
    const { user } = renderRoute('/pos', { role: 'CASHIER' })
    await user.type(await screen.findByRole('searchbox'), 'gran')
    await user.click(await screen.findByRole('button', { name: 'Add Granola' }))
    const quantity = await screen.findByLabelText('Quantity of Granola')
    await user.clear(quantity)
    await user.type(quantity, '1,5')
    await user.type(screen.getByLabelText('Discount'), '5')
    await user.click(screen.getByRole('tab', { name: 'Pix' }))
    expect(screen.queryByLabelText('Amount received')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Close sale · \$40\.00/ }))

    await waitFor(() =>
      expect(posted).toHaveBeenCalledWith({ items: [{ productId: 2, quantity: 1.5 }], discount: 5, paymentMethod: 'PIX' }),
    )
  })

  it('blocks a line above the stock or a fraction of a whole unit', async () => {
    mockCatalog()
    const { user } = renderRoute('/pos', { role: 'CASHIER' })
    await user.type(await screen.findByRole('searchbox'), 'C-1{Enter}')
    const quantity = await screen.findByLabelText('Quantity of Coffee')
    await user.clear(quantity)
    await user.type(quantity, '1,5')
    expect(await screen.findByText('Sold in whole units')).toBeInTheDocument()
    await user.clear(quantity)
    await user.type(quantity, '11')
    expect(await screen.findByText('Only 10 unit in stock')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Debit' }))
    expect(screen.getByRole('button', { name: /Close sale/ })).toBeDisabled()
  })

  it('shows why the API refused the sale and keeps the cart', async () => {
    mockCatalog()
    server.use(
      http.post(`${API}/sales`, () =>
        HttpResponse.json(
          { title: 'Bad Request', detail: 'Validation failed', errors: { items: 'Not enough stock of Coffee: 0 available' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/pos', { role: 'CASHIER' })
    await user.type(await screen.findByRole('searchbox'), 'C-1{Enter}')
    await screen.findByLabelText('Quantity of Coffee')
    await user.click(screen.getByRole('tab', { name: 'Credit' }))
    await user.click(screen.getByRole('button', { name: /Close sale/ }))

    expect(await screen.findByText('Not enough stock of Coffee: 0 available')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantity of Coffee')).toBeInTheDocument()
  })

  it('is not open to the stock team', async () => {
    mockCatalog()
    renderRoute('/pos', { role: 'STOCK' })
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Point of sale' })).not.toBeInTheDocument())
  })
})
