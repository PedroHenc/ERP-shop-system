import type { UnitOfMeasure } from '@/features/products/types'
import type { StockMovementReason, StockMovementType } from '@/features/stock/types'

/** Values are quantity × the product's current sale price (there is no cost price yet). */
export interface StockReport {
  totals: {
    movements: number
    entries: number
    exits: number
    adjustments: number
    valueIn: number
    valueOut: number
  }
  /** One point per local day of the period, zeros included. `date` is YYYY-MM-DD. */
  daily: { date: string; valueIn: number; valueOut: number }[]
  topExits: ProductAmount[]
  losses: ProductAmount[]
  byReason: { type: StockMovementType; reason: StockMovementReason; movements: number; value: number }[]
  /** Today's stock of the active products: not limited to the period. */
  stockByCategory: { category: string; products: number; value: number }[]
}

export interface ProductAmount {
  productId: number
  name: string
  sku: string
  unitOfMeasure: UnitOfMeasure
  quantity: number
  value: number
}

export interface StockReportQuery {
  /** ISO instants: `from` inclusive, `to` exclusive. */
  from: string
  to: string
  /** IANA time zone the daily series is grouped in. */
  zone: string
}
