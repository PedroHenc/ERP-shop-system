import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { productFixture, productPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

vi.mock('qrcode', () => ({ default: { toDataURL: async () => 'data:image/png;base64,AAAA' } }))

const NEW_CODE = '7891234567895'
const OLD_CODE = '7890000000017'

/** A batch session whose phone sends `codes`, one more on each poll. */
function usePhone(codes: string[]) {
  const created = vi.fn()
  const closed = vi.fn()
  let polls = 0
  server.use(
    http.get(`${API}/brands`, () => HttpResponse.json([])),
    http.post(`${API}/scan-sessions`, async ({ request }) => {
      created(await request.json())
      return HttpResponse.json({ id: 9, token: 'tok', expiresAt: new Date().toISOString() }, { status: 201 })
    }),
    http.get(`${API}/scan-sessions/9`, () => {
      polls += 1
      return HttpResponse.json({
        id: 9,
        status: 'WAITING',
        batch: true,
        code: null,
        codes: codes.slice(0, polls),
        expiresAt: new Date().toISOString(),
      })
    }),
    http.post(`${API}/scan-sessions/9/close`, () => {
      closed()
      return new HttpResponse(null, { status: 204 })
    }),
    http.get(`${API}/products/page`, ({ request }) => {
      const search = new URL(request.url).searchParams.get('search')
      return HttpResponse.json(
        productPageFixture(search === OLD_CODE ? [productFixture({ id: 4, name: 'Old Tea', barcode: OLD_CODE })] : []),
      )
    }),
  )
  return { created, closed }
}

describe('BatchProductPage', () => {
  it('turns codes from the phone into rows and saves them all', async () => {
    const { created } = usePhone([NEW_CODE, OLD_CODE])
    const posted = vi.fn()
    server.use(
      http.post(`${API}/products/batch`, async ({ request }) => {
        const body = (await request.json()) as { products: unknown[] }
        posted(body)
        return HttpResponse.json(body.products.map((_, i) => productFixture({ id: 20 + i })), { status: 201 })
      }),
    )
    const { user, router } = renderRoute('/products/batch', { strict: true })

    expect(await screen.findByLabelText('Barcode · 1', {}, { timeout: 3000 })).toHaveValue(NEW_CODE)
    expect(created).toHaveBeenCalledWith({ batch: true })
    expect(screen.getByLabelText('SKU · 1')).toHaveValue(NEW_CODE)
    // The second code belongs to a product already in the catalogue: listed apart, not a row.
    expect(await screen.findByText('Old Tea', {}, { timeout: 4000 })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByLabelText('Barcode · 2')).not.toBeInTheDocument())

    await user.type(screen.getByLabelText('Name · 1'), 'Coffee')
    await user.type(screen.getByLabelText('Category · 1'), 'Grocery')
    await user.type(screen.getByLabelText('Price · 1'), '12,90')
    await user.click(screen.getByRole('button', { name: 'Save 1 product' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    expect(posted).toHaveBeenCalledWith({
      products: [expect.objectContaining({ sku: NEW_CODE, barcode: NEW_CODE, name: 'Coffee', category: 'Grocery', price: 12.9 })],
    })
    expect(await screen.findByText('1 product created')).toBeInTheDocument()
  })

  it('shows each row its errors and saves nothing', async () => {
    usePhone([])
    const posted = vi.fn()
    server.use(http.post(`${API}/products/batch`, () => posted()))
    const { user } = renderRoute('/products/batch')
    await user.click(await screen.findByRole('button', { name: 'Add row' }))
    await user.click(screen.getByRole('button', { name: 'Add row' }))
    await user.type(screen.getByLabelText('SKU · 2'), 'X-2')
    await user.click(screen.getByRole('button', { name: 'Save 2 products' }))

    expect(await screen.findByText('Some rows need fixing. Nothing was saved yet.')).toBeInTheDocument()
    expect(screen.getByLabelText('SKU · 1')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('SKU · 2')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Name · 2')).toHaveAttribute('aria-invalid', 'true')
    expect(posted).not.toHaveBeenCalled()
  })

  it("puts the API's errors on their rows", async () => {
    usePhone([])
    server.use(
      http.post(`${API}/products/batch`, () =>
        HttpResponse.json(
          { status: 400, errors: { 'products[1].sku': 'A product with this SKU already exists' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/products/batch')
    for (const row of [1, 2]) {
      await user.click(await screen.findByRole('button', { name: 'Add row' }))
      await user.type(screen.getByLabelText(`SKU · ${row}`), `S-${row}`)
      await user.type(screen.getByLabelText(`Name · ${row}`), `Item ${row}`)
      await user.type(screen.getByLabelText(`Category · ${row}`), 'Food')
      await user.type(screen.getByLabelText(`Price · ${row}`), '1')
    }
    await user.click(screen.getByRole('button', { name: 'Save 2 products' }))
    expect(await screen.findByText('A product with this SKU already exists')).toBeInTheDocument()
    expect(screen.getByLabelText('SKU · 2')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('SKU · 1')).not.toHaveAttribute('aria-invalid')
  })

  it('removes a row, and new rows repeat the category above', async () => {
    usePhone([])
    const { user } = renderRoute('/products/batch')
    await user.click(await screen.findByRole('button', { name: 'Add row' }))
    await user.type(screen.getByLabelText('Category · 1'), 'Bakery')
    await user.click(screen.getByRole('button', { name: 'Add row' }))
    expect(screen.getByLabelText('Category · 2')).toHaveValue('Bakery')
    await user.click(screen.getByRole('button', { name: 'Remove row 1' }))
    await waitFor(() => expect(screen.queryByLabelText('Category · 2')).not.toBeInTheDocument())
  })

  it('closes the phone session when leaving', async () => {
    const { closed } = usePhone([])
    const { user, router } = renderRoute('/products/batch')
    await screen.findByRole('img', { name: /QR code/ })
    await user.click(screen.getByRole('link', { name: 'Cancel' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products'))
    await waitFor(() => expect(closed).toHaveBeenCalled())
  })

  it('is offered by the New product chooser', async () => {
    usePhone([])
    const { user, router } = renderRoute('/products')
    await user.click((await screen.findAllByRole('button', { name: 'New product' }))[0])
    const dialog = await screen.findByRole('dialog', { name: 'New product' })
    await user.click(within(dialog).getByRole('button', { name: /Several products/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/batch'))
  })
})
