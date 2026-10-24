import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormLayout } from './FormLayout'

describe('FormLayout', () => {
  it('renders the labelled summary landmark before the main content', () => {
    render(<FormLayout asideLabel="Summary" aside={<p>Aside content</p>} main={<p>Main content</p>} />)
    const aside = screen.getByRole('complementary', { name: 'Summary' })
    expect(aside).toHaveTextContent('Aside content')
    const main = screen.getByText('Main content')
    expect(aside.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
