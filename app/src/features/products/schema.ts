import { z } from 'zod'
import { UNITS_OF_MEASURE } from './types'
import type { Product, ProductRequest } from './types'

const KEY = 'products:validation.'

const required = (value: string) => value.trim().length > 0

function requiredText(max: number, tooLongKey: string) {
  return z
    .string()
    .refine(required, { error: `${KEY}required` })
    .max(max, { error: `${KEY}${tooLongKey}` })
}

function optionalText(max: number, tooLongKey: string) {
  return z.string().max(max, { error: `${KEY}${tooLongKey}` })
}

function decimal(maxDecimals: number, invalidKey: string) {
  const pattern = new RegExp(`^\\d+([.,]\\d{1,${maxDecimals}})?$`)
  return z
    .string()
    .refine(required, { error: `${KEY}required` })
    .regex(pattern, { error: `${KEY}${invalidKey}` })
}

export const productFormSchema = z.object({
  sku: requiredText(64, 'maxLength64'),
  barcode: z.string().refine((value) => value.trim() === '' || /^(\d{8}|\d{12,14})$/.test(value.trim()), {
    error: `${KEY}barcode`,
  }),
  name: requiredText(150, 'maxLength150'),
  description: optionalText(1000, 'maxLength1000'),
  category: requiredText(100, 'maxLength100'),
  subcategory: optionalText(100, 'maxLength100'),
  brandId: z.number().int().nullable(),
  price: decimal(2, 'price'),
  unitOfMeasure: z.enum(UNITS_OF_MEASURE, { error: `${KEY}required` }),
  stockQuantity: decimal(3, 'quantity'),
  minimumStock: decimal(3, 'quantity'),
  reorderPoint: decimal(3, 'quantity'),
  allowNegativeStock: z.boolean(),
  active: z.boolean(),
})

export type ProductFormValues = z.infer<typeof productFormSchema>

export const productFormDefaults: ProductFormValues = {
  sku: '',
  barcode: '',
  name: '',
  description: '',
  category: '',
  subcategory: '',
  brandId: null,
  price: '',
  unitOfMeasure: 'UNIT',
  stockQuantity: '0',
  minimumStock: '0',
  reorderPoint: '0',
  allowNegativeStock: false,
  active: true,
}

function toNumber(value: string): number {
  return Number(value.trim().replace(',', '.'))
}

function toNullable(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function toProductRequest(values: ProductFormValues, version: number | null): ProductRequest {
  return {
    sku: values.sku.trim(),
    barcode: toNullable(values.barcode),
    name: values.name.trim(),
    description: toNullable(values.description),
    category: values.category.trim(),
    subcategory: toNullable(values.subcategory),
    brandId: values.brandId,
    price: toNumber(values.price),
    unitOfMeasure: values.unitOfMeasure,
    stockQuantity: toNumber(values.stockQuantity),
    minimumStock: toNumber(values.minimumStock),
    reorderPoint: toNumber(values.reorderPoint),
    allowNegativeStock: values.allowNegativeStock,
    active: values.active,
    version,
  }
}

export function toProductFormValues(product: Product): ProductFormValues {
  return {
    sku: product.sku,
    barcode: product.barcode ?? '',
    name: product.name,
    description: product.description ?? '',
    category: product.category,
    subcategory: product.subcategory ?? '',
    brandId: product.brandId,
    price: String(product.price),
    unitOfMeasure: product.unitOfMeasure,
    stockQuantity: String(product.stockQuantity),
    minimumStock: String(product.minimumStock),
    reorderPoint: String(product.reorderPoint),
    allowNegativeStock: product.allowNegativeStock,
    active: product.active,
  }
}
