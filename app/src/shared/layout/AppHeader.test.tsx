import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'

function mainNav() {
  return screen.getByRole('navigation', { name: 'Main navigation' })
}

describe('AppHeader', () => {
  it('shows every page to an ADMIN', () => {
    renderRoute('/')
    const links = within(mainNav()).getAllByRole('link').map((link) => link.textContent)
    expect(links).toEqual(['Home', 'Point of sale', 'Products', 'Brands', 'Stock', 'Suppliers', 'Reports', 'Users'])
  })

  it('hides pages a CASHIER cannot open', () => {
    renderRoute('/', { role: 'CASHIER' })
    const nav = mainNav()
    expect(within(nav).getByRole('link', { name: 'Products' })).toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Stock' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Suppliers' })).not.toBeInTheDocument()
    expect(within(nav).queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('marks the current page, nested routes included', () => {
    renderRoute('/products/new')
    const nav = mainNav()
    const products = within(nav).getByRole('link', { name: 'Products' })
    expect(products).toHaveAttribute('aria-current', 'page')
    expect(products).toHaveAttribute('data-active', 'true')
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('opens the user menu from the avatar', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'User menu' }))
    expect(await screen.findByText('ana@example.com')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'My profile' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()
  })
})
