import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('is decorative by default', () => {
    const { container } = render(<ProgressBar value={0.4} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('exposes a named progressbar, with the value clamped to 0–100', () => {
    render(<ProgressBar value={1.7} label="Budget used" />)
    const bar = screen.getByRole('progressbar', { name: 'Budget used' })
    expect(bar).toHaveAttribute('aria-valuenow', '100')
  })
})
