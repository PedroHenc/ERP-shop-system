import { render, screen } from '@testing-library/react'
import { RiBox3Line } from '@remixicon/react'
import { describe, expect, it } from 'vitest'
import { KpiCard } from './KpiCard'

describe('KpiCard', () => {
  it('lets a long value shrink and wrap instead of widening the page', () => {
    render(<KpiCard icon={RiBox3Line} tone="primary" label="Stock value" value={1} format={() => 'US$ 42.150,75'} />)
    const valueEl = screen.getByText('US$ 42.150,75')
    expect(valueEl).toHaveClass('break-words', 'text-lg', 'sm:text-2xl')
    expect(valueEl).not.toHaveClass('truncate')
    expect(valueEl.parentElement).toHaveClass('min-w-0')
    expect(valueEl.parentElement?.parentElement).toHaveClass('min-w-0')
  })
})
