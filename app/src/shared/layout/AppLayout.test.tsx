import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'

describe('AppLayout', () => {
  it('renders Home at / with sidebar links to Home and Products', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { level: 1, name: /, Ana/ })).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(nav).getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products')
  })

  it('renders sidebar links to Suppliers and Brands', () => {
    renderRoute('/')
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getByRole('link', { name: 'Suppliers' })).toHaveAttribute('href', '/suppliers')
    expect(within(nav).getByRole('link', { name: 'Brands' })).toHaveAttribute('href', '/brands')
  })

  it('renders the 404 page for unknown routes', () => {
    renderRoute('/nope')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('centres the header separator vertically', () => {
    renderRoute('/')
    const header = screen.getByRole('banner')
    expect(header.querySelector('[data-slot="separator"]')).toHaveClass('data-vertical:self-center')
  })
})
