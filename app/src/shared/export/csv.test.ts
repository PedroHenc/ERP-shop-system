import { describe, expect, it, vi } from 'vitest'
import { datedFilename, fetchAllPages, toCsv } from './csv'

const columns = [
  { header: 'Name', value: (row: { name: string; price: number }) => row.name },
  { header: 'Price', value: (row: { name: string; price: number }) => row.price },
]

describe('toCsv', () => {
  it('uses ; and a decimal comma in Portuguese, , and a point in English', () => {
    const rows = [{ name: 'Café', price: 1234.5 }]
    expect(toCsv(columns, rows, 'pt-BR')).toBe('Name;Price\r\nCafé;1234,5')
    expect(toCsv(columns, rows, 'en')).toBe('Name,Price\r\nCafé,1234.5')
  })

  it('quotes separators, quotes and line breaks, and defuses formulas', () => {
    const rows = [
      { name: 'Mel; "puro"', price: 1 },
      { name: '=HYPERLINK("x")', price: 2 },
      { name: 'two\nlines', price: 3 },
    ]
    expect(toCsv(columns, rows, 'pt-BR').split('\r\n').slice(1)).toEqual([
      `"Mel; ""puro""";1`,
      `"'=HYPERLINK(""x"")";2`,
      '"two\nlines";3',
    ])
  })

  it('leaves empty cells for null and undefined', () => {
    expect(toCsv([{ header: 'A', value: () => null }, { header: 'B', value: () => undefined }], [{}], 'en')).toBe('A,B\r\n,')
  })
})

describe('fetchAllPages', () => {
  it('walks every page and stops at the cap', async () => {
    const fetchPage = vi.fn(async (page: number) => ({ content: [page * 2, page * 2 + 1], totalPages: 3 }))
    expect(await fetchAllPages(fetchPage)).toEqual({ rows: [0, 1, 2, 3, 4, 5], truncated: false })
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(await fetchAllPages(fetchPage, 3)).toEqual({ rows: [0, 1, 2], truncated: true })
  })
})

it('dates file names with the local day', () => {
  expect(datedFilename('produtos', new Date(2026, 0, 5, 23, 30))).toBe('produtos-2026-01-05')
})
