import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FiltersButton } from './FiltersButton'

const compact = vi.hoisted(() => ({ value: false }))
vi.mock('@/hooks/use-compact', () => ({ useIsCompact: () => compact.value }))

describe('FiltersButton', () => {
  beforeEach(() => {
    compact.value = false
  })

  it('has no count without active filters', () => {
    render(
      <FiltersButton activeCount={0} onClear={() => {}}>
        <span>body</span>
      </FiltersButton>,
    )
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
  })

  it('shows the active count and clears from the popover', async () => {
    const onClear = vi.fn()
    const user = userEvent.setup()
    render(
      <FiltersButton activeCount={2} onClear={onClear}>
        <span>body</span>
      </FiltersButton>,
    )
    await user.click(screen.getByRole('button', { name: 'Filters (2)' }))
    expect(screen.getByText('body')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('opens a bottom sheet dialog when compact', async () => {
    compact.value = true
    const user = userEvent.setup()
    render(
      <FiltersButton activeCount={1} onClear={() => {}}>
        <span>body</span>
      </FiltersButton>,
    )
    await user.click(screen.getByRole('button', { name: 'Filters (1)' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('body')
    expect(dialog).toHaveAttribute('data-side', 'bottom')
  })
})
