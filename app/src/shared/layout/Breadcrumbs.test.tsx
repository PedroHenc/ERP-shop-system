import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'

describe('Breadcrumbs', () => {
  it('shows group, linked list and current page on the edit route', async () => {
    renderRoute('/products/1/edit')
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getByText('Catalog')).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'Products' })).toHaveAttribute('href', '/products')
    expect(within(nav).getByText('Edit')).toHaveAttribute('aria-current', 'page')
  })

  it('shows only Home at /', async () => {
    renderRoute('/')
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    expect(within(nav).getAllByRole('listitem')).toHaveLength(1)
    expect(within(nav).getByText('Home')).toHaveAttribute('aria-current', 'page')
  })
})
