import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserAvatar } from './UserAvatar'

describe('UserAvatar', () => {
  it('uses the first letter of the first and last names', () => {
    render(<UserAvatar name="Ana Maria Admin" />)
    expect(screen.getByText('AA')).toBeInTheDocument()
  })

  it('uses a single initial for a single name', () => {
    render(<UserAvatar name="Bruno" />)
    expect(screen.getByText('B')).toBeInTheDocument()
  })
})
