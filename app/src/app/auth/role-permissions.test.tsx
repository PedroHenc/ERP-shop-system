import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { createQueryClient } from '@/app/query-client'
import {
  brandFixture,
  brandPageFixture,
  productFixture,
  productPageFixture,
  supplierFixture,
  supplierPageFixture,
} from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function useCatalogHandlers() {
  server.use(
    http.get(`${API}/brands`, () => HttpResponse.json([{ id: 1, name: 'Acme' }])),
    http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture([brandFixture()]))),
    http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture()]))),
    http.get(`${API}/products/7`, () => HttpResponse.json(productFixture({ id: 7 }))),
    http.get(`${API}/suppliers/page`, () => HttpResponse.json(supplierPageFixture([supplierFixture()]))),
  )
}

describe('role permissions in the UI', () => {
  it('hides catalog write actions for cashiers', async () => {
    useCatalogHandlers()
    const { user, router } = renderRoute('/products', { role: 'CASHIER' })
    await screen.findByText('Espresso Beans')
    expect(screen.queryByRole('button', { name: 'New product' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()
    // Rows stay clickable: the product opens read-only.
    await user.click(screen.getByText('Acme'))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/1/edit'))
  })

  it('hides brand write actions for cashiers', async () => {
    useCatalogHandlers()
    const { user } = renderRoute('/brands', { role: 'CASHIER' })
    await screen.findByText('Acme')
    expect(screen.queryByRole('button', { name: 'New brand' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()
    await user.click(screen.getByText('Acme'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows write actions to stock users on brands', async () => {
    useCatalogHandlers()
    renderRoute('/brands', { role: 'STOCK' })
    await screen.findByText('Acme')
    expect(screen.getByRole('button', { name: 'New brand' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument()
  })

  it('hides suppliers from cashiers', async () => {
    useCatalogHandlers()
    renderRoute('/suppliers', { role: 'CASHIER' })
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).queryByText('Suppliers')).not.toBeInTheDocument()
    expect(within(nav).getByText('Products')).toBeInTheDocument()
  })

  it('lets stock read suppliers but not create them', async () => {
    useCatalogHandlers()
    const first = renderRoute('/suppliers', { role: 'STOCK' })
    await screen.findByText(supplierFixture().legalName)
    expect(screen.queryByRole('link', { name: 'New supplier' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument()
    await first.user.click(screen.getByText(supplierFixture().legalName))
    expect(first.router.state.location.pathname).toBe('/suppliers')
  })

  it('blocks supplier creation for stock users', async () => {
    useCatalogHandlers()
    renderRoute('/suppliers/new', { role: 'STOCK' })
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument()
  })

  it('opens the product form read-only for cashiers', async () => {
    useCatalogHandlers()
    renderRoute('/products/7/edit', { role: 'CASHIER' })
    const sku = await screen.findByLabelText('SKU')
    expect(sku).toBeDisabled()
    expect(screen.getByLabelText('Name')).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Brand' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
  })

  it('blocks product creation for cashiers', async () => {
    useCatalogHandlers()
    renderRoute('/products/new', { role: 'CASHIER' })
    expect(await screen.findByText("You don't have access to this page")).toBeInTheDocument()
  })

  it('shows Users only to admins in the main navigation', async () => {
    useCatalogHandlers()
    renderRoute('/products', { role: 'ADMIN' })
    await screen.findByText('Espresso Beans')
    expect(within(screen.getByRole('navigation', { name: 'Main navigation' })).getByText('Users')).toBeInTheDocument()
  })

  it('does not show Users to managers', async () => {
    useCatalogHandlers()
    renderRoute('/products', { role: 'MANAGER' })
    await screen.findByText('Espresso Beans')
    expect(within(screen.getByRole('navigation', { name: 'Main navigation' })).queryByText('Users')).not.toBeInTheDocument()
  })

  it('toasts on 403 from a mutation', async () => {
    useCatalogHandlers()
    server.use(http.delete(`${API}/products/1`, () => HttpResponse.json({}, { status: 403 })))
    const { user } = renderRoute('/products', { role: 'MANAGER', queryClient: createQueryClient() })
    await screen.findByText('Espresso Beans')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.getByText("You don't have permission to do this")).toBeInTheDocument())
  })
})
