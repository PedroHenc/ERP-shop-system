import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { API, server } from '@/test/server'
import { ApiError, isApiError, request, resolveBaseUrl } from './http'

describe('request', () => {
  it('omits null, undefined and empty-string query values', async () => {
    let requested = ''
    server.use(
      http.get(`${API}/products/page`, ({ request: req }) => {
        requested = req.url
        return HttpResponse.json({ ok: true })
      }),
    )

    await request('/products/page', {
      query: { page: 0, name: '', sku: null, active: false, category: undefined },
    })

    expect(requested).toBe(`${API}/products/page?page=0&active=false`)
  })

  it('sends JSON body and returns parsed JSON', async () => {
    let contentType: string | null = null
    let received: unknown
    server.use(
      http.post(`${API}/products`, async ({ request: req }) => {
        contentType = req.headers.get('content-type')
        received = await req.json()
        return HttpResponse.json({ id: 1, sku: 'A1' }, { status: 201 })
      }),
    )

    const result = await request<{ id: number; sku: string }>('/products', {
      method: 'POST',
      body: { sku: 'A1' },
    })

    expect(contentType).toBe('application/json')
    expect(received).toEqual({ sku: 'A1' })
    expect(result).toEqual({ id: 1, sku: 'A1' })
  })

  it('does not send Content-Type when there is no body', async () => {
    let contentType: string | null = 'unset'
    server.use(
      http.get(`${API}/brands`, ({ request: req }) => {
        contentType = req.headers.get('content-type')
        return HttpResponse.json([])
      }),
    )

    await request('/brands')

    expect(contentType).toBeNull()
  })

  it('returns undefined on 204', async () => {
    server.use(
      http.delete(`${API}/products/1`, () => new HttpResponse(null, { status: 204 })),
    )

    const result = await request<void>('/products/1', { method: 'DELETE' })

    expect(result).toBeUndefined()
  })

  it('throws ApiError with field errors from ProblemDetail', async () => {
    server.use(
      http.post(`${API}/products`, () =>
        HttpResponse.json(
          {
            title: 'Bad Request',
            detail: 'Validation failed',
            errors: { sku: 'must not be blank' },
          },
          { status: 400 },
        ),
      ),
    )

    const error = await request('/products', { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    )

    expect(isApiError(error)).toBe(true)
    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(400)
    expect(apiError.title).toBe('Bad Request')
    expect(apiError.detail).toBe('Validation failed')
    expect(apiError.errors?.sku).toBe('must not be blank')
  })

  it('throws ApiError without details when the error body is not JSON', async () => {
    server.use(
      http.get(`${API}/boom`, () => new HttpResponse('oops', { status: 500 })),
    )

    const error = await request('/boom').catch((e: unknown) => e)

    expect(isApiError(error)).toBe(true)
    expect((error as ApiError).status).toBe(500)
    expect((error as ApiError).errors).toBeUndefined()
  })

  it('throws ApiError with status 0 on network failure', async () => {
    server.use(http.get(`${API}/products`, () => HttpResponse.error()))

    const error = await request('/products').catch((e: unknown) => e)

    expect(isApiError(error)).toBe(true)
    expect((error as ApiError).status).toBe(0)
  })
})

describe('resolveBaseUrl', () => {
  it('uses a configured path or http(s) URL', () => {
    expect(resolveBaseUrl('/api', true)).toBe('/api')
    expect(resolveBaseUrl('https://erp-shop-api.onrender.com', true)).toBe('https://erp-shop-api.onrender.com')
    expect(resolveBaseUrl(' http://localhost:8080 ', false)).toBe('http://localhost:8080')
  })

  it('ignores placeholders such as the [SENSITIVE] that vercel pull writes', () => {
    expect(resolveBaseUrl('[SENSITIVE]', true)).toBe('/api')
    expect(resolveBaseUrl('', true)).toBe('/api')
    expect(resolveBaseUrl(undefined, true)).toBe('/api')
    expect(resolveBaseUrl('[SENSITIVE]', false)).toBe('http://localhost:8080')
  })
})
