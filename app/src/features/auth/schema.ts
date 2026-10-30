import { z } from 'zod'

const KEY = 'auth:validation.'

const MIN_PASSWORD = 8
/** The backend (BCrypt) rejects passwords over 72 UTF-8 bytes. */
const MAX_PASSWORD_BYTES = 72

const newPassword = z
  .string()
  .min(MIN_PASSWORD, { error: `${KEY}passwordMin` })
  .refine((value) => new TextEncoder().encode(value).length <= MAX_PASSWORD_BYTES, {
    error: `${KEY}passwordMax`,
  })

const requiredText = (max: 100 | 150) =>
  z
    .string()
    .trim()
    .min(1, { error: `${KEY}required` })
    .max(max, { error: `${KEY}maxLength${max}` })

const accountEmail = requiredText(150).pipe(z.email({ error: `${KEY}invalidEmail` }))

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


export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: `${KEY}required` }),
    newPassword,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    error: `${KEY}passwordMismatch`,
  })

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>

export const changePasswordDefaults: ChangePasswordValues = { currentPassword: '', newPassword: '', confirmPassword: '' }

/** "Create account": a new store and its first user, who becomes the store's admin. */
export const signupFormSchema = z.object({
  storeName: requiredText(100),
  name: requiredText(100),
  email: accountEmail,
  password: newPassword,
})

export type SignupFormValues = z.infer<typeof signupFormSchema>

export const signupFormDefaults: SignupFormValues = { storeName: '', name: '', email: '', password: '' }

/** Joining a store through an invite: the store and the role come from the invite. */
export const joinFormSchema = z.object({
  name: requiredText(100),
  email: accountEmail,
  password: newPassword,
})

export type JoinFormValues = z.infer<typeof joinFormSchema>

export const joinFormDefaults: JoinFormValues = { name: '', email: '', password: '' }

/** 0 (empty) to 4: 8+ characters, mixed case, a digit, a symbol or 12+ characters. A guide only: the API asks for 8+. */
export function passwordScore(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= MIN_PASSWORD) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++
  return Math.max(1, score)
}
