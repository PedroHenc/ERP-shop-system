import { describe, expect, it } from 'vitest'
import { productFixture } from '@/test/fixtures'
import { productFormDefaults, productFormSchema, toProductFormValues, toProductRequest } from './schema'
import type { ProductFormValues } from './schema'

function valid(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
  return { ...productFormDefaults, sku: 'A-1', name: 'Name', category: 'Cat', price: '10', ...overrides }
}

function fieldsWithErrors(values: ProductFormValues): string[] {
  const result = productFormSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => String(issue.path[0]))
}

describe('productFormSchema', () => {
  it('accepts a valid product', () => {
    expect(productFormSchema.safeParse(valid()).success).toBe(true)
  })

  it('requires sku, name and category', () => {
    const errors = fieldsWithErrors(valid({ sku: '', name: '  ', category: '' }))
    expect(errors).toEqual(expect.arrayContaining(['sku', 'name', 'category']))
  })

  it('rejects barcode with 9 digits and accepts 8, 12, 13, 14', () => {
    expect(fieldsWithErrors(valid({ barcode: '123456789' }))).toContain('barcode')
    for (const barcode of ['12345678', '123456789012', '1234567890123', '12345678901234']) {
      expect(fieldsWithErrors(valid({ barcode }))).not.toContain('barcode')
    }
  })

  it('accepts comma as decimal separator', () => {
    const values = valid({ price: '10,50' })
    expect(productFormSchema.safeParse(values).success).toBe(true)
    expect(toProductRequest(values, null).price).toBe(10.5)
  })

  it('rejects thousands separators', () => {
    expect(fieldsWithErrors(valid({ price: '1.000,50' }))).toContain('price')
  })

  it('limits price to 2 decimals regardless of currency', () => {
    expect(fieldsWithErrors(valid({ price: '9.99' }))).not.toContain('price')
    expect(fieldsWithErrors(valid({ price: '10.555' }))).toContain('price')
  })

  it('rejects negative quantities and more than 3 decimals', () => {
    expect(fieldsWithErrors(valid({ stockQuantity: '-1' }))).toContain('stockQuantity')
    expect(fieldsWithErrors(valid({ minimumStock: '1.2345' }))).toContain('minimumStock')
    expect(fieldsWithErrors(valid({ reorderPoint: '1,234' }))).not.toContain('reorderPoint')
  })

  it('enforces length limits', () => {
    expect(fieldsWithErrors(valid({ sku: 'x'.repeat(65) }))).toContain('sku')
    expect(fieldsWithErrors(valid({ description: 'x'.repeat(1001) }))).toContain('description')
  })
})

describe('toProductRequest', () => {
  it('sends blank optional texts as null', () => {
    const request = toProductRequest(valid({ barcode: '  ', description: '   ', subcategory: '  ' }), null)
    expect(request.barcode).toBeNull()
    expect(request.description).toBeNull()
    expect(request.subcategory).toBeNull()
  })

  it('round-trips a product through form values', () => {
    const product = productFixture({ version: 3, brandId: null, brandName: null, barcode: null, price: 10 })
    const request = toProductRequest(toProductFormValues(product), product.version)
    expect(request).toEqual({
      sku: product.sku,
      barcode: null,
      name: product.name,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      brandId: null,
      price: 10,
      unitOfMeasure: product.unitOfMeasure,
      stockQuantity: product.stockQuantity,
      minimumStock: product.minimumStock,
      reorderPoint: product.reorderPoint,
      allowNegativeStock: product.allowNegativeStock,
      active: product.active,
      version: 3,
    })
  })
})
