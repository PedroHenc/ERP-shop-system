import { describe, expect, it } from 'vitest'
import { brandFormDefaults, brandFormSchema, toBrandRequest } from './schema'

describe('brandFormSchema', () => {
  it('requires a name and trims it', () => {
    expect(brandFormSchema.safeParse({ ...brandFormDefaults, name: '  ' }).success).toBe(false)
    const parsed = brandFormSchema.safeParse({ ...brandFormDefaults, name: ' Acme ' })
    expect(parsed.success).toBe(true)
    expect(toBrandRequest({ name: ' Acme ', active: true }, null).name).toBe('Acme')
  })

  it('limits name to 100 characters', () => {
    expect(brandFormSchema.safeParse({ name: 'x'.repeat(100), active: true }).success).toBe(true)
    expect(brandFormSchema.safeParse({ name: 'x'.repeat(101), active: true }).success).toBe(false)
  })

  it('builds the request with the given version', () => {
    expect(toBrandRequest({ name: 'Acme', active: false }, 4)).toEqual({ name: 'Acme', active: false, version: 4 })
  })
})
