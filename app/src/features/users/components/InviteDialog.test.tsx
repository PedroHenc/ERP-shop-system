import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { userFixture, userPageFixture } from '@/test/fixtures'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'
import type { Invite } from '../invites'

const pending: Invite = {
  id: 3,
  role: 'STOCK',
  createdByName: 'Ana Admin',
  createdAt: '2026-10-30T12:00:00Z',
  expiresAt: '2026-11-06T12:00:00Z',
}

function mockUsersAndInvites(invites: Invite[]) {
  let current = invites
  server.use(
    http.get(`${API}/users/page`, () => HttpResponse.json(userPageFixture([userFixture()]))),
    http.get(`${API}/invites`, () => HttpResponse.json(current)),
  )
  return {
    set(next: Invite[]) {
      current = next
    },
  }
}

async function openDialog(user: ReturnType<typeof renderRoute>['user']) {
  await user.click(await screen.findByRole('button', { name: 'Invite' }))
  return screen.findByRole('dialog', { name: 'Invite to the store' })
}

describe('InviteDialog', () => {
  it('creates an invite for the chosen role and shows a copyable /join link once', async () => {
    const body = vi.fn()
    const invites = mockUsersAndInvites([])
    server.use(
      http.post(`${API}/invites`, async ({ request }) => {
        body(await request.json())
        const invite = { ...pending, id: 9, role: 'MANAGER' as const }
        invites.set([invite])
        return HttpResponse.json({ invite, token: 'code-abc' }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/users')
    const dialog = await openDialog(user)

    expect(await within(dialog).findByText('No pending invites.')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('radio', { name: 'Manager' }))
    expect(within(dialog).getByText(/Does not manage users/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Create invite link' }))

    const link = await within(dialog).findByLabelText('Invite link · Manager')
    expect(link).toHaveValue(`${window.location.origin}/join#code-abc`)
    expect(body).toHaveBeenCalledWith({ role: 'MANAGER' })
    await user.click(within(dialog).getByRole('button', { name: 'Copy' }))
    expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/join#code-abc`)
    expect(await within(dialog).findByText(/Created by Ana Admin/)).toBeInTheDocument()

    // Closing forgets the link: reopening shows only the pending list.
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const reopened = await openDialog(user)
    expect(within(reopened).queryByLabelText(/Invite link/)).not.toBeInTheDocument()
  })

  it('lists pending invites and revokes one', async () => {
    const revoked = vi.fn()
    const invites = mockUsersAndInvites([pending])
    server.use(
      http.delete(`${API}/invites/:id`, ({ params }) => {
        revoked(params.id)
        invites.set([])
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderRoute('/users')
    const dialog = await openDialog(user)

    expect(await within(dialog).findByText('Stock', { selector: '[data-slot="badge"]' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Revoke Stock invite created by Ana Admin' }))

    expect(await within(dialog).findByText('No pending invites.')).toBeInTheDocument()
    expect(revoked).toHaveBeenCalledWith('3')
  })
})
