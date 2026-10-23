import { z } from 'zod'
import type { Role } from '@/app/auth/types'
import type { User, UserRequest } from './types'

const KEY = 'users:validation.'
const MIN_PASSWORD = 8
/** The backend (BCrypt) rejects passwords over 72 UTF-8 bytes. */
const MAX_PASSWORD_BYTES = 72

const passwordSchema = z
  .string()
  .min(MIN_PASSWORD, { error: `${KEY}passwordMin` })
  .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, { error: `${KEY}passwordMax` })

const userFields = {
  name: z
    .string()
    .trim()
    .min(1, { error: `${KEY}required` })
    .max(100, { error: `${KEY}maxLength100` }),
  email: z
    .string()
    .trim()
    .min(1, { error: `${KEY}required` })
    .max(150, { error: `${KEY}maxLength150` })
    // Over-long values already report maxLength150; don't stack a second message.
    .refine((value) => value === '' || value.length > 150 || z.email().safeParse(value).success, {
      error: `${KEY}email`,
    }),
  role: z.enum(['ADMIN', 'MANAGER', 'CASHIER', 'STOCK'] satisfies Role[]),
  active: z.boolean(),
}

/** Editing never sends a password; the field is not rendered and stays empty. */
export const editUserSchema = z.object({ ...userFields, password: z.string() })
export const createUserSchema = z.object({ ...userFields, password: passwordSchema })

export type UserFormValues = z.infer<typeof editUserSchema>

export const userFormDefaults: UserFormValues = {
  name: '',
  email: '',
  role: 'CASHIER',
  active: true,
  password: '',
}

export const setPasswordSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    error: `${KEY}passwordMismatch`,
  })

export type SetPasswordValues = z.infer<typeof setPasswordSchema>

export const setPasswordDefaults: SetPasswordValues = { password: '', confirmPassword: '' }

export function toUserRequest(values: UserFormValues, version: number | null): UserRequest {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    role: values.role,
    active: values.active,
    version,
    ...(version === null ? { password: values.password } : {}),
  }
}

export function toUserFormValues(user: User): UserFormValues {
  return { name: user.name, email: user.email, role: user.role, active: user.active, password: '' }
}
