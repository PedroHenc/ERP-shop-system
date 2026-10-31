import type { UnitOfMeasure } from '@/features/products/types'
import type { PaymentMethod } from '@/features/sales/types'
import type { StockMovementReason, StockMovementType } from '@/features/stock/types'

/** Movement values are quantity × the product's current sale price; stock by category also comes at cost. */
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
  /** `costValue` counts only products with a cost; `withoutCost` is how many are left out of it. */
  stockByCategory: { category: string; products: number; value: number; costValue: number; withoutCost: number }[]
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

/** Completed sales of a period; cancelled ones are only counted apart. */
export interface SalesReport {
  /**
   * Profit covers only the lines sold with a cost (`costedRevenue`, sale-wide discounts shared out);
   * `revenue − costedRevenue` is what was sold without one. `margin` is a fraction, null without costs.
   */
  totals: {
    sales: number
    revenue: number
    averageTicket: number
    discounts: number
    cancelled: number
    costedRevenue: number
    cost: number
    grossProfit: number
    margin: number | null
  }
  /** One point per local day of the period, zeros included. */
  daily: { date: string; sales: number; revenue: number }[]
  /** `productId` is null once the product is deleted; profit and margin are null when no line had a cost. */
  topProducts: (Omit<ProductAmount, 'productId'> & { productId: number | null; profit: number | null; margin: number | null })[]
  byPayment: { method: PaymentMethod; sales: number; revenue: number }[]
  /** `category` is null for deleted products. Line totals, like `topProducts`. */
  byCategory: { category: string | null; revenue: number; profit: number | null; margin: number | null }[]
}
