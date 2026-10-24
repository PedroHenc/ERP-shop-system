import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('is disabled and shows a spinning icon while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    const spinner = button.querySelector('.animate-spin')
    expect(spinner).toHaveAttribute('aria-hidden')
  })

  it('stays disabled when disabled and not loading', () => {
    render(<Button disabled>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button.querySelector('.animate-spin')).toBeNull()
  })

  it('cancels the press scale and nudge when the user prefers reduced motion', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass(
      'motion-reduce:active:scale-100',
      'motion-reduce:active:not-aria-[haspopup]:translate-y-0',
    )
  })
})
