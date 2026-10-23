import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { brandFixture, brandPageFixture } from '@/test/fixtures'
import { API, server } from '@/test/server'
import { fetchBrandsPage, setBrandStatus } from './api'
import { brandListParams } from './list-params'

describe('brands api', () => {
  it('fetches the brands page', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${API}/brands/page`, ({ request }) => {
        seen(new URL(request.url).search)
        return HttpResponse.json(brandPageFixture([brandFixture()]))
      }),
    )
    const page = await fetchBrandsPage({ ...brandListParams.defaults, name: 'ac' })
    expect(page.content).toHaveLength(1)
    expect(seen).toHaveBeenCalledWith('?page=0&size=20&sortBy=name&direction=ASC&name=ac')
  })

  it('patches the brand status', async () => {
    const body = vi.fn()
    server.use(
      http.patch(`${API}/brands/3/status`, async ({ request }) => {
        body(await request.json())
        return HttpResponse.json(brandFixture({ id: 3, active: false }))
      }),
    )
    const brand = await setBrandStatus(3, false)
    expect(body).toHaveBeenCalledWith({ active: false })
    expect(brand.active).toBe(false)
  })
})
