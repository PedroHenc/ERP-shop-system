import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MotionProvider } from '@/app/motion-provider'
import { RestockCard } from './RestockCard'
import { StockHealthCard } from './StockHealthCard'

// Animations always play in full: even with the OS "reduce motion" setting on, the bars sweep up from zero.
describe('dashboard bars with the OS reducing motion', () => {
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

  it('still animates the stock health bars', () => {
    render(
      <MotionProvider>
        <StockHealthCard activeProducts={10} lowStock={2} outOfStock={1} />
      </MotionProvider>,
    )
    const bars = screen.getByRole('list').querySelectorAll('[data-slot="progress-fill"]')
    // First frame of the sweep.
    expect([...bars].map((bar) => (bar as HTMLElement).style.width)).toEqual(['0px', '0px', '0px'])
  })

  it('still animates the restock bars', () => {
    render(
      <MotionProvider>
        <MemoryRouter>
          <RestockCard items={[{ id: 1, sku: 'SKU-1', name: 'Granola', stockQuantity: 3, minimumStock: 4 }]} />
        </MemoryRouter>
      </MotionProvider>,
    )
    const bar = screen.getByRole('link').querySelector('[data-slot="progress-fill"]') as HTMLElement
    expect(bar.style.width).toBe('0px')
  })
})
