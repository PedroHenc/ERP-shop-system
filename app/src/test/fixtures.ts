import type { DashboardSummary } from '@/features/dashboard/types'
import type { AuthUser } from '@/app/auth/types'
import type { BrandDetail, BrandPage } from '@/features/brands/types'
import type { Supplier, SupplierPage } from '@/features/suppliers/types'
import type { Product, ProductPage } from '@/features/products/types'
import type { StockMovement, StockMovementPage } from '@/features/stock/types'
import type { UserPage } from '@/features/users/types'

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

export function supplierFixture(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 1,
    version: 0,
    legalName: 'Acme Ltda',
    tradeName: 'Acme',
    taxId: '12.345.678/0001-90',
    email: 'sales@acme.test',
    phone: '+55 11 99999-0000',
    active: true,
    createdDate: '2026-01-15T10:00:00',
    lastModifiedDate: '2026-01-15T10:00:00',
    ...overrides,
  }
}

export function supplierPageFixture(content: Supplier[], overrides: Partial<SupplierPage> = {}): SupplierPage {
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

export function userFixture(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    version: 0,
    name: 'Ana Admin',
    email: 'ana@example.com',
    role: 'ADMIN',
    active: true,
    lastLoginAt: '2026-01-15T10:00:00',
    createdDate: '2026-01-15T10:00:00',
    lastModifiedDate: '2026-01-15T10:00:00',
    ...overrides,
  }
}

export function userPageFixture(content: AuthUser[], overrides: Partial<UserPage> = {}): UserPage {
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


export function dashboardSummaryFixture(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    activeProducts: 1284,
    lowStock: 12,
    outOfStock: 3,
    inventoryValue: 42150.75,
    activeBrands: 18,
    activeSuppliers: 9,
    restock: [{ id: 7, sku: 'SKU-007', name: 'Granola', stockQuantity: 0, minimumStock: 5 }],
    ...overrides,
  }
}

export function stockMovementFixture(overrides: Partial<StockMovement> = {}): StockMovement {
  return {
    id: 1,
    productId: 1,
    productName: 'Espresso Beans',
    productSku: 'SKU-001',
    unitOfMeasure: 'UNIT',
    type: 'ENTRY',
    reason: 'PURCHASE',
    quantity: 5,
    balanceAfter: 15,
    note: null,
    createdByName: 'Ana Admin',
    createdAt: '2026-10-30T13:00:00Z',
    ...overrides,
  }
}

export function stockMovementPageFixture(content: StockMovement[], overrides: Partial<StockMovementPage> = {}): StockMovementPage {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1, last: true, ...overrides }
}
