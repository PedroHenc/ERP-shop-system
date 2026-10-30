import { useAuth } from './AuthProvider'
import type { Role } from './types'

export type Permission =
  | 'products.write'
  | 'brands.write'
  | 'stock.move'
  | 'suppliers.read'
  | 'suppliers.write'
  | 'users.manage'

/** Mirrors the permission matrix of the API (spec §3). */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: ['products.write', 'brands.write', 'stock.move', 'suppliers.read', 'suppliers.write', 'users.manage'],
  MANAGER: ['products.write', 'brands.write', 'stock.move', 'suppliers.read', 'suppliers.write'],
  STOCK: ['products.write', 'brands.write', 'stock.move', 'suppliers.read'],
  CASHIER: [],
}

export function can(role: Role | undefined, permission: Permission): boolean {
  return role !== undefined && ROLE_PERMISSIONS[role].includes(permission)
}

export function useCan(permission: Permission): boolean {
  const { user } = useAuth()
  return can(user?.role, permission)
}
