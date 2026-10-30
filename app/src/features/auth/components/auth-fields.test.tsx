import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import '@/app/i18n'
import { PasswordInput } from './auth-fields'

describe('PasswordInput', () => {
  it('shows and hides the password', async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="Password" defaultValue="secret-123" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('is not centred with a translate, which the pressed nudge would override mid-click', () => {
    render(<PasswordInput aria-label="Password" />)
    // The Button's active:translate-y-px replaces `translate`: a -translate-y-1/2 toggle jumps off the pointer on press.
    expect(screen.getByRole('button', { name: 'Show password' }).className).not.toMatch(/translate-y-1\/2/)
  })
})
