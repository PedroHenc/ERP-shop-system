import type { AuthUser, Role } from '@/app/auth/types'

/** The API's UserResponse has the same shape as the signed-in user. */
export type User = AuthUser

export interface UserRequest {
  name: string
  email: string
  role: Role
  active: boolean
  version: number | null
  /** Only sent when creating a user. */
  password?: string
}

export interface UserPage {
  content: User[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export type { UserListParams, UserSortField } from './list-params'
