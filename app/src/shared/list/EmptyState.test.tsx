import { RiBox3Line } from '@remixicon/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renders title, description and action', () => {
    render(
      <EmptyState icon={RiBox3Line} title="Nothing here" description="Add the first one." action={<button type="button">Create</button>} />,
    )
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument()
    expect(screen.getByText('Add the first one.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
  })
})
