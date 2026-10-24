import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { supplierFixture, supplierPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

vi.mock('@/hooks/use-compact', () => ({ useIsCompact: () => true }))

function useHandlers(suppliers = [supplierFixture({ id: 3, legalName: 'Acme Ltda', taxId: '12345678000199' })]) {
  server.use(http.get(`${API}/suppliers/page`, () => HttpResponse.json(supplierPageFixture(suppliers))))
}

describe('SupplierListPage (compact)', () => {
  it('renders one list item per supplier with legal name, tax ID and status', async () => {
    useHandlers([
      supplierFixture({ id: 3, legalName: 'Acme Ltda', taxId: '12345678000199' }),
      supplierFixture({ id: 4, legalName: 'Globex SA', taxId: null, active: false }),
    ])
    renderRoute('/suppliers')
    const list = (await screen.findByText('Acme Ltda')).closest('ul') as HTMLElement
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('12345678000199')).toBeInTheDocument()
    expect(within(items[1]).getByText('Inactive')).toBeInTheDocument()
  })

  it('exposes the legal name as a link to the edit page', async () => {
    useHandlers()
    const { user, router } = renderRoute('/suppliers')
    const link = await screen.findByRole('link', { name: 'Acme Ltda' })
    expect(link).toHaveAttribute('href', '/suppliers/3/edit')
    await user.click(link)
    await waitFor(() => expect(router.state.location.pathname).toBe('/suppliers/3/edit'))
  })

  it('keeps the row actions on the cards', async () => {
    useHandlers()
    const { user } = renderRoute('/suppliers')
    await screen.findByText('Acme Ltda')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Deactivate' })).toBeInTheDocument()
  })

  it('shows the no-results state with Clear filters, without a skeleton', async () => {
    useHandlers([])
    renderRoute('/suppliers?taxId=nope')
    expect(await screen.findByText('No results for these filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull()
  })
})
