import { describe, expect, it } from 'vitest'
import { safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it('keeps local paths', () => {
    expect(safeRedirect('/a')).toBe('/a')
    expect(safeRedirect('/suppliers?page=2')).toBe('/suppliers?page=2')
  })

  it('rejects anything that could leave the app', () => {
    expect(safeRedirect('//x')).toBe('/')
    expect(safeRedirect('/\\x')).toBe('/')
    expect(safeRedirect('https://x')).toBe('/')
    expect(safeRedirect('products')).toBe('/')
    expect(safeRedirect(null)).toBe('/')
  })
})
