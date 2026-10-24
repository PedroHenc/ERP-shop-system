import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCreateProduct } from '@/features/products/queries'
import { dashboardSummaryFixture, productFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'
import type { DashboardSummary } from './types'

function useSummary(summary: DashboardSummary = dashboardSummaryFixture()) {
  server.use(http.get(`${API}/dashboard/summary`, () => HttpResponse.json(summary)))
}

describe('DashboardPage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('greets the user by first name and shows the four KPIs', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 15, 9, 0))
    useSummary()
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Good morning, Ana' })).toBeInTheDocument()
    expect(await screen.findByText('1,284')).toBeInTheDocument()
    expect(screen.getByText('Active products')).toBeInTheDocument()
    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Low stock/ })).toBeInTheDocument()
    expect(await screen.findByText('3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Out of stock/ })).toBeInTheDocument()
    expect(await screen.findByText('$42,150.75')).toBeInTheDocument()
    expect(screen.getByText('Stock value')).toBeInTheDocument()
  })

  it('links Active products to the active product list', async () => {
    useSummary()
    renderRoute('/')
    const link = await screen.findByRole('link', { name: /Active products/ })
    expect(link).toHaveAttribute('href', '/products?active=true')
  })

  it('lists restock items linking to the product edit page', async () => {
    useSummary()
    const { user, router } = renderRoute('/')
    const restock = (await screen.findByRole('heading', { name: 'Needs restock' })).closest('section') as HTMLElement
    const item = within(restock).getByRole('link', { name: /Granola/ })
    expect(within(item).getByText('Out of stock')).toBeInTheDocument()
    await user.click(item)
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/7/edit'))
  })

  it('shows All caught up when nothing needs restock', async () => {
    useSummary(dashboardSummaryFixture({ restock: [] }))
    renderRoute('/')
    expect(await screen.findByText('All caught up')).toBeInTheDocument()
  })

  it('hides supplier data and the New product shortcut for a cashier (activeSuppliers null)', async () => {
    useSummary(dashboardSummaryFixture({ activeSuppliers: null }))
    renderRoute('/', { role: 'CASHIER' })
    expect(await screen.findByText('Active brands')).toBeInTheDocument()
    expect(screen.queryByText('Active suppliers')).not.toBeInTheDocument()
    expect(screen.queryByText('New product')).not.toBeInTheDocument()
  })

  it('shows Active suppliers and shortcuts for an admin', async () => {
    useSummary()
    renderRoute('/')
    expect(await screen.findByText('Active suppliers')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'New product' })).toHaveAttribute('href', '/products/new')
  })

  it('formats the stock value in the chosen currency', async () => {
    localStorage.setItem('erp.currency', 'JPY')
    useSummary()
    renderRoute('/')
    expect(await screen.findByText('¥42,151')).toBeInTheDocument()
  })

  it('shows an error and retries on Try again', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/dashboard/summary`, () => {
        calls += 1
        return calls === 1 ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(dashboardSummaryFixture())
      }),
    )
    const { user } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('1,284')).toBeInTheDocument()
    expect(calls).toBe(2)
  })

  it('counts up only on the first load: a refetch shows the new value without restarting from 0', async () => {
    let summary = dashboardSummaryFixture({ activeProducts: 1284 })
    server.use(http.get(`${API}/dashboard/summary`, () => HttpResponse.json(summary)))
    const { queryClient } = renderRoute('/')
    const link = await screen.findByRole('link', { name: /Active products/ })
    await waitFor(() => expect(link).toHaveTextContent('1,284'))

    const seen: string[] = []
    const observer = new MutationObserver(() => seen.push(link.textContent ?? ''))
    observer.observe(link, { subtree: true, childList: true, characterData: true })

    summary = dashboardSummaryFixture({ activeProducts: 1500 })
    await queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
    await waitFor(() => expect(link).toHaveTextContent('1,500'))
    // Let any (wrongly) started animation frames run before checking.
    await new Promise((resolve) => setTimeout(resolve, 100))
    observer.disconnect()

    expect(seen.every((text) => text.includes('1,500'))).toBe(true)
  })

  it('invalidates the dashboard summary when a product is created', async () => {
    server.use(http.post(`${API}/products`, () => HttpResponse.json(productFixture())))
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['dashboard', 'summary'], dashboardSummaryFixture())
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useCreateProduct(), { wrapper })
    result.current.mutate({} as never)
    await waitFor(() => expect(queryClient.getQueryState(['dashboard', 'summary'])?.isInvalidated).toBe(true))
  })
})
