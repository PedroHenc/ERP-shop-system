import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('is disabled and shows a spinning icon while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    const spinner = button.querySelector('[aria-hidden]')
    expect(spinner).toHaveClass('animate-spin')
  })

  it('stays disabled when disabled and not loading', () => {
    render(<Button disabled>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button.querySelector('.animate-spin')).toBeNull()
  })
})
