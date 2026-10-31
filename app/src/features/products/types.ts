export const UNITS_OF_MEASURE = [
  'UNIT',
  'KILOGRAM',
  'GRAM',
  'LITER',
  'MILLILITER',
  'METER',
  'CENTIMETER',
  'BOX',
  'PIECE',
] as const

export type UnitOfMeasure = (typeof UNITS_OF_MEASURE)[number]

export interface Product {
  id: number
  version: number
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category: string
  subcategory: string | null
  brandId: number | null
  brandName: string | null
  price: number
  /** What one unit costs the store; null when unknown, and always for cashiers (the API leaves it out). */
  costPrice: number | null
  unitOfMeasure: UnitOfMeasure
  stockQuantity: number
  minimumStock: number
  reorderPoint: number
  allowNegativeStock: boolean
  active: boolean
  createdDate: string
  lastModifiedDate: string
}

export interface ProductRequest {
  sku: string
  barcode: string | null
  name: string
  description: string | null
  category: string
  subcategory: string | null
  brandId: number | null
  price: number
  costPrice: number | null
  unitOfMeasure: UnitOfMeasure
  stockQuantity: number
  minimumStock: number
  reorderPoint: number
  allowNegativeStock: boolean
  active: boolean
  version: number | null
}

export interface ProductPage {
  content: Product[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export type ProductSortField = 'name' | 'sku' | 'price' | 'category' | 'active'

export interface ProductListParams {
  page: number
  size: number
  sortBy: ProductSortField
  direction: 'ASC' | 'DESC'
  name?: string
  sku?: string
  category?: string
  brandId?: number
  active?: boolean
}
