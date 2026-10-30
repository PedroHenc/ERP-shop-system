import { describe, expect, it } from 'vitest'
import { periodStart, toStockQuery } from './list-params'
import { balanceAfter, movementFormSchema, toMovementRequest } from './schema'

function issues(input: unknown) {
  const result = movementFormSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => `${i.path.join('.')}:${i.message}`)
}

describe('movement form', () => {
  const valid = { type: 'EXIT', reason: 'LOSS', quantity: '2,5', note: '  broken jar  ' }

  it('accepts comma or dot decimals and trims the note', () => {
    expect(issues(valid)).toEqual([])
    expect(toMovementRequest(movementFormSchema.parse(valid))).toEqual({ type: 'EXIT', reason: 'LOSS', quantity: 2.5, note: 'broken jar' })
    expect(toMovementRequest(movementFormSchema.parse({ ...valid, note: ' ' })).note).toBeNull()
  })

  it('needs a positive quantity for entries and exits, but lets an adjustment count zero', () => {
    expect(issues({ ...valid, quantity: '0' })).toEqual(['quantity:stock:validation.quantityPositive'])
    expect(issues({ ...valid, quantity: 'abc' })).toEqual(['quantity:stock:validation.quantityInvalid'])
    expect(issues({ ...valid, quantity: '1.2345' })).toEqual(['quantity:stock:validation.quantityInvalid'])
    expect(issues({ type: 'ADJUSTMENT', reason: 'INVENTORY_COUNT', quantity: '0', note: '' })).toEqual([])
  })

  it('rejects a reason of another type', () => {
    expect(issues({ ...valid, reason: 'PURCHASE' })).toEqual(['reason:stock:validation.reasonRequired'])
  })

  it('previews the balance', () => {
    expect(balanceAfter(10, 'ENTRY', '2,5')).toBe(12.5)
    expect(balanceAfter(10, 'EXIT', '12')).toBe(-2)
    expect(balanceAfter(10, 'ADJUSTMENT', '7')).toBe(7)
    expect(balanceAfter(10, 'ENTRY', '')).toBeNull()
  })
})

describe('stock list params', () => {
  const now = new Date(2026, 9, 30, 15, 45)

  it('turns a period into the local midnight it starts at, today included', () => {
    expect(periodStart('today', now)).toEqual(new Date(2026, 9, 30))
    expect(periodStart('7d', now)).toEqual(new Date(2026, 9, 24))
    expect(periodStart('30d', now)).toEqual(new Date(2026, 9, 1))
    expect(periodStart('all', now)).toBeUndefined()
  })

  it('builds the API query and drops unknown values', () => {
    const base = { page: 2, size: 20, sortBy: 'createdAt' as const, direction: 'ASC' as const }
    expect(toStockQuery({ ...base, type: 'EXIT', period: '7d', productId: 7 }, now)).toEqual({
      page: 2,
      size: 20,
      productId: 7,
      type: 'EXIT',
      from: new Date(2026, 9, 24).toISOString(),
    })
    expect(toStockQuery({ ...base, type: 'INITIAL', period: 'forever' }, now)).toEqual({
      page: 2,
      size: 20,
      productId: undefined,
      type: undefined,
      from: undefined,
    })
  })
})
