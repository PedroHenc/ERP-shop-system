import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { KpiCard } from './KpiCard'

describe('KpiCard', () => {
  it('lets a long value shrink and wrap instead of widening the page', () => {
    render(<KpiCard label="Stock value" value={1} format={() => 'US$ 42.150,75'} />)
    const valueEl = screen.getByText('US$ 42.150,75')
    expect(valueEl).toHaveClass('text-2xl', 'sm:text-3xl', 'xl:text-[44px]')
    expect(valueEl).not.toHaveClass('break-words')
    expect(valueEl).not.toHaveClass('truncate')
    expect(valueEl.parentElement).toHaveClass('min-w-0')
    expect(valueEl.parentElement?.parentElement).toHaveClass('min-w-0')
  })

  it('shows the badge and hint, and fills the accent variant with the primary color', () => {
    render(
      <KpiCard
        label="Stock value"
        value={5}
        variant="accent"
        badge={{ text: '99% in stock', tone: 'ok' }}
        hint="Price × quantity"
      />,
    )
    expect(screen.getByText('99% in stock')).toBeInTheDocument()
    expect(screen.getByText('Price × quantity')).toBeInTheDocument()
    expect(screen.getByText('Stock value').closest('div')).toHaveClass('bg-primary')
  })
})
