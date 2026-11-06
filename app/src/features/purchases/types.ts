import type { UnitOfMeasure } from '@/features/products/types'

export const PURCHASE_STATUSES = ['DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'] as const
export type PurchaseStatus = (typeof PURCHASE_STATUSES)[number]

export interface PurchaseOrderItem {
  id: number
  /** Null once the product is deleted. */
  productId: number | null
  sku: string
  name: string
  unitOfMeasure: UnitOfMeasure
  quantity: number
  unitCost: number
  total: number
  receivedQuantity: number | null
  receivedUnitCost: number | null
  /** The product's live stock and cost (null once deleted): what receiving averages into. */
  productStock: number | null
  productCost: number | null
}

export interface PurchaseOrder {
  id: number
  number: number
  status: PurchaseStatus
  supplierId: number
  supplierName: string
  notes: string | null
  total: number
  receivedTotal: number | null
  createdByName: string | null
  createdAt: string
  orderedAt: string | null
  receivedAt: string | null
  receivedByName: string | null
  cancelledAt: string | null
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderSummary {
  id: number
  number: number
  status: PurchaseStatus
  supplierId: number
  supplierName: string
  items: number
  total: number
  receivedTotal: number | null
  createdAt: string
  receivedAt: string | null
}

export interface PurchaseOrderPage {
  content: PurchaseOrderSummary[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export interface PurchaseOrderQuery {
  page: number
  size: number
  status?: PurchaseStatus
}

export interface PurchaseOrderRequest {
  supplierId: number
  notes: string | null
  items: { productId: number; quantity: number; unitCost: number }[]
}

export interface ReceiveRequest {
  items: { itemId: number; receivedQuantity: number; unitCost: number }[]
  updateCosts: boolean
}

/** A product at or below its reorder point; `suggestedQuantity` refills to twice that point, less `onOrder`. */
export interface ReorderSuggestion {
  productId: number
  sku: string
  name: string
  unitOfMeasure: UnitOfMeasure
  stockQuantity: number
  minimumStock: number
  reorderPoint: number
  onOrder: number
  suggestedQuantity: number
  costPrice: number | null
}
