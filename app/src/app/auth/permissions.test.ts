import { describe, expect, it } from 'vitest'
import { ROLE_PERMISSIONS, can } from './permissions'

describe('permission matrix', () => {
  it('matches the spec matrix', () => {
    expect(ROLE_PERMISSIONS).toEqual({
      ADMIN: ['products.write', 'brands.write', 'suppliers.read', 'suppliers.write', 'users.manage'],
      MANAGER: ['products.write', 'brands.write', 'suppliers.read', 'suppliers.write'],
      STOCK: ['products.write', 'brands.write', 'suppliers.read'],
      CASHIER: [],
    })
  })

  it('can() is false without a role', () => {
    expect(can(undefined, 'products.write')).toBe(false)
    expect(can('STOCK', 'suppliers.read')).toBe(true)
    expect(can('STOCK', 'suppliers.write')).toBe(false)
    expect(can('MANAGER', 'users.manage')).toBe(false)
  })
})
