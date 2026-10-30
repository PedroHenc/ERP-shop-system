import { QueryClient, focusManager } from '@tanstack/react-query'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { productFixture, productPageFixture, stockMovementPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function useCommonHandlers() {
  server.use(
    http.get(`${API}/brands`, () => HttpResponse.json([{ id: 1, name: 'Acme' }])),
    http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture()]))),
    http.get(`${API}/stock-movements/page`, () => HttpResponse.json(stockMovementPageFixture([]))),
  )
}

async function fillRequired(user: ReturnType<typeof renderRoute>['user']) {
  await user.type(await screen.findByLabelText('SKU'), 'NEW-1')
  await user.type(screen.getByLabelText('Name'), 'Green Tea')
  await user.type(screen.getByLabelText('Category'), 'Tea')
  await user.type(screen.getByLabelText('Price'), '10,50')
}

describe('ProductFormPage', () => {
  it('creates a product and navigates to /products', async () => {
    useCommonHandlers()
    const posted = vi.fn()
    server.use(
      http.post(`${API}/products`, async ({ request }) => {
        posted(await request.json())
        return HttpResponse.json(productFixture({ id: 9 }), { status: 201 })
      }),
    )
    const { user, router } = renderRoute('/products/new')
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(posted).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'NEW-1',
        name: 'Green Tea',
        category: 'Tea',
        price: 10.5,
        barcode: null,
        unitOfMeasure: 'UNIT',
        active: true,
        version: null,
      }),
    )
    expect(await screen.findByText('Product saved')).toBeInTheDocument()
  })

  it('marks fields from a 400 response', async () => {
    useCommonHandlers()
    server.use(
      http.post(`${API}/products`, () =>
        HttpResponse.json(
          { title: 'Bad Request', detail: 'Validation failed', errors: { sku: 'SKU already used' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/products/new')
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('SKU already used')).toBeInTheDocument()
    expect(screen.getByLabelText('SKU')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows a form-level alert for 400 without field errors', async () => {
    useCommonHandlers()
    server.use(
      http.post(`${API}/products`, () =>
        HttpResponse.json({ title: 'Bad Request', detail: 'A product with this SKU already exists' }, { status: 400 }),
      ),
    )
    const { user } = renderRoute('/products/new')
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('A product with this SKU already exists')).toBeInTheDocument()
  })

  it('disables Save while the request is pending', async () => {
    useCommonHandlers()
    const posted = vi.fn()
    server.use(
      http.post(`${API}/products`, async () => {
        posted()
        await delay(150)
        return HttpResponse.json(productFixture({ id: 9 }), { status: 201 })
      }),
    )
    const { user, router } = renderRoute('/products/new')
    await fillRequired(user)
    const save = screen.getByRole('button', { name: 'Save' })
    await user.click(save)
    await waitFor(() => expect(save).toBeDisabled())
    await user.click(save)
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(posted).toHaveBeenCalledTimes(1)
  })

  it('loads the product for editing and sends its version', async () => {
    useCommonHandlers()
    const put = vi.fn()
    server.use(
      http.get(`${API}/products/7`, () => HttpResponse.json(productFixture({ id: 7, version: 3, name: 'Old name' }))),
      http.put(`${API}/products/7`, async ({ request }) => {
        put(await request.json())
        return HttpResponse.json(productFixture({ id: 7, version: 4 }))
      }),
    )
    const { user, router } = renderRoute('/products/7/edit')
    const name = await screen.findByLabelText('Name')
    await waitFor(() => expect(name).toHaveValue('Old name'))
    await user.clear(name)
    await user.type(name, 'New name')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(put).toHaveBeenCalledWith(expect.objectContaining({ name: 'New name', version: 3, price: 19.9 }))
  })

  it('shows a server error for a field without a text input', async () => {
    useCommonHandlers()
    server.use(
      http.post(`${API}/products`, () =>
        HttpResponse.json(
          { title: 'Bad Request', detail: 'Validation failed', errors: { brandId: 'Brand not found' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/products/new')
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Brand not found')).toBeInTheDocument()
  })

  it('sends the version of the data the form was loaded with after a background refetch', async () => {
    useCommonHandlers()
    const put = vi.fn()
    const get = vi.fn()
    server.use(
      http.get(`${API}/products/7`, () => {
        get()
        return HttpResponse.json(
          get.mock.calls.length === 1
            ? productFixture({ id: 7, version: 3, name: 'Name v3' })
            : productFixture({ id: 7, version: 4, name: 'Name v4' }),
        )
      }),
      http.put(`${API}/products/7`, async ({ request }) => {
        put(await request.json())
        return HttpResponse.json(productFixture({ id: 7, version: 5 }))
      }),
    )
    const { user, router } = renderRoute('/products/7/edit')
    const name = await screen.findByLabelText('Name')
    await waitFor(() => expect(name).toHaveValue('Name v3'))
    // A window refocus triggers a background refetch that advances product.version to 4.
    focusManager.setFocused(false)
    focusManager.setFocused(true)
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2))
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByLabelText('Name')).toHaveValue('Name v3')
    await user.type(screen.getByLabelText('SKU'), 'Z')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(put).toHaveBeenCalledWith(expect.objectContaining({ name: 'Name v3', version: 3 }))
  })

  it('shows fresh server data instead of stale cached data when reopening a product', async () => {
    useCommonHandlers()
    const put = vi.fn()
    server.use(
      http.get(`${API}/products/7`, () => HttpResponse.json(productFixture({ id: 7, version: 4, name: 'Name v4' }))),
      http.put(`${API}/products/7`, async ({ request }) => {
        put(await request.json())
        return HttpResponse.json(productFixture({ id: 7, version: 5 }))
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['products', 'detail', 7], productFixture({ id: 7, version: 3, name: 'Name v3' }))
    const { user, router } = renderRoute('/products/7/edit', { queryClient })
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Name v4'))
    await user.type(screen.getByLabelText('SKU'), 'Z')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(put).toHaveBeenCalledWith(expect.objectContaining({ name: 'Name v4', version: 4 }))
  })

  it('shows the detail of a 404 on create (brand no longer exists)', async () => {
    useCommonHandlers()
    server.use(
      http.post(`${API}/products`, () =>
        HttpResponse.json({ title: 'Not Found', detail: 'Brand not found with id: 9' }, { status: 404 }),
      ),
    )
    const { user } = renderRoute('/products/new')
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Brand not found with id: 9')).toBeInTheDocument()
  })

  it('shows the detail of a 404 on update', async () => {
    useCommonHandlers()
    server.use(
      http.get(`${API}/products/7`, () => HttpResponse.json(productFixture({ id: 7, version: 3, name: 'Name v3' }))),
      http.put(`${API}/products/7`, () =>
        HttpResponse.json({ title: 'Not Found', detail: 'Product not found with id: 7' }, { status: 404 }),
      ),
    )
    const { user } = renderRoute('/products/7/edit')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Name v3'))
    await user.type(screen.getByLabelText('SKU'), 'Z')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Product not found with id: 7')).toBeInTheDocument()
  })

  it('shows Product not found for 404', async () => {
    useCommonHandlers()
    server.use(
      http.get(`${API}/products/99`, () => HttpResponse.json({ title: 'Not Found', detail: 'nope' }, { status: 404 })),
    )
    renderRoute('/products/99/edit')
    expect(await screen.findByText('Product not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to products' })).toHaveAttribute('href', '/products')
  })

  it('shows the conflict alert on 409 and reloads on Reload', async () => {
    useCommonHandlers()
    const get = vi.fn()
    let serverName = 'Old name'
    server.use(
      http.get(`${API}/products/7`, () => {
        get()
        return HttpResponse.json(productFixture({ id: 7, version: 3, name: serverName }))
      }),
      http.put(`${API}/products/7`, () =>
        HttpResponse.json({ title: 'Conflict', detail: 'The resource was modified by another user' }, { status: 409 }),
      ),
    )
    const { user } = renderRoute('/products/7/edit')
    const name = await screen.findByLabelText('Name')
    await waitFor(() => expect(name).toHaveValue('Old name'))
    await user.clear(name)
    await user.type(name, 'Mine')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('This product was changed by someone else')).toBeInTheDocument()

    serverName = 'Server name'
    await user.click(screen.getByRole('button', { name: 'Reload' }))
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Server name'))
    expect(get).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('This product was changed by someone else')).not.toBeInTheDocument()
  })

  it('shows the name of an inactive brand and keeps it on save', async () => {
    const put = vi.fn()
    server.use(
      http.get(`${API}/brands`, () => HttpResponse.json([])),
      http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture()]))),
      http.get(`${API}/products/7`, () =>
        HttpResponse.json(productFixture({ id: 7, version: 3, brandId: 9, brandName: 'Old Brand' })),
      ),
      http.put(`${API}/products/7`, async ({ request }) => {
        put(await request.json())
        return HttpResponse.json(productFixture({ id: 7, version: 4 }))
      }),
    )
    const { user, router } = renderRoute('/products/7/edit')
    expect(await screen.findByRole('combobox', { name: 'Brand' })).toHaveTextContent('Old Brand')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(put).toHaveBeenCalledWith(expect.objectContaining({ brandId: 9 }))
  })

  it('asks for confirmation when leaving with unsaved changes', async () => {
    useCommonHandlers()
    const { user, router } = renderRoute('/products/new')
    await user.type(await screen.findByLabelText('SKU'), 'X')
    await user.click(
      within(screen.getByRole('navigation', { name: 'Main navigation' })).getByRole('link', { name: 'Products' }),
    )
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/products/new')
    await user.click(screen.getByRole('button', { name: 'Leave' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
  })

  it('shows Unsaved changes after editing and keeps Active in the summary', async () => {
    useCommonHandlers()
    server.use(http.get(`${API}/products/7`, () => HttpResponse.json(productFixture({ id: 7, name: 'Old name' }))))
    const { user } = renderRoute('/products/7/edit')
    const name = await screen.findByLabelText('Name')
    await waitFor(() => expect(name).toHaveValue('Old name'))
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    await user.type(name, '!')
    expect(await screen.findByText('Unsaved changes')).toBeInTheDocument()
    expect(within(screen.getByRole('complementary', { name: 'Summary' })).getByRole('switch', { name: 'Active' })).toBeInTheDocument()
  })

  it('locale-formats stock and reorder level in the summary', async () => {
    useCommonHandlers()
    server.use(
      http.get(`${API}/products/7`, () =>
        HttpResponse.json(productFixture({ id: 7, stockQuantity: 1234.5, minimumStock: 2, reorderPoint: 2000 })),
      ),
    )
    renderRoute('/products/7/edit')
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveValue('Espresso Beans'))
    const summary = screen.getByRole('complementary', { name: 'Summary' })
    expect(summary).toHaveTextContent('1,234.5')
    expect(summary).toHaveTextContent('Reorder level: 2,000')
  })

  it('goes back to /products on Cancel, asking first when dirty', async () => {
    useCommonHandlers()
    const { user, router } = renderRoute('/products/new')
    await user.type(await screen.findByLabelText('SKU'), 'X')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Leave' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
  })

  it('goes back to /products on Cancel when the form is clean', async () => {
    useCommonHandlers()
    const { user, router } = renderRoute('/products/new')
    await screen.findByLabelText('SKU')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
  })

  it('shows the form skeleton while the product loads', async () => {
    useCommonHandlers()
    server.use(
      http.get(`${API}/products/7`, async () => {
        await delay(100)
        return HttpResponse.json(productFixture({ id: 7 }))
      }),
    )
    renderRoute('/products/7/edit')
    expect(await screen.findAllByTestId('form-skeleton-section')).not.toHaveLength(0)
    expect(await screen.findByLabelText('Name')).toBeInTheDocument()
    expect(screen.queryByTestId('form-skeleton-section')).not.toBeInTheDocument()
  })

  it('is read-only for a cashier: no Save, no unsaved indicator, Active disabled', async () => {
    useCommonHandlers()
    server.use(http.get(`${API}/products/7`, () => HttpResponse.json(productFixture({ id: 7 }))))
    renderRoute('/products/7/edit', { role: 'CASHIER' })
    const name = await screen.findByLabelText('Name')
    await waitFor(() => expect(name).toBeDisabled())
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Active' })).toBeDisabled()
  })
})
