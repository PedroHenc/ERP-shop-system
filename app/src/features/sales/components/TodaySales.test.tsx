import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { dashboardSummaryFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

describe("dashboard: today's sales", () => {
  function mock(sales: number) {
    server.use(
      http.get(`${API}/dashboard/summary`, () => HttpResponse.json(dashboardSummaryFixture())),
      http.get(`${API}/sales/summary`, () => HttpResponse.json({ sales, revenue: sales * 20, averageTicket: sales ? 20 : 0, cancelled: 0 })),
    )
  }

  it('shows the revenue, sales and ticket to whoever sells, with the way to the register', async () => {
    mock(3)
    renderRoute('/', { role: 'CASHIER' })
    const strip = await screen.findByRole('region', { name: 'Sales today' })
    await waitFor(() => expect(strip).toHaveTextContent('$60.00'))
    expect(strip).toHaveTextContent('3 sales · Average ticket $20.00')
    expect(screen.getByRole('link', { name: 'Open the point of sale' })).toHaveAttribute('href', '/pos')
  })

  it('says when nothing was sold yet', async () => {
    mock(0)
    renderRoute('/')
    expect(await screen.findByText('No sales yet today.')).toBeInTheDocument()
  })

  it('is not shown to the stock team', async () => {
    mock(1)
    renderRoute('/', { role: 'STOCK' })
    await screen.findByText('Stock value')
    expect(screen.queryByRole('region', { name: 'Sales today' })).not.toBeInTheDocument()
  })
})
