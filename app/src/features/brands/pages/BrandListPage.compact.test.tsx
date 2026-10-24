import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { brandFixture, brandPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

vi.mock('@/hooks/use-compact', () => ({ useIsCompact: () => true }))

function useHandlers(brands = [brandFixture({ id: 3 })]) {
  server.use(
    http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture(brands))),
    http.get(`${API}/brands/3`, () => HttpResponse.json(brandFixture({ id: 3 }))),
  )
}

describe('BrandListPage (compact)', () => {
  it('renders one list item per brand instead of a table, with name and status', async () => {
    useHandlers([brandFixture({ id: 3, name: 'Acme' }), brandFixture({ id: 4, name: 'Globex', active: false })])
    renderRoute('/brands')
    const list = (await screen.findByText('Acme')).closest('ul') as HTMLElement
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[1]).getByText('Inactive')).toBeInTheDocument()
  })

  it('opens the edit dialog from the name button', async () => {
    useHandlers()
    const { user } = renderRoute('/brands')
    await user.click(await screen.findByRole('button', { name: 'Acme' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('keeps the row actions on the cards', async () => {
    useHandlers()
    const { user } = renderRoute('/brands')
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Deactivate' })).toBeInTheDocument()
  })

  it('shows the no-results state with Clear filters, without a skeleton', async () => {
    useHandlers([])
    renderRoute('/brands?name=nope')
    expect(await screen.findByText('No results for these filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
    expect(document.querySelector('[data-slot="skeleton"]')).toBeNull()
  })
})
