import { describe, expect, it } from 'vitest'
import { niceMax, reportQuery, toFlowPoints, toReportPeriod } from './period'

describe('report period', () => {
  it('covers the last N local days, today included', () => {
    const query = reportQuery('7d', new Date(2026, 9, 30, 15, 0))
    expect(new Date(query.from)).toEqual(new Date(2026, 9, 24))
    expect(new Date(query.to)).toEqual(new Date(2026, 9, 31))
    expect(query.zone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('falls back to 30 days for unknown values', () => {
    expect(toReportPeriod('2y')).toBe('30d')
    expect(toReportPeriod(null)).toBe('30d')
    expect(toReportPeriod('90d')).toBe('90d')
  })

  it('keeps daily points up to 92 days and sums weeks beyond', () => {
    const day = (i: number) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, valueIn: 1, valueOut: 2 })
    expect(toFlowPoints([day(0), day(1)])).toEqual([
      { start: '2026-01-01', end: '2026-01-01', valueIn: 1, valueOut: 2 },
      { start: '2026-01-02', end: '2026-01-02', valueIn: 1, valueOut: 2 },
    ])
    const year = Array.from({ length: 365 }, (_, i) => ({ date: `d${i}`, valueIn: 1, valueOut: 0 }))
    const weeks = toFlowPoints(year)
    expect(weeks).toHaveLength(53)
    expect(weeks[0]).toEqual({ start: 'd0', end: 'd6', valueIn: 7, valueOut: 0 })
    expect(weeks[52]).toEqual({ start: 'd364', end: 'd364', valueIn: 1, valueOut: 0 })
  })

  it('rounds the axis maximum up to 1, 2, 2.5 or 5 × 10ⁿ', () => {
    expect(niceMax(0)).toBe(1)
    expect(niceMax(130)).toBe(200)
    expect(niceMax(2100)).toBe(2500)
    expect(niceMax(4200)).toBe(5000)
    expect(niceMax(5001)).toBe(10000)
  })
})
