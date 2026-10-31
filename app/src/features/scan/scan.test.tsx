import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { productFixture, productPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

// jsdom has no canvas to draw on: the QR image itself is not what these tests check.
vi.mock('qrcode', () => ({ default: { toDataURL: async () => 'data:image/png;base64,AAAA' } }))

const detect = vi.fn<() => Promise<{ rawValue: string; format: string }[]>>()
vi.mock('./detector', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./detector')>()),
  getDetector: async () => ({ detect }),
}))

const CODE = '7891234567895'

function useListHandlers(products = [productFixture()]) {
  server.use(
    http.get(`${API}/brands`, () => HttpResponse.json([{ id: 1, name: 'Acme' }])),
    http.get(`${API}/products/page`, () => HttpResponse.json(productPageFixture(products))),
  )
}

/** A camera that opens; `stop` is called on each track when the scanner lets it go. */
function fakeCamera(failure?: DOMException) {
  const stop = vi.fn()
  const getUserMedia = failure
    ? vi.fn().mockRejectedValue(failure)
    : vi.fn(async () => ({ getTracks: () => [{ stop }] }) as unknown as MediaStream)
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  return { getUserMedia, stop }
}

beforeEach(() => {
  detect.mockReset().mockResolvedValue([])
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4)
})
afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'mediaDevices')
})

describe('New product chooser', () => {
  it('offers typing it in or scanning with a phone', async () => {
    useListHandlers()
    const { user, router } = renderRoute('/products')
    await user.click((await screen.findAllByRole('button', { name: 'New product' }))[0])
    const dialog = await screen.findByRole('dialog', { name: 'New product' })
    expect(within(dialog).getByRole('button', { name: /Scan with my phone/ })).toBeInTheDocument()
    // Not a phone or tablet: no "this device" option.
    expect(within(dialog).queryByRole('button', { name: /Scan with this device/ })).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /Type it in/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/new'))
  })

  it('pairs a phone with a QR code and opens the form with the code it read', async () => {
    useListHandlers([])
    let polls = 0
    server.use(
      http.post(`${API}/scan-sessions`, () =>
        HttpResponse.json({ id: 7, token: 'tok', expiresAt: new Date(Date.now() + 600_000).toISOString() }, { status: 201 }),
      ),
      http.get(`${API}/scan-sessions/7`, () => {
        polls += 1
        return HttpResponse.json({
          id: 7,
          status: polls > 1 ? 'SCANNED' : 'WAITING',
          code: polls > 1 ? CODE : null,
          expiresAt: new Date().toISOString(),
        })
      }),
    )
    const { user, router } = renderRoute('/products')
    await user.click((await screen.findAllByRole('button', { name: 'New product' }))[0])
    await user.click(await screen.findByRole('button', { name: /Scan with my phone/ }))
    expect(await screen.findByRole('img', { name: /QR code that opens/ })).toBeInTheDocument()
    expect(screen.getByText(/Waiting for the phone · \d+:\d\d/)).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/products/new'), { timeout: 4000 })
    expect(router.state.location.search).toBe(`?barcode=${CODE}`)
    expect(await screen.findByLabelText('Barcode')).toHaveValue(CODE)
  })

  it('offers the existing product when the code is already in the catalogue', async () => {
    useListHandlers([productFixture({ id: 5, name: 'Green Tea', barcode: CODE })])
    server.use(
      http.post(`${API}/scan-sessions`, () =>
        HttpResponse.json({ id: 7, token: 'tok', expiresAt: new Date().toISOString() }, { status: 201 }),
      ),
      http.get(`${API}/scan-sessions/7`, () =>
        HttpResponse.json({ id: 7, status: 'SCANNED', code: CODE, expiresAt: new Date().toISOString() }),
      ),
    )
    const { user } = renderRoute('/products')
    await user.click((await screen.findAllByRole('button', { name: 'New product' }))[0])
    await user.click(await screen.findByRole('button', { name: /Scan with my phone/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Already in the catalogue' })
    // The title changes at once; the body swaps in after the previous step's exit.
    expect(await within(dialog).findByText('Green Tea')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: 'Open product' })).toHaveAttribute('href', '/products/5/edit')
  })

  it('offers a new QR code once one expires', async () => {
    useListHandlers()
    const created = vi.fn()
    server.use(
      http.post(`${API}/scan-sessions`, () => {
        created()
        return HttpResponse.json({ id: 7, token: 'tok', expiresAt: new Date().toISOString() }, { status: 201 })
      }),
      http.get(`${API}/scan-sessions/7`, () =>
        HttpResponse.json({ id: 7, status: 'EXPIRED', code: null, expiresAt: new Date().toISOString() }),
      ),
    )
    const { user } = renderRoute('/products')
    await user.click((await screen.findAllByRole('button', { name: 'New product' }))[0])
    await user.click(await screen.findByRole('button', { name: /Scan with my phone/ }))
    expect(await screen.findByText('This QR code expired')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'New QR code' }))
    await waitFor(() => expect(created).toHaveBeenCalledTimes(2))
  })
})

