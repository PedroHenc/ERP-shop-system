import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StatusTabs } from './StatusTabs'

describe('StatusTabs', () => {
  it('reports the chosen status', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<StatusTabs value={true} onChange={onChange} />)
    await user.click(screen.getByRole('tab', { name: 'Inactive' }))
    expect(onChange).toHaveBeenLastCalledWith(false)
    await user.click(screen.getByRole('tab', { name: 'All' }))
    expect(onChange).toHaveBeenLastCalledWith(undefined)
  })

  it('marks the selected tab and shows the count on it only', () => {
    render(<StatusTabs value={true} onChange={() => {}} count={12} />)
    const active = screen.getByRole('tab', { name: /Active/ })
    expect(active).toHaveAttribute('aria-selected', 'true')
    expect(active).toHaveTextContent('12')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getAllByText('12')).toHaveLength(1)
  })
})
