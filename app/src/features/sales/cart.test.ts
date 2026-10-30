import { describe, expect, it } from 'vitest'
import { type CartProduct, addToCart, cartTotals, lineProblem, parseAmount, removeLine, setQuantity } from './cart'

const coffee: CartProduct = { id: 1, sku: 'C-1', name: 'Coffee', price: 19.9, unitOfMeasure: 'UNIT', stockQuantity: 3, allowNegativeStock: false }
const granola: CartProduct = { id: 2, sku: 'G-1', name: 'Granola', price: 30, unitOfMeasure: 'KILOGRAM', stockQuantity: 5.5, allowNegativeStock: false }

describe('cart', () => {
  it('bumps the line of a product scanned again', () => {
    let lines = addToCart([], coffee)
    lines = addToCart(lines, granola, 1.5)
    lines = addToCart(lines, coffee)
    expect(lines.map((line) => [line.product.id, line.quantity])).toEqual([
      [1, 2],
      [2, 1.5],
    ])
    expect(removeLine(lines, 1).map((line) => line.product.id)).toEqual([2])
    expect(setQuantity(lines, 2, 0.1 + 0.2)[1].quantity).toBe(0.3)
  })

  it('totals like the API: each line rounded to cents, then the discount', () => {
    const lines = setQuantity(addToCart(addToCart([], coffee), granola), 1, 3)
    expect(cartTotals(lines, 5)).toEqual({ subtotal: 89.7, total: 84.7 })
  })

  it('flags fractions of whole units and more than the stock', () => {
    expect(lineProblem({ product: coffee, quantity: 1.5 })).toBe('wholeUnits')
    expect(lineProblem({ product: coffee, quantity: 4 })).toBe('notEnoughStock')
    expect(lineProblem({ product: { ...coffee, allowNegativeStock: true }, quantity: 4 })).toBeNull()
    expect(lineProblem({ product: granola, quantity: 1.25 })).toBeNull()
    expect(lineProblem({ product: granola, quantity: 0 })).toBe('quantity')
  })

  it('reads amounts with a comma or a dot', () => {
    expect(parseAmount('12,50')).toBe(12.5)
    expect(parseAmount(' 7.5 ')).toBe(7.5)
    expect(parseAmount('abc')).toBeNaN()
    expect(parseAmount('-1')).toBeNaN()
  })
})
