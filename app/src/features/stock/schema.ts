import { z } from 'zod'
import { MANUAL_MOVEMENT_TYPES, REASONS_BY_TYPE } from './types'
import type { ManualMovementType, StockMovementReason, StockMovementRequest } from './types'

const KEY = 'stock:validation.'

/** Up to 9 integer digits and 3 decimals (the API's numeric(19,3) with a sane ceiling); comma or dot. */
const QUANTITY = /^\d{1,9}([.,]\d{1,3})?$/

export function toQuantity(value: string): number {
  return Number(value.replace(',', '.'))
}

export const movementFormSchema = z
  .object({
    type: z.enum(MANUAL_MOVEMENT_TYPES),
    reason: z.string().min(1, { error: `${KEY}reasonRequired` }),
    quantity: z
      .string()
      .trim()
      .min(1, { error: `${KEY}quantityRequired` })
      .regex(QUANTITY, { error: `${KEY}quantityInvalid` }),
    note: z.string().max(500, { error: `${KEY}noteTooLong` }),
  })
  .superRefine((values, ctx) => {
    // An adjustment may count zero; entries and exits must move something.
    if (values.type !== 'ADJUSTMENT' && QUANTITY.test(values.quantity) && toQuantity(values.quantity) === 0) {
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: `${KEY}quantityPositive` })
    }
    if (values.reason && !(REASONS_BY_TYPE[values.type] as readonly string[]).includes(values.reason)) {
      ctx.addIssue({ code: 'custom', path: ['reason'], message: `${KEY}reasonRequired` })
    }
  })

export type MovementFormValues = z.infer<typeof movementFormSchema>

export function movementFormDefaults(type: ManualMovementType = 'ENTRY'): MovementFormValues {
  return { type, reason: REASONS_BY_TYPE[type][0], quantity: '', note: '' }
}

export function toMovementRequest(values: MovementFormValues): StockMovementRequest {
  const note = values.note.trim()
  return {
    type: values.type,
    reason: values.reason as StockMovementReason,
    quantity: toQuantity(values.quantity),
    note: note === '' ? null : note,
  }
}

/** The balance the movement would leave, or null while the quantity is not a number yet. */
export function balanceAfter(current: number, type: ManualMovementType, quantity: string): number | null {
  if (!QUANTITY.test(quantity.trim())) return null
  const value = toQuantity(quantity.trim())
  if (type === 'ENTRY') return current + value
  if (type === 'EXIT') return current - value
  return value
}
