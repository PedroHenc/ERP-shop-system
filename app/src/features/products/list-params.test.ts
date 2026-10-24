import { describe, expect, it } from 'vitest'
import { parseListParams, secondaryFilterCount, toSearchParams } from './list-params'

const DEFAULTS = { page: 0, size: 20, sortBy: 'name', direction: 'ASC' }

describe('parseListParams', () => {
  it('returns defaults for empty params', () => {
    expect(parseListParams(new URLSearchParams())).toEqual(DEFAULTS)
  })

  it('falls back to defaults on invalid values', () => {
    const search = new URLSearchParams('page=-1&size=999&sortBy=foo&direction=up&active=maybe&brandId=abc')
    expect(parseListParams(search)).toEqual(DEFAULTS)
  })

  it('ignores out-of-range page and brandId values', () => {
    expect(parseListParams(new URLSearchParams('page=99999999999')).page).toBe(0)
    expect(parseListParams(new URLSearchParams('page=2147483647')).page).toBe(2147483647)
    expect(parseListParams(new URLSearchParams('brandId=99999999999999999999')).brandId).toBeUndefined()
    expect(parseListParams(new URLSearchParams('brandId=0')).brandId).toBeUndefined()
    expect(parseListParams(new URLSearchParams('brandId=5')).brandId).toBe(5)
  })

  it('accepts allowed sizes only', () => {
    expect(parseListParams(new URLSearchParams('size=50')).size).toBe(50)
    expect(parseListParams(new URLSearchParams('size=30')).size).toBe(20)
  })

  it('parses filters', () => {
    const params = parseListParams(
      new URLSearchParams('name=ab&sku=X1&category=Coffee&brandId=3&active=false&page=2&sortBy=price&direction=DESC'),
    )
    expect(params).toEqual({
      page: 2,
      size: 20,
      sortBy: 'price',
      direction: 'DESC',
      name: 'ab',
      sku: 'X1',
      category: 'Coffee',
      brandId: 3,
      active: false,
    })
  })
})

describe('toSearchParams', () => {
  it('omits defaults and empty values', () => {
    const search = toSearchParams({ ...DEFAULTS, name: '' } as Parameters<typeof toSearchParams>[0])
    expect(search.toString()).toBe('')
  })

  it('round-trips through parseListParams', () => {
    const params = parseListParams(
      new URLSearchParams('name=ab&brandId=3&active=true&page=1&size=50&sortBy=sku&direction=DESC'),
    )
    expect(parseListParams(toSearchParams(params))).toEqual(params)
    expect(toSearchParams(params).get('page')).toBe('1')
    expect(toSearchParams(params).get('active')).toBe('true')
  })
})

describe('secondaryFilterCount', () => {
  it('counts only sku, category and brand', () => {
    expect(secondaryFilterCount(parseListParams(new URLSearchParams()))).toBe(0)
    expect(secondaryFilterCount(parseListParams(new URLSearchParams('name=x&active=false')))).toBe(0)
    expect(secondaryFilterCount(parseListParams(new URLSearchParams('sku=a&category=b&brandId=3&name=x')))).toBe(3)
  })
})
