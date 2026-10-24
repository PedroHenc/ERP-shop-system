import { z } from 'zod'
import type { BrandDetail, BrandRequest } from './types'

const KEY = 'brands:validation.'

export const brandFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: `${KEY}required` })
    .max(100, { error: `${KEY}maxLength100` }),
  active: z.boolean(),
})

export type BrandFormValues = z.infer<typeof brandFormSchema>

export const brandFormDefaults: BrandFormValues = { name: '', active: true }

export function toBrandRequest(values: BrandFormValues, version: number | null): BrandRequest {
  return { name: values.name.trim(), active: values.active, version }
}

export function toBrandFormValues(brand: BrandDetail): BrandFormValues {
  return { name: brand.name, active: brand.active }
}
