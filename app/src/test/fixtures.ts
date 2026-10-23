import type { AuthUser } from '@/app/auth/types'
import type { BrandDetail, BrandPage } from '@/features/brands/types'
import type { Supplier, SupplierPage } from '@/features/suppliers/types'
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
