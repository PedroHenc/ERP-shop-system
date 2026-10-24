export type Role = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'STOCK'

export const ROLES: readonly Role[] = ['ADMIN', 'MANAGER', 'CASHIER', 'STOCK']

export interface AuthUser {
  id: number
  version: number
  name: string
  email: string
  role: Role
  active: boolean
  lastLoginAt: string | null
  createdDate: string
  lastModifiedDate: string
}

export interface AuthResponse {
  accessToken: string
  expiresIn: number
  user: AuthUser
}
