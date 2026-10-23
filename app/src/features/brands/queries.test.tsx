import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { productKeys } from '@/features/products/queries'
import { brandFixture } from '@/test/fixtures'
import { API, server } from '@/test/server'
import { brandKeys, useSetBrandStatus, useUpdateBrand } from './queries'

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const spy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { spy, wrapper }
}

function invalidatedKeys(spy: ReturnType<typeof setup>['spy']) {
  return spy.mock.calls.map(([filters]) => filters?.queryKey)
}

describe('brand mutations', () => {
  it('invalidates products too when a brand is updated (products show the brand name)', async () => {
    server.use(http.put(`${API}/brands/1`, () => HttpResponse.json(brandFixture())))
    const { spy, wrapper } = setup()
    const { result } = renderHook(() => useUpdateBrand(1), { wrapper })

    await act(() => result.current.mutateAsync({ name: 'Acme', active: true, version: 0 }))

    await waitFor(() => {
      expect(invalidatedKeys(spy)).toEqual(expect.arrayContaining([brandKeys.all, productKeys.all]))
    })
  })

  it('invalidates products too when a brand is activated or deactivated', async () => {
    server.use(http.patch(`${API}/brands/1/status`, () => HttpResponse.json(brandFixture({ active: false }))))
    const { spy, wrapper } = setup()
    const { result } = renderHook(() => useSetBrandStatus(), { wrapper })

    await act(() => result.current.mutateAsync({ id: 1, active: false }))

    await waitFor(() => {
      expect(invalidatedKeys(spy)).toEqual(expect.arrayContaining([brandKeys.all, productKeys.all]))
    })
  })
})
