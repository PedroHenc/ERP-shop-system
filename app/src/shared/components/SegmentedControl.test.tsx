import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { SegmentedControl } from './SegmentedControl'

const OPTIONS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month', badge: 12 },
] as const

function Harness({ initial = 'day' as string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <SegmentedControl label="Period" options={OPTIONS} value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  )
}

describe('SegmentedControl', () => {
  it('is a labelled tab list with the selected option marked', () => {
    render(<Harness />)
    expect(screen.getByRole('tablist', { name: 'Period' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Week' })).toHaveAttribute('aria-selected', 'false')
  })

  it('selects on click and shows the badge only on the selected option', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.queryByText('12')).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Month' }))
    expect(screen.getByTestId('value')).toHaveTextContent('month')
    expect(screen.getByRole('tab', { name: /Month/ })).toHaveTextContent('12')
  })

  it('moves and selects with the arrows (wrapping), Home and End', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.tab()
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByTestId('value')).toHaveTextContent('month')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByTestId('value')).toHaveTextContent('day')
    await user.keyboard('{End}')
    expect(screen.getByTestId('value')).toHaveTextContent('month')
    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveFocus()
  })

  it('keeps the list reachable by Tab when no option is selected', async () => {
    const user = userEvent.setup()
    render(<Harness initial="none" />)
    await user.tab()
    expect(screen.getByRole('tab', { name: 'Day' })).toHaveFocus()
    expect(screen.getAllByRole('tab').every((tab) => tab.getAttribute('aria-selected') === 'false')).toBe(true)
  })
})
