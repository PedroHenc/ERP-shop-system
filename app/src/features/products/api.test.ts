import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { fetchBrands } from '@/features/brands/api'
import { API, server } from '@/test/server'
import { productFixture, productPageFixture } from '@/test/fixtures'
import { fetchProduct, fetchProductsPage } from './api'

describe('data layer endpoints', () => {
  it('fetchProductsPage calls GET /products/page with query params', async () => {
    const page = productPageFixture([productFixture()])
    let url: URL | undefined
    server.use(
      http.get(`${API}/products/page`, ({ request }) => {
        url = new URL(request.url)
        return HttpResponse.json(page)
      }),
    )
    const result = await fetchProductsPage({ page: 0, size: 20, sortBy: 'name', direction: 'ASC', name: 'ab' })
    expect(result).toEqual(page)
    expect(url?.search).toBe('?page=0&size=20&sortBy=name&direction=ASC&name=ab')
  })

  it('fetchProduct calls GET /products/:id', async () => {
    const product = productFixture({ id: 7 })
    server.use(http.get(`${API}/products/7`, () => HttpResponse.json(product)))
    expect(await fetchProduct(7)).toEqual(product)
  })

  it('fetchBrands calls GET /brands', async () => {
    const brands = [{ id: 1, name: 'Acme' }]
    server.use(http.get(`${API}/brands`, () => HttpResponse.json(brands)))
    expect(await fetchBrands()).toEqual(brands)
  })
})
