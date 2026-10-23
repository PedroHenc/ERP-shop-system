import { describe, expect, it } from 'vitest'
import { createListParams } from './list-params'

const list = createListParams({
  sortFields: ['legalName', 'active'],
  defaultSort: 'legalName',
  filters: { name: 'text', taxId: 'text', ownerId: 'id', active: 'boolean' },
})

const DEFAULTS = { page: 0, size: 20, sortBy: 'legalName', direction: 'ASC' }

describe('createListParams', () => {
  it('returns defaults for empty params', () => {
    expect(list.defaults).toEqual(DEFAULTS)
    expect(list.parse(new URLSearchParams())).toEqual(DEFAULTS)
  })

  it('falls back on invalid values', () => {
    const search = new URLSearchParams('page=-1&size=30&sortBy=x&direction=up&active=maybe&ownerId=0')
    const parsed = list.parse(search)
    expect(parsed).toEqual(DEFAULTS)
    expect(parsed).not.toHaveProperty('active')
    expect(parsed).not.toHaveProperty('ownerId')
  })

  it('rejects page above 2147483647 and unsafe ids', () => {
    expect(list.parse(new URLSearchParams('page=99999999999')).page).toBe(0)
    expect(list.parse(new URLSearchParams('page=2147483647')).page).toBe(2147483647)
    expect(list.parse(new URLSearchParams('ownerId=99999999999999999999')).ownerId).toBeUndefined()
    expect(list.parse(new URLSearchParams('ownerId=7')).ownerId).toBe(7)
  })

  it('round-trips and omits defaults', () => {
    const parsed = list.parse(new URLSearchParams('name=ac&active=false&page=2'))
    expect(parsed).toEqual({ ...DEFAULTS, page: 2, name: 'ac', active: false })
    expect(list.toSearchParams(parsed).toString()).toBe('page=2&name=ac&active=false')
    expect(list.toSearchParams(list.defaults).toString()).toBe('')
  })

  it('reports active filters', () => {
    expect(list.hasActiveFilters(list.defaults)).toBe(false)
    expect(list.hasActiveFilters({ ...list.defaults, taxId: '123' })).toBe(true)
    expect(list.hasActiveFilters({ ...list.defaults, active: false })).toBe(true)
  })
})
