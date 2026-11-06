/**
 * The cost after receiving, as the API computes it: the weighted average of the stock on hand at its cost
 * and what arrived at the cost paid; without a known cost or stock to average with, the cost paid.
 */
export function averageCost(stock: number, currentCost: number | null, quantity: number, unitCost: number): number {
  if (currentCost === null || stock <= 0) return unitCost
  return Math.round(((stock * currentCost + quantity * unitCost) / (stock + quantity)) * 100) / 100
}

/** Text typed in a pt-BR or en field ("1,5" or "1.5") as a number; NaN when it is not one. */
export function parseDecimal(text: string): number {
  const trimmed = text.trim()
  return /^\d+([.,]\d+)?$/.test(trimmed) ? Number(trimmed.replace(',', '.')) : Number.NaN
}
