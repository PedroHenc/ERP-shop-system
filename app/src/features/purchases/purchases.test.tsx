import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { productFixture, productPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'
import type { PurchaseOrder, ReorderSuggestion } from './types'

const suppliers = [
  { id: 3, version: 0, legalName: 'Distribuidora Ltda', tradeName: 'Distri', taxId: null, email: null, phone: null, active: true },
]

const tea: ReorderSuggestion = {
  productId: 2,
  sku: 'TEA-1',
  name: 'Tea',
  unitOfMeasure: 'UNIT',
  stockQuantity: 2,
  minimumStock: 1,
  reorderPoint: 4,
  onOrder: 0,
  suggestedQuantity: 6,
  costPrice: 3,
}

function orderFixture(overrides: Partial<PurchaseOrder> = {}): PurchaseOrder {
  return {
    id: 7,
    number: 12,
    status: 'ORDERED',
    supplierId: 3,
    supplierName: 'Distri',
    notes: 'Deliver on Monday',
    total: 80,
    receivedTotal: null,
    createdByName: 'Ana',
    createdAt: '2026-11-01T10:00:00Z',
    orderedAt: '2026-11-01T11:00:00Z',
    receivedAt: null,
    receivedByName: null,
    cancelledAt: null,
    items: [
      {
        id: 70,
        productId: 1,
        sku: 'COF-1',
        name: 'Coffee',
        unitOfMeasure: 'UNIT',
        quantity: 10,
        unitCost: 8,
        total: 80,
        receivedQuantity: null,
        receivedUnitCost: null,
        productStock: 10,
        productCost: 6,
      },
    ],
    ...overrides,
  }
}

function useHandlers({ suggestions = [tea], order = orderFixture() }: { suggestions?: ReorderSuggestion[]; order?: PurchaseOrder } = {}) {
  server.use(
    http.get(`${API}/purchase-orders/suggestions`, () => HttpResponse.json(suggestions)),
    http.get(`${API}/suppliers/page`, () => HttpResponse.json({ content: suppliers, totalElements: 1, totalPages: 1 })),
    http.get(`${API}/purchase-orders/page`, () =>
      HttpResponse.json({
        content: [
          { id: 7, number: 12, status: 'ORDERED', supplierId: 3, supplierName: 'Distri', items: 1, total: 80, receivedTotal: null, createdAt: '2026-11-01T10:00:00Z', receivedAt: null },
          { id: 6, number: 11, status: 'RECEIVED', supplierId: 3, supplierName: 'Distri', items: 3, total: 50, receivedTotal: 45.5, createdAt: '2026-10-20T10:00:00Z', receivedAt: '2026-10-22T10:00:00Z' },
        ],
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
      }),
    ),
    http.get(`${API}/purchase-orders/${order.id}`, () => HttpResponse.json(order)),
  )
}

describe('Purchases list', () => {
  it('shows the orders and the products to reorder', async () => {
    useHandlers()
    renderRoute('/purchases')
    const reorder = await screen.findByRole('region', { name: '1 product to reorder' })
    expect(reorder).toHaveTextContent('Tea (2 unit)')
    expect(within(reorder).getByRole('link', { name: 'Create reorder' })).toHaveAttribute('href', '/purchases/new?reorder=1')
    const list = await screen.findByRole('list', { name: 'Purchase orders' })
    expect(within(list).getByRole('link', { name: /Order #12/ })).toHaveAttribute('href', '/purchases/7')
    // A received order shows what arrived.
    expect(within(list).getByRole('link', { name: /Order #11/ })).toHaveTextContent('$45.50')
    expect(screen.getByRole('link', { name: 'New order' })).toBeInTheDocument()
  })

  it('lets the stock team see the orders but not create them', async () => {
    useHandlers()
    renderRoute('/purchases', { role: 'STOCK' })
    await screen.findByRole('list', { name: 'Purchase orders' })
    expect(screen.queryByRole('link', { name: 'New order' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create reorder' })).not.toBeInTheDocument()
  })

  it('is not for cashiers', async () => {
    useHandlers()
    renderRoute('/purchases', { role: 'CASHIER' })
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Purchases' })).not.toBeInTheDocument())
  })
})

describe('New purchase order', () => {
  it('starts from the reorder suggestions, then saves and marks it sent', async () => {
    useHandlers()
    const created = vi.fn()
    const sent = vi.fn()
    server.use(
      http.post(`${API}/purchase-orders`, async ({ request }) => {
        created(await request.json())
        return HttpResponse.json(orderFixture({ id: 9, number: 13, status: 'DRAFT' }), { status: 201 })
      }),
      http.post(`${API}/purchase-orders/9/send`, () => {
        sent()
        return HttpResponse.json(orderFixture({ id: 9, number: 13, status: 'ORDERED' }))
      }),
      http.get(`${API}/purchase-orders/9`, () => HttpResponse.json(orderFixture({ id: 9, number: 13, status: 'ORDERED' }))),
    )
    const { user, router } = renderRoute('/purchases/new?reorder=1')
    expect(await screen.findByLabelText('Quantity of Tea')).toHaveValue('6')
    expect(screen.getByLabelText('Unit cost of Tea')).toHaveValue('3')
    expect(screen.getByText('$18.00', { selector: 'span.text-2xl' })).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: 'Supplier' }))
    await user.click(await screen.findByRole('option', { name: 'Distri' }))
    await user.clear(screen.getByLabelText('Quantity of Tea'))
    await user.type(screen.getByLabelText('Quantity of Tea'), '10')
    await user.click(screen.getByRole('button', { name: 'Save and mark as sent' }))

    await waitFor(() => expect(sent).toHaveBeenCalled())
    expect(created).toHaveBeenCalledWith({ supplierId: 3, notes: null, items: [{ productId: 2, quantity: 10, unitCost: 3 }] })
    await waitFor(() => expect(router.state.location.pathname).toBe('/purchases/9'))
  })

  it('adds products from the search and says what is missing', async () => {
    useHandlers({ suggestions: [] })
    server.use(
      http.get(`${API}/products/page`, () =>
        HttpResponse.json(productPageFixture([productFixture({ id: 1, name: 'Coffee', sku: 'COF-1', costPrice: 6.5 })])),
      ),
    )
    const posted = vi.fn()
    server.use(http.post(`${API}/purchase-orders`, () => posted()))
    const { user } = renderRoute('/purchases/new')
    await user.click(await screen.findByRole('button', { name: 'Save draft' }))
    expect(await screen.findAllByText('Choose the supplier')).not.toHaveLength(0)
    expect(screen.getByText('Add at least one product')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: /Add a product/ }), 'cof')
    await user.click(await screen.findByRole('button', { name: 'Add Coffee' }))
    expect(screen.getByLabelText('Quantity of Coffee')).toHaveValue('1')
    expect(screen.getByLabelText('Unit cost of Coffee')).toHaveValue('6.5')
    await user.clear(screen.getByLabelText('Quantity of Coffee'))
    await user.type(screen.getByLabelText('Quantity of Coffee'), '1,5')
    await user.click(screen.getByRole('button', { name: 'Save draft' }))
    expect(await screen.findByText('Whole units only')).toBeInTheDocument()
    expect(posted).not.toHaveBeenCalled()
  })
})

describe('Purchase order', () => {
  it('receives what arrived, showing the cost it averages to', async () => {
    useHandlers()
    const received = vi.fn()
    server.use(
      http.post(`${API}/purchase-orders/7/receive`, async ({ request }) => {
        received(await request.json())
        return HttpResponse.json(orderFixture({ status: 'RECEIVED', receivedTotal: 72, receivedAt: '2026-11-02T10:00:00Z' }))
      }),
    )
    const { user } = renderRoute('/purchases/7')
    expect(await screen.findByRole('heading', { level: 1, name: 'Order #12' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Receive' }))
    const dialog = await screen.findByRole('dialog', { name: 'Receive order #12' })
    await user.clear(within(dialog).getByLabelText('Arrived of Coffee'))
    await user.type(within(dialog).getByLabelText('Arrived of Coffee'), '8')
    await user.clear(within(dialog).getByLabelText('Cost paid for Coffee'))
    await user.type(within(dialog).getByLabelText('Cost paid for Coffee'), '9')
    // (10 × 6.00 + 8 × 9.00) ÷ 18 = 7.33
    expect(within(dialog).getByText('$7.33')).toBeInTheDocument()
    expect(within(dialog).getByText(/stock becomes 18 unit/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Put into stock' }))

    await waitFor(() =>
      expect(received).toHaveBeenCalledWith({ items: [{ itemId: 70, receivedQuantity: 8, unitCost: 9 }], updateCosts: true }),
    )
    expect(await screen.findByText('Order #12 received into stock')).toBeInTheDocument()
  })

  it('copies the order as text for the supplier', async () => {
    useHandlers()
    const { user } = renderRoute('/purchases/7')
    await user.click(await screen.findByRole('button', { name: 'Copy order text' }))
    expect(await screen.findByText(/Order text copied/)).toBeInTheDocument()
    // user-event provides the clipboard.
    const text = await navigator.clipboard.readText()
    expect(text).toContain('Purchase order #12 — Corner Shop')
    expect(text).toContain('Supplier: Distri')
    expect(text).toContain('• 10 unit — Coffee (COF-1)')
    expect(text).toContain('Notes: Deliver on Monday')
  })

  it('cancels after confirming', async () => {
    useHandlers()
    const cancelled = vi.fn()
    server.use(
      http.post(`${API}/purchase-orders/7/cancel`, () => {
        cancelled()
        return HttpResponse.json(orderFixture({ status: 'CANCELLED', cancelledAt: '2026-11-02T10:00:00Z' }))
      }),
    )
    const { user } = renderRoute('/purchases/7')
    await user.click(await screen.findByRole('button', { name: 'Cancel order' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Cancel order #12?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel order' }))
    await waitFor(() => expect(cancelled).toHaveBeenCalled())
  })

  it('shows a draft read-only to the stock team, who can still receive it', async () => {
    useHandlers({ order: orderFixture({ status: 'DRAFT', orderedAt: null }) })
    renderRoute('/purchases/7', { role: 'STOCK' })
    expect(await screen.findByRole('button', { name: 'Receive' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Quantity of Coffee')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel order' })).not.toBeInTheDocument()
  })

  it('edits a draft for managers', async () => {
    useHandlers({ order: orderFixture({ status: 'DRAFT', orderedAt: null }) })
    renderRoute('/purchases/7', { role: 'MANAGER' })
    expect(await screen.findByLabelText('Quantity of Coffee')).toHaveValue('10')
    expect(screen.getByRole('button', { name: 'Save and mark as sent' })).toBeInTheDocument()
  })
})
