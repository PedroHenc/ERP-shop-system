import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { brandFixture, brandPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

describe('BrandListPage', () => {
  it('lists brands from the API with status badges', async () => {
    server.use(
      http.get(`${API}/brands/page`, () =>
        HttpResponse.json(brandPageFixture([brandFixture({ name: 'Acme', active: false })])),
      ),
    )
    renderRoute('/brands')
    const row = (await screen.findByText('Acme')).closest('tr') as HTMLElement
    expect(within(row).getByText('Inactive')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Brands' })).toBeInTheDocument()
  })

  it('updates the URL when typing a name filter', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${API}/brands/page`, ({ request }) => {
        seen(new URL(request.url).searchParams.get('name'))
        return HttpResponse.json(brandPageFixture([brandFixture()]))
      }),
    )
    const { user, router } = renderRoute('/brands')
    await screen.findByText('Acme')
    await user.type(screen.getByRole('searchbox', { name: 'Search brands' }), 'ac')
    await waitFor(() => expect(router.state.location.search).toContain('name=ac'))
    await waitFor(() => expect(seen).toHaveBeenCalledWith('ac'))
  })

  it('shows empty state', async () => {
    server.use(http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([]))))
    renderRoute('/brands')
    expect(await screen.findByText('No brands yet')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'New brand' })).toHaveLength(2)
  })

  it('hides New brand from CASHIER on the empty state', async () => {
    server.use(http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([]))))
    renderRoute('/brands', { role: 'CASHIER' })
    expect(await screen.findByText('No brands yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'New brand' })).not.toBeInTheDocument()
  })

  it('shows the no-results state with Clear filters when a filter is active', async () => {
    server.use(http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([]))))
    const { user, router } = renderRoute('/brands?name=zzz')
    expect(await screen.findByText('No results for these filters')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(() => expect(router.state.location.search).not.toContain('name='))
  })

  it('switches tabs through the URL and shows the total on the selected tab', async () => {
    server.use(http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([brandFixture()]))))
    const { user, router } = renderRoute('/brands')
    await screen.findByText('Acme')
    const all = screen.getByRole('tab', { name: /All/ })
    expect(all).toHaveAttribute('aria-selected', 'true')
    expect(within(all).getByText('1')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Inactive' }))
    await waitFor(() => expect(router.state.location.search).toContain('active=false'))
    expect(screen.getByRole('tab', { name: /Inactive/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('has no Filters button', async () => {
    server.use(http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([brandFixture()]))))
    renderRoute('/brands')
    await screen.findByText('Acme')
    expect(screen.queryByRole('button', { name: /Filters/ })).not.toBeInTheDocument()
  })

  it('opens the edit dialog from the brand name button', async () => {
    server.use(
      http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([brandFixture({ id: 3 })]))),
      http.get(`${API}/brands/3`, () => HttpResponse.json(brandFixture({ id: 3 }))),
    )
    const { user } = renderRoute('/brands')
    await user.click(await screen.findByRole('button', { name: 'Acme' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('deactivates a brand after confirmation', async () => {
    const patched = vi.fn()
    server.use(
      http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([brandFixture({ id: 3 })]))),
      http.patch(`${API}/brands/3/status`, async ({ request }) => {
        patched(await request.json())
        return HttpResponse.json(brandFixture({ id: 3, active: false }))
      }),
    )
    const { user } = renderRoute('/brands')
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Deactivate' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(patched).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))
    await waitFor(() => expect(patched).toHaveBeenCalledWith({ active: false }))
    expect(await screen.findByText('Brand deactivated')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('activates an inactive brand without confirmation', async () => {
    const patched = vi.fn()
    server.use(
      http.get(`${API}/brands/page`, () =>
        HttpResponse.json(brandPageFixture([brandFixture({ id: 3, active: false })])),
      ),
      http.patch(`${API}/brands/3/status`, async ({ request }) => {
        patched(await request.json())
        return HttpResponse.json(brandFixture({ id: 3, active: true }))
      }),
    )
    const { user } = renderRoute('/brands')
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Activate' }))
    await waitFor(() => expect(patched).toHaveBeenCalledWith({ active: true }))
    expect(await screen.findByText('Brand activated')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
