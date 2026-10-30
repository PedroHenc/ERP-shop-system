import { describe, expect, it } from 'vitest'
import { changePasswordSchema, joinFormSchema, signupFormSchema } from './schema'

const valid = { currentPassword: 'old-pass', newPassword: 'new-password', confirmPassword: 'new-password' }

function issues(input: unknown) {
  const result = changePasswordSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
}

describe('changePasswordSchema', () => {
  it('requires 8 to 72 characters and matching confirmation', () => {
    expect(issues(valid)).toEqual([])
    expect(issues({ ...valid, currentPassword: '' }).map((i) => i.path)).toEqual(['currentPassword'])
    expect(issues({ ...valid, newPassword: 'short', confirmPassword: 'short' }).map((i) => i.path)).toEqual(['newPassword'])
    const max = 'a'.repeat(72)
    expect(issues({ ...valid, newPassword: max, confirmPassword: max })).toEqual([])
    const tooLong = 'a'.repeat(73)
    expect(issues({ ...valid, newPassword: tooLong, confirmPassword: tooLong }).map((i) => i.path)).toEqual(['newPassword'])
    expect(issues({ ...valid, confirmPassword: 'different-1' })).toEqual([
      { path: 'confirmPassword', message: 'auth:validation.passwordMismatch' },
    ])
  })

  it('measures the maximum in UTF-8 bytes, not characters', () => {
    const multibyte = 'é'.repeat(37) // 37 chars, 74 bytes
    expect(issues({ ...valid, newPassword: multibyte, confirmPassword: multibyte }).map((i) => i.path)).toEqual(['newPassword'])
  })
})

describe('new account forms', () => {
  const signup = { storeName: 'Acme', name: 'Ana', email: 'ana@example.com', password: 'Strong#Pass1', confirmPassword: 'Strong#Pass1' }
  const paths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
    result.success ? [] : (result.error?.issues ?? []).map((i) => i.path.join('.'))

  it('accepts matching passwords', () => {
    expect(paths(signupFormSchema.safeParse(signup))).toEqual([])
    const { storeName: _store, ...join } = signup
    expect(paths(joinFormSchema.safeParse(join))).toEqual([])
  })

  it('flags the confirmation when the passwords differ', () => {
    expect(paths(signupFormSchema.safeParse({ ...signup, confirmPassword: 'Strong#Pass2' }))).toEqual(['confirmPassword'])
    const { storeName: _store, ...join } = signup
    expect(paths(joinFormSchema.safeParse({ ...join, confirmPassword: '' }))).toEqual(['confirmPassword'])
  })
})
