import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { productFixture, productPageFixture, stockMovementFixture, stockMovementPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

/** Product 7 with 10 units; each POST moves the server-side stock, and the GET returns it. */
function mockProduct(options: { allowNegativeStock?: boolean } = {}) {
  let stock = 10
  const posted = vi.fn()
  server.use(
    http.get(`${API}/brands`, () => HttpResponse.json([{ id: 1, name: 'Acme' }])),
    http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture([productFixture({ id: 7, stockQuantity: stock })]))),
    http.get(`${API}/products/7`, () =>
      HttpResponse.json(productFixture({ id: 7, name: 'Granola', stockQuantity: stock, allowNegativeStock: options.allowNegativeStock ?? false })),
    ),
    http.get(`${API}/stock-movements/page`, () =>
      HttpResponse.json(stockMovementPageFixture(stock === 10 ? [] : [stockMovementFixture({ productId: 7, type: 'EXIT', reason: 'LOSS', quantity: -3, balanceAfter: stock })])),
    ),
    http.post(`${API}/products/7/stock-movements`, async ({ request }) => {
      const body = (await request.json()) as { quantity: number }
      posted(body)
      stock -= body.quantity
      return HttpResponse.json(stockMovementFixture({ productId: 7, type: 'EXIT', quantity: -body.quantity, balanceAfter: stock }), { status: 201 })
    }),
  )
  return posted
}

describe('StockMovementDialog', () => {
  it('records an exit from the product page and refreshes the stock and the history', async () => {
    const posted = mockProduct()
    const { user } = renderRoute('/products/7/edit')
    // The stock is not a form field on edit: it only moves through movements.
    await screen.findByLabelText('Name')
    expect(screen.queryByLabelText('Initial stock')).not.toBeInTheDocument()
    expect(await screen.findByText('No movements yet.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Move stock' }))
    const dialog = await screen.findByRole('dialog', { name: 'Move stock' })
    expect(within(dialog).getByText('Granola · 10 unit in stock')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('tab', { name: 'Exit' }))
    await user.click(within(dialog).getByRole('combobox', { name: 'Reason' }))
    await user.click(await screen.findByRole('option', { name: 'Loss' }))
    await user.type(within(dialog).getByLabelText('Quantity going out'), '3')
    expect(within(dialog).getByText('7 unit')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('Note'), 'Broken jars')
    await user.click(within(dialog).getByRole('button', { name: 'Record movement' }))

    expect(await screen.findByText('Stock movement recorded')).toBeInTheDocument()
    expect(posted).toHaveBeenCalledWith({ type: 'EXIT', reason: 'LOSS', quantity: 3, note: 'Broken jars' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const summary = screen.getByRole('complementary', { name: 'Summary' })
    await waitFor(() => expect(summary).toHaveTextContent('7 unit'))
    expect(await screen.findByRole('link', { name: 'See all (1)' })).toHaveAttribute('href', '/stock?productId=7')
    // Recording a movement does not make the product form dirty.
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })

  it('blocks an exit that would leave the stock below zero', async () => {
    const posted = mockProduct()
    const { user } = renderRoute('/products/7/edit')
    await user.click(await screen.findByRole('button', { name: 'Move stock' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('tab', { name: 'Exit' }))
    await user.type(within(dialog).getByLabelText('Quantity going out'), '12')

    expect(within(dialog).getByText(/below zero/)).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Record movement' })).toBeDisabled()
    expect(posted).not.toHaveBeenCalled()
  })

  it('shows the API message on the quantity', async () => {
    mockProduct({ allowNegativeStock: true })
    server.use(
      http.post(`${API}/products/7/stock-movements`, () =>
        HttpResponse.json(
          { title: 'Bad Request', detail: 'Validation failed', errors: { quantity: 'Not enough stock: 10 available' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/products/7/edit')
    await user.click(await screen.findByRole('button', { name: 'Move stock' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Quantity coming in'), '1')
    await user.click(within(dialog).getByRole('button', { name: 'Record movement' }))

    expect(await within(dialog).findByText('Not enough stock: 10 available')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Quantity coming in')).toHaveAttribute('aria-invalid', 'true')
  })

  it('sets an adjustment to the counted quantity', async () => {
    const posted = mockProduct()
    const { user } = renderRoute('/products/7/edit')
    await user.click(await screen.findByRole('button', { name: 'Move stock' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('tab', { name: 'Adjustment' }))
    expect(within(dialog).getByRole('combobox', { name: 'Reason' })).toHaveTextContent('Inventory count')
    await user.type(within(dialog).getByLabelText('Counted quantity'), '8')
    await user.click(within(dialog).getByRole('button', { name: 'Record movement' }))

    await waitFor(() => expect(posted).toHaveBeenCalledWith({ type: 'ADJUSTMENT', reason: 'INVENTORY_COUNT', quantity: 8, note: null }))
  })

  it('opens from the product list menu', async () => {
    mockProduct()
    const { user } = renderRoute('/products')
    await user.click((await screen.findAllByRole('button', { name: 'Actions' }))[0])
    await user.click(await screen.findByRole('menuitem', { name: 'Move stock' }))
    expect(await screen.findByRole('dialog', { name: 'Move stock' })).toBeInTheDocument()
  })
})
