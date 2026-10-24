import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { userFixture, userPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

vi.mock('@/hooks/use-compact', () => ({ useIsCompact: () => true }))

function useHandlers(users = [userFixture({ id: 5, name: 'Carl Cashier', email: 'carl@example.com', role: 'CASHIER' })]) {
  server.use(http.get(`${API}/users/page`, () => HttpResponse.json(userPageFixture(users))))
}

describe('UserListPage (compact)', () => {
  it('renders one card per user with avatar, e-mail, role and status', async () => {
    useHandlers([
      userFixture({ id: 5, name: 'Carl Cashier', email: 'carl@example.com', role: 'CASHIER' }),
      userFixture({ id: 6, name: 'Dora Stock', email: 'dora@example.com', role: 'STOCK', active: false }),
    ])
    renderRoute('/users')
    const list = (await screen.findByText('Carl Cashier')).closest('ul') as HTMLElement
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('CC')).toBeInTheDocument()
    expect(within(items[0]).getByText('carl@example.com')).toBeInTheDocument()
    expect(within(items[0]).getByText('Cashier')).toBeInTheDocument()
    expect(within(items[1]).getByText('Inactive')).toBeInTheDocument()
  })

  it('exposes the name as a link to the edit page', async () => {
    useHandlers()
    const { user, router } = renderRoute('/users')
    const link = await screen.findByRole('link', { name: 'Carl Cashier' })
    expect(link).toHaveAttribute('href', '/users/5/edit')
    await user.click(link)
    await waitFor(() => expect(router.state.location.pathname).toBe('/users/5/edit'))
  })

  it('keeps the row actions on the cards, without deactivate on your own card', async () => {
    useHandlers([userFixture({ id: 1, name: 'Ana Admin' })])
    const { user } = renderRoute('/users')
    await user.click(await screen.findByRole('button', { name: 'Actions' }))
    expect(await screen.findByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Deactivate' })).not.toBeInTheDocument()
  })
})
