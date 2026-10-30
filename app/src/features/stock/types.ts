import type { UnitOfMeasure } from '@/features/products/types'

/** INITIAL is recorded by the API when a product is created with stock; the others are manual. */
export const MANUAL_MOVEMENT_TYPES = ['ENTRY', 'EXIT', 'ADJUSTMENT'] as const
export type ManualMovementType = (typeof MANUAL_MOVEMENT_TYPES)[number]
export type StockMovementType = 'INITIAL' | ManualMovementType

/** Mirrors StockMovementReason in the API: each reason belongs to one type (OTHER to every manual one). */
export const REASONS_BY_TYPE = {
  ENTRY: ['PURCHASE', 'CUSTOMER_RETURN', 'OTHER'],
  EXIT: ['SALE', 'LOSS', 'DAMAGE', 'INTERNAL_USE', 'OTHER'],
  ADJUSTMENT: ['INVENTORY_COUNT', 'CORRECTION', 'OTHER'],
} as const satisfies Record<ManualMovementType, readonly string[]>

export type StockMovementReason = (typeof REASONS_BY_TYPE)[ManualMovementType][number] | 'INITIAL_STOCK'

export interface StockMovement {
  id: number
  productId: number
  productName: string
  productSku: string
  unitOfMeasure: UnitOfMeasure
  type: StockMovementType
  reason: StockMovementReason
  /** Signed change: positive adds to stock, negative removes. */
  quantity: number
  balanceAfter: number
  note: string | null
  /** Null for movements recorded before history began, or by a deleted user. */
  createdByName: string | null
  /** ISO instant. */
  createdAt: string
}

export interface StockMovementPage {
  content: StockMovement[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

/** `quantity`: how much comes in (ENTRY) or goes out (EXIT); for ADJUSTMENT, the counted stock. */
export interface StockMovementRequest {
  type: ManualMovementType
  reason: StockMovementReason
  quantity: number
  note: string | null
}

export interface StockMovementQuery {
  page?: number
  size?: number
  productId?: number
  type?: StockMovementType
  /** ISO instants: `from` inclusive, `to` exclusive. */
  from?: string
  to?: string
}
