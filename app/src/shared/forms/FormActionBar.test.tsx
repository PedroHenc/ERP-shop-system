import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FormActionBar } from './FormActionBar'

describe('FormActionBar', () => {
  it('shows the unsaved indicator only when dirty', () => {
    const { rerender } = render(<FormActionBar dirty={false} submitting={false} onCancel={vi.fn()} />)
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    rerender(<FormActionBar dirty submitting={false} onCancel={vi.fn()} />)
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('disables Save while submitting', () => {
    render(<FormActionBar dirty submitting onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Save/ })).toBeDisabled()
  })

  it('calls onCancel', async () => {
    const onCancel = vi.fn()
    render(<FormActionBar dirty={false} submitting={false} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
