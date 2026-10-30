import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RestockCard } from './RestockCard'
import { StockHealthCard } from './StockHealthCard'

// With the OS "reduce motion" setting on, progress bars must render at their final width at once.
describe('dashboard bars under reduced motion', () => {
  const original = window.matchMedia
  beforeEach(() => {
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  })
  afterEach(() => {
    window.matchMedia = original
  })

  it('draws the stock health bars at their final width', () => {
    render(<StockHealthCard activeProducts={10} lowStock={2} outOfStock={1} />)
    const bars = screen.getByRole('list').querySelectorAll('[data-slot="progress-fill"]')
    expect([...bars].map((bar) => (bar as HTMLElement).style.width)).toEqual(['70%', '20%', '10%'])
  })

  it('draws the restock bars at their final width', () => {
    render(
      <MemoryRouter>
        <RestockCard items={[{ id: 1, sku: 'SKU-1', name: 'Granola', stockQuantity: 3, minimumStock: 4 }]} />
      </MemoryRouter>,
    )
    const bar = screen.getByRole('link').querySelector('[data-slot="progress-fill"]') as HTMLElement
    expect(bar.style.width).toBe('75%')
  })
})
