import { describe, expect, it } from 'vitest'
import { changePasswordSchema } from './schema'

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
