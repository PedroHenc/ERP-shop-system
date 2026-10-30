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

export interface StoreSignupBody {
  storeName: string
  name: string
  email: string
  password: string
}

export interface InviteAcceptBody {
  token: string
  name: string
  email: string
  password: string
}

/** What a valid invite code reveals before the account is created. */
export interface InvitePreview {
  storeName: string
  role: Role
  expiresAt: string
}
