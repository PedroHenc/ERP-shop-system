import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'
import type { StockReport } from '../types'

const report: StockReport = {
  totals: { movements: 5, entries: 1, exits: 3, adjustments: 1, valueIn: 100, valueOut: 140 },
  daily: [
    { date: '2026-10-28', valueIn: 100, valueOut: 60 },
    { date: '2026-10-29', valueIn: 0, valueOut: 50 },
    { date: '2026-10-30', valueIn: 0, valueOut: 30 },
  ],
  topExits: [
    { productId: 2, name: 'Coffee', sku: 'RPT-2', unitOfMeasure: 'UNIT', quantity: 2, value: 60 },
    { productId: 1, name: 'Granola', sku: 'RPT-1', unitOfMeasure: 'KILOGRAM', quantity: 5, value: 50 },
  ],
  losses: [],
  byReason: [{ type: 'EXIT', reason: 'SALE', movements: 2, value: 100 }],
  stockByCategory: [
    { category: 'Food', products: 1, value: 200, costValue: 120, withoutCost: 0 },
    { category: 'Drinks', products: 1, value: 150, costValue: 0, withoutCost: 1 },
  ],
}

function mockReport() {
  const queries = vi.fn()
  server.use(
    http.get(`${API}/reports/stock`, ({ request }) => {
      queries(Object.fromEntries(new URL(request.url).searchParams))
      return HttpResponse.json(report)
    }),
  )
  return queries
}

describe('ReportsPage', () => {
  it('shows the totals, rankings, categories and reasons of the last 30 days', async () => {
    const queries = mockReport()
    renderRoute('/reports?view=stock')

    expect(await screen.findByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument()
    expect(await screen.findByText('Value in')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Value out').parentElement?.parentElement).toHaveTextContent('$140.00'))
    expect(screen.getByText('1 in · 3 out · 1 adjustments')).toBeInTheDocument()
    // The KPI values count up on first load: wait for the final value.
    await waitFor(() => expect(screen.getByText('Stock value today').parentElement?.parentElement).toHaveTextContent('$350.00'))

    const top = screen.getByRole('region', { name: 'Left stock the most' })
    const rows = within(top).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Coffee')
    expect(rows[1]).toHaveTextContent('RPT-1 · 5 kg')
    expect(within(screen.getByRole('region', { name: 'Losses and damage' })).getByText('No losses in this period.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Stock by category' })).getByText('57.1%')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'By reason' })).getByRole('cell', { name: /Sale/ })).toBeInTheDocument()

    const query = queries.mock.lastCall?.[0] as Record<string, string>
    const days = (new Date(query.to).getTime() - new Date(query.from).getTime()) / 86_400_000
    expect(Math.round(days)).toBe(30)
    expect(query.zone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('lists every point of the chart in its table', async () => {
    mockReport()
    const { user } = renderRoute('/reports?view=stock')
    await user.click(await screen.findByText('Show as a table'))
    const details = screen.getByText('Show as a table').closest('details') as HTMLElement
    const table = within(details).getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(4)
  })

  it('switches the period through the URL', async () => {
    const queries = mockReport()
    const { user, router } = renderRoute('/reports?view=stock')
    await screen.findByText('Value in')

    await user.click(screen.getByRole('tab', { name: '7 days' }))
    await waitFor(() => expect(router.state.location.search).toBe('?view=stock&period=7d'))
    await waitFor(() => {
      const query = queries.mock.lastCall?.[0] as Record<string, string>
      expect(Math.round((new Date(query.to).getTime() - new Date(query.from).getTime()) / 86_400_000)).toBe(7)
    })
  })

  it('is open to managers', async () => {
    mockReport()
    renderRoute('/reports?view=stock', { role: 'MANAGER' })
    expect(await screen.findByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument()
  })

  it('is not available to the stock team', async () => {
    mockReport()
    renderRoute('/reports?view=stock', { role: 'STOCK' })
    await waitFor(() => expect(screen.queryByRole('heading', { level: 1, name: 'Reports' })).not.toBeInTheDocument())
  })

  it('opens on sales: revenue, ticket, best sellers and payment methods', async () => {
    const queries = vi.fn()
    server.use(
      http.get(`${API}/reports/sales`, ({ request }) => {
        queries(Object.fromEntries(new URL(request.url).searchParams))
        return HttpResponse.json({
          totals: {
            sales: 2,
            revenue: 46,
            averageTicket: 23,
            discounts: 2,
            cancelled: 1,
            costedRevenue: 40,
            cost: 24,
            grossProfit: 16,
            margin: 0.4,
          },
          daily: [
            { date: '2026-10-29', sales: 0, revenue: 0 },
            { date: '2026-10-30', sales: 2, revenue: 46 },
          ],
          topProducts: [
            { productId: 1, name: 'Coffee', sku: 'SR-1', unitOfMeasure: 'UNIT', quantity: 4, value: 40, profit: 16, margin: 0.4 },
            { productId: null, name: 'Old tea', sku: 'SR-2', unitOfMeasure: 'UNIT', quantity: 2, value: 8, profit: null, margin: null },
          ],
          byCategory: [
            { category: 'Drinks', revenue: 40, profit: 16, margin: 0.4 },
            { category: null, revenue: 8, profit: null, margin: null },
          ],
          byPayment: [
            { method: 'CASH', sales: 1, revenue: 28 },
            { method: 'PIX', sales: 1, revenue: 18 },
          ],
        })
      }),
    )
    const { user, router } = renderRoute('/reports')

    expect(await screen.findByRole('tab', { name: 'Sales', selected: true })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Average ticket').parentElement?.parentElement).toHaveTextContent('$23.00'))
    const top = screen.getByRole('region', { name: 'Best sellers' })
    expect(within(top).getByRole('link', { name: 'Coffee' })).toHaveAttribute('href', '/products/1/edit')
    // A deleted product stays in the ranking, without a link.
    expect(within(top).getByText('Old tea')).toBeInTheDocument()
    expect(within(top).queryByRole('link', { name: 'Old tea' })).not.toBeInTheDocument()
    const payments = screen.getByRole('region', { name: 'By payment' })
    expect(within(payments).getByText('Cash')).toBeInTheDocument()
    expect(within(payments).getByText('60.9%')).toBeInTheDocument()
    expect(queries).toHaveBeenCalled()

    // Profit leaves out what was sold without a cost, and says how much that was.
    const profit = screen.getByText('Gross profit').parentElement?.parentElement as HTMLElement
    await waitFor(() => expect(profit).toHaveTextContent('$16.00'))
    expect(profit).toHaveTextContent('40%')
    expect(profit).toHaveTextContent('Margin of 40% · $6.00 sold without a cost left out')
    expect(within(top).getByText(/profit \$16\.00/)).toBeInTheDocument()
    expect(within(top).getByText(/no cost/)).toBeInTheDocument()
    const categories = screen.getByRole('region', { name: 'Profit by category' })
    expect(within(categories).getByRole('row', { name: /Drinks/ })).toHaveTextContent('$16.00')
    expect(within(categories).getByRole('row', { name: /Deleted products/ })).toHaveTextContent('no cost')

    await user.click(screen.getByRole('tab', { name: 'Stock' }))
    await waitFor(() => expect(router.state.location.search).toBe('?view=stock'))
  })
})
