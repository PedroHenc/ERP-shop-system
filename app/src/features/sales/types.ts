import type { UnitOfMeasure } from '@/features/products/types'

export const PAYMENT_METHODS = ['CASH', 'PIX', 'DEBIT_CARD', 'CREDIT_CARD'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export type SaleStatus = 'COMPLETED' | 'CANCELLED'

/** Prices are not sent: the API charges each product's current price. */
export interface SaleRequest {
  items: { productId: number; quantity: number; discount?: number }[]
  discount?: number
  paymentMethod: PaymentMethod
  /** Cash only: what the customer handed over (the change is the difference). */
  amountPaid?: number
  note?: string | null
}

export interface SaleItem {
  id: number
  /** Null once the product is deleted; the copied name and SKU stay. */
  productId: number | null
  sku: string
  name: string
  unitOfMeasure: UnitOfMeasure
  quantity: number
  unitPrice: number
  discount: number
  total: number
}

export interface Sale {
  id: number
  number: number
  status: SaleStatus
  subtotal: number
  itemsDiscount: number
  discount: number
  total: number
  paymentMethod: PaymentMethod
  amountPaid: number
  change: number
  note: string | null
  createdByName: string | null
  createdAt: string
  cancelledAt: string | null
  cancelledByName: string | null
  cancelReason: string | null
  items: SaleItem[]
}

export interface SaleSummary {
  id: number
  number: number
  status: SaleStatus
  total: number
  paymentMethod: PaymentMethod
  itemCount: number
  createdByName: string | null
  createdAt: string
}

export interface SalePage {
  content: SaleSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface SaleQuery {
  page?: number
  size?: number
  status?: SaleStatus
  paymentMethod?: PaymentMethod
  number?: number
  /** ISO instants: `from` inclusive, `to` exclusive. */
  from?: string
  to?: string
}

/** Completed sales of a period; cancelled ones only counted apart. */
export interface SalesTotals {
  sales: number
  revenue: number
  averageTicket: number
  cancelled: number
}
