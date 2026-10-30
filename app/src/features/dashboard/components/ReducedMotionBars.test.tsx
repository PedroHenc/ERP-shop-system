import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MotionPreferenceProvider } from '@/app/motion-preference'
import { RestockCard } from './RestockCard'
import { StockHealthCard } from './StockHealthCard'

// With the OS "reduce motion" setting on (and the in-app preference left on System), progress bars
// must render at their final width at once.
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
    render(
      <MotionPreferenceProvider>
        <StockHealthCard activeProducts={10} lowStock={2} outOfStock={1} />
      </MotionPreferenceProvider>,
    )
    const bars = screen.getByRole('list').querySelectorAll('[data-slot="progress-fill"]')
    expect([...bars].map((bar) => (bar as HTMLElement).style.width)).toEqual(['70%', '20%', '10%'])
  })

  it('draws the restock bars at their final width', () => {
    render(
      <MotionPreferenceProvider>
        <MemoryRouter>
          <RestockCard items={[{ id: 1, sku: 'SKU-1', name: 'Granola', stockQuantity: 3, minimumStock: 4 }]} />
        </MemoryRouter>
      </MotionPreferenceProvider>,
    )
    const bar = screen.getByRole('link').querySelector('[data-slot="progress-fill"]') as HTMLElement
    expect(bar.style.width).toBe('75%')
  })

  it('animates the bars anyway when the preference is Full', () => {
    localStorage.setItem('erp.motion', 'full')
    render(
      <MotionPreferenceProvider>
        <StockHealthCard activeProducts={10} lowStock={2} outOfStock={1} />
      </MotionPreferenceProvider>,
    )
    const bars = screen.getByRole('list').querySelectorAll('[data-slot="progress-fill"]')
    // Still sweeping up from zero on the first frame.
    expect([...bars].map((bar) => (bar as HTMLElement).style.width)).toEqual(['0px', '0px', '0px'])
    localStorage.removeItem('erp.motion')
  })
})