describe('ScanPage (phone)', () => {
  it('reads a barcode with the camera and sends it', async () => {
    const { stop } = fakeCamera()
    const submitted = vi.fn()
    server.use(
      http.post(`${API}/scan/preview`, () => HttpResponse.json({ storeName: 'Corner Shop', expiresAt: new Date().toISOString() })),
      http.post(`${API}/scan/submit`, async ({ request }) => {
        submitted(await request.json(), request.headers.get('Authorization'))
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderRoute('/scan#tok', { role: null })
    expect(await screen.findByText('Corner Shop')).toBeInTheDocument()
    detect.mockResolvedValue([{ rawValue: ` ${CODE} `, format: 'ean_13' }])
    await user.click(screen.getByRole('button', { name: 'Open camera' }))
    expect(await screen.findByRole('heading', { name: 'Code sent' })).toBeInTheDocument()
    expect(submitted).toHaveBeenCalledWith({ token: 'tok', code: CODE }, null)
    expect(stop).toHaveBeenCalled()
  })

  it('ignores a misread frame and codes without a valid check digit', async () => {
    fakeCamera()
    const submitted = vi.fn()
    server.use(
      http.post(`${API}/scan/preview`, () => HttpResponse.json({ storeName: 'Corner Shop', expiresAt: new Date().toISOString() })),
      http.post(`${API}/scan/submit`, async ({ request }) => {
        submitted(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    // A 6 read as 7 (check digit fails), an ITF ghost, then the real code twice.
    detect
      .mockResolvedValueOnce([{ rawValue: '7891234577895', format: 'ean_13' }])
      .mockResolvedValueOnce([{ rawValue: '7891234577895', format: 'ean_13' }])
      .mockResolvedValueOnce([{ rawValue: '123456', format: 'itf' }])
      .mockResolvedValue([{ rawValue: CODE, format: 'ean_13' }])
    const { user } = renderRoute('/scan#tok', { role: null })
    await user.click(await screen.findByRole('button', { name: 'Open camera' }))
    expect(await screen.findByRole('heading', { name: 'Code sent' })).toBeInTheDocument()
    expect(submitted).toHaveBeenCalledTimes(1)
    expect(submitted).toHaveBeenCalledWith({ token: 'tok', code: CODE })
    expect(detect.mock.calls.length).toBeGreaterThanOrEqual(5)
  })

  it('keeps reading in a batch, once per product, until Done', async () => {
    fakeCamera()
    const submitted: string[] = []
    server.use(
      http.post(`${API}/scan/preview`, () =>
        HttpResponse.json({ storeName: 'Corner Shop', expiresAt: new Date().toISOString(), batch: true, total: 0 }),
      ),
      http.post(`${API}/scan/submit`, async ({ request }) => {
        const { code } = (await request.json()) as { code: string }
        submitted.push(code)
        return HttpResponse.json({ total: submitted.length, duplicate: false })
      }),
    )
    // The first product stays in view for many frames, then the second one.
    let frames = 0
    detect.mockImplementation(async () => {
      frames += 1
      return [{ rawValue: frames <= 8 ? CODE : '96385074', format: frames <= 8 ? 'ean_13' : 'ean_8' }]
    })
    const { user } = renderRoute('/scan#tok', { role: null })
    expect(await screen.findByRole('heading', { name: 'Scan several products' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open camera' }))
    expect(await screen.findByText('2 codes sent', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(submitted).toEqual([CODE, '96385074'])
    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(await screen.findByRole('heading', { name: '2 codes sent' })).toBeInTheDocument()
  })

  it('says when the computer closed the batch', async () => {
    fakeCamera()
    server.use(
      http.post(`${API}/scan/preview`, () =>
        HttpResponse.json({ storeName: 'Corner Shop', expiresAt: new Date().toISOString(), batch: true, total: 3 }),
      ),
      http.post(`${API}/scan/submit`, () => HttpResponse.json({ code: 'scan-invalid' }, { status: 404 })),
    )
    detect.mockResolvedValue([{ rawValue: CODE, format: 'ean_13' }])
    const { user } = renderRoute('/scan#tok', { role: null })
    await user.click(await screen.findByRole('button', { name: 'Open camera' }))
    expect(await screen.findByText(/The computer finished this session/)).toBeInTheDocument()
  })

  it('lets the code be typed when the camera is blocked', async () => {
    fakeCamera(new DOMException('no', 'NotAllowedError'))
    const submitted = vi.fn()
    server.use(
      http.post(`${API}/scan/preview`, () => HttpResponse.json({ storeName: 'Corner Shop', expiresAt: new Date().toISOString() })),
      http.post(`${API}/scan/submit`, async ({ request }) => {
        submitted(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderRoute('/scan#tok', { role: null })
    await user.click(await screen.findByRole('button', { name: 'Open camera' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Camera access was blocked')
    await user.type(screen.getByLabelText('Barcode'), CODE)
    await user.click(screen.getByRole('button', { name: 'Use' }))
    expect(await screen.findByRole('heading', { name: 'Code sent' })).toBeInTheDocument()
    expect(submitted).toHaveBeenCalledWith({ token: 'tok', code: CODE })
  })

  it('says when the link is no longer valid', async () => {
    server.use(
      http.post(`${API}/scan/preview`, () =>
        HttpResponse.json({ status: 404, code: 'scan-invalid', message: 'This QR code is no longer valid' }, { status: 404 }),
      ),
    )
    renderRoute('/scan#used', { role: null })
    expect(await screen.findByRole('heading', { name: 'This link no longer works' })).toBeInTheDocument()
  })

  it('says so without a token', async () => {
    renderRoute('/scan', { role: null })
    expect(await screen.findByRole('heading', { name: 'This link no longer works' })).toBeInTheDocument()
  })
})

describe('Barcode field', () => {
  it('starts from ?barcode', async () => {
    useListHandlers()
    renderRoute(`/products/new?barcode=${CODE}`)
    expect(await screen.findByLabelText('Barcode')).toHaveValue(CODE)
  })

  it('reads the code with the camera where there is one', async () => {
    fakeCamera()
    useListHandlers()
    const { user } = renderRoute('/products/new')
    detect.mockResolvedValue([{ rawValue: CODE, format: 'ean_13' }])
    await user.click(await screen.findByRole('button', { name: 'Read with the camera' }))
    await waitFor(() => expect(screen.getByLabelText('Barcode')).toHaveValue(CODE))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('has no camera button without a camera', async () => {
    useListHandlers()
    renderRoute('/products/new')
    await screen.findByLabelText('Barcode')
    expect(screen.queryByRole('button', { name: 'Read with the camera' })).not.toBeInTheDocument()
  })
})
