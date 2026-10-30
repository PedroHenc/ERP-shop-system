import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderRoute } from '@/test/render'
import { API, server, STORE } from '@/test/server'
import * as logo from './logo'

const LOGO = 'data:image/webp;base64,UklGRg=='

function brand() {
  return within(screen.getByRole('banner')).getAllByRole('link')[0]
}

describe('Store branding in the header', () => {
  it("shows the store's name and the default icon", async () => {
    renderRoute('/', { role: 'CASHIER' })
    await waitFor(() => expect(brand()).toHaveAccessibleName('Corner Shop'))
    expect(brand()).toHaveTextContent('Corner Shop')
    expect(brand().querySelector('img')).toBeNull()
  })

  it("shows the store's logo", async () => {
    server.use(http.get(`${API}/store`, () => HttpResponse.json({ ...STORE, logo: LOGO })))
    renderRoute('/')
    await waitFor(() => expect(brand().querySelector('img')).toHaveAttribute('src', LOGO))
  })

  it("falls back to the app's name when the store cannot be loaded", async () => {
    server.use(http.get(`${API}/store`, () => HttpResponse.json({}, { status: 500 })))
    renderRoute('/')
    await waitFor(() => expect(brand()).toHaveTextContent('ERP Shop'))
  })
})

describe('StoreSettingsPage', () => {
  it('is in the user menu for admins only', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'User menu' }))
    expect(await screen.findByRole('menuitem', { name: 'My store' })).toHaveAttribute('href', '/store')
  })

  it('is not open to managers', async () => {
    const { user } = renderRoute('/', { role: 'MANAGER' })
    await user.click(screen.getByRole('button', { name: 'User menu' }))
    await screen.findByRole('menuitem', { name: 'My profile' })
    expect(screen.queryByRole('menuitem', { name: 'My store' })).not.toBeInTheDocument()
  })

  it('renames the store, sets a logo and updates the header', async () => {
    vi.spyOn(logo, 'toLogoDataUrl').mockResolvedValue(LOGO)
    const saved = vi.fn()
    server.use(
      http.put(`${API}/store`, async ({ request }) => {
        const body = (await request.json()) as { name: string; logo: string | null }
        saved(body)
        return HttpResponse.json({ id: 1, ...body })
      }),
    )
    const { user } = renderRoute('/store')
    const name = await screen.findByLabelText('Store name')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.clear(name)
    await user.type(name, '  Padaria Pão Quente ')
    await user.upload(screen.getByLabelText('Logo'), new File(['x'], 'logo.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(saved).toHaveBeenCalledWith({ name: 'Padaria Pão Quente', logo: LOGO }))
    expect(await screen.findByText('Store updated')).toBeInTheDocument()
    await waitFor(() => expect(brand()).toHaveAccessibleName('Padaria Pão Quente'))
    expect(brand().querySelector('img')).toHaveAttribute('src', LOGO)
  })

  it('removes the logo', async () => {
    server.use(http.get(`${API}/store`, () => HttpResponse.json({ ...STORE, logo: LOGO })))
    const saved = vi.fn()
    server.use(
      http.put(`${API}/store`, async ({ request }) => {
        const body = (await request.json()) as { name: string; logo: string | null }
        saved(body)
        return HttpResponse.json({ id: 1, ...body })
      }),
    )
    const { user } = renderRoute('/store')
    await user.click(await screen.findByRole('button', { name: 'Remove logo' }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saved).toHaveBeenCalledWith({ name: 'Corner Shop', logo: null }))
  })

  it('refuses other file types and an empty name', async () => {
    const { user } = renderRoute('/store')
    const name = await screen.findByLabelText('Store name')
    // A drop or the "All files" choice can bypass `accept`.
    fireEvent.change(screen.getByLabelText('Logo'), {
      target: { files: [new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' })] },
    })
    expect(await screen.findByText('Use a PNG, JPEG or WebP image.')).toBeInTheDocument()
    await user.clear(name)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText("Enter the store's name")).toBeInTheDocument()
  })

  it('shows server field errors', async () => {
    server.use(
      http.put(`${API}/store`, () =>
        HttpResponse.json({ status: 400, errors: { logo: 'Logo must be at most 256 KB' } }, { status: 400 }),
      ),
    )
    const { user } = renderRoute('/store')
    await user.type(await screen.findByLabelText('Store name'), '!')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Logo must be at most 256 KB')).toBeInTheDocument()
  })
})
