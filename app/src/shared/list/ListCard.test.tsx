import { render, screen } from '@testing-library/react'
import { useReducedMotionConfig } from 'motion/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@/app/i18n'
import { ListCard } from './ListCard'

vi.mock('motion/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('motion/react')>()),
  useReducedMotionConfig: vi.fn(),
}))

function renderCard(refreshing: boolean) {
  return render(
    <ListCard toolbar={<span>toolbar</span>} refreshing={refreshing}>
      <p>content</p>
    </ListCard>,
  )
}

describe('ListCard', () => {
  beforeEach(() => {
    vi.mocked(useReducedMotionConfig).mockReturnValue(false)
  })

  it('shows a named progress bar and marks the content busy while refreshing', () => {
    renderCard(true)
    expect(screen.getByRole('progressbar', { name: 'Loading…' })).toBeInTheDocument()
    expect(screen.getByText('content').parentElement).toHaveAttribute('aria-busy', 'true')
  })

  it('has no progress bar when idle', () => {
    renderCard(false)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getByText('content').parentElement).toHaveAttribute('aria-busy', 'false')
  })

  it('animates the bar by default', () => {
    const bar = renderCard(true).getByRole('progressbar').firstElementChild as HTMLElement
    expect(bar.getAttribute('style')).toContain('translateX')
  })

  it('renders a static bar under reduced motion', () => {
    vi.mocked(useReducedMotionConfig).mockReturnValue(true)
    const bar = renderCard(true).getByRole('progressbar').firstElementChild as HTMLElement
    expect(bar.getAttribute('style')).toBeNull()
  })
})
