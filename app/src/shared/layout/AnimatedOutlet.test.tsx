import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { brandFixture, brandPageFixture, productFixture, productPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function useHandlers() {
  server.use(
    http.get(`${API}/brands`, () => HttpResponse.json([{ id: 1, name: 'Acme' }])),
    http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([brandFixture()]))),
    http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture()]))),
  )
}

describe('AnimatedOutlet', () => {
  it('swaps the page content when navigating from /products to /brands', async () => {
    useHandlers()
    const { user } = renderRoute('/products')
    expect(await screen.findByRole('heading', { name: 'Products' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    await user.click(within(nav).getByRole('link', { name: 'Brands' }))
    expect(await screen.findByRole('heading', { name: 'Brands' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Products' })).not.toBeInTheDocument())
  })

  it('still asks before leaving a dirty form and keeps the typed value on Stay', async () => {
    useHandlers()
    const { user, router } = renderRoute('/products/new')
    const name = await screen.findByLabelText('Name')
    await user.type(name, 'Green Tea')
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    await user.click(within(nav).getByRole('link', { name: 'Brands' }))
    expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/products/new')
    await user.click(screen.getByRole('button', { name: 'Stay' }))
    await waitFor(() => expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Name')).toHaveValue('Green Tea')
    expect(router.state.location.pathname).toBe('/products/new')
  })
})
