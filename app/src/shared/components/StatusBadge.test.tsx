import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders active as the success variant', () => {
    render(<StatusBadge active />)
    const badge = screen.getByText('Active')
    expect(badge).toHaveAttribute('data-variant', 'success')
  })

  it('renders inactive as the neutral variant', () => {
    render(<StatusBadge active={false} />)
    expect(screen.getByText('Inactive')).toHaveAttribute('data-variant', 'neutral')
  })
})
