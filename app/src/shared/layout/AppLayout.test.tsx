import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'

describe('AppLayout', () => {
  it('renders Home at / with sidebar links to Home and Products', () => {
    renderRoute('/')
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
    const nav = screen.getByRole('navigation')
    expect(within(nav).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(within(nav).getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products')
  })

  it('renders the 404 page for unknown routes', () => {
    renderRoute('/nope')
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('switches UI language from the header', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'Language' }))
    await user.click(await screen.findByRole('menuitemradio', { name: 'Português (Brasil)' }))
    expect(await screen.findByRole('link', { name: 'Produtos' })).toBeInTheDocument()
  })

  it('switches currency from the header', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'Currency' }))
    await user.click(await screen.findByRole('menuitemradio', { name: /Euro/ }))
    expect(localStorage.getItem('erp.currency')).toBe('EUR')
  })
})
