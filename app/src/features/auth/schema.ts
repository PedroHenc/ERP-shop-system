import { z } from 'zod'

const KEY = 'auth:validation.'

export const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { error: `${KEY}required` })
    .pipe(z.email({ error: `${KEY}invalidEmail` })),
  password: z.string().min(1, { error: `${KEY}required` }),
})

export type LoginFormValues = z.infer<typeof loginFormSchema>

export const loginFormDefaults: LoginFormValues = { email: '', password: '' }

const MIN_PASSWORD = 8
/** The backend (BCrypt) rejects passwords over 72 UTF-8 bytes. */
const MAX_PASSWORD_BYTES = 72

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: `${KEY}required` }),
    newPassword: z
      .string()
      .min(MIN_PASSWORD, { error: `${KEY}passwordMin` })
      .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, {
        error: `${KEY}passwordMax`,
      }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: `${KEY}passwordMismatch`,
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export const changePasswordDefaults: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' }
