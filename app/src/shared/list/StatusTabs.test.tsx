import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
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

  it('uses a roving tabindex: only the selected tab is in the tab order', () => {
    render(<StatusTabs value={false} onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Inactive' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('tabindex', '-1')
  })

  it('moves focus and selection with the arrow keys (wrapping), Home and End', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    function Controlled() {
      const [value, setValue] = useState<boolean | undefined>(undefined)
      return (
        <StatusTabs
          value={value}
          onChange={(next) => {
            onChange(next)
            setValue(next)
          }}
        />
      )
    }
    render(<Controlled />)
    await user.tab()
    expect(screen.getByRole('tab', { name: 'All' })).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('aria-selected', 'true')
    expect(onChange).toHaveBeenLastCalledWith(true)

    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith(undefined)

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Inactive' })).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith(false)

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveFocus()
    expect(onChange).toHaveBeenLastCalledWith(undefined)

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Inactive' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Inactive' })).toHaveAttribute('aria-selected', 'true')
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('never shows a scrollbar: no vertical overflow and the horizontal bar is hidden', () => {
    render(<StatusTabs value={undefined} onChange={() => {}} />)
    expect(screen.getByRole('tablist')).toHaveClass(
      'overflow-x-auto',
      'overflow-y-hidden',
      '[scrollbar-width:none]',
      '[&::-webkit-scrollbar]:hidden',
    )
  })
})
