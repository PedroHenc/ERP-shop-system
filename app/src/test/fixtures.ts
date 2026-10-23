import type { BrandDetail, BrandPage } from '@/features/brands/types'
import type { Product, ProductPage } from '@/features/products/types'

export function productFixture(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    version: 0,
    sku: 'SKU-001',
    barcode: '12345678',
    name: 'Espresso Beans',
    description: 'Dark roast, 1 kg bag',
    category: 'Coffee',
    subcategory: 'Beans',
    brandId: 1,
    brandName: 'Acme',
    price: 19.9,
    unitOfMeasure: 'UNIT',
    stockQuantity: 10,
    minimumStock: 2,
    reorderPoint: 5,
    allowNegativeStock: false,
    active: true,
    createdDate: '2026-01-15T10:00:00',
    lastModifiedDate: '2026-01-15T10:00:00',
    ...overrides,
  }
}

export function productPageFixture(content: Product[], overrides: Partial<ProductPage> = {}): ProductPage {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    last: true,
    ...overrides,
  }
}

export function brandFixture(overrides: Partial<BrandDetail> = {}): BrandDetail {
  return {
    id: 1,
    version: 0,
    name: 'Acme',
    active: true,
    createdDate: '2026-01-15T10:00:00',
    lastModifiedDate: '2026-01-15T10:00:00',
    ...overrides,
  }
}

export function brandPageFixture(content: BrandDetail[], overrides: Partial<BrandPage> = {}): BrandPage {
  return {
    content,
    page: 0,
    size: 20,
    totalElements: content.length,
    totalPages: 1,
    last: true,
    ...overrides,
  }
}
