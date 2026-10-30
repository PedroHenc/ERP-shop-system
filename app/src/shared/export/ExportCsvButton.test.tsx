import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { productFixture, productPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

describe('list export', () => {
  let blobs: Blob[]
  beforeEach(() => {
    blobs = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      blobs.push(blob as Blob)
      return 'blob:csv'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })
  afterEach(() => vi.restoreAllMocks())

  it('exports every page of products with the list filters, not just the visible page', async () => {
    const requested: string[] = []
    server.use(
      http.get(`${API}/products/page`, ({ request }) => {
        const url = new URL(request.url)
        requested.push(url.search)
        const page = Number(url.searchParams.get('page') ?? 0)
        const size = Number(url.searchParams.get('size') ?? 20)
        const product = productFixture({ id: page + 1, name: `Product ${page + 1}`, price: 10.5 })
        return HttpResponse.json(productPageFixture([product], { page, size, totalPages: size === 100 ? 2 : 1, totalElements: 2 }))
      }),
    )
    const { user } = renderRoute('/products?name=tea')
    await screen.findByText('Product 1')

    await user.click(screen.getByRole('button', { name: 'Export CSV' }))

    expect(await screen.findByText('2 rows exported')).toBeInTheDocument()
    const exports = requested.filter((search) => search.includes('size=100'))
    expect(exports).toHaveLength(2)
    expect(exports.every((search) => search.includes('name=tea'))).toBe(true)
    const text = await blobs[0].text()
    const lines = text.replace(/^﻿/, '').split('\r\n')
    expect(lines[0]).toBe('SKU,Barcode,Name,Category,Subcategory,Brand,Price,Unit of measure,Stock,Minimum stock,Reorder point,Status')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('Product 1')
    expect(lines[2]).toContain(',10.5,')
  })

  it('says when the export failed', async () => {
    server.use(
      http.get(`${API}/products/page`, ({ request }) =>
        new URL(request.url).searchParams.get('size') === '100'
          ? HttpResponse.json({ title: 'Server error' }, { status: 500 })
          : HttpResponse.json(productPageFixture([productFixture()])),
      ),
    )
    const { user } = renderRoute('/products')
    await screen.findByText('Espresso Beans')
    await user.click(screen.getByRole('button', { name: 'Export CSV' }))
    await waitFor(() => expect(screen.getByText('The export failed. Try again.')).toBeInTheDocument())
  })
})
