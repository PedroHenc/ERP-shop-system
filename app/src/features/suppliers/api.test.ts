import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { supplierFixture, supplierPageFixture } from '@/test/fixtures'
import { API, server } from '@/test/server'
import { fetchSuppliersPage, setSupplierStatus } from './api'
import { supplierListParams } from './list-params'

describe('suppliers api', () => {
  it('fetches the suppliers page with filters', async () => {
    const seen = vi.fn()
    server.use(
      http.get(`${API}/suppliers/page`, ({ request }) => {
        seen(new URL(request.url).search)
        return HttpResponse.json(supplierPageFixture([supplierFixture()]))
      }),
    )
    const page = await fetchSuppliersPage({ ...supplierListParams.defaults, name: 'ac', taxId: '123' })
    expect(page.content).toHaveLength(1)
    expect(seen).toHaveBeenCalledWith('?page=0&size=20&sortBy=legalName&direction=ASC&name=ac&taxId=123')
  })

  it('patches the supplier status', async () => {
    const body = vi.fn()
    server.use(
      http.patch(`${API}/suppliers/3/status`, async ({ request }) => {
        body(await request.json())
        return HttpResponse.json(supplierFixture({ id: 3, active: false }))
      }),
    )
    const supplier = await setSupplierStatus(3, false)
    expect(body).toHaveBeenCalledWith({ active: false })
    expect(supplier.active).toBe(false)
  })
})
