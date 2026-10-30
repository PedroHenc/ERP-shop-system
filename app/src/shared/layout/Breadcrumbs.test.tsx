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

  it('keeps every separator inside an li: the list only has li children', async () => {
    renderRoute('/products/1/edit')
    const nav = await screen.findByRole('navigation', { name: 'Breadcrumb' })
    const list = nav.querySelector('ol') as HTMLOListElement
    expect(list.children.length).toBeGreaterThan(within(nav).getAllByRole('listitem').length)
    for (const child of Array.from(list.children)) expect(child.tagName).toBe('LI')
    const separators = Array.from(list.children).filter((child) => child.getAttribute('role') === 'presentation')
    expect(separators).toHaveLength(2)
    for (const separator of separators) expect(separator).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows no trail for a single-crumb page like Home', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('navigation', { name: 'Breadcrumb' })).not.toBeInTheDocument()
  })
})
