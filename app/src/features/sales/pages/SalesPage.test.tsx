import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'
import type { Sale, SaleSummary } from '../types'

const summary = (overrides: Partial<SaleSummary> = {}): SaleSummary => ({
  id: 7, number: 12, status: 'COMPLETED', total: 39.8, paymentMethod: 'PIX', itemCount: 2, createdByName: 'Bruno Caixa',
  createdAt: '2026-10-30T15:00:00Z', ...overrides,
})

const detail = (overrides: Partial<Sale> = {}): Sale => ({
  id: 7, number: 12, status: 'COMPLETED', subtotal: 41.8, itemsDiscount: 2, discount: 0, total: 39.8, paymentMethod: 'PIX',
  amountPaid: 39.8, change: 0, note: null, createdByName: 'Bruno Caixa', createdAt: '2026-10-30T15:00:00Z', cancelledAt: null,
  cancelledByName: null, cancelReason: null,
  items: [
    { id: 1, productId: 1, sku: 'C-1', name: 'Coffee', unitOfMeasure: 'UNIT', quantity: 2, unitPrice: 19.9, discount: 2, total: 37.8 },
    { id: 2, productId: null, sku: 'T-1', name: 'Old tea', unitOfMeasure: 'UNIT', quantity: 1, unitPrice: 2, discount: 0, total: 2 },
  ],
  ...overrides,
})

function mockSales() {
  const queries = vi.fn()
  const cancelled = vi.fn()
  let current = detail()
  server.use(
    http.get(`${API}/sales/page`, ({ request }) => {
      queries(Object.fromEntries(new URL(request.url).searchParams))
      return HttpResponse.json({
        content: [summary({ status: current.status }), summary({ id: 6, number: 11, status: 'CANCELLED', paymentMethod: 'CASH', itemCount: 1 })],
        page: 0, size: 20, totalElements: 2, totalPages: 1, last: true,
      })
    }),
    http.get(`${API}/sales/summary`, () => HttpResponse.json({ sales: 1, revenue: 39.8, averageTicket: 39.8, cancelled: 1 })),
    http.get(`${API}/sales/7`, () => HttpResponse.json(current)),
    http.post(`${API}/sales/7/cancel`, async ({ request }) => {
      cancelled(await request.json())
      current = detail({ status: 'CANCELLED', cancelledAt: '2026-10-30T16:00:00Z', cancelledByName: 'Ana Admin', cancelReason: 'Gave up' })
      return HttpResponse.json(current)
    }),
  )
  return { queries, cancelled }
}

describe('SalesPage', () => {
  it("lists today's sales with their totals and filters through the URL", async () => {
    const { queries } = mockSales()
    const { user, router } = renderRoute('/sales', { role: 'CASHIER' })

    const list = await screen.findByRole('list', { name: 'Sales' })
    const rows = within(list).getAllByRole('button')
    expect(rows[0]).toHaveAccessibleName('Open sale #12')
    expect(rows[0]).toHaveTextContent('2 items · Pix · by Bruno Caixa')
    expect(rows[1]).toHaveTextContent('Cancelled')
    await waitFor(() => expect(screen.getByText('Revenue').parentElement?.parentElement).toHaveTextContent('$39.80'))
    // Today by default: one local day.
    const first = queries.mock.calls[0][0] as Record<string, string>
    expect(Math.round((new Date(first.to).getTime() - new Date(first.from).getTime()) / 86_400_000)).toBe(1)

    await user.click(screen.getByRole('tab', { name: 'Cancelled' }))
    await waitFor(() => expect(router.state.location.search).toBe('?status=CANCELLED'))
    await waitFor(() => expect(queries).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'CANCELLED' })))
  })

  it('shows a sale without a cancel button for a cashier', async () => {
    mockSales()
    const { user } = renderRoute('/sales', { role: 'CASHIER' })
    await user.click(await screen.findByRole('button', { name: 'Open sale #12' }))

    const dialog = await screen.findByRole('dialog', { name: /Sale #12/ })
    expect(await within(dialog).findByText('Coffee')).toBeInTheDocument()
    expect(within(dialog).getByText(/deleted product/)).toBeInTheDocument()
    // The coffee line's discount, and the same amount in the totals.
    expect(within(dialog).getAllByText('−$2.00')).toHaveLength(2)
    expect(within(dialog).queryByRole('button', { name: 'Cancel sale' })).not.toBeInTheDocument()
  })

  it('lets a manager cancel a sale with a reason', async () => {
    const { cancelled } = mockSales()
    const { user } = renderRoute('/sales', { role: 'MANAGER' })
    await user.click(await screen.findByRole('button', { name: 'Open sale #12' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(await within(dialog).findByRole('button', { name: 'Cancel sale' }))

    await user.click(within(dialog).getByRole('button', { name: 'Cancel sale' }))
    expect(await within(dialog).findByText('Tell why the sale is cancelled')).toBeInTheDocument()
    expect(cancelled).not.toHaveBeenCalled()

    await user.type(within(dialog).getByLabelText('Reason'), 'Gave up')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel sale' }))
    expect(await screen.findByText('Sale #12 cancelled')).toBeInTheDocument()
    expect(cancelled).toHaveBeenCalledWith({ reason: 'Gave up' })
    expect(await within(dialog).findByText(/Cancelled by Ana Admin/)).toBeInTheDocument()
  })

  it('is not open to the stock team', async () => {
    mockSales()
    renderRoute('/sales', { role: 'STOCK' })
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Sales' })).not.toBeInTheDocument())
  })
})
