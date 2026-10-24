import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import i18n from '@/app/i18n'
import { useCreateProduct } from '@/features/products/queries'
import { brandFixture, brandPageFixture, dashboardSummaryFixture, productFixture } from '@/test/fixtures'
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

  it('locale-formats restock quantities and offsets the section below the sticky header', async () => {
    await act(() => i18n.changeLanguage('pt-BR'))
    useSummary(
      dashboardSummaryFixture({
        restock: [{ id: 7, sku: 'SKU-007', name: 'Granola', stockQuantity: 1234.5, minimumStock: 2000 }],
      }),
    )
    renderRoute('/')
    const restock = (await screen.findByRole('heading', { name: 'Precisa de reposição' })).closest('section') as HTMLElement
    expect(within(restock).getByText('1.234,5 / 2.000')).toBeInTheDocument()
    expect(restock).toHaveClass('scroll-mt-20')
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

  it('opens the New brand dialog from the New brand shortcut, once', async () => {
    useSummary()
    server.use(http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([brandFixture()]))))
    const { user, router } = renderRoute('/')
    await user.click(await screen.findByRole('link', { name: 'New brand' }))
    expect(await screen.findByRole('dialog', { name: 'New brand' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/brands')
    // The flag is dropped so Back or a refresh does not reopen the dialog.
    await waitFor(() => expect(router.state.location.state).toBeNull())
  })

  it('shows the long-form date under the greeting in the active language', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 15, 9, 0))
    useSummary()
    renderRoute('/')
    expect(await screen.findByText('Thursday, January 15, 2026')).toBeInTheDocument()
  })

  it('shows the long-form date in Portuguese when pt-BR is active', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 0, 15, 9, 0))
    await act(() => i18n.changeLanguage('pt-BR'))
    useSummary()
    renderRoute('/')
    expect(await screen.findByText('quinta-feira, 15 de janeiro de 2026')).toBeInTheDocument()
  })

  it('labels the loading skeleton', async () => {
    server.use(http.get(`${API}/dashboard/summary`, () => new Promise(() => {})))
    renderRoute('/')
    expect(await screen.findByRole('status', { name: 'Loading…' })).toHaveAttribute('aria-busy', 'true')
  })

  it('formats the stock value with formatMoney in the chosen currency', async () => {
    localStorage.setItem('erp.currency', 'JPY')
    useSummary()
    renderRoute('/')
    expect(await screen.findByText('¥42,150.75')).toBeInTheDocument()
  })

  it('uses a normal space between currency symbol and amount so the KPI wraps there only', async () => {
    localStorage.setItem('erp.currency', 'BRL')
    await act(() => i18n.changeLanguage('pt-BR'))
    useSummary()
    renderRoute('/')
    // Raw textContent: the default text normalizer would hide a non-breaking space.
    const el = await screen.findByText((_, node) => node?.textContent === 'R$ 42.150,75' && node.children.length === 0)
    expect(el).toBeInTheDocument()
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

describe('DashboardPage background refetch failure', () => {
  it('keeps the populated dashboard when a refetch fails', async () => {
    let fail = false
    server.use(
      http.get(`${API}/dashboard/summary`, () =>
        fail ? new HttpResponse(null, { status: 500 }) : HttpResponse.json(dashboardSummaryFixture()),
      ),
    )
    const { queryClient } = renderRoute('/')
    expect(await screen.findByText('Granola')).toBeInTheDocument()
    fail = true
    await queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] })
    await waitFor(() => expect(queryClient.getQueryState(['dashboard', 'summary'])?.status).toBe('error'))
    expect(screen.getByText('Granola')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
