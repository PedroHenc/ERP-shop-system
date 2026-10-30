import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Panel } from './Panel'

describe('Panel', () => {
  it('is a region named by its title, with description and actions', () => {
    render(
      <Panel title="Needs restock" description="Below minimum" actions="5 items">
        content
      </Panel>,
    )
    const region = screen.getByRole('region', { name: 'Needs restock' })
    expect(region).toHaveTextContent('Below minimum')
    expect(region).toHaveTextContent('5 items')
    expect(screen.getByRole('heading', { level: 2, name: 'Needs restock' })).toBeInTheDocument()
  })

  it('has no region role without a title', () => {
    render(<Panel>content</Panel>)
    expect(screen.queryByRole('region')).not.toBeInTheDocument()
  })

  it('fills the ink and accent variants', () => {
    const { rerender } = render(<Panel title="Summary" variant="ink" />)
    expect(screen.getByRole('region')).toHaveClass('bg-foreground')
    rerender(<Panel title="Summary" variant="accent" />)
    expect(screen.getByRole('region')).toHaveClass('bg-primary')
  })
})
