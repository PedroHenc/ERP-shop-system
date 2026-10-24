import { describe, expect, it } from 'vitest'
import { createUserSchema, editUserSchema, setPasswordSchema } from './schema'

const base = { name: 'Bob', email: 'bob@example.com', role: 'CASHIER', active: true } as const

describe('user schemas', () => {
  it('requires a password of 8-72 chars only on create', () => {
    expect(createUserSchema.safeParse({ ...base, password: '' }).success).toBe(false)
    expect(createUserSchema.safeParse({ ...base, password: '1234567' }).success).toBe(false)
    expect(createUserSchema.safeParse({ ...base, password: '12345678' }).success).toBe(true)
    expect(createUserSchema.safeParse({ ...base, password: 'a'.repeat(72) }).success).toBe(true)
    expect(createUserSchema.safeParse({ ...base, password: 'a'.repeat(73) }).success).toBe(false)
    expect(editUserSchema.safeParse({ ...base, password: '' }).success).toBe(true)
  })

  it('counts UTF-8 bytes, not characters', () => {
    // 'é' is 2 bytes: 37 of them are 37 chars but 74 bytes.
    expect(createUserSchema.safeParse({ ...base, password: 'é'.repeat(37) }).success).toBe(false)
    expect(createUserSchema.safeParse({ ...base, password: 'é'.repeat(36) }).success).toBe(true)
  })

  it('validates name, email and role', () => {
    expect(editUserSchema.safeParse({ ...base, name: ' ', password: '' }).success).toBe(false)
    expect(editUserSchema.safeParse({ ...base, email: 'x@', password: '' }).success).toBe(false)
    expect(editUserSchema.safeParse({ ...base, role: 'BOSS', password: '' }).success).toBe(false)
  })

  it('requires the confirmation to match when setting a password', () => {
    expect(setPasswordSchema.safeParse({ password: '12345678', confirmPassword: '12345678' }).success).toBe(true)
    expect(setPasswordSchema.safeParse({ password: '12345678', confirmPassword: 'other-pass' }).success).toBe(false)
  })
})
