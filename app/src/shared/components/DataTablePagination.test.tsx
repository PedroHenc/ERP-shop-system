import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTablePagination } from './DataTablePagination'

describe('DataTablePagination', () => {
  it('shows the visible range out of the total', () => {
    render(
      <DataTablePagination
        page={1}
        size={20}
        sizes={[10, 20, 50]}
        totalElements={23}
        totalPages={2}
        onPageChange={() => {}}
        onSizeChange={() => {}}
      />,
    )
    expect(screen.getByText('Showing 21–23 of 23')).toBeInTheDocument()
  })
})
