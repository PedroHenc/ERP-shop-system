import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { renderRoute } from '@/test/render'
import { API, server } from '@/test/server'

async function fill(user: ReturnType<typeof renderRoute>['user'], current: string, next: string, confirm = next) {
  await user.type(screen.getByLabelText('Current password'), current)
  await user.type(screen.getByLabelText('New password'), next)
  await user.type(screen.getByLabelText('Confirm new password'), confirm)
}

describe('ProfilePage', () => {
  it('shows the signed-in user details', async () => {
    renderRoute('/profile', { role: 'MANAGER' })

    const heading = await screen.findByRole('heading', { name: 'My profile' })
    const page = heading.closest('main') as HTMLElement
    expect(heading).toBeInTheDocument()
    expect(within(page).getByText('Ana Admin')).toBeInTheDocument()
    expect(screen.getByText('ana@example.com')).toBeInTheDocument()
    expect(within(page).getByText('Manager')).toBeInTheDocument()
    expect(within(page).getByText('AA')).toBeInTheDocument()
    expect(within(page).getByText('Last sign-in')).toBeInTheDocument()
  })

  it('changes the password', async () => {
    const body = vi.fn()
    server.use(
      http.put(`${API}/auth/me/password`, async ({ request }) => {
        body(await request.json())
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = renderRoute('/profile')

    await fill(user, 'old-pass', 'new-password')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('Password changed')).toBeInTheDocument()
    expect(body).toHaveBeenCalledWith({ currentPassword: 'old-pass', newPassword: 'new-password' })
    await waitFor(() => expect(screen.getByLabelText('Current password')).toHaveValue(''))
    expect(screen.getByLabelText('New password')).toHaveValue('')
    expect(screen.getByLabelText('Confirm new password')).toHaveValue('')
  })

  it('shows the wrong current password on its field', async () => {
    server.use(
      http.put(`${API}/auth/me/password`, () =>
        HttpResponse.json(
          { title: 'Bad Request', errors: { currentPassword: 'Current password is incorrect' } },
          { status: 400 },
        ),
      ),
    )
    const { user } = renderRoute('/profile')

    await fill(user, 'wrong-pass', 'new-password')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument()
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true')
  })

  it("shows a mismatch error and does not call the API", async () => {
    const called = vi.fn()
    server.use(http.put(`${API}/auth/me/password`, () => {
        called()
        return new HttpResponse(null, { status: 204 })
      }))
    const { user } = renderRoute('/profile')

    await fill(user, 'old-pass', 'new-password', 'other-password')
    await user.click(screen.getByRole('button', { name: 'Change password' }))

    expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
    expect(called).not.toHaveBeenCalled()
  })
})
