import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'

describe('AppSidebar', () => {
  it('shows every group label to an ADMIN', () => {
    renderRoute('/')
    for (const label of ['General', 'Catalog', 'Purchasing', 'Administration']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('omits empty groups for a CASHIER', () => {
    renderRoute('/', { role: 'CASHIER' })
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Catalog')).toBeInTheDocument()
    expect(screen.queryByText('Purchasing')).not.toBeInTheDocument()
    expect(screen.queryByText('Administration')).not.toBeInTheDocument()
  })

  it('shows the user card with name and role, and opens the menu', async () => {
    const { user } = renderRoute('/')
    const button = screen.getByRole('button', { name: 'User menu' })
    expect(within(button).getByText('Ana Admin')).toBeInTheDocument()
    expect(within(button).getByText('Admin')).toBeInTheDocument()
    await user.click(button)
    expect(await screen.findByRole('menuitem', { name: 'My profile' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('marks the current route as active', () => {
    renderRoute('/')
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('data-active', 'true')
    expect(within(nav).getByRole('link', { name: 'Products' })).toHaveAttribute('data-active', 'false')
  })
})
