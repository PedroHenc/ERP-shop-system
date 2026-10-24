import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse, delay } from 'msw'
import { describe, expect, it } from 'vitest'
import { productFixture, productPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

describe('NavigationProgress', () => {
  it('shows a progressbar while the first fetch is pending and hides it afterwards', async () => {
    server.use(
      http.get(`${API}/brands`, () => HttpResponse.json([{ id: 1, name: 'Acme' }])),
      http.get(`${API}/products/page`, async () => {
        await delay(50)
        return HttpResponse.json(productPageFixture([productFixture()]))
      }),
    )
    renderRoute('/products')
    expect(await screen.findByRole('progressbar', { name: 'Loading…' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())
  })
})
