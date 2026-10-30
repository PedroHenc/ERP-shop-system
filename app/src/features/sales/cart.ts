import type { Product, UnitOfMeasure } from '@/features/products/types'

/** Units sold in whole numbers only; mirrors UnitOfMeasure.isCountable in the API. */
export const COUNTABLE_UNITS: readonly UnitOfMeasure[] = ['UNIT', 'BOX', 'PIECE']

export function isCountable(unit: UnitOfMeasure): boolean {
  return COUNTABLE_UNITS.includes(unit)
}

export type CartProduct = Pick<Product, 'id' | 'sku' | 'name' | 'price' | 'unitOfMeasure' | 'stockQuantity' | 'allowNegativeStock'>

export interface CartLine {
  product: CartProduct
  quantity: number
}

/** Adds one unit (or one more of a product already in the cart: a second scan bumps its line). */
export function addToCart(lines: CartLine[], product: CartProduct, quantity = 1): CartLine[] {
  const existing = lines.find((line) => line.product.id === product.id)
  if (existing) {
    return lines.map((line) => (line === existing ? { ...line, quantity: round3(line.quantity + quantity) } : line))
  }
  return [...lines, { product, quantity }]
}

export function setQuantity(lines: CartLine[], productId: number, quantity: number): CartLine[] {
  return lines.map((line) => (line.product.id === productId ? { ...line, quantity: round3(quantity) } : line))
}

export function removeLine(lines: CartLine[], productId: number): CartLine[] {
  return lines.filter((line) => line.product.id !== productId)
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function round3(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000
}

export function lineTotal(line: CartLine): number {
  return round2(line.quantity * line.product.price)
}

/** The same arithmetic as the API (each line rounded to cents, then summed), as a preview. */
export function cartTotals(lines: CartLine[], discount: number) {
  const subtotal = round2(lines.reduce((sum, line) => sum + lineTotal(line), 0))
  const total = round2(subtotal - discount)
  return { subtotal, total }
}

/** What is wrong with a line before it reaches the API, or null. */
export function lineProblem(line: CartLine): 'wholeUnits' | 'notEnoughStock' | 'quantity' | null {
  if (!(line.quantity > 0)) return 'quantity'
  if (isCountable(line.product.unitOfMeasure) && !Number.isInteger(line.quantity)) return 'wholeUnits'
  if (!line.product.allowNegativeStock && line.quantity > line.product.stockQuantity) return 'notEnoughStock'
  return null
}

/** "12,50" or "12.5" as a number; NaN when it is not a non-negative amount. */
export function parseAmount(text: string): number {
  const value = text.trim().replace(',', '.')
  return /^\d+(\.\d{0,3})?$/.test(value) ? Number(value) : Number.NaN
}
