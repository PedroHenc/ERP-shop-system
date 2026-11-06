import { describe, expect, it } from 'vitest'
import { averageCost, parseDecimal } from './cost'

describe('averageCost', () => {
  it('weighs the stock on hand against what arrived, like the API', () => {
    expect(averageCost(10, 6, 8, 9)).toBe(7.33)
    expect(averageCost(1.5, 4, 2.5, 4.4)).toBe(4.25)
  })

  it('takes the cost paid without a cost or stock to average with', () => {
    expect(averageCost(10, null, 5, 3)).toBe(3)
    expect(averageCost(0, 6, 5, 3)).toBe(3)
    expect(averageCost(-2, 6, 5, 3)).toBe(3)
  })
})

describe('parseDecimal', () => {
  it('reads both decimal separators and rejects anything else', () => {
    expect(parseDecimal(' 1,5 ')).toBe(1.5)
    expect(parseDecimal('2.25')).toBe(2.25)
    expect(parseDecimal('')).toBeNaN()
    expect(parseDecimal('1,2,3')).toBeNaN()
    expect(parseDecimal('-1')).toBeNaN()
  })
})
