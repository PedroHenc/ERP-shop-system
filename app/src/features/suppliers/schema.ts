import { z } from 'zod'
import type { Supplier, SupplierRequest } from './types'

const KEY = 'suppliers:validation.'

/** Same normalization as the backend: drop '.', '-', '/' and whitespace, then uppercase. */
function normalizeTaxId(value: string): string {
  return value.replace(/[.\-/\s]/g, '').toUpperCase()
}

function isValidTaxId(value: string): boolean {
  const normalized = normalizeTaxId(value)
  return normalized === '' || /^[A-Z0-9]{1,14}$/.test(normalized)
}

const emailSchema = z.email()

export const supplierFormSchema = z.object({
  legalName: z
    .string()
    .trim()
    .min(1, { error: `${KEY}required` })
    .max(150, { error: `${KEY}maxLength150` }),
  tradeName: z
    .string()
    .trim()
    .max(150, { error: `${KEY}maxLength150` }),
  taxId: z.string().trim().refine(isValidTaxId, { error: `${KEY}taxId` }),
  email: z
    .string()
    .trim()
    .max(150, { error: `${KEY}maxLength150` })
    // Over-long values already report maxLength150; don't stack a second message.
    .refine((value) => value === '' || value.length > 150 || emailSchema.safeParse(value).success, {
      error: `${KEY}email`,
    }),
  phone: z
    .string()
    .trim()
    .max(20, { error: `${KEY}maxLength20` }),
  active: z.boolean(),
})

export type SupplierFormValues = z.infer<typeof supplierFormSchema>

export const supplierFormDefaults: SupplierFormValues = {
  legalName: '',
  tradeName: '',
  taxId: '',
  email: '',
  phone: '',
  active: true,
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function toSupplierRequest(values: SupplierFormValues, version: number | null): SupplierRequest {
  return {
    legalName: values.legalName.trim(),
    tradeName: blankToNull(values.tradeName),
    // Sent as typed (trimmed); the backend normalizes it.
    taxId: blankToNull(values.taxId),
    email: blankToNull(values.email),
    phone: blankToNull(values.phone),
    active: values.active,
    version,
  }
}

export function toSupplierFormValues(supplier: Supplier): SupplierFormValues {
  return {
    legalName: supplier.legalName,
    tradeName: supplier.tradeName ?? '',
    taxId: supplier.taxId ?? '',
    email: supplier.email ?? '',
    phone: supplier.phone ?? '',
    active: supplier.active,
  }
}
