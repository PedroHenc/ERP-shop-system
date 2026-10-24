import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '@/test/render'

describe('PreferencesMenu', () => {
  it('switches language', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'Preferences' }))
    await user.click(await screen.findByRole('button', { name: 'Português (Brasil)' }))
    expect(await screen.findByRole('link', { name: 'Produtos' })).toBeInTheDocument()
  })

  it('switches currency', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'Preferences' }))
    await user.click(await screen.findByRole('button', { name: /Euro/ }))
    expect(localStorage.getItem('erp.currency')).toBe('EUR')
  })

  it('switches theme', async () => {
    const { user } = renderRoute('/')
    await user.click(screen.getByRole('button', { name: 'Preferences' }))
    const dark = await screen.findByRole('button', { name: 'Dark' })
    await user.click(dark)
    expect(dark).toHaveAttribute('aria-pressed', 'true')
  })
})
