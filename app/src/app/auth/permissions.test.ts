import { describe, expect, it } from 'vitest'
import { ROLE_PERMISSIONS, can } from './permissions'

describe('permission matrix', () => {
  it('matches the spec matrix', () => {
    expect(ROLE_PERMISSIONS).toEqual({
      ADMIN: ['sales.write', 'products.write', 'brands.write', 'stock.move', 'reports.read', 'suppliers.read', 'suppliers.write', 'users.manage'],
      MANAGER: ['sales.write', 'products.write', 'brands.write', 'stock.move', 'reports.read', 'suppliers.read', 'suppliers.write'],
      STOCK: ['products.write', 'brands.write', 'stock.move', 'suppliers.read'],
      CASHIER: ['sales.write'],
    })
  })

  it('can() is false without a role', () => {
    expect(can(undefined, 'products.write')).toBe(false)
    expect(can('STOCK', 'suppliers.read')).toBe(true)
    expect(can('STOCK', 'suppliers.write')).toBe(false)
    expect(can('MANAGER', 'users.manage')).toBe(false)
    expect(can('CASHIER', 'stock.move')).toBe(false)
    expect(can('STOCK', 'reports.read')).toBe(false)
    expect(can('STOCK', 'sales.write')).toBe(false)
    expect(can('CASHIER', 'sales.write')).toBe(true)
  })
})
