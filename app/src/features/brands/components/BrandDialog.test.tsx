import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { brandFixture, brandPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

function listWith(...brands: ReturnType<typeof brandFixture>[]) {
  return http.get(`${API}/brands/page`, () => HttpResponse.json(brandPageFixture(brands)))
}

describe('BrandDialog', () => {
  it('creates a brand', async () => {
    const post = vi.fn()
    server.use(
      listWith(brandFixture()),
      http.post(`${API}/brands`, async ({ request }) => {
        post(await request.json())
        return HttpResponse.json(brandFixture({ id: 9, name: 'Zed' }), { status: 201 })
      }),
    )
    const { user } = renderRoute('/brands')
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'New brand' }))
    const dialog = await screen.findByRole('dialog', { name: 'New brand' })
    await user.type(within(dialog).getByLabelText('Name'), 'Zed')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(post).toHaveBeenCalledWith({ name: 'Zed', active: true, version: null }))
    expect(await screen.findByText('Brand saved')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows a required error without calling the API', async () => {
    const post = vi.fn()
    server.use(
      listWith(brandFixture()),
      http.post(`${API}/brands`, () => {
        post()
        return HttpResponse.json(brandFixture())
      }),
    )
    const { user } = renderRoute('/brands')
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'New brand' }))
    await user.click(await screen.findByRole('button', { name: 'Save' }))
    expect(await screen.findByText('This field is required')).toBeInTheDocument()
    expect(post).not.toHaveBeenCalled()
  })

  it('shows a duplicate name error on the field', async () => {
    server.use(
      listWith(brandFixture()),
      http.post(`${API}/brands`, () =>
        HttpResponse.json(
          { title: 'Bad Request', errors: { name: 'A brand with this name already exists' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/brands')
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'New brand' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Acme')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('A brand with this name already exists')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('loads the brand from the server and sends its version', async () => {
    const put = vi.fn()
    server.use(
      listWith(brandFixture({ id: 3, name: 'Old', version: 1 })),
      http.get(`${API}/brands/3`, () => HttpResponse.json(brandFixture({ id: 3, name: 'New', version: 2 }))),
      http.put(`${API}/brands/3`, async ({ request }) => {
        put(await request.json())
        return HttpResponse.json(brandFixture({ id: 3, name: 'New', version: 3 }))
      }),
    )
    const { user } = renderRoute('/brands')
    await screen.findByText('Old')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit brand' })
    await waitFor(() => expect(within(dialog).getByLabelText('Name')).toHaveValue('New'))
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(put).toHaveBeenCalledWith({ name: 'New', active: true, version: 2 }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('shows the conflict alert on 409 and reloads', async () => {
    let serverName = 'Old'
    server.use(
      listWith(brandFixture({ id: 3, name: 'Old', version: 1 })),
      http.get(`${API}/brands/3`, () => HttpResponse.json(brandFixture({ id: 3, name: serverName, version: 2 }))),
      http.put(`${API}/brands/3`, () =>
        HttpResponse.json({ title: 'Conflict', detail: 'The resource was modified by another user' }, { status: 409 }),
      ),
    )
    const { user } = renderRoute('/brands')
    await screen.findByText('Old')
    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }))
    const dialog = await screen.findByRole('dialog')
    const name = await within(dialog).findByLabelText('Name')
    await waitFor(() => expect(name).toHaveValue('Old'))
    await user.clear(name)
    await user.type(name, 'Mine')
    await user.click(within(dialog).getByRole('button', { name: 'Save' }))
    expect(await within(dialog).findByText('This brand was changed by someone else')).toBeInTheDocument()

    serverName = 'Server name'
    await user.click(within(dialog).getByRole('button', { name: 'Reload' }))
    await waitFor(() => expect(within(dialog).getByLabelText('Name')).toHaveValue('Server name'))
    expect(screen.queryByText('This brand was changed by someone else')).not.toBeInTheDocument()
  })

  it('asks before discarding unsaved changes', async () => {
    server.use(listWith(brandFixture()))
    const { user } = renderRoute('/brands')
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'New brand' }))
    const dialog = await screen.findByRole('dialog', { name: 'New brand' })
    await user.type(within(dialog).getByLabelText('Name'), 'Zed')
    await user.keyboard('{Escape}')
    const alert = await screen.findByRole('alertdialog')
    await user.click(within(alert).getByRole('button', { name: 'Stay' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByRole('dialog', { name: 'New brand' })).toBeInTheDocument()

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Leave' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes without asking when nothing changed', async () => {
    server.use(listWith(brandFixture()))
    const { user } = renderRoute('/brands')
    await screen.findByText('Acme')
    await user.click(screen.getByRole('button', { name: 'New brand' }))
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
